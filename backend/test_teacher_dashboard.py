import sys
import os

from app import create_app, db
from app.models.user import User
from app.models.classroom import Classroom, Enrollment
from app.models.quiz_classroom import ClassroomQuiz
from app.models.quiz_submission import QuizSubmission
from app.models.query_log import QueryLog
from app.models.document import Document
from sqlalchemy import func, desc, distinct
from datetime import datetime, timedelta

app = create_app()

with app.app_context():
    try:
        # Mock facilitator
        user = User.query.filter_by(role='facilitator').first()
        if not user:
            print("No facilitator found, creating one.")
            user = User(name='Test Fac', email='fac@test.com', role='facilitator')
            db.session.add(user)
            db.session.commit()
            
        print(f"Testing for user ID: {user.id}")
        
        classrooms = Classroom.query.filter_by(facilitator_id=user.id).all()
        class_ids = [c.class_id for c in classrooms]
        print(f"Class IDs: {class_ids}")
        
        total_classes = len(classrooms)
        print(f"Total Classes: {total_classes}")
        
        if total_classes > 0:
            total_students = db.session.query(func.count(distinct(Enrollment.student_id))).filter(Enrollment.class_id.in_(class_ids)).scalar() or 0
            print(f"Total Students: {total_students}")
            
            total_materials = Document.query.filter(Document.class_id.in_(class_ids)).count()
            print(f"Total Materials: {total_materials}")
            
            avg_perf_data = db.session.query(
                func.avg(QuizSubmission.score).label('avg_score'),
                func.avg(QuizSubmission.total_marks).label('avg_total')
            ).join(ClassroomQuiz).filter(ClassroomQuiz.classroom_id.in_(class_ids)).first()
            print(f"Avg Perf Data: {avg_perf_data}")
            
            ten_days_ago = datetime.utcnow() - timedelta(days=10)
            engagement_data = db.session.query(
                func.date(QueryLog.timestamp).label('day'),
                func.count(distinct(QueryLog.student_id)).label('unique_students')
            ).filter(QueryLog.class_id.in_(class_ids), QueryLog.timestamp >= ten_days_ago)\
             .group_by(func.date(QueryLog.timestamp))\
             .order_by(func.date(QueryLog.timestamp)).all()
            print(f"Engagement Data: {engagement_data}")
             
            submissions = db.session.query(QuizSubmission, ClassroomQuiz, Classroom)\
                .join(ClassroomQuiz, QuizSubmission.quiz_id == ClassroomQuiz.id)\
                .join(Classroom, ClassroomQuiz.classroom_id == Classroom.class_id)\
                .filter(ClassroomQuiz.classroom_id.in_(class_ids))\
                .order_by(desc(QuizSubmission.timestamp))\
                .limit(10).all()
            print(f"Recent Submissions: {submissions}")
            
        print("SUCCESS")
    except Exception as e:
        import traceback
        traceback.print_exc()
