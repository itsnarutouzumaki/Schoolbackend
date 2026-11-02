import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const authChallengeSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  challengeId: { type: String, required: true, immutable: true },
  normalizedPhone: { type: String, required: true, trim: true },
  purpose: {
    type: String,
    enum: ['guardian-signup-phone', 'guardian-password-reset'],
    required: true,
  },
  codeHash: { type: String, required: true, select: false },
  attemptCount: { type: Number, min: 0, default: 0, required: true },
  attemptLimit: { type: Number, min: 1, default: 5, required: true },
  expiresAt: { type: Date, required: true },
  verifiedAt: { type: Date, default: undefined },
  consumedAt: { type: Date, default: undefined },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
    required: true,
  },
}, {
  ...tenantSchemaOptions,
  collection: 'auth_challenges',
});

authChallengeSchema.index({ schoolId: 1, challengeId: 1 }, { unique: true });
authChallengeSchema.index({
  schoolId: 1,
  normalizedPhone: 1,
  purpose: 1,
  createdAt: -1,
});
authChallengeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export type AuthChallenge = {
  schoolId: Types.ObjectId;
  challengeId: string;
  normalizedPhone: string;
  purpose: 'guardian-signup-phone' | 'guardian-password-reset';
  codeHash: string;
  attemptCount: number;
  attemptLimit: number;
  expiresAt: Date;
  verifiedAt?: Date;
  consumedAt?: Date;
  deliveryStatus: 'pending' | 'sent' | 'failed';
};
export const AuthChallengeModel = getTypedModel<AuthChallenge>('AuthChallenge', authChallengeSchema);
