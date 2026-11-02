import { createHash } from 'node:crypto';
import mongoose, { Types } from 'mongoose';
import {
  AuthChallengeModel,
  RefreshSessionModel,
  type AuthChallenge,
  type RefreshSession,
  type User,
  UserModel,
} from '../models/index.js';
import {
  GuardianModel,
  SchoolAdminProfileModel,
  TeacherModel,
} from '../../people/models/index.js';
import type { Guardian } from '../../people/models/guardian.model.js';
import type { Teacher } from '../../people/models/teacher.model.js';
import type { SchoolAdminProfile } from '../../people/models/school-admin-profile.model.js';

export async function findUserForLogin(input: {
  schoolId: string;
  phone: string;
  role: User['role'];
}) {
  return UserModel.findOne({
    schoolId: input.schoolId,
    normalizedPhone: input.phone,
    role: input.role,
  }).select('+passwordHash +failedLoginCount +lockedUntil')
    .lean<User & { _id: Types.ObjectId }>();
}

export async function findUserById(schoolId: string, userId: string) {
  return UserModel.findOne({ _id: userId, schoolId }).lean<User & { _id: Types.ObjectId }>();
}

export async function incrementFailedLogin(userId: string, schoolId: string): Promise<void> {
  await UserModel.updateOne(
    { _id: userId, schoolId },
    [
      {
        $set: {
          failedLoginCount: { $add: [{ $ifNull: ['$failedLoginCount', 0] }, 1] },
          lockedUntil: {
            $cond: [
              { $gte: [{ $add: [{ $ifNull: ['$failedLoginCount', 0] }, 1] }, 5] },
              new Date(Date.now() + 15 * 60 * 1000),
              '$lockedUntil',
            ],
          },
        },
      },
    ],
  );
}

export async function clearFailedLogin(userId: string, schoolId: string): Promise<void> {
  await UserModel.updateOne(
    { _id: userId, schoolId },
    { $set: { failedLoginCount: 0 }, $unset: { lockedUntil: 1 } },
  );
}

export async function createRefreshSession(input: {
  schoolId: string;
  userId: string;
  authVersion: number;
  appAudience: string;
  tokenHash: string;
  expiresAt: Date;
}): Promise<string> {
  const session = await RefreshSessionModel.create({
    schoolId: new Types.ObjectId(input.schoolId),
    userId: new Types.ObjectId(input.userId),
    authVersion: input.authVersion,
    appAudience: input.appAudience as RefreshSession['appAudience'],
    tokenHash: input.tokenHash,
    expiresAt: input.expiresAt,
    platform: 'other',
  });
  return session.id;
}

export async function findRefreshSessionByToken(token: string) {
  const tokenHash = createHash('sha256').update(token).digest('hex');
  return RefreshSessionModel.findOne({
    tokenHash,
    revokedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
  }).select('+tokenHash').lean<RefreshSession & { _id: Types.ObjectId }>();
}

export async function rotateRefreshSession(input: {
  sessionId: string;
  schoolId: string;
  userId: string;
  tokenHash: string;
  nextTokenHash: string;
  expiresAt: Date;
  rotatedAt: Date;
}): Promise<boolean> {
  const result = await RefreshSessionModel.updateOne({
    _id: input.sessionId,
    schoolId: input.schoolId,
    userId: input.userId,
    tokenHash: input.tokenHash,
    revokedAt: { $exists: false },
    expiresAt: { $gt: input.rotatedAt },
  }, {
    $set: {
      tokenHash: input.nextTokenHash,
      expiresAt: input.expiresAt,
      rotatedAt: input.rotatedAt,
    },
  });
  return result.modifiedCount === 1;
}

export async function revokeSession(sessionId: string, schoolId: string, at: Date): Promise<void> {
  await RefreshSessionModel.updateOne(
    { _id: sessionId, schoolId, revokedAt: { $exists: false } },
    { $set: { revokedAt: at, revokeReason: 'logout' } },
  );
}

export async function revokeUserSessions(
  userId: string,
  schoolId: string,
  at: Date,
  reason: 'logout' | 'password-reset',
  exceptSessionId?: string,
): Promise<void> {
  const filter: Record<string, unknown> = {
    userId,
    schoolId,
    revokedAt: { $exists: false },
  };
  if (exceptSessionId) {
    filter._id = { $ne: new mongoose.Types.ObjectId(exceptSessionId) };
  }
  await RefreshSessionModel.updateMany(
    filter,
    { $set: { revokedAt: at, revokeReason: reason } },
  );
}

export async function getRoleProfile(userId: string, schoolId: string, role: User['role']) {
  if (role === 'guardian') {
    const guardian = await GuardianModel.findOne({ userId, schoolId })
      .select('fullName photoFileId')
      .lean<Pick<Guardian, 'fullName' | 'photoFileId'> & { _id: Types.ObjectId }>();
    if (!guardian) {
      return null;
    }
    return {
      id: guardian._id.toString(),
      fullName: guardian.fullName,
      ...(guardian.photoFileId && { photoFileId: guardian.photoFileId.toString() }),
    };
  }
  if (role === 'teacher') {
    const teacher = await TeacherModel.findOne({ userId, schoolId })
      .select('displayName designation subjects qualifications experienceYears specialization biography languages photoFileId')
      .lean<Pick<
        Teacher,
        | 'displayName'
        | 'designation'
        | 'subjects'
        | 'qualifications'
        | 'experienceYears'
        | 'specialization'
        | 'biography'
        | 'languages'
        | 'photoFileId'
      > & { _id: Types.ObjectId }>();
    if (!teacher) {
      return null;
    }
    return {
      id: teacher._id.toString(),
      displayName: teacher.displayName,
      ...(teacher.designation && { designation: teacher.designation }),
      ...(teacher.subjects && { subjects: teacher.subjects }),
      ...(teacher.qualifications && { qualifications: teacher.qualifications }),
      ...(teacher.experienceYears !== undefined && { experienceYears: teacher.experienceYears }),
      ...(teacher.specialization && { specialization: teacher.specialization }),
      ...(teacher.biography && { biography: teacher.biography }),
      ...(teacher.languages && { languages: teacher.languages }),
      ...(teacher.photoFileId && { photoFileId: teacher.photoFileId.toString() }),
    };
  }
  const schoolAdmin = await SchoolAdminProfileModel.findOne({ userId, schoolId })
    .select('displayName title department photoFileId')
    .lean<Pick<SchoolAdminProfile, 'displayName' | 'title' | 'department' | 'photoFileId'> & {
      _id: Types.ObjectId;
    }>();
  if (!schoolAdmin) {
    return null;
  }
  return {
    id: schoolAdmin._id.toString(),
    displayName: schoolAdmin.displayName,
    ...(schoolAdmin.title && { title: schoolAdmin.title }),
    ...(schoolAdmin.department && { department: schoolAdmin.department }),
    ...(schoolAdmin.photoFileId && { photoFileId: schoolAdmin.photoFileId.toString() }),
  };
}

export async function createGuardianAccount(input: {
  schoolId: string;
  fullName: string;
  phone: string;
  email?: string;
  passwordHash: string;
  challengeId: string;
  challengeCodeHash: string;
  verifiedAt: Date;
}): Promise<{ userId: string; guardianId: string }> {
  const session = await mongoose.startSession();
  let createdUserId = '';
  let createdGuardianId = '';

  try {
    await session.withTransaction(async () => {
      const challenge = await AuthChallengeModel.findOneAndUpdate({
        schoolId: input.schoolId,
        challengeId: input.challengeId,
        normalizedPhone: input.phone,
        purpose: 'guardian-signup-phone',
        codeHash: input.challengeCodeHash,
        verifiedAt: { $exists: false },
        consumedAt: { $exists: false },
        expiresAt: { $gt: input.verifiedAt },
        attemptCount: { $lt: 5 },
        deliveryStatus: 'sent',
      }, {
        $set: { verifiedAt: input.verifiedAt, consumedAt: input.verifiedAt },
      }, { session, new: true });

      if (!challenge) {
        throw new Error('VERIFICATION_NOT_VALID');
      }

      const [user] = await UserModel.create([{
        schoolId: new Types.ObjectId(input.schoolId),
        role: 'guardian',
        status: 'active',
        normalizedPhone: input.phone,
        normalizedEmail: input.email,
        passwordHash: input.passwordHash,
        mustChangePassword: false,
        phoneVerifiedAt: input.verifiedAt,
      }], { session });
      if (!user) {
        throw new Error('GUARDIAN_ACCOUNT_CREATION_FAILED');
      }

      const [guardian] = await GuardianModel.create([{
        schoolId: new Types.ObjectId(input.schoolId),
        userId: user._id,
        fullName: input.fullName,
      }], { session });
      if (!guardian) {
        throw new Error('GUARDIAN_PROFILE_CREATION_FAILED');
      }

      createdUserId = user.id;
      createdGuardianId = guardian.id;
    });
  } finally {
    await session.endSession();
  }

  return { userId: createdUserId, guardianId: createdGuardianId };
}

export async function createAuthChallenge(input: {
  schoolId: string;
  phone: string;
  purpose: 'guardian-signup-phone' | 'guardian-password-reset';
  challengeId: string;
  codeHash: string;
  expiresAt: Date;
  deliveryStatus: 'pending' | 'sent' | 'failed';
}) {
  return AuthChallengeModel.create({
    ...input,
    attemptCount: 0,
    attemptLimit: 5,
  });
}

export async function setChallengeDeliveryStatus(
  schoolId: string,
  challengeId: string,
  deliveryStatus: 'sent' | 'failed',
): Promise<void> {
  await AuthChallengeModel.updateOne(
    { schoolId, challengeId },
    { $set: { deliveryStatus } },
  );
}

export async function getChallenge(
  schoolId: string,
  challengeId: string,
  purpose: AuthChallenge['purpose'],
) {
  return AuthChallengeModel.findOne({
    schoolId,
    challengeId,
    purpose,
    deliveryStatus: 'sent',
    verifiedAt: { $exists: false },
    consumedAt: { $exists: false },
    expiresAt: { $gt: new Date() },
    attemptCount: { $lt: 5 },
  }).select('+codeHash').lean<AuthChallenge & { _id: Types.ObjectId }>();
}

export async function incrementChallengeAttempt(
  schoolId: string,
  challengeId: string,
): Promise<void> {
  await AuthChallengeModel.updateOne(
    { schoolId, challengeId, consumedAt: { $exists: false }, attemptCount: { $lt: 5 } },
    { $inc: { attemptCount: 1 } },
  );
}

export async function consumeChallenge(
  schoolId: string,
  challengeId: string,
  purpose: AuthChallenge['purpose'],
  codeHash: string,
  now: Date,
): Promise<boolean> {
  const challenge = await AuthChallengeModel.findOneAndUpdate({
    schoolId,
    challengeId,
    purpose,
    deliveryStatus: 'sent',
    codeHash,
    verifiedAt: { $exists: false },
    consumedAt: { $exists: false },
    expiresAt: { $gt: now },
    attemptCount: { $lt: 5 },
  }, {
    $set: { verifiedAt: now, consumedAt: now },
  }, { new: true });
  return Boolean(challenge);
}

export async function updatePassword(
  schoolId: string,
  userId: string,
  passwordHash: string,
): Promise<boolean> {
  const session = await mongoose.startSession();
  let changed = false;
  const now = new Date();
  try {
    await session.withTransaction(async () => {
      const result = await UserModel.updateOne(
        { _id: userId, schoolId },
        {
          $set: {
            passwordHash,
            mustChangePassword: false,
            failedLoginCount: 0,
            passwordChangedAt: now,
          },
          $unset: { lockedUntil: 1 },
          $inc: { authVersion: 1 },
        },
        { session },
      );
      if (result.modifiedCount !== 1) {
        return;
      }

      await RefreshSessionModel.updateMany({
        schoolId,
        userId,
        revokedAt: { $exists: false },
      }, {
        $set: { revokedAt: now, revokeReason: 'password-change' },
      }, { session });
      changed = true;
    });
  } finally {
    await session.endSession();
  }
  return changed;
}

export async function resetGuardianPassword(input: {
  schoolId: string;
  phone: string;
  challengeId: string;
  codeHash: string;
  passwordHash: string;
  now: Date;
}): Promise<boolean> {
  const session = await mongoose.startSession();
  let didReset = false;
  try {
    await session.withTransaction(async () => {
      const challenge = await AuthChallengeModel.findOneAndUpdate({
        schoolId: input.schoolId,
        challengeId: input.challengeId,
        normalizedPhone: input.phone,
        purpose: 'guardian-password-reset',
        codeHash: input.codeHash,
        verifiedAt: { $exists: false },
        consumedAt: { $exists: false },
        expiresAt: { $gt: input.now },
        attemptCount: { $lt: 5 },
        deliveryStatus: 'sent',
      }, {
        $set: { verifiedAt: input.now, consumedAt: input.now },
      }, { session, new: true });

      if (!challenge) {
        return;
      }

      const user = await UserModel.findOneAndUpdate({
        schoolId: input.schoolId,
        normalizedPhone: input.phone,
        role: 'guardian',
        status: 'active',
      }, {
        $set: {
          passwordHash: input.passwordHash,
          mustChangePassword: false,
          failedLoginCount: 0,
          passwordChangedAt: input.now,
        },
        $unset: { lockedUntil: 1 },
        $inc: { authVersion: 1 },
      }, { session, new: true }).select('_id');

      if (!user) {
        throw new Error('RESET_ACCOUNT_UNAVAILABLE');
      }

      await RefreshSessionModel.updateMany({
        schoolId: input.schoolId,
        userId: user._id,
        revokedAt: { $exists: false },
      }, {
        $set: { revokedAt: input.now, revokeReason: 'password-reset' },
      }, { session });
      didReset = true;
    });
  } finally {
    await session.endSession();
  }
  return didReset;
}

export async function getActiveGuardianForReset(schoolId: string, phone: string) {
  return UserModel.findOne({
    schoolId,
    normalizedPhone: phone,
    role: 'guardian',
    status: 'active',
  }).select('_id');
}
