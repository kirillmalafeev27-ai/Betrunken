// Mountain face + surface anchor.
//
// We keep the player/climber near world y = 0 and instead shift the mountain
// geometry (and everything anchored to it) downward as the player climbs.
// This bounds world coordinates and keeps precision high regardless of how
// many metres were climbed.

import { CONFIG } from "../config.js";
import { clamp } from "../util.js";

const THREE = window.THREE;

// world units per metre
export const METRE = 1.0;

export class Mountain {
  constructor() {
    this.group = new THREE.Group();
    this.offsetY = 0; // how far the mountain has been scrolled down

    const width = 90;
    const height = 360;
    const segX = 72;
    const segY = 220;

    const geo = new THREE.PlaneGeometry(width, height, segX, segY);
    geo.rotateX(-Math.PI * 0.02); // very slight slope; stays vertical-ish
    geo.translate(0, height / 2 - 6, -8);

    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const snow = new THREE.Color(0xa6b6c9);
    const ice  = new THREE.Color(0x6f8ea8);
    const rock = new THREE.Color(0x33414f);
    const lava = new THREE.Color(0x2a0f18);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);

      // Carve couloirs.
      const laneOffsets = [-CONFIG.LANE_SPACING, 0, CONFIG.LANE_SPACING];
      let carve = 0;
      for (const lo of laneOffsets) {
        const d = Math.abs(x - lo);
        const w = 2.0;
        carve += Math.exp(-(d * d) / (w * w));
      }
      const yN = clamp((y - 10) / 280, 0, 1);
      const carveProfile = 0.9 + 0.25 * Math.sin(yN * Math.PI);
      const carveDepth = 4.2 * carve * carveProfile;

      // Flanks: outside the couloir band, displacement pushes back.
      const flank = clamp((Math.abs(x) - CONFIG.LANE_SPACING * 1.6) / 10, 0, 1);
      const flankDepth = -4.5 * flank;

      // Layered noise for chunky relief.
      const noise =
        Math.sin(x * 0.4 + y * 0.11) * 0.55 +
        Math.cos(x * 0.2 - y * 0.18) * 0.85 +
        Math.sin(x * 0.9 + y * 0.7) * 0.45 +
        Math.cos(x * 1.7 + y * 1.4) * 0.25;

      const dz = carveDepth - flankDepth - noise * 1.6;
      positions.setZ(i, z + dz);

      // Summit taper (top 18m of geometry).
      if (y > 300) {
        const t = clamp((y - 300) / 55, 0, 1);
        positions.setX(i, x * (1 - t * 0.55));
      }

      // Vertex colors: blend based on Y (phase proxy) + altitude.
      const c = snow.clone();
      const tBand = clamp((y - 80) / 160, 0, 1);
      c.lerp(ice, tBand * 0.6);
      c.lerp(rock, clamp((y - 220) / 90, 0, 1) * 0.85);
      c.lerp(lava, clamp((y - 310) / 40, 0, 1) * 0.4);

      // Darken in carved couloirs (ambient occlusion fake).
      const aoCarve = clamp(carve * 0.45, 0, 0.55);
      // Darken general overhangs.
      const aoNoise = clamp(noise * 0.12 + 0.18, 0, 0.45);
      c.multiplyScalar(1 - aoCarve - aoNoise * 0.4);

      // Highlight raised ridges.
      if (dz < -1.6) c.multiplyScalar(1.18);

      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    this.mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Dark background rock slabs behind the mountain (sense of depth).
    const slabGeo = new THREE.PlaneGeometry(250, 500);
    const slabMat = new THREE.MeshBasicMaterial({
      color: 0x0c1422,
      fog: true,
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.position.set(0, 60, -40);
    this.group.add(slab);

    // Sparse ice/rock outcrops along the route for parallax detail.
    const outcropMat = new THREE.MeshStandardMaterial({
      color: 0x6e7d90,
      roughness: 1.0,
      metalness: 0.0,
      flatShading: true,
    });
    for (let m = 8; m < 320; m += 14) {
      for (const lane of [-1, 0, 1]) {
        if (Math.random() < 0.45) continue;
        const outcrop = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.7 + Math.random() * 0.6, 0),
          outcropMat
        );
        const wobble = (Math.random() - 0.5) * 1.6;
        outcrop.position.set(
          lane * CONFIG.LANE_SPACING + wobble,
          m + Math.random() * 6,
          -0.4 + Math.random() * 0.6
        );
        outcrop.rotation.set(Math.random(), Math.random(), Math.random());
        outcrop.scale.set(1.2, 0.6, 0.9);
        outcrop.castShadow = false;
        outcrop.receiveShadow = true;
        this.group.add(outcrop);
      }
    }
  }

  /**
   * World position for a point at `metres` up the route, on `lane` couloir,
   * with `localX` horizontal offset in world units relative to the lane center.
   *
   * Returns a THREE.Vector3 — callers may mutate.
   */
  anchor(metres, lane, localX = 0) {
    const laneX = lane * CONFIG.LANE_SPACING;
    const x = laneX + localX;
    const y = metres * METRE - this.offsetY; // y in world after scroll
    // Surface z at this (x, y).  Couloirs are shallower (nearer camera).
    const carve =
      Math.exp(-Math.pow(x - (-CONFIG.LANE_SPACING), 2) / 5) +
      Math.exp(-Math.pow(x - 0, 2) / 5) +
      Math.exp(-Math.pow(x - (+CONFIG.LANE_SPACING), 2) / 5);
    const flank = clamp((Math.abs(x) - CONFIG.LANE_SPACING * 1.6) / 12, 0, 1);
    const z = -8 + carve * 2.2 - flank * 2.5 + 1.1;
    return new THREE.Vector3(x, y, z);
  }

  /** Scroll the mountain so the player at `metres` sits near world y = 0. */
  followProgress(progress) {
    this.offsetY = progress * METRE;
    this.group.position.y = -this.offsetY;
  }

  tintByPreset(preset, phaseRatio) {
    if (preset === "newyear") {
      this.mat.emissive = new THREE.Color(0x101a2a);
      this.mat.emissiveIntensity = 0.18;
    } else {
      this.mat.emissive = new THREE.Color(0x4a1418);
      this.mat.emissiveIntensity = 0.08 * clamp((phaseRatio - 0.55) / 0.45, 0, 1);
    }
  }
}
