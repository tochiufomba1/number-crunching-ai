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

    return object_key

def read_s3_object_to_tempfile(object_key):
    file_ext = os.path.splitext(object_key)[1]

    with tempfile.NamedTemporaryFile(mode="wb", suffix=file_ext, delete=False) as fp:
        try:
            s3_client.download_fileobj(os.getenv('BUCKET_NAME'), object_key, fp)
            return fp.name
        except ClientError as e:
            os.remove(fp.name)
            return ""

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
    descriptions = descriptions.fill_null("")
    descriptions = descriptions.str.strip_chars()
    simplified_descriptions  = (
        descriptions
        .str.to_lowercase()
        .str.replace_all(r"\.", ' ')
        .str.replace_all(
            r"(https?://\S+|www\.\S+|"               
            r"\b(?:re|e)?pay(?:ment|mt|mnt)?s?\b|"  # payment, repayment, etc.
            r"\b(?:post)?paid\b|"                   # paid, postpaid
            r"\b(?:pmt|pymnt|pmnt)s?\b|"            # pmt, pymnt, etc.
            r"(?:merchant\s+)?(?:web)?payment\b|"   # merchant payment, webpayment
            r"(?:mobile)?\bpurchase(?:s)?\b(?:\s+(?:authorized|at|-visa))?|"  # mobile purchase, purchase at VISA
            
            # === Transaction channel/method words ===
            r"\bdirect\b|\bdebit\b|\b(?:tel)(?:ephone)?\b|(?:initiated)|(?:pending)|"
            r"ach(?:billpay)?|ccd|ppd|atm|fsi|fsp|rtp|rbt|visa|misc|nnt|tst|(?:i)?nst(?:ant)?|return|easysavings|zelle|"
            r"paypal|conf|venmo|cash app|(dd)* (\*)*doordash|"
            
            # === Generic punctuation, whitespace, .com ===
            r"(?:^\s+|\s+$|\s{2,}|\.com\b.*|[^\w\s])|"  # leading/trailing/multiple spaces, .com, non-alphanumerics
            
            # === Common stopwords ===
            r"(?:from|www|(?:a|u)mp|httpswww.*)|"
            r"\b(?:web|electronic|checkcard|deduction(?:s)?|trans type|des|name|e2e|online|self|authorized|phone|"
            r"transaction(?:s)?|recur(?:ring)?|service(?:s)?|corporate|util|orig|bill(?:pay)?|"
            r"util_bil(?:l)?|card|ret|ref|sq(?:u)?|on|the|and|of|by|to)\b|"
            
            # === State abbreviations / postal codes ===
            r"\b(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in(?:s)?|ia|ks|ky|la|me|md|ma|mn|ms|mo|mt|"
            r"ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|p(?:o|c)s|edi|pw)\d*\b|"
            r"[x]{2,}\d*[x]*|\d+)",
            ' '  # replace all matches with a space
        )
        .str.strip_chars()  # Remove leading/trailing whitespace
        .str.replace_all(r"\s+", ' ')  # Collapse multiple spaces
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