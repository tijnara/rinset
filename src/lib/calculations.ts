/**
 * RINSET - Bulletproof Laundry POS Calculation Engine
 * Handles centavo-accurate financial arithmetic for Philippine laundry shops.
 */

export type PricingType = 'per_kilo' | 'per_piece' | 'per_load' | 'consumable';

export interface CartItem {
    id: string;
    name: string;
    pricingType: PricingType;
    unitPrice: number;       // e.g., 35.00 for ₱35/kg, or 15.00 per sachet
    quantity: number;        // Weight in kg (if per_kilo) or count (if per_piece/consumable)
    minimumQuantity?: number;// e.g., 5.0 for a 5kg minimum threshold
}

export interface CalculatedItem extends CartItem {
    billableQuantity: number; // The actual quantity billed after applying minimums
    itemTotal: number;        // unitPrice * billableQuantity (rounded to 2 decimal places)
}

export interface OrderModifier {
    rushFee?: number;         // Flat fee (e.g., ₱50)
    deliveryFee?: number;     // Flat fee (e.g., ₱40)
    discountType?: 'percentage' | 'fixed' | 'none';
    discountValue?: number;   // e.g., 20 for 20% or 50 for ₱50 off
}

export interface OrderBreakdown {
    items: CalculatedItem[];
    totalWeightKg: number;
    subtotal: number;
    discountAmount: number;
    rushFee: number;
    deliveryFee: number;
    netPayable: number;
}

export interface PaymentCalculation {
    netPayable: number;
    cashTendered: number;
    gcashAmount: number;
    totalPaid: number;
    changeDue: number;
    balanceRemaining: number;
    isFullyPaid: boolean;
}

/**
 * Ensures floating-point centavos round safely to 2 decimal places.
 */
export function roundCentavos(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Calculates a single cart item based on its pricing rules and minimum thresholds.
 */
export function calculateLineItem(item: CartItem): CalculatedItem {
    const safeQuantity = Math.max(0, item.quantity);
    const minThreshold = item.minimumQuantity && item.minimumQuantity > 0
        ? item.minimumQuantity
        : 0;

    // Apply minimum threshold only if the item has weight/quantity recorded
    const billableQuantity = safeQuantity > 0 && safeQuantity < minThreshold
        ? minThreshold
        : safeQuantity;

    const itemTotal = roundCentavos(billableQuantity * item.unitPrice);

    return {
        ...item,
        quantity: roundCentavos(safeQuantity),
        billableQuantity: roundCentavos(billableQuantity),
        itemTotal,
    };
}

/**
 * Calculates the complete breakdown of an order: items, modifiers, discounts, and total.
 */
export function calculateOrderTotal(
    items: CartItem[],
    modifier: OrderModifier = {}
): OrderBreakdown {
    const calculatedItems = items.map(calculateLineItem);

    // Sum line totals and total laundry weight
    const subtotal = calculatedItems.reduce(
        (sum, item) => roundCentavos(sum + item.itemTotal),
        0
    );

    const totalWeightKg = calculatedItems
        .filter((item) => item.pricingType === 'per_kilo')
        .reduce((sum, item) => roundCentavos(sum + item.quantity), 0);

    // Process Discounts
    let discountAmount = 0;
    if (modifier.discountType === 'percentage' && modifier.discountValue) {
        const validPercent = Math.min(100, Math.max(0, modifier.discountValue));
        discountAmount = roundCentavos((subtotal * validPercent) / 100);
    } else if (modifier.discountType === 'fixed' && modifier.discountValue) {
        discountAmount = roundCentavos(
            Math.min(subtotal, Math.max(0, modifier.discountValue))
        );
    }

    const rushFee = roundCentavos(Math.max(0, modifier.rushFee || 0));
    const deliveryFee = roundCentavos(Math.max(0, modifier.deliveryFee || 0));

    // Net total cannot drop below zero
    const netPayable = roundCentavos(
        Math.max(0, subtotal - discountAmount + rushFee + deliveryFee)
    );

    return {
        items: calculatedItems,
        totalWeightKg,
        subtotal,
        discountAmount,
        rushFee,
        deliveryFee,
        netPayable,
    };
}

/**
 * Computes split payments (Cash, GCash), remaining balance, and customer change.
 */
export function calculatePayment(
    netPayable: number,
    cashTendered: number = 0,
    gcashAmount: number = 0
): PaymentCalculation {
    const safeCash = roundCentavos(Math.max(0, cashTendered));
    const safeGcash = roundCentavos(Math.max(0, gcashAmount));
    const totalPaid = roundCentavos(safeCash + safeGcash);

    const isOverpaid = totalPaid >= netPayable;
    const changeDue = isOverpaid ? roundCentavos(totalPaid - netPayable) : 0;
    const balanceRemaining = isOverpaid ? 0 : roundCentavos(netPayable - totalPaid);

    return {
        netPayable,
        cashTendered: safeCash,
        gcashAmount: safeGcash,
        totalPaid,
        changeDue,
        balanceRemaining,
        isFullyPaid: isOverpaid,
    };
}

/**
 * Standard Philippine Peso currency display formatter.
 */
export function formatPHP(amount: number): string {
    return new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(amount);
}