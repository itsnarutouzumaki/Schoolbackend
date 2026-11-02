import type { OpenAPIV3 } from 'openapi-types';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Greenwood Shared School API',
    version: '1.0.0',
    description: [
      'Shared multi-school API for the Parent and Teacher applications.',
      'Health, tenant resolution, and authentication routes are active. Other feature routes are still under implementation.',
    ].join('\n\n'),
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Health', description: 'Process liveness and dependency readiness.' },
    { name: 'Authentication', description: 'School-scoped sign-in, session, and guardian recovery flows.' },
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
      LoginRequest: {
        type: 'object',
        additionalProperties: false,
        required: ['appAudience', 'phone', 'password'],
        properties: {
          appAudience: { type: 'string', enum: ['guardian', 'teacher', 'schoolAdmin'] },
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
    '/api/v1/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Sign in to a school account',
        operationId: 'login',
        parameters: [{ $ref: '#/components/parameters/SchoolCode' }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
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
    '/api/v1/auth/password/change': {
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
    '/api/v1/auth/refresh': {
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
    '/api/v1/auth/logout': {
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
    '/api/v1/auth/guardian-signups/verification-codes': {
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
    '/api/v1/auth/guardian-signups': {
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
    '/api/v1/auth/password-reset/requests': {
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
    '/api/v1/auth/password-reset/confirmations': {
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
  },
};
