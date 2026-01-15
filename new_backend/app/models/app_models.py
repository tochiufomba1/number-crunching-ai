from fastapi import UploadFile
from pydantic import BaseModel, Field
import datetime

class OAuth2Implementation:
    def __init__(self):
        authorization_code_bearer: None
        password_bearer: None

class TransactionUploadFormData(BaseModel):
    template_id: int
    transactions: UploadFile

class LocalUserRegistration(BaseModel):
    email: str = Field(pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    name: str
    password: str = Field(min_length=8)

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

class COAMappingUpdate(BaseModel):
    translated_coa_id: int = Field(gt=0)

class TranslationInput(BaseModel):
    """Single account mapping."""
    base_coa_id: int = Field(gt=0)
    translated_coa_id: int = Field(gt=0)

class CreateMappingRequest(BaseModel):
    """Create new mapping group with initial translations."""
    template_id: int = Field(gt=0)
    mapping_name: str
    coa_group_id: int = Field(gt=0, description="User's COA group to map to")
    translations: list[TranslationInput] = Field(
        min_length=1,
        description="Initial account mappings"
    )