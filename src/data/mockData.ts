import type { MenuItem, Order } from '../types/index';

export const INITIAL_MENU: MenuItem[] = [
    { id: 'm1', name: 'Brekele', price: 18000, category: 'Makanan', icon: '🍲', isAvailable: true },
    { id: 'm2', name: 'Steak Umma', price: 35000, category: 'Makanan', icon: '🥩', isAvailable: true },
    { id: 'm3', name: 'Dimsum Ayam', price: 15000, category: 'Camilan', icon: '🥟', isAvailable: true },
    { id: 'm4', name: 'Teh Jeruk Sereh', price: 8000, category: 'Minuman', icon: '🍹', isAvailable: true },
    { id: 'm5', name: 'Es Kopi Ruma', price: 12000, category: 'Minuman', icon: '☕', isAvailable: true },
];

export const INITIAL_ORDERS: Order[] = [
    {
        id: 'ord-101',
        tableNumber: 1,
        orderType: 'DINE_IN',
        status: 'DAPUR',
        totalPrice: 43000,
        createdAt: '12:30',
        items: [
            { id: 'i1', menuId: 'm1', name: 'Brekele', qty: 2, price: 18000, isCompleted: false },
            { id: 'i2', menuId: 'm4', name: 'Teh Jeruk Sereh', qty: 1, price: 8000, isCompleted: true },
        ],
    },
];