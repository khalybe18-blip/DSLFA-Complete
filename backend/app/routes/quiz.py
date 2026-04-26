import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from app import db
from app.models.document import Document
from app.models.saved_quiz import SavedQuiz
from app.services.embedding_service import get_vector_store
from app.services.ai_service import generate_quiz

quiz_bp = Blueprint('quiz', __name__)


@quiz_bp.route('/generate', methods=['POST'])
def create_quiz():
    """Generate a quiz and auto-save it to the library."""
    data = request.json
    doc_ids = data.get('documentIds', [])
    preferences = data.get('preferences', {})
    
    if not doc_ids:
        return jsonify({'message': 'No documents selected'}), 400
        
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
        
        # Auto-save to library
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
def list_quizzes():
    """List all saved quizzes (lightweight summaries)."""
    quizzes = SavedQuiz.query.order_by(SavedQuiz.created_at.desc()).all()
    return jsonify({'quizzes': [q.to_summary() for q in quizzes]}), 200


@quiz_bp.route('/library/<int:quiz_id>', methods=['GET'])
def get_quiz(quiz_id):
    """Get a single saved quiz with full data."""
    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404
    return jsonify({'quiz': quiz.to_dict()}), 200


@quiz_bp.route('/library/<int:quiz_id>/result', methods=['POST'])
def save_quiz_result(quiz_id):
    """Save attempt results for a quiz."""
    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404
    
    data = request.json
    quiz.last_score = data.get('score', 0)
    quiz.last_results = data.get('gradedQuestions', [])
    quiz.attempt_count = (quiz.attempt_count or 0) + 1
    quiz.last_attempted_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Results saved', 'quiz': quiz.to_summary()}), 200


@quiz_bp.route('/library/<int:quiz_id>', methods=['DELETE'])
def delete_quiz(quiz_id):
    """Delete a saved quiz."""
    quiz = SavedQuiz.query.get(quiz_id)
    if not quiz:
        return jsonify({'message': 'Quiz not found'}), 404
    
    db.session.delete(quiz)
    db.session.commit()
    return jsonify({'message': 'Quiz deleted'}), 200
