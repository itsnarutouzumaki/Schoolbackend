import type { OpenAPIV3 } from 'openapi-types';

export const openApiDocument: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'Greenwood Shared School API',
    version: '1.0.0',
    description: [
      'Initial backend scaffold for the Parent and Teacher mobile applications.',
      'Only the health endpoints in this document are implemented. The multi-tenant business API is planned in backend-plan.md and will be added incrementally.',
    ].join('\n\n'),
  },
  servers: [{ url: '/' }],
  tags: [{ name: 'Health', description: 'Process liveness and dependency readiness.' }],
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
  },
};
