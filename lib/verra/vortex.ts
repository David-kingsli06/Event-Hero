import { VortexConfig, DEFAULT_VORTEX_CONFIG } from "./constants";

export interface PointerState {
  targetShiftX: number;
  targetShiftY: number;
  targetTilt: number;
  currentShiftX: number;
  currentShiftY: number;
  currentTilt: number;
}

export function createInitialPointerState(): PointerState {
  return {
    targetShiftX: 0,
    targetShiftY: 0,
    targetTilt: 0,
    currentShiftX: 0,
    currentShiftY: 0,
    currentTilt: 0,
  };
}

// Reusable coordinate buffers to prevent GC in animation loops
interface StrandPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
  halfWidth: number;
  q: number;
}

export class VortexRenderer {
  private config: VortexConfig;
  private primaryCanvas: HTMLCanvasElement;
  private primaryCtx: CanvasRenderingContext2D;
  private bloomCanvas: HTMLCanvasElement;
  private bloomCtx: CanvasRenderingContext2D;

  private dpr = 1;
  private frameWidth = 0;
  private frameHeight = 0;
  private u = 1;

  // Cached geometry buffers
  private strandBuffer: StrandPoint[][];

  constructor(canvas: HTMLCanvasElement, config: VortexConfig = DEFAULT_VORTEX_CONFIG) {
    this.primaryCanvas = canvas;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) throw new Error("Could not get 2D context for primary canvas");
    this.primaryCtx = ctx;

    this.bloomCanvas = document.createElement("canvas");
    const bCtx = this.bloomCanvas.getContext("2d", { alpha: true });
    if (!bCtx) throw new Error("Could not get 2D context for bloom canvas");
    this.bloomCtx = bCtx;

    this.config = config;

    // Allocate strand coordinate buffer once
    this.strandBuffer = Array.from({ length: config.strandCount }, () =>
      Array.from({ length: config.samplePoints }, () => ({
        x: 0,
        y: 0,
        nx: 0,
        ny: 0,
        halfWidth: 0,
        q: 0,
      }))
    );
  }

  public resize(width: number, height: number, u: number): void {
    this.frameWidth = width;
    this.frameHeight = height;
    this.u = u;

    this.dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1, 2);

    const targetWidth = Math.max(1, Math.floor(width * this.dpr));
    const targetHeight = Math.max(1, Math.floor(height * this.dpr));

    if (this.primaryCanvas.width !== targetWidth || this.primaryCanvas.height !== targetHeight) {
      this.primaryCanvas.width = targetWidth;
      this.primaryCanvas.height = targetHeight;
    }

    // Bloom canvas at 0.32x resolution
    const bloomScale = 0.32;
    const bloomWidth = Math.max(1, Math.floor(targetWidth * bloomScale));
    const bloomHeight = Math.max(1, Math.floor(targetHeight * bloomScale));

    if (this.bloomCanvas.width !== bloomWidth || this.bloomCanvas.height !== bloomHeight) {
      this.bloomCanvas.width = bloomWidth;
      this.bloomCanvas.height = bloomHeight;
    }
  }

  /**
   * Smoothstep function across [edge0, edge1]
   */
  private smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  /**
   * Renders a single frame of the vortex at time t (seconds) with current pointer state.
   */
  public render(t: number, pointer: PointerState, prefersReducedMotion: boolean): void {
    const ctx = this.primaryCtx;
    const bCtx = this.bloomCtx;
    const u = this.u;
    const dpr = this.dpr;

    if (this.frameWidth === 0 || this.frameHeight === 0) return;

    // Update smooth pointer interpolation
    pointer.currentShiftX += (pointer.targetShiftX - pointer.currentShiftX) * this.config.lerpSpeed;
    pointer.currentShiftY += (pointer.targetShiftY - pointer.currentShiftY) * this.config.lerpSpeed;
    pointer.currentTilt += (pointer.targetTilt - pointer.currentTilt) * this.config.lerpSpeed;

    const shiftX = prefersReducedMotion ? 0 : pointer.currentShiftX;
    const shiftY = prefersReducedMotion ? 0 : pointer.currentShiftY;
    const tilt = prefersReducedMotion ? 0 : pointer.currentTilt;

    // Clear primary canvas
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.primaryCanvas.width, this.primaryCanvas.height);

    // Coordinate space scaled to DPR
    ctx.scale(dpr, dpr);

    // Vortex center & radii
    const cx = this.frameWidth / 2 + this.config.centreXOffsetUnits * u + shiftX;
    const cy = this.config.centreYUnits * u + shiftY;
    const ri = this.config.innerRadiusUnits * u;
    const ro = this.config.outerRadiusUnits * u;
    const vScale = this.config.verticalScaleBase + tilt;

    // Motion parameters
    const spin = prefersReducedMotion ? 0 : this.config.spinRate * t;
    const k = prefersReducedMotion
      ? this.config.kBase
      : this.config.kBase * (1 + this.config.kBreathAmp * Math.sin(this.config.kBreathFreq * t));

    // 1. Ambient Annulus & Halo (Background luminous glow behind fins)
    this.renderAtmosphericRings(ctx, cx, cy, ri, ro, vScale, u);

    // 2. Compute strand points in reusable buffer
    this.computeStrands(cx, cy, ri, ro, vScale, spin, k, u, t);

    // 3. Render fins onto primary canvas
    this.renderFins(ctx, cx, cy, ri, ro, vScale, u);

    // 4. Render bloom on offscreen canvas & composite with "lighter"
    this.renderBloom(bCtx, cx, cy, ri, ro, vScale, u, dpr);

    // Composite bloom
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.filter = `blur(${8 * u}px)`;
    ctx.drawImage(this.bloomCanvas, 0, 0, this.frameWidth, this.frameHeight);
    ctx.restore();

    // 5. Crisp Outer Rim stroke (1.6u)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, cy, ro, ro * vScale, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 122, 44, 0.65)";
    ctx.lineWidth = 1.6 * u;
    ctx.stroke();
    ctx.restore();
  }

  private renderAtmosphericRings(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ri: number,
    ro: number,
    vScale: number,
    u: number
  ) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(1, vScale);

    // Ambient Annulus gradient: rgba(170,14,50,.35) -> rgba(120,8,14,.45) -> rgba(170,40,6,.4)
    const ambientGrad = ctx.createRadialGradient(0, 0, ri, 0, 0, ro);
    ambientGrad.addColorStop(0, "rgba(170, 14, 50, 0.35)");
    ambientGrad.addColorStop(0.5, "rgba(120, 8, 14, 0.45)");
    ambientGrad.addColorStop(1, "rgba(170, 40, 6, 0.4)");

    ctx.beginPath();
    ctx.arc(0, 0, ro, 0, Math.PI * 2);
    ctx.arc(0, 0, ri, 0, Math.PI * 2, true);
    ctx.fillStyle = ambientGrad;
    ctx.fill();

    // Soft Orange Halo around outer radius (ro - 16u -> ro + 70u), peak opacity 0.42
    const haloInner = Math.max(0, ro - 16 * u);
    const haloOuter = ro + 70 * u;
    const orangeHalo = ctx.createRadialGradient(0, 0, haloInner, 0, 0, haloOuter);
    orangeHalo.addColorStop(0, "rgba(255, 80, 20, 0)");
    orangeHalo.addColorStop(0.2, "rgba(255, 90, 25, 0.42)");
    orangeHalo.addColorStop(0.65, "rgba(240, 60, 15, 0.15)");
    orangeHalo.addColorStop(1, "rgba(200, 30, 10, 0)");

    ctx.beginPath();
    ctx.arc(0, 0, haloOuter, 0, Math.PI * 2);
    ctx.arc(0, 0, haloInner, 0, Math.PI * 2, true);
    ctx.fillStyle = orangeHalo;
    ctx.fill();

    // Inner pink halo (opacity 0.09) subtly illuminating dark centre
    const innerHalo = ctx.createRadialGradient(0, 0, ri * 0.4, 0, 0, ri * 1.05);
    innerHalo.addColorStop(0, "rgba(255, 60, 120, 0)");
    innerHalo.addColorStop(0.8, "rgba(255, 60, 130, 0.06)");
    innerHalo.addColorStop(1, "rgba(255, 80, 140, 0.09)");

    ctx.beginPath();
    ctx.arc(0, 0, ri * 1.05, 0, Math.PI * 2);
    ctx.fillStyle = innerHalo;
    ctx.fill();

    ctx.restore();
  }

  private computeStrands(
    cx: number,
    cy: number,
    ri: number,
    ro: number,
    vScale: number,
    spin: number,
    k: number,
    u: number,
    t: number
  ) {
    const { strandCount, samplePoints } = this.config;
    const rSpan = ro - ri;

    for (let i = 0; i < strandCount; i++) {
      const strand = this.strandBuffer[i];
      const ui = (2 * Math.PI * i) / strandCount + spin;

      for (let j = 0; j < samplePoints; j++) {
        const q = j / (samplePoints - 1);
        const r = ri + rSpan * q;

        // Angle formula specified in requirements:
        // theta = ui + k * (1 - q)^4.2 + 0.05 * k * q^2 + 0.02 * sin(pi*q) * sin(3*ui + 0.4*t)
        const theta =
          ui +
          k * Math.pow(1 - q, 4.2) +
          0.05 * k * Math.pow(q, 2) +
          0.02 * Math.sin(Math.PI * q) * Math.sin(3 * ui + 0.4 * t);

        // Centerline point with vertical scale
        const px = cx + r * Math.cos(theta);
        const py = cy + r * Math.sin(theta) * vScale;

        // Fin half-width: (0.15 + 3.3 * s * (1 - 0.25 * q)) * u, where s = smoothstep(0, 0.28, q)
        const s = this.smoothstep(0, 0.28, q);
        const halfWidth = (0.15 + 3.3 * s * (1 - 0.25 * q)) * u;

        // Normal perpendicular to tangent direction
        const nx = -Math.sin(theta);
        const ny = Math.cos(theta) * vScale;
        const nLen = Math.hypot(nx, ny) || 1;

        const pt = strand[j];
        pt.x = px;
        pt.y = py;
        pt.nx = nx / nLen;
        pt.ny = ny / nLen;
        pt.halfWidth = halfWidth;
        pt.q = q;
      }
    }
  }

  private renderFins(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ri: number,
    ro: number,
    vScale: number,
    u: number
  ) {
    const { strandCount, samplePoints } = this.config;

    // Body radial gradient:
    // #b01e50 -> #9c1236 (12%) -> #860c18 (40%) -> #9c1a0a (70%) -> #c63c0e (90%) -> #e85a18
    const bodyGradient = ctx.createRadialGradient(cx, cy, ri, cx, cy, ro * vScale);
    bodyGradient.addColorStop(0, "#b01e50");
    bodyGradient.addColorStop(0.12, "#9c1236");
    bodyGradient.addColorStop(0.4, "#860c18");
    bodyGradient.addColorStop(0.7, "#9c1a0a");
    bodyGradient.addColorStop(0.9, "#c63c0e");
    bodyGradient.addColorStop(1, "#e85a18");

    // Leading edge radial gradient:
    // rgba(255,130,185,.85) -> rgba(255,84,138,.95) at 8% -> rgba(255,56,80,.95) at 28% ->
    // rgba(255,58,44,.95) at 55% -> rgba(255,92,36) at 80% -> rgba(255,122,44) at 94% -> rgba(255,150,70)
    const edgeGradient = ctx.createRadialGradient(cx, cy, ri, cx, cy, ro * vScale);
    edgeGradient.addColorStop(0, "rgba(255, 130, 185, 0.85)");
    edgeGradient.addColorStop(0.08, "rgba(255, 84, 138, 0.95)");
    edgeGradient.addColorStop(0.28, "rgba(255, 56, 80, 0.95)");
    edgeGradient.addColorStop(0.55, "rgba(255, 58, 44, 0.95)");
    edgeGradient.addColorStop(0.8, "rgba(255, 92, 36, 0.98)");
    edgeGradient.addColorStop(0.94, "rgba(255, 122, 44, 1)");
    edgeGradient.addColorStop(1, "rgba(255, 150, 70, 1)");

    // Draw strands in angular order starting from top to ensure consistent physical overlapping
    for (let i = 0; i < strandCount; i++) {
      const strand = this.strandBuffer[i];

      // A. Draw Fin Body (opaque ribbon)
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = bodyGradient;
      ctx.beginPath();

      // Right edge (center + normal * halfWidth)
      for (let j = 0; j < samplePoints; j++) {
        const pt = strand[j];
        const rx = pt.x + pt.nx * pt.halfWidth;
        const ry = pt.y + pt.ny * pt.halfWidth;
        if (j === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }

      // Left edge back (center - normal * halfWidth)
      for (let j = samplePoints - 1; j >= 0; j--) {
        const pt = strand[j];
        const lx = pt.x - pt.nx * pt.halfWidth;
        const ly = pt.y - pt.ny * pt.halfWidth;
        ctx.lineTo(lx, ly);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // B. Draw Leading Edge (bright stroked line along one side, width 1.45u, lighter mode)
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = edgeGradient;
      ctx.lineWidth = 1.45 * u;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();

      for (let j = 0; j < samplePoints; j++) {
        const pt = strand[j];
        const ex = pt.x + pt.nx * pt.halfWidth;
        const ey = pt.y + pt.ny * pt.halfWidth;
        if (j === 0) ctx.moveTo(ex, ey);
        else ctx.lineTo(ex, ey);
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderBloom(
    bCtx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    ri: number,
    ro: number,
    vScale: number,
    u: number,
    dpr: number
  ) {
    const { strandCount, samplePoints } = this.config;
    const bloomScale = 0.32;
    const totalScale = dpr * bloomScale;

    bCtx.setTransform(1, 0, 0, 1, 0, 0);
    bCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
    bCtx.scale(totalScale, totalScale);

    // Lighter composite
    bCtx.globalCompositeOperation = "lighter";
    bCtx.globalAlpha = 0.7;

    const bloomGrad = bCtx.createRadialGradient(cx, cy, ri, cx, cy, ro * vScale);
    bloomGrad.addColorStop(0, "rgba(255, 120, 180, 0.9)");
    bloomGrad.addColorStop(0.3, "rgba(255, 60, 80, 0.95)");
    bloomGrad.addColorStop(0.7, "rgba(255, 80, 30, 0.9)");
    bloomGrad.addColorStop(1, "rgba(255, 140, 50, 0.85)");

    bCtx.strokeStyle = bloomGrad;
    bCtx.lineWidth = 5.3 * u;
    bCtx.lineCap = "round";
    bCtx.lineJoin = "round";

    // Re-render luminous edges with 5.3u line width
    for (let i = 0; i < strandCount; i += 2) {
      const strand = this.strandBuffer[i];
      bCtx.beginPath();
      for (let j = 0; j < samplePoints; j += 2) {
        const pt = strand[j];
        const ex = pt.x + pt.nx * pt.halfWidth;
        const ey = pt.y + pt.ny * pt.halfWidth;
        if (j === 0) bCtx.moveTo(ex, ey);
        else bCtx.lineTo(ex, ey);
      }
      bCtx.stroke();
    }

    // Outer & inner bloom rims
    // 9u orange outer rim
    bCtx.beginPath();
    bCtx.ellipse(cx, cy, ro, ro * vScale, 0, 0, Math.PI * 2);
    bCtx.strokeStyle = "rgba(255, 110, 40, 0.8)";
    bCtx.lineWidth = 9 * u;
    bCtx.stroke();

    // 5u pink inner rim
    bCtx.beginPath();
    bCtx.ellipse(cx, cy, ri, ri * vScale, 0, 0, Math.PI * 2);
    bCtx.strokeStyle = "rgba(255, 60, 130, 0.5)";
    bCtx.lineWidth = 5 * u;
    bCtx.stroke();
  }

  public destroy(): void {
    this.primaryCtx.clearRect(0, 0, this.primaryCanvas.width, this.primaryCanvas.height);
    this.bloomCtx.clearRect(0, 0, this.bloomCanvas.width, this.bloomCanvas.height);
    this.bloomCanvas.width = 0;
    this.bloomCanvas.height = 0;
  }
}
