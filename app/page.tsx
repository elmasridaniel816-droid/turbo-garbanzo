// pages/page.tsx
import React, { useState } from 'react';
// Import the submit utility from src/utils/submit


type RefundRequest = {
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

type ApiResponseSuccess = {
  success: true;
  refundId: string;
  message?: string;
};

type ApiResponseFail = {
  success: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

const DEFAULT_REDIRECT = 'https://next.vercel.com'; // or your preferred default

export default function RefundPage() {
  const [form, setForm] = useState<RefundRequest>({
    firstName: '',
    lastName: '',
    dob: '',
    email: '',
    phone: '',
    orderId: '',
    orderAmount: 0,
    reason: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvc: '',
    bankAccount: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function clientValidate(data: RefundRequest) {
    const e: Record<string, string> = {};
    if (!data.firstName.trim()) e.firstName = 'First name is required';
    if (!data.lastName.trim()) e.lastName = 'Last name is required';
    if (!data.email.trim() || !/^\S+@\S+\.\S+$/.test(data.email)) e.email = 'Valid email required';
    if (!data.orderId.trim()) e.orderId = 'Order ID is required';
    if (!data.orderAmount || Number.isNaN(data.orderAmount) || data.orderAmount <= 0) e.orderAmount = 'Order amount must be a positive number';
    if (!data.reason.trim()) e.reason = 'Reason for refund is required';
    if (data.dob && isNaN(Date.parse(data.dob))) e.dob = 'Invalid date of birth';
    return e;
  }

  function handleChange<K extends keyof RefundRequest>(field: K, value: RefundRequest[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
    setGlobalError(null);
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    const validation = clientValidate(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }

    setIsSubmitting(true);

    try {
      // Call the imported submit utility instead of fetch('/api/submit')
      const resp = (await submitRefund(form)) as ApiResponseSuccess | ApiResponseFail;

      if (resp && (resp as ApiResponseSuccess).success) {
        const s = resp as ApiResponseSuccess;
        setSuccessMessage(s.message ?? `Refund submitted (ID: ${s.refundId})`);
        setErrors({});
        // Redirect after a short delay so user sees confirmation
        const redirectUrl = process.env.NEXT_PUBLIC_SUCCESS_REDIRECT ?? DEFAULT_REDIRECT;
        setTimeout(() => {
          if (typeof window !== 'undefined') window.location.href = redirectUrl;
        }, 1200);
      } else {
        const fail = resp as ApiResponseFail;
        if (fail.fieldErrors) setErrors(fail.fieldErrors);
        setGlobalError(fail.error || 'Failed to submit refund');
      }
    } catch (err: any) {
      console.error('submit error', err);
      setGlobalError(err?.message ?? 'Unexpected error during submission');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setForm({
      firstName: '',
      lastName: '',
      dob: '',
      email: '',
      phone: '',
      orderId: '',
      orderAmount: 0,
      reason: '',
      cardNumber: '',
      cardExpiry: '',
      cardCvc: '',
      bankAccount: '',
    });
    setErrors({});
    setGlobalError(null);
    setSuccessMessage(null);
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 24 }}>
      <h1>Request a Refund</h1>
      {globalError && <div style={{ color: 'crimson', marginBottom: 12 }}>{globalError}</div>}
      {successMessage && <div style={{ color: 'green', marginBottom: 12 }}>{successMessage}</div>}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting} style={{ border: 'none', padding: 0 }}>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>
              First Name
              <input
                value={form.firstName}
                onChange={e => handleChange('firstName', e.target.value)}
                aria-invalid={!!errors.firstName}
                required
              />
              {errors.firstName && <div style={{ color: 'crimson' }}>{errors.firstName}</div>}
            </label>

            <label>
              Last Name
              <input
                value={form.lastName}
                onChange={e => handleChange('lastName', e.target.value)}
                aria-invalid={!!errors.lastName}
                required
              />
              {errors.lastName && <div style={{ color: 'crimson' }}>{errors.lastName}</div>}
            </label>

            <label>
              Date of Birth
              <input
                type="date"
                value={form.dob}
                onChange={e => handleChange('dob', e.target.value)}
                aria-invalid={!!errors.dob}
                max={new Date().toISOString().split('T')[0]}
              />
              {errors.dob && <div style={{ color: 'crimson' }}>{errors.dob}</div>}
            </label>

            <label>
              Email
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                aria-invalid={!!errors.email}
                required
              />
              {errors.email && <div style={{ color: 'crimson' }}>{errors.email}</div>}
            </label>

            <label>
              Phone
              <input
                value={form.phone}
                onChange={e => handleChange('phone', e.target.value)}
                aria-invalid={!!errors.phone}
              />
              {errors.phone && <div style={{ color: 'crimson' }}>{errors.phone}</div>}
            </label>

            <label>
              Order ID
              <input
                value={form.orderId}
                onChange={e => handleChange('orderId', e.target.value)}
                aria-invalid={!!errors.orderId}
                required
              />
              {errors.orderId && <div style={{ color: 'crimson' }}>{errors.orderId}</div>}
            </label>

            <label>
              Order Amount
              <input
                type="number"
                value={String(form.orderAmount)}
                onChange={e => handleChange('orderAmount', Number(e.target.value))}
                aria-invalid={!!errors.orderAmount}
                required
              />
              {errors.orderAmount && <div style={{ color: 'crimson' }}>{errors.orderAmount}</div>}
            </label>

            <label>
              Reason
              <textarea
                value={form.reason}
                onChange={e => handleChange('reason', e.target.value)}
                aria-invalid={!!errors.reason}
                required
              />
              {errors.reason && <div style={{ color: 'crimson' }}>{errors.reason}</div>}
            </label>

            {/* Optional payment details — show/hide as needed */}
            <label>
              Card Number (optional)
              <input
                value={form.cardNumber}
                onChange={e => handleChange('cardNumber', e.target.value)}
                aria-invalid={!!errors.cardNumber}
              />
              {errors.cardNumber && <div style={{ color: 'crimson' }}>{errors.cardNumber}</div>}
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <label style={{ flex: 1 }}>
                Card Expiry
                <input
                  value={form.cardExpiry}
                  onChange={e => handleChange('cardExpiry', e.target.value)}
                  placeholder="MM/YY"
                />
                {errors.cardExpiry && <div style={{ color: 'crimson' }}>{errors.cardExpiry}</div>}
              </label>

              <label style={{ flex: 1 }}>
                Card CVC
                <input
                  value={form.cardCvc}
                  onChange={e => handleChange('cardCvc', e.target.value)}
                />
                {errors.cardCvc && <div style={{ color: 'crimson' }}>{errors.cardCvc}</div>}
              </label>
            </div>

            <label>
              Bank Account (optional)
              <input
                value={form.bankAccount}
                onChange={e => handleChange('bankAccount', e.target.value)}
              />
              {errors.bankAccount && <div style={{ color: 'crimson' }}>{errors.bankAccount}</div>}
            </label>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Submitting...' : 'Submit Refund'}
              </button>
              <button type="button" onClick={handleReset} disabled={isSubmitting}>
                Reset
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
}
