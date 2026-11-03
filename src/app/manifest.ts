import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'Rinset Laundry POS',
        short_name: 'Rinset',
        description: 'Precision Point of Sale and Live Tracking for Laundry Shops',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#020617',
        theme_color: '#0ea5e9',
        icons: [
            {
                src: '/icons/icon-192.svg',
                sizes: '192x192',
                type: 'image/svg+xml',
                purpose: 'maskable',
            },
            {
                src: '/icons/icon-512.svg',
                sizes: '512x512',
                type: 'image/svg+xml',
                purpose: 'any',
            },
        ],
    };
}