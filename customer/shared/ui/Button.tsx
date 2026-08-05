import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
}

export const Button = ({
  variant = "primary",
  children,
  className = "",
  ...props
}: ButtonProps) => {
  const baseStyles =
    "relative inline-flex items-center justify-center px-9 lg:px-[2.2vw] py-3.5 lg:py-[0.8vw] text-[12px] lg:text-[0.75vw] font-semibold uppercase tracking-[0.18em] font-primary rounded-full transition-all duration-300 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.97] hover:scale-[1.02]";

  const variants: Record<string, string> = {
    // Solid terracotta — filled pill button with white text
    primary:
      "bg-primary text-white border-2 border-primary hover:bg-primary-dark hover:border-primary-dark shadow-[0_4px_16px_rgba(140,82,58,0.2)] hover:shadow-[0_6px_24px_rgba(140,82,58,0.35)]",

    // Outline — transparent pill with terracotta border and text
    secondary:
      "bg-transparent border-2 border-primary text-primary hover:bg-primary hover:text-white",
  };

  const selectedVariant = variants[variant] ?? variants.primary;

  return (
    <button className={`${baseStyles} ${selectedVariant} ${className}`} {...props}>
      <span className="relative z-10">{children}</span>
    </button>
  );
};

export default Button;