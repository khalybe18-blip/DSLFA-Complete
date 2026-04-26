from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from app import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    study_streak = db.Column(db.Integer, default=0)
    last_study_date = db.Column(db.Date, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'study_streak': self.study_streak,
            'last_study_date': self.last_study_date.isoformat() if self.last_study_date else None,
            'created_at': self.created_at.isoformat()
        }
