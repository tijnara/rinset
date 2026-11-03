import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'Rinset - Laundry Management System',
    description: 'Precision operations and POS for modern laundry shops',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Rinset POS',
    },
};

export const viewport: Viewport = {
    themeColor: '#020617',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false, // Prevents accidental pinch/double-tap zooming on tablets
};

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
        <body className="bg-slate-950 text-slate-100 antialiased selection:bg-sky-500 selection:text-slate-950">
        {children}
        </body>
        </html>
    );
}