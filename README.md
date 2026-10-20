# RiceFlow Admin

[![CI](https://github.com/microxxd300/rice_flow_admin/actions/workflows/ci.yml/badge.svg)](https://github.com/microxxd300/rice_flow_admin/actions/workflows/ci.yml)
[![CodeQL](https://github.com/microxxd300/rice_flow_admin/actions/workflows/codeql.yml/badge.svg)](https://github.com/microxxd300/rice_flow_admin/actions/workflows/codeql.yml)

React (Vite + React Router) admin dashboard for RiceFlow: farms map, farm cycles, users, datasets, suitability rules, and data import. It talks to the [RiceFlow backend](https://github.com/microxxd300/rice_flow_backend) API.

## Local development

```bash
npm ci
npm run dev        # http://localhost:5173, calls the Django dev server at http://localhost:8000/api
```

Set `VITE_API_URL` (see `.env.example`) to point at a different backend.

## Checks

CI runs on every push and pull request: lint, tests (Vitest), build, Docker image build, `npm audit`, gitleaks, and CodeQL. Run the same checks locally with `npm run lint && npm test && npm run build`.

Branching, commit messages, and releases follow the [backend strategy](https://github.com/microxxd300/rice_flow_backend#branching-strategy): `main` (production), `develop` (integration), and `feature/`, `fix/`, `hotfix/` branches merged by pull request.

## Docker

The [Dockerfile](Dockerfile) is a multi-stage build: Node builds the app, then nginx serves the static files. [nginx.conf](nginx.conf) sends unknown paths to `index.html` so React Router routes survive a refresh, and proxies `/api`, `/admin`, and `/static` to the `backend` service.

The full stack (this frontend, backend, PostgreSQL, Redis) runs from the backend repo's `docker-compose.yml`. Clone both repos side by side, then follow "Run the full stack with Docker" in the backend README.
