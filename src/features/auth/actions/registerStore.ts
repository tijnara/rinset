'use server';

import { createClient } from '@supabase/supabase-js';

interface RegisterStoreInput {
    fullName: string;
    email: string;
    password: string;
    storeName: string;
    branchCode: string;
    contactNumber: string;
    address: string;
    pinCode: string;
}

interface RegisterStoreResult {
    success: boolean;
    error?: string;
    storeId?: string;
    userId?: string;
}

export async function registerStoreAction(
    data: RegisterStoreInput
): Promise<RegisterStoreResult> {
    const {
        fullName,
        email,
        password,
        storeName,
        branchCode,
        contactNumber,
        address,
        pinCode,
    } = data;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        return {
            success: false,
            error:
                'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL in .env.local.',
        };
    }

    // Input validations
    if (!fullName?.trim()) return { success: false, error: 'Full name is required.' };
    if (!email?.trim() || !email.includes('@')) return { success: false, error: 'Valid email is required.' };
    if (!password || password.length < 6) return { success: false, error: 'Password must be at least 6 characters.' };
    if (!storeName?.trim()) return { success: false, error: 'Shop name is required.' };
    if (!pinCode || !/^\d{4}$/.test(pinCode)) return { success: false, error: 'Terminal PIN must be exactly 4 digits.' };

    // 1. Initialize Supabase Admin client with service_role key
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });

    // 2. Create and auto-confirm user account directly
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true, // <-- Automatically marks email as verified
        user_metadata: {
            full_name: fullName.trim(),
        },
    });

    if (authError || !authData.user) {
        return {
            success: false,
            error: authError?.message || 'Failed to create user account.',
        };
    }

    const userId = authData.user.id;

    // 3. Provision store, link owner role, and seed catalog via RPC
    const { data: storeId, error: rpcError } = await supabaseAdmin.rpc(
        'register_new_store_owner',
        {
            p_user_id: userId,
            p_store_name: storeName.trim(),
            p_branch_code: branchCode?.trim() || 'MAIN',
            p_contact_number: contactNumber?.trim() || '',
            p_address: address?.trim() || '',
            p_pin_code: pinCode.trim(),
        }
    );

    if (rpcError) {
        // Cleanup auth account if store provisioning fails
        await supabaseAdmin.auth.admin.deleteUser(userId);
        return {
            success: false,
            error: rpcError.message || 'Failed to initialize store profile.',
        };
    }

    return {
        success: true,
        storeId: storeId as string,
        userId,
    };
}