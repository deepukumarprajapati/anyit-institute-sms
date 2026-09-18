# AI Project Context

Read this file before making changes to the Anyit Institute SMS project. It is a compact map of the repository, its architecture, conventions, commands, and important constraints.

## Project Summary

Anyit Institute SMS is a school management system for administrators, teachers, students, and parents. It includes authentication, attendance, fees, exams, homework, library, transport, events, notices, study materials, AI features, gamification, dashboards, and real-time chat.

The repository is a two-part application:

- `backend/` - Node.js and Express API backed by MongoDB/Mongoose
- `frontend/` - React and Vite single-page application

## Runtime Requirements

- Node.js `20.19.0` or newer
- npm `10.8.2` or newer
- MongoDB running locally or accessible through `MONGO_URI`

## Important Ports

- Backend: `5000` by default, controlled by `PORT`
- Frontend: `8080`, configured in `frontend/vite.config.ts`
- Vite proxies `/api` and `/uploads` to `http://localhost:5000`

The existing root README says the frontend runs on port `5173`; the actual Vite configuration currently uses `8080`.

## Root Commands

Run from the repository root:

```bash
npm install
npm run install:all
npm run dev
npm run build
npm run lint
npm run test
```

`npm run dev` starts backend and frontend together through `concurrently`.

Run one application separately:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

## Backend Commands

Run from `backend/` or use `--prefix backend` from the root:

```bash
npm run start
npm run dev
npm run seed
npm run seed:reset
npm run data:export
npm run data:import
```

## Backend Architecture

- Entry point: `backend/server.js`
- Configuration: `backend/src/config/`
- Controllers: `backend/src/controllers/`
- Middleware: `backend/src/middleware/`
- Mongoose models: `backend/src/models/`
- Express routes: `backend/src/routes/`
- Services: `backend/src/services/`
- Socket.IO handlers: `backend/src/socket/`
- Shared helpers: `backend/src/utils/`
- Local study-material uploads: `backend/uploads/study-materials/`

`server.js` creates the Express and Socket.IO servers, loads environment variables, connects MongoDB, applies rate limiting/CORS/body parsing, serves uploads, and mounts API routes.

## Authentication and Authorization

Supported roles:

- `schooladmin`
- `teacher`
- `student`
- `parent`

JWT authentication is implemented in `backend/src/middleware/auth.js` and `backend/src/utils/helpers.js`. Shared JWT configuration validation is in `backend/src/config/security.js`.

Important security rule: `JWT_SECRET` is required. Do not add a fallback secret or commit real credentials. `protect`, `restrictTo`, and `checkPermission` are the main authorization middleware functions.

Socket.IO chat authenticates with the same JWT secret and checks the user in MongoDB before connecting.

## Environment Variables

Use `backend/.env.example` as the template. Important variables include:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `GROQ_API_KEY`
- `EMAIL_HOST`
- `EMAIL_PORT`
- `EMAIL_USER`
- `EMAIL_PASS`
- `CLIENT_URL`

Never paste, print, or expose values from `backend/.env` in responses, logs, commits, or generated documentation. Rotate credentials if they have been pushed to a public or shared remote.

## Frontend Architecture

- App entry: `frontend/src/main.tsx`
- Router/application shell: `frontend/src/App.tsx`
- Global styles: `frontend/src/index.css` and `frontend/src/App.css`
- Pages: `frontend/src/pages/`
- Reusable UI: `frontend/src/components/`
- React contexts: `frontend/src/contexts/`
- Hooks: `frontend/src/hooks/`
- API client: `frontend/src/lib/api.ts`
- Tests: `frontend/src/test/`

The frontend uses React 19, TypeScript, Tailwind CSS 3, Radix UI, Axios, React Router 7, TanStack Query, Socket.IO client, Recharts, and Vitest.

## Frontend API and Chat Rules

- Axios API base URL: `VITE_API_URL`, otherwise `/api`
- Socket URL: `VITE_SOCKET_URL`, otherwise derived from `VITE_API_URL` or `http://localhost:5000`
- The API client adds the JWT as a Bearer token
- Existing authentication stores the JWT in `localStorage` under `eduflow_token`
- Do not hard-code production API or socket URLs
- Keep API calls in or near `frontend/src/lib/api.ts` and preserve the existing auth interceptor behavior

## Data and Uploads

Study materials are uploaded locally with Multer and served under `/uploads`. Allowed extensions are PDF, Word, PowerPoint, Excel, and text files, with a 20 MB size limit.

Treat upload access as security-sensitive. Do not make uploaded files public or bypass authorization without explicitly reviewing the impact. Validate file type, size, ownership, and school scope.

## Coding Conventions

- Preserve the existing JavaScript CommonJS style in the backend.
- Preserve the existing TypeScript/React style in the frontend.
- Prefer existing controllers, models, middleware, services, and UI components over new parallel abstractions.
- Keep changes scoped to the requested behavior.
- Do not expose secrets in logs or documentation.
- Run focused validation after edits.
- Do not reset or overwrite unrelated user changes.

## Validation Checklist

For backend changes:

```bash
node --check backend/server.js
node -e "const fs=require('fs'); const root='./backend/src/routes'; for (const file of fs.readdirSync(root).filter(f=>f.endsWith('.js'))) require(root+'/'+file); console.log('Loaded all route modules');"
npm audit --prefix backend
```

For frontend changes:

```bash
npm run build --prefix frontend
npm run test --prefix frontend
npm run lint --prefix frontend
```

The frontend currently has existing lint errors involving `any` types and empty interfaces. Treat those as pre-existing unless the changed code introduces new ones.

## Security Baseline

Known baseline concerns to keep in mind:

- Backend dependency audit should remain clean.
- Frontend audit currently reports development-tool vulnerabilities in the Vite 5/Vitest 3 toolchain; upgrading to Vite 8/Vitest 5 requires a separate migration.
- `backend/.env` must never be committed or shared.
- JWT configuration must fail closed when `JWT_SECRET` is missing.
- CORS must use an explicit configured frontend origin when credentials are enabled.
- Uploaded materials currently use local static serving and require authorization review.
- Avoid adding `dangerouslySetInnerHTML`, shell execution, unsafe redirects, or unvalidated dynamic file paths.

## Useful Documentation

- Root setup: `README.md`
- Backend API and demo data: `backend/README.md`
- Chat API details: `backend/CHAT_API_DOCS.md`
- Environment template: `backend/.env.example`
