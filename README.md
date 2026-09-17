# ROS2 Workshop Registration — Unlocking Robotics with ROS2

5-day hands-on robotics training microsite: landing page + UPI registration flow + organizer dashboard.

- **Event:** Unlocking Robotics with Robot Operating System (ROS2)
- **Dates:** 28 Sep – 02 Oct 2026 · Offline · TE & BE · ₹1,500 · 30 seats
- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind CSS v4 · Supabase (Postgres + Storage) · Zod · Lucide

## Routes

| Route | Purpose |
|---|---|
| `/` | Landing page (hero, curriculum, trainers, Robotry, details, FAQ, CTA) |
| `/register` | 3-step flow: Details → UPI Payment + screenshot → Confirmation |
| `/admin` | Password-only organizer dashboard (metrics, table, proof viewer, cancel, CSV) |
| `GET /api/seats` | Public aggregate seat status only (capacity / confirmed / remaining / isFull) |
| `POST /api/registrations/draft` | Validate details, duplicate-check, create draft + resume token |
| `GET /api/registrations/draft?id=&token=` | Resume draft after refresh (server is source of truth) |
| `POST /api/registrations/proof` | Multipart screenshot upload to private `payment-proofs` bucket |
| `POST /api/registrations/confirm` | Atomic seat finalization via `finalize_registration` RPC (idempotent) |
| `POST /api/admin/login` / `DELETE /api/admin/login` | Password login / logout (signed HttpOnly cookie) |
| `GET /api/admin/registrations` | Metrics + filterable table (admin only) |
| `GET /api/admin/proof?id=` | Short-lived (180s) signed proof URL (admin only) |
| `POST /api/admin/cancel` | Atomic cancel + seat reopen via `cancel_registration` RPC |
| `GET /api/admin/export` | Formula-injection-safe CSV export (admin only) |

## Setup

1. `npm install`
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (server only — never `NEXT_PUBLIC_`)
   - `ADMIN_PASSWORD` (organizer dashboard password)
   - `ADMIN_SESSION_SECRET` (≥16 chars, signs admin JWT cookies)
   - `NEXT_PUBLIC_SITE_URL` (e.g. `http://localhost:3000`)
3. In Supabase SQL editor, run in order:
   - `supabase/migrations/0001_init.sql` (tables, indexes, RLS, seed, `get_seat_status`)
   - `supabase/migrations/0002_atomic_ops.sql` (`finalize_registration`, `cancel_registration`)
   - `supabase/migrations/0003_storage.sql` (private `payment-proofs` bucket)
4. `npm run dev` → http://localhost:3000

## Key guarantees

- **30-seat cap:** only the `finalize_registration` RPC consumes a seat, under
  `SELECT … FOR UPDATE` on the `workshop_settings` row. Concurrent final-seat
  submits serialize — exactly one succeeds.
- **Idempotent confirm:** re-POSTing confirm for a confirmed draft returns the
  existing `registration_code` (double-click safe).
- **Duplicates:** partial unique indexes on `email_normalized` / `phone_normalized`
  for `draft` + `confirmed` rows; cancelled rows free the values for reuse.
- **Proof privacy:** `payment-proofs` bucket is private, no public policies;
  uploads + signed URLs use the service-role key server-side only.
- **Payment wording:** UI says “Payment proof received” / `submitted_unverified`;
  never “Payment verified”.
- **Draft recovery:** draft id + 64-char resume token persist in localStorage;
  only the SHA-256 hash is stored server-side; refresh re-fetches from the server.
- **Admin:** password from env, constant-time compare, 12-hour signed HttpOnly
  cookie (`SameSite=Lax`, `Secure` in production).

## Payment details (locked)

- Payee: **Sandip Shelkar** · UPI: `sandipshelkar.ss@oksbi` · Amount: **₹1,500**
- QR: `public/payment/sandip-shelkar-upi.png` (primary) with
  `public/payment/sandip-shelkar-upi.jpg` fallback. To use an organizer-supplied
  QR, replace these two files keeping the same filenames, or run
  `npm run qr` to regenerate the deterministic QR from the locked UPI facts.
- Deep link: `upi://pay?pa=sandipshelkar.ss@oksbi&pn=Sandip%20Shelkar&am=1500&cu=INR&tn=ROS2%20Workshop%20Registration`

## Scripts

- `npm run dev` / `npm run build` / `npm run start`
- `npm run lint` · `npm run typecheck`
- `npm run qr` — regenerate payment QR from locked facts
- `npm run selftest` — offline unit checks (validation, proof rules, CSV guard, seat tiers)

## Notes

- RLS: no direct anon/authenticated access to registration rows or proofs;
  public reads go through the `get_seat_status` RPC aggregate only.
- Registration codes: `ROS2-2026-0001…` from `registration_seq` (gap-tolerant).
- See `ROS2_WORKSHOP_PROJECT_CONTEXT.md` → IMPLEMENTATION STATE for the
  authoritative file/DB/env inventory.
