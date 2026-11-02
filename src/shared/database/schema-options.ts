import type { SchemaOptions } from 'mongoose';

export const tenantSchemaOptions: SchemaOptions = {
  timestamps: true,
  strict: 'throw',
};
