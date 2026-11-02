import { model, models, Schema, type InferSchemaType } from 'mongoose';
import { tenantSchemaOptions } from '../../../shared/database/index.js';

const notificationSchema = new Schema({
  schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
  eventId: { type: String, required: true, trim: true },
  eventType: { type: String, required: true, trim: true },
  subject: { type: String, required: true, trim: true, maxlength: 160 },
  body: { type: String, required: true, trim: true, maxlength: 2000 },
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
    enum: ['guardian', 'teacher', 'schoolAdmin'],
    required: true,
  },
  recipientUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date, default: undefined },
  readAt: { type: Date, default: undefined },
  pushStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'notRequested'],
    default: 'pending',
    required: true,
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
