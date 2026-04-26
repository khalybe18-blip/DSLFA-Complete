# DSLFA - AI-Powered Study OS

DSLFA is an advanced, local AI-powered platform designed for engineering students to transform unstructured study materials into highly interactive learning experiences. Running off local vector databases and large language models, DSLFA ensures utmost privacy and lightning-fast RAG operations.

## ✨ Features

- **Dashboard**: Track your current consistency streaks, daily motivational quotes, up-to-date upcoming exam reminders, and a high-level summary view of your most recent study actions.
- **My Notes / Smart Summaries**: Upload lecture slides, PDF documents, and txt files. DSLFA automatically breaks them down, extracts key sections, and builds intelligent layout summaries natively.
- **AI Tutor Interface**: A split-pane chat interface where an AI tutor references your uploaded documents directly via localized semantic RAG (Retrieval-Augmented Generation). The document dynamically loads right next to your chat!
- **Quiz Engine**: Turns uploaded texts into dynamically generated customized assessment evaluations using multiple difficulty simulations (Standard, Speedrun, Conceptual). Saves final grades to your personal Library.
- **Flashcard Studio**: Converts text context directly into flip-card study decks (featuring concepts, definitions, formulas, and clozes). Tracks the ones you have 'Mastered' automatically.
- **Reminders**: Built-in calendar and tracking module. Automatically injects event knowledge (like upcoming finals) into your AI Tutor's system prompt so the AI acts accordingly.
- **Library Persistence**: Every Quiz, Flashcard, Note, and Reminder you create successfully saves via backend SQLite to remain persistently accessible across client reboots.

---

## 📂 Project Structure & Architecture

DSLFA is split into two completely separate repositories nested in one major folder.

### **Frontend Directory `frontend/`**
Contains the Vite + React codebase.
* `src/main.jsx` & `App.jsx` — The core roots of the application routing framework. Defines all top-level URL routes.
* `src/pages/Dashboard.jsx` — The landing page. Handles greeting logic, consistency fire-streaks, randomized quotes, and fetching all your recent "Library" interactions.
* `src/pages/Notes.jsx` & `NoteSummary.jsx` — Handles the file upload drag-and-drop zone. Interfaces with backend to retrieve vectorized text and LLM structural analysis.
* `src/pages/AiTutor.jsx` — The split-pane UI where the left side loads an interactive iframe of your PDF, and the right side maintains an active SSE (Server Sent Events) chat dialogue with the local Language Model.
* `src/pages/QuizDashboard.jsx` — Selects notes, configures difficulty (Speedrun, Conceptual), passes preferences via API, and creates an animated testing environment.
* `src/pages/FlashcardDashboard.jsx` — Generates and visualizes 3D-flipping cards that are categorized by Concept, Formula, or Definition based on your notes.
* `src/pages/Reminders.jsx` — Handles CRUD operations for exams/events and directly synchronizes with the AI's internal system prompt logic.

### **Backend Directory `backend/`**
Contains the Python Flask API, SQLAlchemy Database, and Local Language Models interface.
* `run.py` & `app/__init__.py` — The bootloader execution scripts. Automatically connects SQLite, instantiates ChromaDB logic, and registers Blueprint route paths.
* **`app/routes/`**:
  * `documents.py` — File uploader. Saves binaries natively, triggers text extraction, and pushes the text to ChromaDB. Also handles the physical `send_file` logic for viewing inside the app.
  * `ai.py` — Handles basic AI pings and generates structural summaries of uploaded texts.
  * `quiz.py` & `flashcards.py` — Coordinates with `ai_service.py` explicitly forcing the LLM to return strictly formatted `JSON` arrays so the frontend can natively build interactive components and test evaluations.
  * `reminders.py` — Native database endpoints mapping standard timestamp formats.
* **`app/services/`**:
  * `embedding_service.py` — Local vector initialization logic mapping text chunks into numeric arrays via local Ollama embeddings and Recursive Character splitting.
  * `chat_service.py` — Complex multi-pass semantic search. Uses ChromaDB to fetch Nearest-Neighbor contexts and intercepts the student's exam reminders dynamically before wrapping the entire payload and querying the LLM for chat outputs.
  * `document_parser.py` — Raw script handling `PyMuPDF` or `python-docx` decoding functionality.
* **`app/models/`**: Defines SQLAlchemy schema objects (`document.py`, `quiz.py`, `reminder.py`, etc.) for persistence.

## 🛠 Tech Stack
* **Frontend**: React + Vite, TailwindCSS, React-Router, Lucide Icons, Axios.
* **Backend**: Python, Flask, SQLAlchemy (SQLite), ChromaDB (Vector Store), Langchain, Ollama / Custom Local LLMs.

---

## 🚀 Running the Project

Because the project utilizes a split monolithic structure, you must spin up both the Backend and Frontend servers separately.

### 1. Start the Backend API (Flask)
Open your terminal inside the root directory and boot up the backend:
```powershell
cd backend
.\venv\Scripts\python -m flask run --host=127.0.0.1 --port=5000 --debug
```

### 2. Start the Frontend Application (Vite)
Open a *new* terminal tab alongside the backend terminal:
```powershell
cd frontend
npm install  # (If you haven't installed packages yet)
npm run dev
```

### 3. Gracefully Shutting Down
If you encounter a port lock or zombie servers running in the background, run this forcefully in PowerShell:
```powershell
# Kill Backend
taskkill /F /IM python.exe
# Kill Frontend
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue 
```

Visit the frontend at `http://localhost:5173` to jump right into your study session!
