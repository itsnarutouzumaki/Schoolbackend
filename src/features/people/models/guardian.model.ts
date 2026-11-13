import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';
import { addressSchema, emergencyContactSchema } from './profile-subdocuments.js';

const guardianSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "User ID is required."] },
  fullName: { type: String, required: [true, "Full name is required."], trim: true },
  gender: {
    type: String,
    enum: { values: ['Male', 'Female', 'Other', 'Prefer not to say'], message: "Gender must be a valid option." },
    default: undefined,
  },
  photoFileId: { type: Schema.Types.ObjectId, ref: 'FileRecord', default: undefined },
  currentAddress: { type: addressSchema, default: undefined, select: false },
  permanentAddress: { type: addressSchema, default: undefined, select: false },
  alternateContacts: {
    type: [emergencyContactSchema],
    default: undefined,
    select: false,
  },
  relationshipDetails: { type: String, trim: true, default: undefined },
  optionalDetails: {
    type: Map,
    of: Schema.Types.Mixed,
    default: undefined,
    select: false,
    validate: {
      validator: (value: Map<string, unknown> | undefined) => !value || value.size <= 50,
      message: 'A guardian profile supports at most 50 optional detail fields.',
    },
  },
}, {
  ...tenantSchemaOptions,
  collection: 'guardians',
});

guardianSchema.index({ schoolId: 1, userId: 1 }, { unique: true });

export type Guardian = {
  schoolId: Types.ObjectId;
  userId: Types.ObjectId;
  fullName: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  photoFileId?: Types.ObjectId;
  currentAddress?: { line1?: string; line2?: string; city?: string; state?: string; postalCode?: string; countryCode?: string };
  relationshipDetails?: string;
};
export const GuardianModel = getTypedModel<Guardian>('Guardian', guardianSchema);
