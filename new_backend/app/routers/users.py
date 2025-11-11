import os
import io
from typing import Annotated, Dict, Union
from fastapi import APIRouter, File, UploadFile, Depends, BackgroundTasks, Header, Form, HTTPException
from fastapi.responses import StreamingResponse
from app.dependencies import get_session, logger, current_user, get_s3_client, UPLOAD_EXTENSIONS, get_redis_connection
import app.models.app_models as app_models
import app.tasks
import app.helpers
import datetime
import sqlalchemy as sa
import sqlalchemy.orm as so
import app.models.database_models as db_models
import polars as pl
import boto3
from mypy_boto3_s3.client import S3Client
import uuid
from redis import Redis
from botocore.exceptions import ClientError

router = APIRouter(
    prefix="/api/users"
)

@router.post("/{user_id}/coa")
def create_new_chart_of_accounts(
    coa_group_name: Annotated[int, Form()],
    coa_file: Annotated[UploadFile, File()],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    background_tasks: BackgroundTasks
):
    if user["user"].id != user_id:
        raise HTTPException(status_code=401, detail="Incorrect credentials")

    try:
        object_key = app.helpers.upload_file_to_s3(coa_file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail="Invalid file type")
    except Exception as e:
        # log
        raise HTTPException(status_code=500, detail="Server error")
    else:
        background_tasks.add_task(app.tasks.create_coa, coa_group_name, object_key, user_id)

    return {"message": "processing..."}

@router.get("/{user_id}/templates")
def get_user_templates(
    user_id: int, 
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)], 
    session: Annotated[so.Session, Depends(get_session)]
):
    if user["user"].id != user_id:
        raise HTTPException(status_code=401, detail="Incorrect credentials")
 
    # get templates from database
    template_records = session.scalars(
        sa.select(db_models.Template)
        .join(db_models.UserTemplateAccess)
        .where(db_models.UserTemplateAccess.user_id == user_id)
    )

    return {"templates": [{"id": item.id, "title":item.title} for item in template_records]}

@router.post("/{user_id}/templates")
def create_template(
    user_id: int,
    template_title: Annotated[str, Form()],
    template_coa_group_id: Annotated[int, Form()],
    transactions_file: Annotated[UploadFile, File()],
    background_tasks: BackgroundTasks, 
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    session: Annotated[so.Session, Depends(get_session)]
):
    if user_id != user["user"].id:
        raise HTTPException(status_code=401)

    if template_coa_group_id != -1:
        # check that user has access to coa group, if not raise exception
        result = session.execute(
            sa.select(UserCOAAccess.access_level)
            .where(
                sa.and_(
                    UserCOAAccess.user_id == user_id,
                    UserCOAAccess.group_id == template_coa_group_id
                )
            )
        )

        if not result:
            raise HTTPException(status_code=401, detail="Unauthorized to use COA group")

    try:
        file_uploaded = app.helpers.upload_file_to_s3(transactions_file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"{e}")

    if not file_uploaded:
        raise HTTPException(status_code=500, detail=f"Server failed")
    
    template_info = app_models.TemplateInfo(title=template_title, coa_group_id=template_coa_group_id)
    background_tasks.add_task(app.tasks.create_template, template_info, user_id)
    return {"message": "Processing data"}

@router.post("/transactions")
async def process_transactions(
        template_id: Annotated[int, Form()],
        transactions_file: Annotated[UploadFile, File()],
        user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
        session: Annotated[so.Session, Depends(get_session)],
        s3_client: Annotated[S3Client, Depends(get_s3_client)],
        background_tasks: BackgroundTasks,
):
    # check if file is acceptable (https://blog.miguelgrinberg.com/post/handling-file-uploads-with-flask)
    file_ext = os.path.splitext(transactions_file.filename)[1]
    if file_ext not in UPLOAD_EXTENSIONS:
        raise HTTPException(status_code=400, detail="File type not accepted")

    # check if user has access to given template_id
    template_access = session.execute(
        sa.select(
            db_models.UserTemplateAccess.access_level, 
            db_models.Template.model_name
        )
        .join(db_models.Template)
        .where(
            sa.and_(
                db_models.UserTemplateAccess.user_id == user['user'].id,
                db_models.UserTemplateAccess.template_id == template_id
            )
        )
    ).first()

    if not template_access:
        raise HTTPException(status_code=401, detail="Unauthorized to access resource")

    # upload file to s3
    try:
        object_key = app.helpers.upload_file_to_s3(transactions_file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"{e}")

    if not object_key:
        raise HTTPException(status_code=500, detail=f"Server failed")
         
    background_tasks.add_task(
        app.tasks.process_transactions_task,
        user['user'].id,
        template_id,
        object_key, 
        template_access.model_name, 
        user['access_token']
    )
    return {"message": "Notification sent in the background"}

@router.get("/tables")
def send_table_data(
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    session: Annotated[so.Session, Depends(get_session)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)]
):
    access_token = user["access_token"]
    session_data = redis_client.hgetall(f'user-session:{access_token}')
    
    serialized_lf = session_data.get(b'data') #replace with get()
    if not serialized_lf:
        raise HTTPException(status_code=400, detail="Couldn't find your data")

    # send data view to client
    try:
        lf = pl.LazyFrame.deserialize(io.BytesIO(serialized_lf))
    except Exception as e:
        raise HTTPException(status_code=500)

    df = lf.collect()

    itemized = df.select(["date", "number", "payee", "description", "amount", "account", "group"]).to_dicts()

    summary = (
        df.group_by(
            pl.col("group"),
            pl.col("account")
        )
        .agg(
            pl.col("description").first(),
            # pl.col("amount").sum().alias("total"), # schema currently detects amount column as string, change this at processing task
            pl.len().alias("instances")
        )
        .to_dicts()
    )

    # Additionally send COA
    template_id = int(session_data[b'template_id'].decode('utf-8'))

    coa_group_id = session.execute(
        sa.select(db_models.Template.coa_group_id)
        .where(db_models.Template.id == template_id)
    ).scalar_one_or_none()

    options = (
        session.execute(
            sa.select(db_models.COA.account)
            .where(db_models.COA.group_id == coa_group_id)
        )
    )

    return {
        "itemized": itemized,
        "summary": summary,
        "options": [row.account for row in options],
    }

@router.put("/tables/itemized")
def update_itemized_table(
    data: app_models.ItemizedRow,
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)]
):
    access_token = user["access_token"]

    serialized_lf = redis_client.hget(f'user-session:{access_token}', 'data')
    if not serialized_lf:
        raise HTTPException(status_code=400, detail="Couldn't find your data")

    try:
        lf = pl.LazyFrame.deserialize(io.BytesIO(serialized_lf))
    except Exception as e:
        raise HTTPException(status_code=500)

    lf = lf.with_columns(
        pl.when(
            pl.col("date") == data.date, 
            pl.col("description") == data.description
        )
        .then(pl.lit(data.account))
        .otherwise(pl.col("account"))
        .alias("account")
    )

    try:
        updated_serialized_lf = lf.serialize()
        redis_client.hset(f'user-session:{access_token}', key='data', value=updated_serialized_lf)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Couldn't update summary table")

    return {"message": "Row successfully updated"}

@router.put("/tables/summary")
def update_summary_table(
    data: app_models.SummaryRow,
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)]
):
    access_token = user["access_token"]
    serialized_lf = redis_client.hget(f'user-session:{access_token}', 'data')

    if not serialized_lf:
        raise HTTPException(status_code=400, detail="Couldn't find your data")

    try:
        lf = pl.LazyFrame.deserialize(io.BytesIO(serialized_lf))
    except Exception as e:
        raise HTTPException(status_code=500)

    lf = lf.with_columns(
        pl.when(pl.col("group") == data.group)
        .then(pl.lit(data.account))
        .otherwise(pl.col("account"))
        .alias("account")
    )

    try:
        updated_serialized_lf = lf.serialize()
        redis_client.hset(f'user-session:{access_token}', key='data', value=updated_serialized_lf)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail="Couldn't update summary table")

    return {"message": "Values successfully updated"}

@router.get("/documents")
def download_request(
    background_tasks: BackgroundTasks,
    s3_client: Annotated[S3Client, Depends(get_s3_client)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    export_type: str = "csv"
):
    access_token = user["access_token"]
    serialized_lf = redis_client.hget(f'user-session:{access_token}', 'data')

    if not serialized_lf:
        raise HTTPException(status_code=400, detail="Couldn't find your data")

    # run background task that creates tempfile
    background_tasks.add_task(app.tasks.create_export_file, user["user"].id, user["access_token"], export_type)

@router.get("/{user_id}/documents/{document_name}")
async def get_document(
    user_id: int, 
    document_name: str,
    s3_client: Annotated[S3Client, Depends(get_s3_client)],
):
    try:
        # Fetch the object (stream, not download)
        s3_object = s3_client.get_object(Bucket=os.getenv("BUCKET_NAME"), Key=document_name)
        file_stream = s3_object["Body"]  # this is a file-like object

        # Extract metadata for headers (optional)
        content_type = s3_object.get("ContentType", "application/octet-stream")
        content_length = s3_object.get("ContentLength")

        return StreamingResponse(
            file_stream,
            media_type=content_type,
            headers={
                "Content-Disposition": f'attachment; filename="{document_name}"',
                "Content-Length": str(content_length) if content_length else None,
            },
        )

    except ClientError as e:
        if e.response["Error"]["Code"] == "NoSuchKey":
            raise HTTPException(status_code=404, detail="Document not found")
        else:
            raise HTTPException(status_code=500, detail="Error reading from S3")
# @router.get("/{user_id}/documents/{document_name}")
# async def get_document(
#     user_id: int,
#     document_name: str
# ):
#     # read file from s3
#     try:
#         file_path = app.helpers.read_s3_object_to_tempfile(document_name)
#         print(f"FILEPATH: {file_path}")
#         return FileResponse(file_path, filename=document_name)
#     except Exception as e:
#         # log(e)
#         raise HTTPException(status_code=500, detail="Couldn't load data")
#     finally:
#         try:
#             os.remove(file_path)
#             s3_client.delete_object(Bucket=os.getenv('BUCKET_NAME'), Key=object_key)
#         except Exception as e:
#             # log error
#             pass

# upon account creation:
# download generic model from s3
# reupload under different object key
# save as user's generic template
    