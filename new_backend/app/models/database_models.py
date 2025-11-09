import sqlalchemy as sa
import sqlalchemy.orm as so
from datetime import datetime
from sqlalchemy import DateTime, func
from typing import List

class Base(so.DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "user"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    name: so.Mapped[str] = so.mapped_column(sa.String(255))
    email: so.Mapped[str] = so.mapped_column(sa.String(255), unique=True, index=True)
    image: so.Mapped[str] = so.mapped_column(sa.Text)

    # accounts: so.Mapped[List["Account"]] = so.relationship("Account", back_populates="user")
    # templates: so.Mapped[List["UserTemplateAccess"]] = so.relationship(back_populates="user")

    def __repr__(self) -> str:
        return f"User(id={self.id!r}, name={self.name!r}, fullname={self.name!r})"

class Account(Base):
    __tablename__ = "account"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id), index=True)
    provider: so.Mapped[str] = so.mapped_column(sa.String(50))
    provider_type: so.Mapped[str] = so.mapped_column(sa.String(50))
    password_hash: so.Mapped[str | None] = so.mapped_column(sa.String(256))
    access_token: so.Mapped[str | None] = so.mapped_column(
        sa.String(32), index=True, unique=True
    )
    access_expiration: so.Mapped[datetime | None]

    refresh_token: so.Mapped[str | None] = so.mapped_column(
        sa.String(32), index=True, unique=True
    )
    refresh_expiration: so.Mapped[datetime | None]

    created_at: so.Mapped[datetime] = so.mapped_column(
        DateTime(timezone=True), 
        server_default=func.now()
    )
    updated_at: so.Mapped[datetime | None] = so.mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # user: so.Mapped["User"] = so.relationship("User", back_populates="account", uselist=False)

    def set_password(self, password):
        pass

    def check_password(self, password):
        pass

    def get_token(self, expires_in=3600):
        pass
        # now = datetime.now(timezone.utc)
        # if self.token and self.token_expiration is not None and self.token_expiration.astimezone(timezone.utc) > now + timedelta(seconds=60):
        #     return self.token
        # self.token = secrets.token_hex(16)
        # self.token_expiration = now + timedelta(seconds=expires_in)
        # db.session.add(self)
        # return self.token

    def revoke_token(self):
        pass
        # self.token_expiration = datetime.now(timezone.utc) - timedelta(
        #     seconds=1)

    @staticmethod
    def check_token(token):
        pass
        # user = db.session.scalar(sa.select(Users).where(Users.token == token))
        # if user is None or user.token_expiration.astimezone(timezone.utc) < datetime.now(timezone.utc):
        #     print(f"User: {user}")
        #     print(f"Current Time: {datetime.now(timezone.utc)}")
        #     return None
        # return user

class COAIDtoGroup(Base):
    __tablename__ = "coa_id_group"

    group_id: so.Mapped[int] = so.mapped_column(primary_key=True, autoincrement=True)
    group_name: so.Mapped[str] = so.mapped_column(sa.String(128))

    def __repr__(self):
        return '<COAIDtoGroup {}>'.format(self.group_id)

class COA(Base):
    __tablename__ = "coa"

    id: so.Mapped[int] = so.mapped_column(primary_key=True, autoincrement=True)
    group_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(COAIDtoGroup.group_id), index=True)
    account: so.Mapped[str] = so.mapped_column(sa.String(256))

    def __repr__(self):
        return '<COA {}>'.format(self.account)

class UserCOAAccess(Base):
    __tablename__ = "user_coa_access"

    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id), primary_key=True, index=True)
    group_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(COAIDtoGroup.group_id), primary_key=True, index=True)
    access_level: so.Mapped[str | None] = so.mapped_column(sa.String(50))

    def __repr__(self):
        return '<UserCOAAccess {}>'.format(self.id)

class Template(Base):
    __tablename__ = "template"

    id: so.Mapped[int] = so.mapped_column(primary_key=True, index=True)
    title: so.Mapped[str] = so.mapped_column(sa.String(256))
    model_name: so.Mapped[str] = so.mapped_column(sa.String(256), unique=True)
    coa_group_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(COAIDtoGroup.group_id), index=True)
    published: so.Mapped[datetime | None] = so.mapped_column(
        DateTime(timezone=True),
        nullable=True
    )
    updated_at: so.Mapped[datetime | None] = so.mapped_column(
        DateTime(timezone=True),
        nullable=True
    )

    # users: so.Mapped[List["UserTemplateAccess"]] = so.relationship(back_populates="template")

    def __repr__(self):
        return f"<Template {self.title}>"

    def from_dict(self, data):
        for field in ['author', 'title', 'model_name', 'coa_group_id', 'published', 'active']:
            if field in data:
                setattr(self, field, data[field])

class UserTemplateAccess(Base):
    __tablename__ = "user_template_access"

    template_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey("template.id"), primary_key=True)
    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey("user.id"), primary_key=True)
    access_level: so.Mapped[str | None] = so.mapped_column(sa.String(50))
    # hidden: so.Mapped[bool] = so.mapped_column(default=False)
    # prediction_confidence: so.Mapped[float] = so.Mapped_column(sa.Float(), default=0.7)

    # template: so.Mapped["Template"] = so.relationship(back_populates="users")
    # user: so.Mapped["User"] = so.relationship(back_populates="templates")

    def __repr__(self):
        return '<UserTemplateAccess {}>'.format(self.access_level)

class Transaction(Base):
    __tablename__ = "transaction"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    description: so.Mapped[str] = so.mapped_column(sa.String(500))
    account: so.Mapped[str] = so.mapped_column(sa.String(256))
    amount: so.Mapped[float] = so.mapped_column()
    template_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(Template.id), index=True)

    def __repr__(self):
        return '<Transaction {}>'.format(self.description)

class Vendor(Base):
    __tablename__ = "vendor"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    vendor: so.Mapped[str] = so.mapped_column(sa.String(256))
    transaction_descr: so.Mapped[str] = so.mapped_column(sa.String(500))
    template_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(Template.id), index=True)

    def __repr__(self):
        return '<Vendor {}>'.format(self.vendor)

class NewVendorRequest(Base):
    __tablename__ = "new_vendor_request"

    id: so.Mapped[int] = so.mapped_column(primary_key=True)
    transaction_descr: so.Mapped[str] = so.mapped_column(sa.String(500))
    proposed_vendor: so.Mapped[str] = so.mapped_column(sa.String(256))
    user_id: so.Mapped[int] = so.mapped_column(sa.ForeignKey(User.id), index=True)

    def __repr__(self):
        return f"<NewVendorRequests {self.id}>"

# class MarketplaceTemplate(Base):
#     template_id: so.Mapped[int] = so.Mapped_column(sa.ForeignKey(Template.id), index=True, primary_key=True)
#     rating: so.Mapped[float] = so.Mapped_column()
#     price: so.Mapped[float] = so.Mapped_column(index=True)
#     description: so.Mapped[str] = so.Mapped_column(sa.String(500))

#     def __repr__(self):
#         return f"<MarketplaceTemplate {self.template_id}>"

# class MarketplaceTags(Base):
#     id: so.Mapped[int] = so.Mapped_column(primary_key=True)
#     template_id: so.Mapped[int] = so.Mapped_column(sa.ForeignKey(Template.id), index=True)
#     tag: so.Mapped[str] = so.Mapped_column(sa.String(50), index=True)

#     def __repr__(self):
#         return f"<MarketplaceTags {self.template_id}>"
