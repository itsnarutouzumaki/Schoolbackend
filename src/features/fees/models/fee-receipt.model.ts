import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const feeBreakdownItemSchema = new Schema({
  label: { type: String, required: true, trim: true },
  amountMinor: { type: Number, required: true, min: 0 },
}, { _id: false, strict: 'throw' });

const feeReceiptSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  period: { type: String, required: true, trim: true },
  periodSort: { type: Number, min: 0, required: true },
  breakdown: { type: [feeBreakdownItemSchema], default: [] },
  totalMinor: { type: Number, required: true, min: 0 },
  currency: { type: String, uppercase: true, default: 'INR', match: /^[A-Z]{3}$/ },
  status: {
    type: String,
    enum: ['due', 'paid', 'void', 'refunded'],
    default: 'due',
    required: true,
  },
  paidAt: { type: Date, default: undefined },
  paymentMethod: { type: String, enum: ['cash'], default: undefined },
  remarks: { type: String, trim: true, maxlength: 2000, default: undefined },
  receiptNumber: { type: String, required: true, trim: true },
  recordedByUserId: { type: Schema.Types.ObjectId, ref: 'User', default: undefined },
  refundedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'fee_receipts',
});

feeReceiptSchema.index({ schoolId: 1, studentId: 1, academicYearId: 1, periodSort: 1 });
feeReceiptSchema.index({ schoolId: 1, receiptNumber: 1 }, { unique: true });

export type FeeReceipt = InferSchemaType<typeof feeReceiptSchema>;
export const FeeReceiptModel = models.FeeReceipt ?? model('FeeReceipt', feeReceiptSchema);
