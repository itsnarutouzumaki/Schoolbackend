# Greenwood Shared School Backend

Initial TypeScript/Express API scaffold for the Parent and Teacher apps.

## Requirements

- Node.js 22.11+
- npm
- MongoDB for the readiness check

## Setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Set `MONGODB_URI` in `.env` to a reachable MongoDB instance. The API can start without MongoDB so the liveness endpoint and API documentation remain available, but readiness returns `503` until MongoDB connects.

## Endpoints

- `GET /health/live` — process liveness; does not depend on MongoDB.
- `GET /health/ready` — returns `200` when MongoDB is connected, otherwise `503`.
- `GET /api/v1/openapi.json` — OpenAPI 3.0 JSON document.
- `GET /api/docs` — interactive Swagger UI for the currently implemented API.

The backend starts at `http://localhost:4000` by default. Configure `PORT` and comma-separated `CORS_ORIGINS` in `.env` as needed.

Only health endpoints are implemented so far. Planned school, authentication, attendance, results, file, and notification routes are described in the workspace-level `backend-plan.md`; they are not yet active API endpoints.

## Included foundations

Express 5, MongoDB through Mongoose, environment validation with Zod, request logging with Morgan, Helmet security headers, CORS, rate limiting, Nodemailer for future email workflows, and Swagger UI/OpenAPI docs.
