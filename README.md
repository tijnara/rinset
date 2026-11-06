# Rinset

Rinset is a point-of-sale and laundry operations app built for laundry shops. The current app entry point is a responsive POS screen where staff can browse the service catalog, build customer tickets, and register orders.

## What it does

- Loads active catalog items for a store from Supabase, with category filters and search.
- Supports per-piece and per-kilo pricing, a cart/ticket, and checkout.
- Records customer details, payment method and status, pickup or delivery, rush turnaround, garment inspection notes, and optional storage locations.
- Shows order receipts and supports quick cash-out recording.
- Includes feature modules for authentication, audit, catalog, customers, machines, orders, and POS.

The interface is optimized for desktop and tablet use, with a mobile-friendly cart and keyboard shortcuts: `/` focuses search, `F8` opens checkout, `F9` opens quick cash-out, and `Escape` clears search or closes the mobile cart.

## Requirements

- Node.js and npm
- A Supabase project configured for the app's database and authentication

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local` in the project root and add your Supabase project URL and publishable key:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000).

The app expects the Supabase database, tables, and access policies used by Rinset to be set up in your project.

## Available scripts

- `npm run dev` — start the Next.js development server.
- `npm run build` — create a production build.
- `npm run start` — serve the production build.
- `npm run lint` — run ESLint.

## Tech stack

Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Supabase. Zustand is used for client-side cart and app state.
