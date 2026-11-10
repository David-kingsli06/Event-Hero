"use client";

import React, { useState } from "react";

export const VerraNavigation: React.FC = () => {
  const [connectHovered, setConnectHovered] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <header
      aria-label="Helio navigation"
      style={{
        position: "absolute",
        top: "calc(24 * var(--u, 1px))",
        left: "calc(26 * var(--u, 1px))",
        right: "calc(24 * var(--u, 1px))",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        zIndex: 10,
        pointerEvents: "auto",
      }}
    >
      {/* ── Brand ───────────────────────────── */}
      <a
        href="#"
        aria-label="Helio home"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "calc(7 * var(--u, 1px))",
          textDecoration: "none",
          outline: "none",
        }}
      >
        {/* Outlined diamond + open-V mark */}
        <svg
          aria-hidden="true"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            width: "calc(20 * var(--u, 1px))",
            height: "calc(20 * var(--u, 1px))",
            flexShrink: 0,
          }}
        >
          <path
            d="M12 2.5L20.5 12L12 21.5L3.5 12L12 2.5Z"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.90"
          />
          <path
            d="M7.5 9.5L12 14.5L16.5 9.5"
            stroke="white"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span
          style={{
            fontSize: "calc(17.5 * var(--u, 1px))",
            fontWeight: 500,
            letterSpacing: "-0.015em",
            color: "#ffffff",
          }}
        >
          Helio
        </span>
      </a>

      {/* ── Right side ───────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: "calc(4 * var(--u, 1px))" }}>
        {/* Frosted pill nav */}
        <nav
          aria-label="Primary navigation"
          style={{
            display: "flex",
            alignItems: "center",
            height: "calc(29 * var(--u, 1px))",
            padding: "0 calc(6 * var(--u, 1px))",
            borderRadius: "calc(8 * var(--u, 1px))",
            background: "rgba(150,150,150,0.38)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {["Explore", "Circles", "People"].map((item) => (
            <a
              key={item}
              href={`#${item.toLowerCase()}`}
              onMouseEnter={() => setHoveredItem(item)}
              onMouseLeave={() => setHoveredItem(null)}
              style={{
                display: "inline-block",
                padding: "0 calc(10 * var(--u, 1px))",
                fontSize: "calc(14 * var(--u, 1px))",
                fontWeight: 450,
                lineHeight: 1,
                color: hoveredItem === item ? "rgba(255,255,255,1)" : "rgba(255,255,255,0.80)",
                textDecoration: "none",
                outline: "none",
                transform: hoveredItem === item ? "translateY(-0.5px)" : "translateY(0)",
                transition: "color 150ms ease, transform 150ms ease",
              }}
            >
              {item}
            </a>
          ))}
        </nav>

        {/* Connect button */}
        <button
          type="button"
          onMouseEnter={() => setConnectHovered(true)}
          onMouseLeave={() => setConnectHovered(false)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(29 * var(--u, 1px))",
            padding: "0 calc(13 * var(--u, 1px))",
            borderRadius: "calc(8 * var(--u, 1px))",
            fontSize: "calc(14 * var(--u, 1px))",
            fontWeight: 500,
            color: "#000",
            background: "#ffffff",
            border: "none",
            cursor: "pointer",
            outline: "none",
            transform: connectHovered ? "translateY(-1px)" : "translateY(0)",
            boxShadow: connectHovered
              ? "0 2px 12px rgba(255,255,255,0.18)"
              : "0 1px 3px rgba(0,0,0,0.3)",
            transition: "transform 160ms ease, box-shadow 160ms ease",
          }}
        >
          Connect
        </button>
      </div>
    </header>
  );
};
