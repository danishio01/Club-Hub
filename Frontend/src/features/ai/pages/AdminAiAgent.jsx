import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import axiosInstance from '../../../api/axiosInstance';
import '../style/AdminAiAgent.scss';

const AdminAiAgent = () => {
    const [events, setEvents] = useState([]);
    const [mode, setMode] = useState('General Chat');
    const [selectedEventId, setSelectedEventId] = useState('');
    const [messages, setMessages] = useState([
        { id: 'initial-msg', role: 'ai', content: 'Hello! I am your AI assistant. How can I help you manage ClubHub today?' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const chatEndRef = useRef(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const response = await axiosInstance.get('/events');
                setEvents(response.data.data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchEvents();
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMsg = { id: `user-${Date.now()}`, role: 'user', content: inputValue.trim() };
        const newHistory = [...messages, userMsg];
        
        setMessages(newHistory);
        setInputValue('');
        setIsLoading(true);

        const historyForApi = newHistory.map(msg => ({
            role: msg.role,
            content: msg.content
        }));

        try {
            const response = await axiosInstance.post('/ai/chat', {
                history: historyForApi,
                mode,
                eventId: mode === 'Event Specific' ? selectedEventId : null
            });

            setMessages([...newHistory, { id: `ai-${Date.now()}`, role: 'ai', content: response.data.data }]);
        } catch (error) {
            console.error(error)
            setMessages([...newHistory, { id: `error-${Date.now()}`, role: 'ai', content: 'Error: Failed to process request.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="ai-agent-page">
            <div className="agent-header">
                <div className="header-info">
                    <h2><i className="ri-robot-2-line" style={{ color: '#2563eb' }}></i> AI Assistant</h2>
                    <p>Automate emails and event updates using Gemini.</p>
                </div>
                <div className="agent-controls">
                    <select value={mode} onChange={(e) => setMode(e.target.value)}>
                        <option value="General Chat">General Chat</option>
                        <option value="Event Specific">Event Specific</option>
                    </select>
                    {mode === 'Event Specific' && (
                        <select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)}>
                            <option value="">Select Event...</option>
                            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="chat-window">
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.role}`}>
                        {msg.role === 'ai' ? (
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                            </ReactMarkdown>
                        ) : (
                            msg.content
                        )}
                    </div>
                ))}
                
                {isLoading && (
                    <div key="loading-indicator" className="message ai typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                )}
                
                <div ref={chatEndRef} />
            </div>

            <div className="chat-input-area">
                <input 
                    type="text" 
                    placeholder="E.g., Send an email to everyone about the new guidelines..." 
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading || (mode === 'Event Specific' && !selectedEventId)}
                />
                <button onClick={handleSend} disabled={isLoading || (mode === 'Event Specific' && !selectedEventId)}>
                    <i className="ri-send-plane-fill"></i> Send
                </button>
            </div>
        </div>
    );
};

export default AdminAiAgent;