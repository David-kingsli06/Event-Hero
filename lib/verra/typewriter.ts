import { TYPEWRITER_WORDS, DEFAULT_TYPEWRITER_TIMING, TypewriterTiming } from "./constants";

export interface TypewriterState {
  currentText: string;
  caretVisible: boolean;
  activeWord: string;
}

/**
 * Calculates deterministic typewriter text & caret visibility at any given timestamp (in ms).
 * This guarantees zero timer drift, exact frame-matching for recording, and glitch-free tab resumes.
 */
export function calculateTypewriterState(
  elapsedMs: number,
  words: readonly string[] = TYPEWRITER_WORDS,
  timing: TypewriterTiming = DEFAULT_TYPEWRITER_TIMING
): TypewriterState {
  if (words.length === 0) {
    return { currentText: "", caretVisible: true, activeWord: "" };
  }

  // Calculate cycle timeline
  // Each transition i -> (i+1)%N consists of:
  // 1. Hold full word i: holdDurationMs
  // 2. Delete word i char by char: word[i].length * deleteSpeedMs
  // 3. Empty pause: emptyPauseMs
  // 4. Type word (i+1)%N char by char: word[(i+1)%N].length * typeSpeedMs
  // 5. Post-type pause: postTypePauseMs

  interface Phase {
    wordIndex: number;
    targetWordIndex: number;
    duration: number;
    type: "hold" | "delete" | "empty" | "type" | "post-type";
  }

  const phases: Phase[] = [];
  let totalCycleDuration = 0;

  for (let i = 0; i < words.length; i++) {
    const nextIdx = (i + 1) % words.length;
    const currentWord = words[i];
    const nextWord = words[nextIdx];

    // Hold
    phases.push({
      wordIndex: i,
      targetWordIndex: i,
      duration: timing.holdDurationMs,
      type: "hold",
    });
    totalCycleDuration += timing.holdDurationMs;

    // Delete
    const deleteDuration = currentWord.length * timing.deleteSpeedMs;
    phases.push({
      wordIndex: i,
      targetWordIndex: nextIdx,
      duration: deleteDuration,
      type: "delete",
    });
    totalCycleDuration += deleteDuration;

    // Empty pause
    phases.push({
      wordIndex: i,
      targetWordIndex: nextIdx,
      duration: timing.emptyPauseMs,
      type: "empty",
    });
    totalCycleDuration += timing.emptyPauseMs;

    // Type next word
    const typeDuration = nextWord.length * timing.typeSpeedMs;
    phases.push({
      wordIndex: i,
      targetWordIndex: nextIdx,
      duration: typeDuration,
      type: "type",
    });
    totalCycleDuration += typeDuration;

    // Post-type pause
    phases.push({
      wordIndex: nextIdx,
      targetWordIndex: nextIdx,
      duration: timing.postTypePauseMs,
      type: "post-type",
    });
    totalCycleDuration += timing.postTypePauseMs;
  }

  // Find position in repeating cycle
  const cycleTime = ((elapsedMs % totalCycleDuration) + totalCycleDuration) % totalCycleDuration;

  let accumulated = 0;
  let currentText = words[0];
  let activeWord = words[0];

  for (const phase of phases) {
    if (cycleTime < accumulated + phase.duration) {
      const timeInPhase = cycleTime - accumulated;
      const currentWord = words[phase.wordIndex];
      const targetWord = words[phase.targetWordIndex];
      activeWord = targetWord;

      switch (phase.type) {
        case "hold": {
          currentText = currentWord;
          break;
        }
        case "delete": {
          const charsDeleted = Math.floor(timeInPhase / timing.deleteSpeedMs);
          const remainingLength = Math.max(0, currentWord.length - charsDeleted);
          currentText = currentWord.slice(0, remainingLength);
          break;
        }
        case "empty": {
          currentText = "";
          break;
        }
        case "type": {
          const charsTyped = Math.min(
            targetWord.length,
            Math.floor(timeInPhase / timing.typeSpeedMs) + 1
          );
          currentText = targetWord.slice(0, charsTyped);
          break;
        }
        case "post-type": {
          currentText = targetWord;
          break;
        }
      }
      break;
    }
    accumulated += phase.duration;
  }

  // Caret blinks rhythmically every caretBlinkMs
  const caretVisible = Math.floor(elapsedMs / timing.caretBlinkMs) % 2 === 0;

  return {
    currentText,
    caretVisible,
    activeWord,
  };
}
