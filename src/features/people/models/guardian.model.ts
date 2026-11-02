import { Schema, Types } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';
import { getTypedModel } from '../../../shared/database/index.js';
import { addressSchema, emergencyContactSchema } from './profile-subdocuments.js';

const guardianSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fullName: { type: String, required: true, trim: true },
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
  photoFileId?: Types.ObjectId;
};
export const GuardianModel = getTypedModel<Guardian>('Guardian', guardianSchema);
