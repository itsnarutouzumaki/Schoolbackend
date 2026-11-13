import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const notificationSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: [true, "School ID is required."] },
  eventId: { type: String, required: [true, "Event ID is required."], trim: true },
  eventType: { type: String, required: [true, "Event type is required."], trim: true },
  subject: { type: String, required: [true, "Subject is required."], trim: true, maxlength: [160, "Subject must be 160 characters or fewer."] },
  body: { type: String, required: [true, "Body is required."], trim: true, maxlength: [2000, "Body must be 2000 characters or fewer."] },
  routeName: { type: String, trim: true, default: undefined },
  routeParams: {
    type: Map,
    of: String,
    default: undefined,
    validate: {
      validator: (value: Map<string, string> | undefined) => !value || value.size <= 20,
      message: 'A notification supports at most 20 route parameters.',
    },
  },
  targetAudience: {
    type: String,
    enum: { values: ['guardian', 'teacher', 'schoolAdmin'], message: "Target audience must be a valid option." },
    required: [true, "Target audience is required."],
  },
  recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: [true, "Recipient user ID is required."] },
  deliveredAt: { type: Date, default: undefined },
  readAt: { type: Date, default: undefined },
  pushStatus: {
    type: String,
    enum: { values: ['pending', 'sent', 'failed', 'notRequested'], message: "Push status must be a valid option." },
    default: 'pending',
    required: [true, "Push status is required."],
  },
  pushAttemptedAt: { type: Date, default: undefined },
}, {
  ...tenantSchemaOptions,
  collection: 'notifications',
});

notificationSchema.index(
  { schoolId: 1, eventId: 1, recipientUserId: 1 },
  { unique: true },
);
notificationSchema.index({ schoolId: 1, recipientUserId: 1, createdAt: -1 });
notificationSchema.index({ schoolId: 1, recipientUserId: 1, readAt: 1 });

export type Notification = InferSchemaType<typeof notificationSchema>;
export const NotificationModel = models.Notification
  ?? model('Notification', notificationSchema);
