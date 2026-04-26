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
