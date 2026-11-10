export interface VortexConfig {
  strandCount: number;
  samplePoints: number;
  spinRate: number; // radians per second, ~0.06
  kBase: number; // 0.42
  kBreathAmp: number; // 0.12
  kBreathFreq: number; // 0.55
  innerRadiusUnits: number; // 435u
  outerRadiusUnits: number; // 652u
  centreXOffsetUnits: number; // 34u
  centreYUnits: number; // -212u
  verticalScaleBase: number; // 1.03
  maxTiltDeform: number; // 0.035
  maxShiftXUnits: number; // 14u
  maxShiftYUnits: number; // 10u
  lerpSpeed: number; // 0.05
}

export const DEFAULT_VORTEX_CONFIG: VortexConfig = {
  strandCount: 196,
  samplePoints: 41,
  spinRate: 0.06,
  kBase: 0.42,
  kBreathAmp: 0.12,
  kBreathFreq: 0.55,
  innerRadiusUnits: 435,
  outerRadiusUnits: 652,
  centreXOffsetUnits: 34,
  centreYUnits: -212,
  verticalScaleBase: 1.03,
  maxTiltDeform: 0.035,
  maxShiftXUnits: 14,
  maxShiftYUnits: 10,
  lerpSpeed: 0.05,
};

export const TYPEWRITER_WORDS = ["Events", "Circles", "Creators"] as const;

export interface TypewriterTiming {
  holdDurationMs: number; // 2600ms
  deleteSpeedMs: number; // 70ms per char
  emptyPauseMs: number; // 250ms
  typeSpeedMs: number; // 100ms per char
  postTypePauseMs: number; // 150ms
  caretBlinkMs: number; // 550ms
}

export const DEFAULT_TYPEWRITER_TIMING: TypewriterTiming = {
  holdDurationMs: 2600,
  deleteSpeedMs: 70,
  emptyPauseMs: 250,
  typeSpeedMs: 100,
  postTypePauseMs: 150,
  caretBlinkMs: 550,
};
