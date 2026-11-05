import { ImageResponse } from 'next/og';

export const size = {
    width: 32,
    height: 32,
};

export const contentType = 'image/png';

export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#020617',
                    borderRadius: 8,
                    border: '1.5px solid rgba(56, 189, 248, 0.45)',
                }}
            >
                <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {/* Outer Spiral Wave */}
                    <path
                        d="M12 3C16.97 3 21 7.03 21 12C21 15.03 19.5 17.7 17.2 19.3C16.68 19.67 15.94 19.45 15.72 18.84C15.52 18.29 15.78 17.69 16.27 17.32C18.09 15.93 19.25 13.74 19.25 11.26C19.25 7.23 15.98 3.96 11.95 3.96C8.95 3.96 6.34 5.77 5.2 8.35C4.94 8.93 4.23 9.15 3.69 8.87C3.15 8.59 2.95 7.88 3.25 7.31C4.73 4.52 8.09 3 12 3Z"
                        fill="#38bdf8"
                    />
                    {/* Inner Vortex */}
                    <path
                        d="M6 12C6 8.82 8.42 6.22 11.55 5.99C12.19 5.94 12.71 6.47 12.67 7.11C12.62 7.75 12.07 8.24 11.43 8.31C9.49 8.52 7.98 10.12 7.98 12.12C7.98 14.3 9.74 16.06 11.92 16.06C13.59 16.06 15 15.03 15.57 13.56C15.8 12.96 16.48 12.68 17.07 12.92C17.66 13.16 17.92 13.86 17.65 14.48C16.77 16.51 14.67 17.92 12.14 17.92C8.75 17.92 6 15.27 6 12Z"
                        fill="#0284c7"
                    />
                    {/* Core Droplet */}
                    <circle cx="12" cy="12" r="2" fill="#38bdf8" />
                </svg>
            </div>
        ),
        {
            ...size,
        }
    );
}