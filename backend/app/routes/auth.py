from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.models.user import User, VALID_ROLES
from app.models.query_log import QueryLog
from app.models.document import Document
from app.models.quiz_submission import QuizSubmission
from app.models.classroom import Classroom, Enrollment
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func, distinct

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({'message': 'Missing required fields'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'User already exists'}), 409

    # Accept optional role; default to 'student'
    role = data.get('role', 'student')
    if role not in VALID_ROLES:
        return jsonify({'message': f"Invalid role. Choose from: {', '.join(VALID_ROLES)}"}), 400

    new_user = User(
        name=data['name'],
        email=data['email'],
        password_hash=generate_password_hash(data['password']),
        role=role,
    )

    db.session.add(new_user)
    db.session.commit()

    access_token = create_access_token(identity=str(new_user.id), expires_delta=timedelta(days=7))

    return jsonify({
        'message': 'User created successfully',
        'token': access_token,
        'user': new_user.to_dict()          # includes role
    }), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'message': 'Missing email or password'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password_hash, data['password']):
        return jsonify({'message': 'Invalid credentials'}), 401

    access_token = create_access_token(identity=str(user.id), expires_delta=timedelta(days=7))

    return jsonify({
        'token': access_token,
        'user': user.to_dict()              # includes role
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)

    return jsonify({'user': user.to_dict()}), 200

@auth_bp.route('/student-dashboard', methods=['GET'])
@jwt_required()
def get_student_dashboard():
    user_id = int(get_jwt_identity())
    
    # Enrolled classes
    enrollments = Enrollment.query.filter_by(student_id=user_id).all()
    class_ids = [e.class_id for e in enrollments]
    
    # 1. Teachers
    if class_ids:
        classrooms = Classroom.query.filter(Classroom.class_id.in_(class_ids)).all()
        teacher_ids = list(set([c.facilitator_id for c in classrooms]))
        teachers_data = User.query.filter(User.id.in_(teacher_ids)).all()
        teachers = [{'name': t.name, 'role': t.role, 'id': t.id} for t in teachers_data]
    else:
        teachers = []
        
    # 2. Files read / materials available
    files_available = Document.query.filter(Document.class_id.in_(class_ids)).count() if class_ids else 0
    
    # 3. Completed Quizzes & Avg Score
    submissions_data = db.session.query(
        func.count(distinct(QuizSubmission.quiz_id)).label('completed_quizzes'),
        func.avg(QuizSubmission.score).label('avg_score'),
        func.avg(QuizSubmission.total_marks).label('avg_total')
    ).filter_by(student_id=user_id).first()
    
    completed_quizzes = int(submissions_data.completed_quizzes or 0)
    avg_score = 0
    if submissions_data and submissions_data.avg_total:
        score = float(submissions_data.avg_score or 0)
        total = float(submissions_data.avg_total or 1)
        avg_score = round((score / total) * 100, 2)
        
    # 4. Daily Queries (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    queries_data = db.session.query(
        func.date(QueryLog.timestamp).label('day'),
        func.count(QueryLog.id).label('queries')
    ).filter(QueryLog.student_id == user_id, QueryLog.timestamp >= seven_days_ago)\
     .group_by(func.date(QueryLog.timestamp))\
     .order_by(func.date(QueryLog.timestamp)).all()
     
    daily_queries = [{'day': str(q.day), 'queries': q.queries} for q in queries_data]
    
    return jsonify({
        'teachers': teachers,
        'files_available': files_available,
        'completed_quizzes': completed_quizzes,
        'avg_score': avg_score,
        'daily_queries': daily_queries
    }), 200
