export type OrderStatus =
    | 'received'
    | 'washing'
    | 'drying'
    | 'folding'
    | 'ready_for_pickup'
    | 'claimed'
    | 'cancelled';

export type PricingType = 'per_kilo' | 'per_piece' | 'per_load' | 'consumable';
export type PaymentStatus = 'unpaid' | 'partially_paid' | 'paid';
export type PaymentMethod = 'cash' | 'gcash' | 'maya' | 'bank_transfer';

export interface Store {
    id: string;
    name: string;
    branch_code: string;
    phone_number: string | null;
    address: string | null;
    currency: string;
    created_at: string;
}

export interface Customer {
    id: string;
    store_id: string;
    full_name: string;
    mobile_number: string;
    address: string | null;
    notes: string | null;
    total_orders: number;
    created_at: string;
}

export interface CatalogItem {
    id: string;
    store_id: string;
    name: string;
    category: string;
    pricing_type: PricingType;
    unit_price: number;
    minimum_quantity: number;
    current_stock: number | null;
    is_active: boolean;
    created_at: string;
}

export interface OrderBasket {
    id: string;
    order_id: string;
    basket_tag: string;
    weight_kg: number;
    status: OrderStatus;
    assigned_machine?: string | null;
    created_at: string;
    updated_at?: string;
    order?: Order;
}

export interface Order {
    id: string;
    store_id: string;
    customer_id: string | null;
    order_number: string;
    basket_tag: string;
    status: OrderStatus;
    payment_status: PaymentStatus;
    total_weight_kg: number;
    subtotal: number;
    discount_amount: number;
    net_payable: number;
    total_paid: number;
    assigned_machine?: string | null;
    created_at: string;
    claimed_at: string | null;
    customer?: Customer;
    items?: OrderItem[];
    baskets?: OrderBasket[];
}

export interface OrderItem {
    id: string;
    order_id: string;
    catalog_item_id: string | null;
    item_name: string;
    pricing_type: PricingType;
    unit_price: number;
    quantity: number;
    minimum_quantity: number;
    billable_quantity: number;
    item_total: number;
    created_at: string;
}

export interface Payment {
    id: string;
    order_id: string;
    payment_method: PaymentMethod;
    amount: number;
    tendered_amount: number;
    change_amount: number;
    reference_number: string | null;
    created_at: string;
}