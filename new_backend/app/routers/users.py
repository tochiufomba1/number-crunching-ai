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
        logger.exception(f"Failed to upload coa file to S3: {e}")
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
    template_records = session.execute(
        sa.select(db_models.Template.id, db_models.Template.title, db_models.Template.base_coa_group)
        .join(db_models.UserTemplateAccess)
        .where(db_models.UserTemplateAccess.user_id == user_id)
    ).mappings().all()

    return template_records

@router.post("/{user_id}/templates")
def create_template(
    user_id: int,
    template_title: Annotated[str, Form()],
    template_coa_group_id: Annotated[int, Form()],
    transactions_file: Annotated[UploadFile, File()],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    session: Annotated[so.Session, Depends(get_session)],
    background_tasks: BackgroundTasks,
):
    if user_id != user["user"].id:
        raise HTTPException(status_code=401)

    if template_coa_group_id != -1:
        # check that user has access to coa group, if not raise exception
        result = session.execute(
            sa.select(db_models.UserCOAAccess.access_level)
            .where(
                sa.and_(
                    db_models.UserCOAAccess.user_id == user_id,
                    db_models.UserCOAAccess.group_id == template_coa_group_id
                )
            )
        )

        if not result:
            raise HTTPException(status_code=401, detail="Unauthorized to use COA group")

    try:
        object_key = app.helpers.upload_file_to_s3(transactions_file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"{e}")
    except (ClientError, Exception) as e:
        logger.exception(f"Error during S3 upload (function: create_template): {e}")
        raise HTTPException(status_code=500, detail="Server failure")
    else:
        template_info = app_models.TemplateInfo(title=template_title, coa_group_id=template_coa_group_id)
        background_tasks.add_task(app.tasks.create_template, template_info, user_id, object_key)
        return {"message": "Processing data"}

@router.post("/transactions")
async def process_transactions(
    template_id: Annotated[int, Form()],
    mapping_group_id: Annotated[int, Form()],
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
    template_access = app.helpers.verify_template_access(session, user['user'], template_id)
    if not template_access:
        raise HTTPException(status_code=401, detail="Unauthorized to access resource")
        
    # check for mapping access if mapping was selected
    if mapping_group_id and not app.helpers.verify_mapping_access(session, user['user'].id, template_id, mapping_group_id):
        raise HTTPException(status_code=403, detail="Could not find requested mapping")

    # upload file to s3
    try:
        object_key = app.helpers.upload_file_to_s3(transactions_file)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=f"{e}")
    except Exception as e:
        logger.exception(f"Error uploading to S3 (function: process_transactions): {e}")
        raise HTTPException(status_code=500, detail=f"Server failed")

    # Start background task
    job_id = str(uuid.uuid4())
    background_tasks.add_task(
        app.tasks.process_transactions_task,
        user['user'].id,
        template_id,
        object_key, 
        template_access.model_name, 
        user['access_token'],
        job_id,
        mapping_group_id
    )

    return {"job_id": job_id}

@router.get("/tables")
def send_table_data(
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    session: Annotated[so.Session, Depends(get_session)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)],
):
    access_token = user["access_token"]
    user_session_data = redis_client.hgetall(f'user-session:{access_token}')
    
    parquet_bytes = user_session_data.get(b'data')
    if not parquet_bytes:
        raise HTTPException(status_code=500, detail="Couldn't find your data")

    # send data view to client
    try:
        df = pl.read_parquet(io.BytesIO(parquet_bytes))
    except Exception as e:
        raise HTTPException(status_code=500) 

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

    # Additionally send COA options
    template_id = int(user_session_data[b'template_id'].decode('utf-8'))
    mapping_group_id = int(user_session_data[b'mapping_group_id'].decode('utf-8'))
    template = session.get(db_models.Template, template_id)

    options = app.helpers.get_account_options(session, template.base_coa_group, mapping_group_id)

    return {
        "itemized": itemized,
        "summary": summary,
        "options": options,
    }

@router.put("/tables/itemized")
def update_itemized_table(
    data: app_models.ItemizedRow,
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)]
):
    access_token = user["access_token"]

    parquet_bytes = redis_client.hget(f'user-session:{access_token}', 'data')
    if not parquet_bytes:
        raise HTTPException(status_code=500, detail="Couldn't find your data")

    try:
        lf = pl.read_parquet(io.BytesIO(parquet_bytes)).lazy()
    except Exception as e:
        logger.exception(f"Error when reading parquet bytes (function: update_itemized_table): {e}")
        raise HTTPException(status_code=500)

    lf = lf.with_columns(
        pl.when(
            pl.col("date") == data.date, 
            pl.col("description") == data.description,
            pl.col("amount") == data.amount
        )
        .then(pl.lit(data.account))
        .otherwise(pl.col("account"))
        .alias("account")
    )

    try:
        updated_parquet_bytes = app.helpers.compress_dataframe(lf.collect())
        redis_client.hset(f'user-session:{access_token}', key='data', value=updated_parquet_bytes)
    except Exception as e:
        logger.exception(f"Error when compressing and saving updated dataframe (function: update_itemized_table): {e}")
        raise HTTPException(status_code=500, detail="Couldn't update summary table")

    return {"message": "Row successfully updated"}

@router.put("/tables/summary")
def update_summary_table(
    data: app_models.SummaryRow,
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
    redis_client: Annotated[Redis, Depends(get_redis_connection)]
):
    access_token = user["access_token"]
    parquet_bytes = redis_client.hget(f'user-session:{access_token}', 'data')

    if not parquet_bytes:
        raise HTTPException(status_code=400, detail="Couldn't find your data")

    try:
        lf = pl.read_parquet(io.BytesIO(parquet_bytes)).lazy()
    except Exception as e:
        logger.exception(f"Error when reading parquet bytes (function: update_summary_table): {e}")
        raise HTTPException(status_code=500)

    lf = lf.with_columns(
        pl.when(pl.col("group") == data.group)
        .then(pl.lit(data.account))
        .otherwise(pl.col("account"))
        .alias("account")
    )

    try:
        updated_parquet_bytes = app.helpers.compress_dataframe(lf.collect())
        redis_client.hset(f'user-session:{access_token}', key='data', value=updated_parquet_bytes)
    except Exception as e:
        logger.exception(f"Error when compressing and saving updated dataframe (function: update_summary_table): {e}")
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
    job_id = str(uuid.uuid4())
    background_tasks.add_task(app.tasks.create_export_file, user["user"].id, user["access_token"], export_type, job_id)
    
    return {"job_id": job_id}

@router.get("/{user_id}/documents/{document_name}")
async def get_document(
    user_id: int, 
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
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

@router.post("/mappings")
def create_mapping(
    request: app_models.CreateMappingRequest,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    template = app.helpers.verify_template_access(session, user['user'], request.template_id)

    app.helpers.verify_coa_access(session, user["user"].id, request.coa_group_id)

    # check for self-mapping
    if request.coa_group_id == template.base_coa_group:
        raise HTTPException(status=400)

    existing_mapping = session.scalar(
        sa.select(sa.exists())
        .where(
            db_models.TemplateCOAMappingGroup.template_id == request.template_id,
            db_models.TemplateCOAMappingGroup.user_id == user['user'].id,
            db_models.TemplateCOAMappingGroup.coa_group_id == request.coa_group_id,
            db_models.TemplateCOAMappingGroup.name == request.mapping_name
        )
    )
    
    if existing_mapping:
        raise HTTPException(status_code=400, detail="Mapping already exists for this template and COA group.")

    valid_base_coas = app.helpers.get_valid_coa_ids(session, template.base_coa_group)    
    valid_translated_coas = app.helpers.get_valid_coa_ids(session, request.coa_group_id)

    # validate proposed base COAS
    invalid_base_coas = set([t.base_coa_id for t in request.translations]) - valid_base_coas
    if invalid_base_coas:
        raise HTTPException(status_code=400, detail=f"One or more provided base COA(s) are not from template's base COA group")

    # validate proposed translations
    invalid_translations = set([t.translated_coa_id for t in request.translations]) - valid_translated_coas
    if invalid_translations:
        raise HTTPException(status_code=400, detail=f"One or more provided translated COA items are not of translation COA group")

    # write mapping to database
    try:
        mapping = db_models.TemplateCOAMappingGroup(
            template_id=request.template_id,
            coa_group_id=request.coa_group_id,
            user_id=user['user'].id,
            name=request.mapping_name
        )
        session.add(mapping)
        session.flush()
        
        translation_objects = [
            db_models.COATranslation(
                mapping_group_id=mapping.id,
                base_coa_id=t.base_coa_id,
                translated_coa_id=t.translated_coa_id
            )
            for t in request.translations
        ]
        session.add_all(translation_objects)
        session.commit()
        
        logger.info(
            f"Created mapping group {mapping.id} with {len(request.translations)} translations "
            f"for user {user['user'].id}, template {request.template_id}"
        )
        
        return {
            "message": "Mapping created successfully",
            "mapping_group_id": mapping.id,
            "translation_count": len(request.translations)
        }
    except sa.exc.IntegrityError as e:
        raise HTTPException(status_code=400)
    except Exception as e:
        logger.exception(f"Error creating mapping: {e}")
        raise HTTPException(status_code=500, detail="Failed to create mapping")

@router.get("/templates/{template_id}/mappings")
def list_user_mappings(
    template_id: int,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    template = app.helpers.verify_template_access(session, user['user'], template_id)

    mappings_list = session.execute(
        sa.select(
            db_models.TemplateCOAMappingGroup.id, 
            db_models.TemplateCOAMappingGroup.name,
            db_models.TemplateCOAMappingGroup.coa_group_id
        )
        .where(
            db_models.TemplateCOAMappingGroup.user_id == user["user"].id,
            db_models.TemplateCOAMappingGroup.template_id == template_id
        )
    ).mappings().all()
    
    return mappings_list

@router.get("/templates/{template_id}/base-accounts")  # Get base COA accounts
def generate_empty_translation(
    template_id: int,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    template = app.helpers.verify_template_access(session, user['user'], template_id)

    blank_base_translations = pl.read_database(
        query="""
            SELECT
                id AS base_coa_id,
                account AS base_account,
                'Unassigned' AS translated_account
            FROM coa
            WHERE coa.group_id = :coa_group_id
        """,
        connection=session.connection(),
        execute_options={"parameters": {"coa_group_id": template.base_coa_group,}}
    )

    blank_base_translations = (
        blank_base_translations.with_columns([pl.col("base_account").str.to_titlecase()])
        .to_dicts()
    )

    return blank_base_translations

@router.get("/{user_id}/mappings/{mapping_id}/translations")  # Get translations
def get_mapping_translations(
    user_id: int,
    mapping_id: int,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    mapping = session.get(db_models.TemplateCOAMappingGroup, mapping_id)
    template = session.get(db_models.Template, mapping.template_id)

    if not mapping or mapping.user_id != user["user"].id:
        raise HTTPException(status_code=403, detail="Cannot access mapping")

    translations = pl.read_database(
        query= """
            SELECT 
                coa.id AS base_coa_id, 
                coa.account AS base_account,
                COALESCE(coa_translation.translated_coa_id, -1) AS translated_coa_id,
                COALESCE(translated_coa.account, 'Unassigned') AS translated_account
            FROM coa
            LEFT JOIN coa_translation ON 
                coa.id = coa_translation.base_coa_id 
                AND coa_translation.mapping_group_id = :mapping_id
            LEFT JOIN coa as translated_coa ON 
                coa_translation.translated_coa_id = translated_coa.id
            WHERE coa.group_id = :coa_group_id
        """,
        connection=session.connection(),
        execute_options={"parameters": {"coa_group_id": template.base_coa_group, "mapping_id": mapping_id}}
    )

    translations = translations.with_columns([
        pl.col("base_account").str.to_titlecase().alias("base_account"),
        pl.col("translated_account").str.to_titlecase().alias("translated_account"),
    ])

    return translations.to_dicts()

@router.put("{user_id}/mappings/{mapping_id}/{base_coa_id}")
def update_mapping(
    user_id: int,
    mapping_id: int,
    base_coa_id: int,
    request: app_models.COAMappingUpdate,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    # Avoid self-mapping
    if base_coa_id == request.translated_coa_id:
        raise HTTPException(status_code=400, detail="Cannot map an account to itself")

    mapping = session.get(db_models.TemplateCOAMappingGroup, mapping_id)

    if not mapping or mapping.user_id != user["user"].id:
        raise HTTPException(status_code=403, detail="Cannot access mapping")
        
    template = session.get(db_models.Template, mapping.template_id)
    valid_base_coa = session.scalar(
        sa.select(sa.exists())
        .where(
            db_models.COA.id == base_coa_id,
            db_models.COA.group_id == template.base_coa_group
        )
    )
    if not valid_base_coa:
        raise HTTPException(status_code=400, detail="Provided account is not template's COA group")

    valid_translation_coa = session.scalar(
        sa.select(sa.exists())
        .where(
            db_models.COA.id == request.translated_coa_id,
            db_models.COA.group_id == mapping.coa_group_id
        )
    )
    if not valid_translation_coa:
        raise HTTPException(status_code=400, detail="Invalid COA translation")

    try:
        existing_translation = session.get(
            db_models.COATranslation,
            (mapping_id, base_coa_id)
        )

        if existing_translation:
            existing_translation.translated_coa_id = request.translated_coa_id
        else:
            new_translation = db_models.COATranslation(
                mapping_group_id=mapping_id,
                base_coa_id=base_coa_id,
                translated_coa_id=request.translated_coa_id,
            )
            session.add(new_translation)

        session.commit()
    except sa.exc.IntegrityError as e:
        raise HTTPException(
            status_code=400,
            detail="Invalid mapping: check that accounts exist and are in correct groups"
        )
    except Exception as e:
        logger.exception(f"Unexpected error updating mapping: {e}")
        raise HTTPException(status_code=500, detail="Failed to update selected mapping")

    return {"message": "Mapping updated successfully"}

@router.get("/{user_id}/coas")
def get_coa_options(
  user_id: int,
  session: Annotated[so.Session, Depends(get_session)],
  user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],  
):
    user_coa_groups = session.execute(
        sa.select(
            db_models.COAIDtoGroup.group_id,
            db_models.COAIDtoGroup.group_name
        )
        .join(
            db_models.UserCOAAccess,
            sa.and_(
                db_models.UserCOAAccess.user_id == user["user"].id,
                db_models.UserCOAAccess.group_id == db_models.COAIDtoGroup.group_id
            )
        )
    ).mappings().all()

    return user_coa_groups    

@router.get("/coas/{coa_group_id}/accounts")
def get_coa(
    coa_group_id: int,
    session: Annotated[so.Session, Depends(get_session)],
    user: Annotated[Dict[str, Union[db_models.User, str]], Depends(current_user)],
):
    app.helpers.verify_coa_access(session, user["user"].id, coa_group_id)

    accounts = app.helpers.get_account_options(session, coa_group_id)

    return accounts