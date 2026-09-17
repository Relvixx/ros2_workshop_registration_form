// Temporary functional self-test (validation + CSV + seat messaging).
// Run: node scripts/selftest.mjs  (no DB required)
import assert from "node:assert/strict";
import { register } from "node:module";

register("./alias-hooks.mjs", import.meta.url);

// Use tsx-free approach: compile the two pure libs with tsc into temp, then import.
// Simpler: import TS directly — Node 24 strips types natively.
const validation = await import("../src/lib/validation.ts");
const seatsMod = await import("../src/lib/seats.ts");

const {
  normalizeEmail, normalizePhone, validateDetails,
  isAllowedProofFile, csvCell, DUPLICATE_MESSAGE, WORKSHOP_FULL_MESSAGE,
} = validation;

// --- email normalization ---
assert.equal(normalizeEmail("  Aarav@Example.COM "), "aarav@example.com");

// --- phone normalization ---
assert.equal(normalizePhone("98765 43210"), "9876543210");
assert.equal(normalizePhone("+91-9876543210"), "9876543210");
assert.equal(normalizePhone("919876543210"), "9876543210");
assert.equal(normalizePhone("09876543210"), "9876543210");
assert.equal(normalizePhone("12345"), "");
assert.equal(normalizePhone("5876543210"), ""); // starts with 5 -> invalid

// --- details validation ---
let r = validateDetails({ fullName: "Aarav Patil", email: "A@b.co", phone: "9876543210", college: "MET", year: "TE" });
assert.equal(r.ok, true);
assert.equal(r.data.emailNormalized, "a@b.co");
assert.equal(r.data.phoneNormalized, "9876543210");

r = validateDetails({ fullName: "A", email: "bad", phone: "123", college: "x", year: "XX" });
assert.equal(r.ok, false);
assert.ok(r.errors.fullName && r.errors.email && r.errors.college && r.errors.year);

// invalid phone with otherwise-valid fields -> phone error (normalization stage)
r = validateDetails({ fullName: "Aarav Patil", email: "a@b.co", phone: "12345", college: "MET College", year: "TE" });
assert.equal(r.ok, false);
assert.ok(r.errors.phone);

r = validateDetails({ fullName: "Aarav Patil", email: "a@b.co", phone: "+91 98765 43210", college: "MET", year: "BE" });
assert.equal(r.ok, true);
assert.equal(r.data.phoneNormalized, "9876543210");

// --- proof file checks ---
assert.equal(isAllowedProofFile("pay.jpg", "image/jpeg"), true);
assert.equal(isAllowedProofFile("pay.jpeg", "image/jpeg"), true);
assert.equal(isAllowedProofFile("pay.png", "image/png"), true);
assert.equal(isAllowedProofFile("pay.webp", "image/webp"), true);
assert.equal(isAllowedProofFile("pay.gif", "image/gif"), false);
assert.equal(isAllowedProofFile("pay.png", "image/jpeg"), false); // mime/extension mismatch
assert.equal(isAllowedProofFile("pay.pdf", "application/pdf"), false);

// --- CSV injection guard ---
assert.equal(csvCell("=cmd|'/c calc'!A0"), "'=cmd|'/c calc'!A0");
assert.equal(csvCell("+123"), "'+123");
assert.equal(csvCell("-5"), "'-5");
assert.equal(csvCell("@user"), "'@user");
assert.equal(csvCell("a,b"), '"a,b"');
assert.equal(csvCell('say "hi"'), '"say ""hi"""');
assert.equal(csvCell("plain"), "plain");

// --- messages ---
assert.ok(DUPLICATE_MESSAGE.toLowerCase().includes("already exists"));
assert.ok(!DUPLICATE_MESSAGE.includes("@"));
assert.ok(WORKSHOP_FULL_MESSAGE.includes("30"));

// --- seat messaging (offline fallback path: no env -> unconfigured) ---
const status = await seatsMod.getSeatStatus();
assert.equal(status.configured, false);
assert.equal(status.capacity, 30);
assert.equal(seatsMod.seatMessage({ capacity: 30, confirmed: 9, remaining: 21, isFull: false, configured: true }), "9 / 30 seats filled");
assert.equal(seatsMod.seatMessage({ capacity: 30, confirmed: 26, remaining: 4, isFull: false, configured: true }), "Only 4 seats remaining");
assert.equal(seatsMod.seatMessage({ capacity: 30, confirmed: 29, remaining: 1, isFull: false, configured: true }), "Only 1 seat remaining");
assert.equal(seatsMod.seatMessage({ capacity: 30, confirmed: 30, remaining: 0, isFull: true, configured: true }), "Workshop Full");

// --- payment wording guard: no affirmative "verified" claims in user-facing copy ---
// ("are not bank-verified" disclaimers are compliant — strip them before testing)
const regClient = await import("node:fs").then((fs) => fs.readFileSync("src/components/RegisterClient.tsx", "utf8"));
const stripped = regClient.replace(/not bank-verified/gi, "");
assert.ok(!/(payment|bank|transaction)[ -]?verified/i.test(stripped), "must not claim bank verification");
assert.ok(/Payment proof received/i.test(regClient), "must show 'Payment proof received'");

console.log("selftest: all assertions passed");
