export function formatPHP(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
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