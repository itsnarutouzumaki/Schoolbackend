import type { OpenAPIV3 } from 'openapi-types';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'School Management API',
    version: '1.0.0',
    description: [
      'Shared multi-school API for the Parent and Teacher applications.',
      'Health, tenant resolution, Guardian APIs, Teacher authentication/data reads, and private Google Cloud Storage flows are active.',
    ].join('\n\n'),
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health', description: 'Process liveness and dependency readiness.' },
    { name: 'Authentication', description: 'School-scoped Guardian and Teacher sign-in and session flows.' },
    { name: 'Guardian data', description: 'Authenticated guardian profile, child records, and request histories.' },
    { name: 'Teacher data', description: 'Authenticated Teacher bootstrap, assigned class rosters, and student lookup.' },
  ],
  components: {
    parameters: {
      SchoolCode: {
        name: 'X-School-Code',
        in: 'header',
        required: true,
        description: 'Tenant selector; it is not an authorization credential.',
        schema: { type: 'string', pattern: '^[A-Z0-9][A-Z0-9-]{1,63}$' },
      },
    },
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message', 'requestId', 'retryable'],
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              requestId: { type: 'string' },
              retryable: { type: 'boolean' },
            },
          },
        },
      },
      GuardianLoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['phone', 'password'],
        properties: {
          phone: { type: 'string', example: '+919876543210' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      RefreshRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', minLength: 32, maxLength: 128 } },
      },
      SignupCodeRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['phone'],
        properties: { phone: { type: 'string', example: '+919876543210' } },
      },
      GuardianSignupRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['fullName', 'phone', 'password', 'challengeId', 'verificationCode'],
        properties: {
          fullName: { type: 'string', minLength: 1, maxLength: 120 },
          phone: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8, maxLength: 72 },
          challengeId: { type: 'string', format: 'uuid' },
          verificationCode: { type: 'string', pattern: '^\\d{6}$' },
        },
      },
      PasswordResetRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['appAudience', 'phone'],
        properties: {
          appAudience: { type: 'string', enum: ['guardian'] },
          phone: { type: 'string' },
        },
      },
      PasswordResetConfirmation: {
        type: 'object',
        additionalProperties: false,
        required: ['challengeId', 'verificationCode', 'newPassword'],
        properties: {
          challengeId: { type: 'string', format: 'uuid' },
          verificationCode: { type: 'string', pattern: '^\\d{6}$' },
          newPassword: { type: 'string', minLength: 8, maxLength: 72 },
        },
      },
      TeacherBootstrap: {
        type: 'object',
        required: ['teacher', 'academicYear', 'classSections'],
        properties: {
          teacher: {
            type: 'object',
            description: 'Teacher profile, editable address and awards, and read-only login contact values.',
            required: ['id', 'displayName', 'subjects', 'qualifications', 'languages', 'phone', 'email', 'address', 'awards'],
            properties: {
              id: { type: 'string' },
              displayName: { type: 'string' },
              designation: { type: 'string' },
              subjects: { type: 'array', items: { type: 'string' } },
              qualifications: { type: 'array', items: { type: 'string' } },
              experienceYears: { type: 'number' },
              specialization: { type: 'string' },
              biography: { type: 'string' },
              languages: { type: 'array', items: { type: 'string' } },
              photoUrl: { type: 'string', format: 'uri' },
              phone: { type: 'string' },
              email: { type: 'string' },
              address: { type: 'string' },
              awards: { type: 'array', items: { type: 'string' } },
            },
          },
          academicYear: {
            type: 'object',
            nullable: true,
            required: ['id', 'label'],
            properties: { id: { type: 'string' }, label: { type: 'string' } },
          },
          classSections: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'academicYearId', 'className', 'section', 'subjects'],
              properties: {
                id: { type: 'string' },
                academicYearId: { type: 'string' },
                className: { type: 'string' },
                section: { type: 'string' },
                subjects: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['id', 'name'],
                    properties: { id: { type: 'string' }, name: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
      TeacherStudent: {
        type: 'object',
        required: ['id', 'studentNumber', 'fullName'],
        properties: {
          id: { type: 'string' },
          studentNumber: { type: 'string', description: 'Compact display form of the canonical school student number.' },
          fullName: { type: 'string' },
          rollNumber: { type: 'string' },
          photoUrl: { type: 'string', format: 'uri' },
          classSection: {
            type: 'object',
            required: ['id', 'className', 'section'],
            properties: {
              id: { type: 'string' },
              className: { type: 'string' },
              section: { type: 'string' },
            },
          },
        },
      },
    },
  },
  paths: {
    '/health/live': {
      get: {
        tags: ['Health'],
        summary: 'Check API process liveness',
        description: 'Returns success when the API process is running. Does not depend on MongoDB.',
        operationId: 'getHealthLive',
        responses: {
          '200': {
            description: 'The API process is alive.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status'],
                  properties: { status: { type: 'string', enum: ['live'] } },
                },
                example: { status: 'live' },
              },
            },
          },
        },
      },
    },
    '/health/ready': {
      get: {
        tags: ['Health'],
        summary: 'Check API dependency readiness',
        description: 'Returns 200 only when required dependencies, currently MongoDB, are available.',
        operationId: 'getHealthReady',
        responses: {
          '200': {
            description: 'The API and required dependencies are ready.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'dependencies'],
                  properties: {
                    status: { type: 'string', enum: ['ready'] },
                    dependencies: {
                      type: 'object',
                      required: ['mongodb'],
                      properties: { mongodb: { type: 'string', enum: ['connected'] } },
                    },
                  },
                },
                example: { status: 'ready', dependencies: { mongodb: 'connected' } },
              },
            },
          },
          '503': {
            description: 'A required dependency is unavailable or not configured.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['status', 'dependencies'],
                  properties: {
                    status: { type: 'string', enum: ['not-ready'] },
                    dependencies: {
                      type: 'object',
                      required: ['mongodb'],
                      properties: { mongodb: { type: 'string', enum: ['unavailable'] } },
                    },
                  },
                },
                example: { status: 'not-ready', dependencies: { mongodb: 'unavailable' } },
              },
            },
          },
        },
      },
    },
    '/api/v1/teacher/bootstrap': {
      get: {
        tags: ['Teacher data'],
        summary: 'Load the authenticated Teacher profile and assigned current-year class sections',
        operationId: 'getTeacherBootstrap',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Teacher profile, active academic year, and current assignments.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: { data: { $ref: '#/components/schemas/TeacherBootstrap' } },
                },
              },
            },
          },
          '401': { description: 'Authentication is required.' },
          '403': { description: 'A valid active Teacher profile is required.' },
        },
      },
    },
    '/api/v1/teacher/me': {
      patch: {
        tags: ['Teacher data'],
        summary: 'Update explicitly self-editable Teacher profile fields',
        operationId: 'updateTeacherProfile',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                minProperties: 1,
                properties: {
                  fullName: { type: 'string', minLength: 1, maxLength: 120 },
                  address: { type: 'string', maxLength: 500 },
                  awards: {
                    type: 'array',
                    maxItems: 20,
                    items: { type: 'string', minLength: 1, maxLength: 150 },
                  },
                  profilePhotoFileId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'The approved Teacher profile fields were saved.' },
          '400': { description: 'The request contains unsupported or invalid fields.' },
          '403': { description: 'An active Teacher profile is required.' },
        },
      },
    },
    '/api/v1/teacher/profile-photo/upload-intents': {
      post: {
        tags: ['Teacher data'],
        summary: 'Create a private upload intent for the authenticated Teacher profile photo',
        operationId: 'createTeacherProfilePhotoUploadIntent',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['fileName', 'contentType', 'sizeBytes'],
                properties: {
                  fileName: { type: 'string', minLength: 1, maxLength: 255 },
                  contentType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
                  sizeBytes: { type: 'integer', minimum: 1, maximum: 5242880 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'A short-lived private upload policy and pending file ID.' },
          '400': { description: 'The profile photo type or size is not allowed.' },
        },
      },
    },
    '/api/v1/teacher/profile-photo/{fileId}/complete': {
      post: {
        tags: ['Teacher data'],
        summary: 'Verify and complete the authenticated Teacher profile photo upload',
        operationId: 'completeTeacherProfilePhotoUpload',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'The private profile photo upload is verified and ready to be linked.' },
          '404': { description: 'The pending Teacher-owned upload was not found.' },
        },
      },
    },
    '/api/v1/teacher/classes/{classSectionId}/students': {
      get: {
        tags: ['Teacher data'],
        summary: 'List active students in an assigned class section',
        operationId: 'getTeacherClassStudents',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          {
            name: 'classSectionId',
            in: 'path',
            required: true,
            schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Authorized class section and its active student roster.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: {
                    data: {
                      type: 'object',
                      required: ['classSection', 'students'],
                      properties: {
                        classSection: {
                          type: 'object',
                          required: ['id', 'className', 'section'],
                          properties: {
                            id: { type: 'string' },
                            className: { type: 'string' },
                            section: { type: 'string' },
                          },
                        },
                        students: { type: 'array', items: { $ref: '#/components/schemas/TeacherStudent' } },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Authentication is required.' },
          '403': { description: 'This endpoint is available to Teacher accounts only.' },
          '404': { description: 'The class section is unavailable to this Teacher.' },
        },
      },
    },
    '/api/v1/teacher/students': {
      get: {
        tags: ['Teacher data'],
        summary: 'Find one student by student number within the Teacher assignment scope',
        operationId: 'findTeacherStudent',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          {
            name: 'studentNumber',
            in: 'query',
            required: true,
            schema: { type: 'string', minLength: 1, maxLength: 7 },
            description: 'Canonical or compact student number; exact match only.',
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Student summary and assigned class-section identity.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['data'],
                  properties: { data: { $ref: '#/components/schemas/TeacherStudent' } },
                },
              },
            },
          },
          '400': { description: 'The student number is invalid.' },
          '401': { description: 'Authentication is required.' },
          '403': { description: 'This endpoint is available to Teacher accounts only.' },
          '404': { description: 'The student was not found or is outside the Teacher assignment scope.' },
        },
      },
    },
    '/api/v1/teacher/concerns': {
      post: {
        tags: ['Teacher data'],
        summary: 'Send a concern to School Administration or a student’s guardians',
        operationId: 'sendTeacherConcern',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['recipient', 'subject', 'description'],
                properties: {
                  recipient: { type: 'string', enum: ['schoolAdmin', 'guardian'] },
                  studentNumber: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 7,
                    description: 'Required only when recipient is guardian.',
                  },
                  subject: { type: 'string', minLength: 1, maxLength: 160 },
                  description: { type: 'string', minLength: 1, maxLength: 1000 },
                  attachmentFileId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'The notification was sent to the active recipient account(s).' },
          '400': { description: 'The request is invalid or the attachment is unavailable.' },
          '404': { description: 'The student, guardians or School Administration could not be found.' },
        },
      },
    },
    '/api/v1/teacher/concern-files/upload-intents': {
      post: {
        tags: ['Teacher data'],
        summary: 'Create a private upload policy for a teacher concern attachment',
        operationId: 'createTeacherConcernUploadIntent',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['fileName', 'contentType', 'sizeBytes'],
                properties: {
                  fileName: { type: 'string', minLength: 1, maxLength: 255 },
                  contentType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
                  sizeBytes: { type: 'integer', minimum: 1, maximum: 1048576 },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'A short-lived upload policy and pending file ID.' },
          '400': { description: 'The attachment type or size is not allowed.' },
        },
      },
    },
    '/api/v1/teacher/concern-files/{fileId}/complete': {
      post: {
        tags: ['Teacher data'],
        summary: 'Verify and complete a teacher concern attachment upload',
        operationId: 'completeTeacherConcernUpload',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'The attachment is verified and ready to be sent.' },
          '404': { description: 'The pending teacher-owned upload was not found.' },
        },
      },
    },
    '/api/v1/teacher/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in to a Teacher account',
        operationId: 'teacherLogin',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GuardianLoginRequest' } } },
        },
        responses: {
          '200': { description: 'Teacher session issued, or a required temporary-password change was issued.' },
          '401': { description: 'The credentials are invalid.' },
          '429': { description: 'Too many login attempts.' },
        },
      },
    },
    '/api/v1/teacher/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate a Teacher refresh token',
        operationId: 'refreshTeacherSession',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
        },
        responses: {
          '200': { description: 'Teacher refresh token rotated successfully.' },
          '401': { description: 'The refresh token is invalid, expired, or belongs to another app audience.' },
        },
      },
    },
    '/api/v1/teacher/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke the current Teacher session',
        operationId: 'logoutTeacher',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: { allDevices: { type: 'boolean', default: false } },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Teacher session revoked.' },
          '401': { description: 'Authentication is required.' },
          '403': { description: 'This endpoint is available to Teacher accounts only.' },
        },
      },
    },
    '/api/v1/teacher/auth/password/change': {
      post: {
        tags: ['Authentication'],
        summary: 'Complete an administrator-required Teacher password change',
        operationId: 'changeRequiredTeacherPassword',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['newPassword'],
                properties: { newPassword: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true } },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Password changed; sign in again for normal access.' },
          '400': { description: 'The new password is invalid.' },
          '401': { description: 'The password-change token is invalid or expired.' },
        },
      },
    },
    '/api/v1/teacher/auth/password/change-current': {
      post: {
        tags: ['Authentication'],
        summary: 'Change the authenticated Teacher password',
        operationId: 'changeTeacherPassword',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['currentPassword', 'newPassword'],
                properties: {
                  currentPassword: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true },
                  newPassword: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true },
                },
              },
              },
          },
        },
        responses: {
          '204': { description: 'Password changed and existing sessions revoked.' },
          '401': { description: 'The current password is invalid or the session has expired.' },
          '403': { description: 'This endpoint is available to Teacher accounts only.' },
        },
      },
    },
    '/api/v1/guardian/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in to a guardian account',
        operationId: 'guardianLogin',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GuardianLoginRequest' } } },
        },
        responses: {
          '200': {
            description: 'Signed in or a required temporary-password change was issued.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    data: {
                      type: 'object',
                      required: ['accessToken', 'expiresIn', 'passwordChangeRequired'],
                      properties: {
                        accessToken: { type: 'string' },
                        refreshToken: { type: 'string' },
                        expiresIn: { type: 'integer', example: 900 },
                        refreshExpiresAt: { type: 'string', format: 'date-time' },
                        account: { type: 'object', additionalProperties: true },
                        passwordChangeRequired: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Invalid credentials.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': { description: 'Too many login attempts.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/password/change': {
      post: {
        tags: ['Authentication'],
        summary: 'Complete a required password change',
        operationId: 'changeRequiredPassword',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['newPassword'],
                properties: { newPassword: { type: 'string', minLength: 8, maxLength: 72 } },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Password changed; sign in again for normal access.' },
          '400': { description: 'Invalid request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Invalid or expired password-change token.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/password/change-current': {
        post: {
          tags: ['Authentication'],
          summary: 'Change the authenticated guardian password',
          operationId: 'changeGuardianPassword',
          parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['currentPassword', 'newPassword'],
                  properties: {
                    currentPassword: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true },
                    newPassword: { type: 'string', minLength: 8, maxLength: 72, writeOnly: true },
                  },
                },
              },
            },
          },
          responses: {
            '204': { description: 'Password changed and all existing sessions revoked.' },
            '401': { description: 'Current password is invalid.' },
          },
        },
    },
    '/api/v1/guardian/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotate the refresh token and issue an access token',
        operationId: 'refreshSession',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshRequest' } } },
        },
        responses: {
          '200': { description: 'Refresh credential rotated successfully.' },
          '400': { description: 'Invalid request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '401': { description: 'Refresh credential invalid, revoked, or expired.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Revoke the current or all account sessions',
        operationId: 'logout',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                properties: { allDevices: { type: 'boolean', default: false } },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Session revoked.' },
          '401': { description: 'Authentication required.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/signup/verification-codes': {
      post: {
        tags: ['Authentication'],
        summary: 'Request a guardian signup verification code',
        operationId: 'requestGuardianSignupCode',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/SignupCodeRequest' } } },
        },
        responses: {
          '202': { description: 'Verification request accepted.' },
          '400': { description: 'Invalid request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': { description: 'Too many verification requests.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'SMS delivery is not configured or available.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/signup': {
      post: {
        tags: ['Authentication'],
        summary: 'Create a guardian account using a verified phone',
        operationId: 'registerGuardian',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/GuardianSignupRequest' } } },
        },
        responses: {
          '201': { description: 'Guardian account created.' },
          '400': { description: 'Invalid or expired verification code.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '409': { description: 'Account already exists for this phone number.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/password-reset/requests': {
      post: {
        tags: ['Authentication'],
        summary: 'Request guardian password recovery',
        operationId: 'requestGuardianPasswordReset',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetRequest' } } },
        },
        responses: {
          '202': { description: 'Generic response to avoid account enumeration.' },
          '400': { description: 'Invalid request.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '429': { description: 'Too many recovery requests.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '503': { description: 'Authentication security configuration is unavailable.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/auth/password-reset/confirmations': {
      post: {
        tags: ['Authentication'],
        summary: 'Confirm guardian password recovery',
        operationId: 'confirmGuardianPasswordReset',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/PasswordResetConfirmation' } } },
        },
        responses: {
          '204': { description: 'Password changed and other sessions revoked.' },
          '400': { description: 'Invalid or expired recovery code.', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/v1/guardian/bootstrap': {
      get: {
        tags: ['Guardian data'],
        summary: 'Load the authenticated guardian app snapshot',
        operationId: 'getGuardianBootstrap',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Guardian profile, linked-child records, request histories, and short-lived private profile-photo URLs.' },
          '401': { description: 'Authentication is required.' },
          '403': { description: 'This endpoint is available only to guardian accounts.' },
        },
      },
    },
    '/api/v1/guardian/me': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get the authenticated guardian profile',
        operationId: 'getGuardianProfile',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian profile.' } },
      },
      patch: {
        tags: ['Guardian data'],
        summary: 'Update the guardian name, address, or uploaded profile photo',
        operationId: 'updateGuardianProfile',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['fullName'],
                properties: {
                  fullName: { type: 'string', minLength: 1, maxLength: 120 },
                  address: { type: 'string', maxLength: 500 },
                  profilePhotoFileId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'The profile was updated.' },
          '400': { description: 'Invalid profile data.' },
          '401': { description: 'Authentication is required.' },
        },
      },
    },
    '/api/v1/guardian/me/children': {
      get: {
        tags: ['Guardian data'],
        summary: 'List approved linked children',
        operationId: 'getGuardianChildren',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian’s approved linked children and associated records.' } },
      },
    },
    '/api/v1/guardian/child-link-requests': {
      get: {
        tags: ['Guardian data'],
        summary: 'List the guardian’s child-link requests',
        operationId: 'getGuardianChildLinkRequests',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian’s child-link request history.' } },
      },
      post: {
        tags: ['Guardian data'],
        summary: 'Request school approval to link a student',
        operationId: 'createGuardianChildLinkRequest',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['studentNumber'],
                properties: {
                  studentNumber: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 7,
                    pattern: '^[A-Za-z]{0,5}[0-9]{1,2}$',
                    description: 'Accepts a short number such as A1 or 1; the backend normalizes it.',
                  },
                  studentName: { type: 'string', minLength: 1, maxLength: 120 },
                  relationship: { type: 'string', minLength: 1, maxLength: 80, default: 'Parent' },
                },
              },
            },
          },
        },
        responses: {
          '202': { description: 'The link request is pending school review.' },
          '409': { description: 'A matching request is already pending.' },
        },
      },
    },
    '/api/v1/guardian/leave-requests': {
      get: {
        tags: ['Guardian data'],
        summary: 'List the guardian’s leave requests',
        operationId: 'getGuardianLeaveRequests',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian’s leave-request history.' } },
      },
      post: {
        tags: ['Guardian data'],
        summary: 'Submit a leave request for an approved linked child',
        operationId: 'createGuardianLeaveRequest',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['childId', 'startsOn', 'endsOn', 'reason', 'password'],
                properties: {
                  childId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                  startsOn: { type: 'string', format: 'date' },
                  endsOn: { type: 'string', format: 'date' },
                  reason: { type: 'string', minLength: 1, maxLength: 300 },
                  password: { type: 'string', minLength: 1, maxLength: 72, writeOnly: true },
                  fileIds: { type: 'array', maxItems: 1, items: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'The request is pending school review.' },
          '401': { description: 'The account password is invalid.' },
          '404': { description: 'The child is not linked to this guardian.' },
        },
      },
    },
    '/api/v1/guardian/complaints': {
      get: {
        tags: ['Guardian data'],
        summary: 'List the guardian’s complaints',
        operationId: 'getGuardianComplaints',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian’s complaint history.' } },
      },
      post: {
        tags: ['Guardian data'],
        summary: 'Send a concern notification to an active school recipient',
        operationId: 'sendGuardianConcern',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['recipientUserId', 'recipientRole', 'studentScope', 'subject', 'description'],
                properties: {
                  recipientUserId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                  recipientRole: { type: 'string', enum: ['teacher', 'schoolAdmin'] },
                  studentScope: {
                    oneOf: [
                      { type: 'string', enum: ['all'] },
                      { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                    ],
                    description: 'The literal "all" or the ID of one approved linked child.',
                  },
                  subject: { type: 'string', minLength: 1, maxLength: 160 },
                  description: { type: 'string', minLength: 1, maxLength: 1000 },
                  attachmentFileId: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'A notification was sent to the selected recipient. No complaint record is created.' },
          '404': { description: 'The recipient or linked child is not available.' },
        },
      },
    },
    '/api/v1/guardian/notifications': {
      get: {
        tags: ['Guardian data'],
        summary: 'List notifications for the authenticated guardian',
        operationId: 'getGuardianNotifications',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The guardian’s notification history.' } },
      },
    },
    '/api/v1/guardian/notifications/read-all': {
      patch: {
        tags: ['Guardian data'],
        summary: 'Mark all guardian notifications as read',
        operationId: 'markAllGuardianNotificationsRead',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The number of updated notifications.' } },
      },
    },
    '/api/v1/guardian/notifications/{eventId}/read': {
      patch: {
        tags: ['Guardian data'],
        summary: 'Mark one guardian notification as read',
        operationId: 'markGuardianNotificationRead',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The notification was marked read.' } },
      },
    },
    '/api/v1/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List notifications for the authenticated Parent or Teacher',
        operationId: 'getNotifications',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Notification summaries, newest first.' } },
      },
    },
    '/api/v1/notifications/read-all': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark all notifications for the authenticated user as read',
        operationId: 'markAllNotificationsRead',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The number of updated notifications.' } },
      },
    },
    '/api/v1/notifications/devices': {
      post: {
        tags: ['Notifications'],
        summary: 'Register or refresh an FCM device token for the authenticated app audience',
        operationId: 'registerNotificationDevice',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['token', 'platform'],
                properties: {
                  token: { type: 'string', minLength: 1, maxLength: 4096 },
                  platform: { type: 'string', enum: ['android', 'ios'] },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'The device token is encrypted and registered.' } },
      },
      delete: {
        tags: ['Notifications'],
        summary: 'Revoke an FCM device token for the authenticated user',
        operationId: 'unregisterNotificationDevice',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['token'],
                properties: { token: { type: 'string', minLength: 1, maxLength: 4096 } },
              },
            },
          },
        },
        responses: { '200': { description: 'The device token is revoked.' } },
      },
    },
    '/api/v1/notifications/{eventId}': {
      get: {
        tags: ['Notifications'],
        summary: 'Get notification details for the authenticated recipient',
        operationId: 'getNotificationDetails',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', maxLength: 160 } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Sender, subject, complete description, and optional attachment metadata.' } },
      },
    },
    '/api/v1/notifications/{eventId}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark one notification as read for the authenticated recipient',
        operationId: 'markNotificationRead',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', maxLength: 160 } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'The notification read timestamp.' } },
      },
    },
    '/api/v1/notifications/{eventId}/attachment': {
      get: {
        tags: ['Notifications'],
        summary: 'Create a short-lived signed URL for this notification attachment',
        operationId: 'getNotificationAttachment',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'eventId', in: 'path', required: true, schema: { type: 'string', maxLength: 160 } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'A short-lived private GCS download URL.' } },
      },
    },
    '/api/v1/guardian/files/upload-intents': {
      post: {
        tags: ['Guardian data'],
        summary: 'Create a short-lived private GCS upload policy',
        operationId: 'createGuardianFileUploadIntent',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['purpose', 'fileName', 'contentType', 'sizeBytes'],
                properties: {
                  purpose: { type: 'string', enum: ['profile-photo', 'complaint-attachment', 'leave-attachment'] },
                  fileName: { type: 'string', minLength: 1, maxLength: 255 },
                  contentType: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] },
                  sizeBytes: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10485760,
                    description: 'Maximum 1 MB for complaint-attachment; maximum 10 MB for leave-attachment.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'A signed POST policy, required fields, and pending file ID.' },
          '503': { description: 'Google Cloud Storage is not configured.' },
        },
      },
    },
    '/api/v1/guardian/files/{fileId}/complete': {
      post: {
        tags: ['Guardian data'],
        summary: 'Verify and finalize a private GCS upload',
        operationId: 'completeGuardianFileUpload',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'The upload was verified and is ready.' },
          '400': { description: 'Uploaded object details or content do not match.' },
          '409': { description: 'The upload has not reached storage yet.' },
        },
      },
    },
    '/api/v1/guardian/files/{fileId}/download': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get a short-lived authorized GCS download URL',
        operationId: 'getGuardianFileDownloadUrl',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'fileId', in: 'path', required: true, schema: { type: 'string', pattern: '^[a-fA-F0-9]{24}$' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'A short-lived URL for an owned or linked-child file.' },
          '404': { description: 'The file is unavailable to this guardian.' },
        },
      },
    },
    '/api/v1/guardian/children/{childId}/attendance': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get attendance records for a linked child',
        operationId: 'getGuardianChildAttendance',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'childId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Attendance records for the linked child.' } },
      },
    },
    '/api/v1/guardian/children/{childId}/results': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get published results for a linked child',
        operationId: 'getGuardianChildResults',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'childId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Published assessments and marks for the linked child.' } },
      },
    },
    '/api/v1/guardian/children/{childId}/fees': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get fee receipts for a linked child',
        operationId: 'getGuardianChildFees',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'childId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Fee receipts for the linked child.' } },
      },
    },
    '/api/v1/guardian/children/{childId}/teachers': {
      get: {
        tags: ['Guardian data'],
        summary: 'Get public teacher details for a linked child',
        operationId: 'getGuardianChildTeachers',
        parameters: [
          { $ref: '#/components/parameters/SchoolCode' },
          { name: 'childId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Public teacher profiles for the linked child.' } },
      },
    },
  },
};
