"use client";

import React, { useState } from "react";

interface CTAButtonProps {
  label?: string;
  u?: number;
  onClick?: () => void;
}

export const CTAButton: React.FC<CTAButtonProps> = ({
  label = "Get started now",
  u = 1,
  onClick,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      className="inline-flex items-center justify-center font-medium text-black bg-white select-none outline-none cursor-pointer"
      style={{
        height: `${41 * u}px`,
        paddingLeft: `${17 * u}px`,
        paddingRight: `${17 * u}px`,
        borderRadius: `${10 * u}px`,
        fontSize: `${15 * u}px`,
        fontWeight: 500,
        letterSpacing: "-0.01em",
        transform: isActive
          ? "translateY(0px) scale(0.985)"
          : isHovered
          ? "translateY(-2px)"
          : "translateY(0px)",
        boxShadow: isHovered
          ? "0 6px 24px -2px rgba(255,122,44,0.4), 0 2px 8px rgba(0,0,0,0.3)"
          : "0 2px 8px rgba(0,0,0,0.5)",
        transition: "transform 180ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 180ms ease",
      }}
    >
      {label}
    </button>
  );
};
