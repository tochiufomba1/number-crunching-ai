import os
import uuid
import boto3
import fasttext
import socketio
import numpy as np
import polars as pl
import networkx as nx
from fastapi import UploadFile
from datasketch import MinHash, MinHashLSH
from app.dependencies import UPLOAD_EXTENSIONS
from botocore.exceptions import ClientError
import tempfile
import sqlalchemy.orm as so
from mypy_boto3_s3.client import S3Client

PAYMENT_TERMS = [
    r"\b(?:re|e)?pay(?:ment|mt|mnt)?s?\b",
    r"\b(?:post)?paid\b",
    r"\b(?:pmt|pymnt|pmnt)s?\b",
    r"(?:merchant\s+)?(?:web)?payment\b",
    r"(?:mobile)?\bpurchase(?:s)?\b(?:\s+(?:authorized|at|-visa))?",
]

TRANSACTION_CHANNELS = [
    r"\b(?:debit|direct|initiated|pending)\b",
    r"\b(?:ach(?:billpay)?|ccd|ppd|atm|visa|zelle|paypal|venmo|cash\s+app)\b",
]

GENERIC_TERMS = [
    r"\b(?:web|electronic|checkcard|deduction(?:s)?|transaction(?:s)?)\b",
    r"\b(?:recur(?:ring)?|service(?:s)?|corporate|online|authorized)\b",
    r"\b(?:card|ref|sq(?:u)?)\b",
]

STOPWORDS = [
    r"\b(?:from|www|amp|the|and|of|by|to|on|at|in)\b",
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
    try:
        s3_client.upload_fileobj(file.file, os.getenv("BUCKET_NAME"), object_key)
    except ClientError as e:
        raise
    else:
        return object_key

def get_minhash(text):
    m = MinHash(num_perm=128)
    
    words = text.split() #[:3]
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
    model: fasttext.FastText
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
        .str.replace_all(r'__label__', '')
        .str.replace_all(r'_', ' ')
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
    confidenceGroups = np.select(conditions, choices, "None")

    # prepare new columns
    prediction_confidence = pl.Series("prediction_confidence", confidenceGroups)
    #simplified_descriptions = pl.Series("simplified_descriptions", descriptions)
    groups = group(simplified_descriptions, simplified_descriptions.len())
   
    return accounts, prediction_confidence, simplified_descriptions.alias("simplified_descriptions"), groups

def emit_job_status(user_id: int, job_type: str, status: str):
    with socketio.SimpleClient() as sio:
        sio.connect('http://localhost:3000')
        sio.emit(job_type, {
            'recipient': str(user_id),
            'job_type': job_type,
            'status': status
        })
    print("emitted")

def clean_data(data: pl.DataFrame) -> pl.DataFrame:
    """
    Faster vectorized version using only Polars expressions.
    Trade-off: Less flexible but much faster on large datasets.
    """
    cleaned = data.with_columns([
        # Description cleaning
        pl.col("description")
        .fill_null("")
        .str.to_lowercase()
        .str.strip_chars()
        .str.replace_all(r"\.", ' ')
        .str.replace_all(NOISE_PATTERN, ' ')
        # .str.replace_all(r'[^\w\s]', ' ')
        .str.replace_all(r'\s+', ' ')
        .str.strip_chars(),
        
        # Account cleaning
        pl.col("account")
        .fill_null("unknown")
        .str.replace_all(r'[^\w\s]', '')
        .str.replace_all(r'\s+', '_')
        .str.to_titlecase()
        .alias("account")
    ])
    
    # Filter invalid rows
    return cleaned.filter(
        (pl.col("description").str.len_chars() > 0) &
        (pl.col("account") != "Unknown")
    )

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
        for account in coa_entries.unique().str.replace_all(r'[^\w\s]', '').str.replace_all(r'\s+', ' ').str.to_titlecase().to_list()
    ]

    session.add_all(coa_items)

    return coa_group_id

def delete_s3_object(s3_client: S3Client, s3_object_key: str) -> None:
    try:
        response = s3_client.delete_object(Bucket=os.getenv('BUCKET_NAME'), Key=s3_object_key)
    except ClientError as e:
        print(e)
    except Exception as e:
        print(e)