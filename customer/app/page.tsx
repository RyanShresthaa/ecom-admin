import Hero from "@/features/home/Hero";
import AboutHero from "@/features/home/AboutHero";
import Gallery from "@/features/home/Gallery";
import History from "@/features/home/History";
import Collection from "@/features/home/Collection";
import Featured from "@/features/home/Featured";
import Textile from "@/features/home/Textile";
import Marketplace from "@/features/home/Marketplace";
import Divider from "@/shared/ui/Divider";
import WhyMatina from "@/features/home/WhyMatina";
import Stats from "@/features/home/Stats";
import Testimonials from "@/features/home/Testimonials";

export default function Home() {
  return (
    <div>
      <Hero />
      <Gallery />
      <AboutHero />
      {/* <History /> */}
      {/* <Divider image="/images/hero/divider/hd1.png" alt="Footer Divider" /> */}
      <Textile />
      <WhyMatina />
      {/* <Divider image="/images/hero/divider/hd2.png" alt="Footer Divider" /> */}
      <Featured />
      <Stats />
      <Testimonials />
      <Collection />
      <Marketplace />
    </div>
  );
}


