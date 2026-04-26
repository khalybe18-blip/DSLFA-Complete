from datetime import datetime
from app import db

class Summary(db.Model):
    __tablename__ = 'summaries'
    
    id = db.Column(db.Integer, primary_key=True)
    document_id = db.Column(db.Integer, db.ForeignKey('documents.id'), nullable=False)
    
    # The model's overview of the document
    overview = db.Column(db.Text, nullable=False)
    
    # Dynamic sections — the AI decides what sections to include
    # Stored as JSON array: [{"title": "...", "type": "list|timeline|keyvalue|formulas", "items": [...]}]
    sections = db.Column(db.JSON, nullable=True, default=[])
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_id': self.document_id,
            'overview': self.overview,
            'sections': self.sections or [],
            'created_at': self.created_at.isoformat()
        }
