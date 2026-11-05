const assert = require('node:assert/strict');
const test = require('node:test');
const mongoose = require('mongoose');
const models = require('../dist/features/index.js');

const modelExports = Object.entries(models)
  .filter(([name]) => name.endsWith('Model'));

test('all planned MongoDB models are registered and exported', () => {
  assert.equal(modelExports.length, 29);
  assert.equal(new Set(modelExports.map(([, model]) => model.collection.name)).size, 29);
});

test('tenant-owned models require an internal school ID', () => {
  const globalModels = new Set(['AuditEventModel', 'BlockedSchoolModel', 'SchoolModel']);

  for (const [name, model] of modelExports) {
    if (!globalModels.has(name)) {
      assert.equal(model.schema.path('schoolId').isRequired, true, `${name} must require schoolId`);
    }
  }
});

test('credentials and sensitive profile/storage fields are excluded by default', () => {
  assert.equal(models.UserModel.schema.path('passwordHash').options.select, false);
  assert.equal(models.AuthChallengeModel.schema.path('codeHash').options.select, false);
  assert.equal(models.DeviceTokenModel.schema.path('encryptedToken').options.select, false);
  assert.equal(models.FileRecordModel.schema.path('storageRef').options.select, false);
  assert.equal(models.StudentModel.schema.path('sensitiveSupport').options.select, false);
  assert.equal(models.TeacherModel.schema.path('privateContact').options.select, false);
  assert.deepEqual(
    models.RefreshSessionModel.schema.path('appAudience').enumValues,
    ['guardian', 'teacher', 'schoolAdmin'],
  );
  assert.equal(models.RefreshSessionModel.schema.path('authVersion').isRequired, true);
});

test('school file retention defaults to 30 whole days and supports school overrides', async () => {
  const school = new models.SchoolModel({
    code: 'GREENWOOD-TEST',
    name: 'Greenwood Test School',
  });

  assert.equal(school.fileRetentionDays, 30);
  school.fileRetentionDays = 45;
  await school.validate();
  assert.equal(school.fileRetentionDays, 45);

  school.fileRetentionDays = 1.5;
  await assert.rejects(school.validate(), error => (
    error.name === 'ValidationError'
    && Boolean(error.errors.fileRetentionDays)
  ));
});

test('GCS file records require an integer retention duration', async () => {
  const file = new models.FileRecordModel({
    schoolId: new mongoose.Types.ObjectId(),
    fileCode: 'test-file',
    ownerUserId: new mongoose.Types.ObjectId(),
    purpose: 'answer-copy',
    storageProvider: 'gcs',
    storageRef: 'test/object',
    originalFileName: 'answer.pdf',
    contentType: 'application/pdf',
    sizeBytes: 100,
    retentionDays: 30,
  });

  await file.validate();
  file.retentionDays = 2.5;
  await assert.rejects(file.validate(), error => (
    error.name === 'ValidationError'
    && Boolean(error.errors.retentionDays)
  ));
});

test('assessment result validation rejects obtained marks above the maximum', async () => {
  const result = new models.AssessmentResultModel({
    schoolId: new mongoose.Types.ObjectId(),
    assessmentId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    obtainedMarks: 11,
    maxMarks: 10,
  });

  await assert.rejects(result.validate(), error => (
    error.name === 'ValidationError'
    && Boolean(error.errors.obtainedMarks)
  ));
});

test('cash-only receipts reject non-cash payment methods', async () => {
  const receipt = new models.FeeReceiptModel({
    schoolId: new mongoose.Types.ObjectId(),
    studentId: new mongoose.Types.ObjectId(),
    academicYearId: new mongoose.Types.ObjectId(),
    period: 'October',
    periodSort: 10,
    totalMinor: 250000,
    status: 'paid',
    paymentMethod: 'card',
    receiptNumber: 'R-1001',
  });

  await assert.rejects(receipt.validate(), error => (
    error.name === 'ValidationError'
    && Boolean(error.errors.paymentMethod)
  ));
});

test('unknown user fields are rejected instead of silently persisted', () => {
  assert.throws(() => new models.UserModel({
    schoolId: new mongoose.Types.ObjectId(),
    role: 'guardian',
    normalizedPhone: '+911234567890',
    passwordHash: 'not-a-real-hash',
    unexpectedPermission: 'admin',
  }), error => error.name === 'StrictModeError');
});

test('blocked schools have no automatic expiration index', () => {
  const ttlIndexes = models.BlockedSchoolModel.schema.indexes()
    .filter(([, options]) => options.expireAfterSeconds !== undefined);
  assert.equal(ttlIndexes.length, 0);
});
