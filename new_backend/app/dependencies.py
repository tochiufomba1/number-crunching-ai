import os
import sqlalchemy as sa
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
import logging
from typing import Annotated
from fastapi import Header, Depends, HTTPException
import boto3
import app.models.database_models as db_models
from datetime import datetime, timezone
import redis

UPLOAD_EXTENSIONS = ['.csv', '.xlsx']

# Database session initialization (https://docs.sqlalchemy.org/en/20/orm/session_basics.html#id1)
engine = create_engine(
    os.getenv("DATABASE_URL"),
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args={
        "connect_timeout": 10,
        "read_timeout": 30,
        "write_timeout": 30,
    },
)

Session = sessionmaker(engine)

# Logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Session store
r = redis.Redis(host='localhost', port=6379, db=0)

def get_redis_connection():
    return r

def get_session():
    with Session() as session:
        yield session

def current_user(authorization: Annotated[str | None, Header()] = None):
    if authorization: # format: Bearer <token>
        items = authorization.split()
        if len(items) != 2 or items[0].lower() != "bearer":
            raise HTTPException(status_code=401, detail="Malformed authorization header")

        with Session() as session:
            user = session.scalars(
                sa.select(db_models.User)
                .join(db_models.Account)
                .where(
                    sa.and_(
                        db_models.Account.access_token == items[1],
                        db_models.Account.access_expiration > datetime.now(timezone.utc).timestamp()
                    )
                )
            ).first()

        if not user:
            # TODO: Add logic that deletes sessions of expired access tokens 
            raise HTTPException(status_code=401, detail="Incorrect authorization information")
        return {'user': user, 'access_token': items[1]}
    else:
        raise HTTPException(status_code=401, detail="Invalid authorization header")

# Google 'dependency injection fastapi boto3'
def get_boto3_session():
    return boto3.Session()

def get_s3_client(session: Annotated[boto3.Session, Depends(get_boto3_session)]):
    return session.client("s3")


