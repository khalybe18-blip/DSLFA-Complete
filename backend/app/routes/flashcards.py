import json
from datetime import datetime
from flask import Blueprint, jsonify, request
from app import db
from app.models.document import Document
from app.models.saved_deck import SavedDeck
from app.services.embedding_service import get_vector_store
from app.services.ai_service import generate_flashcards

flashcards_bp = Blueprint('flashcards', __name__)


@flashcards_bp.route('/generate', methods=['POST'])
def create_flashcards():
    """Generate flashcards and auto-save to library."""
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
            
        print(f"Generating flashcards from {len(combined_content)} characters...")
        
        deck = generate_flashcards(combined_content, preferences)
        
        if not deck:
            return jsonify({'message': 'Failed to generate flashcards. AI produced invalid format.'}), 500
        
        # Auto-save to library
        saved = SavedDeck(
            title=deck.get('deckTitle', 'Untitled Deck'),
            subject=deck.get('subject', ''),
            card_count=len(deck.get('cards', [])),
            style=preferences.get('style', 'Mixed'),
            difficulty=preferences.get('difficulty', 'Medium'),
            deck_data=deck,
        )
        db.session.add(saved)
        db.session.commit()
            
        return jsonify({'deck': deck, 'savedId': saved.id}), 200
        
    except Exception as e:
        print(f"Error generating flashcards: {str(e)}")
        return jsonify({'message': f'Flashcard generation failed: {str(e)}'}), 500


@flashcards_bp.route('/library', methods=['GET'])
def list_decks():
    """List all saved decks (lightweight summaries)."""
    decks = SavedDeck.query.order_by(SavedDeck.created_at.desc()).all()
    return jsonify({'decks': [d.to_summary() for d in decks]}), 200


@flashcards_bp.route('/library/<int:deck_id>', methods=['GET'])
def get_deck(deck_id):
    """Get a single saved deck with full card data."""
    deck = SavedDeck.query.get(deck_id)
    if not deck:
        return jsonify({'message': 'Deck not found'}), 404
    return jsonify({'deck': deck.to_dict()}), 200


@flashcards_bp.route('/library/<int:deck_id>/progress', methods=['POST'])
def save_deck_progress(deck_id):
    """Save mastered card IDs and study count."""
    deck = SavedDeck.query.get(deck_id)
    if not deck:
        return jsonify({'message': 'Deck not found'}), 404
    
    data = request.json
    deck.mastered_card_ids = data.get('masteredCardIds', [])
    deck.study_count = (deck.study_count or 0) + 1
    deck.last_studied_at = datetime.utcnow()
    db.session.commit()
    
    return jsonify({'message': 'Progress saved', 'deck': deck.to_summary()}), 200


@flashcards_bp.route('/library/<int:deck_id>', methods=['DELETE'])
def delete_deck(deck_id):
    """Delete a saved deck."""
    deck = SavedDeck.query.get(deck_id)
    if not deck:
        return jsonify({'message': 'Deck not found'}), 404
    
    db.session.delete(deck)
    db.session.commit()
    return jsonify({'message': 'Deck deleted'}), 200
