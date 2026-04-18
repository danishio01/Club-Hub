import { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getStudentEventsList, registerForEventApi } from '../service/studentEventsService';

export const useStudentEvents = () => {
    const dispatch = useDispatch();
    const { events, isLoading, error } = useSelector((state) => state.studentEvents);
    const { user } = useSelector((state) => state.auth);

    useEffect(() => {
        dispatch(getStudentEventsList());
    }, [dispatch]);

    const { recommendedEvents, otherEvents } = useMemo(() => {
        if (!events || events.length === 0) return { recommendedEvents: [], otherEvents: [] };

        const userInterests = user?.interests || [];
        const recommended = [];
        const others = [];

        events.forEach(event => {
            const hasMatch = event.tags.some(tag => userInterests.includes(tag));
            if (hasMatch) {
                recommended.push(event);
            } else {
                others.push(event);
            }
        });

        return { recommendedEvents: recommended, otherEvents: others };
    }, [events, user]);

    const handleRegister = async (eventId) => {
        if (window.confirm('Do you want to register for this event?')) {
            try {
                const data = await registerForEventApi(eventId);
                alert(data.message);
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
        recommendedEvents,
        otherEvents,
        handleRegister,
        formatDate
    };
};