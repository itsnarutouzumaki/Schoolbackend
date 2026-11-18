import { Types } from 'mongoose';
import { UserModel } from '../../auth/models/index.js';
import { SchoolAdminProfileModel, TeacherModel } from '../../people/models/index.js';

export async function getGuardianComplaintRecipients(input: { schoolId: string }) {
  const schoolId = new Types.ObjectId(input.schoolId);
  const [teacherProfiles, adminProfile] = await Promise.all([
    TeacherModel.find().where({ schoolId, status: 'active' })
      .select('userId displayName').sort({ displayName: 1 }).lean(),
    SchoolAdminProfileModel.findOne().where({ schoolId, status: 'active' })
      .select('userId').sort({ _id: 1 }).lean(),
  ]);
  const candidates = [
    ...teacherProfiles.map(profile => ({
      id: profile.userId.toString(),
      profileId: profile._id.toString(),
      role: 'teacher' as const,
      displayName: profile.displayName,
    })),
    ...(adminProfile ? [{
      id: adminProfile.userId.toString(),
      role: 'schoolAdmin' as const,
      displayName: 'School Administration',
    }] : []),
  ];
  const activeUsers = await UserModel.find().where({
    schoolId,
    _id: { $in: candidates.map(candidate => candidate.id) },
    role: { $in: ['teacher', 'schoolAdmin'] },
    status: 'active',
  }).select('_id').lean();
  const activeUserIds = new Set(activeUsers.map(user => user._id.toString()));
  return candidates.filter(candidate => activeUserIds.has(candidate.id));
}
