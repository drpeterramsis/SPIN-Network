export const formatDateFriendly = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
    }).format(date);
};

export const getTodayString = () => {
    return new Date().toISOString().split('T')[0];
};
