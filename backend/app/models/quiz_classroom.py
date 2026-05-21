"""
Classroom Quiz & Question models.

Constraints:
  - Question.quiz_id → ClassroomQuiz.id  ON DELETE CASCADE  (composition)
  - ClassroomQuiz.classroom_id → Classroom.class_id  ON DELETE CASCADE
  - ClassroomQuiz.created_by → users.id  ON DELETE CASCADE
"""
from datetime import datetime
from app import db


class ClassroomQuiz(db.Model):
    """A quiz created by a teacher for a specific classroom."""
    __tablename__ = 'classroom_quizzes'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    classroom_id = db.Column(
        db.Integer,
        db.ForeignKey('classrooms.class_id', ondelete='CASCADE'),
        nullable=False
    )
    created_by = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    title = db.Column(db.String(255), nullable=False)
    bloom_distribution = db.Column(db.JSON, nullable=True)   # {"remember": 2, "apply": 3, …}
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composition: deleting this quiz purges all questions
    questions = db.relationship(
        'ClassroomQuestion',
        backref='quiz',
        cascade='all, delete-orphan',
        lazy='select'
    )

    def to_dict(self):
        return {
            'id': self.id,
            'classroom_id': self.classroom_id,
            'created_by': self.created_by,
            'title': self.title,
            'bloom_distribution': self.bloom_distribution,
            'created_at': self.created_at.isoformat(),
            'question_count': len(self.questions),
        }

    def to_full_dict(self):
        d = self.to_dict()
        d['questions'] = [q.to_dict() for q in self.questions]
        return d


class ClassroomQuestion(db.Model):
    """
    Individual question inside a ClassroomQuiz.
    ON DELETE CASCADE via FK → quiz purges these automatically.
    """
    __tablename__ = 'classroom_questions'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    # FK with ON DELETE CASCADE — strict composition
    quiz_id = db.Column(
        db.Integer,
        db.ForeignKey('classroom_quizzes.id', ondelete='CASCADE'),
        nullable=False
    )
    text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50), default='mcq')   # mcq | truefalse | short | long
    options_json = db.Column(db.JSON, nullable=True)           # list of option strings for MCQ
    correct_answer = db.Column(db.Text, nullable=True)
    bloom_level = db.Column(db.String(50), nullable=True)      # remember|understand|apply|…
    marks = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {
            'id': self.id,
            'quiz_id': self.quiz_id,
            'text': self.text,
            'question_type': self.question_type,
            'options': self.options_json,
            'correct_answer': self.correct_answer,
            'bloom_level': self.bloom_level,
            'marks': self.marks,
        }
