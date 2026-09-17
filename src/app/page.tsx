import { AboutStrip, Curriculum, Details, Faq, FinalCta, Hero, Robotry, TechStack, Trainers } from "@/components/landing";
import { getSeatStatus } from "@/lib/seats";

export const dynamic = "force-dynamic";

export default async function Home() {
  const seats = await getSeatStatus();
  return (
    <>
      <Hero seats={seats} />
      <AboutStrip />
      <Curriculum />
      <TechStack />
      <Trainers />
      <Robotry />
      <Details seats={seats} />
      <Faq />
      <FinalCta seats={seats} />
    </>
  );
}
