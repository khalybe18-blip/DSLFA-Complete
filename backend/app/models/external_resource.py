from datetime import datetime
from app import db


class ExternalResource(db.Model):
    """Persistent external resources added by the student (URLs, PDFs).
    These are stored in a *separate* ChromaDB collection from personal notes."""
    __tablename__ = 'external_resources'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(512), nullable=False)
    source_type = db.Column(db.String(50), nullable=False)  # 'url' or 'pdf'
    origin_url = db.Column(db.String(1024), nullable=True)
    file_path = db.Column(db.String(512), nullable=True)     # only for PDFs
    status = db.Column(db.String(50), default='processing')   # processing, ready, failed
    chunk_count = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)           # session toggle
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'source_type': self.source_type,
            'origin_url': self.origin_url,
            'status': self.status,
            'chunk_count': self.chunk_count,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }
