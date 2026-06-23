# Cycling Event Platform

A beginner-friendly full-stack project for a large cycling event.

## What works now

- An Express API returns the current event and its categories.
- A React page loads that data from the API.
- Prices are formatted as Indonesian rupiah.
- Remaining category capacity is calculated from backend data.

## First setup

1. Copy `.env.example` to `.env`.
2. Copy `apps/web/.env.example` to `apps/web/.env`.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173`.
6. Check the API at `http://localhost:8000/api/v1/events/current`.

The repository already includes a local `.env`. Git ignores it so future secrets
will not be committed.

## Where to start editing

- Event data: `apps/api/src/event-data.js`
- API routes: `apps/api/src/server.js`
- React page: `apps/web/src/App.jsx`
- Page design: `apps/web/src/styles.css`

## Environment variables

Environment variables are values that can differ between your laptop, staging,
and production. This project currently uses:

- `PORT`: backend server port
- `FRONTEND_URL`: frontend allowed to call the backend
- `VITE_API_URL`: API address used by the browser, stored in `apps/web/.env`

Do not put event prices or quotas in `.env`. Later, those values will live in
the database.
