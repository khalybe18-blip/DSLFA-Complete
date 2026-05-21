"""
Classroom & Enrollment models.

Constraints enforced:
  - Classroom.facilitator_id → Users.id  ON DELETE CASCADE
  - Enrollment: UNIQUE(student_id, class_id)
"""
import secrets
import string
from datetime import datetime
from app import db


def _generate_class_code(length: int = 8) -> str:
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


class Classroom(db.Model):
    __tablename__ = 'classrooms'

    class_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_name = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(200), nullable=True)
    # facilitator_id FK → users.id  ON DELETE CASCADE
    facilitator_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    class_code = db.Column(db.String(20), unique=True, nullable=False, default=_generate_class_code)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    enrollments = db.relationship(
        'Enrollment', backref='classroom', cascade='all, delete-orphan', lazy='dynamic'
    )
    documents = db.relationship(
        'Document', backref='classroom', lazy='dynamic'
    )
    classroom_quizzes = db.relationship(
        'ClassroomQuiz',
        cascade='all, delete-orphan',
        lazy='dynamic',
        passive_deletes=True,
    )
    announcements = db.relationship(
        'Announcement',
        backref='classroom',
        cascade='all, delete-orphan',
        lazy='dynamic'
    )

    def to_dict(self, include_enrollment_count: bool = True):
        data = {
            'class_id': self.class_id,
            'class_name': self.class_name,
            'subject': self.subject,
            'facilitator_id': self.facilitator_id,
            'class_code': self.class_code,
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat(),
        }
        if include_enrollment_count:
            data['student_count'] = self.enrollments.count()
        return data


class Enrollment(db.Model):
    __tablename__ = 'enrollments'
    __table_args__ = (
        db.UniqueConstraint('student_id', 'class_id', name='uq_enrollment_student_class'),
    )

    enrollment_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
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
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'enrollment_id': self.enrollment_id,
            'student_id': self.student_id,
            'class_id': self.class_id,
            'joined_at': self.joined_at.isoformat(),
        }


class Announcement(db.Model):
    __tablename__ = 'announcements'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_id = db.Column(
        db.Integer,
        db.ForeignKey('classrooms.class_id', ondelete='CASCADE'),
        nullable=False
    )
    teacher_id = db.Column(
        db.Integer,
        db.ForeignKey('users.id', ondelete='CASCADE'),
        nullable=False
    )
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'teacher_id': self.teacher_id,
            'content': self.content,
            'timestamp': self.timestamp.isoformat(),
        }

class Invitation(db.Model):
    __tablename__ = 'invitations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    class_id = db.Column(db.Integer, db.ForeignKey('classrooms.class_id', ondelete='CASCADE'), nullable=False)
    student_email = db.Column(db.String(120), nullable=False)
    status = db.Column(db.String(20), default='pending') # pending, accepted, ignored
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    classroom = db.relationship('Classroom', backref=db.backref('invitations', lazy='dynamic'))

    def to_dict(self):
        return {
            'id': self.id,
            'class_id': self.class_id,
            'class_name': self.classroom.class_name if self.classroom else '',
            'student_email': self.student_email,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }
