# Style and Conventions

## Backend (Python)
- **Naming**: Use `snake_case` for functions, variables, and file names.
- **Documentation**: Use triple-quote docstrings at the beginning of functions to describe their purpose and expected metadata/parameters.
- **Imports**: Organize imports alphabetically or by category (standard library, third-party, local).
- **Structure**: Follow the Flask Blueprint structure. Keep business logic in `services/` and persistence in `models/`.

## Frontend (React)
- **Naming**: Use `PascalCase` for component files and function names. Use `camelCase` for variables and helper functions.
- **Framework**: Use functional components and hooks.
- **Styling**: Prefer TailwindCSS utilities.
- **Routing**: Use `react-router-dom` for navigation.
- **API Calls**: Centralize API logic or use Axios instances if possible.
