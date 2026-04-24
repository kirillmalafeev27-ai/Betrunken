// Visual representations of rocks, avalanche waves, crevasses and warning
// markers.  Gameplay logic lives in `systems/hazards.js` which drives these.

import { clamp, rand } from "../util.js";
const THREE = window.THREE;

export class HazardsView {
  constructor(mountain) {
    this.mountain = mountain;
    this.group = new THREE.Group();
    this.rocks = new Map();
    this.markers = new Map();
    this.crevasses = new Map();
    this.avalanche = null;
    this.markerMat = new THREE.MeshBasicMaterial({
      color: 0xffb347,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
  }

  spawnRock(rock) {
    const g = new THREE.Group();
    const geo = new THREE.IcosahedronGeometry(rock.size, 1);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const a = new THREE.Color(0x5a5148);
    const b = new THREE.Color(0x322824);
    // jitter + color
    for (let i = 0; i < pos.count; i++) {
      const j = 0.18 * rock.size;
      pos.setXYZ(
        i,
        pos.getX(i) + (Math.random() - 0.5) * j,
        pos.getY(i) + (Math.random() - 0.5) * j,
        pos.getZ(i) + (Math.random() - 0.5) * j
      );
      const t = Math.random();
      const c = a.clone().lerp(b, t);
      colors[i * 3]     = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      flatShading: true,
      roughness: 0.95,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    g.add(mesh);

    // Dust trail billboard (single point as puff).
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 20), 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xcfc7b8,
      size: 1.1,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      fog: true,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    g.add(trail);

    g.userData.trail = trail;
    g.userData.trailIdx = 0;
    g.userData.rotAxis = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1)).normalize();
    g.userData.rotSpeed = rand(1.2, 2.6);
    g.userData.mesh = mesh;
    this.rocks.set(rock.id, g);
    this.group.add(g);

    // Warning marker on the lane: a glowing oval sprite-like ring.
    const markerGeo = new THREE.RingGeometry(0.6, 0.85, 16);
    const marker = new THREE.Mesh(markerGeo, this.markerMat);
    marker.rotation.x = -Math.PI / 2;
    this.markers.set(rock.id, marker);
    this.group.add(marker);
  }

  updateRock(rock, worldPos) {
    const g = this.rocks.get(rock.id);
    if (!g) return;
    g.position.copy(worldPos);
    g.rotateOnAxis(g.userData.rotAxis, g.userData.rotSpeed * rock.dt);

    // Advance trail positions (simple).
    const arr = g.userData.trail.geometry.attributes.position.array;
    const idx = g.userData.trailIdx;
    arr[idx * 3]     = worldPos.x;
    arr[idx * 3 + 1] = worldPos.y + rand(0.2, 0.6);
    arr[idx * 3 + 2] = worldPos.z + rand(-0.2, 0.2);
    g.userData.trailIdx = (idx + 1) % 20;
    g.userData.trail.geometry.attributes.position.needsUpdate = true;

    // Update marker on lane floor near player height.
    const marker = this.markers.get(rock.id);
    if (marker) {
      marker.position.set(worldPos.x, rock.markerY, worldPos.z + 0.3);
      const pulse = 0.9 + Math.sin(performance.now() * 0.008) * 0.12;
      marker.scale.setScalar(pulse);
    }
  }

  removeRock(id) {
    const g = this.rocks.get(id);
    if (g) { this.group.remove(g); this.rocks.delete(id); }
    const m = this.markers.get(id);
    if (m) { this.group.remove(m); this.markers.delete(id); }
  }

  spawnCrevasse(id, worldPos) {
    const g = new THREE.Group();
    const shape = new THREE.Shape();
    const jagged = [];
    const segs = 10;
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const x = -1.4 + t * 2.8 + (Math.random() - 0.5) * 0.3;
      const y = -0.55 + Math.sin(t * Math.PI) * 0.45 + (Math.random() - 0.5) * 0.2;
      jagged.push(new THREE.Vector2(x, y));
    }
    shape.moveTo(jagged[0].x, jagged[0].y);
    for (let i = 1; i < jagged.length; i++) shape.lineTo(jagged[i].x, jagged[i].y);
    for (let i = jagged.length - 1; i >= 0; i--) {
      shape.lineTo(jagged[i].x, -jagged[i].y);
    }
    const geo = new THREE.ShapeGeometry(shape);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x0a1018,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });
    const face = new THREE.Mesh(geo, mat);
    face.position.z = 0.12;
    g.add(face);

    // Icy rim outline
    const edge = new THREE.Mesh(
      new THREE.TorusGeometry(1.5, 0.08, 6, 20),
      new THREE.MeshStandardMaterial({
        color: 0x9fc9df,
        emissive: 0x1a2a36,
        emissiveIntensity: 0.4,
      })
    );
    edge.scale.set(1.1, 0.5, 0.4);
    edge.position.z = 0.2;
    g.add(edge);

    // Thin fog sprite under
    const fog = new THREE.Mesh(
      new THREE.PlaneGeometry(3, 1),
      new THREE.MeshBasicMaterial({
        color: 0xe6eefc,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      })
    );
    fog.position.z = 0.15;
    g.add(fog);

    g.position.copy(worldPos);
    this.crevasses.set(id, g);
    this.group.add(g);
  }

  updateCrevassePos(id, worldPos) {
    const g = this.crevasses.get(id);
    if (g) g.position.copy(worldPos);
  }

  removeCrevasse(id) {
    const g = this.crevasses.get(id);
    if (g) { this.group.remove(g); this.crevasses.delete(id); }
  }

  spawnAvalanche() {
    if (this.avalanche) return this.avalanche;
    const g = new THREE.Group();
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0xf0f5fb,
      transparent: true,
      opacity: 0.95,
      roughness: 0.85,
      flatShading: true,
    });
    // Several puff spheres at different heights.
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(1.4 + Math.random() * 1.8, 8, 6),
        baseMat
      );
      s.position.set(
        -14 + i * 2.1 + rand(-0.6, 0.6),
        rand(-0.6, 1.4),
        rand(-0.3, 1.3)
      );
      g.add(s);
    }
    // Crest highlight.
    const crest = new THREE.Mesh(
      new THREE.SphereGeometry(2.5, 10, 8),
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      })
    );
    crest.position.y = 2.2;
    g.add(crest);

    // Powder points trail
    const trailGeo = new THREE.BufferGeometry();
    const N = 160;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      pos[i * 3]     = rand(-14, 14);
      pos[i * 3 + 1] = rand(-1.5, 2.5);
      pos[i * 3 + 2] = rand(-1, 2);
    }
    trailGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const trailMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const trail = new THREE.Points(trailGeo, trailMat);
    g.add(trail);

    g.userData.trail = trail;
    this.avalanche = g;
    this.group.add(g);
    return g;
  }

  updateAvalanche(worldY) {
    if (!this.avalanche) return;
    this.avalanche.position.y = worldY;
  }

  removeAvalanche() {
    if (this.avalanche) {
      this.group.remove(this.avalanche);
      this.avalanche = null;
    }
  }

  clear() {
    for (const [, g] of this.rocks) this.group.remove(g);
    for (const [, m] of this.markers) this.group.remove(m);
    for (const [, g] of this.crevasses) this.group.remove(g);
    this.rocks.clear();
    this.markers.clear();
    this.crevasses.clear();
    this.removeAvalanche();
  }
}
