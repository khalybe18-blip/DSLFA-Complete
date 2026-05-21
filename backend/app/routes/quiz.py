import copy
from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models.document import Document
from app.models.saved_quiz import SavedQuiz
from app.models.user import User
from app.access import user_can_read_document
from app.services.embedding_service import get_vector_store
from app.services.ai_service import generate_quiz

quiz_bp = Blueprint('quiz', __name__)


def _current_user():
    return User.query.get(int(get_jwt_identity()))


def _require_teacher(user):
    if not user or user.role != 'teacher':
        return jsonify({'message': 'Forbidden: teacher access required'}), 403
    return None


def _redact_saved_quiz_data(quiz_data):
    if not quiz_data:
        return quiz_data
    data = copy.deepcopy(quiz_data)
    for q in data.get('questions', []) or []:
        if isinstance(q, dict):
            q.pop('correctAnswer', None)
            q.pop('correct_answer', None)
    return data


@quiz_bp.route('/generate', methods=['POST'])
@jwt_required()
def create_quiz():
    """Generate a quiz from selected documents — teacher only; verifies document access."""
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    err = _require_teacher(user)
    if err:
        return err

    data = request.json
    doc_ids = data.get('documentIds', [])
    preferences = data.get('preferences', {})

    if not doc_ids:
        return jsonify({'message': 'No documents selected'}), 400

    for doc_id in doc_ids:
        doc = Document.query.get(int(doc_id))
        if not doc or not user_can_read_document(user, doc):
            return jsonify({'message': f'Access denied for document {doc_id}'}), 403

    try:
        vs = get_vector_store()
        collection = vs._collection

        combined_content = ""

        for doc_id in doc_ids:
            results = collection.get(where={"document_id": int(doc_id)})
            if results and 'documents' in results and results['documents']:
                combined_content += "\n".join(results['documents']) + "\n\n"

        if not combined_content.strip():
            return jsonify({'message': 'No text found in selected documents'}), 404

        print(f"Generating quiz from {len(combined_content)} characters...")

        quiz_data = generate_quiz(combined_content, preferences)

        if not quiz_data:
            return jsonify({'message': 'Failed to generate quiz properly. AI produced invalid format.'}), 500

        saved = SavedQuiz(
            title=quiz_data.get('quizTitle', 'Untitled Quiz'),
            difficulty=quiz_data.get('difficulty', preferences.get('difficulty', 'Medium')),
            simulation_mode=quiz_data.get('simulationMode', preferences.get('simulationMode', 'Standard')),
            question_count=len(quiz_data.get('questions', [])),
            quiz_data=quiz_data,
        )
        db.session.add(saved)
        db.session.commit()

        return jsonify({'quiz': quiz_data, 'savedId': saved.id}), 200

    except Exception as e:
        print(f"Error generating quiz: {str(e)}")
        return jsonify({'message': f'Quiz generation failed: {str(e)}'}), 500


@quiz_bp.route('/library', methods=['GET'])
@jwt_required()
def list_quizzes():
    quizzes = SavedQuiz.query.order_by(SavedQuiz.created_at.desc()).all()
    return jsonify({'quizzes': [q.to_summary() for q in quizzes]}), 200


@quiz_bp.route('/library/<int:quiz_id>', methods=['GET'])
@jwt_required()
def get_quiz(quiz_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404

    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    payload = quiz.to_dict()
    if user.role == 'student':
        payload['quizData'] = _redact_saved_quiz_data(payload.get('quizData'))
    return jsonify({'quiz': payload}), 200


@quiz_bp.route('/library/<int:quiz_id>/result', methods=['POST'])
@jwt_required()
def save_quiz_result(quiz_id):
    user = _current_user()
    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    data = request.json
    quiz.last_score = data.get('score', 0)
    quiz.last_results = data.get('gradedQuestions', [])
    quiz.attempt_count = (quiz.attempt_count or 0) + 1
    quiz.last_attempted_at = datetime.utcnow()
    
    # Update streak
    if user:
        user.update_streak()
        
    db.session.commit()

    return jsonify({'message': 'Results saved', 'quiz': quiz.to_summary()}), 200


@quiz_bp.route('/library/<int:quiz_id>', methods=['DELETE'])
@jwt_required()
def delete_quiz(quiz_id):
    user = _current_user()
    if not user:
        return jsonify({'message': 'User not found'}), 404
    err = _require_teacher(user)
    if err:
        return err

    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404

    db.session.delete(quiz)
    db.session.commit()
    return jsonify({'message': 'Quiz deleted'}), 200
