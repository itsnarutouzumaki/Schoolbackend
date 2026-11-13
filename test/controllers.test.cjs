const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const { controllerHandler, sendSuccess } = require('../dist/shared/http/index.js');
const { ApiError } = require('../dist/shared/errors/index.js');
const { errorHandler } = require('../dist/middlewares/index.js');
const { SchoolModel } = require('../dist/features/index.js');

let server;
let baseUrl;

test.before(async () => {
  const controllerApp = express();
  controllerApp.use(express.json());
  controllerApp.use((_request, response, next) => {
    response.locals.requestId = 'controller-test-request';
    next();
  });
  controllerApp.post('/echo', controllerHandler(async (request, response) => {
    sendSuccess(response, { acceptedName: request.body.name }, 201);
  }));
  controllerApp.post('/failure', controllerHandler(async () => {
    throw new ApiError(422, 'INPUT_REJECTED', 'The submitted data is not acceptable.');
  }));
  controllerApp.post('/model-validation', controllerHandler(async () => {
    await new SchoolModel({
      code: 'TEST',
      fileRetentionDays: 'not-a-number',
    }).validate();
  }));
  controllerApp.use(errorHandler);

  server = controllerApp.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
});

test('controller success helper returns the typed data envelope and status', async () => {
  const response = await fetch(`${baseUrl}/echo`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Teacher' }),
  });

  assert.equal(response.status, 201);
  assert.deepEqual(await response.json(), { data: { acceptedName: 'Teacher' } });
});

test('rejected async controller work reaches centralized error handling', async () => {
  const response = await fetch(`${baseUrl}/failure`, { method: 'POST' });
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.deepEqual(body, {
    error: {
      code: 'INPUT_REJECTED',
      message: 'The submitted data is not acceptable.',
      requestId: 'controller-test-request',
      retryable: false,
    },
  });
});

test('model validation failures return their field-specific message', async () => {
  const response = await fetch(`${baseUrl}/model-validation`, {
    method: 'POST',
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.error.code, 'MODEL_VALIDATION_FAILED');
  assert.match(body.error.message, /Name is required\./);
  assert.match(body.error.message, /The fileRetentionDays field has an invalid value\./);
  assert.equal(body.error.requestId, 'controller-test-request');
});
