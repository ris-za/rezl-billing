# REZL Billing System — Setup Guide

## Step 1: Supabase — Create the Database

1. Go to https://supabase.com and sign in
2. Create a new project (e.g. "rezl-billing")
3. Once the project is ready, go to **SQL Editor**
4. Copy the entire contents of `supabase/migrations/001_initial.sql` and run it
5. Go to **Project Settings → API**
6. Copy your **Project URL** and **anon public key**

## Step 2: Configure Environment Variables

Create a file called `.env.local` in this folder with:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Step 3: Create Your First Admin User

1. In Supabase, go to **Authentication → Users → Invite user**
2. Enter the email address for the admin user
3. After they sign up, go to **Table Editor → profiles**
4. Find the user's row and change their `role` from `viewer` to `admin`

To create viewer (read-only) users, just invite them — they'll default to `viewer` role.

## Step 4: Run Locally

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Deploy to Vercel

1. Push this folder to a GitHub repository
2. Go to https://vercel.com → New Project → import the repo
3. In Vercel's Environment Variables settings, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy — Vercel gives you a public URL to share with your team

## Invoice PDF / Printing

On any invoice page, click **Print / Save PDF**. 
Your browser's print dialog will open — choose "Save as PDF" to download.

## Invoice Calculations

All invoices follow REZL's standard formula:
- **Subtotal** = Consumption (kWh) × Tariff Rate
- **Electricity Levy** = Subtotal × 3%
- **VAT** = Subtotal × 16%
- **Total** = Subtotal + Levy + VAT

## Contract Expiry Reminders

The Dashboard automatically highlights any customer whose contract expires within 2 months.
