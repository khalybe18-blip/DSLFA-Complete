from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models.user import User
from app.models.classroom import Classroom, Enrollment
from app.models.quiz_classroom import ClassroomQuiz
from app.models.quiz_submission import QuizSubmission
from app.models.query_log import QueryLog
from app.models.document import Document
from sqlalchemy import func, desc, distinct
from datetime import datetime, timedelta

teacher_bp = Blueprint('teacher', __name__)

def _current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid))

def _require_facilitator(user):
    if not user or user.role not in ['facilitator', 'teacher', 'admin']:
        return jsonify({'message': 'Forbidden: Facilitator access required'}), 403
    return None

@teacher_bp.route('/analytics/<int:class_id>', methods=['GET'])
@jwt_required()
def get_analytics(class_id):
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err

    classroom = Classroom.query.get_or_404(class_id)
    if classroom.facilitator_id != user.id and user.role != 'admin':
        return jsonify({'message': 'Forbidden'}), 403

    # Avg scores
    avg_score_data = db.session.query(
        func.avg(QuizSubmission.score).label('avg_score'),
        func.avg(QuizSubmission.total_marks).label('avg_total')
    ).join(ClassroomQuiz).filter(ClassroomQuiz.classroom_id == class_id).first()

    avg_score = round(float(avg_score_data.avg_score or 0), 2)
    avg_total = round(float(avg_score_data.avg_total or 0), 2)

    # Total material views (We don't have a view tracker yet, but we can return total materials count or mock it)
    # The request asks for "total material views". Since we don't track views, I'll return count for now or 0.
    total_materials = Document.query.filter_by(class_id=class_id).count()

    # Most common student AI queries
    common_queries = db.session.query(
        QueryLog.query_text,
        func.count(QueryLog.id).label('count')
    ).filter(QueryLog.class_id == class_id)\
     .group_by(QueryLog.query_text)\
     .order_by(func.count(QueryLog.id).desc())\
     .limit(5).all()

    return jsonify({
        'avg_score': avg_score,
        'avg_total': avg_total,
        'total_materials': total_materials,
        'common_queries': [{'query': q.query_text, 'count': q.count} for q in common_queries]
    }), 200

@teacher_bp.route('/submissions/<int:quiz_id>', methods=['GET'])
@jwt_required()
def get_submissions(quiz_id):
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err

    quiz = ClassroomQuiz.query.get_or_404(quiz_id)
    classroom = Classroom.query.get(quiz.classroom_id)
    if classroom.facilitator_id != user.id and user.role != 'admin':
        return jsonify({'message': 'Forbidden'}), 403

    submissions = QuizSubmission.query.filter_by(quiz_id=quiz_id).all()
    
    # "Returns student scores and full quiz objects (including correct_answer)"
    quiz_data = quiz.to_full_dict()

    res = []
    for s in submissions:
        student = User.query.get(s.student_id)
        d = s.to_dict()
        d['student_name'] = student.name if student else 'Unknown'
        res.append(d)

    return jsonify({
        'quiz': quiz_data,
        'submissions': res
    }), 200

@teacher_bp.route('/dashboard', methods=['GET'])
@jwt_required()
def get_teacher_dashboard():
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err
        
    class_id_filter = request.args.get('class_id')
    classrooms = Classroom.query.filter_by(facilitator_id=user.id).all()
    if class_id_filter and class_id_filter != 'all':
        classrooms = [c for c in classrooms if str(c.class_id) == class_id_filter]
        
    class_ids = [c.class_id for c in classrooms]
    
    total_classes = len(classrooms)
    
    if total_classes == 0:
        return jsonify({
            'total_students': 0, 'total_materials': 0, 'total_classes': 0,
            'avg_performance': 0, 'daily_engagement': [], 'recent_submissions': []
        }), 200
        
    total_students = db.session.query(func.count(distinct(Enrollment.student_id))).filter(Enrollment.class_id.in_(class_ids)).scalar() or 0
    total_materials = Document.query.filter(Document.class_id.in_(class_ids)).count()
    
    avg_perf_data = db.session.query(
        func.avg(QuizSubmission.score).label('avg_score'),
        func.avg(QuizSubmission.total_marks).label('avg_total')
    ).join(ClassroomQuiz).filter(ClassroomQuiz.classroom_id.in_(class_ids)).first()
    
    avg_performance = 0
    if avg_perf_data and avg_perf_data.avg_total:
        avg_score = float(avg_perf_data.avg_score or 0)
        avg_total = float(avg_perf_data.avg_total or 1)
        avg_performance = round((avg_score / avg_total) * 100, 2)
        
    # Daily Engagement (last 10 days)
    ten_days_ago = datetime.utcnow() - timedelta(days=10)
    
    q_data = db.session.query(
        func.date(QueryLog.timestamp).label('day'),
        func.count(QueryLog.id).label('count')
    ).filter(QueryLog.class_id.in_(class_ids), QueryLog.timestamp >= ten_days_ago)\
     .group_by(func.date(QueryLog.timestamp)).all()
     
    qz_data = db.session.query(
        func.date(QuizSubmission.timestamp).label('day'),
        func.count(QuizSubmission.id).label('count')
    ).join(ClassroomQuiz).filter(ClassroomQuiz.classroom_id.in_(class_ids), QuizSubmission.timestamp >= ten_days_ago)\
     .group_by(func.date(QuizSubmission.timestamp)).all()
     
    eng_map = {}
    for e in q_data:
        eng_map[str(e.day)] = eng_map.get(str(e.day), 0) + e.count
    for e in qz_data:
        eng_map[str(e.day)] = eng_map.get(str(e.day), 0) + e.count
        
    daily_engagement = [{'day': k, 'students': v} for k, v in eng_map.items()]
    daily_engagement.sort(key=lambda x: x['day'])
    
    # Recent Submissions
    submissions = db.session.query(QuizSubmission, ClassroomQuiz, Classroom)\
        .join(ClassroomQuiz, QuizSubmission.quiz_id == ClassroomQuiz.id)\
        .join(Classroom, ClassroomQuiz.classroom_id == Classroom.class_id)\
        .filter(ClassroomQuiz.classroom_id.in_(class_ids))\
        .order_by(desc(QuizSubmission.timestamp))\
        .limit(10).all()
        
    recent_submissions = []
    for sub, quiz, cls in submissions:
        student = User.query.get(sub.student_id)
        if not student:
            continue
        perc = round((sub.score / sub.total_marks) * 100, 2) if sub.total_marks else 0
        recent_submissions.append({
            'student_name': student.name,
            'class_name': cls.class_name,
            'grade': 'Grade A' if perc >= 90 else 'Grade B' if perc >= 80 else 'Grade C' if perc >= 70 else 'Grade D',
            'percentage': perc,
            'submitted_at': sub.timestamp.isoformat()
        })
        
    # Upcoming Reminders
    from app.models.reminder import Reminder
    now = datetime.utcnow()
    upcoming_reminders = Reminder.query.filter(Reminder.student_id == user.id, Reminder.date >= now).order_by(Reminder.date).limit(5).all()
    reminders_data = [{'id': r.id, 'title': r.title, 'date': r.date.isoformat(), 'description': r.description} for r in upcoming_reminders]

    return jsonify({
        'total_students': total_students,
        'total_materials': total_materials,
        'total_classes': total_classes,
        'avg_performance': avg_performance,
        'daily_engagement': daily_engagement,
        'recent_submissions': recent_submissions,
        'upcoming_events': reminders_data
    }), 200
