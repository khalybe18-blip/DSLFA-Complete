from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import os

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    
    # Configure app
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-dslfa')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///../dslfa.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Initialize extensions
    CORS(app)
    db.init_app(app)
    
    # Register models inside context
    with app.app_context():
        from app.models.document import Document
        from app.models.summary import Summary
        from app.models.saved_quiz import SavedQuiz
        from app.models.saved_deck import SavedDeck
        from app.models.reminder import Reminder
        from app.models.external_resource import ExternalResource
        from app.models.chat import ChatSession, ChatMessage
        
        # Create all tables (SQLite for MVP)
        db.create_all()
        
    # Import and register blueprints
    from app.routes.documents import docs_bp
    from app.routes.ai import ai_bp
    from app.routes.quiz import quiz_bp
    from app.routes.flashcards import flashcards_bp
    from app.routes.reminders import reminders_bp
    from app.routes.resources import resources_bp
    
    app.register_blueprint(docs_bp, url_prefix='/api/documents')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(quiz_bp, url_prefix='/api/quiz')
    app.register_blueprint(flashcards_bp, url_prefix='/api/flashcards')
    app.register_blueprint(reminders_bp, url_prefix='/api/reminders')
    app.register_blueprint(resources_bp, url_prefix='/api/resources')
    
    @app.route('/health')
    def health():
        return {'status': 'ok'}
        
    return app
