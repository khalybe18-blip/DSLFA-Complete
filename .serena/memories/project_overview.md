# DSLFA Project Overview

## Purpose
DSLFA (AI-Powered Study OS) is an advanced, local AI-powered platform designed for engineering students to transform unstructured study materials into interactive learning experiences. It uses local vector databases (ChromaDB) and LLMs (via Ollama) to ensure privacy and speed.

## Tech Stack
### Backend
- **Language**: Python
- **Framework**: Flask
- **Database**: SQLAlchemy (SQLite)
- **Vector Store**: ChromaDB
- **AI Integration**: Langchain, Ollama (using `mxbai-embed-large:latest` and potentially other models)
- **Parsing**: PyMuPDF, python-docx, python-pptx

### Frontend
- **Language**: JavaScript (JSX)
- **Framework**: React (Vite)
- **Routing**: React-Router
- **Styling**: TailwindCSS
- **Icons**: Lucide Icons
- **HTTP Client**: Axios

## Codebase Structure
- `backend/`: Python API and services.
    - `app/`: Main application logic.
        - `models/`: SQLAlchemy database models.
        - `routes/`: Flask blueprints for documents, ai, quiz, flashcards, reminders.
        - `services/`: Business logic for embeddings, chat, and document parsing.
    - `chroma_db/`: Local vector store persistence.
    - `instance/`: SQLite database files.
    - `uploads/`: Physical file storage for uploaded documents.
- `frontend/`: React application.
    - `src/`: Source code.
        - `components/`: Reusable UI components.
        - `pages/`: Page-level components (Dashboard, Notes, AI Tutor, etc.).
    - `public/`: Static assets.
