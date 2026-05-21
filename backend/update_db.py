from app import create_app, db
from app.models.classroom import Invitation
from sqlalchemy import text

app = create_app()
with app.app_context():
    # create new tables
    db.create_all()
    # add column
    try:
        db.session.execute(text('ALTER TABLE classrooms ADD COLUMN is_public BOOLEAN DEFAULT 0'))
        db.session.commit()
        print("Column is_public added")
    except Exception as e:
        print(f"Column might already exist or error: {e}")
