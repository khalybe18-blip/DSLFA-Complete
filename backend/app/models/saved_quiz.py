from datetime import datetime
from app import db

class SavedQuiz(db.Model):
    __tablename__ = 'saved_quizzes'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(255), nullable=False)
    difficulty = db.Column(db.String(50), default='Medium')
    simulation_mode = db.Column(db.String(100), default='Standard')
    question_count = db.Column(db.Integer, default=0)
    
    # The full quiz JSON (questions, options, answers, explanations)
    quiz_data = db.Column(db.JSON, nullable=False)
    
    # Last attempt results (score, graded questions, etc.)
    last_score = db.Column(db.Integer, nullable=True)
    last_results = db.Column(db.JSON, nullable=True)
    attempt_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_attempted_at = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'difficulty': self.difficulty,
            'simulationMode': self.simulation_mode,
            'questionCount': self.question_count,
            'quizData': self.quiz_data,
            'lastScore': self.last_score,
            'lastResults': self.last_results,
            'attemptCount': self.attempt_count,
            'createdAt': self.created_at.isoformat(),
            'lastAttemptedAt': self.last_attempted_at.isoformat() if self.last_attempted_at else None,
        }
    
    def to_summary(self):
        """Lightweight dict for listing (no full quiz data)."""
        return {
            'id': self.id,
            'title': self.title,
            'difficulty': self.difficulty,
            'simulationMode': self.simulation_mode,
            'questionCount': self.question_count,
            'lastScore': self.last_score,
            'attemptCount': self.attempt_count,
            'createdAt': self.created_at.isoformat(),
            'lastAttemptedAt': self.last_attempted_at.isoformat() if self.last_attempted_at else None,
        }
