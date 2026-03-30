import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Adds an orange left border accent — used for active/selected states */
  accent?: boolean;
}

export function Card({ children, className = "", accent = false }: CardProps) {
  return (
    <div
      className={[
        "bg-ot-elevated border border-ot-border rounded-xl p-6",
        "transition-all duration-150 ease-in-out",
        accent ? "border-l-4 border-l-ot-orange-500" : "",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
