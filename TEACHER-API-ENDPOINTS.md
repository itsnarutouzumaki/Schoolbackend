# Teacher App API: Code-Based Requirements

**Reviewed:** 2026-11-14  
**Scope:** APIs justified by Teacher app screens and services currently in this codebase. This report distinguishes implemented authentication and initial data reads from mock/local workflows that still need backend support. It does not treat database models, roadmap notes, or generic product ideas as implemented APIs.

## Conclusion

Teacher authentication and the initial bootstrap, roster, and student-number lookup reads are exposed by the backend and called by the Teacher app. Attendance submissions, assessment/result persistence, file operations, profile updates, notification inbox synchronization, and push-token registration remain mock/local or conditional.

The practical API work is therefore:

1. Keep the existing Teacher authentication endpoints; do not build a second auth API.
2. The bootstrap, assigned roster, and exact student-number lookup reads are implemented and wired to authenticated Teacher flows.
3. Add only the additional reads and writes needed to replace data that current Teacher screens actually load or mutate.
4. Keep features that are intentionally local (PDF creation, bundled school information, local notification tests) out of the API contract.

## Evidence from this codebase

- `backend/src/routes/index.ts` mounts `/teacher/auth`, the initial `/teacher` data routes, and Guardian routes.
- `backend/src/features/auth/routes/auth.routes.ts` defines Teacher login, refresh, required-password change, current-password change, and logout routes.
- `teacher/src/services/teacherAuth.ts` calls those five operations and stores the resulting session in Keychain.
- `teacher/src/services/teacherApiClient.ts` is the shared HTTP helper; `teacher/src/services/teacherDataApi.ts` calls the initial authenticated Teacher data APIs.
- `teacher/src/services/teacherApi.contract.ts` declares class/roster, attendance/result submission, and device-token methods, but no concrete implementation calls a backend for those methods.
- `teacher/src/services/teacherService.ts`, `teacher/src/app-context.tsx`, and `teacher/src/data/` supply bundled mock data and local state.
- `teacher/src/screens/attendance/AttendanceReviewScreen.tsx` and `teacher/src/screens/results/ResultReviewScreen.tsx` perform local-only submission.
- `teacher/src/screens/results/StudentResultLookupScreen.tsx` calls exact student-number lookup in authenticated mode and uses the demo roster in demo mode.
- `teacher/src/components/IncompleteResultSessions.tsx` and `teacher/src/services/teacherService.ts` synthesize resumed marks from demo data. They do not restore server-persisted progress.
- `teacher/src/screens/results/StudentResultsScreen.tsx` filters local results, edits local marks, and downloads a local PDF URI.
- `teacher/src/screens/profile/EditProfileScreen.tsx` saves profile edits and selected photo paths only to app state.
- `teacher/src/screens/notifications/NotificationsScreen.tsx` stores notification records locally, marks them read locally, and creates a local test notification.
- `teacher/src/services/notificationService.ts` can obtain/store an FCM token and declares registration helpers, but the notification screen does not call a backend registration API. `teacher/src/services/notificationApi.contract.ts` is only an interface.

## 1. Authentication — already implemented

These are real routes and are wired from the Teacher app. They are listed to make the status clear, not as new work.

| Method and path (under `/api/v1`) | Current use | Status |
|---|---|---|
| `POST /teacher/auth/login` | School-issued phone and password; route fixes role/audience to Teacher. | Implemented and called by Teacher Login. |
| `POST /teacher/auth/refresh` | Rotates a refresh token for the Teacher audience. | Implemented and called when restoring an expiring session. |
| `POST /teacher/auth/logout` | Revokes the authenticated session. | Implemented and called by Teacher sign-out. |
| `POST /teacher/auth/password/change` | Completes an administrator-required password change using the restricted token. | Implemented and called by the forced-change screen. |
| `POST /teacher/auth/password/change-current` | Changes a signed-in Teacher's password. | Implemented and called by Change Password. |

All requests use the school-code header; protected password/logout calls use the access token. Backend middleware checks Teacher role and app audience. Teacher self-service OTP recovery is not present in the UI policy: the screen should direct the user to the school administrator, who can reset the account. Do not add Guardian OTP endpoints to Teacher.

## 2. Initial app data and roster — implemented

These authenticated reads are implemented under `/api/v1` and wired to login/session restore, Attendance/Result setup, and Update Result lookup. Requests use the school-code header and require the Teacher role and audience.

| Method and path | Why the current UI needs it | Minimum response/use | Status |
|---|---|---|---|
| `GET /teacher/bootstrap` | Supplies the signed-in Teacher profile, current-year assigned class sections, subjects, and academic year instead of mock setup/profile data. | Safe Teacher profile, section and subject IDs/names, active academic-year ID/label. No timetable or notices. | Implemented and loaded on login/session restore. |
| `GET /teacher/classes/{classSectionId}/students` | Attendance and result entry need the selected class roster. | Authorized active roster with student ID, compact `studentNumber`, display name, roll number, and signed profile photo URL where available. | Implemented and fetched before starting attendance/result entry. |
| `GET /teacher/students?studentNumber={studentNumber}` | Update Result needs exact student-number lookup without downloading a school-wide roster. | Exact normalized school-scoped student summary and authorized class-section identity; no Guardian/private contacts. | Implemented and wired to Update Result lookup. |

Roster and lookup access is limited to active class sections in the school's current academic year where the Teacher is class teacher or has an active, in-date subject assignment. If no current academic year is configured, bootstrap returns no sections; roster and lookup are not available.

The Home screen currently hides today's classes. No timetable endpoint is required for the current UI. School name, logo, and branding already come from shared/local configuration and assets, so they do not justify a Teacher API.

### Attendance

| Method and path | Why the current UI needs it | Minimum behavior |
|---|---|---|
| `POST /teacher/attendance-sessions` | Attendance Review currently records a completed attendance set only in local app state. | Save class-section, school-local date, and each roster student's final attendance status. Derive Teacher and school from the access token. Validate assignment, roster membership, and complete status coverage. Use the existing model's `clientSubmissionId` for safe retry. |

There is no current attendance-history or attendance-correction screen. Do not add history, detail, or correction endpoints unless those screens/product rules are introduced. A resumable attendance draft would also be separate work; current attendance is held locally until final submission.

### Results, resume, lookup, and update

| Method and path | Why the current UI needs it | Minimum behavior |
|---|---|---|
| `GET /teacher/assessments` | Previous Results and incomplete-result sessions currently filter local/demo records. | Return the authorized Teacher's assessment summaries, filterable by class-section, subject, and draft/completed status; include only fields shown in those lists. |
| `POST /teacher/assessments` | Result Setup currently creates a test entirely in memory. | Create an authorized assessment draft using class-section, subject, academic year, type/title, and date. A client submission ID should make retrying creation safe. |
| `GET /teacher/assessments/{assessmentId}` | Result entry/resume needs the assessment metadata, roster, and already saved student marks. | Return only the authorized assessment and its saved entries, or provide a paginated equivalent for large rosters. |
| `PUT /teacher/assessments/{assessmentId}/results/{studentId}` | Result Entry saves each student's marks locally; Update Result edits a selected student's entry locally. | Create or replace that student's entry, validate `0 <= obtainedMarks <= maxMarks` and `maxMarks > 0`, and authorize the Teacher/class/assessment relationship. Include revision handling if concurrent edits are allowed. |
| `POST /teacher/assessments/{assessmentId}/submit` | Result Review currently marks a complete set as submitted in local state. | Persist/finalize the draft after validating required entries. Define what “submit” means in the school workflow before promising publication or admin review; the current UI does not specify that lifecycle. |
| `GET /teacher/students/{studentId}/results?subjectId={subjectId}` | Student Results currently filters local results for one student and selected subject. | Return that student's authorized results, marks/max marks, assessment metadata, and answer-copy reference when one exists. |

Resume Result Entry only works across app restarts if the server stores per-student marks before the final review step. The server must determine completed entries and the first missing student from persisted records; a client-supplied “20 completed” count is not authoritative. The current resume fixture is demo-only and fabricates marks, so it is not evidence that resume persistence already exists.

The assessment and assessment-result database models already exist, including draft/published/archived states and score validation, but they do not provide routes or authorization by themselves.

### Answer-copy attachment and download

PDF generation and preview are currently local. The current result screen uses a local `file://` URI for download; that URI cannot be used by another device or a backend. If the production workflow must persist and download answer copies:

| Method and path | Why it is needed |
|---|---|
| `POST /teacher/files/upload-intents` | Obtain a private, short-lived upload target for the generated PDF. |
| `POST /teacher/files/{fileId}/complete` | Verify/finalize the upload and return its server file ID. |
| `GET /teacher/files/{fileId}/download` | Authorize and provide a safe download for the answer copy linked to an accessible result. |

The result-entry write must store the completed `fileId` and page count. Reuse the existing private file-storage implementation where possible, but add Teacher authorization; Guardian file routes cannot simply be called by the Teacher app. No client-facing delete endpoint is justified by current screens; orphan cleanup can be handled by retention policy.

### Profile edits — needed only if the existing edit screen remains self-service

`GET /teacher/bootstrap` can supply the profile used by My Profile. Because Edit Profile currently presents a save action, a production version that keeps this action needs:

| Method and path | Minimum behavior |
|---|---|
| `PATCH /teacher/me` | Persist only explicitly approved self-editable fields. Do not allow the Teacher to edit role, status, school, class assignments, or other administrator-managed fields. |

The current form includes phone, email, address, office hours, awards, and a photo picker, while the Teacher model's public self-profile fields do not match all of those fields. Confirm which fields Teachers may change before defining the request schema. If profile photos remain supported, use the same private upload-intent/completion flow and store a file ID, not the device path.

## 3. Push and notification APIs — distinguish delivery from the local inbox

The app already handles native notification permissions, display, taps, local test notifications, and local notification storage. Those behaviors do not require a backend endpoint. Remote delivery does require associating an FCM token with the signed-in Teacher:

| Method and path | Status/need |
|---|---|
| `PUT /teacher/devices/push-token` | Needed for remote push: upsert the current authenticated device token and platform. Derive user, school, role, and audience on the server. Call it after permission/token acquisition and after token refresh. |
| `DELETE /teacher/devices/push-token` | Needed to revoke the current device token on sign-out or explicit disable. Do not place the raw token in a URL. |

These are not implemented or wired; the current token helpers accept an injected interface, and there is no Teacher API implementation in the app.

The current in-app inbox is local and can remain so if local/push-delivered records are sufficient. Add server-backed notification list/read endpoints only if the product requires notifications to synchronize across devices or be retained independently of the app:

- `GET /teacher/notifications`
- `PATCH /teacher/notifications/{eventId}/read`
- `PATCH /teacher/notifications/read-all`

Those inbox endpoints are conditional, not prerequisites for native push delivery. Server-side notification generation and FCM sending are backend responsibilities, not additional endpoints the Teacher app calls.

## Not required by the current code

Do not include these in the initial Teacher API build based solely on the present screens:

- Separate `/teacher/me` GET or `/teacher/classes` list if the same data is in bootstrap.
- A timetable endpoint (today's classes were removed/hidden).
- School-profile or notices endpoints (the current content is bundled/shared).
- Attendance history, correction, or draft-sync endpoints (no current history/correction flow).
- Separate generic file deletion endpoint (no current Teacher delete workflow).
- Teacher OTP/password-reset endpoints (school-admin reset is the stated policy).
- Server PDF-generation endpoint (the app already generates the PDF locally).
- Notification inbox synchronization endpoints unless cross-device inbox sync is required.
- Guardian API reuse without explicit Teacher role/audience and ownership authorization.

## Implementation order based on current UI

1. **Already complete:** Teacher auth/session endpoints and their app calls.
2. **Implemented:** Teacher bootstrap and authorized class roster; exact student-number lookup.
3. **Persist current actions:** attendance submission; assessment create/read/list, per-student result save, finalize, and student result reads.
4. **Preserve answer copies across devices:** file upload/finalize/download, only if answer-copy attachment remains a production requirement.
5. **Optional conditional integrations:** profile edits, remote push-token registration/revocation, and server-synchronized notification inbox according to the product decisions above.

## Source areas checked

- Teacher screens: Home, Attendance Setup/Review, Result Setup/Entry/Review, Previous Results, Incomplete Result Sessions, Student Result Lookup/Results, Edit Profile, and Notifications.
- Teacher services/state: `teacherAuth.ts`, `teacherApiClient.ts`, `teacherApi.contract.ts`, `teacherService.ts`, `notificationService.ts`, `notificationApi.contract.ts`, `app-context.tsx`, `data/`, and PDF services.
- Backend routes: `src/routes/index.ts`, `src/features/auth/routes/auth.routes.ts`, and `src/features/guardian-portal/routes/guardian-portal.routes.ts`.
- Backend schemas/models: Teacher, attendance session, assessment, assessment result, refresh session, and Guardian file operations.
- Shared school configuration and the Parent API/auth conventions were used only to establish current request conventions; no Parent endpoint is assumed to authorize Teacher operations.
