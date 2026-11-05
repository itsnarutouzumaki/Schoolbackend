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
- `POST /api/v1/guardian/auth/login` — guardian-only sign-in; the role is fixed by the endpoint, not supplied by the app.
- `POST /api/v1/guardian/auth/refresh`, `/guardian/auth/logout`, `/guardian/auth/password/change` — tenant-scoped session management and required-password-change flow.
- `POST /api/v1/guardian/auth/password/change-current` — change the signed-in guardian password; all existing sessions are revoked.
- `POST /api/v1/guardian/auth/signup/verification-codes`, `/guardian/auth/signup` — guardian signup (live signup is unavailable until an SMS provider is configured).
- `POST /api/v1/guardian/auth/password-reset/requests`, `/guardian/auth/password-reset/confirmations` — guardian password recovery (live delivery requires an SMS provider).
- `GET /api/v1/guardian/bootstrap` — aggregate authenticated snapshot for the guardian app.
- `GET /api/v1/guardian/me`, `/guardian/me/children`, `/guardian/child-link-requests`, `/guardian/leave-requests`, `/guardian/complaints`, `/guardian/notifications`.
- `GET /api/v1/guardian/children/{childId}/attendance`, `/results`, `/fees`, `/teachers` — only for a child linked to the authenticated guardian.
- `PATCH /api/v1/guardian/me` — update guardian name, address, and an owned profile-photo file.
- `POST /api/v1/guardian/child-link-requests`, `/leave-requests`, `/complaints` — submit requests for school review; leave submission requires password confirmation.
- `PATCH /api/v1/guardian/notifications/{eventId}/read` and `/notifications/read-all` — mark only the authenticated guardian's notifications read.
- `POST /api/v1/guardian/files/upload-intents`, `POST /api/v1/guardian/files/{fileId}/complete`, `GET /api/v1/guardian/files/{fileId}/download` — private GCS upload and download flow for guardian profile photos and complaint/leave attachments.

The backend starts at `http://localhost:4000` by default. Configure `PORT` and comma-separated `CORS_ORIGINS` in `.env` as needed.

Health and OpenAPI endpoints are registered centrally. Business routes under `/api/v1` require a valid `X-School-Code`; guardian routes additionally require a valid guardian access token and enforce the authenticated guardian's own records and approved child links. School help/legal content remains bundled in the Parent app. Platform-control-plane endpoints are deferred; the user will manage platform data directly in MongoDB for now. See the workspace-level [backend plan](../backend-plan.md) for the full endpoint catalog and intended contracts.

The Guardian write and file APIs are now implemented on the backend, but the Parent app's profile edit, child-link, leave, complaint, notification-read, and upload screens have not yet been wired to these endpoints. Until that separate mobile integration is done, those UI flows may still be local/demo behavior.

## Google Cloud Storage

Configure a private bucket in the same or a trusted Google Cloud project. Enable uniform bucket-level access and public access prevention; do not grant `allUsers` access. Set `GCS_BUCKET_NAME` and optionally `GCS_PROJECT_ID`. Cloud Run uses Application Default Credentials from its attached service account; do not create or bundle a service-account key in the app or container.

Grant the Cloud Run service account `roles/storage.objectAdmin` on this bucket only. Signed URLs are short-lived and the API checks the guardian, tenant, ownership, and linked-child relationship before issuing downloads. Upload intents use a signed POST policy with content type and size bounds. Uploaded records stay pending until completion verifies their stored size, content type, and GCS CRC32C. Files are currently marked `not-scanned`; do not treat them as safe for inline browser rendering.

Example bucket and service-account policy setup:

```powershell
gcloud storage buckets update gs://YOUR_PRIVATE_BUCKET --uniform-bucket-level-access --public-access-prevention=enforced
gcloud storage buckets add-iam-policy-binding gs://YOUR_PRIVATE_BUCKET --member=serviceAccount:greenwood-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --role=roles/storage.objectAdmin
gcloud iam service-accounts add-iam-policy-binding greenwood-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --member=serviceAccount:greenwood-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
```

Complaint and leave attachments use the school's `fileRetentionDays` setting; profile photos currently use a 10-year retention period. The retention clock starts after the upload is verified. Incomplete uploads are eligible for cleanup 24 hours after their signed upload URL expires. The database records these deadlines, but an automated file-expiration/cleanup job is not included yet. Add a scheduled Cloud Run Job or equivalent before relying on those dates for deletion or compliance.

## Deploy to Cloud Run

The included `Dockerfile` builds the TypeScript API and installs production-only dependencies in the runtime image. Create the Cloud Run service with the following configuration:

- Set `GCS_BUCKET_NAME`, and set `GCS_PROJECT_ID` only if automatic project detection is unsuitable.
- Set `MONGODB_URI`, `JWT_SECRET`, and `OTP_HMAC_SECRET` using Secret Manager references, not plaintext source-controlled environment files.
- Attach a dedicated runtime service account with bucket-scoped object permissions and permission to sign blobs for itself (needed for signed URLs).
- Allow unauthenticated invocation at the Cloud Run ingress layer so the mobile app can reach the API; application routes still enforce tenant and bearer-token authorization.
- Cloud Run supplies `PORT` (normally `8080`). The server reads it automatically and exposes `/health/live` and `/health/ready`.

Example from the backend directory (replace project, region, service account, bucket, and secret names):

```powershell
gcloud run deploy greenwood-school-backend `
  --source . `
  --project YOUR_GCP_PROJECT_ID `
  --region YOUR_REGION `
  --service-account greenwood-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars GCS_BUCKET_NAME=YOUR_PRIVATE_BUCKET,GCS_PROJECT_ID=YOUR_GCP_PROJECT_ID `
  --set-secrets MONGODB_URI=mongodb-uri:latest,JWT_SECRET=guardian-jwt-secret:latest,OTP_HMAC_SECRET=guardian-otp-secret:latest
```

Controller foundations live in `src/shared/http`: `TypedController` specifies route params, response body, request body, query, and response locals; `controllerHandler` forwards async failures to the central error handler; and `sendSuccess` emits a typed `{ data }` envelope. Health handlers demonstrate explicit response DTOs. Request interfaces are compile-time contracts only; feature controllers must also use Zod validation middleware for untrusted request data.

## Architecture convention

Implement business APIs as feature-based modules in a modular monolith. Each feature owns its routes, thin controllers, services, repositories, models, and validations. Put each service operation in its own file, and add an explicit `index.ts` barrel at every code-bearing folder level. Keep database access in repositories, business logic in services, and mount feature routers through `src/routes/index.ts`. The central error middleware returns a request-ID envelope and does not log raw error objects. The detailed folder layout, layer responsibilities, dependency direction, and naming rules are documented in the workspace-level [backend plan](../backend-plan.md#backend-architecture-and-contribution-conventions).

## Included foundations

Express 5, MongoDB through Mongoose, environment validation with Zod, request logging with Morgan, Helmet security headers, CORS, general and auth-specific rate limiting, Nodemailer for future email workflows, Swagger UI/OpenAPI docs, and feature-based Mongoose models. MongoDB must run as a replica set for guardian signup, password-reset, and password-change transactions.
