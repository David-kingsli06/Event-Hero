"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { CinematicVortexCanvas } from "./CinematicVortexCanvas";
import { VerraNavigation } from "./VerraNavigation";
import { TypewriterHeadline } from "./TypewriterHeadline";
import { CTAButton } from "./CTAButton";

interface VerraHeroProps {
  isRecording?: boolean;
}

export const VerraHero: React.FC<VerraHeroProps> = ({ isRecording = false }) => {
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [u, setU] = useState<number>(1);
  const [dims, setDims] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  const pointerRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  const recordingProgressRef = useRef<number>(0);
  const recordingAnimRef = useRef<Animation | null>(null);

  const measure = useCallback(() => {
    const el = frameRef.current;
    if (!el) return;
    const w = el.clientWidth;
    const h = el.clientHeight;
    if (!w || !h) return;
    const unit = w < 768 ? w / 600 : Math.min(w / 1052, h / 754);
    setU(unit);
    setDims({ w, h });
    el.style.setProperty("--u", `${unit}px`);
  }, []);

  useEffect(() => {
    // Initial measurement
    measure();
    const id = requestAnimationFrame(measure);
    const el = frameRef.current;
    if (!el) return () => cancelAnimationFrame(id);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => {
      cancelAnimationFrame(id);
      ro.disconnect();
    };
  }, [measure]);

  const onMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    pointerRef.current = { x: e.clientX - r.left, y: e.clientY - r.top, active: true };
  }, []);

  const onLeave = useCallback(() => {
    pointerRef.current.active = false;
  }, []);

  // Recording mode
  useEffect(() => {
    if (!isRecording) return;
    const el = document.createElement("div");
    Object.assign(el.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      opacity: "0",
      pointerEvents: "none",
    });
    document.body.appendChild(el);
    const anim = el.animate(
      [{ transform: "translateX(0)" }, { transform: "translateX(100000px)" }],
      { duration: 100000, fill: "forwards" }
    );
    anim.pause();
    recordingAnimRef.current = anim;
    let raf: number;
    const tick = () => {
      if (anim.currentTime != null)
        recordingProgressRef.current = (anim.currentTime as number) / 1000;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      anim.cancel();
      el.remove();
    };
  }, [isRecording]);

  return (
    // Page shell — solid black, full viewport
    <div style={{ position: "fixed", inset: 0, background: "#000", overflow: "hidden" }}>
      {/*
        Hero surface:
        Fullscreen seamless dark surface without inner box borders
      */}
      <div
        ref={frameRef}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{
          position: "absolute",
          inset: 0,
          background: "#030204",
          overflow: "hidden",
        }}
      >
        {/* z=1 — Vortex canvas */}
        <CinematicVortexCanvas
          u={u}
          frameWidth={dims.w}
          frameHeight={dims.h}
          isRecording={isRecording}
          recordingProgressRef={recordingProgressRef}
          externalPointerRef={pointerRef}
        />

        {/* z=2 — Atmospheric depth vignette */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            pointerEvents: "none",
            background: [
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.65) 24%, rgba(0,0,0,0.0) 48%)",
              "linear-gradient(to bottom, rgba(0,0,0,0.42) 0%, transparent 18%)",
            ].join(","),
          }}
        />

        {/* z=10 — Navigation */}
        <VerraNavigation />

        {/* z=3 — Hero text: headline · subtitle · CTA (Always rendered, positioned precisely at 447u) */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: `calc(447 * var(--u, 1px))`,
            zIndex: 3,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            pointerEvents: "none",
            paddingBottom: "32px",
          }}
        >
          <TypewriterHeadline
            u={u}
            isRecording={isRecording}
            recordingProgressRef={recordingProgressRef}
          />

          {/* Subtitle */}
          <p
            style={{
              marginTop: `calc(26 * var(--u, 1px))`,
              fontSize: `calc(18 * var(--u, 1px))`,
              lineHeight: `calc(24 * var(--u, 1px))`,
              color: "rgba(255,255,255,0.90)",
              letterSpacing: "-0.012em",
              maxWidth: `calc(560 * var(--u, 1px))`,
              textShadow: "0 1px 8px rgba(0,0,0,0.9)",
              fontWeight: 400,
              padding: "0 16px",
            }}
          >
            Helio provides a space for creators to build
            <br /> communities from zero to millions.
          </p>

          {/* CTA */}
          <div style={{ marginTop: `calc(19 * var(--u, 1px))`, pointerEvents: "auto" }}>
            <CTAButton u={u} />
          </div>
        </div>
      </div>
    </div>
  );
};
