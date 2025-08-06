import os
import pandas as pd
import app
import sqlalchemy as sa
from sqlalchemy import and_
import sqlalchemy.orm as so

flask_app = app.create_app()
file_path = os.path.join(os.getcwd(), "data","VendorsToday_FakeTransactionsx1.csv")

with flask_app.app_context():
    try:
        
        u = app.db.session.query(app.models.Users).filter_by(
            username='all'
        ).first()

        if u is None:
            print("xfs")
            u = app.models.Users(username='all', email='all@example.com')
            app.db.session.add(u)
            
        coa_group = app.db.session.query(app.models.COAIDtoGroup).filter_by(group_name='all').first()

        if coa_group is None:
            coa_group = app.models.COAIDtoGroup(group_name='all')
            app.db.session.add(coa_group)

        app.db.session.flush()

        
        access_relationship = app.db.session.query(app.models.UserCOAAccess).filter_by(
            user_id=u.id, group_id=coa_group.group_id
        ).first()

        if access_relationship is None:
            access_relationship = app.models.UserCOAAccess(user_id=u.id, group_id=coa_group.group_id)
            app.db.session.add(access_relationship)
            

        template = app.db.session.query(app.models.Template).filter_by(
            model_name='universal'
        ).first()

        if template is None:
            template = app.models.Template(            
                author=u.id,
                title='universal', 
                model_name='universal', 
                coa_group_id=coa_group.group_id, 
                published=False, 
                active=True
            )
            app.db.session.add(template)

        app.db.session.flush()

        data = (
            pd.read_excel(file_path) if file_path.endswith('.xlsx')
            else pd.read_csv(file_path, encoding='utf-8')
        )
        
        data.columns = data.columns.str.lower()
        
        if 'vendor' not in data.columns or 'transaction' not in data.columns:
            raise Exception("Missing required field")

        # preprocessing
        data["vendor"] = data["vendor"].fillna("").str.strip()
        data["transaction"] = data["transaction"].fillna("").str.strip()
        data = data.loc[(data["vendor"] != "") & (data["transaction"] != "")]
        data = data.drop_duplicates()
            
        existing = {(v.vendor, v.transaction_descr) for v in app.db.session.query(app.models.Vendor).all()}
        new_entries = [
            app.models.Vendor(vendor=row['vendor'], transaction_descr=row['transaction'], template_id=template.id)
            for _, row in data.iterrows()
            if (row['vendor'], row['transaction']) not in existing
        ]
        
        app.db.session.add_all(new_entries)
        app.db.session.commit()
        
        with open('.env', 'a') as f:
            f.write(f'UNIVERSAL_TEMPLATE={u.id}\n')
    except Exception as e:
        app.db.session.rollback()
        raise