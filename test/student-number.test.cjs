const assert = require('node:assert/strict');
const test = require('node:test');
const {
  compactStudentNumber,
  normalizeStudentNumber,
  studentNumberFromSequence,
} = require('../dist/features/people/student-number.js');

test('student numbers normalize, compact, and increment in the expected format', () => {
  assert.equal(normalizeStudentNumber('a1'), 'AAAAA01');
  assert.equal(normalizeStudentNumber('1'), 'AAAAA01');
  assert.equal(normalizeStudentNumber('b01'), 'AAAAB01');
  assert.equal(compactStudentNumber('AAAAB01'), 'B01');
  assert.equal(compactStudentNumber('AAAAA01'), '1');
  assert.equal(studentNumberFromSequence(99), 'AAAAA99');
  assert.equal(studentNumberFromSequence(100), 'AAAAB01');

  for (const invalid of ['0', 'A0', 'A100', 'ABCDEF01', 'A-1', '123']) {
    assert.throws(() => normalizeStudentNumber(invalid), error => (
      error.code === 'STUDENT_NUMBER_INVALID'
    ));
  }
});
