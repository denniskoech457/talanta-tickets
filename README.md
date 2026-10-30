# Talanta Tickets — Vercel deployment

A responsive single-event ticket booking site for Bayern Munich vs Ajax. The existing design and local artwork are retained. The Express server has been removed and the backend is now implemented as Vercel Node.js Functions.

## Project structure

```text
public/
  index.html
  assets/
    stadium-background.jpg
    bayern-crest.svg
    ajax-crest.svg
api/
  health.js
  payments/
    initiate.js
.env.example
.gitignore
package.json
vercel.json
```

## What is implemented

- Existing responsive Talanta Tickets design and local assets.
- Event date: January 5, 2027; ticket price: KES 500.
- Quantity selection from 1–10 and buyer input validation.
- `POST /api/payments/initiate` calls MegaPay's STK Push endpoint from a server-side Vercel Function. The API key is never placed in browser code.
- `GET /api/health` reports whether the required MegaPay environment variables are configured.
- The browser displays a pending-payment message and booking reference; it does not claim that an STK request means the payment succeeded.

## Deploy to Vercel

### 1. Upload the project to GitHub

Create a new GitHub repository and upload the contents of this folder (the `public`, `api` folders and the root configuration files). Do not upload `.env` or real API credentials.

### 2. Import into Vercel

1. Sign in to Vercel and choose **Add New → Project**.
2. Import the GitHub repository.
3. Keep the project at the repository root. No framework preset or build command is required; Vercel serves `public/` and detects the functions in `api/`.
4. Deploy.

### 3. Add MegaPay environment variables

In **Vercel → Project → Settings → Environment Variables**, add:

- `MEGAPAY_API_KEY` — your private MegaPay API key.
- `MEGAPAY_EMAIL` — the email registered to your MegaPay merchant account.

Add them for the environments you intend to use (Production, and Preview if needed), save, then redeploy so the functions receive the values. Never add these values to `public/index.html`, frontend JavaScript, or a `NEXT_PUBLIC_` variable.

### 4. Test the deployment

- Open `https://YOUR-DOMAIN/api/health`. It should return JSON with `ok: true` and `megapayConfigured: true` once the environment variables are present.
- Submit a test booking with a valid Kenyan mobile number and approve the M-PESA prompt only if you intend to make a real charge. Confirm the initiation response and transaction in your MegaPay merchant dashboard.

## Run locally (optional)

Install Node.js 20 or newer, then run:

```bash
npm install
npx vercel dev
```

For local payment testing, create `.env` from `.env.example` and fill in your own MegaPay credentials. Keep `.env` out of Git.

## MegaPay API assumptions — verify with your merchant account

The integration retains the endpoint and request fields used by the previous project:

`POST https://megapay.co.ke/backend/v1/initiatestk`

Request JSON: `api_key`, `email`, `amount`, `msisdn`.

MegaPay's exact response fields and payment verification/callback contract must be confirmed against the current documentation and your merchant account before production use: https://megapay.co.ke/documentation/ . The function accepts several possible transaction-reference fields because the earlier starter allowed for account/API response variations; this is not a substitute for confirming the official response contract.

## Important: not yet production-ready for ticket fulfilment

This conversion makes the project Vercel-deployable and securely initiates the STK Push, but it does **not** implement a verified payment callback/status check or persist orders. Vercel Functions are stateless/ephemeral; do not rely on in-memory data for bookings. Before accepting customer payments at scale:

1. Connect a durable database (for example, Postgres/Supabase) and persist the order before or as part of payment initiation.
2. Implement MegaPay's documented server-to-server callback or transaction-status endpoint. Verify callback authenticity, transaction reference, amount, merchant, and order association. Make processing idempotent.
3. Only after verified payment, mark the order paid and issue a unique ticket; do not trust a browser redirect or client-supplied payment status.
4. Add an email provider and send the ticket to the buyer only after payment verification. The current page communicates the stated delivery expectation of within 4 business days after successful payment.
5. Add persistent rate limiting/abuse protection, privacy and terms pages, real support contact details, monitoring, and backups.

The site does not request or handle an M-PESA PIN. Never ask customers to share their PIN or OTP.
