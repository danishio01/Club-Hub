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

        const questionStats = {};

        registrations.forEach(reg => {
            reg.feedbackResponses.forEach(res => {
                if (!questionStats[res.questionId]) {
                    const templateQ = event.feedbackQuestions?.find(q => q.id === res.questionId);
                    const qType = templateQ ? templateQ.type : (typeof res.answer === 'number' ? 'rating' : (Array.isArray(res.answer) || ['Yes', 'No'].includes(res.answer) ? 'mcq' : 'paragraph'));
                    
                    questionStats[res.questionId] = { text: res.questionText, type: qType, answers: [] };
                }
                
                if (Array.isArray(res.answer)) {
                    questionStats[res.questionId].answers.push(...res.answer);
                } else {
                    questionStats[res.questionId].answers.push(res.answer);
                }
            });
        });

        const analytics = Object.keys(questionStats).map(qId => {
            const data = questionStats[qId];
            
            if (data.type === 'rating') {
                const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
                data.answers.forEach(a => { if (typeof a === 'number') counts[a] += 1; });
                const sum = data.answers.reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
                const avg = data.answers.length > 0 ? (sum / data.answers.length).toFixed(1) : 0;
                return { id: qId, text: data.text, type: 'rating', average: avg, breakdown: counts };
            } 
            else if (data.type === 'mcq') {
                const counts = {};
                data.answers.forEach(a => {
                    if (a) { counts[a] = (counts[a] || 0) + 1; }
                });
                return { id: qId, text: data.text, type: 'mcq', breakdown: counts };
            } 
            else {
                return { id: qId, text: data.text, type: 'paragraph', rawAnswers: data.answers.filter(a => typeof a === 'string' && a.trim() !== '') };
            }
        });

        return res.status(200).json({ 
            success: true, 
            data: { 
                eventDetails: { title: event.title, date: event.date, venue: event.venue },
                total: totalResponses, 
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

        let allResponses = [];
        registrations.forEach(reg => {
            reg.feedbackResponses.forEach(res => {
                if (typeof res.answer === 'string') {
                    allResponses.push(`Q: ${res.questionText} | A: ${res.answer}`);
                } else if (Array.isArray(res.answer)) {
                    allResponses.push(`Q: ${res.questionText} | A: ${res.answer.join(', ')}`);
                } else if (typeof res.answer === 'number') {
                    allResponses.push(`Q: ${res.questionText} | A: ${res.answer}/5 Stars`);
                }
            });
        });

        if (allResponses.length === 0) {
            return res.status(400).json({ success: false, message: 'No responses to summarize.' });
        }

        const reviewTexts = allResponses.join('\n');
        const model = new ChatMistralAI({ model: "mistral-medium-latest", apiKey: process.env.MISTRAL_API_KEY });
        
        const promptText = `Analyze all the following event feedback from students (which includes ratings, multiple choice answers, and text):
        "${reviewTexts}"
        
        Provide a structured summary in Markdown format with exactly these headings:
        ### 🌟 Strengths
        ### 📈 Weaknesses
        ### 💡 Common Suggestions
        ### 🗣️ Common Praises
        ### 📊 Overall Sentiment
        
        Be concise, professional, and actionable. Only use the provided feedback. Analyze everything holistically. Do not hallucinate.`;

        const response = await model.invoke([new HumanMessage(promptText)]);
        return res.status(200).json({ success: true, data: response.content });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to generate summary' });
    }
};