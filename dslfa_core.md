

---

## TECH STACK

**Frontend:**
- React.js (with React Router for routing)
- Tailwind CSS for styling
- Lucide React for icons
- Framer Motion for animations
- Axios for API calls

**Backend:**
- Python with Flask
- Flask-JWT-Extended for authentication
- Flask-CORS for cross-origin support
- Flask-SQLAlchemy as ORM

**Database:**
- MySQL for persistent storage (users, classrooms, documents, quizzes, analytics)
- ChromaDB or FAISS for vector embeddings (RAG system)

**AI / NLP Layer:**
- Hugging Face Transformers (summarization: facebook/bart-large-cnn)
- spaCy + NLTK for NLP preprocessing
- sentence-transformers (all-MiniLM-L6-v2) for embeddings
- OpenAI API or Ollama (local LLM) for chat and question generation

**Document Processing:**
- PyPDF2 / pdfplumber for PDF parsing
- python-docx for Word files
- python-pptx for PowerPoint files
- youtube-transcript-api for YouTube video transcripts
- BeautifulSoup4 for web link scraping

**Deployment:**
- Docker + Docker Compose
- Deployable to Heroku or AWS EC2

---

## USER ROLES

Two roles: **Teacher** and **Student**. Authentication via JWT. Role-based dashboards.

---

## CORE FEATURES TO BUILD

### 1. GOOGLE CLASSROOM CLONE (Base Layer)

- Teacher can create classrooms with a class code
- Students join classrooms via class code
- Teacher can post announcements, assignments, and upload study materials (PDF, DOCX, PPTX, YouTube links, web URLs)
- All uploaded materials are visible to enrolled students in a "Class Notes" section
- Teacher can broadcast AI-generated content (summaries, quizzes) directly to the entire class

### 2. STUDENT NOTES SECTION (AI-Powered)

- Each student sees two tabs in their notes:
  - "Class Notes" — materials uploaded by the teacher
  - "My Notes" — student's own uploaded documents
- Both sets of notes are chunked, embedded, and stored in a vector database per student
- A unified RAG corpus is built from both sources for AI queries
- Students can annotate/highlight any AI-generated content and ask the AI to explain a highlighted passage further

### 3. RAG SYSTEM (Topic-Based, Not Document-Based)

- When documents are uploaded, parse and chunk them into semantic segments
- Generate embeddings using sentence-transformers and store in ChromaDB
- Build a topic graph per classroom — if 3 PDFs cover Thermodynamics, a query on "entropy" retrieves context from all 3
- All AI features (summary, quiz, flashcard, Q&A) use this RAG pipeline as context

### 4. AI CONTENT GENERATION

All content generated via LLM using RAG context:

- **Smart Summarization**: Extractive + abstractive summary of uploaded documents. If student has their own notes too, the AI merges teacher notes and student notes into a unified summary and highlights gaps ("Your notes don't cover Newton's 3rd Law which appears in teacher's slides")
- **Question Generation**: Generate MCQs, True/False, Fill-in-the-Blank, Short Answer, and Long Answer questions. Each question is tagged with Bloom's Taxonomy level (Remember / Understand / Apply / Analyze / Evaluate / Create)
- **Flashcard Generation**: Generate flip-style flashcards from document content. Implement SM-2 Spaced Repetition System (SRS) — cards resurface based on user performance rating (Again / Hard / Good / Easy)
- **AI Tutor Chatbot**: Context-aware 24/7 chatbot using RAG. Student asks a question, it answers using the classroom documents as context. Maintains conversation history per session

### 5. UI CARD SYSTEM (Frontend)

Show all AI-generated content as interactive cards:

- **Study Card**: Rich content with title, explanation, tags, and Bloom's level badge
- **Flip Card (Exam Mode)**: Question on front, answer revealed on flip — 3D CSS flip animation
- **Gap Card**: Personalized card shown when AI detects student hasn't covered a topic
- **Quiz Card**: MCQ with instant feedback (green/red highlight on selection), explanation shown after answering
- Toggle between Study Mode and Exam Mode from the notes section

### 6. BLOOM'S TAXONOMY QUESTION PAPER EXPORT

- Teacher selects a document or topic
- Sets filters: number of questions per Bloom's level, question types (MCQ/short/long), total marks, difficulty
- System generates a structured question paper
- Export as a formatted PDF (using ReportLab or WeasyPrint) with:
  - Header: Subject, Date, Total Marks, Time
  - Sections: Section A (2-mark), Section B (5-mark), Section C (10-mark)
  - Each question tagged with marks

### 7. ADAPTIVE QUIZ ENGINE

- Student takes a quiz generated from their notes
- After completion, AI analyzes wrong answers and identifies weak sub-topics
- Automatically generates extra flashcards and practice questions only for weak areas
- Shows a Bloom's Taxonomy Radar Chart (using Chart.js) showing student's cognitive strength per topic: Remember / Understand / Apply / Analyze / Evaluate / Create

### 8. TEACHER ANALYTICS DASHBOARD

- Class-wide performance overview: average scores per topic, per quiz
- Heatmap or bar chart of weak topics across the class (e.g., "60% of students are weak in Mohr's Circle")
- Individual student progress timeline
- Most-missed questions across the class
- Export analytics as PDF report

### 9. STUDENT ANALYTICS DASHBOARD

- Personal progress timeline
- Bloom's Taxonomy radar chart per subject
- SRS flashcard retention rate
- Upcoming flashcard review schedule (spaced repetition calendar view)
- Study streak tracker

### 10. OFFLINE-FIRST NOTES (PWA)

- Cache student's notes section using Service Workers
- Students can view previously loaded notes and flashcards without internet
- Sync changes when connection is restored

---

## DATABASE SCHEMA (Key Tables)

- users (id, name, email, password_hash, role, created_at)
- classrooms (id, name, subject, teacher_id, class_code, created_at)
- enrollments (id, student_id, classroom_id)
- documents (id, classroom_id, uploader_id, title, file_type, file_path, source_url, created_at)
- embeddings (id, document_id, chunk_text, vector_id, topic_tag)
- summaries (id, document_id, student_id, summary_text, created_at)
- flashcards (id, student_id, document_id, question, answer, bloom_level, next_review, ease_factor, interval, repetitions)
- quizzes (id, classroom_id, created_by, title, bloom_distribution, created_at)
- questions (id, quiz_id, text, type, options_json, correct_answer, bloom_level, marks)
- quiz_attempts (id, student_id, quiz_id, score, attempted_at)
- question_responses (id, attempt_id, question_id, student_answer, is_correct)
- chat_sessions (id, student_id, classroom_id, messages_json, updated_at)
- announcements (id, classroom_id, teacher_id, content, created_at)

---
## AI FRAMEWORK

Use LangChain and LangGraph as the core AI orchestration framework.

**LangChain (for single-pass pipelines):**
- Use LCEL (LangChain Expression Language) syntax: chain = prompt | llm | parser
- Use Chroma as the LangChain vector store (langchain-chroma)
- Use ConversationalRetrievalChain for the AI Tutor chatbot with memory
- Use StructuredOutputParser or PydanticOutputParser for question/flashcard generation 
  so output is always clean JSON
- Use RecursiveCharacterTextSplitter for document chunking (chunk_size=500, overlap=50)
- LLM backend: support both OpenAI (gpt-4o-mini) and Ollama (llama3/gemma) — 
  switchable via env variable LLM_BACKEND=openai|ollama

**LangGraph (for multi-step agentic flows):**
- Adaptive Quiz Graph: 
  Nodes → [analyze_responses] → [identify_weak_topics] → [generate_gap_flashcards] 
         → [generate_practice_questions] → [END]
  Each node is a Python function, state passed as TypedDict
- Note Merge Graph:
  Nodes → [embed_teacher_notes] → [embed_student_notes] → [compare_topic_coverage] 
         → [identify_gaps] → [generate_gap_cards] → [END]
- Use StateGraph from langgraph.graph
- Persist graph state per student session in MySQL

**Dependencies to add to requirements.txt:**
langchain>=0.3.0
langchain-community
langchain-chroma
langchain-openai
langchain-ollama
langgraph>=0.2.0
chromadb
sentence-transformers


## API ENDPOINTS (Key Routes)

**Auth:** POST /api/auth/register, POST /api/auth/login

**Classrooms:** GET/POST /api/classrooms, POST /api/classrooms/join, GET /api/classrooms/:id/students

**Documents:** POST /api/documents/upload, GET /api/classrooms/:id/documents

**AI:** POST /api/ai/summarize, POST /api/ai/generate-questions, POST /api/ai/generate-flashcards, POST /api/ai/chat

**Quiz:** POST /api/quizzes/create, POST /api/quizzes/:id/attempt, GET /api/quizzes/:id/results

**Export:** POST /api/export/question-paper, GET /api/export/analytics-report

**Analytics:** GET /api/analytics/student/:id, GET /api/analytics/classroom/:id

---

## UI/UX REQUIREMENTS

- Clean, modern dashboard design — dark/light mode toggle
- Warm neutral color palette (not generic blue/purple gradients)
- Left sidebar navigation for both teacher and student dashboards
- Responsive — works on mobile and desktop
- Skeleton loaders for all async data
- Empty states with helpful messages and CTAs (not just "No data")
- Toast notifications for actions
- All AI-generated content shown as cards with smooth fade-in animations
- Bloom's level badges with color coding:
  - Remember → gray
  - Understand → blue
  - Apply → green
  - Analyze → yellow
  - Evaluate → orange
  - Create → purple

---

## FOLDER STRUCTURE

dslfa/
├── backend/
│ ├── app/
│ │ ├── routes/
│ │ ├── models/
│ │ ├── services/
│ │ │ ├── ai_service.py
│ │ │ ├── rag_service.py
│ │ │ ├── document_parser.py
│ │ │ └── export_service.py
│ │ └── _init_.py
│ ├── requirements.txt
│ └── run.py
├── frontend/
│ ├── src/
│ │ ├── pages/
│ │ ├── components/
│ │ │ ├── cards/
│ │ │ ├── dashboard/
│ │ │ └── charts/
│ │ ├── hooks/
│ │ └── App.jsx
│ └── package.json
└── docker-compose.yml




