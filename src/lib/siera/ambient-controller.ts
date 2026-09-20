// Ambient layer: the light around the blob (fog, halo, energy) is procedural
// too — slow phase-wandering rather than fixed keyframes. Emission stays subtle
// and always in the background, but it reacts to emotion and attention.

import { smoothTo, vendBoundedWalker } from "@/lib/siera/character-state";

export interface AmbientOutput {
  fogOpacity: number;
  fogScale: number;
  haloOpacity: number;
  haloScale: number;
  energyRotate: number;
  /* Particles: per-item vertical drift (0..1 cycle + offset pixel). */
  particles: Array<{ y: number; opacity: number }>;
}

export class AmbientController {
  private t = 0;
  private fogW = vendBoundedWalker(0.5, 0.08, 0.3);
  private haloW = vendBoundedWalker(1, 0.04, 0.3);
  private energySpeed = 22; // deg per s at rest
  private energyRot = 0;
  private phase = 0;

  reset(): void {
    this.t = 0;
    this.energyRot = 0;
  }

  update(dt: number, energy: number, attention: number): AmbientOutput {
    this.t += dt;
    this.phase += dt * (0.6 + energy * 0.5);

    // Fog drifts slowly and gathers slightly when attentive.
    const fog = this.fogW.next();
    const fogOpacity = Math.min(0.72, Math.max(0.36, fog * (1 + attention * 0.15)));
    const fogScale = 1 + Math.sin(this.phase * 0.5) * 0.045 + fog * 0.05;

    this.haloW.next();
    const haloOpacity = 0.5 + Math.sin(this.phase * 0.8) * 0.1 + attention * 0.22;
    const haloScale = 1 + Math.sin(this.phase * 0.4) * 0.028;

    // Energy rotates lazily; busier moods spin it a bit faster.
    const targetSpeed = 20 + energy * 22 + attention * 6;
    this.energySpeed = smoothTo(this.energySpeed, targetSpeed, dt, 1.6);
    this.energyRot = (this.energyRot + this.energySpeed * dt) % 360;

    return {
      fogOpacity,
      fogScale,
      haloOpacity,
      haloScale,
      energyRotate: this.energyRot,
      particles: [
        { y: Math.sin(this.phase * 1 + 0.0) * 6, opacity: 0.5 + Math.sin(this.phase * 1.7 + 0.2) * 0.22 },
        { y: Math.sin(this.phase * 1.3 + 1.2) * 8, opacity: 0.45 + Math.sin(this.phase * 1.4 + 2.1) * 0.24 },
        { y: Math.sin(this.phase * 0.9 + 2.3) * 5, opacity: 0.5 + Math.sin(this.phase * 1.9 + 3.1) * 0.2 },
        { y: Math.sin(this.phase * 1.15 + 3.4) * 7, opacity: 0.45 + Math.sin(this.phase * 2.2 + 4.2) * 0.22 },
      ],
    };
  }
}