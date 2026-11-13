import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const profileFieldDefinitionSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  entityType: {
    type: String,
    enum: { values: ['student', 'guardian', 'teacher', 'schoolAdmin'], message: "Entity type must be a valid option." },
    required: [true, "Entity type is required."],
  },
  key: {
    type: String,
    required: [true, "Key is required."],
    trim: true,
    match: [/^[A-Za-z][A-Za-z0-9_]{0,63}$/, "Key has an invalid format."],
  },
  label: { type: String, required: [true, "Label is required."], trim: true },
  valueType: {
    type: String,
    enum: { values: ['string', 'number', 'boolean', 'date', 'enum'], message: "Value type must be a valid option." },
    required: [true, "Value type is required."],
  },
  requiredForWorkflow: { type: Boolean, default: false, required: [true, "Required for workflow is required."] },
  workflow: { type: String, trim: true, default: undefined },
  allowedRoles: {
    type: [String],
    enum: { values: ['schoolAdmin', 'teacher', 'guardian'], message: "Allowed roles must be a valid option." },
    default: ['schoolAdmin'],
    required: [true, "Allowed roles is required."],
  },
  sensitivity: {
    type: String,
    enum: { values: ['standard', 'sensitive'], message: "Sensitivity must be a valid option." },
    default: 'standard',
    required: [true, "Sensitivity is required."],
  },
  validation: { type: Schema.Types.Mixed, default: undefined },
  retentionPolicy: { type: String, trim: true, default: undefined },
  active: { type: Boolean, default: true, required: [true, "Active is required."] },
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
