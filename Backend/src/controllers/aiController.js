import { processAiChat } from '../services/aiService.js';

export const handleAiChat = async (req, res) => {
    try {
        const { history, mode, eventId } = req.body;
        
        if (!history || !Array.isArray(history)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation history.' });
        }

        const reply = await processAiChat(history, mode, eventId);
        
        return res.status(200).json({ success: true, data: reply });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};