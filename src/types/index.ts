export type UserRole = 'OWNER' | 'STAFF';
export type CategoryType = 'Makanan' | 'Minuman' | 'Camilan';
export type OrderStatus = 'DAPUR' | 'SIAP' | 'SELESAI';
export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER';

export interface User {
    id: string;
    name: string;
    role: UserRole;
    pin: string;
}

export interface BusinessProfile {
    name: string;
    slogan: string;
    logo: string;
}

export interface MenuItem {
    id: string;
    name: string;
    price: number;
    category: CategoryType;
    icon: string;
    isAvailable: boolean;
}

export interface OrderItem {
    id: string;
    menuId: string;
    name: string;
    qty: number;
    price: number;
    notes?: string;
    isAddition?: boolean;
    isCompleted?: boolean;
}

export interface Order {
    id: string;
    tableNumber: number; // 1-7 (0 untuk Takeaway)
    customerName?: string;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    status: OrderStatus;
    items: OrderItem[];
    totalPrice: number;
    paymentMethod?: PaymentMethod;
    cashAmount?: number;
    changeAmount?: number;
    createdAt: string;
}