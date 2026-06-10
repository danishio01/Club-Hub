import Registration from '../models/registrationModel.js';
import Event from '../models/eventModel.js';
import Student from '../models/studentModel.js';
import { ChatMistralAI } from "@langchain/mistralai";
import { HumanMessage } from "@langchain/core/messages";

export const getEventFeedbackTemplate = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId).select('title feedbackTemplateType feedbackQuestions');
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });
        
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch feedback template' });
    }
};

export const submitStudentFeedback = async (req, res) => {
    try {
        const { eventId } = req.params;
        const { responses, overallRating } = req.body;
        const studentId = req.user._id;

        const registration = await Registration.findOne({ event: eventId, student: studentId });
        
        if (!registration || !['Scanned', 'Attended'].includes(registration.status)) {
            return res.status(400).json({ success: false, message: 'Must scan QR code at the event before reviewing.' });
        }

        registration.feedbackResponses = responses;
        registration.rating = overallRating; 
        registration.feedbackSubmittedAt = new Date();
        
        if (registration.status === 'Scanned') {
            registration.status = 'Attended';
            await Student.findByIdAndUpdate(studentId, { $inc: { points: 100 } });
        }
        
        await registration.save();
        
        return res.status(200).json({ success: true, message: 'Feedback submitted successfully! 100 points awarded.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to submit feedback' });
    }
};

export const getFeedbackAnalytics = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await Event.findById(eventId);
        
        if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

        if (req.user?.isClubMember && event.creator?.student?.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Unauthorized: You can only view analytics for your own events.' });
        }

        const registrations = await Registration.find({ event: eventId, feedbackResponses: { $exists: true, $not: {$size: 0} } })
            .populate('student', 'name usn');

        const totalResponses = registrations.length;
        if (totalResponses === 0) {
            return res.status(200).json({ success: true, data: { total: 0 } });
        }

        let totalScore = 0;
        const questionStats = {};

        registrations.forEach(reg => {
            if (reg.rating) totalScore += reg.rating;

            reg.feedbackResponses.forEach(res => {
                if (!questionStats[res.questionId]) {
                    questionStats[res.questionId] = { text: res.questionText, answers: [] };
                }
                if (Array.isArray(res.answer)) {
                    questionStats[res.questionId].answers.push(...res.answer);
                } else {
                    questionStats[res.questionId].answers.push(res.answer);
                }
            });
        });

        const averageRating = (totalScore / totalResponses).toFixed(1);

        const analytics = Object.keys(questionStats).map(qId => {
            const data = questionStats[qId];
            const isNumeric = data.answers.every(a => typeof a === 'number');
            
            if (isNumeric) {
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                data.answers.forEach(a => { counts[a] += 1; });
                const sum = data.answers.reduce((a, b) => a + b, 0);
                return { id: qId, text: data.text, type: 'rating', average: (sum / data.answers.length).toFixed(1), breakdown: counts };
            } else {
                const counts = {};
                data.answers.forEach(a => {
                    counts[a] = (counts[a] || 0) + 1;
                });
                return { id: qId, text: data.text, type: 'mcq_or_text', breakdown: counts, rawAnswers: data.answers };
            }
        });

        return res.status(200).json({ 
            success: true, 
            data: { 
                eventDetails: { title: event.title, date: event.date, venue: event.venue },
                total: totalResponses, 
                averageRating, 
                analytics,
                rawRegistrations: registrations
            } 
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch analytics' });
    }
};

export const generateFeedbackSummary = async (req, res) => {
    try {
        const { eventId } = req.params;
        const registrations = await Registration.find({ event: eventId, feedbackResponses: { $exists: true, $not: {$size: 0} } });
        
        if (registrations.length === 0) return res.status(400).json({ success: false, message: 'No feedback to summarize.' });

        let allTextResponses = [];
        registrations.forEach(reg => {
            reg.feedbackResponses.forEach(res => {
                if (typeof res.answer === 'string' && res.answer.length > 5) {
                    allTextResponses.push(`Q: ${res.questionText} | A: ${res.answer}`);
                } else if (Array.isArray(res.answer)) {
                    allTextResponses.push(`Q: ${res.questionText} | A: ${res.answer.join(', ')}`);
                }
            });
        });

        if (allTextResponses.length === 0) {
            return res.status(400).json({ success: false, message: 'No text responses to summarize.' });
        }

        const reviewTexts = allTextResponses.join('\n');
        const model = new ChatMistralAI({ model: "mistral-medium-latest", apiKey: process.env.MISTRAL_API_KEY });
        
        const promptText = `Analyze the following event feedback from students:
        "${reviewTexts}"
        
        Provide a structured summary in Markdown format with exactly these headings:
        ### 🌟 Key Strengths
        ### 📈 Areas of Improvement
        ### 💡 Common Suggestions
        ### 📊 Overall Sentiment
        
        Be concise, professional, and actionable. Only use the provided feedback. Do not hallucinate.`;

        const response = await model.invoke([new HumanMessage(promptText)]);
        return res.status(200).json({ success: true, data: response.content });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate summary' });
    }
};