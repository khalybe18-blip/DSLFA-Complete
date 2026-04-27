# Suggested Commands

## Running the Backend (Flask)
```powershell
cd backend
# Activation (assuming venv exists)
.\venv\Scripts\activate
# Running
python -m flask run --host=127.0.0.1 --port=5000 --debug
```

## Running the Frontend (Vite)
```powershell
cd frontend
# Install dependencies (first time)
npm install
# Running
npm run dev\n\n# Linting\nnpm run lint\n```\n\n## Maintenance & Cleanup (Windows)
```powershell
# Kill all Python processes (useful if Flask hangs)
taskkill /F /IM python.exe

# Kill Vite dev server (if on port 5173)
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue).OwningProcess -Force -ErrorAction SilentlyContinue
```

## Vector Store Debugging
```powershell
cd backend
python inspect_chroma.py
```

## Utilities
- `ls`: List directory contents.
- `grep -r "pattern" .`: Search for pattern in files.
- `git status`: Check repository status.
