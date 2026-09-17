"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BadgeCheck,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  UploadCloud,
} from "lucide-react";
import { WORKSHOP, YEAR_LABELS, type WorkshopYear } from "@/config/workshop";
import type { SeatStatus } from "@/lib/seats";
import { SeatBadge } from "@/components/SeatBadge";

type Step = "details" | "payment" | "done";

interface DraftInfo {
  id: string;
  token: string;
  fullName: string;
  email: string;
  phone: string;
  college: string;
  year: WorkshopYear;
}

interface FieldErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  college?: string;
  year?: string;
  form?: string;
}

const LS_ID = "ros2_draft_id";
const LS_TOKEN = "ros2_draft_token";
const LS_META = "ros2_draft_meta";

function clientValidate(v: Record<string, string>): FieldErrors {
  const e: FieldErrors = {};
  if (v.fullName.trim().length < 2 || v.fullName.trim().length > 80)
    e.fullName = "Please enter your full name (2–80 characters).";
  else if (!/^[A-Za-z][A-Za-z .'-]*$/.test(v.fullName.trim()))
    e.fullName = "Name may contain letters, spaces and . ' - only.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.email.trim())) e.email = "Please enter a valid email address.";
  const digits = v.phone.replace(/\D/g, "");
  let n = digits;
  if (n.length === 12 && n.startsWith("91")) n = n.slice(2);
  else if (n.length === 11 && n.startsWith("0")) n = n.slice(1);
  if (!/^[6-9]\d{9}$/.test(n)) e.phone = "Please enter a valid 10-digit Indian mobile number.";
  if (v.college.trim().length < 2) e.college = "Please enter your college name.";
  if (v.year !== "TE" && v.year !== "BE") e.year = "Please select TE or BE.";
  return e;
}

const inputCls = (invalid: boolean) =>
  `h-12 w-full rounded-xl border bg-white px-4 text-[15px] text-ink-900 placeholder:text-ink-500/50 outline-none transition ${
    invalid
      ? "border-rose-700 focus:border-rose-700"
      : "border-line focus:border-cobalt-500"
  }`;

export function RegisterClient({ initialSeats }: { initialSeats: SeatStatus }) {
  const [seats, setSeats] = useState<SeatStatus>(initialSeats);
  const [step, setStep] = useState<Step>("details");
  const [values, setValues] = useState({ fullName: "", email: "", phone: "", college: "", year: "" });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<DraftInfo | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [proofError, setProofError] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [confirmResult, setConfirmResult] = useState<{ code: string; at: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrSrc, setQrSrc] = useState<string>(WORKSHOP.qrImagePath);

  const submitLock = useRef(false);

  const refreshSeats = useCallback(async () => {
    try {
      const r = await fetch("/api/seats", { cache: "no-store" });
      if (r.ok) setSeats(await r.json());
    } catch {
      /* keep last known */
    }
  }, []);

  // Resume a draft after refresh (server is source of truth; localStorage holds the token).
  // Seat refresh is scheduled (not run synchronously) to keep mount effects free of sync setState.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshSeats();
    }, 0);
    try {
      const id = localStorage.getItem(LS_ID);
      const token = localStorage.getItem(LS_TOKEN);
      const meta = localStorage.getItem(LS_META);
      if (!id || !token) return () => window.clearTimeout(timer);
      fetch(`/api/registrations/draft?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
        .then(async (r) => {
          if (!r.ok) {
            localStorage.removeItem(LS_ID);
            localStorage.removeItem(LS_TOKEN);
            localStorage.removeItem(LS_META);
            return;
          }
          const j = await r.json();
          const d = j.draft;
          if (d.registration_status === "confirmed" && d.registration_code) {
            setConfirmResult({ code: d.registration_code, at: d.confirmed_at ?? "" });
            setDraft({
              id: d.id, token,
              fullName: d.full_name, email: d.email, phone: d.phone,
              college: d.college, year: d.year,
            });
            setStep("done");
            return;
          }
          if (d.registration_status === "draft") {
            setDraft({
              id: d.id, token,
              fullName: d.full_name, email: d.email, phone: d.phone,
              college: d.college, year: d.year,
            });
            if (d.payment_proof_path) setUploaded(true);
            if (meta) {
              try {
                const m = JSON.parse(meta);
                setValues({ fullName: m.fullName ?? d.full_name, email: m.email ?? d.email, phone: m.phone ?? d.phone, college: m.college ?? d.college, year: m.year ?? d.year });
              } catch { /* ignore */ }
            }
            setStep("payment");
          }
        })
        .catch(() => {});
    } catch { /* private mode etc. */ }
    return () => window.clearTimeout(timer);
  }, [refreshSeats]);

  // Proof preview object URL: derived (not stored) so no setState-in-effect.
  // The cleanup revokes the previous URL on change/unmount.
  const previewUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const set = (k: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined, form: undefined }));
  };

  async function submitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const local = clientValidate(values);
    if (Object.keys(local).length > 0) {
      setErrors(local);
      document.getElementById("register-errors")?.focus();
      return;
    }
    setBusy(true);
    setErrors({});
    try {
      const r = await fetch("/api/registrations/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: values.fullName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          college: values.college.trim(),
          year: values.year,
        }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        if (j.code === "workshop_full") {
          setErrors({ form: "The workshop just filled up — all 30 seats are confirmed." });
          refreshSeats();
        } else if (j.code === "duplicate") {
          setErrors({ form: "A registration already exists using this email or mobile number." });
        } else if (j.code === "invalid" && j.errors) {
          setErrors(j.errors);
        } else if (j.code === "db_not_configured") {
          setErrors({ form: "Registration backend is still being connected. Please try again shortly." });
        } else {
          setErrors({ form: "Something went wrong. Please check your details and try again." });
        }
        return;
      }
      const info: DraftInfo = {
        id: j.draftId,
        token: j.token,
        fullName: values.fullName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        college: values.college.trim(),
        year: values.year as WorkshopYear,
      };
      setDraft(info);
      try {
        localStorage.setItem(LS_ID, info.id);
        localStorage.setItem(LS_TOKEN, info.token);
        localStorage.setItem(LS_META, JSON.stringify({ fullName: info.fullName, email: info.email, phone: info.phone, college: info.college, year: info.year }));
      } catch { /* ignore */ }
      setStep("payment");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErrors({ form: "Network error. Please check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  function pickFile(f: File | undefined) {
    setProofError(null);
    setUploaded(false);
    if (!f) {
      setFile(null);
      return;
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(f.type)) {
      setProofError("Only JPG, PNG or WEBP screenshots are accepted.");
      setFile(null);
      return;
    }
    if (f.size > WORKSHOP.proofMaxBytes) {
      setProofError("Screenshot must be under 5 MB. Please compress and retry.");
      setFile(null);
      return;
    }
    setFile(f);
  }

  async function copyUpi() {
    try {
      await navigator.clipboard.writeText(WORKSHOP.upiId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers: select-based copy.
      const ta = document.createElement("textarea");
      ta.value = WORKSHOP.upiId;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch { /* ignore */ }
      ta.remove();
    }
  }

  async function submitConfirm() {
    if (!draft || (!file && !uploaded) || !agreed || submitLock.current) return;
    submitLock.current = true;
    setBusy(true);
    setProofError(null);
    setErrors({});
    try {
      // 1. Upload proof (private bucket) — skipped if a proof is already
      // saved for this draft and the user didn't pick a new file.
      if (file) {
        const form = new FormData();
        form.append("draftId", draft.id);
        form.append("token", draft.token);
        form.append("file", file, file.name);
        const up = await fetch("/api/registrations/proof", { method: "POST", body: form });
        const uj = await up.json();
        if (!up.ok || !uj.ok) {
          if (uj.code === "file_too_large") setProofError("Screenshot must be under 5 MB.");
          else if (uj.code === "invalid_file") setProofError("Only JPG, PNG or WEBP screenshots are accepted.");
          else if (uj.code === "invalid_draft") {
            setErrors({ form: "This draft is no longer valid. Please start again." });
            setStep("details");
          } else setProofError("Upload failed. Please try again.");
          return;
        }
        setUploaded(true);
      }

      // 2. Atomic finalization (idempotent — safe to retry / double-click).
      const cf = await fetch("/api/registrations/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId: draft.id, token: draft.token }),
      });
      const cj = await cf.json();
      if (cf.ok && cj.ok) {
        setConfirmResult({ code: cj.registrationCode, at: cj.confirmedAt ?? "" });
        try {
          localStorage.removeItem(LS_ID);
          localStorage.removeItem(LS_TOKEN);
          localStorage.removeItem(LS_META);
        } catch { /* ignore */ }
        setStep("done");
        refreshSeats();
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (cj.code === "workshop_full") {
        setErrors({ form: "The final seat was just taken — the workshop is now full. If your payment went through, contact a student coordinator with your payment reference." });
        refreshSeats();
      } else if (cj.code === "duplicate") {
        setErrors({ form: "A registration already exists using this email or mobile number." });
      } else {
        setErrors({ form: "Confirmation failed. Your screenshot is saved — please tap Submit again." });
      }
    } catch {
      setErrors({ form: "Network error. Your screenshot may be saved — please tap Submit again." });
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      {/* Progress */}
      <ol className="flex items-center gap-2 text-[13px] font-bold" aria-label="Registration progress">
        <li aria-current={step === "details" ? "step" : undefined} className={step === "details" ? "text-navy-950" : "text-mint-600"}>
          <span className="mr-1.5 inline-grid size-6 place-items-center rounded-full bg-navy-950 font-mono text-[11px] text-white">01</span>
          Details
        </li>
        <li aria-hidden="true" className="h-px w-8 bg-line sm:w-14" />
        <li aria-current={step === "payment" ? "step" : undefined} className={step === "payment" ? "text-navy-950" : step === "done" ? "text-mint-600" : "text-ink-500"}>
          <span className={`mr-1.5 inline-grid size-6 place-items-center rounded-full font-mono text-[11px] text-white ${step === "details" ? "bg-ink-500/40" : "bg-navy-950"}`}>02</span>
          Payment
        </li>
        <li aria-hidden="true" className="h-px w-8 bg-line sm:w-14" />
        <li className={step === "done" ? "text-navy-950" : "text-ink-500"}>
          <span className={`mr-1.5 inline-grid size-6 place-items-center rounded-full font-mono text-[11px] text-white ${step === "done" ? "bg-navy-950" : "bg-ink-500/40"}`}>03</span>
          Confirmed
        </li>
      </ol>

      {step === "details" && (
        <section aria-labelledby="details-heading" className="mt-6 rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
          <h1 id="details-heading" className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">
            Reserve Your Workshop Seat
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <SeatBadge seats={seats} />
            <p className="text-sm font-semibold text-ink-600">
              Fee <span className="text-navy-950">{WORKSHOP.feeLabel}</span> · takes ~1 minute
            </p>
          </div>

          {seats.isFull ? (
            <div className="mt-6 rounded-2xl border border-rose-700/20 bg-rose-50 p-5" role="alert">
              <p className="font-display text-lg font-bold text-rose-700">Workshop Full</p>
              <p className="mt-1 text-sm text-ink-600">All 30 seats have been confirmed. New registrations are closed.</p>
            </div>
          ) : (
            <form onSubmit={submitDetails} noValidate className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className="mb-1.5 block text-sm font-bold text-navy-950">Full Name</label>
                <input id="fullName" name="fullName" type="text" autoComplete="name" value={values.fullName}
                  onChange={set("fullName")} className={inputCls(!!errors.fullName)}
                  aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? "err-fullName" : undefined}
                  placeholder="e.g. Aarav Patil" maxLength={80} />
                {errors.fullName && <p id="err-fullName" role="alert" className="mt-1.5 text-[13px] font-medium text-rose-700">{errors.fullName}</p>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-bold text-navy-950">Email Address</label>
                  <input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={values.email}
                    onChange={set("email")} className={inputCls(!!errors.email)}
                    aria-invalid={!!errors.email} aria-describedby={errors.email ? "err-email" : undefined}
                    placeholder="you@example.com" maxLength={254} />
                  {errors.email && <p id="err-email" role="alert" className="mt-1.5 text-[13px] font-medium text-rose-700">{errors.email}</p>}
                </div>
                <div>
                  <label htmlFor="phone" className="mb-1.5 block text-sm font-bold text-navy-950">Mobile Number</label>
                  <input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" value={values.phone}
                    onChange={set("phone")} className={inputCls(!!errors.phone)}
                    aria-invalid={!!errors.phone} aria-describedby={errors.phone ? "err-phone" : "hint-phone"}
                    placeholder="98765 43210" maxLength={15} />
                  {errors.phone
                    ? <p id="err-phone" role="alert" className="mt-1.5 text-[13px] font-medium text-rose-700">{errors.phone}</p>
                    : <p id="hint-phone" className="mt-1.5 text-xs text-ink-500">10-digit Indian mobile number.</p>}
                </div>
              </div>
              <div>
                <label htmlFor="college" className="mb-1.5 block text-sm font-bold text-navy-950">College Name</label>
                <input id="college" name="college" type="text" autoComplete="organization" value={values.college}
                  onChange={set("college")} className={inputCls(!!errors.college)}
                  aria-invalid={!!errors.college} aria-describedby={errors.college ? "err-college" : undefined}
                  placeholder="e.g. MET's Institute of Technology" maxLength={150} />
                {errors.college && <p id="err-college" role="alert" className="mt-1.5 text-[13px] font-medium text-rose-700">{errors.college}</p>}
              </div>
              <fieldset>
                <legend className="mb-1.5 text-sm font-bold text-navy-950">Year</legend>
                <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Year">
                  {(["TE", "BE"] as const).map((y) => (
                    <label key={y} className={`flex h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-bold transition ${values.year === y ? "border-cobalt-600 bg-cobalt-50 text-navy-950" : "border-line bg-white text-ink-600 hover:border-cobalt-500"}`}>
                      <input type="radio" name="year" value={y} checked={values.year === y} onChange={set("year")} className="sr-only" />
                      {YEAR_LABELS[y]}
                    </label>
                  ))}
                </div>
                {errors.year && <p role="alert" className="mt-1.5 text-[13px] font-medium text-rose-700">{errors.year}</p>}
              </fieldset>

              {errors.form && (
                <p id="register-errors" role="alert" tabIndex={-1} className="rounded-xl border border-rose-700/20 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {errors.form}
                </p>
              )}

              <button type="submit" disabled={busy}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cobalt-600 text-base font-bold text-white shadow-card transition hover:bg-navy-900 disabled:opacity-60">
                {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
                {busy ? "Reserving…" : "Continue to Payment"}
              </button>
              <p className="text-center text-xs text-ink-500">No seat is reserved yet — that happens when your payment proof is submitted.</p>
            </form>
          )}
        </section>
      )}

      {step === "payment" && draft && (
        <section aria-labelledby="pay-heading" className="mt-6 space-y-4">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-card sm:p-8">
            <h1 id="pay-heading" className="font-display text-2xl font-bold text-navy-950 sm:text-3xl">Complete Your Registration</h1>
            <p className="mt-2 text-sm text-ink-600">
              {draft.fullName} · {draft.email} · {draft.phone} · {draft.college} · {draft.year}
            </p>
            {errors.form && (
              <p role="alert" className="mt-4 rounded-xl border border-rose-700/20 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{errors.form}</p>
            )}

            <div className="mt-5 rounded-2xl border border-amber-700/25 bg-amber-50 px-4 py-3.5" role="note">
              <p className="flex items-start gap-2 text-[13px] font-medium leading-relaxed text-amber-700">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {WORKSHOP.paymentWarning}
              </p>
            </div>

            {/* Payment card */}
            <div className="mt-5 rounded-2xl bg-navy-950 p-6 text-center text-white sm:p-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/60">Workshop fee</p>
              <p className="mt-1 font-display text-4xl font-bold">{WORKSHOP.feeLabel}</p>
              <p className="mt-2 text-sm text-white/75">Pay to <span className="font-bold text-white">{WORKSHOP.payeeName}</span></p>
              <div className="mx-auto mt-5 w-fit rounded-2xl bg-white p-3">
                <Image src={qrSrc} alt={`UPI QR code to pay ${WORKSHOP.feeLabel} to ${WORKSHOP.payeeName}`} width={220} height={220}
                  className="size-44 sm:size-56" priority
                  onError={() => { if (qrSrc !== WORKSHOP.qrImageFallbackPath) setQrSrc(WORKSHOP.qrImageFallbackPath); }} />
              </div>
              <div className="mx-auto mt-4 flex max-w-sm items-center gap-2 rounded-xl bg-white/10 px-3 py-2.5">
                <code className="min-w-0 flex-1 truncate font-mono text-sm font-semibold" aria-label="UPI ID">{WORKSHOP.upiId}</code>
                <button type="button" onClick={copyUpi} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-white/15 px-3 text-[13px] font-bold transition hover:bg-white/25" aria-live="polite">
                  <Copy className="size-4" aria-hidden="true" /> {copied ? "Copied!" : "Copy UPI ID"}
                </button>
              </div>
              <a href={WORKSHOP.upiDeepLink}
                className="mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-cobalt-500 px-6 text-sm font-bold text-white transition hover:bg-cobalt-600">
                Open UPI App <ExternalLink className="size-4" aria-hidden="true" />
              </a>
            </div>

            {/* Upload */}
            <div className="mt-5">
              <label htmlFor="proof" className="mb-1.5 block text-sm font-bold text-navy-950">Upload Payment Screenshot</label>
              <p id="proof-hint" className="mb-2 text-xs text-ink-500">JPG, PNG or WEBP · max 5 MB · from your gallery or camera.</p>
              <label htmlFor="proof"
                className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-paper px-4 py-8 text-center transition hover:border-cobalt-500">
                <UploadCloud className="size-8 text-cobalt-600" aria-hidden="true" />
                <span className="text-sm font-bold text-navy-950">{file ? "Choose a different screenshot" : "Tap to choose screenshot"}</span>
                <span className="text-xs text-ink-500">{file ? file.name : "No file chosen yet"}</span>
              </label>
              <input id="proof" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
                aria-describedby="proof-hint"
                onChange={(e) => pickFile(e.target.files?.[0])} />
              {previewUrl && file && (
                <div className="mt-3 overflow-hidden rounded-2xl border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Preview of your payment screenshot" className="max-h-80 w-full object-contain bg-navy-950" />
                  <p className="flex items-center gap-1.5 bg-mint-50 px-4 py-2.5 text-[13px] font-semibold text-mint-600">
                    <BadgeCheck className="size-4" aria-hidden="true" /> Preview ready — replace it anytime before submitting.
                  </p>
                </div>
              )}
              {proofError && <p role="alert" className="mt-2 text-[13px] font-medium text-rose-700">{proofError}</p>}
              {uploaded && !proofError && file && <p role="status" className="mt-2 text-[13px] font-medium text-mint-600">Screenshot saved securely — you can replace it before submitting.</p>}
              {uploaded && !proofError && !file && <p role="status" className="mt-2 text-[13px] font-medium text-mint-600">A screenshot is already saved for this draft — choosing a new file replaces it.</p>}
            </div>

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-2xl border border-line bg-paper px-4 py-3.5">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
                className="mt-1 size-4 accent-[#1d4ed8]" />
              <span className="text-sm leading-relaxed text-ink-600">
                I confirm that I have paid {WORKSHOP.feeLabel} and the uploaded screenshot is my payment proof.
              </span>
            </label>

            <button type="button" onClick={submitConfirm} disabled={busy || (!file && !uploaded) || !agreed}
              className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cobalt-600 text-base font-bold text-white shadow-card transition hover:bg-navy-900 disabled:opacity-50">
              {busy && <Loader2 className="size-5 animate-spin" aria-hidden="true" />}
              {busy ? "Confirming…" : "Submit & Confirm Registration"}
            </button>
            <div className="mt-3 text-center"><SeatBadge seats={seats} /></div>
          </div>
        </section>
      )}

      {step === "done" && confirmResult && (
        <section aria-labelledby="done-heading" className="mt-6 rounded-3xl border border-line bg-card p-6 text-center shadow-card sm:p-10">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-mint-50 text-mint-600" aria-hidden="true">
            <CheckCircle2 className="size-9" />
          </span>
          <h1 id="done-heading" className="mt-4 font-display text-2xl font-bold text-navy-950 sm:text-3xl">Registration Confirmed</h1>
          <p className="mt-2 text-sm text-ink-600">You&apos;re registered for</p>
          <p className="font-display text-lg font-bold text-navy-950">{WORKSHOP.titleShort}</p>
          <dl className="mx-auto mt-6 max-w-sm space-y-2.5 text-left">
            <div className="rounded-2xl bg-navy-950 px-5 py-4 text-center">
              <dt className="text-xs font-bold uppercase tracking-[0.18em] text-white/60">Registration ID</dt>
              <dd className="mt-1 font-mono text-2xl font-bold tracking-wide text-white">{confirmResult.code}</dd>
            </div>
            {[
              ["Dates", WORKSHOP.datesLabel],
              ["Mode", `${WORKSHOP.mode} Workshop`],
              ["Payment", `${WORKSHOP.feeLabel} · Payment proof received`],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between rounded-xl bg-paper px-5 py-3 text-sm">
                <dt className="font-semibold text-ink-500">{k}</dt>
                <dd className="font-bold text-navy-950">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mx-auto mt-5 max-w-sm text-xs leading-relaxed text-ink-500">
            Save your Registration ID — show it at the venue along with your payment reference if asked.
            Screenshots are accepted as proof of payment and are not bank-verified.
          </p>
        </section>
      )}
    </div>
  );
}
