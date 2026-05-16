import { processAiChat, generateEventDetailsFromPrompt } from '../services/aiService.js';

export const handleAiChat = async (req, res) => {
    try {
        const { history, mode, eventId, socketId } = req.body;
        const io = req.app.get('io');
        
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation history.' });
        }

        const reply = await processAiChat(history, mode, eventId, io, socketId);
        
        return res.status(200).json({ success: true, data: reply });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const generateEventDetails = async (req, res) => {
    try {
        const { prompt } = req.body;
        
        if (!prompt || prompt.trim() === '') {
            return res.status(400).json({ success: false, message: 'Prompt text is required.' });
        }

        const generatedData = await generateEventDetailsFromPrompt(prompt);
        return res.status(200).json({ success: true, data: generatedData });
    } catch (error) {
        console.error("AI Generation Controller Error:", error);
        return res.status(500).json({ success: false, message: 'Failed to generate event details. Please try again.' });
    }
};