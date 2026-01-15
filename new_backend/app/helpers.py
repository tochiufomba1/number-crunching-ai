import os
import uuid
import boto3
import fasttext
import numpy as np
import polars as pl
import networkx as nx
from fastapi import UploadFile, HTTPException
from datasketch import MinHash, MinHashLSH
from app.dependencies import UPLOAD_EXTENSIONS, logger
from botocore.exceptions import ClientError
import tempfile
import sqlalchemy.orm as so
from mypy_boto3_s3.client import S3Client
import json
import io
import app.models.database_models as db_models
import sqlalchemy as sa
import random

PAYMENT_TERMS = [
    r"\b(?:re|e)?pay(?:ment|mt|mnt)?s?\b",
    r"\b(?:post)?paid\b",
    r"\b(?:pmt|pymnt|pmnt)s?\b",
    r"(?:merchant\s+)?(?:web)?payment\b",
    r"(?:mobile)?\bpurchase(?:s)?\b(?:\s+(?:authorized|at|-visa))?",
]

TRANSACTION_CHANNELS = [
    r"\b(?:debit|direct|initiated|pending)\b",
    r"\b(?:ach(?:billpay)?|ccd|ppd|atm|visa|zelle|paypal|quickpay|venmo|cash\s+app)\b",
]

GENERIC_TERMS = [
    r"\b(?:web|electronic|checkcard|deduction(?:s)?|transaction(?:s)?)\b",
    r"\b(?:recur(?:ring)?|service(?:s)?|corporate|online|authorized)\b",
    r"\b(?:card|ref|sq(?:u)?)\b",
]

STOPWORDS = [
    r"\b(?:from|www|amp|the|and|of|by|to|on|at|in|with)\b",
]

# US state codes
STATE_CODES = r"\b(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)\b"

# Combine all patterns
NOISE_PATTERN = "|".join([
    r"https?://\S+|www\.\S+",  # URLs
    *PAYMENT_TERMS,
    *TRANSACTION_CHANNELS,
    *GENERIC_TERMS,
    *STOPWORDS,
    STATE_CODES,
    r"\.com\b.*",  # .com and everything after
    r"\d{3,}",  # Long numbers (keep short ones like "7-11")
    r"[x]{2,}\d*",  # xxx123 patterns
])

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def upload_file_to_s3(file: UploadFile):
    s3_client = boto3.Session().client("s3")

    # check file extension
    file_ext = os.path.splitext(file.filename)[1]
    if file_ext not in UPLOAD_EXTENSIONS:
        raise ValueError(f"Can't process {file_ext} files.")

    # upload file to s3
    object_key = f"{uuid.uuid4()}_{file.filename}"
    
    s3_client.upload_fileobj(file.file, os.getenv("BUCKET_NAME"), object_key)

    return object_key

def get_minhash(text):
    m = MinHash(num_perm=128)
    
    words = text.split()[:3]
    for shingle in set(words):
        m.update(shingle.encode('utf8'))
        
    return m

def group(descriptions: pl.Series, table_height: int):
    """Groups similar transactions using MinHash LSH algorithm """
    lsh = MinHashLSH(threshold=0.6, num_perm=128)
    minhashes = {}

    for idx, text in enumerate(descriptions.to_list()):
        m = get_minhash(str(text))
        lsh.insert(str(idx), m)
        minhashes[str(idx)] = m
        
    # get graph edges
    all_edges = []
    for key in minhashes.keys():
        edges = [(key, x) for x in lsh.query(minhashes[key])]
        all_edges.extend(edges)

    # create graph and find connected components from edges
    G = nx.Graph()
    G.add_edges_from(all_edges)
    connected_components = list(nx.connected_components(G))
    
    # add table column for accessing connection group of each unresolved vendor
    # Build a mapping of row_index -> group_id
    mapping = {
        int(item): group_id
        for group_id, group in enumerate(connected_components)
        for item in group
    }

    # Convert to Polars Series
    group_series = pl.Series("group", [mapping.get(i, -1) for i in range(table_height)])

    return group_series

def classify(
    descriptions: pl.Series, 
    model: fasttext.FastText,
):
    """Predicts the vendors and chart of accounts of given transaction(s)"""

    # Clean transactions 
    simplified_descriptions  = (
        descriptions
        .fill_null("")
        .str.to_lowercase()
        .str.strip_chars()
        .str.replace_all(r"\.", ' ')
        .str.replace_all(NOISE_PATTERN, ' ')
        # .str.replace_all(r'[^\w\s]', ' ')
        .str.replace_all(r'\s+', ' ')
        .str.strip_chars()
    )

    # classify transactions
    results, confidences = model.predict(simplified_descriptions.to_list(), k=1)
    
    # remove fasttext formatting from vendor classifications
    labels = [
        lbl[0].replace('__label__', '') for lbl in results
    ]

    accounts = pl.Series("account", labels)
    accounts = (
        accounts
        .str.replace_all(r'_', ' ')
        .str.replace_all(r'-', ' ')
        .str.to_titlecase()
        .str.strip_chars()
    )

    # define thresholds using numpy's select method
    probs = np.array([prob[0] for prob in confidences])
    conditions = [
        probs < 0.4,
        (probs >= 0.4) & (probs < 0.7),
        probs >= 0.7
    ]
    choices = ["Low", "Medium", "High"]
    confidence_groups = np.select(conditions, choices, "None")

    # prepare new columns
    prediction_confidence = pl.Series("prediction_confidence", confidence_groups)
    groups = group(simplified_descriptions, simplified_descriptions.len())
   
    return accounts, prediction_confidence, simplified_descriptions.alias("simplified_descriptions"), groups

def create_coa(session: so.Session, user_id: int, coa_group_name: str, coa_entries: pl.Series) -> int:
    """ Creates COA group and its corresponding access and COA table entries """

    # create coa group
    new_coa_group = db_models.COAIDtoGroup(group_name=coa_group_name)
    session.add(new_coa_group)
    session.flush()

    # create entry in access table
    coa_group_id = new_coa_group.group_id
    session.add(
        db_models.UserCOAAccess(
            user_id=user_id, 
            group_id=coa_group_id, 
            access_level="administrator"
        )
    )

    # populate COA table with group's items
    coa_items = [
        db_models.COA(group_id=coa_group_id, account=account) 
        for account in coa_entries.unique().str.replace_all(r'[^\w\s]', '').str.replace_all(r'\s+', ' ').str.to_lowercase().to_list()
    ]

    session.add_all(coa_items)

    return coa_group_id

def delete_s3_object(s3_client: S3Client, s3_object_key: str) -> None:
    try:
        s3_client.delete_object(Bucket=os.getenv('BUCKET_NAME'), Key=s3_object_key)
    except Exception as e:
        logger.exception("Failed to delete S3 object <{s3_object_key}>: {e}")

def publish_status(redis_client, user_id: int, job_data: dict, success: bool, filename: str = None, error: str = None):
    """Helper to publish job status """
    payload = {**job_data, "success": success}
    if error:
        payload["error"] = error
    if filename:
        payload["filename"] = filename
    redis_client.publish(f"user:{user_id}", json.dumps(payload))

def compress_dataframe(df: pl.DataFrame):
    """ Writes polars dataframe to parquet buffer """
    parquet_buffer = io.BytesIO()
    df.write_parquet(parquet_buffer, compression="zstd")
    parquet_bytes = parquet_buffer.getvalue()
    
    return parquet_bytes

def cleanup_tempfiles(paths: str | list[str]) -> None:
    """
    Safely delete temporary files. 
    
    Silently ignores missing files. Logs warnings for permission errors.
    Designed for use in finally blocks where failures shouldn't raise.
    
    Args:
        paths: Single file path or list of paths
    """
    if not paths:
        return

    # Normalize to list
    path_list = [paths] if isinstance(paths, str) else paths

    # Validate input type
    if not isinstance(path_list, list):
        return

    for path in path_list:
        if not isinstance(path, str):
            continue

        try:
            if os.path.exists(path):
                os.remove(path)
        except (PermissionError, OSError) as e:
            logger.warning(f"Could not delete {path}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error deleting {path}", exc_info=True)

def normalize_text(df: pl.DataFrame) -> pl.DataFrame:
    """
  
    """
    df = df.with_columns([
        pl.col("description")
        .fill_null("")

        # Lowercase
        .str.to_lowercase()
        
        # Remove double quotes
        .str.replace_all('"', '')
        
        # Replace HTML breaks
        .str.replace_all('<br />', ' ')
        
        # Remove punctuation (chained replacements)
        .str.replace_all("'", "")
        .str.replace_all(r'\.',  "")  # Escape dot
        .str.replace_all(",", "")
        .str.replace_all(r'\(', "")  # Escape parenthesis
        .str.replace_all(r'\)', "")
        .str.replace_all("!", "")
        .str.replace_all(r'\?', "")  # Escape question mark
        
        # Replace semicolons and colons with spaces
        .str.replace_all(";", " ")
        .str.replace_all(":", " ")
        
        # Custom preprocessing
        .str.replace_all(NOISE_PATTERN, ' ')

        # Squeeze multiple spaces
        .str.replace_all(r'\s+', ' ')

        # Strip whitespace
        .str.strip_chars()
        .alias("normalized_description"),

        # Account cleaning
        pl.col("account")
        .fill_null("unknown")
        .str.to_lowercase()
        .str.replace_all(r'[^\w\s]', '')
        .str.replace_all(r'\s+', '-')
        # .str.to_titlecase()
        .alias("account"),
    ])

    return df

def verify_coa_access(
    session: so.Session,
    user_id: db_models.User,
    coa_group_id: int
) -> None:
    coa_group_access = session.scalar(
        sa.select(sa.exists())
        .where(
            db_models.UserCOAAccess.user_id == user_id,
            db_models.UserCOAAccess.group_id == coa_group_id
        )
    )

    if not coa_group_access:
        raise HTTPException(status_code=403, detail="Access denied to coa")

def verify_template_access(
    session: so.Session,
    user: db_models.User,
    template_id: int
) -> db_models.Template:
    """Verify user can access template, return template object."""
    template_access = session.scalar(
        sa.select(sa.exists())
        .where(
            sa.and_(
                db_models.UserTemplateAccess.user_id == user.id,
                db_models.UserTemplateAccess.template_id == template_id,
            )
        )
    )

    if not template_access:
        raise HTTPException(status_code=403, detail="Access denied to template")

    template = session.get(db_models.Template, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return template

def verify_mapping_access(
    session: so.Session,
    user_id: int,
    template_id: int,
    mapping_group_id: int
) -> db_models.Template:
    """Verify user access to mapping."""
    mapping_access = session.scalar(
        sa.select(sa.exists())
        .where(
            sa.and_(
                db_models.TemplateCOAMappingGroup.id == mapping_group_id,
                db_models.TemplateCOAMappingGroup.user_id == user_id,
                db_models.TemplateCOAMappingGroup.template_id == template_id,
            )
        )
    )

    if not mapping_access:
        raise HTTPException(status_code=403, detail="Access denied to template")

    mapping_group = session.get(db_models.TemplateCOAMappingGroup, mapping_group_id)
    if not mapping_group:
        raise HTTPException(status_code=404, detail="Mapping not found")
    
    return mapping_group

def translate_accounts(
    accounts: pl.Series, 
    session: so.Session,
    mapping_group_id: int,
) -> pl.Series:
    """ Translates accounts to mappings """
    accountsDF = (
        accounts
        .str.to_lowercase()
        .to_frame()
    )

    account_translations = pl.read_database(
        query= """
                SELECT
                    base_coa_id, 
                    translated_coa_id,
                    lower(B.account) AS account,
                    lower(T.account) AS translation
                FROM coa_translation
                JOIN coa AS B ON base_coa_id = B.id
                JOIN coa AS T ON translated_coa_id = T.id
                WHERE mapping_group_id = :value
        """,
        connection=session.connection(),
        execute_options={"parameters": {"value": mapping_group_id}}
    )
        
    merged_accounts_to_translations = accountsDF.join(
        account_translations, 
        on='account',
        how='left', 
        maintain_order='left',
        coalesce=True
    )

    merged_accounts_to_translations = merged_accounts_to_translations.with_columns(
        pl.when(pl.col("translation").is_not_null())
        .then(pl.col("translation"))
        .otherwise(pl.col("account"))
        .alias("account")
    )

    result = merged_accounts_to_translations.select(
        pl.col("translated_coa_id"), 
        pl.col("account")
    )

    return result

def get_account_options(session: so.Session, coa_group_id: int, mapping_group_id: int = 0):
    """ Retrieves coa select options for classified transaction tables """
    options_df =  pl.read_database(
        query= """
                SELECT id, account
                FROM coa
                WHERE group_id = :value
        """,
        connection=session.connection(),
        execute_options={"parameters": {"value": coa_group_id}}
    )

    if not mapping_group_id:
        options_df = (
            options_df.with_columns(
                pl.col("account").str.split(" ")
                .list.eval(pl.element().str.to_titlecase())
                .list.join(" ")
            )
            .sort("account")
            .to_dicts() 
        )
        return options_df

    # replace accounts of base coa with their translations under specified mapping
    # accounts without translations are kept
    mixed_options = (
        translate_accounts(options_df['account'], session, mapping_group_id)
        .join(options_df,on='account', how='left', maintain_order='left', coalesce=True)
        .select(
            id=pl.coalesce("translated_coa_id", "id"), 
            account=(
                pl.col("account")
                .str.split(" ")
                .list.eval(pl.element().str.to_titlecase())
                .list.join(" ")
            ),
        )
        .unique()
        .sort("account")
    )

    return mixed_options.to_dicts()

def get_valid_coa_ids(session: so.Session, coa_group_id: int):
    return set(session.scalars(
        sa.select(db_models.COA.id)
        .where(db_models.COA.group_id == coa_group_id)
    ))