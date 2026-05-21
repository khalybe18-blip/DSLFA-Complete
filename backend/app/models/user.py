from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from app import db

VALID_ROLES = ('student', 'teacher', 'facilitator', 'admin')

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    # role: 'student' (default) | 'teacher'
    role = db.Column(db.String(20), nullable=False, default='student')
    study_streak = db.Column(db.Integer, default=0)
    last_study_date = db.Column(db.Date, nullable=True)
    weekly_stats = db.Column(db.JSON, default=lambda: [0,0,0,0,0,0,0]) # [Mon, Tue, ..., Sun]
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships (back-referenced by Classroom & Enrollment models)
    classrooms_teaching = db.relationship(
        'Classroom', backref='facilitator', lazy='dynamic',
        foreign_keys='Classroom.facilitator_id'
    )
    enrollments = db.relationship(
        'Enrollment', backref='student', lazy='dynamic',
        foreign_keys='Enrollment.student_id'
    )

    def update_streak(self):
        """Updates the study streak and weekly activity log."""
        from datetime import date, timedelta
        today = date.today()
        
        # 1. Update Weekly Stats (Mon=0, Sun=6)
        day_idx = today.weekday() # Monday is 0
        if not self.weekly_stats:
            self.weekly_stats = [0]*7
        
        # Reset weekly stats if it's a new week (Monday) and last study was not today
        if day_idx == 0 and self.last_study_date != today:
             self.weekly_stats = [0]*7
        
        self.weekly_stats[day_idx] = 1
        
        # 2. Update Streak
        if self.last_study_date:
            if self.last_study_date == today:
                pass # Already updated today
            elif self.last_study_date == today - timedelta(days=1):
                self.study_streak += 1
            else:
                self.study_streak = 1 # Streak broken
        else:
            self.study_streak = 1
            
        self.last_study_date = today
        db.session.add(self)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'study_streak': self.study_streak,
            'weekly_stats': self.weekly_stats or [0,0,0,0,0,0,0],
            'last_study_date': self.last_study_date.isoformat() if self.last_study_date else None,
            'created_at': self.created_at.isoformat()
        }

