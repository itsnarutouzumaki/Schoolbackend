const assert = require('node:assert/strict');
const express = require('express');
const test = require('node:test');
const { errorHandler } = require('../dist/middlewares/index.js');
const { requireTeacherMiddleware } = require('../dist/middlewares/require-teacher/index.js');

async function requestWithAuth(auth) {
  const app = express();
  app.use((_request, response, next) => {
    response.locals.auth = auth;
    next();
  });
  app.get('/teacher-only', requireTeacherMiddleware, (_request, response) => {
    response.sendStatus(204);
  });
  app.use(errorHandler);

  const server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  try {
    return await fetch(`http://127.0.0.1:${server.address().port}/teacher-only`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

test('Teacher-only auth requires both Teacher role and Teacher app audience', async () => {
  const accepted = await requestWithAuth({ role: 'teacher', appAudience: 'teacher' });
  assert.equal(accepted.status, 204);

  const guardian = await requestWithAuth({ role: 'guardian', appAudience: 'guardian' });
  assert.equal(guardian.status, 403);
  assert.equal((await guardian.json()).error.code, 'ROLE_FORBIDDEN');

  const wrongAudience = await requestWithAuth({ role: 'teacher', appAudience: 'guardian' });
  assert.equal(wrongAudience.status, 403);
  assert.equal((await wrongAudience.json()).error.code, 'ROLE_FORBIDDEN');
});
