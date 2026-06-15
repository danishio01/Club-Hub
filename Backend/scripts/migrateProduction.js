import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Admin from '../src/models/adminModel.js';
import Student from '../src/models/studentModel.js';
import Event from '../src/models/eventModel.js';
import NotificationToken from '../src/models/notificationTokenModel.js';
import Club from '../src/models/clubModel.js';
import ClubAssignment from '../src/models/clubAssignmentModel.js';
import EventTask from '../src/models/eventTaskModel.js';

dotenv.config();
if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required');
await mongoose.connect(process.env.MONGO_URI);

const caseConflicts = async (Model, field) => Model.aggregate([
    { $match: { [field]: { $type: 'string' } } },
    { $group: { _id: { $toUpper: `$${field}` }, values: { $addToSet: `$${field}` }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
]);
const conflicts = {
    staffIds: await caseConflicts(Admin, 'adminId'),
    usns: await caseConflicts(Student, 'usn'),
    clubNames: await caseConflicts(Club, 'name')
};
if (Object.values(conflicts).some((items) => items.length > 0)) {
    console.error('Case-insensitive identity conflicts must be resolved before migration:', conflicts);
    throw new Error('Migration stopped because case-insensitive identity conflicts exist');
}

await Admin.updateMany({ role: { $exists: false } }, { $set: { role: 'faculty_coordinator', active: true, mustChangePassword: false } });
for (const staff of await Admin.find({})) {
    staff.adminId = staff.adminId.trim().toUpperCase();
    await staff.save();
}
await Student.updateMany({ role: { $in: ['pr', 'grafik'] } }, { $set: { role: 'student' } });
for (const student of await Student.find({})) {
    student.usn = student.usn.trim().toUpperCase();
    student.email = student.email.trim().toLowerCase();
    await student.save();
}
await Event.updateMany({ status: 'review' }, { $set: { status: 'pending_grafik_poster' } });
await Event.updateMany({ status: 'pending_admin' }, { $set: { status: 'pending_faculty' } });
await EventTask.updateMany(
    { assignee: { $ne: null }, assignedAt: null },
    [{ $set: { assignedAt: { $ifNull: ['$updatedAt', '$createdAt'] } } }],
    { updatePipeline: true }
);

const clubs = await Club.find({}).sort({ createdAt: 1 });
const assignedMembers = new Set();
await ClubAssignment.deleteMany({});
for (const club of clubs) {
    club.name = club.name.trim();
    if (club.president && !assignedMembers.has(String(club.president))) {
        assignedMembers.add(String(club.president));
        await ClubAssignment.create({ student: club.president, club: club._id, position: 'president' });
    }
    const uniqueMembers = [];
    for (const member of club.members || []) {
        const id = String(member);
        if (!assignedMembers.has(id) && id !== String(club.president || '')) {
            assignedMembers.add(id);
            uniqueMembers.push(member);
            await ClubAssignment.create({ student: member, club: club._id, position: 'member' });
        }
    }
    if (uniqueMembers.length !== club.members.length) {
        club.members = uniqueMembers;
        await club.save();
    }
}

await Club.collection.dropIndex('members_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
});
await Club.collection.dropIndex('president_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
});
await Club.collection.dropIndex('name_1').catch((error) => {
    if (error.codeName !== 'IndexNotFound') throw error;
});
await Club.collection.createIndex({ name: 1 }, { unique: true, collation: { locale: 'en', strength: 2 } });
await Club.collection.createIndex({ president: 1 });

const duplicateTokens = await NotificationToken.aggregate([
    { $group: { _id: '$token', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } }
]);
for (const duplicate of duplicateTokens) {
    await NotificationToken.deleteMany({ _id: { $in: duplicate.ids.slice(1) } });
}
console.log('Production migration completed.');
await mongoose.disconnect();
