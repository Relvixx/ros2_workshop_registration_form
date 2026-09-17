/**
 * Generates the official UPI payment QR from the locked payment facts.
 * Payload: upi://pay?pa=sandipshelkar.ss@oksbi&pn=Sandip%20Shelkar&am=1500&cu=INR&tn=ROS2%20Workshop%20Registration
 * NOTE: no official QR image file was supplied in the workspace, so this QR
 * is generated deterministically from the exact UPI ID/payee/amount above.
 * If the organizer later supplies their own QR image, replace the files in
 * public/payment/ with it (keep the same filenames).
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "payment");
mkdirSync(outDir, { recursive: true });

const upi = "upi://pay?pa=sandipshelkar.ss@oksbi&pn=Sandip%20Shelkar&am=1500&cu=INR&tn=ROS2%20Workshop%20Registration";

const png = join(outDir, "sandip-shelkar-upi.png");
await QRCode.toFile(png, upi, {
  errorCorrectionLevel: "M",
  margin: 2,
  width: 640,
  color: { dark: "#0a1633", light: "#ffffff" },
});

// JPG copy at the documented path (some docs reference .jpg).
// We produce it by re-encoding: QRCode lib writes PNG; for JPG we embed via
// a second render with white background — qrcode only supports PNG/SVG,
// so write an SVG-derived placeholder? Instead: copy PNG bytes is invalid.
// Use a minimal approach: also save SVG alongside, and duplicate PNG->JPG
// via sharp if available, else skip JPG.
try {
  const { default: sharp } = await import("sharp");
  await sharp(png).flatten({ background: "#ffffff" }).jpeg({ quality: 92 }).toFile(join(outDir, "sandip-shelkar-upi.jpg"));
  console.log("wrote PNG + JPG");
} catch {
  console.log("wrote PNG only (sharp unavailable — JPG fallback skipped)");
}
console.log("payload:", upi);
