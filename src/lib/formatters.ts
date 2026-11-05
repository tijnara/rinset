export function formatPHP(amount?: number | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
        return '₱0.00';
    }
    const cleanAmount = Math.abs(amount) < 0.001 ? 0 : amount;
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cleanAmount);
}

export function formatManilaTime(dateString: string): string {
    return new Date(dateString).toLocaleString('en-PH', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}