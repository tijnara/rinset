'use client';

interface RinsetLogoProps {
    className?: string;
    showText?: boolean;
}

export function RinsetLogo({ className = 'w-8 h-8', showText = false }: RinsetLogoProps) {
    return (
        <div className={`inline-flex items-center gap-2.5 select-none ${showText ? '' : ''}`}>
            {/* 3D Cyan Porthole & Swirling Wave Icon */}
            <svg
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className={className}
            >
                <defs>
                    {/* Neon Ring Gradient */}
                    <linearGradient id="rinsetNeonRing" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="50%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>

                    {/* Deep Porthole Cavity */}
                    <radialGradient id="drumCavity" cx="50" cy="50" r="45" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0369a1" />
                        <stop offset="70%" stopColor="#0f172a" />
                        <stop offset="100%" stopColor="#020617" />
                    </radialGradient>

                    {/* Swirling Wash Tidal Wave */}
                    <linearGradient id="rinsetWave" x1="20" y1="80" x2="80" y2="30" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#0284c7" />
                        <stop offset="50%" stopColor="#38bdf8" />
                        <stop offset="100%" stopColor="#67e8f9" />
                    </linearGradient>

                    {/* Bubble Translucency */}
                    <radialGradient id="bubbleShine" cx="35%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                        <stop offset="40%" stopColor="#67e8f9" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0.2" />
                    </radialGradient>

                    {/* Ambient Outer Glow */}
                    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Ambient Glow Aura */}
                <circle cx="50" cy="50" r="42" fill="none" stroke="#38bdf8" strokeWidth="6" opacity="0.3" filter="url(#neonGlow)" />

                {/* Outer Heavy Porthole Drum Rim */}
                <circle cx="50" cy="50" r="43" fill="url(#drumCavity)" stroke="url(#rinsetNeonRing)" strokeWidth="4.5" />

                {/* Inner Bevel Border */}
                <circle cx="50" cy="50" r="37" fill="none" stroke="#1e293b" strokeWidth="1.5" />

                {/* Dynamic Swirling Water Wave (Loop/Vortex) */}
                <path
                    d="M 22,60 C 22,76 36,87 52,87 C 72,87 83,72 82,54 C 81,42 73,34 62,34 C 47,34 40,48 50,58 C 55,63 64,62 67,55 C 69,50 67,45 61,45 C 55,45 52,50 54,54"
                    fill="none"
                    stroke="url(#rinsetWave)"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Water Crest Highlight */}
                <path
                    d="M 30,70 C 37,80 48,82 56,81 C 70,79 77,67 76,54"
                    fill="none"
                    stroke="#e0f2fe"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.8"
                />

                {/* Soap Bubble 1 (Inside center vortex) */}
                <circle cx="64" cy="38" r="8" fill="url(#bubbleShine)" stroke="#38bdf8" strokeWidth="1.2" />
                <circle cx="62" cy="35" r="2" fill="#ffffff" opacity="0.8" />

                {/* Soap Bubble 2 (Small inside) */}
                <circle cx="43" cy="36" r="4.5" fill="url(#bubbleShine)" stroke="#67e8f9" strokeWidth="1" />
                <circle cx="41.5" cy="34.5" r="1" fill="#ffffff" opacity="0.8" />

                {/* Floating Bubble 3 (Top-left accent outside) */}
                <circle cx="16" cy="28" r="4.5" fill="url(#bubbleShine)" stroke="#38bdf8" strokeWidth="1.2" filter="url(#neonGlow)" />
                <circle cx="15" cy="26.5" r="1" fill="#ffffff" opacity="0.9" />

                {/* Tiny Droplet Bubble (Upper left) */}
                <circle cx="23" cy="18" r="2.5" fill="#38bdf8" opacity="0.9" />

                {/* Porthole Glass Curved Sheen Highlight */}
                <path
                    d="M 25,36 A 34 34 0 0 1 68,20"
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.45)"
                    strokeWidth="3"
                    strokeLinecap="round"
                />
            </svg>

            {/* Optional Integrated Wordmark */}
            {showText && (
                <div className="flex flex-col leading-none">
          <span className="text-base font-black tracking-tight text-white font-sans flex items-center">
            Rinset
          </span>
                    <span className="text-[9px] font-mono uppercase tracking-widest text-sky-400 font-bold">
            Laundry OS
          </span>
                </div>
            )}
        </div>
    );
}