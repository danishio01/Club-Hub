import Student from '../models/studentModel.js';
import bcrypt from 'bcrypt';

export const createStudent = async (req, res) => {
    try {
        const student = new Student(req.body);
        await student.save();
        return res.status(201).json({ success: true, data: student });
    } catch (error) {
        console.error("Detailed Error:", error.message);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createManyStudents = async (req, res) => {
    try {
        const studentsData = req.body.students;
        const salt = await bcrypt.genSalt(10);
        
        const hashedStudents = await Promise.all(studentsData.map(async (student) => {
            const hashedPassword = await bcrypt.hash(student.password, salt);
            return { ...student, password: hashedPassword };
        }));

        const students = await Student.insertMany(hashedStudents);
        return res.status(201).json({ success: true, data: students });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to bulk create students' });
    }
};

export const getStudents = async (req, res) => {
    try {
        const { semester, section, department, search } = req.query;
        const filter = {};
        
        if (semester) filter.semester = semester;
        if (section) filter.section = section;
        if (department) filter.department = department;
        
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { usn: { $regex: search, $options: 'i' } }
            ];
        }

        const students = await Student.find(filter).select('-password').sort({ usn: 1 });
        return res.status(200).json({ success: true, data: students });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch students' });
    }
};

export const updateStudent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = { ...req.body };
        
        if (updateData.password) {
            const salt = await bcrypt.genSalt(10);
            updateData.password = await bcrypt.hash(updateData.password, salt);
        } else {
            delete updateData.password; 
        }

        const student = await Student.findByIdAndUpdate(id, updateData, { new: true }).select('-password');
        return res.status(200).json({ success: true, data: student });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update student' });
    }
};

export const bulkUpdateStudents = async (req, res) => {
    try {
        const { criteria, updateData } = req.body;
        
        const result = await Student.updateMany(criteria, updateData);
        
        return res.status(200).json({ 
            success: true, 
            message: `${result.modifiedCount} students updated successfully` 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to bulk update students' });
    }
};

export const deleteStudent = async (req, res) => {
    try {
        const { id } = req.params;
        await Student.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: 'Student deleted successfully' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to delete student' });
    }
};
export const updateStudentInterests = async (req, res) => {
    try {
        const { id } = req.params;
        const { interests } = req.body;
        
        const student = await Student.findByIdAndUpdate(
            id, 
            { interests }, 
            { new: true }
        ).select('-password');
        
        return res.status(200).json({ success: true, data: student });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, message: 'Failed to update interests' });
    }
};