import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const url = request.nextUrl.clone();
    const path = url.pathname;

    // 1. Exclude public and static routes immediately
    const isPublicRoute =
        path === '/login' ||
        path === '/signup' ||
        path.startsWith('/track') ||
        path.startsWith('/_next') ||
        path.startsWith('/api') ||
        path.includes('.');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey =
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    // 2. Guard against missing environment variables
    if (!supabaseUrl || !supabaseAnonKey) {
        if (process.env.NODE_ENV === 'development') {
            console.warn(
                '[Rinset Middleware] Supabase URL or Key is missing from environment variables.'
            );
        }
        return NextResponse.next();
    }

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 3. Initialize Supabase SSR client
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) =>
                    request.cookies.set(name, value)
                );
                response = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    response.cookies.set(name, value, options)
                );
            },
        },
    });

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Redirect unauthenticated users visiting protected routes to /login
    if (!user && !isPublicRoute) {
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // Redirect authenticated users visiting auth pages to the terminal home
    if (user && (path === '/login' || path === '/signup')) {
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return response;
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};