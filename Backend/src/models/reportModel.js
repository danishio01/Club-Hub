import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, unique: true },
    president: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    club: { type: mongoose.Schema.Types.ObjectId, ref: 'Club', required: true },
    content: {
        activityName: { type: String, default: '' },
        thrustArea: { type: String, default: '' },
        level: { type: String, default: '' },
        semester: { type: String, default: '' },
        quarter: { type: String, default: '' },
        date: { type: String, default: '' },
        duration: { type: String, default: '' },
        facultyCount: { type: String, default: '' },
        studentCount: { type: String, default: '' },
        fundsUtilized: { type: String, default: '' },
        department: { type: String, default: '' },
        objective: { type: String, default: '' },
        summary: { type: String, default: '' },
        benefits: { type: String, default: '' },
        resourcePersons: [{
            name: { type: String, default: '' },
            industry: { type: String, default: '' },
            designation: { type: String, default: '' },
            mobile: { type: String, default: '' },
            email: { type: String, default: '' },
            address: { type: String, default: '' }
        }],
        facultyCoordinators: { type: String, default: '' },
        studentCoordinators: { type: String, default: '' }
    },
    status: { type: String, enum: ['draft', 'submitted', 'reviewed'], default: 'draft' },
    adminRemarks: { type: String, default: '' },
    pdfUrl: { type: String, default: null },
    submittedAt: { type: Date, default: null },
    reviewedAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model('Report', reportSchema);