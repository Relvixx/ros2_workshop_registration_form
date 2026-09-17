import { RegisterClient } from "@/components/RegisterClient";
import { getSeatStatus } from "@/lib/seats";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Register | Unlocking Robotics with ROS2",
  description: "Register for the 5-day hands-on ROS2 workshop — ₹1,500 via UPI, 30 seats.",
};

export default async function RegisterPage() {
  const seats = await getSeatStatus();
  return <RegisterClient initialSeats={seats} />;
}
