# School Management Backend

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
- `POST /api/v1/teacher/auth/login`, `/teacher/auth/refresh`, `/teacher/auth/logout` — Teacher-only sign-in and session lifecycle; the app audience is fixed by route and refresh tokens cannot be exchanged across app audiences.
- `POST /api/v1/teacher/auth/password/change`, `/teacher/auth/password/change-current` — complete an administrator-required password change or change the authenticated Teacher password.
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
- `GET /api/v1/notifications`, `GET /api/v1/notifications/{eventId}` — authenticated Parent/Teacher inbox and notification details.
- `PATCH /api/v1/notifications/{eventId}/read`, `/notifications/read-all` — mark the authenticated recipient's notification(s) read.
- `POST /api/v1/notifications/devices`, `DELETE /api/v1/notifications/devices` — register and revoke FCM device tokens for the authenticated app audience.
- `GET /api/v1/notifications/{eventId}/attachment` — issue a short-lived GCS download URL only to the notification recipient.
- `POST /api/v1/guardian/files/upload-intents`, `POST /api/v1/guardian/files/{fileId}/complete`, `GET /api/v1/guardian/files/{fileId}/download` — private GCS upload and download flow for guardian profile photos and complaint/leave attachments.

The backend starts at `http://localhost:4000` by default. Configure `PORT` and comma-separated `CORS_ORIGINS` in `.env` as needed.

Health and OpenAPI endpoints are registered centrally. Business routes under `/api/v1` require a valid `X-School-Code`; guardian routes additionally require a valid guardian access token and enforce the authenticated guardian's own records and approved child links. School help/legal content remains bundled in the Parent app. Platform-control-plane endpoints are deferred; the user will manage platform data directly in MongoDB for now. See the workspace-level [backend plan](../backend-plan.md) for the full endpoint catalog and intended contracts.

Notification creation is exposed to backend services through `sendNotification`; there is intentionally no general client endpoint for sending arbitrary notifications. A temporary `POST /api/v1/notifications/test-send` endpoint is available to authenticated Teacher accounts for Postman push testing. The sender is taken from the Teacher access token; the request can select a recipient ID and role. Remove this temporary route after testing.

In Postman, use `POST YOUR_GCP_API_BASE_URL/api/v1/notifications/test-send`, add `Content-Type: application/json`, `X-School-Code: YOUR_SCHOOL_CODE`, and `Authorization: Bearer YOUR_TEACHER_ACCESS_TOKEN`. The receiver must be an active account in the selected school. The JSON body is:

```json
{
  "receiverId": "PARENT_USER_ID",
  "receiverRole": "guardian",
  "subject": "Notification test",
  "description": "This is a test notification sent from the backend."
}
```

Use `"receiverRole": "teacher"` when targeting a Teacher. `attachmentFileId` is optional and must reference a ready file owned by the authenticated sender. A notification remains in the in-app inbox even if push delivery fails or the recipient has no active device token; check the response `delivery` values and backend logs for push status.

FCM uses HTTP v1 and Google Application Default Credentials. Configure one project-wide `FIREBASE_PROJECT_ID` only when automatic project detection is unsuitable; both mobile apps must use matching Firebase app registrations in that project. Set `DEVICE_TOKEN_ENCRYPTION_KEY` to a dedicated random 32-byte Base64 key in the backend environment/Secret Manager. Generate it with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`; do not reuse the test endpoint secret. The API encrypts stored tokens with AES-256-GCM and stores a SHA-256 token hash for lookup. Do not put Firebase service-account credentials or encryption keys in either mobile app.

## Student numbers

Student numbers are stored as five uppercase letters followed by a two-digit suffix. Each school has an independent, automatically incrementing sequence: `AAAAA01` through `AAAAA99`, then `AAAAB01`. Guardian child-link requests accept compact input such as `A1`, `1`, or `B01`; the backend normalizes it before lookup and returns a compact number.

## Google Cloud Storage

Configure a private bucket in the same or a trusted Google Cloud project. Enable uniform bucket-level access and public access prevention; do not grant `allUsers` access. Set `GCS_BUCKET_NAME` and optionally `GCS_PROJECT_ID`. Cloud Run uses Application Default Credentials from its attached service account; do not create or bundle a service-account key in the app or container.

Grant the Cloud Run service account `roles/storage.objectAdmin` on this bucket only. Signed URLs are short-lived and the API checks the guardian, tenant, ownership, and linked-child relationship before issuing downloads. Upload intents use a signed POST policy with content type and size bounds. Uploaded records stay pending until completion verifies their stored size, content type, and GCS CRC32C. Files are currently marked `not-scanned`; do not treat them as safe for inline browser rendering.

For FCM HTTP v1, enable the Firebase Cloud Messaging API on the Firebase project and grant the Cloud Run runtime service account `roles/firebasecloudmessaging.admin` on that project (or a custom role containing only `cloudmessaging.messages.create`). Store `DEVICE_TOKEN_ENCRYPTION_KEY` as a Secret Manager secret and grant the runtime account access to it. For local development, use Google Application Default Credentials (`gcloud auth application-default login`); do not download or bundle a service-account key.

Example Cloud Run IAM/API setup (replace the placeholders):

```powershell
gcloud services enable fcm.googleapis.com --project=YOUR_FIREBASE_PROJECT_ID
gcloud projects add-iam-policy-binding YOUR_FIREBASE_PROJECT_ID --member=serviceAccount:YOUR_CLOUD_RUN_SERVICE_ACCOUNT --role=roles/firebasecloudmessaging.admin
```

Example bucket and service-account policy setup:

```powershell
gcloud storage buckets update gs://YOUR_PRIVATE_BUCKET --uniform-bucket-level-access --public-access-prevention=enforced
gcloud storage buckets add-iam-policy-binding gs://YOUR_PRIVATE_BUCKET --member=serviceAccount:school-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --role=roles/storage.objectAdmin
gcloud iam service-accounts add-iam-policy-binding school-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --member=serviceAccount:school-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com --role=roles/iam.serviceAccountTokenCreator
```

Complaint and leave attachments use the school's `fileRetentionDays` setting; profile photos currently use a 10-year retention period. The retention clock starts after the upload is verified. Incomplete uploads are eligible for cleanup 24 hours after their signed upload URL expires. The database records these deadlines, but an automated file-expiration/cleanup job is not included yet. Add a scheduled Cloud Run Job or equivalent before relying on those dates for deletion or compliance.

## Deploy to Cloud Run

The included `Dockerfile` builds the TypeScript API and installs production-only dependencies in the runtime image. Create the Cloud Run service with the following configuration:

- Set `GCS_BUCKET_NAME`, and set `GCS_PROJECT_ID` only if automatic project detection is unsuitable.
- Set `MONGODB_URI`, `JWT_SECRET`, `OTP_HMAC_SECRET`, and `DEVICE_TOKEN_ENCRYPTION_KEY` using Secret Manager references, not plaintext source-controlled environment files.
- Set `FIREBASE_PROJECT_ID` only if ADC cannot determine the single Firebase project used by both mobile apps.
- Attach a dedicated runtime service account with bucket-scoped object permissions and permission to sign blobs for itself (needed for signed URLs). Grant it Secret Manager access to the configured secrets.
- Allow unauthenticated invocation at the Cloud Run ingress layer so the mobile app can reach the API; application routes still enforce tenant and bearer-token authorization.
- Cloud Run supplies `PORT` (normally `8080`). The server reads it automatically and exposes `/health/live` and `/health/ready`.

Example from the backend directory (replace project, region, service account, bucket, and secret names):

```powershell
gcloud run deploy school-management-backend `
  --source . `
  --project YOUR_GCP_PROJECT_ID `
  --region YOUR_REGION `
  --service-account school-backend@YOUR_GCP_PROJECT_ID.iam.gserviceaccount.com `
  --allow-unauthenticated `
  --set-env-vars GCS_BUCKET_NAME=YOUR_PRIVATE_BUCKET,GCS_PROJECT_ID=YOUR_GCP_PROJECT_ID `
  --set-secrets MONGODB_URI=mongodb-uri:latest,JWT_SECRET=guardian-jwt-secret:latest,OTP_HMAC_SECRET=guardian-otp-secret:latest
```

The generic JWT issuer and audience are `school-management-api` and `school-management-clients`. Deploying this issuer change invalidates previously issued access tokens; clients must sign in again.

Controller foundations live in `src/shared/http`: `TypedController` specifies route params, response body, request body, query, and response locals; `controllerHandler` forwards async failures to the central error handler; and `sendSuccess` emits a typed `{ data }` envelope. Health handlers demonstrate explicit response DTOs. Request interfaces are compile-time contracts only; feature controllers must also use Zod validation middleware for untrusted request data.

## Architecture convention

Implement business APIs as feature-based modules in a modular monolith. Each feature owns its routes, thin controllers, services, repositories, models, and validations. Put each service operation in its own file, and add an explicit `index.ts` barrel at every code-bearing folder level. Keep database access in repositories, business logic in services, and mount feature routers through `src/routes/index.ts`. The central error middleware returns a request-ID envelope and does not log raw error objects. The detailed folder layout, layer responsibilities, dependency direction, and naming rules are documented in the workspace-level [backend plan](../backend-plan.md#backend-architecture-and-contribution-conventions).

## Included foundations

Express 5, MongoDB through Mongoose, environment validation with Zod, request logging with Morgan, Helmet security headers, CORS, general and auth-specific rate limiting, Nodemailer for future email workflows, Swagger UI/OpenAPI docs, and feature-based Mongoose models. MongoDB must run as a replica set for guardian signup, password-reset, and password-change transactions.

# Thank You