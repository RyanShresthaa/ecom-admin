'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface TeamMember {
  image: string;
  role: string;
  name: string;
  location: string;
}

const teamMembers: TeamMember[] = [
  {
    image: "/images/about/team/team-1.png",
    role: "Wood Carving",
    name: "Ramesh Kumar",
    location: "Kathmandu"
  },
  {
    image: "/images/about/team/team-2.png",
    role: "Metal Craft",
    name: "Tsering Dorje",
    location: "Patan"
  },
  {
    image: "/images/about/team/team-3.png",
    role: "Hand Weaving",
    name: "Maya Tamang",
    location: "Bhaktapur"
  },
  {
    image: "/images/about/team/team-4.png",
    role: "Pashmina",
    name: "Dawa Sherpa",
    location: "Kathmandu"
  }
];

const Teams = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll('.team-card');
    gsap.fromTo(
      cards,
      { opacity: 0, y: 35 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.15,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: container,
          start: 'top 85%',
          toggleActions: 'play none none none',
        },
      }
    );
  }, []);

  return (
    <section className="w-full pb-16 sm:pb-24 select-none bg-background">
      <div className="container-custom max-w-7xl mx-auto px-4">
        
        <div className="relative w-full rounded-2xl md:rounded-3xl overflow-hidden py-16 sm:py-24 px-6 sm:px-12 text-center min-h-[250px] sm:min-h-[300px] flex flex-col justify-center items-center gap-4">
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-transform duration-2000 hover:scale-105"
            style={{ backgroundImage: "url('/images/hero/hero-bg.jpg')" }}
          />
          <div className="absolute inset-0 bg-black/55" />

          <div className="relative z-10 flex flex-col items-center gap-3 sm:gap-4 max-w-xl mx-auto">
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.25em] text-primary-heading">
              The People Behind the Craft
            </span>
            <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white tracking-tight">
              Every Masterpiece Has A Story.
            </h2>
            <p className="font-secondary text-xs sm:text-sm text-white/80 leading-relaxed max-w-md">
              Behind every handcrafted product is an artisan carrying generations of knowledge, skill, and passion.
            </p>
          </div>
        </div>

        <div 
          ref={containerRef}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-12 md:mt-16"
        >
          {teamMembers.map((member, index) => (
            <div 
              key={index}
              className="team-card bg-white rounded-2xl border border-primary/10 overflow-hidden flex flex-col"
            >
              <div className="relative w-full aspect-4/5 overflow-hidden">
                <Image
                  src={member.image}
                  alt={`${member.name} - ${member.role}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  className="object-cover object-center transition-transform duration-750 hover:scale-105"
                />
              </div>

              <div className="p-6 flex flex-col items-start text-left">
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-primary-heading uppercase mb-1">
                  {member.role}
                </span>
                <h4 className="font-heading text-lg sm:text-xl font-semibold text-primary-dark mb-1">
                  {member.name}
                </h4>
                <span className="font-secondary text-xs sm:text-sm text-body/75">
                  {member.location}
                </span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Teams;