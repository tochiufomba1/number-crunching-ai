from typing import Annotated
from fastapi import Depends, HTTPException, status, Form, APIRouter, Body
import app.models.app_models as app_models
import app.models.database_models as db_models
from app.dependencies import get_session, current_user
import sqlalchemy as sa
import argon2
import secrets
import sqlalchemy.orm as so
import datetime

router = APIRouter(
    prefix= "/api/auth",
)

ph = argon2.PasswordHasher()

@router.post("/users")
def register_new_user(data: app_models.LocalUser, session: Annotated[so.Session, Depends(get_session)]):
    # check if requester already has an account    
    if session.scalars(sa.select(db_models.User).where(db_models.User.email == data.email)).first():
        raise HTTPException(
            status_code=400, 
            detail="Unsuccessful registration"
        )
        
    # create new user
    pwhash = ph.hash(data.password)
    new_user = db_models.User(name=data.name, email=data.email, image="default_image")
    session.add(new_user)
    session.flush() # Review
    new_user_account = db_models.Account(user_id=new_user.id, provider="local", provider_type="local", password_hash=pwhash)
    session.add(new_user_account)
    session.commit()

    return {"message": "successfully created user"}

# get authorization code, exchange for access and refresh tokens
@router.post("/tokens")
async def login(
    data: app_models.LocalUser | app_models.GoogleProviderUser, 
    provider: Annotated[str, Body()],
    session: Annotated[so.Session, Depends(get_session)]
):
    token_dict = authenticate_user(data, provider, session)
    return token_dict

@router.delete("/api/tokens")
async def sign_out(
    user: Annotated[db_models.User, Depends(current_user)], 
    session: Annotated[so.Session, Depends(get_session)]
):
    account = session.scalars(
        sa.select(db_models.Account)
        .where(
            sa.and_(
                db_models.Account.access_token == user.access_token,
            )
        )
    ).first()

    access_token = user["access_token"]

    # delete user session and expire token
    r.delete(f'user-session:{access_token}')
    account.access_expiration = datetime.now(timezone.utc) - timedelta(seconds=1)

    session.commit()

def authenticate_user(
    data: app_models.LocalUser | app_models.GoogleProviderUser, 
    provider: str,
    session: so.Session,
    expires_in: int = 3600
):
    user_account = session.scalars(
        sa.select(db_models.Account)
        .join(db_models.User)
        .where(db_models.User.email == data.email)
    ).first()

    if user_account:
        match provider:
            case "local":
                try:
                    ph.verify(user_account.password_hash, data.password)
                except Exception as e:
                    raise HTTPException(status_code=401, detail="Incorrect credentials")
                    
                if ph.check_needs_rehash(user_account.password_hash):
                    user_account.password_hash = ph.hash(data.password)
            case "google":
                pass
                # update image, if need be
    else:
        match provider:
            case "local":
                raise HTTPException(status_code=401, detail="Incorrect credentials")
            case "google":
                new_user = db_models.User(name=data.name, email=data.email, image=data.image)
                session.add(new_user)
                session.flush()
                new_user_account = db_models.Account(user_id=new_user.id, provider="google", provider_type="oauth")
                session.add(new_user_account)
                user_account = new_user_account
        
    user_account.access_token = secrets.token_hex(16)
    user_account.access_expiration = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=expires_in)
    session.commit()

    return {"id": str(user_account.user_id), "access_token": user_account.access_token , "access_exp": int(user_account.access_expiration.timestamp())} #TODO





        