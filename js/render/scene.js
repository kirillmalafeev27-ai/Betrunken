// Three.js scene, camera, atmospherics (sky, fog, lights, ridges, stars).
// Uses the global `THREE` loaded from CDN in index.html.

import { clamp, lerp } from "../util.js";

const THREE = window.THREE;

export class SceneStage {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.resize();

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0e1825, 22, 110);
    this.scene.background = new THREE.Color(0x0e1825);

    this.camera = new THREE.PerspectiveCamera(
      74,
      window.innerWidth / window.innerHeight,
      0.1,
      600
    );
    this.camera.position.set(0, 2.6, 7.2);

    this._lights();
    this._sky();
    this._ridges();
    this._cloudSea();
    this._summitFlag();

    this.preset = "classic";
    this.phaseRatio = 0;
    this._warmGlow = null;

    window.addEventListener("resize", () => this.resize());
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    if (this.camera) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
    }
  }

  _lights() {
    this.hemi = new THREE.HemisphereLight(0x9fb6d8, 0x1e2a3a, 0.55);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffe2b8, 1.1);
    this.sun.position.set(10, 18, 14);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far  = 80;
    this.sun.shadow.camera.left = -30;
    this.sun.shadow.camera.right = 30;
    this.sun.shadow.camera.top = 30;
    this.sun.shadow.camera.bottom = -30;
    this.scene.add(this.sun);

    // Cool rim light from upper-left, makes the climber silhouette pop.
    this.rim = new THREE.DirectionalLight(0x8ab2d6, 0.45);
    this.rim.position.set(-8, 14, -4);
    this.scene.add(this.rim);

    // Climber key light — close, tracks player, keeps the red jacket bright.
    this.climberKey = new THREE.PointLight(0xfff1d0, 1.1, 14, 1.6);
    this.climberKey.position.set(0.5, 4, 5);
    this.scene.add(this.climberKey);

    // Fill from below (warm glow in vulcanic phase).
    this.warmFill = new THREE.PointLight(0xff7a35, 0.0, 80, 2);
    this.warmFill.position.set(0, -14, 6);
    this.scene.add(this.warmFill);
  }

  _sky() {
    // Large sphere with gradient shader-like material via vertex colors.
    const geo = new THREE.SphereGeometry(420, 32, 16);
    const colors = new Float32Array(geo.attributes.position.count * 3);
    const pos = geo.attributes.position;
    const top = new THREE.Color(0x040810);
    const mid = new THREE.Color(0x14243a);
    const bot = new THREE.Color(0x24364f);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 420;
      let c;
      if (y > 0.2) c = top.clone().lerp(mid, clamp(1 - (y - 0.2) / 0.8, 0, 1));
      else         c = bot.clone().lerp(mid, clamp((y + 0.4) / 0.6, 0, 1));
      colors[i * 3 + 0] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshBasicMaterial({
      side: THREE.BackSide,
      vertexColors: true,
      fog: false,
      depthWrite: false,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);

    // Stars group for night preset.
    this.stars = new THREE.Group();
    const starGeo = new THREE.BufferGeometry();
    const N = 380;
    const positions = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const phi = Math.random() * Math.PI * 2;
      const theta = Math.acos(1 - Math.random() * 0.7);
      const r = 380;
      positions[i * 3]     = r * Math.sin(theta) * Math.cos(phi);
      positions[i * 3 + 1] = r * Math.cos(theta);
      positions[i * 3 + 2] = r * Math.sin(theta) * Math.sin(phi);
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe6f0ff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.0,
      fog: false,
      depthWrite: false,
    });
    const points = new THREE.Points(starGeo, starMat);
    this.stars.add(points);
    this.starMat = starMat;
    this.scene.add(this.stars);
  }

  _ridges() {
    this.ridges = new THREE.Group();
    this.scene.add(this.ridges);
    const ridgeMaterial = new THREE.MeshStandardMaterial({
      color: 0x3a536e,
      flatShading: true,
      roughness: 0.95,
      metalness: 0.05,
    });
    for (let i = 0; i < 7; i++) {
      const geo = new THREE.ConeGeometry(14 + Math.random() * 12, 22 + Math.random() * 14, 5);
      const m = new THREE.Mesh(geo, ridgeMaterial);
      m.position.set(
        -90 + i * 26 + (Math.random() - 0.5) * 6,
        -3 + Math.random() * 6,
        -130 - Math.random() * 30
      );
      m.rotation.y = Math.random() * Math.PI;
      this.ridges.add(m);
    }
    // Second layer farther.
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.ConeGeometry(20 + Math.random() * 16, 30 + Math.random() * 14, 5);
      const m = new THREE.Mesh(
        geo,
        new THREE.MeshStandardMaterial({
          color: 0x273a52,
          flatShading: true,
          roughness: 1,
        })
      );
      m.position.set(
        -70 + i * 30 + (Math.random() - 0.5) * 8,
        -8,
        -200 - Math.random() * 40
      );
      this.ridges.add(m);
    }
  }

  _cloudSea() {
    this.cloudSea = new THREE.Group();
    this.scene.add(this.cloudSea);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe5edf5,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      fog: true,
    });
    for (let i = 0; i < 22; i++) {
      const geo = new THREE.SphereGeometry(6 + Math.random() * 6, 8, 6);
      const m = new THREE.Mesh(geo, mat);
      m.position.set(
        -90 + Math.random() * 180,
        -14 - Math.random() * 3,
        -60 - Math.random() * 90
      );
      m.scale.y = 0.35;
      this.cloudSea.add(m);
    }
    this.cloudSea.visible = false; // revealed after mid climb

    // High clouds
    this.highClouds = new THREE.Group();
    this.scene.add(this.highClouds);
    const hmat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      fog: false,
    });
    for (let i = 0; i < 10; i++) {
      const geo = new THREE.SphereGeometry(14 + Math.random() * 10, 6, 5);
      const m = new THREE.Mesh(geo, hmat);
      m.position.set(
        -120 + Math.random() * 240,
        60 + Math.random() * 40,
        -180 - Math.random() * 40
      );
      m.scale.y = 0.3;
      this.highClouds.add(m);
    }
  }

  _summitFlag() {
    this.summitMark = new THREE.Group();
    this.scene.add(this.summitMark);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.2, 6),
      new THREE.MeshStandardMaterial({ color: 0x6a4a2a, roughness: 1 })
    );
    pole.position.y = 1;
    const flag = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 0.7),
      new THREE.MeshStandardMaterial({
        color: 0xcc3a3a,
        side: THREE.DoubleSide,
        roughness: 0.9,
      })
    );
    flag.position.set(0.6, 1.7, 0);
    this.summitMark.add(pole);
    this.summitMark.add(flag);
    this.summitFlag = flag;
  }

  setPreset(preset) {
    this.preset = preset;
    if (preset === "newyear") {
      this.scene.fog = new THREE.Fog(0x06101e, 22, 110);
      this.scene.background = new THREE.Color(0x06101e);
      this.starMat.opacity = 0.95;
      this.hemi.color = new THREE.Color(0x8ea5c7);
      this.hemi.groundColor = new THREE.Color(0x1a2a40);
      this.sun.color = new THREE.Color(0xcfd8ff);
      this.sun.intensity = 0.45;
    } else {
      this.scene.fog = new THREE.Fog(0x0e1825, 22, 110);
      this.scene.background = new THREE.Color(0x0e1825);
      this.starMat.opacity = 0.0;
      this.hemi.color = new THREE.Color(0xcfe0ff);
      this.hemi.groundColor = new THREE.Color(0x3b4a5c);
      this.sun.color = new THREE.Color(0xffe2b8);
      this.sun.intensity = 0.9;
    }
  }

  updateAtmosphere({ phaseRatio, danger, serenity, progress }) {
    this.phaseRatio = phaseRatio;

    if (this.preset === "newyear") {
      // Night preset keeps cold colors, no lava glow.
      this.warmFill.intensity = 0;
      return;
    }

    // Phase-driven warm glow for the vulcanic final phase.
    const warm = clamp((progress / 100 - 0.78) / 0.22, 0, 1);
    this.warmFill.intensity = warm * 1.8;
    this.warmFill.color.setHSL(0.05 + 0.01 * warm, 0.9, 0.5);

    // Sky shift slightly warmer with phase.
    if (warm > 0) {
      const base = new THREE.Color(0x1a2834).lerp(new THREE.Color(0x3a1a20), 0.55 * warm);
      this.scene.background = base;
      this.scene.fog.color = base;
    } else {
      const col = new THREE.Color(0x1a2834);
      this.scene.background = col;
      this.scene.fog.color = col;
    }

    // Serenity softens the fog.
    this.scene.fog.near = lerp(20, 30, serenity);
    this.scene.fog.far  = lerp(105, 140, serenity);

    // Cloud sea appears after ~0.5 progress
    this.cloudSea.visible = progress > 48;
  }

  place(obj) { this.scene.add(obj); }
  remove(obj) { this.scene.remove(obj); }

  positionSummitFlag(x, y, z) {
    this.summitMark.position.set(x, y, z);
  }

  render() { this.renderer.render(this.scene, this.camera); }
}
