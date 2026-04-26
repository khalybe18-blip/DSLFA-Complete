from datetime import datetime
from app import db

class SavedDeck(db.Model):
    __tablename__ = 'saved_decks'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    subject = db.Column(db.String(255), default='')
    card_count = db.Column(db.Integer, default=0)
    style = db.Column(db.String(50), default='Mixed')
    difficulty = db.Column(db.String(50), default='Medium')
    
    # The full deck JSON (all cards with front/back/type/category/hints)
    deck_data = db.Column(db.JSON, nullable=False)
    
    # Track study progress
    mastered_card_ids = db.Column(db.JSON, nullable=True, default=[])
    study_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_studied_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'cardCount': self.card_count,
            'style': self.style,
            'difficulty': self.difficulty,
            'deckData': self.deck_data,
            'masteredCardIds': self.mastered_card_ids or [],
            'studyCount': self.study_count,
            'createdAt': self.created_at.isoformat(),
            'lastStudiedAt': self.last_studied_at.isoformat() if self.last_studied_at else None,
        }
    
    def to_summary(self):
        """Lightweight dict for listing (no full deck data)."""
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'cardCount': self.card_count,
            'style': self.style,
            'difficulty': self.difficulty,
            'masteredCount': len(self.mastered_card_ids or []),
            'studyCount': self.study_count,
            'createdAt': self.created_at.isoformat(),
            'lastStudiedAt': self.last_studied_at.isoformat() if self.last_studied_at else None,
        }
