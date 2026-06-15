import { configDotenv } from 'dotenv';
import mongoose from 'mongoose';
import Student from '../src/models/studentModel.js';
import Club from '../src/models/clubModel.js';
import ClubAssignment from '../src/models/clubAssignmentModel.js';
import Event from '../src/models/eventModel.js';
import EventTask from '../src/models/eventTaskModel.js';
import Registration from '../src/models/registrationModel.js';

configDotenv();

if (process.env.NODE_ENV === 'production' || process.env.ALLOW_LOCAL_TEST_FIXTURES !== 'true') {
    throw new Error('Workflow fixtures are local/test-only. Set ALLOW_LOCAL_TEST_FIXTURES=true outside production.');
}

const mongoUri = process.env.MONGO_URI;
if (!mongoUri || !/(mongodb:\/\/localhost|mongodb:\/\/127\.0\.0\.1)/i.test(mongoUri)) {
    throw new Error('Workflow fixtures require a localhost MongoDB URI.');
}

await mongoose.connect(mongoUri);

const prefix = 'CLUBHUB_FIXTURE';
const password = 'FixturePass123!';
await Registration.deleteMany({ event: { $in: await Event.distinct('_id', { title: new RegExp(`^${prefix}`) }) } });
await EventTask.deleteMany({ event: { $in: await Event.distinct('_id', { title: new RegExp(`^${prefix}`) }) } });
await Event.deleteMany({ title: new RegExp(`^${prefix}`) });
await ClubAssignment.deleteMany({ student: { $in: await Student.distinct('_id', { email: /@fixture\.clubhub\.local$/ }) } });
await Club.deleteMany({ name: new RegExp(`^${prefix}`) });
await Student.deleteMany({ email: /@fixture\.clubhub\.local$/ });

const createStudent = (name, usn, role) => Student.create({
    name,
    usn,
    email: `${usn.toLowerCase()}@fixture.clubhub.local`,
    password,
    department: 'CSE',
    semester: '6',
    section: 'A',
    role
});

const [grafikPresident, grafikMember, prPresident, prMember, attendee] = await Promise.all([
    createStudent('Fixture Grafik President', 'FXG001', 'president'),
    createStudent('Fixture Grafik Member', 'FXG002', 'student'),
    createStudent('Fixture PR President', 'FXP001', 'president'),
    createStudent('Fixture PR Member', 'FXP002', 'student'),
    createStudent('Fixture Attendee', 'FXS001', 'student')
]);

const grafikClub = await Club.create({
    name: `${prefix} Grafik Club`,
    description: 'Local browser workflow fixture',
    specialRole: 'grafik',
    president: grafikPresident._id,
    members: [grafikMember._id]
});
const prClub = await Club.create({
    name: `${prefix} PR Club`,
    description: 'Local browser workflow fixture',
    specialRole: 'pr',
    president: prPresident._id,
    members: [prMember._id]
});
await ClubAssignment.insertMany([
    { student: grafikPresident._id, club: grafikClub._id, position: 'president' },
    { student: grafikMember._id, club: grafikClub._id, position: 'member' },
    { student: prPresident._id, club: prClub._id, position: 'president' },
    { student: prMember._id, club: prClub._id, position: 'member' }
]);

const eventBase = {
    description: 'Deterministic local browser workflow fixture',
    date: new Date(Date.now() + 7 * 86400000),
    time: '10:00 AM',
    venue: 'Fixture Hall',
    club: prClub._id,
    eventType: 'Free',
    maxParticipants: 100,
    creator: { student: prPresident._id, name: prPresident.name, usn: prPresident.usn, role: 'President' }
};
const posterEvent = await Event.create({ ...eventBase, title: `${prefix} Poster Event`, status: 'pending_grafik_poster' });
const posterTakeoverEvent = await Event.create({ ...eventBase, title: `${prefix} Poster Takeover Event`, status: 'pending_grafik_poster' });
const completedEvent = await Event.create({
    ...eventBase,
    title: `${prefix} Completed Event`,
    status: 'completed',
    galleryStatus: 'approved',
    gallery: [{ url: 'https://placehold.co/800x600/png', fileId: 'fixture-approved-photo' }]
});
const galleryTakeoverEvent = await Event.create({ ...eventBase, title: `${prefix} Gallery Takeover Event`, status: 'completed' });
const approvedEvent = await Event.create({ ...eventBase, title: `${prefix} Approved Event`, status: 'approved' });
const prTakeoverEvent = await Event.create({
    ...eventBase,
    title: `${prefix} PR Takeover Event`,
    status: 'completed',
    galleryStatus: 'approved',
    gallery: [{ url: 'https://placehold.co/800x600/png', fileId: 'fixture-pr-takeover-photo' }]
});

await EventTask.insertMany([
    { event: posterEvent._id, sourceClub: prClub._id, responsibleClub: grafikClub._id, type: 'poster', assignee: grafikMember._id, assignedBy: grafikPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned' },
    { event: posterTakeoverEvent._id, sourceClub: prClub._id, responsibleClub: grafikClub._id, type: 'poster', assignee: grafikPresident._id, assignedBy: grafikPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned', audit: [{ action: 'president_takeover', actor: grafikPresident._id, actorModel: 'Student', previousAssignee: grafikMember._id, takenOverBy: grafikPresident._id, note: 'Fixture takeover' }] },
    { event: completedEvent._id, sourceClub: prClub._id, responsibleClub: grafikClub._id, type: 'gallery_upload', assignee: grafikMember._id, assignedBy: grafikPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned' },
    { event: galleryTakeoverEvent._id, sourceClub: prClub._id, responsibleClub: grafikClub._id, type: 'gallery_upload', assignee: grafikPresident._id, assignedBy: grafikPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned', audit: [{ action: 'president_takeover', actor: grafikPresident._id, actorModel: 'Student', previousAssignee: grafikMember._id, takenOverBy: grafikPresident._id, note: 'Fixture takeover' }] },
    { event: approvedEvent._id, sourceClub: prClub._id, responsibleClub: prClub._id, type: 'attendance', assignee: prMember._id, assignedBy: prPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned' },
    { event: completedEvent._id, sourceClub: prClub._id, responsibleClub: prClub._id, type: 'social_media', assignee: prMember._id, assignedBy: prPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned' },
    { event: prTakeoverEvent._id, sourceClub: prClub._id, responsibleClub: prClub._id, type: 'attendance', assignee: prPresident._id, assignedBy: prPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned', audit: [{ action: 'president_takeover', actor: prPresident._id, actorModel: 'Student', previousAssignee: prMember._id, takenOverBy: prPresident._id, note: 'Fixture takeover' }] },
    { event: prTakeoverEvent._id, sourceClub: prClub._id, responsibleClub: prClub._id, type: 'social_media', assignee: prPresident._id, assignedBy: prPresident._id, assignedAt: new Date(), status: 'assigned', stage: 'assigned', audit: [{ action: 'president_takeover', actor: prPresident._id, actorModel: 'Student', previousAssignee: prMember._id, takenOverBy: prPresident._id, note: 'Fixture takeover' }] }
]);
await Registration.create({ event: approvedEvent._id, student: attendee._id });

console.log(JSON.stringify({
    password,
    accounts: {
        grafikPresident: grafikPresident.email,
        grafikMember: grafikMember.email,
        prPresident: prPresident.email,
        prMember: prMember.email
    }
}, null, 2));
await mongoose.disconnect();
