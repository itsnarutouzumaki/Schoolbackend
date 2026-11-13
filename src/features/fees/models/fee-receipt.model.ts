import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const feeBreakdownItemSchema = new Schema({
  label: { type: String, required: [true, "Label is required."], trim: true },
  amountMinor: { type: Number, required: [true, "Amount minor is required."], min: [0, "Amount minor must be at least 0."] },
}, { _id: false, strict: 'throw' });

const feeReceiptSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: [true, "Student ID is required."] },
  academicYearId: { type: Schema.Types.ObjectId, ref: 'AcademicYear', required: [true, "Academic year ID is required."] },
  period: { type: String, required: [true, "Period is required."], trim: true },
  periodSort: { type: Number, min: [0, "Period sort must be at least 0."], required: [true, "Period sort is required."] },
  breakdown: { type: [feeBreakdownItemSchema], default: [] },
  totalMinor: { type: Number, required: [true, "Total minor is required."], min: [0, "Total minor must be at least 0."] },
  currency: { type: String, uppercase: true, default: 'INR', match: [/^[A-Z]{3}$/, "Currency has an invalid format."] },
  status: {
    type: String,
    enum: { values: ['due', 'paid', 'void', 'refunded'], message: "Status must be a valid option." },
    default: 'due',
    required: [true, "Status is required."],
  },
  paidAt: { type: Date, default: undefined },
  paymentMethod: { type: String, enum: { values: ['cash'], message: "Payment method must be a valid option." }, default: undefined },
  remarks: { type: String, trim: true, maxlength: [2000, "Remarks must be 2000 characters or fewer."], default: undefined },
  receiptNumber: { type: String, required: [true, "Receipt number is required."], trim: true },
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
