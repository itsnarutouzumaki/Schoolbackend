# Greenwood Shared School Backend

TypeScript/Express API and MongoDB model foundation for the Parent and Teacher apps.

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

Set `JWT_SECRET` and `OTP_HMAC_SECRET` to separate random secrets of at least 32 bytes. Production startup rejects missing secrets. Run this command twice to generate independent values:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Password helpers use bcrypt cost factor 12 and reject inputs over bcrypt's 72-byte limit. Access JWTs use HS256 and expire after 15 minutes; opaque refresh credentials are stored only as SHA-256 hashes, rotate on use, and expire after 30 days.

## Endpoints

- `GET /health/live` — process liveness; does not depend on MongoDB.
- `GET /health/ready` — returns `200` when MongoDB is connected, otherwise `503`.
- `GET /api/v1/openapi.json` — OpenAPI 3.0 JSON document.
- `GET /api/docs` — interactive Swagger UI for the currently implemented API.
- `POST /api/v1/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/password/change` — tenant-scoped authentication and session management.
- `POST /api/v1/auth/guardian-signups/verification-codes`, `/auth/guardian-signups` — guardian signup (live signup is unavailable until an SMS provider is configured).
- `POST /api/v1/auth/password-reset/requests`, `/auth/password-reset/confirmations` — guardian password recovery (live delivery requires an SMS provider).

The backend starts at `http://localhost:4000` by default. Configure `PORT` and comma-separated `CORS_ORIGINS` in `.env` as needed.

Health and OpenAPI endpoints are registered centrally. Business routes under `/api/v1` require a valid `X-School-Code`; school access is checked against MongoDB before feature routes run. Auth routes are implemented, but bootstrap, school/people read APIs, attendance, assessments/results, guardian services, files, notifications, and import workflows remain unimplemented. Platform-control-plane endpoints are deferred; the user will manage platform data directly in MongoDB for now. See the workspace-level [backend plan](../backend-plan.md) for the full endpoint catalog and intended contracts.

Controller foundations live in `src/shared/http`: `TypedController` specifies route params, response body, request body, query, and response locals; `controllerHandler` forwards async failures to the central error handler; and `sendSuccess` emits a typed `{ data }` envelope. Health handlers demonstrate explicit response DTOs. Request interfaces are compile-time contracts only; feature controllers must also use Zod validation middleware for untrusted request data.

## Architecture convention

Implement business APIs as feature-based modules in a modular monolith. Each feature owns its routes, thin controllers, services, repositories, models, and validations. Put each service operation in its own file, and add an explicit `index.ts` barrel at every code-bearing folder level. Keep database access in repositories, business logic in services, and mount feature routers through `src/routes/index.ts`. The central error middleware returns a request-ID envelope and does not log raw error objects. The detailed folder layout, layer responsibilities, dependency direction, and naming rules are documented in the workspace-level [backend plan](../backend-plan.md#backend-architecture-and-contribution-conventions).

## Included foundations

Express 5, MongoDB through Mongoose, environment validation with Zod, request logging with Morgan, Helmet security headers, CORS, general and auth-specific rate limiting, Nodemailer for future email workflows, Swagger UI/OpenAPI docs, and feature-based Mongoose models. MongoDB must run as a replica set for guardian signup, password-reset, and password-change transactions.
