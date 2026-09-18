# Anyit Institute SMS

School management system with a Node.js/Express backend and a React/Vite frontend.

## Project Structure

- `backend/` - Express API, MongoDB models, authentication, AI, chat, and school management features
- `frontend/` - React and Vite web application

## Requirements

- Node.js 20.19.0 or newer
- npm
- MongoDB

## Setup

Install the root development dependency and both project dependencies:

```bash
npm install
npm run install:all
```

Configure the backend environment:

```bash
cp backend/.env.example backend/.env
```

On Windows PowerShell, use:

```powershell
Copy-Item backend/.env.example backend/.env
```

Update `backend/.env` with the MongoDB connection, JWT secret, email, AI, and frontend URL settings.

## Development

Start the backend and frontend together from the repository root:

```bash
npm run dev
```

The backend runs on port `5000` by default and the frontend runs on port `5173`.

To run either project separately:

```bash
npm run dev --prefix backend
npm run dev --prefix frontend
```

## Common Commands

```bash
npm run build   # Build the frontend
npm run lint    # Lint the frontend
npm run test    # Run frontend tests
```

Backend data commands can be run from the root with:

```bash
npm run seed --prefix backend
npm run seed:reset --prefix backend
npm run data:export --prefix backend
npm run data:import --prefix backend
```

See [backend/README.md](backend/README.md) for API routes, demo accounts, permissions, and database details.
