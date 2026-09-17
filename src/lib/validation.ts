import { z } from "zod";

/** Normalize email: trim + lowercase. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Normalize Indian mobile numbers.
 * Accepts: 9876543210, +919876543210, 919876543210, 09876543210,
 * and free-form input with spaces/dashes.
 * Returns the 10-digit national number, or "" if invalid.
 */
export function normalizePhone(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (!/^[6-9]\d{9}$/.test(d)) return "";
  return d;
}

export const studentDetailsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(80, "Name must be under 80 characters.")
    .regex(/^[A-Za-z][A-Za-z .'-]*$/, "Name may contain letters, spaces and . ' - only."),
  email: z
    .string()
    .trim()
    .min(1, "Please enter your email address.")
    .max(254, "Email is too long.")
    .email("Please enter a valid email address."),
  phone: z.string().trim().min(1, "Please enter your mobile number."),
  college: z
    .string()
    .trim()
    .min(2, "Please enter your college name.")
    .max(150, "College name must be under 150 characters."),
  year: z.enum(["TE", "BE"], { message: "Please select TE or BE." }),
});

export type StudentDetails = z.infer<typeof studentDetailsSchema>;

export interface NormalizedDetails extends StudentDetails {
  emailNormalized: string;
  phoneNormalized: string;
}

/** Validate + normalize. Returns field errors in a form-friendly shape. */
export function validateDetails(input: unknown): {
  ok: true;
  data: NormalizedDetails;
} | {
  ok: false;
  errors: Record<string, string>;
} {
  const parsed = studentDetailsSchema.safeParse(input);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors };
  }
  const v = parsed.data;
  const emailNormalized = normalizeEmail(v.email);
  const phoneNormalized = normalizePhone(v.phone);
  const errors: Record<string, string> = {};
  if (!phoneNormalized) {
    errors.phone = "Please enter a valid 10-digit Indian mobile number.";
  }
  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    data: {
      fullName: v.fullName.trim().replace(/\s+/g, " "),
      email: v.email.trim(),
      phone: v.phone.trim(),
      college: v.college.trim().replace(/\s+/g, " "),
      year: v.year,
      emailNormalized,
      phoneNormalized,
    },
  };
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export function proofExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export function isAllowedProofFile(filename: string, mime: string): boolean {
  const ext = proofExtension(filename);
  const expected = EXT_TO_MIME[ext];
  if (!expected) return false;
  // MIME sent by the browser must match the extension's MIME (allow jpeg/jpg alias).
  if (mime === expected) return true;
  if (expected === "image/jpeg" && mime === "image/jpg") return true;
  return false;
}

/** Escape CSV values against spreadsheet formula injection. */
export function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export const DUPLICATE_MESSAGE =
  "A registration already exists using this email or mobile number.";

export const WORKSHOP_FULL_MESSAGE =
  "The workshop is now full. All 30 seats have been confirmed.";
