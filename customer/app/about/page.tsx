import AboutHero from "@/features/about/AboutHero";
import AboutStats from "@/features/about/AboutStats";
import MissionVision from "@/features/about/MissionVision";
import Story from "@/features/about/Story";
import Timeline from "@/features/about/Timeline";
import Vision from "@/features/about/Vision";
import Teams from "@/features/about/Teams";
import HowItWorks from "@/features/about/HowItWorks";
import WhyUs from "@/features/about/WhyUs";
import Cta from "@/features/about/Cta";

export default function Home() {
  return (
    <div>
      <AboutHero />
      <AboutStats />
      <Story />
      <Timeline />
      <MissionVision />
      <Vision />
      <Teams />
      <HowItWorks />
      <WhyUs />
      <Cta />
    </div>
  );
}