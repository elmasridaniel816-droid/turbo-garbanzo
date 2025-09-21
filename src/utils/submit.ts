// src/utils/submit.ts

export type RefundRequest = {
  firstName: string;
  lastName: string;
  dob: string; // ISO date string yyyy-mm-dd
  email: string;
  phone?: string;
  orderId: string;
  orderAmount: number;
  reason: string;
  cardNumber?: string;
  cardExpiry?: string;
  cardCvc?: string;
  bankAccount?: string;
};

export type ApiResponseSuccess = {
  success: true;
  refundId: string;
  message?: string;
};

export type ApiResponseFail = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

/**
 * Basic client-side validation. Returns an object with field errors (if any).
 */
function validateRefundRequest(payload: RefundRequest): Record<string, string> {
  const e: Record<string, string> = {};
  if (!payload.firstName || !payload.firstName.trim()) e.firstName = 'First name is required';
  if (!payload.lastName || !payload.lastName.trim()) e.lastName = 'Last name is required';
  if (!payload.email || !/^\S+@\S+\.\S+$/.test(payload.email)) e.email = 'Valid email required';
  if (!payload.orderId || !payload.orderId.trim()) e.orderId = 'Order ID is required';
  if (payload.orderAmount === undefined || payload.orderAmount === null || Number.isNaN(payload.orderAmount) || payload.orderAmount <= 0) e.orderAmount = 'Order amount must be a positive number';
  if (!payload.reason || !payload.reason.trim()) e.reason = 'Reason for refund is required';
  if (payload.dob && isNaN(Date.parse(payload.dob))) e.dob = 'Invalid date of birth';
  // Optionally add card format checks if provided (basic)
  if (payload.cardNumber && !/^\d{12,19}$/.test(payload.cardNumber.replace(/\s+/g, ''))) {
    e.cardNumber = 'Card number looks invalid';
  }
  if (payload.cardCvc && !/^\d{3,4}$/.test(payload.cardCvc)) {
    e.cardCvc = 'CVC must be 3 or 4 digits';
  }
  if (payload.cardExpiry && !/^(0[1-9]|1[0-2])\/?([0-9]{2}|[0-9]{4})$/.test(payload.cardExpiry)) {
    e.cardExpiry = 'Expiry should be MM/YY or MM/YYYY';
  }
  return e;
}

/**
 * Submit a refund request.
 * - Validates the payload locally first and returns fieldErrors on failure.
 * - If validation passes, attempts to POST to `/api/submit` and returns the API response.
 * - On network / unexpected errors, returns an ApiResponseFail with a suitable message.
 *
 * Note: This function is safe to call from browser code.
 */
export async function submitRefund(payload: RefundRequest): Promise<ApiResponseSuccess | ApiResponseFail> {
  // Local validation
  const fieldErrors = validateRefundRequest(payload);
  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      error: 'Validation failed',
      fieldErrors,
    };
  }

  // Attempt to send to the server API
  try {
    // Use the relative API route that should exist in your Next.js app
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add any other headers you need (auth, CSRF, etc.)
      },
      body: JSON.stringify(payload),
    });

    // Try to parse JSON even on non-2xx so we can surface fieldErrors returned by server
    const json = await (async () => {
      try {
        return await res.json();
      } catch {
        return null;
      }
    })();

    if (!res.ok) {
      // If the API returned structured errors
      if (json && typeof json === 'object') {
        return {
          success: false,
          error: (json.error as string) || `Server returned ${res.status}`,
          fieldErrors: (json.fieldErrors as Record<string, string>) || undefined,
        };
      }
      return {
        success: false,
        error: `Server returned ${res.status}`,
      };
    }

    // If server returns a success payload
    if (json && (json.success === true || (json as ApiResponseSuccess).refundId)) {
      // Normalize to ApiResponseSuccess
      return {
        success: true,
        refundId: (json.refundId as string) || `rf_${Math.random().toString(36).slice(2, 10)}`,
        message: json.message ?? 'Refund request accepted',
      };
    }

    // If server returns a well-formed failure object
    if (json && json.success === false) {
      return {
        success: false,
        error: (json.error as string) || 'Failed to submit refund',
        fieldErrors: (json.fieldErrors as Record<string, string>) || undefined,
      };
    }

    // Unknown response shape but status ok
    return {
      success: false,
      error: 'Unexpected server response',
    };
  } catch (err: any) {
    // Network or unexpected runtime error
    return {
      success: false,
      error: err?.message ? `Network error: ${err.message}` : 'Network error',
    };
  }
}

export default submitRefund;
