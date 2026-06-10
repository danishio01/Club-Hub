import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createEventService, generateEventFromAIApi } from '../service/eventService';
import { getClubsList } from '../../clubs/service/clubService';
import '../../students/style/StudentModals.scss';
import '../style/EventModals.scss';

const AVAILABLE_TAGS = [
    'Coding', 'Development', 'AI', 'Problem Solving', 'Tech Talk', 
    'Editing', 'Photography', 'Content Creation', 'Games', 'Dance', 
    'Music', 'Entertainment', 'Interaction', 'Social Media', 'Promotion'
];

const DEFAULT_FEEDBACK_QUESTIONS = [
    { id: 'q1', type: 'rating', text: 'Overall Event Rating', order: 0, conditionalLogic: { threshold: 3, ifLessOrEqual: [{ id: 'q1_1', type: 'paragraph', text: 'What disappointed you the most?' }, { id: 'q1_2', type: 'paragraph', text: 'What should we improve next time?' }], ifGreater: [{ id: 'q1_3', type: 'paragraph', text: 'What did you enjoy the most?' }, { id: 'q1_4', type: 'paragraph', text: 'Would you recommend future events?' }] } },
    { id: 'q2', type: 'rating', text: 'Time Management Rating', order: 1, conditionalLogic: { threshold: 3, ifLessOrEqual: [], ifGreater: [] } },
    { id: 'q3', type: 'mcq', text: 'Are you satisfied with this event?', order: 2, options: ['Yes', 'No'], allowMultiple: false }
];

const FeedbackBuilder = ({ questions, setQuestions }) => {
    const sortedQuestions = [...questions].sort((a, b) => (a.order || 0) - (b.order || 0));

    const updateQuestion = (qId, field, value) => {
        setQuestions(questions.map(q => q.id === qId ? { ...q, [field]: value } : q));
    };

    const updateLogicThreshold = (qId, value) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.conditionalLogic) {
                return { ...q, conditionalLogic: { ...q.conditionalLogic, threshold: Number(value) } };
            }
            return q;
        }));
    };

    const addFollowUp = (qId, conditionArray) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.conditionalLogic) {
                const newLogic = { ...q.conditionalLogic };
                newLogic[conditionArray] = [...(newLogic[conditionArray] || []), { id: `f_${Date.now()}`, type: 'paragraph', text: '' }];
                return { ...q, conditionalLogic: newLogic };
            }
            return q;
        }));
    };

    const updateFollowUp = (qId, conditionArray, followUpId, text) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.conditionalLogic) {
                const newLogic = { ...q.conditionalLogic };
                newLogic[conditionArray] = newLogic[conditionArray].map(f => f.id === followUpId ? { ...f, text } : f);
                return { ...q, conditionalLogic: newLogic };
            }
            return q;
        }));
    };

    const removeFollowUp = (qId, conditionArray, followUpId) => {
        setQuestions(questions.map(q => {
            if (q.id === qId && q.conditionalLogic) {
                const newLogic = { ...q.conditionalLogic };
                newLogic[conditionArray] = newLogic[conditionArray].filter(f => f.id !== followUpId);
                return { ...q, conditionalLogic: newLogic };
            }
            return q;
        }));
    };

    const updateOptions = (qId, options) => {
        setQuestions(questions.map(q => q.id === qId ? { ...q, options } : q));
    };

    const removeQuestion = (qId) => {
        setQuestions(questions.filter(q => q.id !== qId));
    };

    const addQuestion = (type) => {
        const newQ = { id: `q_${Date.now()}`, type, text: '', order: questions.length };
        if (type === 'mcq') {
            newQ.options = ['Option 1'];
            newQ.allowMultiple = false;
        }
        if (type === 'rating') newQ.conditionalLogic = { threshold: 3, ifLessOrEqual: [], ifGreater: [] };
        setQuestions([...questions, newQ]);
    };

    const moveQuestion = (index, direction) => {
        if ((direction === -1 && index === 0) || (direction === 1 && index === sortedQuestions.length - 1)) return;
        const newQuestions = [...sortedQuestions];
        const temp = newQuestions[index];
        newQuestions[index] = newQuestions[index + direction];
        newQuestions[index + direction] = temp;
        
        const updatedWithOrder = newQuestions.map((q, idx) => ({ ...q, order: idx }));
        setQuestions(updatedWithOrder);
    };

    const moveOption = (qId, optionIndex, direction) => {
        setQuestions(questions.map(q => {
            if (q.id !== qId) return q;
            if ((direction === -1 && optionIndex === 0) || (direction === 1 && optionIndex === q.options.length - 1)) return q;
            
            const newOptions = [...q.options];
            const temp = newOptions[optionIndex];
            newOptions[optionIndex] = newOptions[optionIndex + direction];
            newOptions[optionIndex + direction] = temp;
            
            return { ...q, options: newOptions };
        }));
    };

    return (
        <div className="feedback-builder">
            {sortedQuestions.map((q, index) => (
                <div key={q.id} className="question-card">
                    <div className="question-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>Q{index + 1}. {q.type.toUpperCase()}</span>
                            <div className="move-controls">
                                <button type="button" onClick={() => moveQuestion(index, -1)} disabled={index === 0}><i className="ri-arrow-up-s-line"></i></button>
                                <button type="button" onClick={() => moveQuestion(index, 1)} disabled={index === sortedQuestions.length - 1}><i className="ri-arrow-down-s-line"></i></button>
                            </div>
                        </div>
                        <button type="button" className="btn-del-question" onClick={() => removeQuestion(q.id)}>Remove</button>
                    </div>
                    
                    <input 
                        type="text" 
                        className="q-text" 
                        placeholder="Question text..." 
                        value={q.text} 
                        onChange={(e) => updateQuestion(q.id, 'text', e.target.value)} 
                    />

                    {q.type === 'mcq' && (
                        <div className="options-section">
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569', marginBottom: '8px' }}>
                                <input type="checkbox" checked={q.allowMultiple || false} onChange={(e) => updateQuestion(q.id, 'allowMultiple', e.target.checked)} />
                                Allow multiple selections
                            </label>
                            {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="option-row">
                                    <div className="move-controls small">
                                        <button type="button" onClick={() => moveOption(q.id, oIdx, -1)} disabled={oIdx === 0}><i className="ri-arrow-up-s-line"></i></button>
                                        <button type="button" onClick={() => moveOption(q.id, oIdx, 1)} disabled={oIdx === q.options.length - 1}><i className="ri-arrow-down-s-line"></i></button>
                                    </div>
                                    <input 
                                        type="text" 
                                        value={opt} 
                                        onChange={(e) => {
                                            const newOpts = [...q.options];
                                            newOpts[oIdx] = e.target.value;
                                            updateOptions(q.id, newOpts);
                                        }} 
                                    />
                                    <button type="button" onClick={() => updateOptions(q.id, q.options.filter((_, i) => i !== oIdx))}>
                                        <i className="ri-close-line"></i>
                                    </button>
                                </div>
                            ))}
                            <button type="button" className="btn-add-option" onClick={() => updateOptions(q.id, [...q.options, `Option ${q.options.length + 1}`])}>
                                + Add Option
                            </button>
                        </div>
                    )}

                    {q.type === 'rating' && q.conditionalLogic && (
                        <div className="logic-section">
                            <div className="threshold-row">
                                <label>Threshold Logic:</label>
                                <select value={q.conditionalLogic.threshold} onChange={(e) => updateLogicThreshold(q.id, e.target.value)}>
                                    <option value={1}>If Rating &lt;= 1</option>
                                    <option value={2}>If Rating &lt;= 2</option>
                                    <option value={3}>If Rating &lt;= 3</option>
                                    <option value={4}>If Rating &lt;= 4</option>
                                </select>
                            </div>
                            
                            <div className="condition-box">
                                <h4>Follow-up if rating &lt;= {q.conditionalLogic.threshold}</h4>
                                {q.conditionalLogic.ifLessOrEqual.map(f => (
                                    <div key={f.id} className="followup-item">
                                        <input type="text" placeholder="Paragraph question text..." value={f.text} onChange={(e) => updateFollowUp(q.id, 'ifLessOrEqual', f.id, e.target.value)} />
                                        <button type="button" onClick={() => removeFollowUp(q.id, 'ifLessOrEqual', f.id)}><i className="ri-delete-bin-line"></i></button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-followup" onClick={() => addFollowUp(q.id, 'ifLessOrEqual')}>+ Add Follow-up</button>
                            </div>

                            <div className="condition-box">
                                <h4>Follow-up if rating &gt; {q.conditionalLogic.threshold}</h4>
                                {q.conditionalLogic.ifGreater.map(f => (
                                    <div key={f.id} className="followup-item">
                                        <input type="text" placeholder="Paragraph question text..." value={f.text} onChange={(e) => updateFollowUp(q.id, 'ifGreater', f.id, e.target.value)} />
                                        <button type="button" onClick={() => removeFollowUp(q.id, 'ifGreater', f.id)}><i className="ri-delete-bin-line"></i></button>
                                    </div>
                                ))}
                                <button type="button" className="btn-add-followup" onClick={() => addFollowUp(q.id, 'ifGreater')}>+ Add Follow-up</button>
                            </div>
                        </div>
                    )}
                </div>
            ))}

            <div className="builder-actions">
                <button type="button" onClick={() => addQuestion('rating')}><i className="ri-star-line"></i> Add Rating</button>
                <button type="button" onClick={() => addQuestion('mcq')}><i className="ri-list-radio"></i> Add Choice</button>
                <button type="button" onClick={() => addQuestion('paragraph')}><i className="ri-text"></i> Add Paragraph</button>
            </div>
        </div>
    );
};

const AddEventModal = ({ onClose, onSuccess }) => {
    const dispatch = useDispatch();
    const { clubs } = useSelector((state) => state.clubs);
    const { user } = useSelector((state) => state.auth);
    
    const [formData, setFormData] = useState({
        title: '', club: '', description: '', tags: [],
        date: '', time: '', venue: '', eventType: 'Free',
        price: 0, maxParticipants: '',
        feedbackTemplateType: 'default',
        feedbackQuestions: JSON.parse(JSON.stringify(DEFAULT_FEEDBACK_QUESTIONS))
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);

    useEffect(() => {
        if (user?.role === 'admin') {
            dispatch(getClubsList());
        }
    }, [dispatch, user]);

    useEffect(() => {
        if (formData.feedbackTemplateType === 'default') {
            setFormData(prev => ({ ...prev, feedbackQuestions: JSON.parse(JSON.stringify(DEFAULT_FEEDBACK_QUESTIONS)) }));
        } else {
            setFormData(prev => ({ ...prev, feedbackQuestions: [] }));
        }
    }, [formData.feedbackTemplateType]);

    const activeClubs = clubs.filter(c => c.isActive);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleTagChange = (tag) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag) 
                ? prev.tags.filter(t => t !== tag) 
                : [...prev.tags, tag]
        }));
    };

    const handleAiGenerate = async () => {
        if (!aiPrompt.trim()) return;
        
        setIsGeneratingAI(true);
        try {
            const generatedData = await generateEventFromAIApi(aiPrompt);
            
            setFormData(prev => ({
                ...prev,
                title: generatedData.title || prev.title,
                description: generatedData.description || prev.description,
                tags: generatedData.tags && generatedData.tags.length > 0 ? generatedData.tags : prev.tags,
                date: generatedData.date || prev.date,
                time: generatedData.time || prev.time,
                venue: generatedData.venue || prev.venue,
                eventType: generatedData.eventType || prev.eventType,
                price: generatedData.price !== undefined && generatedData.price !== null ? Number(generatedData.price) : prev.price,
                maxParticipants: generatedData.maxParticipants ? String(generatedData.maxParticipants) : prev.maxParticipants
            }));
            
            setAiPrompt('');
        } catch (error) {
            console.error(error);
            alert("Failed to generate event details. Please ensure your prompt is clear and try again.");
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.tags.length === 0) return alert('Please select at least one tag.');
        
        setIsLoading(true);
        try {
            const dataToSubmit = { ...formData };
            dataToSubmit.feedbackQuestions = dataToSubmit.feedbackQuestions.map((q, idx) => ({ ...q, order: idx }));
            
            if (user?.role === 'president' || user?.isClubMember) {
                delete dataToSubmit.club; 
            }
            await createEventService(dataToSubmit);
            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Failed to add event.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-container large">
                <div className="modal-header">
                    <h2>Create New Event</h2>
                    <button className="close-button" onClick={onClose}><i className="ri-close-line"></i></button>
                </div>
                
                <div className="modal-body-scrollable">
                    {(user?.role === 'president' || user?.isClubMember) && (
                        <div className="ai-assistant-card">
                            <div className="ai-header">
                                <i className="ri-sparkling-fill"></i>
                                <span>AI Event Auto-Fill</span>
                            </div>
                            <div className="ai-input-group">
                                <textarea 
                                    className="ai-textarea"
                                    placeholder="Describe your event... e.g. 'Conduct a singing competition on May 17 at GCEM Ground with ₹200 entry fee and max 150 participants.'"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    disabled={isGeneratingAI}
                                />
                                <button 
                                    type="button" 
                                    className="btn-ai-generate" 
                                    onClick={handleAiGenerate} 
                                    disabled={isGeneratingAI || !aiPrompt.trim()}
                                >
                                    {isGeneratingAI ? (
                                        <><i className="ri-loader-4-line spin-icon"></i> Generating...</>
                                    ) : (
                                        <><i className="ri-magic-line"></i> Generate</>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="event-creation-form">
                        <div className="form-row">
                            <div className="form-group">
                                <label>Event Name</label>
                                <input type="text" name="title" required value={formData.title} onChange={handleChange} />
                            </div>
                            {user?.role === 'admin' && (
                                <div className="form-group">
                                    <label>Organizing Club</label>
                                    <select name="club" required value={formData.club} onChange={handleChange}>
                                        <option value="">Select an Active Club</option>
                                        {activeClubs.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea name="description" rows="3" required value={formData.description} onChange={handleChange}></textarea>
                        </div>

                        <div className="form-group">
                            <label>Event Tags</label>
                            <div className="tags-grid">
                                {AVAILABLE_TAGS.map(tag => (
                                    <label key={tag} className="tag-checkbox">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.tags.includes(tag)} 
                                            onChange={() => handleTagChange(tag)} 
                                        />
                                        {tag}
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Date</label>
                                <input type="date" name="date" required value={formData.date} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Time</label>
                                <input type="time" name="time" required value={formData.time} onChange={handleChange} />
                            </div>
                            <div className="form-group">
                                <label>Venue</label>
                                <input type="text" name="venue" required value={formData.venue} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Event Type</label>
                                <select name="eventType" required value={formData.eventType} onChange={handleChange}>
                                    <option value="Free">Free</option>
                                    <option value="Paid">Paid</option>
                                </select>
                            </div>
                            {formData.eventType === 'Paid' && (
                                <div className="form-group">
                                    <label>Price (₹)</label>
                                    <input type="number" name="price" min="1" required value={formData.price} onChange={handleChange} />
                                </div>
                            )}
                            <div className="form-group">
                                <label>Max Participants</label>
                                <input type="number" name="maxParticipants" min="1" required value={formData.maxParticipants} onChange={handleChange} />
                            </div>
                        </div>

                        <hr style={{ borderTop: '1px dashed #cbd5e1', margin: '16px 0' }} />

                        <div className="form-group">
                            <label>Feedback System Template</label>
                            <select name="feedbackTemplateType" value={formData.feedbackTemplateType} onChange={handleChange}>
                                <option value="default">Default Dynamic Template</option>
                                <option value="custom">Custom Template Builder</option>
                            </select>
                        </div>

                        <FeedbackBuilder 
                            questions={formData.feedbackQuestions}
                            setQuestions={(newQ) => setFormData({ ...formData, feedbackQuestions: newQ })}
                        />
                        
                        <div className="modal-footer" style={{ padding: '20px 0 0 0', marginTop: '20px', borderTop: '1px solid #e2e8f0', background: 'transparent' }}>
                            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
                            <button type="submit" className="btn-primary" disabled={isLoading || isGeneratingAI}>
                                {isLoading ? 'Saving...' : 'Submit Event'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddEventModal;