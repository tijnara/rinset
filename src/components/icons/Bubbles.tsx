import { forwardRef, SVGProps } from 'react';

export interface BubblesProps extends SVGProps<SVGSVGElement> {
    size?: number | string;
}

export const Bubbles = forwardRef<SVGSVGElement, BubblesProps>(
    ({ className = '', size = 24, ...props }, ref) => (
        <svg
            ref={ref}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            {...props}
        >
            {/* Primary Soap Bubble with Highlight Arc */}
            <circle cx="15.5" cy="8.5" r="5.5" />
            <path d="M14 6a2.5 2.5 0 0 1 2.5 2.5" />

            {/* Secondary Bottom Bubble with Highlight Arc */}
            <circle cx="7.5" cy="15.5" r="4.5" />
            <path d="M6.5 13.5a1.8 1.8 0 0 1 1.8 1.8" />

            {/* Floating Suds */}
            <circle cx="6" cy="6" r="2.5" />
            <circle cx="18" cy="18" r="2" />
        </svg>
    )
);

Bubbles.displayName = 'Bubbles';