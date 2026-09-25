import type { Order } from '../types/index';

export function getOrderDate(order: Pick<Order, 'createdAt'>): Date {
    const parsed = new Date(order.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;

    const timeMatch = /^(\d{1,2}):(\d{2})/.exec(order.createdAt);
    if (timeMatch) {
        const today = new Date();
        today.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
        return today;
    }
    return new Date(0);
}

export function formatOrderDate(order: Pick<Order, 'createdAt'>): string {
    const date = getOrderDate(order);
    if (date.getTime() === 0) return order.createdAt;
    return date.toLocaleString('id-ID', {
        dateStyle: 'short',
        timeStyle: 'short',
    });
}
