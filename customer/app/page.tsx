import AboutHero from "@/features/home/AboutHero";
import Collection from "@/features/home/Collection";
import Featured from "@/features/home/Featured";
import Gallery from "@/features/home/Gallery";
import Hero from "@/features/home/Hero";
import Marketplace from "@/features/home/Marketplace";
import Stats from "@/features/home/Stats";
import Testimonials from "@/features/home/Testimonials";
import Textile from "@/features/home/Textile";
import WhyMatina from "@/features/home/WhyMatina";

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


