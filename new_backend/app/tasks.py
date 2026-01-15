import os
import io
import json
import uuid
import boto3
import secrets
import tempfile
import fasttext
import app.helpers
import polars as pl
import sqlalchemy.orm as so
import app.models.app_models as app_models
import app.models.database_models as db_models
from mypy_boto3_s3.client import S3Client
from app.dependencies import Session, get_s3_client, get_redis_connection, logger
from botocore.exceptions import ClientError

FASTTEXT_LEARNING_RATE = 0.1
FASTTEXT_EPOCH = 5

def create_coa(
    coa_group_name: str,
    s3_object_key: str,
    user_id: int
):
    """
    Creates chart of accounts (coa) from S3 object
    """
    s3_client = boto3.Session().client("s3")

    #channel_data = {"job_id": ,"job_type": "coa_create"}
    
    try:
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=s3_object_key)
        lf = pl.scan_csv(s3_object["Body"], with_column_names=lambda cols: [col.lower() for col in cols])
    except Exception as e:
        logger.exception(f"Error during create_coa() when trying to create polars lazyframe: {e}")
        # app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Server error")
    else:
        with Session() as session:
            lf_columns = set(lf.collect_schema().names())
            missing_columns = {"account"} - lf_columns
            if missing_columns:
                #app.helpers.publish_status(redis_client, user_id, channel_data, False, error=f"Missing required columns: {', '.join(missing_columns)}")
                return

            data = lf.select(pl.col("account").str.to_lowercase()).collect()

            if data.is_empty():
                #app.helpers.publish_status(redis_client, user_id, channel_data, False, error=COA file is empty")
                return
            
            app.helpers.create_coa(session, user_id, coa_group_name, data["account"])
            #app.helpers.publish_status(redis_client, user_id, channel_data, True,)

            session.commit()
    finally:
        app.helpers.delete_s3_object(s3_client, s3_object_key)

def create_template(
    template_info: app_models.TemplateInfo,
    user_id: str,
    s3_object_key: str
):
    """
    Create a new accounting template:
    1. Parse uploaded transaction CSV.
    2. Create COA group (if needed).
    3. Insert Template and Transaction records.
    4. Train FastText model on transactions.
    5. Upload trained model to S3.
    """
    s3_client = boto3.Session().client("s3")

    # channel_data = {"job_id": , "job_type": "template_creation"}
    
    # Step 1: Parse uploaded transaction CSV
    try:
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=s3_object_key)
        lf = pl.scan_csv(
            s3_object["Body"], 
            with_column_names=lambda cols: [col.lower() for col in cols],
            schema_overrides={"amount": pl.Float64},
            null_values=["", "NA", "null"],
        )
    except Exception as e:
        logger.exception(f"Error during create_template() when trying to create polars lazyframe: {e}")
        # app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Server error")
        return
    finally:
        app.helpers.delete_s3_object(s3_client, s3_object_key)

    # Check for required columns
    lf = lf.rename({"memo":"description"}, strict=False)
    
    lf_columns = set(lf.collect_schema().names())
    missing_columns = {"description", "account", "amount"} - lf_columns
    if missing_columns:
        #app.helpers.publish_status(redis_client, user_id, channel_data, False, error=f"Missing required columns: {', '.join(missing_columns)}")
        return

    # Collect data
    data = lf.select(["description", "account", "amount"]).collect()
    
    if data.is_empty():
        # app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Transactions file is empty")
        return

    data = app.helpers.normalize_text(data)
    
    lines = (
        data
        .filter(
            (pl.col('account').is_not_null()) &
            (pl.col('account').str.len_chars() > 0) &
            (pl.col('normalized_description').is_not_null()) &
            (pl.col('normalized_description').str.len_chars() > 0) &
            (pl.col('normalized_description').str.count_matches(r'\S+') >= 3)
        )
        .select(
            pl.format("__label__{} {}", 'account', 'normalized_description').alias('line')
        )
        .get_column('line')
        .to_list()
    )

    try:
        fd, training_file_path = tempfile.mkstemp(suffix=".txt", text=True)
        _, model_file_path = tempfile.mkstemp(suffix=".bin")
        
        with os.fdopen(fd, 'w') as train_fp:
            train_fp.write("\n".join(lines))
             
        model = fasttext.train_supervised(input=training_file_path)
        model.save_model(model_file_path)
        
        model_name = f"{str(uuid.uuid4())}.bin"
        s3_client.upload_file(model_file_path, os.getenv("BUCKET_NAME"), model_name)
    except Exception as e:
        logger.exception(f"Model creation failed (function: create_template): {e}")
        # app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Server error")
    finally:
        app.helpers.cleanup_tempfiles([training_file_path, model_file_path])
    
    with Session() as session:
        # Step 2: Create new COA group (if needed) 
        coa_group_id = template_info.coa_group_id
        if coa_group_id == -1:
            coa_group_id = app.helpers.create_coa(session, user_id, f"{template_info.title}_COA", data["account"].str.replace_all(r'-', ' ').str.to_lowercase())

        # Step 3a: Create Template
        new_template = db_models.Template(title=template_info.title, model_name=model_name, base_coa_group=coa_group_id)
        session.add(new_template)
        session.flush()

        session.add(db_models.UserTemplateAccess(template_id=new_template.id, user_id=user_id, access_level="administrator"))

        # Step 3b: Add transactions to database
        transactions = [db_models.Transaction(description=row['description'], account=row["account"], amount=row['amount'], template_id=new_template.id) for row in data.iter_rows(named=True)]
        session.add_all(transactions)
        session.commit()

def process_transactions_task(
    user_id: int,
    template_id: int,
    s3_object_key: str,
    model_name: str,
    access_token: str,
    job_id: str,
    mapping_group_id: int,
):
    """
    Classifies transactions from the specified S3 object and saves the results
    in a redis session.
    """
    s3_client = boto3.Session().client("s3")
    redis_client = get_redis_connection()

    channel_data = {"job_id": job_id, "job_type": "tables"}

    # Obtain transactions file from S3
    try:
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=s3_object_key)
        lf = pl.scan_csv(
            s3_object["Body"], 
            with_column_names=lambda cols: [col.lower() for col in cols],
            schema_overrides={"amount": pl.Float64},
            null_values=["", "NA", "null"],
        ) 

        # Check for required columns
        lf_columns = set(lf.collect_schema().names())
        missing_columns = {"description", "amount"} - lf_columns

        if missing_columns:
            app.helpers.publish_status(redis_client, user_id, channel_data, False, error=f"Missing required columns: {', '.join(missing_columns)}")
            return

        # Add optional columns with defaults
        if "date" not in lf_columns:
            lf = lf.with_columns(pl.lit(date.today()).alias("date"))
        if "number" not in lf_columns:
            lf = lf.with_columns(pl.lit("").alias("number"))
        if "payee" not in lf_columns:
            lf = lf.with_columns(pl.lit("").alias("payee"))

        # Collect data
        data = lf.select(["date", "number", "payee", "description", "amount"]).collect()
    
        if data.is_empty():
            app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Transactions file is empty")
            return

        # Download and load fasttext model
        fd, model_file_path = tempfile.mkstemp(suffix=".bin")
        with os.fdopen(fd, 'wb') as model_fp:
            s3_client.download_fileobj(os.getenv('BUCKET_NAME'), model_name, model_fp)

        model = fasttext.load_model(model_file_path)

        # Classify transactions
        account, prediction_confidence, simplified_descriptions, group = app.helpers.classify(data['description'], model)
        
        if mapping_group_id:
            with Session() as session:
                account = app.helpers.translate_accounts(account, session, mapping_group_id)['account'].str.to_titlecase()

        data = data.with_columns([account, prediction_confidence, simplified_descriptions, group, ]) # add additional account field (pl.col("account").alias("initial_account"))

        # Create session
        pipe = redis_client.pipeline()
        pipe.hset(f'user-session:{access_token}', mapping={
            "template_id": template_id,
            "mapping_group_id": mapping_group_id,
            "data": app.helpers.compress_dataframe(data)
        })
        redis_client.expire(f'user-session:{access_token}', 10800) # 3 hours
        pipe.execute()
    except Exception as e:
        logger.exception(f"Error during classification: {e}")
        app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Server error")
    else:
        app.helpers.publish_status(redis_client, user_id, channel_data, True,)
    finally:
        app.helpers.cleanup_tempfiles(model_file_path)
        app.helpers.delete_s3_object(s3_client, s3_object_key)       

def create_export_file(
    user_id: int,
    access_token: str,
    export_type: str,
    job_id: str,
):
    redis_client = get_redis_connection()
    s3_client = boto3.Session().client("s3")

    channel_data = {"job_id": job_id, "job_type": "export"}

    parquet_bytes = redis_client.hget(f'user-session:{access_token}', 'data')
    if not parquet_bytes:
        logger.exception(f"Error during create_export_file() when retrieving redis session data: {e}")
        app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Failed to retrieve table data")
        return

    try:
        lf = pl.read_parquet(io.BytesIO(parquet_bytes)).lazy()
    except Exception as e:
        logger.exception(f"Error during create_export_file() when deserializing polars lazy frame: {e}")
        app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Failed to retrieve table data")
        return

    # Collect relevant table data for export
    lf_columns = set(lf.collect_schema().names())
    export_columns = list(lf_columns - {"amount_right", "initial_account" "simplified_descriptions"})
    data = lf.select(export_columns).collect()

    try:
        # Write table data to specified file format
        file_ext = "." + export_type
        fd, export_file_path = tempfile.mkstemp(suffix=file_ext)
        with os.fdopen(fd, 'wb') as fp:
            match export_type:
                case "xlsx":
                    data.write_excel(workbook=fp)
                case "csv":
                    data.write_csv(fp)
                case "_":
                    app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Unsupported file export type provided")
                    return

        # Upload to S3 and notify user of result            
        filename = os.path.basename(export_file_path)
        s3_client.upload_file(export_file_path, os.getenv("BUCKET_NAME"), filename)
    except ClientError as e:
        logger.exception(f"Failed to fetch S3 object {filename}: {e}")
        app.helpers.publish_status(redis_client, user_id, channel_data, False, error="Server error")
    else:
        app.helpers.publish_status(redis_client, user_id, channel_data, True, filename=filename)
    finally:
        app.helpers.cleanup_tempfiles(export_file_path)