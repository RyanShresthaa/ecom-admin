import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Ensure ScrollTrigger is registered
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface TextRevealProps {
  children: string;
  className?: string;
  textColorClass?: string;
}

export const TextReveal: React.FC<TextRevealProps> = ({
  children,
  className = "",
  textColorClass = "",
}) => {
  const containerRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const words = el.querySelectorAll(".reveal-word");

    const ctx = gsap.context(() => {
      gsap.fromTo(
        words,
        {
          opacity: 0,
          y: 20,
        },
        {
          opacity: 1,
          y: 0,
          stagger: 0.02,
          duration: 0.6,
          ease: "power2.out",
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none none",
          },
        },
      );
    }, el);

    return () => ctx.revert();
  }, [children]);

  const wordsArray = children.split(" ");

  return (
    <p ref={containerRef} className={`block ${className}`}>
      {wordsArray.map((word, index) => (
        <span key={index} className="inline-block overflow-hidden mr-[0.25em] ">
          <span
            className={`reveal-word inline-block leading-px ${textColorClass}`}
          >
            {word}
          </span>
        </span>
      ))}
    </p>
  );
};
