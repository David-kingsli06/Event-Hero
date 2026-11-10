"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { calculateTypewriterState } from "@/lib/verra/typewriter";
import { TYPEWRITER_WORDS } from "@/lib/verra/constants";

interface TypewriterHeadlineProps {
  u: number;
  isRecording?: boolean;
  recordingProgressRef?: React.MutableRefObject<number>;
}

export const TypewriterHeadline: React.FC<TypewriterHeadlineProps> = ({
  u,
  isRecording = false,
  recordingProgressRef,
}) => {
  const [displayText, setDisplayText] = useState<string>(TYPEWRITER_WORDS[0]);
  const [caretVisible, setCaretVisible] = useState<boolean>(true);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const tick = useCallback(() => {
    let elapsedMs: number;
    if (isRecording && recordingProgressRef) {
      elapsedMs = recordingProgressRef.current * 1000;
    } else {
      elapsedMs = performance.now() - startTimeRef.current;
    }
    const state = calculateTypewriterState(elapsedMs);
    setDisplayText(state.currentText);
    setCaretVisible(state.caretVisible);
    rafRef.current = requestAnimationFrame(tick);
  }, [isRecording, recordingProgressRef]);

  useEffect(() => {
    startTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [tick]);

  return (
    <div
      aria-live="polite"
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}
      >
        {/* Dynamic Gradient Headline */}
        <h1
          style={{
            margin: 0,
            padding: 0,
            display: "inline-block",
            fontSize: `min(calc(176 * var(--u, 1px)), 21.5vw)`,
            fontWeight: 600,
            letterSpacing: "-0.03em",
            lineHeight: 1,
            backgroundImage:
              "linear-gradient(12deg, #fffaf6 28%, #ffe6d6 46%, #ffbc98 66%, #ff8f62 88%, #ff7a4c)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            filter: "drop-shadow(0 2px 20px rgba(255, 120, 60, 0.12))",
          }}
        >
          {displayText || "\u00A0"}
        </h1>

        {/* Blinking typing caret sitting side-by-side on the right of the headline */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            flexShrink: 0,
            width: `calc(1.6 * var(--u, 1px))`,
            height: `min(calc(124 * var(--u, 1px)), 15vw)`,
            marginLeft: `calc(7 * var(--u, 1px))`,
            backgroundColor: "#ffb48c",
            borderRadius: "1px",
            boxShadow: "0 0 12px rgba(255, 180, 140, 0.45)",
            opacity: caretVisible ? 1 : 0,
            transition: "opacity 55ms linear",
          }}
        />
      </span>
    </div>
  );
};
