from fastapi import UploadFile
from pydantic import BaseModel

class OAuth2Implementation:
    def __init__(self):
        authorization_code_bearer: None
        password_bearer: None

class TransactionUploadFormData(BaseModel):
    template_id: int
    transactions: UploadFile

class LocalUserRegistration(BaseModel):
    email: str
    name: str
    password: str

class GoogleProviderUser(BaseModel):
    email: str
    name: str
    picture: str
    provider_id: str

class LocalUser(BaseModel):
    name: str | None
    email: str
    password: str

class TemplateInfo(BaseModel):
    title: str
    coa_group_id: int

class SummaryRow(BaseModel):
    # description: str
    account: str
    group: int

class ItemizedRow(BaseModel):
    description: str
    account: str
    date: int