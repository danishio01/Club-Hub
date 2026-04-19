import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
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
        const updateData = {};
        if (venue) updateData.venue = venue;
        if (time) updateData.time = time;
        if (date) updateData.date = date;

        const updatedEvent = await Event.findByIdAndUpdate(eventId, updateData, { new: true });
        if (!updatedEvent) return "Event not found.";
        return `Successfully updated event. New details: Venue: ${updatedEvent.venue}, Time: ${updatedEvent.time}, Date: ${updatedEvent.date}`;
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
        const registrations = await Registration.find({ event: eventId }).populate('student');
        if (!registrations || registrations.length === 0) return "No students registered for this event.";

        let successCount = 0;
        for (const reg of registrations) {
            if (reg.student && reg.student.email) {
                try {
                    await sendEmailService({ to: reg.student.email, subject, html, text: html });
                    successCount++;
                } catch (e) {
                    console.error(e);
                }
            }
        }
        return `Successfully sent email to ${successCount} registered students.`;
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
        const students = await Student.find({});
        if (!students || students.length === 0) return "No students found in the database.";

        let successCount = 0;
        for (const student of students) {
            if (student.email) {
                try {
                    await sendEmailService({ to: student.email, subject, html, text: html });
                    successCount++;
                } catch (e) {
                    console.error(e);
                }
            }
        }
        return `Successfully sent email to all ${successCount} onboarded students.`;
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

const model = new ChatGoogleGenerativeAI({
    model: "gemini-3.1-flash-lite-preview",
    apiKey: process.env.GEMINI_API_KEY,
    temperature: 0.2
});

const llmWithTools = model.bindTools(tools);

export const processAiChat = async (history, mode, eventId) => {
    let systemInstruction = "You are a helpful administrative assistant for ClubHub. You can send emails and update events.";
    if (mode === 'Event Specific' && eventId) {
        systemInstruction += ` You are currently managing the event with ID: ${eventId}. Use this ID when calling tools for this event.`;
    }

    const formattedMessages = [new SystemMessage(systemInstruction)];

    history.forEach(msg => {
        if (msg.role === 'user') formattedMessages.push(new HumanMessage(msg.content));
        if (msg.role === 'ai') formattedMessages.push(new AIMessage(msg.content));
    });

    let aiMsg = await llmWithTools.invoke(formattedMessages);
    formattedMessages.push(aiMsg);

    while (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
        for (const toolCall of aiMsg.tool_calls) {
            const selectedTool = tools.find(t => t.name === toolCall.name);
            const toolResult = await selectedTool.invoke(toolCall.args);
            formattedMessages.push(new ToolMessage({
                tool_call_id: toolCall.id,
                content: String(toolResult)
            }));
        }
        aiMsg = await llmWithTools.invoke(formattedMessages);
        formattedMessages.push(aiMsg);
    }

    return aiMsg.content;
};