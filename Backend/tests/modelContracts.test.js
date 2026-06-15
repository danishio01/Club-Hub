import test from 'node:test';
import assert from 'node:assert/strict';
import Admin from '../src/models/adminModel.js';
import Student from '../src/models/studentModel.js';
import Club from '../src/models/clubModel.js';
import Event from '../src/models/eventModel.js';
import EventTask from '../src/models/eventTaskModel.js';
import ClubAssignment from '../src/models/clubAssignmentModel.js';

test('staff roles separate Faculty Coordinator and HOD', () => {
    assert.deepEqual(Admin.schema.path('role').enumValues, ['faculty_coordinator', 'hod']);
});

test('student roles no longer contain global PR or Grafik roles', () => {
    assert.deepEqual(Student.schema.path('role').enumValues, ['student', 'president']);
});

test('clubs support exclusive special responsibilities', () => {
    assert.deepEqual(Club.schema.path('specialRole').enumValues.filter(Boolean), ['pr', 'grafik']);
    const specialIndex = Club.schema.indexes().find(([keys, options]) => keys.specialRole === 1 && options.unique);
    assert.equal(specialIndex?.[1]?.unique, true);
});

test('club members do not use a unique multikey index', () => {
    const memberIndex = Club.schema.indexes().find(([keys]) => keys.members === 1);
    assert.equal(memberIndex?.[1]?.unique, undefined);
});

test('club assignment enforces one club per student', () => {
    const studentIndex = ClubAssignment.schema.indexes().find(([keys]) => keys.student === 1);
    assert.equal(studentIndex?.[1]?.unique, true);
});

test('identifiers normalize case at the model boundary', () => {
    assert.equal(Student.schema.path('usn').options.uppercase, true);
    assert.equal(Student.schema.path('email').options.lowercase, true);
    assert.equal(Admin.schema.path('adminId').options.uppercase, true);
});

test('event workflow includes Faculty and HOD approval stages', () => {
    const statuses = Event.schema.path('status').enumValues;
    for (const status of ['pending_grafik_poster', 'pending_faculty', 'pending_hod', 'approved', 'completed']) {
        assert.ok(statuses.includes(status));
    }
});

test('event tasks cover required production work', () => {
    assert.deepEqual(EventTask.schema.path('type').enumValues, ['poster', 'attendance', 'social_media', 'gallery_upload']);
    assert.ok(EventTask.schema.path('assignedAt'));
    assert.ok(EventTask.schema.path('dueAt'));
});

test('notifications support narrowed workflow events', async () => {
    const Notification = (await import('../src/models/notificationModel.js')).default;
    const types = Notification.schema.path('type').enumValues;
    for (const type of ['FACULTY_REVIEW_REQUIRED', 'TASK_REASSIGNED', 'TASK_APPROVED', 'TASK_REJECTED', 'TASK_REOPENED']) {
        assert.ok(types.includes(type));
    }
});
