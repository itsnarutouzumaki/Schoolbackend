const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const test = require('node:test');

process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-bytes';

const {
  ACCESS_TOKEN_TTL_SECONDS,
  JWT_AUDIENCE,
  JWT_ISSUER,
  REFRESH_SESSION_TTL_DAYS,
  createRefreshToken,
  guardianLoginSchema,
  hashPassword,
  issueAccessToken,
  loginSchema,
  logoutSchema,
  verifyAccessToken,
  verifyPassword,
} = require('../dist/features/auth/index.js');
const jwt = require('jsonwebtoken');

const claims = {
  sub: '65f100000000000000000001',
  schoolId: '65f100000000000000000002',
  role: 'guardian',
  appAudience: 'guardian',
  sessionId: '65f100000000000000000003',
  authVersion: 4,
  tokenUse: 'access',
};

test('passwords are hashed with bcrypt and verified without truncation', async () => {
  const password = 'correct horse battery staple';
  const passwordHash = await hashPassword(password);

  assert.match(passwordHash, /^\$2[aby]\$12\$/);
  assert.equal(await verifyPassword(password, passwordHash), true);
  assert.equal(await verifyPassword('incorrect password', passwordHash), false);
  await assert.rejects(hashPassword('é'.repeat(37)), RangeError);
  assert.equal(await verifyPassword('é'.repeat(37), passwordHash), false);
});

test('access JWTs are signed, constrained to HS256, and expire after 15 minutes', () => {
  const token = issueAccessToken(claims);
  const verified = verifyAccessToken(token);
  const decoded = jwt.decode(token, { complete: true });

  assert.equal(verified.sub, claims.sub);
  assert.equal(verified.schoolId, claims.schoolId);
  assert.equal(verified.role, claims.role);
  assert.equal(verified.appAudience, claims.appAudience);
  assert.equal(verified.iss, JWT_ISSUER);
  assert.equal(verified.aud, JWT_AUDIENCE);
  assert.equal(verified.exp - verified.iat, ACCESS_TOKEN_TTL_SECONDS);
  assert.equal(ACCESS_TOKEN_TTL_SECONDS, 15 * 60);
  assert.equal(decoded.header.alg, 'HS256');
  assert.throws(() => issueAccessToken({ ...claims, appAudience: 'teacher' }), TypeError);
});

test('access JWT verification rejects expired credentials', () => {
  const expiredToken = jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: -1,
    issuer: JWT_ISSUER,
  });

  assert.throws(() => verifyAccessToken(expiredToken), error => error.name === 'TokenExpiredError');
});

test('access JWT verification rejects altered signatures, algorithms, issuers, and audiences', () => {
  const validToken = issueAccessToken(claims);
  const [header, payload, signature] = validToken.split('.');
  const changedSignature = `${signature[0] === 'a' ? 'b' : 'a'}${signature.slice(1)}`;
  const alteredToken = `${header}.${payload}.${changedSignature}`;
  const wrongAlgorithm = jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS384',
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });
  const wrongIssuer = jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: 'other-api',
  });
  const wrongAudience = jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: 'other-client',
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });
  const invalidClaims = jwt.sign({ ...claims, appAudience: 'teacher' }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    audience: JWT_AUDIENCE,
    expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    issuer: JWT_ISSUER,
  });

  assert.throws(() => verifyAccessToken(alteredToken));
  assert.throws(() => verifyAccessToken(wrongAlgorithm));
  assert.throws(() => verifyAccessToken(wrongIssuer));
  assert.throws(() => verifyAccessToken(wrongAudience));
  assert.throws(() => verifyAccessToken(invalidClaims));
});

test('refresh credentials are opaque, stored as a hash, and expire in 30 days', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');
  const refresh = createRefreshToken(now);
  const expectedExpiry = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  assert.equal(REFRESH_SESSION_TTL_DAYS, 30);
  assert.equal(refresh.token.length, 43);
  assert.match(refresh.tokenHash, /^[a-f0-9]{64}$/);
  assert.notEqual(refresh.token, refresh.tokenHash);
  assert.equal(refresh.tokenHash, createHash('sha256').update(refresh.token).digest('hex'));
  assert.equal(refresh.expiresAt.toISOString(), expectedExpiry.toISOString());
});

test('auth request schemas enforce bcrypt byte limits and apply logout defaults', () => {
  const guardianCredentials = {
    phone: '+919876543210',
    password: 'valid-password',
  };
  assert.equal(guardianLoginSchema.safeParse(guardianCredentials).success, true);
  assert.equal(
    guardianLoginSchema.safeParse({ ...guardianCredentials, appAudience: 'teacher' }).success,
    false,
  );

  const validLogin = {
    appAudience: 'guardian',
    phone: '+919876543210',
    password: 'valid-password',
  };
  assert.equal(loginSchema.safeParse(validLogin).success, true);
  assert.equal(
    loginSchema.safeParse({ ...validLogin, password: 'é'.repeat(37) }).success,
    false,
  );
  assert.deepEqual(logoutSchema.parse({}), { allDevices: false });
});
