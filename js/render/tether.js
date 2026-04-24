// Rope / tether system: static fixed rope along the route plus a dynamic
// segment from the climber harness to the last anchor point above.

import { clamp } from "../util.js";
const THREE = window.THREE;

export class Tether {
  constructor() {
    this.group = new THREE.Group();

    // Static fixed rope (long cylinder segment series) drawn as a thin line
    // running the whole route.  We keep it a single geometry we translate.
    const anchorGeo = new THREE.CylinderGeometry(0.04, 0.04, 340, 6);
    const anchorMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a10,
      roughness: 0.85,
      emissive: 0x000,
      emissiveIntensity: 0,
    });
    this.fixedRope = new THREE.Mesh(anchorGeo, anchorMat);
    this.fixedRope.position.set(0, 150, -0.6); // runs up the center couloir
    this.group.add(this.fixedRope);

    // Dynamic tether from climber harness to a virtual anchor above.
    // Represent with ~6 small cylinders between sample points.
    this.segments = 10;
    this.nodes = [];
    for (let i = 0; i <= this.segments; i++) {
      this.nodes.push({ x: 0, y: i * 0.9, z: 0.5, vx: 0, vy: 0, vz: 0 });
    }
    const segMat = new THREE.MeshStandardMaterial({
      color: 0xc7a86a,
      roughness: 0.85,
      metalness: 0.0,
    });
    this.segMeshes = [];
    for (let i = 0; i < this.segments; i++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, 1, 5),
        segMat
      );
      this.segMeshes.push(seg);
      this.group.add(seg);
    }

    this.anchorOffset = new THREE.Vector3(0, 8, -0.4);
  }

  update(dt, player) {
    // End nodes: 0 = anchor (attached above), last = harness.
    const topAnchor = new THREE.Vector3(
      player.x * 0.3,
      player.y + this.anchorOffset.y,
      player.z + this.anchorOffset.z
    );
    const bottom = new THREE.Vector3(player.x, player.y + 0.55, player.z + 0.3);

    this.nodes[0].x = topAnchor.x;
    this.nodes[0].y = topAnchor.y;
    this.nodes[0].z = topAnchor.z;

    const last = this.nodes[this.segments];
    last.x = bottom.x;
    last.y = bottom.y;
    last.z = bottom.z;

    // Simple verlet-ish: interpolate node positions along straight line plus sag.
    const sagAmount = 0.45 + Math.abs(player.vx) * 0.002;
    for (let i = 1; i < this.segments; i++) {
      const t = i / this.segments;
      const baseX = topAnchor.x + (bottom.x - topAnchor.x) * t;
      const baseY = topAnchor.y + (bottom.y - topAnchor.y) * t;
      const baseZ = topAnchor.z + (bottom.z - topAnchor.z) * t;
      const sag = Math.sin(Math.PI * t) * sagAmount;
      const target = { x: baseX, y: baseY - sag, z: baseZ };
      // Spring towards target
      const n = this.nodes[i];
      const ax = (target.x - n.x) * 28 - n.vx * 8;
      const ay = (target.y - n.y) * 28 - n.vy * 8;
      const az = (target.z - n.z) * 28 - n.vz * 8;
      n.vx += ax * dt;
      n.vy += ay * dt;
      n.vz += az * dt;
      n.x += n.vx * dt;
      n.y += n.vy * dt;
      n.z += n.vz * dt;
    }

    // Place segment meshes between consecutive nodes.
    for (let i = 0; i < this.segments; i++) {
      const a = this.nodes[i];
      const b = this.nodes[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const seg = this.segMeshes[i];
      seg.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      seg.scale.y = Math.max(0.01, len);
      // Orient cylinder along segment.
      const up = new THREE.Vector3(0, 1, 0);
      const dir = new THREE.Vector3(dx, dy, dz).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
      seg.setRotationFromQuaternion(q);
    }

    // Keep fixed rope centered at x≈0; scroll with progress using group parent.
  }

  followProgress(progress) {
    this.fixedRope.position.y = 150 - progress;
  }
}
