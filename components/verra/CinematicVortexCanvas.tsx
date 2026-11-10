"use client";

import React, { useEffect, useRef } from "react";
import { VortexRenderer, createInitialPointerState, PointerState } from "@/lib/verra/vortex";
import { DEFAULT_VORTEX_CONFIG } from "@/lib/verra/constants";

interface CinematicVortexCanvasProps {
  u: number;
  frameWidth: number;
  frameHeight: number;
  isRecording?: boolean;
  recordingProgressRef?: React.MutableRefObject<number>;
  externalPointerRef?: React.MutableRefObject<{ x: number; y: number; active: boolean }>;
}

export const CinematicVortexCanvas: React.FC<CinematicVortexCanvasProps> = ({
  u,
  frameWidth,
  frameHeight,
  isRecording = false,
  recordingProgressRef,
  externalPointerRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<VortexRenderer | null>(null);
  const pointerStateRef = useRef<PointerState>(createInitialPointerState());
  const animationFrameIdRef = useRef<number | null>(null);
  const isTabVisibleRef = useRef<boolean>(true);
  const prefersReducedMotionRef = useRef<boolean>(false);
  // Store latest u/frameWidth/frameHeight in refs so the rAF loop can read them
  // without depending on stale closure values
  const uRef = useRef(u);
  const frameWRef = useRef(frameWidth);
  const frameHRef = useRef(frameHeight);

  useEffect(() => { uRef.current = u; }, [u]);
  useEffect(() => { frameWRef.current = frameWidth; }, [frameWidth]);
  useEffect(() => { frameHRef.current = frameHeight; }, [frameHeight]);

  // --- Initialize renderer once ---
  useEffect(() => {
    if (!canvasRef.current) return;

    try {
      rendererRef.current = new VortexRenderer(canvasRef.current, DEFAULT_VORTEX_CONFIG);
    } catch (err) {
      console.error("Failed to initialize vortex renderer:", err);
    }

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    prefersReducedMotionRef.current = motionQuery.matches;
    const onMotion = (e: MediaQueryListEvent) => { prefersReducedMotionRef.current = e.matches; };
    motionQuery.addEventListener("change", onMotion);

    const onVisibility = () => { isTabVisibleRef.current = document.visibilityState === "visible"; };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      motionQuery.removeEventListener("change", onMotion);
      document.removeEventListener("visibilitychange", onVisibility);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  // --- Resize canvas backing store whenever frame dimensions change ---
  useEffect(() => {
    if (rendererRef.current && frameWidth > 0 && frameHeight > 0) {
      rendererRef.current.resize(frameWidth, frameHeight, u);
    }
  }, [frameWidth, frameHeight, u]);

  // --- Main animation loop (single long-lived rAF) ---
  useEffect(() => {
    const startTime = performance.now();

    const loop = () => {
      // Always re-request next frame first so we never skip one
      animationFrameIdRef.current = requestAnimationFrame(loop);

      if (!isTabVisibleRef.current && !isRecording) return;

      const renderer = rendererRef.current;
      if (!renderer) return;

      // Time in seconds
      let t: number;
      if (isRecording && recordingProgressRef) {
        t = recordingProgressRef.current;
      } else {
        t = (performance.now() - startTime) / 1000;
      }

      // Update pointer target
      const pointer = pointerStateRef.current;
      const fw = frameWRef.current;
      const fh = frameHRef.current;
      const uu = uRef.current;

      if (externalPointerRef?.current.active && fw > 0 && fh > 0) {
        const nx = (externalPointerRef.current.x - fw / 2) / (fw / 2);
        const ny = (externalPointerRef.current.y - fh / 2) / (fh / 2);
        pointer.targetShiftX = Math.max(-1, Math.min(1, nx)) * 14 * uu;
        pointer.targetShiftY = Math.max(-1, Math.min(1, ny)) * 10 * uu;
        pointer.targetTilt   = Math.max(-1, Math.min(1, ny)) * 0.035;
      } else {
        pointer.targetShiftX = 0;
        pointer.targetShiftY = 0;
        pointer.targetTilt   = 0;
      }

      renderer.render(t, pointer, prefersReducedMotionRef.current);
    };

    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameIdRef.current !== null) {
        cancelAnimationFrame(animationFrameIdRef.current);
        animationFrameIdRef.current = null;
      }
    };
  // Only restart loop if recording mode changes — dimensions flow through refs
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRecording]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none select-none"
      style={{ display: "block", zIndex: 1 }}
    />
  );
};
