# Task Completion Checklist

When completing a task in DSLFA, ensure the following steps are performed:

1. **Code Quality**:
   - Verify that and conventions specified in `style_conventions.md` are followed.
   - For backend changes, ensure docstrings are updated or added.
   - Check for any unused imports or variables.

2. **Database & Migrations**:
   - If models were changed, verify if migrations are needed (`flask db migrate`).
   - Ensure SQLite DB handles new schema changes gracefully.

3. **Frontend Integration**:
   - If API endpoints were changed, ensure the frontend Axios calls are updated.
   - Verify that new UI elements are responsive and use TailwindCSS correctly.

4. **Testing**:
   - Run the backend and frontend locally to verify changes.
   - Check for console errors in the browser.
   - Verify that ChromaDB integrations (if any) are functioning (check vectors are created/deleted).

5. **Cleanup**:
   - Ensure any temporary files or debug logs are removed.
   - If new processes were started, kill them if necessary using the suggested shutdown commands.
