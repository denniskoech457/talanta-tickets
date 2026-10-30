import { randomBytes } from 'node:crypto';

const PRICE_PER_TICKET = 500;
const MEGAPAY_URL = 'https://megapay.co.ke/backend/v1/initiatestk';

function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.end(JSON.stringify(payload));
}

function validKenyanPhone(input) {
  const digits = String(input || '').replace(/[\s()-]/g, '');
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^\+?254[17]\d{8}$/.test(digits)) return digits.replace(/^\+/, '');
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method not allowed.' });
  }

  const { name, email, phone, quantity } = req.body || {};
  const qty = Number(quantity);
  const msisdn = validKenyanPhone(phone);

  if (typeof name !== 'string' || name.trim().length < 2 || name.trim().length > 100 ||
      typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      !msisdn || !Number.isInteger(qty) || qty < 1 || qty > 10) {
    return json(res, 400, { error: 'Enter a valid name, email, Kenyan mobile number, and ticket quantity (1–10).' });
  }

  const apiKey = process.env.MEGAPAY_API_KEY;
  const merchantEmail = process.env.MEGAPAY_EMAIL;
  if (!apiKey || !merchantEmail) {
    return json(res, 503, { error: 'MegaPay is not configured. Add MEGAPAY_API_KEY and MEGAPAY_EMAIL in Vercel Project Settings → Environment Variables.' });
  }

  const orderId = `TAL-${randomBytes(6).toString('hex').toUpperCase()}`;
  const amount = qty * PRICE_PER_TICKET;

  try {
    const upstream = await fetch(MEGAPAY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ api_key: apiKey, email: merchantEmail, amount, msisdn }),
      signal: AbortSignal.timeout(20000)
    });
    const result = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      console.error('MegaPay initiation rejected with HTTP status:', upstream.status);
      return json(res, 502, { error: 'MegaPay could not start the payment. Please try again or contact support.' });
    }

    const transactionId = result.transaction_request_id || result.TransactionRequestID ||
      result.TransactionID || result.checkout_id || result.CheckoutRequestID || null;
    const accepted = Boolean(transactionId) || result.status === 'success' ||
      result.ResultCode === '200' || result.ResponseCode === 0;

    if (!accepted) {
      console.error('Unexpected MegaPay initiation response:', result);
      return json(res, 502, { error: 'MegaPay returned an unexpected response. No ticket has been issued.' });
    }

    // Important: this only confirms that an STK request was accepted, not that it was paid.
    // Persist the order in a database and verify payment with MegaPay before issuing tickets.
    return json(res, 202, {
      orderId,
      status: 'pending',
      transactionId,
      amount,
      quantity: qty,
      message: 'Payment request initiated. Approve the M-PESA prompt; your payment must be verified before a ticket is confirmed.'
    });
  } catch (error) {
    console.error('MegaPay request failed:', error?.message || 'Unknown error');
    return json(res, 502, { error: 'Unable to reach MegaPay right now. Please try again later.' });
  }
}
