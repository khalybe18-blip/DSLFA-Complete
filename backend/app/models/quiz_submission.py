from datetime import datetime
from app import db

class QuizSubmission(db.Model):
    __tablename__ = 'quiz_submissions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey('classroom_quizzes.id', ondelete='CASCADE'),
        nullable=False
    )
    student_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    score = db.Column(db.Integer, nullable=False)
    total_marks = db.Column(db.Integer, nullable=False)
    # Full submission data (answers, grading results)
    submission_data = db.Column(db.JSON, nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'student_id': self.student_id,
            'score': self.score,
            'total_marks': self.total_marks,
            'submission_data': self.submission_data,
            'timestamp': self.timestamp.isoformat(),
        }
