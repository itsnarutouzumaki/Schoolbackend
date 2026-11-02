import { Schema } from 'mongoose';

export const addressSchema = new Schema({
  line1: { type: String, trim: true, default: undefined },
  line2: { type: String, trim: true, default: undefined },
  city: { type: String, trim: true, default: undefined },
  state: { type: String, trim: true, default: undefined },
  postalCode: { type: String, trim: true, default: undefined },
  countryCode: { type: String, uppercase: true, trim: true, default: undefined },
}, { _id: false, strict: 'throw' });

export const emergencyContactSchema = new Schema({
  name: { type: String, trim: true, default: undefined },
  relationship: { type: String, trim: true, default: undefined },
  phone: { type: String, trim: true, default: undefined },
  email: { type: String, lowercase: true, trim: true, default: undefined },
}, { _id: false, strict: 'throw' });
