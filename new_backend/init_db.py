import os
import argon2
import polars as pl
import sqlalchemy.orm as so
from dotenv import load_dotenv
from sqlalchemy import create_engine
import app.models.database_models as db_models

load_dotenv()
ph = argon2.PasswordHasher()
filepath = os.path.join(os.getcwd(), "fake_transactionsx7.csv")
engine = create_engine(os.getenv("DATABASE_URL"))
Session = so.sessionmaker(engine)

with Session() as session:
    try:
        data = (
            pl.scan_csv(filepath)
            .select(
                pl.col("description"),
                pl.col("account"),
                pl.lit(0).alias("amount")
            )
            .collect()
        )

        # Create administrative user
        user = db_models.User(name='universal', email='universal@example.com', image="url_placeholder")
        session.add(user)
        session.flush()

        # Create administrative user's account
        pwhash = ph.hash(os.getenv("ADMIN_PASSWORD"))
        account = db_models.Account(user_id=user.id, provider="local", provider_type="local", password_hash=pwhash)
        session.add(account)
        
        # Create COA group
        coa_group = db_models.COAIDtoGroup(group_name='Generic_COA')
        session.add(coa_group)
        session.flush()

        # Establish user access to COA
        session.add(
            db_models.UserCOAAccess(
                user_id=user.id, 
                group_id=coa_group.group_id, 
                access_level="administrator"
            )
        )

        # Populate COA group
        coa_items = [
            db_models.COA(group_id=coa_group.group_id, account=account) 
            for account in data.get_column("account").unique().to_list()
        ]
        session.add_all(coa_items)

        # Create generic starter template
        new_template = db_models.Template(title="Generic", model_name="generic.bin", coa_group_id=coa_group.group_id)
        session.add(new_template)
        session.flush()

        # Establish user access to template
        session.add(db_models.UserTemplateAccess(template_id=new_template.id, user_id=user.id, access_level="administrator"))

        # Add transactions for future training
        transactions = [db_models.Transaction(description=row['description'], account=row["account"], amount=row['amount'], template_id=new_template.id) for row in data.iter_rows(named=True)]
        session.add_all(transactions)
    except Exception as e:
        session.rollback()
        print(e)
    else:
        session.commit()