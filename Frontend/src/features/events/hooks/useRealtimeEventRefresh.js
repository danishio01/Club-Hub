import { useEffect } from 'react';

const useRealtimeEventRefresh = (refresh) => {
    useEffect(() => {
        const handleChange = () => refresh();
        window.addEventListener('clubhub:events-changed', handleChange);
        return () => window.removeEventListener('clubhub:events-changed', handleChange);
    }, [refresh]);
};

export default useRealtimeEventRefresh;
