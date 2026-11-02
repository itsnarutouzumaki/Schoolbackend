import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const profileFieldDefinitionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  entityType: {
    type: String,
    enum: ['student', 'guardian', 'teacher', 'schoolAdmin'],
    required: true,
  },
  key: {
    type: String,
    required: true,
    trim: true,
    match: /^[A-Za-z][A-Za-z0-9_]{0,63}$/,
  },
  label: { type: String, required: true, trim: true },
  valueType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'date', 'enum'],
    required: true,
  },
  requiredForWorkflow: { type: Boolean, default: false, required: true },
  workflow: { type: String, trim: true, default: undefined },
  allowedRoles: {
    type: [String],
    enum: ['schoolAdmin', 'teacher', 'guardian'],
    default: ['schoolAdmin'],
    required: true,
  },
  sensitivity: {
    type: String,
    enum: ['standard', 'sensitive'],
    default: 'standard',
    required: true,
  },
  validation: { type: Schema.Types.Mixed, default: undefined },
  retentionPolicy: { type: String, trim: true, default: undefined },
  active: { type: Boolean, default: true, required: true },
}, {
  ...tenantSchemaOptions,
  collection: 'profile_field_definitions',
});

profileFieldDefinitionSchema.index(
  { schoolId: 1, entityType: 1, key: 1 },
  { unique: true },
);
profileFieldDefinitionSchema.index({ schoolId: 1, entityType: 1, active: 1 });

export type ProfileFieldDefinition = InferSchemaType<typeof profileFieldDefinitionSchema>;
export const ProfileFieldDefinitionModel = models.ProfileFieldDefinition
  ?? model('ProfileFieldDefinition', profileFieldDefinitionSchema);
