import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAuthorizedTasks } from '../state/taskSlice';

const useAuthorizedTasks = (params = {}) => {
    const dispatch = useDispatch();
    const taskState = useSelector((state) => state.tasks);
    const event = params.event || '';
    const type = params.type || '';
    const specialRole = params.specialRole || '';
    const status = params.status || '';

    const refresh = useCallback(
        () => dispatch(fetchAuthorizedTasks({ event, type, specialRole, status })).unwrap(),
        [dispatch, event, type, specialRole, status]
    );

    useEffect(() => {
        refresh().catch(() => {});
        const handleChange = () => refresh().catch(() => {});
        window.addEventListener('clubhub:tasks:changed', handleChange);
        window.addEventListener('clubhub:workflow-changed', handleChange);
        window.addEventListener('clubhub:tasks-mutated', handleChange);
        return () => {
            window.removeEventListener('clubhub:tasks:changed', handleChange);
            window.removeEventListener('clubhub:workflow-changed', handleChange);
            window.removeEventListener('clubhub:tasks-mutated', handleChange);
        };
    }, [refresh]);

    return { tasks: taskState.items, isLoading: taskState.isLoading, error: taskState.error, refresh };
};

export default useAuthorizedTasks;
