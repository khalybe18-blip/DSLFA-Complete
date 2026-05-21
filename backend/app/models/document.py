from datetime import datetime
from app import db

class Document(db.Model):
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    status = db.Column(db.String(50), default='uploaded')  # uploaded, processing, ready, failed
    # nullable: personal notes have no class; classroom uploads have a class_id
    class_id = db.Column(
        db.Integer,
        db.ForeignKey('classrooms.class_id', ondelete='SET NULL'),
        nullable=True,
        index=True
    )
    uploader_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True
    )
    is_visible = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'file_type': self.file_type,
            'status': self.status,
            'is_visible': self.is_visible,
            'class_id': self.class_id,
            'uploader_id': self.uploader_id,
            'created_at': self.created_at.isoformat()
        }

