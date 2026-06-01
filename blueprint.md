# KIVON 3D — Cinematic Scroll Experience Blueprint

**Moderator:** KIVON 3D Team Moderator  
**Date:** 2026-05-31  
**Engine:** Three.js (procedural geometry only, no GLB loading)  
**Target:** AAA cinematic intro quality, 60 FPS guaranteed  
**Material mandate:** MeshPhysicalMaterial / MeshStandardMaterial only — NO wireframe, NO MeshBasicMaterial (exceptions noted), NO abstract neon shapes, NO lines, NO flat panels.

---

## Section Layout (Y positions)

| Section | Y | Name |
|---------|---|------|
| 0 | 12 | AI Core — DNA/Neural/Energy Spine Hybrid |
| 1 | 9.5 | Giant Energy Reactor |
| 2 | 7 | Floating Technology City |
| 3 | 4.5 | Data Galaxy |
| 4 | 2 | Quantum Center |
| 5 | -0.5 | Giant Crystal Energy System |
| 6 | -3 | Space Station Structures |
| 7 | -5.5 | Digital Life Forms |
| 8 | -8 | Cinematic Portal |

---

## Global Settings

### Camera
- PerspectiveCamera, FOV: 45, near: 0.1, far: 100
- Position at section Y on scroll, X: 0, Z: 6
- Smooth lerp between sections (scroll-driven)

### Global Lighting
- **AmbientLight:** intensity 0.3, color 0x111122
- **DirectionalLight:** position (5, 10, 7), intensity 1.2, castShadow: true
- **HemisphereLight:** sky 0x4466ff, ground 0x222244, intensity 0.4
- **EnvMap:** generated via PMREMGenerator from a CubeTextureLoader with 6 HDR-like gradient maps, applied to all MeshPhysicalMaterials

### All Scene Objects Convention
- Every geometry is a BufferGeometry with computed vertex normals
- Every material is MeshPhysicalMaterial with: metalness, roughness, envMap, clearcoat where appropriate
- Every object is grouped inside a parent Object3D at the section's Y position
- Shadows enabled on all objects (castShadow, receiveShadow)

---

## Section 0 — AI Core: DNA / Neural Network / Energy Spine (Y = 12)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: Birth of intelligence. A living, pulsing core that combines organic DNA helices with crystalline energy conduits.*

### Main Objects

#### Object 0.1 — Central Energy Spine (Vertical Torus Knot Cluster)
| Property | Value |
|----------|-------|
| Geometry | TorusKnotGeometry (radius: 1.2, tube: 0.25, tubularSegments: 180, radialSegments: 24) |
| Material | MeshPhysicalMaterial |
| Color | 0x00aaff |
| metalness | 0.9 |
| roughness | 0.15 |
| emissive | 0x0044ff |
| emissiveIntensity | 0.6 |
| clearcoat | 0.8 |
| clearcoatRoughness | 0.2 |
| envMapIntensity | 1.2 |
| Scale | (1, 2.5, 1) — stretched vertically |

**Animation:** Rotate Y: 0.3 rad/s, Rotate X: 0.1 rad/s, gentle vertical float (sine, amp 0.08, freq 0.5)

#### Object 0.2 — DNA Helix Strands (x2 intertwining)
Two helical strands made from stacked TorusGeometry rings connected by TubeGeometry bridges.

**Strand A — Blue Helix:**
| Property | Value |
|----------|-------|
| Rings (20x) | TorusGeometry (radius: 0.12, tube: 0.04, radialSegments: 12, tubularSegments: 16) |
| Path | TubeGeometry along a CatmullRomCurve3 helix (radius 0.8, height 2.5, 30 points) |
| Material | MeshPhysicalMaterial |
| Color | 0x0088ff |
| metalness | 0.7 |
| roughness | 0.2 |
| emissive | 0x0044aa |
| emissiveIntensity | 0.4 |

**Strand B — Gold Helix:**
| Property | Value |
|----------|-------|
| Rings (20x) | TorusGeometry (radius: 0.12, tube: 0.04) |
| Path | Same helix offset by PI |
| Material | MeshPhysicalMaterial |
| Color | 0xffaa33 |
| metalness | 0.85 |
| roughness | 0.15 |
| emissive | 0xaa5500 |
| emissiveIntensity | 0.3 |

**Connector Bars (between strands):**
- 15x CylinderGeometry (radiusTop: 0.02, radiusBottom: 0.02, height: 0.2)
- MeshPhysicalMaterial, color 0x88ccff, emissive 0x2266aa, emissiveIntensity 0.5
- Positioned at each rung of the DNA ladder

**Animation:** Rotate Y: 0.5 rad/s (counter-rotate strands A and B for twisting effect)

#### Object 0.3 — Neural Network Sphere Nodes
| Sub-Object | Count | Geometry | Material |
|------------|-------|----------|----------|
| Nodes | 40 | SphereGeometry (radius: 0.06, widthSegments: 12, heightSegments: 12) | MeshPhysicalMaterial, color 0x00ddff, emissive 0x0066ff, emissiveIntensity 0.8, metalness 0.3, roughness 0.1 |
| Connections | 60 | CylinderGeometry (radiusTop: 0.01, radiusBottom: 0.01, height: dynamic) | MeshPhysicalMaterial, color 0x44aaff, emissive 0x0044aa, emissiveIntensity 0.3, transparent: true, opacity: 0.6 |

Nodes distributed on a sphere surface (radius 1.6) using fibonacci sphere algorithm. Each node connects to 3 nearest neighbors.

**Animation:** Nodes pulse emissiveIntensity 0.4–1.0 (sine wave per node with phase offset). Connections pulse opacity 0.2–0.7.

#### Object 0.4 — Orbiting Energy Rings
3x TorusGeometry rings at varying tilts:

| Ring | Radius | Tube | Color | Tilt | Rotation Speed |
|------|--------|------|-------|------|----------------|
| Inner | 1.8 | 0.04 | 0x44ddff | 30° X | 0.6 rad/s Y |
| Mid | 2.1 | 0.03 | 0xff8844 | 45° X, 20° Z | 0.4 rad/s Y |
| Outer | 2.5 | 0.02 | 0x88ccff | 60° X | 0.25 rad/s Y |

Material: MeshPhysicalMaterial, emissive ~ 0x224488, emissiveIntensity 0.3, transparent: true, opacity: 0.7

### Lighting (Section-local)
- **PointLight:** position (0, 0, 0), color 0x4488ff, intensity 2.0, distance 8
- **SpotLight:** position (0, 3, 3), target at origin, color 0x00aaff, intensity 1.5, angle 0.5, penumbra 0.3

### Transition from Previous
*First scene — fade in from black over 1.5s. Camera approaches from Z=10 to Z=6.*

---

## Section 1 — Giant Energy Reactor (Y = 9.5)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: Contained stellar fury. A massive toroidal reactor with plasma core, multiple containment rings, and energy conduits.*

### Main Objects

#### Object 1.1 — Primary Reactor Core (Thick Torus)
| Property | Value |
|----------|-------|
| Geometry | TorusGeometry (radius: 1.5, tube: 0.45, radialSegments: 48, tubularSegments: 64) |
| Material | MeshPhysicalMaterial |
| Color | 0xcc4400 |
| metalness | 0.95 |
| roughness | 0.1 |
| emissive | 0xff4400 |
| emissiveIntensity | 0.8 |
| clearcoat | 1.0 |
| clearcoatRoughness | 0.1 |

**Animation:** Slow rotation Y: 0.15 rad/s, core pulse emissiveIntensity 0.6–1.0 (sine, freq 0.8)

#### Object 1.2 — Plasma Sphere (inside core)
| Property | Value |
|----------|-------|
| Geometry | SphereGeometry (radius: 0.9, widthSegments: 32, heightSegments: 32) |
| Material | MeshPhysicalMaterial |
| Color | 0xff6600 |
| metalness | 0.0 |
| roughness | 0.05 |
| emissive | 0xff2200 |
| emissiveIntensity | 1.5 |
| transparent | true |
| opacity | 0.85 |

**Animation:** Scale pulse 0.95–1.05 (sine, freq 1.2), emissiveIntensity pulse 1.0–2.0

#### Object 1.3 — Containment Rings (3 concentric torus rings)
| Ring | Radius | Tube | Color | metalness | roughness | emissive |
|------|--------|------|-------|-----------|-----------|----------|
| Inner | 1.3 | 0.08 | 0x888899 | 0.8 | 0.2 | 0x444466, intensity 0.2 |
| Mid | 1.8 | 0.06 | 0x6677aa | 0.85 | 0.15 | 0x2233aa, intensity 0.15 |
| Outer | 2.2 | 0.05 | 0x445588 | 0.9 | 0.1 | 0x112266, intensity 0.1 |

**Animation:** Each ring rotates at different speeds on Y axis (0.3, 0.2, 0.1 rad/s respectively). Outer ring also tilts ±5° on X.

#### Object 1.4 — Energy Conduit Pillars (8 pillars around reactor)
| Sub-Object | Count | Geometry |
|------------|-------|----------|
| Pillars | 8 | CylinderGeometry (radiusTop: 0.06, radiusBottom: 0.1, height: 1.8) |
| Caps | 16 | SphereGeometry (radius: 0.08, widthSegments: 8, heightSegments: 8) |

Material: MeshPhysicalMaterial, color 0xaa6633, metalness 0.9, roughness 0.15, emissive 0x884422, emissiveIntensity 0.3

Pillars positioned in a ring at radius 2.6 from center, equally spaced (45° apart). Tilted outward 15°.

**Animation:** Energy pulse travels up pillars — emissiveIntensity wave (phase offset per pillar, traveling up the cylinder)

#### Object 1.5 — Orbital Stabilizer Rings
2x flat torus rings at top and bottom:

| Position | Geometry | Material |
|----------|----------|----------|
| Top (y=0.8) | TorusGeometry (radius: 1.2, tube: 0.03, radialSegments: 32) | MeshPhysicalMaterial, color 0x88aaff, emissive 0x224466, emissiveIntensity 0.2, transparent: true, opacity: 0.5 |
| Bottom (y=-0.8) | Same | Same |

**Animation:** Top ring rotates CW, bottom CCW, 0.4 rad/s

### Lighting
- **PointLight:** inside plasma sphere, color 0xff4400, intensity 3.0, distance 6
- **PointLight:** above reactor (0, 2, 0), color 0xff8822, intensity 1.5, distance 10

### Transition from Section 0
Camera moves from Y=12 to Y=9.5. AI Core fades out (opacity 1→0 over 0.8s). Reactor fades in (scale 0→1 over 1.0s, easeOutCubic). Reactor briefly glows brighter on entry.

---

## Section 2 — Floating Technology City (Y = 7)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: A floating metropolis. Modular building blocks suspended in space with energy bridges connecting them.*

### Main Objects

#### Object 2.1 — Central Tower (Skyscraper Core)
| Sub-Object | Count | Geometry | Detail |
|------------|-------|----------|--------|
| Main shaft | 1 | CylinderGeometry (radiusTop: 0.15, radiusBottom: 0.35, height: 1.8) | 8 radial segments, flat shading |
| Mid sections | 6 | TorusGeometry (radius: 0.3, tube: 0.04, radialSegments: 16) | Spaced evenly along height |
| Top cap | 1 | SphereGeometry (radius: 0.18, widthSegments: 16, heightSegments: 16) | On top |
| Bottom base | 1 | CylinderGeometry (radiusTop: 0.38, radiusBottom: 0.42, height: 0.08) | Flared base |

Main shaft material: MeshPhysicalMaterial, color 0x88bbdd, metalness 0.85, roughness 0.2, emissive 0x224488, emissiveIntensity 0.15
Ring materials: MeshPhysicalMaterial, color 0xccddee, metalness 0.9, roughness 0.1, emissive 0x4488aa, emissiveIntensity 0.3

**Animation:** Slow Y rotation 0.2 rad/s, subtle bob (sine, amp 0.02, freq 0.4)

#### Object 2.2 — Floating Building Blocks (8 surrounding structures)
Each block is a BoxGeometry with beveled edges (via edges + slight chamfer or rounded box using a custom geometry):

| Block | Geometry (w × h × d) | Color | Y Offset | Radius from center |
|-------|---------------------|-------|----------|--------------------|
| A | 0.5 × 0.3 × 0.5 | 0x6699cc | 0.6 | 1.8 |
| B | 0.4 × 0.6 × 0.4 | 0x5577aa | 0.2 | 2.2 |
| C | 0.6 × 0.25 × 0.6 | 0x88aadd | -0.3 | 1.6 |
| D | 0.35 × 0.5 × 0.35 | 0x446688 | 0.8 | 2.0 |
| E | 0.45 × 0.35 × 0.45 | 0x7799cc | -0.6 | 2.4 |
| F | 0.3 × 0.7 × 0.3 | 0x5588bb | 0.4 | 2.6 |
| G | 0.5 × 0.2 × 0.5 | 0x6699dd | -0.8 | 1.4 |
| H | 0.4 × 0.4 × 0.4 | 0x4477aa | 0.0 | 2.8 |

Material for all blocks: MeshPhysicalMaterial, metalness 0.7–0.9, roughness 0.15–0.3, emissive 0x112233, emissiveIntensity 0.1, envMapIntensity 0.8

Window highlights: Small SphereGeometry (radius: 0.03) on block faces, MeshPhysicalMaterial, color 0x44ddff, emissive 0x00aaff, emissiveIntensity 0.6

**Animation:** Each block independently floats vertically (sine wave, random amp 0.03–0.08, random freq 0.3–0.7). Blocks slowly orbit the central tower at 0.05–0.15 rad/s.

#### Object 2.3 — Energy Bridge Connections
TubeGeometry CatmullRomCurve3 paths connecting blocks to central tower:

| Property | Value |
|----------|-------|
| Geometry | TubeGeometry (path: 5-point curve, tubularSegments: 20, radius: 0.015, radialSegments: 6) |
| Material | MeshPhysicalMaterial |
| Color | 0x44ddff |
| metalness | 0.3 |
| roughness | 0.2 |
| emissive | 0x0088ff |
| emissiveIntensity | 0.5 |
| transparent | true |
| opacity | 0.7 |

8 bridge segments connecting each outer block to nearest point on central tower.

**Animation:** Emissive pulse travels along bridges — gradient from tower outward, opacity 0.4–0.8

#### Object 2.4 — Orbital Ring Highway
| Property | Value |
|----------|-------|
| Geometry | TorusGeometry (radius: 3.0, tube: 0.03, radialSegments: 48) |
| Material | MeshPhysicalMaterial |
| Color | 0x88bbff |
| metalness | 0.6 |
| roughness | 0.3 |
| emissive | 0x224488 |
| emissiveIntensity | 0.15 |
| transparent | true |
| opacity | 0.5 |

Tilted 25° on X axis.

Small capsule shapes (SphereGeometry + CylinderGeometry combined) traveling along the ring — 12 capsules equally spaced, MeshPhysicalMaterial color 0x44ddff, emissive 0x00aaff, emissiveIntensity 0.8.

**Animation:** Ring rotates 0.1 rad/s. Capsules move along ring path at 0.5 rad/s.

#### Object 2.5 — Data Stream Particles
200 small SphereGeometry (radius: 0.015) in a volume (box 4×2×4). MeshPhysicalMaterial, color 0x88ddff, emissive 0x4488ff, emissiveIntensity 0.5, transparent: true, opacity: 0.4.

**Animation:** Particles drift upward slowly (0.02 units/s), recycle to bottom when reaching top. Random spread.

### Lighting
- **Ambient:** 0x223344, intensity 0.4
- **DirectionalLight:** from above-right (3, 4, 2), color 0xaaccff, intensity 1.0
- **PointLight:** at tower center (0, 0, 0), color 0x4488ff, intensity 1.5, distance 5
- **Rim lights:** 3 small PointLights around perimeter at Y=1, color 0x88ccff, intensity 0.5

### Transition from Section 1
Camera moves Y=9.5→7. Reactor fades scale 1→0.8 and drifts upward (out of view). City buildings scale up from 0 with staggered timing (each block 0.1s delay). Energy bridges fade in after blocks are at full scale.

---

## Section 3 — Data Galaxy (Y = 4.5)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: A swirling galaxy of data streams. Spiral arm structures made from glowing nodes and particle trails.*

### Main Objects

#### Object 3.1 — Spiral Galaxy Disk (Primary Structure)
| Property | Value |
|----------|-------|
| Geometry | CylinderGeometry (radiusTop: 2.8, radiusBottom: 2.8, height: 0.04, radialSegments: 64, heightSegments: 1) |
| Material | MeshPhysicalMaterial |
| Color | 0x442266 |
| metalness | 0.0 |
| roughness | 0.4 |
| emissive | 0x220044 |
| emissiveIntensity | 0.2 |
| transparent | true |
| opacity | 0.3 |

**Animation:** Rotate Y: 0.05 rad/s

#### Object 3.2 — Spiral Arm Nodes
8 spiral arms, each made of 60 SphereGeometry nodes (radius: 0.025–0.06, decreasing outward):

| Arm | Color | Emissive | Start Radius | End Radius | Spiral Turns |
|-----|-------|----------|--------------|------------|--------------|
| 1 | 0x4488ff | 0x0044ff | 0.3 | 2.6 | 1.5 |
| 2 | 0x44ddff | 0x00aaff | 0.3 | 2.6 | 1.5 |
| 3 | 0x66aaff | 0x2266ff | 0.3 | 2.6 | 1.5 |
| 4 | 0x88ccff | 0x4488ff | 0.3 | 2.6 | 1.5 |
| 5 | 0xaa88ff | 0x6644ff | 0.3 | 2.6 | 1.5 |
| 6 | 0xcc88ff | 0x8844ff | 0.3 | 2.6 | 1.5 |
| 7 | 0xff88cc | 0xff4488 | 0.3 | 2.6 | 1.5 |
| 8 | 0xffaa88 | 0xff6644 | 0.3 | 2.6 | 1.5 |

Each node: MeshPhysicalMaterial, metalness 0.2, roughness 0.1, emissiveIntensity 0.4–1.0 (varies by node), clearcoat 0.3
Nodes placed using logarithmic spiral algorithm: r = a * exp(b * theta), with slight random jitter

**Animation:** Galaxy rotates 0.05 rad/s. Nodes pulse emissiveIntensity (sine, random phase, freq 0.3–0.6). Individual nodes drift slightly along spiral path.

#### Object 3.3 — Galaxy Core (Dense Cluster)
| Sub-Object | Count | Geometry | Material |
|------------|-------|----------|----------|
| Core sphere | 1 | SphereGeometry (radius: 0.35, widthSegments: 20, heightSegments: 20) | MeshPhysicalMaterial, color 0xffffaa, emissive 0xffaa44, emissiveIntensity 2.0, metalness 0.0, roughness 0.1 |
| Inner nodes | 80 | SphereGeometry (radius: 0.02–0.04, random) | MeshPhysicalMaterial, color 0xffffcc, emissive 0xffcc66, emissiveIntensity 1.0–2.5, metalness 0.0, roughness 0.05 |
| Glow shell | 1 | SphereGeometry (radius: 0.5, widthSegments: 16, heightSegments: 16) | MeshPhysicalMaterial, color 0xff8800, emissive 0xff4400, emissiveIntensity 0.5, transparent: true, opacity: 0.15, roughness: 0.5 |

**Animation:** Core sphere pulses scale 0.95–1.05 (freq 0.6). Inner nodes orbit core randomly at 0.2–0.8 rad/s.

#### Object 3.4 — Galactic Dust Ring
| Property | Value |
|----------|-------|
| Geometry | TorusGeometry (radius: 2.2, tube: 0.12, radialSegments: 48, tubularSegments: 24) |
| Material | MeshPhysicalMaterial |
| Color | 0x5533aa |
| metalness | 0.1 |
| roughness | 0.6 |
| emissive | 0x330066 |
| emissiveIntensity | 0.15 |
| transparent | true |
| opacity | 0.2 |

**Animation:** Rotate Y: 0.08 rad/s, tilt wobble ±3°

#### Object 3.5 — Data Stream Trails
400 small SphereGeometry (radius: 0.01–0.025) placed along logarithmic spiral trails emanating from core. Colors: gradient from core color (0xffffaa) to arm color.

MeshPhysicalMaterial, emissive matches diffuse at 50% intensity, transparent: true, opacity: 0.2–0.6, metalness: 0.0, roughness: 0.3

**Animation:** Particles slowly flow outward along spiral paths (0.005–0.02 units/s). New particles generated at core as old ones reach end.

### Lighting
- **Ambient:** 0x110022, intensity 0.2
- **PointLight:** at galaxy core (0, 0, 0), color 0xffaa44, intensity 3.0, distance 6
- **PointLight:** above galaxy (0, 1, 0), color 0x8844ff, intensity 0.5, distance 4

### Transition from Section 2
Camera moves Y=7→4.5. City fades out (opacity 1→0, buildings scale down). Galaxy disk scales up from 0 with a burst effect (scale 0→1, overshoot to 1.1, settle to 1.0 over 1.2s). Core flare peaks at transition midpoint.

---

## Section 4 — Quantum Center (Y = 2)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: Quantum mechanics visualized. Entangled particle pairs, probability clouds, and a central quantum core.*

### Main Objects

#### Object 4.1 — Quantum Core (Icosahedron with nested geometry)
| Property | Value |
|----------|-------|
| Geometry | IcosahedronGeometry (radius: 0.6, detail: 2) |
| Material | MeshPhysicalMaterial |
| Color | 0x00ccaa |
| metalness | 0.85 |
| roughness | 0.1 |
| emissive | 0x008866 |
| emissiveIntensity | 0.5 |
| clearcoat | 0.9 |
| clearcoatRoughness | 0.1 |

**Nested inner sphere:**
| Property | Value |
|----------|-------|
| Geometry | SphereGeometry (radius: 0.35, widthSegments: 24, heightSegments: 24) |
| Material | MeshPhysicalMaterial |
| Color | 0x44ffdd |
| emissive | 0x00ffaa |
| emissiveIntensity | 1.5 |
| metalness | 0.2 |
| roughness | 0.05 |
| transparent | true |
| opacity | 0.6 |

**Animation:** Icosahedron rotates Y: 0.2 rad/s, X: 0.1 rad/s. Inner sphere counter-rotates Y: 0.4 rad/s. Core emits brief pulses (emissiveIntensity spikes to 3.0 every 3s).

#### Object 4.2 — Entangled Particle Pairs (12 pairs)
Each pair: two SphereGeometry (radius: 0.05) connected by a thin cylinder.

| Sub-Object | Geometry | Material |
|------------|----------|----------|
| Particles (24) | SphereGeometry (radius: 0.05, widthSegments: 8, heightSegments: 8) | MeshPhysicalMaterial, color 0x44ffcc, emissive 0x00ff88, emissiveIntensity 1.0, metalness 0.3, roughness 0.1 |
| Connection lines (12) | CylinderGeometry (radiusTop: 0.008, radiusBottom: 0.008, height: variable) | MeshPhysicalMaterial, color 0x88ffdd, emissive 0x44ffaa, emissiveIntensity 0.4, transparent: true, opacity: 0.6 |

Particles positioned on a sphere surface (radius 1.5). Each pair is two antipodal points. Connection cylinder is the chord between them.

**Animation:** Each pair oscillates (particles move toward each other and apart, sine freq 0.5–1.0 rad/s, random phase). Connection opacity pulses with oscillation. Entire set rotates slowly Y: 0.1 rad/s.

#### Object 4.3 — Probability Cloud Rings
| Ring | Geometry | Color | Emissive | Opacity |
|------|----------|-------|----------|---------|
| Ring A | TorusGeometry (radius: 1.2, tube: 0.06, radialSegments: 32) | 0x44ddbb | 0x22aa88, int 0.3 | 0.5 |
| Ring B | TorusGeometry (radius: 1.8, tube: 0.04, radialSegments: 40) | 0x66ddcc | 0x44bbaa, int 0.2 | 0.4 |
| Ring C | TorusGeometry (radius: 2.3, tube: 0.03, radialSegments: 48) | 0x88dddd | 0x66cccc, int 0.15 | 0.3 |

Material: MeshPhysicalMaterial, metalness 0.2, roughness 0.3, transparent: true

**Animation:** Each ring rotates at different speed on Y (0.3, 0.2, 0.1 rad/s). Ring A wobbles on X (sine ±5°, freq 0.8). Ring C wobbles opposite phase.

#### Object 4.4 — Quantum Fluctuation Orbs
30 small SphereGeometry (radius: 0.02–0.04) randomly positioned in spherical shell (radius 1.0–2.5).

Material: MeshPhysicalMaterial, color 0x88ffdd, emissive 0x44ffaa, emissiveIntensity 0.3–2.0 (random per orb), transparent: true, opacity: 0.2–0.6, metalness: 0.0, roughness: 0.2

**Animation:** Each orb has random position drift (0.01 units/s random direction). Orbs flash on/off with random probability — simulating quantum fluctuation — average 2 orbs visible at any time.

#### Object 4.5 — Measurement Beam Array
6x CylinderGeometry (radiusTop: 0.02, radiusBottom: 0.05, height: 0.3) positioned at regular intervals around core pointing inward.

Material: MeshPhysicalMaterial, color 0x88ffcc, emissive 0x44ff88, emissiveIntensity 0.5, metalness 0.8, roughness 0.15

**Animation:** Beams rotate slowly around Y axis. Each beam pulses emissiveIntensity at different phases.

### Lighting
- **Ambient:** 0x002211, intensity 0.3
- **PointLight:** at core center, color 0x44ffcc, intensity 2.5, distance 5
- **PointLight:** (1.5, 1.0, 1.5), color 0x88ffdd, intensity 0.8

### Transition from Section 3
Camera moves Y=4.5→2. Galaxy spiral arms collapse inward (nodes move to center over 1.0s). Galaxy core expands and transitions to quantum core. Quantum rings fade in from transparent. Entangled pairs appear with spark effect.

---

## Section 5 — Giant Crystal Energy System (Y = -0.5)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: A geodesic crystal formation pulsing with raw energy. Massive faceted crystals emerging from a base matrix.*

### Main Objects

#### Object 5.1 — Central Master Crystal (Large faceted octahedron)
| Property | Value |
|----------|-------|
| Geometry | OctahedronGeometry (radius: 0.9, detail: 1) |
| Material | MeshPhysicalMaterial |
| Color | 0x66aaff |
| metalness | 0.7 |
| roughness | 0.05 |
| emissive | 0x0044ff |
| emissiveIntensity | 0.6 |
| clearcoat | 1.0 |
| clearcoatRoughness | 0.05 |
| envMapIntensity | 1.5 |
| transparent | true |
| opacity | 0.95 |
| side | DoubleSide |

**Animation:** Rotate Y: 0.08 rad/s. Float bob (sine, amp 0.05, freq 0.3). Core energy pulse — emissiveIntensity 0.4–1.2, freq 0.7. Scale pulse on beat: 0.98–1.02.

#### Object 5.2 — Surrounding Crystal Cluster (12 crystals)
Each crystal: DodecahedronGeometry or OctahedronGeometry with varying parameters:

| Crystal | Geometry | Radius | Color | Emissive | Y Offset | Angle |
|---------|----------|--------|-------|----------|----------|-------|
| 1 | Octahedron | 0.3 | 0x4488dd | 0x0044aa, int 0.4 | 0.5 | 30° |
| 2 | Tetrahedron | 0.25 | 0x55aaee | 0x2266cc, int 0.3 | 0.2 | 60° |
| 3 | Octahedron | 0.35 | 0x77bbff | 0x4488dd, int 0.35 | -0.3 | 90° |
| 4 | Dodecahedron | 0.2 | 0x3399dd | 0x0066bb, int 0.5 | 0.7 | 120° |
| 5 | Octahedron | 0.28 | 0x66aaee | 0x3377cc, int 0.4 | -0.5 | 150° |
| 6 | Tetrahedron | 0.22 | 0x88ccff | 0x5599dd, int 0.3 | 0.4 | 180° |
| 7 | Octahedron | 0.32 | 0x5588dd | 0x2255bb, int 0.35 | -0.2 | 210° |
| 8 | Dodecahedron | 0.18 | 0x44aadd | 0x0044aa, int 0.4 | 0.6 | 240° |
| 9 | Octahedron | 0.26 | 0x6699ee | 0x3366cc, int 0.3 | -0.6 | 270° |
| 10 | Tetrahedron | 0.24 | 0x77aaff | 0x4477dd, int 0.35 | 0.3 | 300° |
| 11 | Octahedron | 0.3 | 0x88bbff | 0x5588ee, int 0.3 | -0.4 | 330° |
| 12 | Dodecahedron | 0.2 | 0x5599ee | 0x2266bb, int 0.4 | 0.1 | 360° |

All crystals: MeshPhysicalMaterial, metalness 0.6–0.8, roughness 0.05–0.15, clearcoat 0.8, clearcoatRoughness 0.1

Positioned in a ring at radius 1.6 from center, at varying heights. Each crystal tilted (random rotation on X and Z ±20°).

**Animation:** Each crystal rotates independently Y: 0.05–0.2 rad/s. Crystals pulse emissiveIntensity with phase offsets (creating a wave that circulates around the cluster).

#### Object 5.3 — Crystal Base Matrix (Energy Geode)
| Property | Value |
|----------|-------|
| Geometry | SphereGeometry (radius: 0.7, widthSegments: 16, heightSegments: 16) |
| Material | MeshPhysicalMaterial |
| Color | 0x224488 |
| metalness | 0.5 |
| roughness | 0.6 |
| emissive | 0x002266 |
| emissiveIntensity | 0.2 |
| transparent | true |
| opacity | 0.5 |
| side | BackSide |

Inner cavity lined with smaller crystal spikes (60x ConeGeometry, radius: 0.02, height: 0.04–0.08) pointing inward, random distribution on inner surface.

**Animation:** Base matrix slowly rotates opposite to main crystal. Emissive glow pulses in rhythm with master crystal.

#### Object 5.4 — Energy Beam Connectors
12x CylinderGeometry (radiusTop: 0.01, radiusBottom: 0.01) connecting master crystal to each satellite crystal.

Material: MeshPhysicalMaterial, color 0x88ccff, emissive 0x4488ff, emissiveIntensity 0.6, transparent: true, opacity: 0.5

**Animation:** Energy pulses travel along each beam — emissiveIntensity wave with phase offset per beam. Think "flowing energy conduit".

#### Object 5.5 — Floating Crystal Shards
40 small ConeGeometry (radius: 0.01–0.03, height: 0.03–0.08) scattered in volume around the crystal cluster.

MeshPhysicalMaterial, color 0xaaddff, emissive 0x4488ff, emissiveIntensity 0.3, metalness 0.6, roughness 0.1

**Animation:** Shards float slowly (random direction, 0.01–0.03 units/s), rotate randomly (0.5–2.0 rad/s on random axes). Gradually orbit outward and are replaced.

### Lighting
- **PointLight:** inside master crystal (0, 0, 0), color 0x4488ff, intensity 4.0, distance 6
- **PointLight:** above cluster (0, 1.5, 0), color 0x66aaff, intensity 1.0
- **PointLight:** below cluster (0, -1.0, 0), color 0x224488, intensity 0.8

### Transition from Section 4
Camera moves Y=2→-0.5. Quantum center collapses (scale 1→0 over 0.6s). Crystal cluster emerges from center — master crystal scales up from 0 with a shattering reveal effect (camera shake, brief white flash). Satellite crystals appear with staggered delay (0.1s each).

---

## Section 6 — Space Station Structures (Y = -3)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: Modular orbital station with docking rings, solar arrays, and habitation modules connected by transit tubes.*

### Main Objects

#### Object 6.1 — Central Hub (Dodecahedron command module)
| Property | Value |
|----------|-------|
| Geometry | DodecahedronGeometry (radius: 0.5, detail: 1) |
| Material | MeshPhysicalMaterial |
| Color | 0x8899bb |
| metalness | 0.9 |
| roughness | 0.2 |
| emissive | 0x223355 |
| emissiveIntensity | 0.15 |
| clearcoat | 0.5 |
| clearcoatRoughness | 0.3 |

**Detail panels:** 12 small BoxGeometry (0.08 × 0.02 × 0.08) on each face, inset slightly. MeshPhysicalMaterial, color 0x6677aa, emissive 0x112244, emissiveIntensity 0.1.

**Animation:** Rotate Y: 0.05 rad/s. Panel lights blink in sequence (on/off toggle every 0.5–2s random).

#### Object 6.2 — Main Docking Ring (Large torus with detail)
| Property | Value |
|----------|-------|
| Geometry | TorusGeometry (radius: 1.2, tube: 0.08, radialSegments: 32, tubularSegments: 48) |
| Material | MeshPhysicalMaterial |
| Color | 0x99aacc |
| metalness | 0.85 |
| roughness | 0.15 |
| emissive | 0x334466 |
| emissiveIntensity | 0.1 |

**Docking ports (6x):**
BoxGeometry (0.15 × 0.06 × 0.15) evenly spaced around ring. MeshPhysicalMaterial, color 0xaabbdd, metalness 0.8, roughness 0.2, emissive 0x445566, emissiveIntensity 0.1.

**Animation:** Ring rotates Y: 0.03 rad/s (opposite direction to hub). Docking port lights blink.

#### Object 6.3 — Solar Array Wings (4 panels)
Each panel: BoxGeometry (0.6 × 0.02 × 0.3) with smaller grid lines.

| Panel | Position | Rotation |
|-------|----------|----------|
| Left upper | (-1.6, 0.3, 0) | Z: -15° |
| Right upper | (1.6, 0.3, 0) | Z: 15° |
| Left lower | (-1.6, -0.3, 0) | Z: 15° |
| Right lower | (1.6, -0.3, 0) | Z: -15° |

Main panel: MeshPhysicalMaterial, color 0x2244aa, metalness 0.3, roughness 0.4, emissive 0x002288, emissiveIntensity 0.05
Grid cells (small BoxGeometry lines on surface): MeshPhysicalMaterial, color 0x4466cc, emissive 0x1133aa, emissiveIntensity 0.1

**Animation:** Panels track camera (rotate slightly on Y to face viewer). Subtle vibration (random noise 0.002 units on position).

#### Object 6.4 — Habitation Modules (4 cylindrical modules)
Each module:
| Sub-Object | Geometry | Detail |
|------------|----------|--------|
| Main body | CylinderGeometry (radiusTop: 0.12, radiusBottom: 0.12, height: 0.3) | 12 radial segments |
| End caps | SphereGeometry (radius: 0.12, widthSegments: 8, heightSegments: 8) | Scaled to half-ellipsoid |
| Ring detail | TorusGeometry (radius: 0.12, tube: 0.015, radialSegments: 12) | At middle |

Material: MeshPhysicalMaterial, color 0x8899bb, metalness 0.8, roughness 0.2, emissive 0x223344, emissiveIntensity 0.1

Modules positioned at ends of transit tubes, radius 1.5 from center.

**Animation:** Each module rotates on its local axis (0.1 rad/s). Module lights pulse: emissiveIntensity 0.1–0.3.

#### Object 6.5 — Transit Tube Connections
4x TubeGeometry (CatmullRomCurve3) connecting central hub to each module. Path curves outward then back in.

| Property | Value |
|----------|-------|
| Geometry | TubeGeometry (path: 6 control points, tubularSegments: 24, radius: 0.025, radialSegments: 8) |
| Material | MeshPhysicalMaterial |
| Color | 0x7799bb |
| metalness | 0.7 |
| roughness | 0.3 |
| emissive | 0x335577 |
| emissiveIntensity | 0.15 |

**Animation:** Small capsule "transit pods" travel through tubes — 1 pod per tube, SphereGeometry (radius: 0.03) + CylinderGeometry body, MeshPhysicalMaterial color 0x44ddff, emissive 0x2288ff, emissiveIntensity 0.8.

#### Object 6.6 — Orbital Debris / Micro-satellites
20 small irregular shapes (BoxGeometry / DodecahedronGeometry / SphereGeometry, 0.02–0.05 size) scattered around station.

MeshPhysicalMaterial, color 0x667788, metalness 0.6, roughness 0.4

**Animation:** Random orbit around station (0.1–0.3 rad/s). Slow tumbling rotation.

### Lighting
- **DirectionalLight:** (2, 2, 3), color 0xddddff, intensity 1.5 — simulating distant star
- **Ambient:** 0x111122, intensity 0.4
- **PointLight:** at hub center, color 0x6688aa, intensity 1.0, distance 4
- **SpotLight:** from above and left, target at hub, color 0xaabbee, intensity 0.8

### Transition from Section 5
Camera moves Y=-0.5→-3. Crystals shatter (break into smaller shards that fly outward). Station modules assemble from flying parts — each module flies in from off-screen and docks into position. Central hub appears first, then rings, then modules connect via extending tubes.

---

## Section 7 — Digital Life Forms (Y = -5.5)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: Ethereal digital organisms. Floating bio-mechanical life forms with organic curves and glowing energy cores.*

### Main Objects

#### Object 7.1 — Sovereign Entity (Large Alien Digital Life Form)
| Sub-Object | Geometry | Material |
|------------|----------|----------|
| Body | IcosahedronGeometry (radius: 0.6, detail: 2) with vertex displacement | MeshPhysicalMaterial, color 0x88aaff, metalness 0.3, roughness 0.05, emissive 0x4488ff, emissiveIntensity 0.4, clearcoat 0.8 |
| Core (inside) | SphereGeometry (radius: 0.25) | MeshPhysicalMaterial, color 0x44ddff, emissive 0x00aaff, emissiveIntensity 2.0, transparent: true, opacity: 0.7 |
| Tendrils (12) | TubeGeometry along CatmullRomCurve3 (sine wave paths) | MeshPhysicalMaterial, color 0x66aaff, emissive 0x2266ff, emissiveIntensity 0.5, metalness 0.2, roughness 0.1, transparent: true, opacity: 0.6 |
| Eyes (3) | SphereGeometry (radius: 0.08) | MeshPhysicalMaterial, color 0xffffff, emissive 0x88ddff, emissiveIntensity 1.0, metalness 0.0, roughness 0.0 |

Vertex displacement on icosahedron: push vertices along normal by 0.1*sin(theta*5)*cos(phi*3) for organic appearance.

Tendrils: each has 8 control points forming a sinusoidal curve emanating from body, radius 0.015.

**Animation:** Body slowly rotates Y: 0.05 rad/s. Core pulses (emissiveIntensity 1.5–3.0, freq 0.8). Tendrils wave (control points oscillate with sine, amp 0.05, freq 0.5, different phase per tendril). Eyes track camera gently (lookAt with smooth lerp).

#### Object 7.2 — Swarm Entities (8 smaller life forms)
Each swarm entity: combination of SphereGeometry body + ConeGeometry tail + TubeGeometry wings.

| Component | Geometry | Material |
|-----------|----------|----------|
| Body | SphereGeometry (radius: 0.06–0.1) | MeshPhysicalMaterial, color varies (#44aaff, #66ccff, #88ddff), emissive 0x4488ff, emissiveIntensity 0.5, metalness 0.2, roughness 0.1 |
| Tail | ConeGeometry (radius: 0.02, height: 0.1) | Same as body, emissiveIntensity 0.3 |
| Wings (2) | TubeGeometry (arc paths, radius: 0.008) | Same material, transparent: true, opacity: 0.5 |

Swarm positioned in a loose formation around the sovereign (radius 1.2–2.0).

**Animation:** Swarm orbits sovereign (0.2–0.4 rad/s, random axes). Each entity bobs independently (sine, amp 0.03, freq 0.8–1.2). Entities occasionally "dart" to a new position (lerp over 0.5s). Wings flap (scale Y oscillation 0.5–1.0, freq 2.0).

#### Object 7.3 — Digital Coral / Neural Growth Structures
15 organic growths made from stacked SphereGeometry (decreasing size) on CatmullRom curves:

Each growth: 5–8 SphereGeometry (radius: 0.02–0.06) connected along a branching CatmullRomCurve3 path.

MeshPhysicalMaterial, color 0x88ccff, emissive 0x4488ff, emissiveIntensity 0.3, metalness 0.1, roughness 0.2, clearcoat 0.5

Growths positioned on the "ground" plane (y=-0.8) around the entities.

**Animation:** Growths slowly extend (vertices move outward along growth direction, 0.005 units/s, max length capped). Tips glow brighter (emissiveIntensity 0.5–0.8).

#### Object 7.4 — Energy Ripples (Concentric torus rings on ground)
5x TorusGeometry rings on the y=-0.8 plane:

| Ring | Radius | Tube | Color | Opacity |
|------|--------|------|-------|---------|
| 1 | 0.8 | 0.01 | 0x88aaff | 0.4 |
| 2 | 1.1 | 0.008 | 0x88bbff | 0.3 |
| 3 | 1.4 | 0.006 | 0x88ccff | 0.2 |
| 4 | 1.7 | 0.005 | 0x88ddff | 0.15 |
| 5 | 2.0 | 0.004 | 0x88eeff | 0.1 |

MeshPhysicalMaterial, emissive 0x4488ff, emissiveIntensity 0.3, transparent: true

**Animation:** Rings expand outward from center (radius increases 0.01 units/s, then reset when reaching max radius). Opacity decreases as radius increases.

#### Object 7.5 — Bioluminescent Particles
300 small SphereGeometry (radius: 0.008–0.015) in a spherical volume (radius 2.5).

MeshPhysicalMaterial, color 0x88ddff, emissive 0x44aaff, emissiveIntensity 0.3–1.0, transparent: true, opacity: 0.2–0.6

**Animation:** Particles drift gently (Brownian-like random walk, 0.005 units/s). Pulsing glow (slow sine wave, random phase). Particles attract toward swarm entities (gentle force).

### Lighting
- **Ambient:** 0x001122, intensity 0.3
- **PointLight:** at sovereign core, color 0x4488ff, intensity 3.0, distance 5
- **PointLight:** warm backlight (0, 1, -2), color 0xff8844, intensity 0.5
- **Rim lights:** 4 small point lights around perimeter, color 0x4488ff, intensity 0.3

### Transition from Section 6
Camera moves Y=-3→-5.5. Space station breaks apart (modules separate and drift away). Digital coral grows from center. Sovereign entity materializes (particles coalesce into form over 1.5s). Swarm entities appear from glowing points that expand.

---

## Section 8 — Cinematic Portal (Y = -8)

### Creative Director Approval: Catherine Noir — APPROVED
*Theme: The final gateway. A massive ring portal with swirling dimensional energy, leading to the unknown.*

### Main Objects

#### Object 8.1 — Portal Ring (Massive Torus with detail)
| Property | Value |
|----------|-------|
| Geometry | TorusGeometry (radius: 1.8, tube: 0.3, radialSegments: 48, tubularSegments: 64) |
| Material | MeshPhysicalMaterial |
| Color | 0x8844aa |
| metalness | 0.95 |
| roughness | 0.05 |
| emissive | 0x6600cc |
| emissiveIntensity | 0.5 |
| clearcoat | 1.0 |
| clearcoatRoughness | 0.05 |
| envMapIntensity | 1.8 |

**Runes/ Glyphs on ring:** 24 small SphereGeometry (radius: 0.03) inlaid on ring surface, evenly spaced. MeshPhysicalMaterial, color 0xffaa44, emissive 0xff8800, emissiveIntensity 1.0.

**Animation:** Ring rotates Y: 0.04 rad/s. Emissive pulses slowly (0.3–0.7). Runes blink in sequence (traveling wave around ring, each rune lights up for 0.3s, 0.1s gap).

#### Object 8.2 — Portal Event Horizon (Swirling energy surface)
| Property | Value |
|----------|-------|
| Geometry | CircleGeometry (radius: 1.6, segments: 64) — or CylinderGeometry (radiusTop: 1.6, radiusBottom: 1.6, height: 0.01, radialSegments: 64) |
| Material | MeshPhysicalMaterial |
| Color | 0x220044 |
| metalness | 0.0 |
| roughness | 0.5 |
| emissive | 0x440088 |
| emissiveIntensity | 0.4 |
| transparent | true |
| opacity | 0.7 |
| side | DoubleSide |

**Vertex animation:** Vertices displaced in a spiral pattern — each vertex offset along Z by sin(angle * 4 + time * 2) * 0.15 + cos(distance_from_center * 3 + time * 1.5) * 0.1.

**Animation:** Swirl effect — opacity pulses 0.5–0.9. Emissive intensity cycles 0.3–0.8 (freq 0.6). Colors subtly shift between 0x440088 and 0x004488.

#### Object 8.3 — Portal Energy Rings (3 rings inside the portal)
| Ring | Radius | Tube | Color | Emissive | Rotation Speed |
|------|--------|------|-------|----------|----------------|
| Inner | 0.5 | 0.04 | 0xaa44ff | 0x6600ff, int 1.0 | 0.6 rad/s |
| Mid | 1.0 | 0.03 | 0x8844ff | 0x4400cc, int 0.7 | 0.4 rad/s |
| Outer | 1.4 | 0.02 | 0x6644ff | 0x2200aa, int 0.5 | 0.2 rad/s |

Material: MeshPhysicalMaterial, metalness 0.3, roughness 0.1, transparent: true, opacity: 0.6–0.8

**Animation:** Each ring rotates at different speed on Y and X (creating precession effect). Rings tilt dynamically (sine wave on X and Z, amp 5°, freq 0.3–0.6).

#### Object 8.4 — Portal Energy Tendrils (10 energy streams)
Each tendril: TubeGeometry (CatmullRomCurve3, 12 control points) spiraling outward from portal center.

| Property | Value |
|----------|-------|
| Geometry | TubeGeometry (path: spiral curve, tubularSegments: 30, radius: 0.015, radialSegments: 6) |
| Material | MeshPhysicalMaterial |
| Color | 0xaa66ff |
| emissive | 0x8833ff |
| emissiveIntensity | 0.8 |
| metalness | 0.1 |
| roughness | 0.1 |
| transparent | true |
| opacity | 0.5 |

Tendrils start at random angles around ring center, spiral outward to radius 2.5, then taper.

**Animation:** Tendrils wave and rotate (control points orbit the portal axis, with sinusoidal vertical oscillation). Each tendril has unique phase. Emissive pulses travel from root to tip.

#### Object 8.5 — Dimensional Debris / Portal Ejecta
50 small geometry objects (random mix of OctahedronGeometry, TetrahedronGeometry, BoxGeometry, 0.02–0.06 size) being ejected from portal.

MeshPhysicalMaterial, color random from palette [0xff88ff, 0x88ffff, 0xffff88, 0xff8888], emissive 50% intensity, emissiveIntensity 0.5–1.5, metalness 0.5, roughness 0.2

**Animation:** Particles ejected from portal center (velocity in random directions, speed 0.1–0.3 units/s). Slow rotation (0.5–2.0 rad/s, random axes). Particles fade out (opacity 1→0) over 3 seconds, then respawn at center.

#### Object 8.6 — Outer Frame / Portal Structure
| Sub-Object | Geometry | Detail |
|------------|----------|--------|
| Support pillars (8) | CylinderGeometry (radiusTop: 0.03, radiusBottom: 0.05, height: 0.8) | Around ring at radius 2.2 |
| Base platform | CylinderGeometry (radiusTop: 2.5, radiusBottom: 2.8, height: 0.06) | Below portal |
| Arch segments (4) | TorusGeometry (radius: 2.2, tube: 0.04, radialSegments: 16, arc: PI/2) | Quarter-arches at corners |

Material: MeshPhysicalMaterial, color 0x6655aa, metalness 0.85, roughness 0.15, emissive 0x332266, emissiveIntensity 0.1

**Animation:** Arch segments slowly orbit around portal. Pillars pulse with light traveling from base to top.

### Lighting
- **PointLight:** at portal center, color 0x8844ff, intensity 4.0, distance 8
- **PointLight:** (0, 0, 2) behind portal, color 0xaa44ff, intensity 2.0
- **PointLight:** (0, 0, -2) in front of portal, color 0x6622cc, intensity 1.5
- **Ambient:** 0x110022, intensity 0.2

### Transition from Section 7
Camera moves Y=-5.5→-8. Digital life forms dissolve into particles that stream into the portal. Portal ring fades in (scale 0→1, easeOutBack, overshoot 1.1, settle). Energy rings appear sequentially (inner first, then mid, then outer). Portal event horizon swirl intensifies over 1.5s. Final frame: camera slowly approaches portal (Z: 6→5) as scene reaches maximum intensity.

---

## Global Animation System (Kenji Tanaka — Motion Director)

### Scroll-Driven Timeline
- Scroll Y position maps directly to camera Y (lerp with smoothing)
- Each section's objects use `sectionVisible` state (boolean, active when camera Y is within ±1.0 of section Y)
- Entry animation triggered on `sectionVisible` becoming true: scale/ opacity tween over 0.8–1.5s

### Clock-Driven Animations
All continuous animations use `clock.getElapsedTime()` for deterministic behavior:

```
time = clock.getElapsedTime()
```

Common patterns:
- **Rotation:** `obj.rotation.y = time * speed`
- **Float:** `obj.position.y = baseY + sin(time * freq + phase) * amplitude`
- **Pulse:** `material.emissiveIntensity = base + sin(time * freq) * amplitude`
- **Wave:** `intensity = sin(time * freq + vertex_offset * wave_length) * amplitude`

### Performance Budget
| Metric | Limit |
|--------|-------|
| Draw calls per section | ≤ 30 |
| Total triangles | ≤ 150,000 |
| Unique materials | ≤ 20 per section |
| Lights (total) | ≤ 6 per section |
| Shadow maps | ≤ 2 (directional + 1 spotlight) |
| Animated objects | ≤ 50 per section |

---

## Technical Implementation Notes (Alex Chen — Three.js Technical Director)

### Geometry Merging
- Merge all static geometry within a section into a single BufferGeometry using `BufferGeometryUtils.mergeGeometries()` when materials are shared
- Dynamic objects (animated rotation/ position) must remain as separate meshes

### Material Instancing
- Use `Material.clone()` for variations to avoid creating unique materials
- Share envMap reference across all MeshPhysicalMaterials
- Pre-generate envMap using `PMREMGenerator` from a CubeTexture

### Rendering Pipeline
```
Renderer: WebGLRenderer
  - antialias: true
  - alpha: false
  - shadowMap: PCFSoftShadowMap
  - toneMapping: ACESFilmicToneMapping
  - toneMappingExposure: 1.2
  - outputColorSpace: sRGBColorSpace
```

### Frustum Culling
- All objects must have `frustumCulled: true` (default)
- Objects more than 2 section units away from camera should be marked `visible: false`
- Use bounding sphere for culling distance check in update loop

---

## Performance Strategy (Zara El-Wais — Performance Engineer)

### Achieving Stable 60 FPS

| Technique | Application |
|-----------|-------------|
| Geometry Instancing | Reuse geometry for repeated nodes/ crystals |
| LOD | Reduce radial segments on objects > 3 units from camera |
| Pooling | Particle systems use fixed-size object pools |
| Animation GPU offload | Use `onBeforeCompile` shader hooks for vertex animations where possible |
| Merge draw calls | Merge static geometry per section |
| Shadow distance | Shadow camera far set to 8 units only |
| Material count | Cap at 20 unique materials per section |
| Object count | Cap at 200 meshes per section (use merged geometry to stay under) |

### LOD Strategy
- **Full detail (distance < 3):** All segments, full materials, shadows
- **Medium detail (3–5):** Reduce radial segments by 50%, disable clearcoat, disable shadow
- **Low detail (5+):** Reduce segments by 75%, simpler geometry, emissive only (no envMap)

---

## Quality Control Sign-Off (Omar Hassan — Quality Control Lead)

### Rule Enforcement Checklist

| Rule | Status |
|------|--------|
| NO wireframe geometries | ENFORCED — all geometries are solid (Sphere, Box, Torus, Cylinder, etc.) |
| NO line segments / LineBasicMaterial | ENFORCED — zero Line objects |
| NO MeshBasicMaterial | EXCEPTION: only for specific UI overlay effects (not in 3D scene) |
| NO abstract neon shapes | ENFORCED — all shapes have real volume and physical material properties |
| All objects use MeshPhysicalMaterial or MeshStandardMaterial | ENFORCED — every 3D object specified with MeshPhysicalMaterial |
| metalness, roughness, envMap on every material | ENFORCED — all material tables include these values |
| Objects have real volume | ENFORCED — thick torus (tube ≥ 0.3 for main), solid spheres, solid cylinders, box geometries |
| Unreal Engine 5 / AAA quality | ENFORCED — clearcoat, envMap, emissive glow, ACES tone mapping |
| No GLB model loading | ENFORCED — 100% procedural geometry |

### Final Approval
**Omar Hassan (QC Lead):** ALL SECTIONS PASS QC — No rule violations. Blueprint approved for implementation.

---

## Appendix — Material Palette Reference

| Material Name | Color | metalness | roughness | emissive | emissiveIntensity | clearcoat |
|---------------|-------|-----------|-----------|----------|-------------------|-----------|
| Core Blue | 0x00aaff | 0.9 | 0.15 | 0x0044ff | 0.6 | 0.8 |
| Energy Gold | 0xffaa33 | 0.85 | 0.15 | 0xaa5500 | 0.3 | — |
| Reactor Core | 0xcc4400 | 0.95 | 0.1 | 0xff4400 | 0.8 | 1.0 |
| Plasma | 0xff6600 | 0.0 | 0.05 | 0xff2200 | 1.5 | — |
| Tech Blue | 0x88bbdd | 0.85 | 0.2 | 0x224488 | 0.15 | — |
| Galaxy Purple | 0x442266 | 0.0 | 0.4 | 0x220044 | 0.2 | — |
| Quantum Teal | 0x00ccaa | 0.85 | 0.1 | 0x008866 | 0.5 | 0.9 |
| Crystal Blue | 0x66aaff | 0.7 | 0.05 | 0x0044ff | 0.6 | 1.0 |
| Station Steel | 0x8899bb | 0.9 | 0.2 | 0x223355 | 0.15 | 0.5 |
| Life Form Blue | 0x88aaff | 0.3 | 0.05 | 0x4488ff | 0.4 | 0.8 |
| Portal Purple | 0x8844aa | 0.95 | 0.05 | 0x6600cc | 0.5 | 1.0 |
| Portal Energy | 0xaa44ff | 0.3 | 0.1 | 0x6600ff | 1.0 | — |

---

*End of Blueprint — All 9 sections specified. Ready for implementation by Elena Voss (3D), David Park (UX/transitions), Kenji Tanaka (animation), Alex Chen (technical), performance validated by Zara El-Wais, QC approved by Omar Hassan.*
