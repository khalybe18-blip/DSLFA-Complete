"""
Classroom Management Routes
===========================
Prefix: /api/v1/classrooms

Endpoints
---------
POST   /create                        — teacher creates a classroom
POST   /join                          — student joins via class_code
GET    /                              — list classrooms for the current user
GET    /<class_id>                    — classroom detail
GET    /<class_id>/students           — enrolled students (teacher only)
GET    /<class_id>/resources          — documents uploaded to this classroom
POST   /<class_id>/quizzes            — create a quiz for this classroom (teacher only)
GET    /<class_id>/quizzes            — list quizzes for this classroom
DELETE /<class_id>/quizzes/<quiz_id>  — delete quiz + cascade questions
"""

import os
import uuid
import copy
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename

from app import db
from app.models.user import User
from app.models.classroom import Classroom, Enrollment, Announcement
from app.models.quiz_classroom import ClassroomQuiz, ClassroomQuestion
from app.services.document_parser import extract_text_from_file
from app.services.embedding_service import process_and_embed_document, delete_document_embeddings

classrooms_bp = Blueprint('classrooms', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'pptx', 'txt'}


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid))


def _allowed_file(filename: str) -> bool:
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def _require_facilitator(user: User):
    if user.role not in ['teacher', 'facilitator', 'admin']:
        return jsonify({'message': 'Forbidden: facilitator access required'}), 403
    return None


def _quiz_payload_for_user(quiz, user: User):
    """Strip correct_answer for students (anti-cheating)."""
    data = copy.deepcopy(quiz.to_full_dict())
    if user.role == 'student':
        for q in data.get('questions', []) or []:
            if isinstance(q, dict):
                q.pop('correct_answer', None)
    return data


# ─── Create Classroom ─────────────────────────────────────────────────────────

@classrooms_bp.route('/create', methods=['POST'])
@jwt_required()
def create_classroom():
    """POST /api/v1/classrooms/create  — teachers only."""
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err

    data = request.get_json() or {}
    class_name = (data.get('class_name') or '').strip()
    subject = (data.get('subject') or '').strip()

    if not class_name:
        return jsonify({'message': 'class_name is required'}), 400

    classroom = Classroom(
        class_name=class_name,
        subject=subject or None,
        facilitator_id=user.id,
    )
    db.session.add(classroom)
    db.session.commit()

    return jsonify({
        'message': 'Classroom created successfully',
        'classroom': classroom.to_dict()
    }), 201


# ─── Join Classroom ───────────────────────────────────────────────────────────

@classrooms_bp.route('/join', methods=['POST'])
@jwt_required()
def join_classroom():
    """POST /api/v1/classrooms/join  — students join via class_code."""
    user = _current_user()
    data = request.get_json() or {}
    class_code = (data.get('class_code') or '').strip().upper()

    if not class_code:
        return jsonify({'message': 'class_code is required'}), 400

    classroom = Classroom.query.filter_by(class_code=class_code).first()
    if not classroom:
        return jsonify({'message': 'Invalid class code'}), 404

    # Prevent teacher from joining their own classroom as a student
    if classroom.facilitator_id == user.id:
        return jsonify({'message': 'You are the teacher of this classroom'}), 409

    # Check for duplicate enrollment (UNIQUE constraint guard at app level too)
    existing = Enrollment.query.filter_by(
        student_id=user.id, class_id=classroom.class_id
    ).first()
    if existing:
        return jsonify({'message': 'Already enrolled in this classroom'}), 409

    enrollment = Enrollment(student_id=user.id, class_id=classroom.class_id)
    db.session.add(enrollment)
    db.session.commit()

    return jsonify({
        'message': f'Successfully joined "{classroom.class_name}"',
        'enrollment': enrollment.to_dict(),
        'classroom': classroom.to_dict()
    }), 201


# ─── List Classrooms ──────────────────────────────────────────────────────────

@classrooms_bp.route('/', methods=['GET'])
@jwt_required()
def list_classrooms():
    """GET /api/v1/classrooms/  — returns classrooms relevant to the user's role."""
    user = _current_user()

    if user.role in ['teacher', 'facilitator', 'admin']:
        classrooms = Classroom.query.filter_by(facilitator_id=user.id)\
                                    .order_by(Classroom.created_at.desc()).all()
    else:
        # Student: classrooms they enrolled in
        enrolled_ids = [e.class_id for e in user.enrollments.all()]
        classrooms = Classroom.query.filter(Classroom.class_id.in_(enrolled_ids))\
                                    .order_by(Classroom.created_at.desc()).all()

    return jsonify({'classrooms': [c.to_dict() for c in classrooms]}), 200


# ─── Classroom Detail ─────────────────────────────────────────────────────────

@classrooms_bp.route('/<int:class_id>', methods=['GET'])
@jwt_required()
def get_classroom(class_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    # Access check: teacher owns it OR student is enrolled
    is_teacher = (classroom.facilitator_id == user.id or user.role == 'admin')
    is_enrolled = Enrollment.query.filter_by(
        student_id=user.id, class_id=class_id
    ).first() is not None

    if not is_teacher and not is_enrolled:
        return jsonify({'message': 'Access denied'}), 403

    return jsonify({'classroom': classroom.to_dict()}), 200


# ─── Enrolled Students (teacher only) ────────────────────────────────────────

@classrooms_bp.route('/<int:class_id>/students', methods=['GET'])
@jwt_required()
def get_students(class_id):
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err
    classroom = Classroom.query.get_or_404(class_id)

    if classroom.facilitator_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403

    enrollments = classroom.enrollments.all()
    student_ids = [e.student_id for e in enrollments]
    students = User.query.filter(User.id.in_(student_ids)).all()

    return jsonify({'students': [s.to_dict() for s in students]}), 200


# ─── Resources (documents) for a classroom ───────────────────────────────────

@classrooms_bp.route('/<int:class_id>/resources', methods=['GET'])
@jwt_required()
def get_resources(class_id):
    """
    GET /api/v1/classrooms/<class_id>/resources
    Returns metadata + linked documents for this classroom.
    Accessible by enrolled students AND the facilitating teacher.
    """
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    is_teacher = (classroom.facilitator_id == user.id or user.role == 'admin')
    is_enrolled = Enrollment.query.filter_by(
        student_id=user.id, class_id=class_id
    ).first() is not None

    if not is_teacher and not is_enrolled:
        return jsonify({'message': 'Access denied'}), 403

    documents = Document.query.filter_by(class_id=class_id)\
                               .order_by(Document.created_at.desc()).all()

    return jsonify({
        'class_id': class_id,
        'class_name': classroom.class_name,
        'documents': [d.to_dict() for d in documents]
    }), 200


# ─── Upload resource to classroom (teacher only) ──────────────────────────────

@classrooms_bp.route('/<int:class_id>/resources/upload', methods=['POST'])
@jwt_required()
def upload_resource(class_id):
    """Upload a document to a classroom; tags it with class_id in DB and ChromaDB."""
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err
    classroom = Classroom.query.get_or_404(class_id)

    if classroom.facilitator_id != user.id and user.role != 'admin':
        return jsonify({'message': 'Only the class teacher may upload resources'}), 403

    if 'file' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'message': 'No file selected'}), 400

    if not _allowed_file(file.filename):
        return jsonify({'message': 'Allowed types: pdf, docx, pptx, txt'}), 400

    upload_dir = os.path.join(current_app.root_path, '..', 'uploads')
    os.makedirs(upload_dir, exist_ok=True)

    original_filename = secure_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{original_filename}"
    file_path = os.path.join(upload_dir, unique_filename)
    file.save(file_path)

    ext = original_filename.rsplit('.', 1)[1].lower()

    new_doc = Document(
        title=original_filename,
        file_type=ext,
        file_path=file_path,
        status='processing',
        class_id=class_id,
        uploader_id=user.id,
    )
    db.session.add(new_doc)
    db.session.commit()

    try:
        text = extract_text_from_file(file_path)
        # Include class_id in ChromaDB metadata for filtered retrieval
        metadata = {
            'document_id': new_doc.id,
            'class_id': class_id,
            'source': original_filename,
            'is_visible': True
        }
        process_and_embed_document(text, metadata)
        new_doc.status = 'ready'
    except Exception as e:
        new_doc.status = 'failed'
        db.session.commit()
        return jsonify({'message': f'Processing failed: {str(e)}'}), 500

    db.session.commit()
    return jsonify({
        'message': 'Resource uploaded and embedded successfully',
        'document': new_doc.to_dict()
    }), 201


# ─── Quiz CRUD for a Classroom ────────────────────────────────────────────────

@classrooms_bp.route('/<int:class_id>/quizzes', methods=['POST'])
@jwt_required()
def create_classroom_quiz(class_id):
    """
    POST /api/v1/classrooms/<class_id>/quizzes
    Body: { "title": str, "bloom_distribution": obj, "questions": [...] }
    Teacher only. Questions follow composition: deleting the quiz purges them.
    """
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err
    classroom = Classroom.query.get_or_404(class_id)

    if classroom.facilitator_id != user.id and user.role != 'admin':
        return jsonify({'message': 'Forbidden: teacher access required'}), 403

    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'message': 'title is required'}), 400

    quiz = ClassroomQuiz(
        classroom_id=class_id,
        created_by=user.id,
        title=title,
        bloom_distribution=data.get('bloom_distribution'),
    )
    db.session.add(quiz)
    db.session.flush()  # get quiz.id before adding questions

    raw_questions = data.get('questions', [])
    for q in raw_questions:
        question = ClassroomQuestion(
            quiz_id=quiz.id,
            text=q.get('text', ''),
            question_type=q.get('question_type', 'mcq'),
            options_json=q.get('options'),
            correct_answer=q.get('correct_answer'),
            bloom_level=q.get('bloom_level'),
            marks=q.get('marks', 1),
        )
        db.session.add(question)

    db.session.commit()
    return jsonify({'message': 'Quiz created', 'quiz': _quiz_payload_for_user(quiz, user)}), 201


@classrooms_bp.route('/<int:class_id>/quizzes', methods=['GET'])
@jwt_required()
def list_classroom_quizzes(class_id):
    """List all quizzes for a classroom (teacher or enrolled student)."""
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    is_teacher = classroom.facilitator_id == user.id
    is_enrolled = Enrollment.query.filter_by(student_id=user.id, class_id=class_id).first()
    if not is_teacher and not is_enrolled:
        return jsonify({'message': 'Access denied'}), 403

    quizzes = ClassroomQuiz.query.filter_by(classroom_id=class_id)\
                                  .order_by(ClassroomQuiz.created_at.desc()).all()
    return jsonify({'quizzes': [q.to_dict() for q in quizzes]}), 200


@classrooms_bp.route('/<int:class_id>/quizzes/<int:quiz_id>', methods=['GET'])
@jwt_required()
def get_classroom_quiz(class_id, quiz_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    is_teacher = classroom.facilitator_id == user.id
    is_enrolled = Enrollment.query.filter_by(student_id=user.id, class_id=class_id).first()
    if not is_teacher and not is_enrolled:
        return jsonify({'message': 'Access denied'}), 403

    quiz = ClassroomQuiz.query.filter_by(id=quiz_id, classroom_id=class_id).first_or_404()
    return jsonify({'quiz': _quiz_payload_for_user(quiz, user)}), 200


@classrooms_bp.route('/<int:class_id>/quizzes/<int:quiz_id>', methods=['DELETE'])
@jwt_required()
def delete_classroom_quiz(class_id, quiz_id):
    """
    DELETE /api/v1/classrooms/<class_id>/quizzes/<quiz_id>
    Cascade handled by FK ON DELETE CASCADE on classroom_questions.quiz_id.
    """
    user = _current_user()
    err = _require_facilitator(user)
    if err:
        return err
    classroom = Classroom.query.get_or_404(class_id)

    if classroom.facilitator_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403

    quiz = ClassroomQuiz.query.filter_by(id=quiz_id, classroom_id=class_id).first_or_404()
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({'message': 'Quiz and all associated questions deleted'}), 200


# ─── Announcements ────────────────────────────────────────────────────────────

@classrooms_bp.route('/<int:class_id>/announcements', methods=['POST'])
@jwt_required()
def post_announcement(class_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    # Only teacher can post announcements
    if classroom.facilitator_id != user.id:
        return jsonify({'message': 'Only the teacher can post announcements'}), 403

    data = request.get_json() or {}
    content = (data.get('content') or '').strip()
    if not content:
        return jsonify({'message': 'content is required'}), 400

    announcement = Announcement(
        class_id=class_id,
        teacher_id=user.id,
        content=content
    )
    db.session.add(announcement)
    db.session.commit()

    return jsonify({
        'message': 'Announcement posted',
        'announcement': announcement.to_dict()
    }), 201


@classrooms_bp.route('/<int:class_id>/announcements', methods=['GET'])
@jwt_required()
def list_announcements(class_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)

    # Access check
    is_teacher = (classroom.facilitator_id == user.id)
    is_enrolled = Enrollment.query.filter_by(student_id=user.id, class_id=class_id).first()
    if not is_teacher and not is_enrolled:
        return jsonify({'message': 'Access denied'}), 403

    announcements = Announcement.query.filter_by(class_id=class_id)\
                                      .order_by(Announcement.timestamp.desc()).all()
    
    results = []
    for a in announcements:
        d = a.to_dict()
        author = User.query.get(a.teacher_id)
        d['author_name'] = author.name if author else "Unknown"
        results.append(d)

    return jsonify({'announcements': results}), 200

# ─── Public Classrooms ───────────────────────────────────────────────────────

@classrooms_bp.route('/public', methods=['GET'])
@jwt_required()
def list_public_classrooms():
    user = _current_user()
    enrolled_ids = [e.class_id for e in user.enrollments.all()]
    # Return public classrooms the user is not already enrolled in
    public_classes = Classroom.query.filter_by(is_public=True).filter(~Classroom.class_id.in_(enrolled_ids)).all()
    
    results = []
    for c in public_classes:
        teacher = User.query.get(c.facilitator_id)
        d = c.to_dict()
        d['facilitator_name'] = teacher.name if teacher else "Unknown"
        results.append(d)
        
    return jsonify({'classrooms': results}), 200

@classrooms_bp.route('/<int:class_id>/visibility', methods=['POST'])
@jwt_required()
def toggle_visibility(class_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)
    if classroom.facilitator_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403
        
    data = request.get_json() or {}
    classroom.is_public = bool(data.get('is_public', False))
    db.session.commit()
    
    return jsonify({'message': 'Visibility updated', 'is_public': classroom.is_public}), 200

# ─── Invitations ─────────────────────────────────────────────────────────────

@classrooms_bp.route('/<int:class_id>/invitations', methods=['POST'])
@jwt_required()
def invite_student(class_id):
    user = _current_user()
    classroom = Classroom.query.get_or_404(class_id)
    if classroom.facilitator_id != user.id:
        return jsonify({'message': 'Forbidden'}), 403
        
    data = request.get_json() or {}
    email = (data.get('email') or '').strip().lower()
    if not email:
        return jsonify({'message': 'email is required'}), 400
        
    from app.models.classroom import Invitation
    existing = Invitation.query.filter_by(class_id=class_id, student_email=email).first()
    if existing:
        return jsonify({'message': 'Invitation already sent to this email'}), 409
        
    invitation = Invitation(class_id=class_id, student_email=email)
    db.session.add(invitation)
    db.session.commit()
    
    return jsonify({'message': 'Invitation sent', 'invitation': invitation.to_dict()}), 201

@classrooms_bp.route('/invitations', methods=['GET'])
@jwt_required()
def get_invitations():
    user = _current_user()
    from app.models.classroom import Invitation
    invites = Invitation.query.filter_by(student_email=user.email.lower(), status='pending').all()
    return jsonify({'invitations': [i.to_dict() for i in invites]}), 200

@classrooms_bp.route('/invitations/<int:invite_id>/respond', methods=['POST'])
@jwt_required()
def respond_invitation(invite_id):
    user = _current_user()
    from app.models.classroom import Invitation
    invite = Invitation.query.get_or_404(invite_id)
    
    if invite.student_email.lower() != user.email.lower():
        return jsonify({'message': 'Forbidden'}), 403
        
    data = request.get_json() or {}
    action = data.get('action') # 'accept' or 'ignore'
    
    if action == 'accept':
        invite.status = 'accepted'
        existing = Enrollment.query.filter_by(student_id=user.id, class_id=invite.class_id).first()
        if not existing:
            db.session.add(Enrollment(student_id=user.id, class_id=invite.class_id))
    else:
        invite.status = 'ignored'
        
    db.session.commit()
    return jsonify({'message': f'Invitation {action}ed'}), 200
