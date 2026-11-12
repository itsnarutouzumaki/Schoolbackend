import { ApiError } from '../../shared/errors/index.js';

const LETTER_COUNT = 5;
const SUFFIX_MAX = 99;
const PREFIX_COUNT = 26 ** LETTER_COUNT;

export function normalizeStudentNumber(input: string): string {
  const match = /^([a-z]{0,5})(\d{1,2})$/i.exec(input.trim());
  if (!match) {
    throw new ApiError(400, 'STUDENT_NUMBER_INVALID', 'The student number is invalid.');
  }

  const letters = match[1]?.toUpperCase() ?? '';
  const suffix = Number(match[2]);
  if (suffix < 1 || suffix > SUFFIX_MAX) {
    throw new ApiError(400, 'STUDENT_NUMBER_INVALID', 'The student number is invalid.');
  }

  return `${letters.padStart(LETTER_COUNT, 'A')}${String(suffix).padStart(2, '0')}`;
}

export function studentNumberFromSequence(sequence: number): string {
  if (!Number.isSafeInteger(sequence) || sequence < 1 || sequence > PREFIX_COUNT * SUFFIX_MAX) {
    throw new ApiError(409, 'STUDENT_NUMBER_SEQUENCE_EXHAUSTED', 'The student-number sequence is exhausted.');
  }

  let prefix = Math.floor((sequence - 1) / SUFFIX_MAX);
  const suffix = ((sequence - 1) % SUFFIX_MAX) + 1;
  const letters = Array.from({ length: LETTER_COUNT }, () => 'A');

  for (let index = LETTER_COUNT - 1; index >= 0; index -= 1) {
    letters[index] = String.fromCharCode(65 + (prefix % 26));
    prefix = Math.floor(prefix / 26);
  }

  return `${letters.join('')}${String(suffix).padStart(2, '0')}`;
}

export function compactStudentNumber(input: string): string {
  return normalizeStudentNumber(input).replace(/^A+/, '').replace(/^0+/, '');
}
