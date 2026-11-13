import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';

const authChallengeSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  challengeId: { type: String, required: [true, "Challenge ID is required."], immutable: true },
  normalizedPhone: { type: String, required: [true, "Normalized phone is required."], trim: true },
  purpose: {
    type: String,
    enum: { values: ['guardian-signup-phone', 'guardian-password-reset'], message: "Purpose must be a valid option." },
    required: [true, "Purpose is required."],
  },
  codeHash: { type: String, required: [true, "Code hash is required."], select: false },
  attemptCount: { type: Number, min: [0, "Attempt count must be at least 0."], default: 0, required: [true, "Attempt count is required."] },
  attemptLimit: { type: Number, min: [1, "Attempt limit must be at least 1."], default: 5, required: [true, "Attempt limit is required."] },
  expiresAt: { type: Date, required: [true, "Expires at is required."] },
  verifiedAt: { type: Date, default: undefined },
  consumedAt: { type: Date, default: undefined },
  deliveryStatus: {
    type: String,
    enum: { values: ['pending', 'sent', 'failed'], message: "Delivery status must be a valid option." },
    default: 'pending',
    required: [true, "Delivery status is required."],
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
