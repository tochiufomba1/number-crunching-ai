import os
import io
import boto3
import secrets
import tempfile
import fasttext
import app.helpers
import polars as pl
import sqlalchemy.orm as so
import app.models.app_models as app_models
import app.models.database_models as db_models
from typing import Annotated
from fastapi import UploadFile, Depends, HTTPException, BackgroundTasks
from mypy_boto3_s3.client import S3Client
from app.dependencies import Session, get_s3_client, get_redis_connection
from botocore.exceptions import ClientError
import json

FASTTEXT_LEARNING_RATE = 0.5
FASTTEXT_EPOCH = 20

def create_coa(
    coa_group_name: str,
    s3_object_key: str,
    user_id: int
):
    """

    """
    s3_client = boto3.Session().client("s3")
    
    try:
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=s3_object_key)
        file_stream = s3_object["Body"]
        lf = pl.scan_csv(file_stream, with_column_names=lambda cols: [col.lower() for col in cols])
    except Exception as e:
        print(e)
    else:
        with Session() as session:
            lf_columns = set(lf.collect_schema().names())
            missing_columns = {"account"} - lf_columns
            if missing_columns:
                #app.helpers.emit_job_status(user_id, "tables", f"Failed,Missing required columns: {', '.join(missing_columns)}")
                return

            data = lf.select(pl.col("account")).collect()

            if data.is_empty():
                #app.helpers.emit_job_status(user_id, "tables", f"Failed,Empty file")
                return
            
            app.helpers.create_coa(session, user_id, coa_group_name, data["account"])
            # app.helpers.emit_job_status(user_id, "new_coa_group", "Success")

            app.helpers.delete_s3_object(s3_client, s3_object_key)

            session.commit()
            return

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
    
    # Step 1: Parse uploaded transaction CSV
    try:
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=s3_object_key)
        transactions = s3_object["Body"]
        lf = pl.scan_csv(transactions, with_column_names=lambda cols: [col.lower() for col in cols])
    except ClientError as e:
        print(e)
    except Exception as e:
        print(e)
        #app.helpers.emit_job_status(user_id, "tables", "Failed,Server error")
    else:
        with Session() as session:
            lf = lf.rename({"memo":"description"}, strict=False)

            lf_columns = set(lf.collect_schema().names())
            missing_columns = {"description", "account", "amount"} - lf_columns
            if missing_columns:
                app.helpers.emit_job_status(user_id, "tables", f"Failed,Missing required columns: {', '.join(missing_columns)}")
                return

            data = (
                lf
                .select(["description", "account", "amount"]) # do modifications on 'account' rep
                .collect()
            )

            if data.is_empty():
                app.helpers.emit_job_status(user_id, "tables", f"Failed,Empty file")
                return

            # Step 2: Create new COA group (if needed) 
            coa_group_id = template_info.coa_group_id
            if coa_group_id == -1:
                coa_group_id = app.helpers.create_coa(session, user_id, f"{template_info.title}_COA", data["account"])

            # Step 3a: Create Template
            model_name = f"{secrets.token_hex(16)}.bin"
            new_template = db_models.Template(title=template_info.title, model_name=model_name, coa_group_id=coa_group_id)
            session.add(new_template)
            session.flush()

            session.add(db_models.UserTemplateAccess(template_id=new_template.id, user_id=user_id, access_level="administrator"))

            # Step 3b: Add transactions to database
            transactions = [db_models.Transaction(description=row['description'], account=row["account"], amount=row['amount'], template_id=new_template.id) for row in data.iter_rows(named=True)]
            session.add_all(transactions)

            # Step 4: Train Fasttext models on transactions
            cleaned_data = app.helpers.clean_data(data)

            lines = [
                f"__label__{t['account']} {t['description']}"
                for t in cleaned_data.iter_rows(named=True)
            ]
        
            with tempfile.NamedTemporaryFile(mode="w", suffix=".txt") as train_fp, \
            tempfile.NamedTemporaryFile(mode="w", suffix=".bin") as model_fp:
                try:
                    train_fp.write("\n".join(lines))
                    model = fasttext.train_supervised(input=train_fp.name, lr=FASTTEXT_LEARNING_RATE, epoch=FASTTEXT_EPOCH)

                    # Step 5: Upload model to S3
                    model.save_model(model_fp.name)
                    response = s3_client.upload_file(model_fp.name, os.getenv("BUCKET_NAME"), model_name)
                except ClientError as e:
                    print(f"ERROR: {e}")
                    app.helpers.emit_job_status(user_id, "tables", f"Failed,Couldn't upload your template")
                    return
                except Exception as e:
                    print(f"ERROR: 1 {e}")
                    app.helpers.emit_job_status(user_id, "tables", f"Failed,Server error")
                    return
            
            # delete transactions file
            app.helpers.delete_s3_object(s3_client, s3_object_key)
 
            session.commit()
            return

def process_transactions_task(
    user_id: int,
    template_id: int,
    object_key: str,
    model_name: str,
    access_token: str,
    job_id: str,
):
    """
    Classifies transactions from a specified S3 object and saves the results
    in a redis session.
    """
    s3_client = boto3.Session().client("s3")
    redis_client = get_redis_connection()

    channel_data = {"job_id": job_id, "job_type": "tables"}
    
    # Obtain transactions file from S3
    file_ext = os.path.splitext(object_key)[1]
    with tempfile.NamedTemporaryFile(mode="wb", suffix=file_ext, delete=False) as upload_file_fp:
        try:
            s3_client.download_fileobj(os.getenv('BUCKET_NAME'), object_key, upload_file_fp)
        except ClientError as e:
            os.remove(upload_file_fp.name)
            channel_data |= {"success": False, "error": "Server error"}
            redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
            return
        transactions_filepath = upload_file_fp.name    

    # Enter file contents to polars dataframe
    try:
        lf = (
            pl.scan_csv(
                transactions_filepath,
                with_column_names=lambda cols: [col.lower() for col in cols]
            )
        )
    except Exception as e:
        channel_data |= {"success": False, "error": "Server error"}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        return

    lf_columns = set(lf.collect_schema().names())
    missing_columns = {"description", "amount"} - lf_columns
    if missing_columns:
        channel_data |= {"success": False, "error": f"Missing required columns: {', '.join(missing_columns)}"}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        return

    if "date" not in lf_columns:
        lf = lf.with_columns(pl.lit(date.today()).alias("date"))

    if "number" not in lf_columns:
        lf = lf.with_columns(pl.lit("").alias("number"))

    if "payee" not in lf_columns:
        lf = lf.with_columns(pl.lit("").alias("payee"))

    data = (
        lf
        .select(["description", "amount"])
        .collect()
    )

    if data.is_empty():
        channel_data |= {"success": False, "error": "Transactions file is empty."}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        return

    # download fasttext model from s3
    with tempfile.NamedTemporaryFile(mode="wb", suffix=".bin", delete=False) as model_fp:
        try:
            s3_client.download_fileobj(os.getenv('BUCKET_NAME'), model_name, model_fp)
        except ClientError as e:
            os.remove(model_fp.name)
            channel_data |= {"success": False, "error": "Server error"}
            redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
            return # add log
        model_path = model_fp.name

    try:
        model = fasttext.load_model(model_path)
    except Exception as e:
        channel_data |= {"success": False, "error": "Server error"}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        os.remove(model_path)
        return # log

    # Classify transactions
    try:
        descriptions = data['description']
        account, prediction_confidence, simplified_descriptions, group = app.helpers.classify(descriptions, model)
        data = data.with_columns([account, prediction_confidence, simplified_descriptions,group]).lazy()
        lf = lf.join(data, on='description', how='left')
    except Exception as e:
        channel_data |= {"success": False, "error": "Server error"}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        return # log
    finally:
        os.remove(model_path)

    try:
        response = s3_client.delete_object(Bucket=os.getenv('BUCKET_NAME'), Key=object_key)
    except Exception as e:
        print(e)

    # create session data
    serialized_lf = lf.serialize()
    redis_client.hset(f'user-session:{access_token}', mapping={
        "template_id": template_id,
        "data": serialized_lf
    })
    redis_client.expire(f'user-session:{access_token}', 10800) # 3 hours

    # publish success event
    channel_data |= {"success": True}
    redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
    return

def create_export_file(
    user_id: int,
    access_token: str,
    export_type: str,
    job_id: str,
):
    redis_client = get_redis_connection()
    s3_client = boto3.Session().client("s3")

    channel_data = {"job_id": job_id, "job_type": "export"}

    serialized_lf = redis_client.hget(f'user-session:{access_token}', 'data')
    if not serialized_lf:
        channel_data |= {"success": False, "error": "Sever Error."}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
        return

    try:
        lf = pl.LazyFrame.deserialize(io.BytesIO(serialized_lf))
    except Exception as e:
        channel_data |= {"success": False, "error": "Sever Error."}
        redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
    else:
        lf_columns = set(lf.collect_schema().names())
        export_columns = list(lf_columns - {"amount_right", "simplified_descriptions"})
        data = (
            lf
            .select(export_columns)
            .collect()
        )

        file_ext = "." + export_type
        with tempfile.NamedTemporaryFile(mode="wb", suffix=file_ext) as fp:
            match export_type:
                case "xlsx":
                    data.write_excel(workbook=fp)
                case "csv":
                    data.write_csv(fp)
                case "_":
                    channel_data |= {"success": False, "error": "Unsupported file export type provided."}
                    redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
                    return
                    
            try:
                filename = os.path.basename(fp.name)
                response = s3_client.upload_file(fp.name, os.getenv("BUCKET_NAME"), filename)
            except ClientError as e:
                channel_data |= {"success": False, "error": "Sever Error."}
                redis_client.publish(f"user:{user_id}", json.dumps(channel_data))
            else:
                channel_data |= {"success": True, "filename": filename}
                redis_client.publish(f"user:{user_id}", json.dumps(channel_data))        
    

    
    