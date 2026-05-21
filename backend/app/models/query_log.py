from datetime import datetime
from app import db

class QueryLog(db.Model):
    __tablename__ = 'query_logs'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    class_id = db.Column(
        db.Integer,
        db.ForeignKey('classrooms.class_id', ondelete='CASCADE'),
        nullable=False
    )
    query_text = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'student_id': self.student_id,
            'class_id': self.class_id,
            'query_text': self.query_text,
            'timestamp': self.timestamp.isoformat(),
        }
