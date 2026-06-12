import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStudentEventsList, registerForEventApi } from '../service/studentEventsService';
import useRealtimeEventRefresh from '../../events/hooks/useRealtimeEventRefresh';

export const useStudentEvents = () => {
    const dispatch = useDispatch();
    const { events, isLoading, error } = useSelector((state) => state.studentEvents);
    const { user } = useSelector((state) => state.auth);
    useRealtimeEventRefresh(() => dispatch(getStudentEventsList()));

    useEffect(() => {
        dispatch(getStudentEventsList());
    }, [dispatch]);

    const safeEvents = useMemo(() => {
        return Array.isArray(events) ? events : [];
    }, [events]);

    const { recommendedEvents, otherEvents } = useMemo(() => {
        if (safeEvents.length === 0) return { recommendedEvents: [], otherEvents: [] };

        const userInterests = user?.interests || [];
        const recommended = [];
        const others = [];

        safeEvents.forEach(event => {
            const hasMatch = event.tags && Array.isArray(event.tags) 
                ? event.tags.some(tag => userInterests.includes(tag))
                : false;
                
            if (hasMatch) {
                recommended.push(event);
            } else {
                others.push(event);
            }
        });

        return { recommendedEvents: recommended, otherEvents: others };
    }, [safeEvents, user]);

    const handleRegister = async (eventId) => {
        if(window.confirm('Do you want to register for this event?')) {
            try {
                const data = await registerForEventApi(eventId);
                alert(data.message);
                dispatch(getStudentEventsList()); 
            } catch (error) {
                alert(error.response?.data?.message || 'Failed to register. Please try again.');
            }
        }
    };

    const formatDate = (dateString) => {
        const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    };

    return {
        isLoading,
        error,
        events: safeEvents,
        recommendedEvents,
        otherEvents,
        handleRegister,
        formatDate
    };
};
