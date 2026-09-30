import React, { useState, useEffect } from "react";
import { doc, getDoc } from "firebase/firestore";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { db } from "../firebase/config";
import { useSlots } from "../hooks/useSlots";
import { resolveBarberEmailAndFee } from "../utils/bookingHelpers";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

function fmtDate(d) {
  return new Date(d + "T12:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
}

// Same slot-by-date grouping SlotPicker.jsx does, without its MUI dependency.
function groupByDate(slots) {
  const groups = {};
  for (const s of slots) {
    if (!groups[s.date]) groups[s.date] = [];
    groups[s.date].push(s);
  }
  return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
}

function SlotStep({ barber, brandColor, onSelect }) {
  const { slots, loading, error } = useSlots(barber.id);
  if (loading) return <p className="br-muted">Loading availability…</p>;
  if (error) return <p className="br-error">{error}</p>;
  if (!slots.length) return <p className="br-muted">No open slots right now — check back soon.</p>;

  return (
    <div className="br-step-panel">
      <div className="br-section-heading">
        <div>
          <p className="br-eyebrow">Select a time</p>
          <h2>When would you like to visit?</h2>
        </div>
        <span className="br-step-count">1 of 3</span>
      </div>
      <div className="br-slot-scroll">
        {groupByDate(slots).map(([date, daySlots]) => (
          <div key={date} className="br-day">
            <div className="br-day-label">{fmtDate(date)}</div>
            <div className="br-slot-grid">
              {daySlots.map((s) => (
                <button key={s.id} className="br-slot" style={{ borderColor: brandColor }} onClick={() => onSelect(s)}>
                  {s.time}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DetailsStep({ brandColor, onSubmit, onBack }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", haircutStyle: "" });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const canSubmit = form.name.trim() && form.email.trim();

  return (
    <div className="br-step-panel">
      <div className="br-section-heading br-section-heading--with-back">
        <button className="br-back" onClick={onBack} aria-label="Go back to available times">←</button>
        <div>
          <p className="br-eyebrow">Your details</p>
          <h2>Almost there</h2>
        </div>
        <span className="br-step-count">2 of 3</span>
      </div>
      <label className="br-field"><span>Name</span><input className="br-input" placeholder="Your full name" autoComplete="name" value={form.name} onChange={set("name")} /></label>
      <label className="br-field"><span>Email</span><input className="br-input" placeholder="you@example.com" type="email" autoComplete="email" value={form.email} onChange={set("email")} /></label>
      <label className="br-field"><span>Phone <em>Optional</em></span><input className="br-input" placeholder="Your phone number" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} /></label>
      <label className="br-field"><span>Appointment notes <em>Optional</em></span><input className="br-input" placeholder="Tell us what you're after" value={form.haircutStyle} onChange={set("haircutStyle")} /></label>
      <button
        className="br-button"
        style={{ background: brandColor }}
        disabled={!canSubmit}
        onClick={() => onSubmit(form)}
      >
        Continue to payment
      </button>
    </div>
  );
}

function PayInner({ barber, slot, formData, brandColor, onBack, onConfirmed }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);
  const { fee } = resolveBarberEmailAndFee(barber);

  async function handlePay() {
    if (!stripe || !elements) return;
    setProcessing(true);
    setError(null);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) { setError(submitError.message); setProcessing(false); return; }

      const res = await fetch("/api/create-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          barberId: barber.id,
          email: formData.email,
          metadata: {
            customerName: formData.name,
            customerPhone: formData.phone,
            serviceName: formData.haircutStyle,
            bookingDate: slot.date,
            bookingTime: slot.time,
            slotId: slot.id,
            bookingSlug: barber.bookingSlug || "",
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Server responded with ${res.status}`);
      }
      const { clientSecret, error: intentError } = await res.json();
      if (intentError) throw new Error(intentError);

      // Stripe requires confirmParams.return_url even in "if_required" mode:
      // automatic_payment_methods (enabled server-side in /api/create-intent)
      // can select a payment method that redirects unconditionally, and
      // Stripe needs somewhere to send the customer back to if that happens.
      const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
        elements, clientSecret, redirect: "if_required",
        confirmParams: { return_url: window.location.href },
      });
      if (stripeError) { setError(stripeError.message); setProcessing(false); return; }

      if (paymentIntent?.status === "succeeded") {
        const finalizeRes = await fetch("/api/finalize-booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            slotId: slot.id,
            barberId: barber.id,
            formData,
            date: slot.date,
            time: slot.time,
          }),
        });
        if (!finalizeRes.ok) {
          const err = await finalizeRes.json().catch(() => ({}));
          throw new Error(err.error || "Payment succeeded but we couldn't finish confirming your booking — please contact the business directly.");
        }
        onConfirmed();
      }
    } catch (err) {
      setError(err.message || "Something went wrong.");
      setProcessing(false);
    }
  }

  return (
    <div className="br-step-panel">
      <div className="br-section-heading br-section-heading--with-back">
        <button className="br-back" onClick={onBack} disabled={processing} aria-label="Go back to your details">←</button>
        <div>
          <p className="br-eyebrow">Secure payment</p>
          <h2>Confirm your booking</h2>
        </div>
        <span className="br-step-count">3 of 3</span>
      </div>
      <div className="br-appointment-summary">
        <span className="br-summary-icon">◷</span>
        <div><strong>{fmtDate(slot.date)}</strong><span>{slot.time}</span></div>
      </div>
      <div className="br-payment-box"><PaymentElement options={{ defaultValues: { billingDetails: { address: { country: "GB" } } } }} /></div>
      <div className="br-total-row"><span>Total due today</span><strong>£{fee.customerPaysPounds}</strong></div>
      {error && <p className="br-error">{error}</p>}
      <button className="br-button" style={{ background: brandColor }} disabled={processing || !stripe} onClick={handlePay}>
        {processing ? "Processing…" : `Pay £${fee.customerPaysPounds}`}
      </button>
    </div>
  );
}

function PayStep(props) {
  const { fee } = resolveBarberEmailAndFee(props.barber);
  if (!fee.isValid) return <p className="br-error">This business hasn't set up deposits yet — please contact them directly to book.</p>;
  return (
    <Elements stripe={stripePromise} options={{
      mode: "payment", currency: "gbp", amount: fee.customerPaysPence,
      // /api/create-intent always sets on_behalf_of to the business's connected
      // account (destination charges) — Elements must know this up front in
      // deferred mode, or confirmPayment() fails once the real clientSecret
      // comes back ("provided on_behalf_of does not match the expected null").
      onBehalfOf: props.barber?.stripeAccountId,
    }}>
      <PayInner {...props} />
    </Elements>
  );
}

export default function WidgetApp({ shopId }) {
  const [barber, setBarber] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [step, setStep] = useState("slot"); // slot | details | pay | done
  const [slot, setSlot] = useState(null);
  const [formData, setFormData] = useState(null);

  useEffect(() => {
    if (!shopId) return;
    getDoc(doc(db, "barbers", shopId)).then((snap) => {
      if (snap.exists()) setBarber({ id: snap.id, ...snap.data() });
      else setNotFound(true);
    });
  }, [shopId]);

  if (notFound) return <div className="br-widget"><p className="br-error">Booking isn't available right now.</p></div>;
  if (!barber) return <div className="br-widget"><p className="br-muted">Loading…</p></div>;

  const brandColor = barber.brandColor || "#2563EB";

  return (
    <div className="br-widget" style={{ "--br-brand": brandColor }}>
      <div className="br-header">
        <div className="br-brand-mark" aria-hidden="true"><span style={{ background: brandColor }}>B</span></div>
        <div className="br-brand-copy">
          <strong>{barber.businessName || barber.name}</strong>
          <span>Online booking</span>
        </div>
        <span className="br-secure-badge">Secure</span>
      </div>

      {step === "slot" && (
        <SlotStep barber={barber} brandColor={brandColor} onSelect={(s) => { setSlot(s); setStep("details"); }} />
      )}
      {step === "details" && (
        <DetailsStep brandColor={brandColor} onBack={() => setStep("slot")} onSubmit={(f) => { setFormData(f); setStep("pay"); }} />
      )}
      {step === "pay" && (
        <PayStep barber={barber} slot={slot} formData={formData} brandColor={brandColor} onBack={() => setStep("details")} onConfirmed={() => setStep("done")} />
      )}
      {step === "done" && (
        <div className="br-done">
          <div className="br-done-tick" style={{ background: brandColor }}>✓</div>
          <p className="br-eyebrow">Booking confirmed</p>
          <h2>You're all set</h2>
          <p>We’ll see you on <strong>{fmtDate(slot.date)}</strong> at <strong>{slot.time}</strong>.</p>
          <p className="br-muted">A confirmation has been sent to {formData?.email}.</p>
        </div>
      )}

      <div className="br-footer">Booking powered by <a href="https://bookrightly.co.uk" target="_blank" rel="noopener">Bookrightly</a></div>
    </div>
  );
}
