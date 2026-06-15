import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Club from '../src/models/clubModel.js';
import {
    buildVisibleTaskFilter,
    isStaffUser,
    SPECIAL_ROLES,
    TASK_TYPES
} from '../src/services/taskAccessService.js';

test('task access supports every special-club production task type', () => {
    assert.deepEqual(TASK_TYPES, ['poster', 'attendance', 'social_media', 'gallery_upload']);
    assert.deepEqual(SPECIAL_ROLES, ['grafik', 'pr']);
});

test('staff task visibility keeps the requested server-side scope', async () => {
    const scope = { type: 'poster' };
    assert.equal(isStaffUser({ role: 'faculty_coordinator' }), true);
    assert.deepEqual(await buildVisibleTaskFilter({ role: 'faculty_coordinator' }, scope), scope);
});

test('normal members only receive tasks assigned to them', async () => {
    const userId = new mongoose.Types.ObjectId();
    const filter = await buildVisibleTaskFilter({ _id: userId, role: 'student' }, { type: 'gallery_upload' });
    assert.deepEqual(filter, {
        $and: [
            { type: 'gallery_upload' },
            { $or: [{ assignee: userId }] }
        ]
    });
});

test('presidents receive assigned tasks and their responsible-club queue', async () => {
    const originalDistinct = Club.distinct;
    const userId = new mongoose.Types.ObjectId();
    const clubId = new mongoose.Types.ObjectId();
    Club.distinct = async () => [clubId];
    try {
        const filter = await buildVisibleTaskFilter({ _id: userId, role: 'president' }, { type: 'attendance' });
        assert.deepEqual(filter, {
            $and: [
                { type: 'attendance' },
                { $or: [{ assignee: userId }, { responsibleClub: { $in: [clubId] } }] }
            ]
        });
    } finally {
        Club.distinct = originalDistinct;
    }
});
