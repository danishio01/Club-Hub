const dateParts = (value) => {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return [
        String(date.getDate()).padStart(2, '0'),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getFullYear()).slice(-2)
    ];
};

export const formatDate = (value, fallback = 'Not set') => {
    const parts = dateParts(value);
    return parts ? parts.join('/') : fallback;
};

export const formatDateTime = (value, fallback = 'Never') => {
    const parts = dateParts(value);
    if (!parts) return fallback;
    const date = new Date(value);
    return `${parts.join('/')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};
