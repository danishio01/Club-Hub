import { ChatMistralAI } from "@langchain/mistralai";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import Event from '../models/eventModel.js';
import Student from '../models/studentModel.js';
import Registration from '../models/registrationModel.js';
import { sendEmailService } from './emailService.js';
import { HumanMessage, AIMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import dotenv from 'dotenv';

dotenv.config();

const updateEventDetailsTool = tool(
    async ({ eventId, venue, time, date }) => {
        try {
            const updateData = {};
            if (venue) updateData.venue = venue;
            if (time) updateData.time = time;
            if (date) updateData.date = date;

            const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true });
            if (!updatedEvent) return "ERROR: Event not found.";
            return `SUCCESS: Updated event. New details: Venue: ${updatedEvent.venue}, Time: ${updatedEvent.time}, Date: ${updatedEvent.date}`;
        } catch (err) {
            return `ERROR: Failed to update event. ${err.message}`;
        }
    },
    {
        name: "updateEventDetailsTool",
        description: "Updates the venue, time, or date of a specific event.",
        schema: z.object({
            eventId: z.string().describe("The ID of the event to update"),
            venue: z.string().optional().describe("The new venue"),
            time: z.string().optional().describe("The new time"),
            date: z.string().optional().describe("The new date")
        })
    }
);

const sendEmailToEventParticipantsTool = tool(
    async ({ eventId, subject, html }) => {
        try {
            const registrations = await Registration.find({ event: eventId }).populate('student');
            if (!registrations || registrations.length === 0) return "WARNING: No students registered for this event.";

            let successCount = 0;
            for (const reg of registrations) {
                if (reg.student && reg.student.email) {
                    try {
                        await sendEmailService({ to: reg.student.email, subject, html, text: html });
                        successCount++;
                    } catch (e) {}
                }
            }
            return `SUCCESS: Sent email to ${successCount} registered students.`;
        } catch (err) {
            return `ERROR: Failed to send emails. ${err.message}`;
        }
    },
    {
        name: "sendEmailToEventParticipantsTool",
        description: "Sends an email to all students registered for a specific event.",
        schema: z.object({
            eventId: z.string().describe("The ID of the event"),
            subject: z.string().describe("The email subject"),
            html: z.string().describe("The HTML content of the email")
        })
    }
);

const sendEmailToAllStudentsTool = tool(
    async ({ subject, html }) => {
        try {
            const students = await Student.find({});
            if (!students || students.length === 0) return "WARNING: No students found in the database.";

            let successCount = 0;
            for (const student of students) {
                if (student.email) {
                    try {
                        await sendEmailService({ to: student.email, subject, html, text: html });
                        successCount++;
                    } catch (e) {}
                }
            }
            return `SUCCESS: Sent email to all ${successCount} onboarded students.`;
        } catch (err) {
            return `ERROR: Failed to send mass email. ${err.message}`;
        }
    },
    {
        name: "sendEmailToAllStudentsTool",
        description: "Sends an email to every student in the database.",
        schema: z.object({
            subject: z.string().describe("The email subject"),
            html: z.string().describe("The HTML content of the email")
        })
    }
);

const tools = [updateEventDetailsTool, sendEmailToEventParticipantsTool, sendEmailToAllStudentsTool];

const model = new ChatMistralAI({
    model: "mistral-medium-latest",
    apiKey: process.env.MISTRAL_API_KEY,
    temperature: 0.2,
    maxTokens: 600
});

const llmWithTools = model.bindTools(tools);

export const processAiChat = async (history, mode, eventId, io, socketId) => {
    const currentTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'long' });

    let systemInstruction = `You are a helpful administrative assistant for ClubHub. You can send emails and update events. CRITICAL RULE: Keep all responses concise, direct, and strictly under 300 words. Do not output long lists unless explicitly asked. The current system date and time is ${currentTime}.`;
    
    if (mode === 'Event Specific' && eventId) {
        const eventData = await Event.findById(eventId).populate('club');
        const participantCount = await Registration.countDocuments({ event: eventId });
        
        systemInstruction += ` You are managing this specific event:
        - ID: ${eventId}
        - Title: ${eventData.title}
        - Venue: ${eventData.venue}
        - Date: ${new Date(eventData.date).toLocaleDateString()}
        - Time: ${eventData.time}
        - Club: ${eventData.club?.name || 'N/A'}
        - Participants: ${participantCount}
        
        ALWAYS use these specific details if you need to email students about venue changes, dates, or timings.`;
    }

    const formattedMessages = [new SystemMessage(systemInstruction)];

    history.forEach(msg => {
        if (msg.role === 'user') formattedMessages.push(new HumanMessage(msg.content));
        if (msg.role === 'ai') formattedMessages.push(new AIMessage(msg.content));
    });

    let isDone = false;
    let finalResponse = "";

    while (!isDone) {
        const stream = await llmWithTools.stream(formattedMessages);
        let aiMsgChunk = null;
        let accumulatedText = "";

        for await (const chunk of stream) {
            if (!aiMsgChunk) {
                aiMsgChunk = chunk;
            } else {
                aiMsgChunk = aiMsgChunk.concat(chunk);
            }

            if (chunk.content) {
                accumulatedText += chunk.content;
                if (io && socketId) {
                    io.to(socketId).emit('chat_stream', { text: accumulatedText });
                }
            }
        }

        formattedMessages.push(aiMsgChunk);

        if (aiMsgChunk.tool_calls && aiMsgChunk.tool_calls.length > 0) {
            for (const toolCall of aiMsgChunk.tool_calls) {
                const selectedTool = tools.find(t => t.name === toolCall.name);
                let toolResult;
                try {
                    toolResult = await selectedTool.invoke(toolCall.args);
                } catch (err) {
                    toolResult = `ERROR: Failed to execute tool. ${err.message}`;
                }
                formattedMessages.push(new ToolMessage({
                    tool_call_id: toolCall.id,
                    content: String(toolResult)
                }));
            }
        } else {
            finalResponse = aiMsgChunk.content;
            isDone = true;
        }
    }

    return finalResponse;
};

// NEW FUNCTION: Generate Event Form Details
export const generateEventDetailsFromPrompt = async (promptText) => {
    const jsonModel = new ChatMistralAI({
        model: "mistral-medium-latest",
        apiKey: process.env.MISTRAL_API_KEY,
        temperature: 0.2
    });

    const currentDate = new Date().toISOString().split('T')[0];

    // Using \x60 to represent backticks safely in AST parsers without breaking syntax highlighting
    const systemPrompt = `You are an AI event planning assistant for ClubHub.
    Extract and generate event details from the user's input.
    Respond ONLY with a raw JSON object. Do NOT wrap the response in markdown blocks like \x60\x60\x60json. Just output the raw JSON object.
    
    Rules:
    1. "title": Generate a professional, catchy event name based on the prompt. (ALWAYS FILL)
    2. "description": Generate a 2-3 sentence engaging description. (ALWAYS FILL)
    3. "tags": Select 3-5 relevant tags from this exact list ONLY: ['Coding', 'Development', 'AI', 'Problem Solving', 'Tech Talk', 'Editing', 'Photography', 'Content Creation', 'Games', 'Dance', 'Music', 'Entertainment', 'Interaction', 'Social Media', 'Promotion']. (ALWAYS FILL)
    4. "date": Extract date if mentioned (format: YYYY-MM-DD). If no year is mentioned, assume current or next upcoming relative to today (${currentDate}). If absolutely no date is mentioned, return an empty string "".
    5. "time": Extract time if mentioned (format: HH:mm in 24h). If not mentioned, return empty string "".
    6. "venue": Extract venue name if mentioned. If not mentioned, return empty string "".
    7. "eventType": "Free" or "Paid". Default to "Free" unless cost is mentioned.
    8. "maxParticipants": Extract the number of participants if mentioned. If not mentioned, return an empty string "".

    Ensure keys exactly match the names above.`;

    try {
        const response = await jsonModel.invoke([
            new SystemMessage(systemPrompt),
            new HumanMessage(promptText)
        ]);

        // Clean any accidental markdown blocks the LLM hallucinates (using \x60 to prevent parser crash)
        let jsonStr = response.content.replace(/\x60\x60\x60json/gi, '').replace(/\x60\x60\x60/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        throw new Error("Failed to parse event details from AI response.");
    }
};