import os
from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import redis

import app.models.app_models as  app_models
import app.models.database_models as  db_models
import sqlalchemy.orm as so
from typing import Annotated
from fastapi import Depends
import polars as pl

# Source: https://testdriven.io/courses/fastapi-celery/app-factory/
load_dotenv()

from app.dependencies import get_session

def create_app() -> FastAPI:
    app = FastAPI()

    from app.routers import users
    from app.routers import auth
    app.include_router(users.router)
    app.include_router(auth.router)

    @app.get("/")
    async def root():
        return {"message": "Hello World"}
        
    return app