from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import JWTManager
import os

db = SQLAlchemy()
jwt = JWTManager()


def create_app():
    app = Flask(__name__)

    # ── Configuration ────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-dslfa')
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-dev-secret')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 'sqlite:///../dslfa.db'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ── Extensions ───────────────────────────────────────────────────────────
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    db.init_app(app)
    jwt.init_app(app)

    # ── Register models & create tables ──────────────────────────────────────
    with app.app_context():
        # Core models
        from app.models.user import User
        from app.models.document import Document
        from app.models.summary import Summary
        from app.models.saved_quiz import SavedQuiz
        from app.models.saved_deck import SavedDeck
        from app.models.reminder import Reminder
        # Classroom system models
        from app.models.classroom import Classroom, Enrollment, Announcement
        from app.models.quiz_classroom import ClassroomQuiz, ClassroomQuestion
        from app.models.quiz_submission import QuizSubmission
        from app.models.query_log import QueryLog

        db.create_all()

    # ── Register Blueprints ───────────────────────────────────────────────────
    # Existing routes
    from app.routes.auth import auth_bp
    from app.routes.documents import docs_bp
    from app.routes.ai import ai_bp
    from app.routes.quiz import quiz_bp
    from app.routes.flashcards import flashcards_bp
    from app.routes.reminders import reminders_bp
    # New classroom routes
    from app.routes.classrooms import classrooms_bp
    from app.routes.teacher import teacher_bp

    app.register_blueprint(auth_bp,       url_prefix='/api/auth')
    app.register_blueprint(docs_bp,       url_prefix='/api/documents')
    app.register_blueprint(ai_bp,         url_prefix='/api/ai')
    app.register_blueprint(quiz_bp,       url_prefix='/api/quiz')
    app.register_blueprint(flashcards_bp, url_prefix='/api/flashcards')
    app.register_blueprint(reminders_bp,  url_prefix='/api/reminders')
    app.register_blueprint(classrooms_bp, url_prefix='/api/v1/classrooms')
    app.register_blueprint(teacher_bp,    url_prefix='/api/teacher')

    @app.route('/')
    def index():
        return {
            'message': 'Study OS Backend is running!',
            'frontend_url': 'http://localhost:5173',
            'health_check': '/health'
        }

    @app.route('/health')
    def health():
        return {'status': 'ok', 'version': 'v2-classroom'}

    return app
