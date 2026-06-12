import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axiosInstance from '../../../api/axiosInstance';

const StudentFeedback = () => {
    const { eventId } = useParams();
    const navigate = useNavigate();
    
    const [template, setTemplate] = useState(null);
    const [currentStep, setCurrentStep] = useState(0);
    const [responses, setResponses] = useState([]);
    const [history, setHistory] = useState([]); 
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [currentAnswer, setCurrentAnswer] = useState(null);
    const [animationKey, setAnimationKey] = useState(0);

    useEffect(() => {
        const fetchTemplate = async () => {
            try {
                const res = await axiosInstance.get(`/feedback/student/template/${eventId}`);
                const rawQuestions = res.data.data.feedbackQuestions;
                const sortedQuestions = [...rawQuestions].sort((a, b) => (a.order || 0) - (b.order || 0));
                setTemplate(sortedQuestions);
            } catch (error) {
                console.error("Failed to load feedback template", error);
                alert("Could not load feedback form.");
                navigate(`/student/events/${eventId}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchTemplate();
    }, [eventId, navigate]);

    const handleNext = () => {
        if (currentAnswer === null || currentAnswer === '' || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) return;

        const currentQuestion = template[currentStep];
        
        const newResponse = {
            questionId: currentQuestion.id,
            questionText: currentQuestion.text,
            answer: currentAnswer
        };

        const updatedResponses = [...responses.filter(r => r.questionId !== currentQuestion.id), newResponse];

        let nextQuestions = [];
        if (currentQuestion.type === 'rating' && currentQuestion.conditionalLogic) {
            if (currentAnswer <= currentQuestion.conditionalLogic.threshold) {
                nextQuestions = currentQuestion.conditionalLogic.ifLessOrEqual || [];
            } else {
                nextQuestions = currentQuestion.conditionalLogic.ifGreater || [];
            }
        }

        let updatedTemplate = [...template];
        if (nextQuestions.length > 0) {
            updatedTemplate.splice(currentStep + 1, 0, ...nextQuestions);
        }

        setHistory([...history, { 
            step: currentStep, 
            templateState: [...template], 
            responsesState: updatedResponses
        }]);

        setResponses(updatedResponses);
        setTemplate(updatedTemplate);

        const upcomingQuestionId = updatedTemplate[currentStep + 1]?.id;
        const existingNextAnswer = updatedResponses.find(r => r.questionId === upcomingQuestionId)?.answer || null;
        setCurrentAnswer(existingNextAnswer);

        setCurrentStep(prev => prev + 1);
        setAnimationKey(prev => prev + 1);
    };

    const handleBack = () => {
        if (history.length === 0) return;
        
        const prevHistory = history[history.length - 1];
        setHistory(history.slice(0, -1));
        
        setTemplate(prevHistory.templateState);
        setResponses(prevHistory.responsesState);
        setCurrentStep(prevHistory.step);
        
        const answeredValue = prevHistory.responsesState.find(r => r.questionId === prevHistory.templateState[prevHistory.step].id)?.answer || null;
        setCurrentAnswer(answeredValue);
        setAnimationKey(prev => prev + 1);
    };

    const toggleMcqOption = (opt, allowMultiple) => {
        if (allowMultiple) {
            let arr = Array.isArray(currentAnswer) ? currentAnswer : [];
            if (arr.includes(opt)) {
                setCurrentAnswer(arr.filter(a => a !== opt));
            } else {
                setCurrentAnswer([...arr, opt]);
            }
        } else {
            setCurrentAnswer(opt);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await axiosInstance.post(`/feedback/student/submit/${eventId}`, {
                responses,
                overallRating: 5 // Defaulting legacy parameter to 5 since overall rating concept is removed from UI requirements.
            });
            alert("Feedback submitted successfully! You earned 100 points.");
            navigate(`/student/events/${eventId}`);
        } catch (error) {
            console.error(error);
            alert("Failed to submit feedback.");
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading gamified feedback experience...</div>;
    if (!template || template.length === 0) return <div style={{ padding: '40px', textAlign: 'center' }}>No feedback questions configured.</div>;

    const isComplete = currentStep >= template.length;
    const progress = isComplete ? 100 : Math.round((currentStep / template.length) * 100);
    const disableNext = currentAnswer === null || currentAnswer === '' || (Array.isArray(currentAnswer) && currentAnswer.length === 0);

    return (
        <div className="student-feedback-page" style={{ maxWidth: '600px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
            <style>
                {`
                    .animated-step {
                        animation: slideIn 0.4s ease forwards;
                    }
                    @keyframes slideIn {
                        from { opacity: 0; transform: translateX(20px); }
                        to { opacity: 1; transform: translateX(0); }
                    }
                    .star-btn {
                        font-size: 3rem; color: #cbd5e1; cursor: pointer; transition: color 0.2s, transform 0.2s;
                    }
                    .star-btn:active { transform: scale(0.9); }
                    .star-btn.active { color: #eab308; }
                    .mcq-option {
                        padding: 16px; border-radius: 12px; border: 2px solid #e2e8f0; background: white; cursor: pointer; font-weight: 500; color: #334155; transition: all 0.2s; display: flex; align-items: center; justify-content: space-between;
                    }
                    .mcq-option.active {
                        border-color: #9333ea; background: #faf5ff; color: #7e22ce;
                    }
                    @media (max-width: 600px) {
                        .student-feedback-page { margin: 0 auto !important; padding: 4px !important; }
                        .feedback-card { padding: 20px !important; border-radius: 12px !important; }
                        .feedback-actions { align-items: stretch !important; gap: 12px !important; }
                        .feedback-actions button { min-height: 44px; }
                        .feedback-complete-actions { flex-direction: column !important; }
                        .star-btn { font-size: 2.35rem; }
                    }
                `}
            </style>

            <div style={{ marginBottom: '30px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                    <span>Event Feedback</span>
                    <span>{progress}% Completed</span>
                </div>
                <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div 
                        style={{ height: '100%', background: '#9333ea', borderRadius: '4px', width: `${progress}%`, transition: 'width 0.3s ease' }}
                    />
                </div>
            </div>

            <div key={animationKey} className="animated-step">
                {!isComplete ? (
                    <div className="feedback-card" style={{ background: 'white', padding: '30px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                        <h2 style={{ fontSize: '1.5rem', color: '#0f172a', marginBottom: '24px', lineHeight: 1.4 }}>
                            {template[currentStep].text}
                            {template[currentStep].type === 'mcq' && template[currentStep].allowMultiple && <span style={{ fontSize: '0.85rem', color: '#64748b', display: 'block', marginTop: '8px', fontWeight: 'normal' }}>(Select all that apply)</span>}
                        </h2>

                        {template[currentStep].type === 'rating' && (
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', margin: '30px 0', flexWrap: 'wrap' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <i 
                                        key={star}
                                        className={`star-btn ${currentAnswer >= star ? 'ri-star-fill active' : 'ri-star-line'}`}
                                        onClick={() => setCurrentAnswer(star)}
                                    />
                                ))}
                            </div>
                        )}

                        {template[currentStep].type === 'mcq' && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {template[currentStep].options.map(option => {
                                    const isSelected = template[currentStep].allowMultiple 
                                        ? Array.isArray(currentAnswer) && currentAnswer.includes(option)
                                        : currentAnswer === option;
                                    
                                    return (
                                        <div 
                                            key={option}
                                            className={`mcq-option ${isSelected ? 'active' : ''}`}
                                            onClick={() => toggleMcqOption(option, template[currentStep].allowMultiple)}
                                        >
                                            {option}
                                            {isSelected && <i className="ri-check-line" style={{ fontSize: '1.2rem', color: '#9333ea' }}></i>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {template[currentStep].type === 'paragraph' && (
                            <textarea 
                                rows="5"
                                value={currentAnswer || ''}
                                onChange={(e) => setCurrentAnswer(e.target.value)}
                                placeholder="Type your thoughts here..."
                                style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
                            />
                        )}

                        <div className="feedback-actions" style={{ marginTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button 
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                style={{ 
                                    background: 'transparent', color: '#64748b', border: 'none', fontSize: '1rem', fontWeight: 600, cursor: currentStep === 0 ? 'not-allowed' : 'pointer', opacity: currentStep === 0 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '6px'
                                }}
                            >
                                <i className="ri-arrow-left-line"></i> Back
                            </button>
                            
                            <button 
                                onClick={handleNext}
                                disabled={disableNext}
                                style={{ 
                                    background: disableNext ? '#cbd5e1' : '#0f172a', color: 'white', padding: '14px 30px', border: 'none', borderRadius: '50px', fontSize: '1rem', fontWeight: 600, cursor: disableNext ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'background 0.2s'
                                }}
                            >
                                Continue <i className="ri-arrow-right-line"></i>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div style={{ background: 'white', padding: '40px', borderRadius: '16px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: '80px', height: '80px', background: '#dcfce7', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '0 auto 20px auto' }}>
                            <i className="ri-check-double-line" style={{ fontSize: '3rem', color: '#16a34a' }}></i>
                        </div>
                        <h2 style={{ fontSize: '1.75rem', color: '#0f172a', marginBottom: '12px' }}>You're All Set!</h2>
                        <p style={{ color: '#64748b', fontSize: '1.05rem', marginBottom: '30px', lineHeight: 1.5 }}>
                            Thank you for completing the feedback. Your insights help us improve future events.
                        </p>
                        <div className="feedback-complete-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                                onClick={handleBack}
                                style={{ background: '#f1f5f9', color: '#0f172a', padding: '16px 24px', border: '1px solid #cbd5e1', borderRadius: '50px', fontSize: '1rem', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
                            >
                                Review Answers
                            </button>
                            <button 
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                style={{ background: '#9333ea', color: 'white', padding: '16px 40px', border: 'none', borderRadius: '50px', fontSize: '1.1rem', fontWeight: 600, cursor: isSubmitting ? 'not-allowed' : 'pointer', transition: 'background 0.2s', flex: 1 }}
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit & Claim Points'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentFeedback;
