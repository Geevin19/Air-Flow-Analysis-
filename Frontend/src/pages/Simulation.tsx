import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulationAPI } from '../services/api';

// ─── Multi-pipe segment types ─────────────────────────────────────────────────
interface PipeSegment {
  id: string;
  name: string;
  shape: PipeShape;
  length: number;
  innerD: number;
  material: string;
  flowRate: number;
}

// ─── PDF Report generator (print-based, no external lib) ─────────────────────
function downloadReport(params: any, computed: any, name: string, segments: PipeSegment[], networkShapes: PipeShape[]) {
  const win = window.open('', '_blank');
  if (!win) return;
  const now = new Date().toLocaleString();

  // Shape icons and colors for the network diagram
  const shapeIcon: Record<PipeShape, string> = {
    'straight': '━', 'l-shaped': '┗', 's-curve': '∫', 'u-bend': '∪', 'helix': '⌀',
  };
  const shapeColor: Record<PipeShape, string> = {
    'straight': '#3b82f6', 'l-shaped': '#8b5cf6', 's-curve': '#f59e0b', 'u-bend': '#10b981', 'helix': '#ef4444',
  };
  const shapeLabel: Record<PipeShape, string> = {
    'straight': 'Straight', 'l-shaped': 'L-Shaped', 's-curve': 'S-Curve', 'u-bend': 'U-Bend', 'helix': 'Helix',
  };

  // Build network diagram HTML
  const networkDiagram = networkShapes.map((shape, i) => `
    <div style="display:inline-flex;flex-direction:column;align-items:center;gap:4px;">
      <div style="width:56px;height:56px;border-radius:12px;background:${shapeColor[shape]}18;border:2px solid ${shapeColor[shape]}60;display:flex;align-items:center;justify-content:center;font-size:22px;">${shapeIcon[shape]}</div>
      <div style="font-size:10px;font-weight:700;color:${shapeColor[shape]};text-align:center;">${shapeLabel[shape]}</div>
      <div style="font-size:9px;color:#9ca3af;">#${i+1}</div>
    </div>
    ${i < networkShapes.length - 1 ? '<div style="display:inline-flex;align-items:center;padding:0 4px;font-size:18px;color:#cbd5e1;margin-top:-16px;">→</div>' : ''}
  `).join('');

  const segRows = segments.map(s => {
    const area = Math.PI * (s.innerD / 2) ** 2;
    const v = area > 0 ? s.flowRate / area : 0;
    const rho = params.air.density_kg_m3;
    const mu = params.air.dynamic_viscosity_Pa_s;
    const Re = mu > 0 ? (rho * v * s.innerD) / mu : 0;
    const regime = Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transition' : 'Turbulent';
    const regimeClass = regime.toLowerCase();
    return `<tr>
      <td>${s.name}</td>
      <td><span style="display:inline-flex;align-items:center;gap:5px;"><span style="font-size:14px;">${shapeIcon[s.shape as PipeShape] ?? s.shape}</span> ${shapeLabel[s.shape as PipeShape] ?? s.shape}</span></td>
      <td>${s.length} m</td>
      <td>${(s.innerD * 1000).toFixed(1)} mm</td>
      <td>${s.material}</td>
      <td>${v.toFixed(3)} m/s</td>
      <td>${Re.toFixed(0)}</td>
      <td><span class="badge ${regimeClass}">${regime}</span></td>
    </tr>`;
  }).join('');

  win.document.write(`<!DOCTYPE html><html><head>
    <title>Simulation Report — ${name}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;margin:40px;color:#111;background:#fff;max-width:900px;}
      h1{color:#1d4ed8;font-size:22px;margin-bottom:4px;}
      .sub{color:#6b7280;font-size:13px;margin-bottom:28px;}
      .section{margin-bottom:28px;}
      .section h2{font-size:13px;font-weight:700;color:#374151;border-bottom:2px solid #e5e7eb;padding-bottom:6px;margin-bottom:14px;text-transform:uppercase;letter-spacing:.08em;}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px;}
      .metric{background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;padding:12px;}
      .metric .label{font-size:10px;color:#6b7280;font-weight:700;text-transform:uppercase;letter-spacing:.06em;}
      .metric .value{font-size:18px;font-weight:700;color:#111;margin-top:4px;}
      .metric .unit{font-size:11px;color:#9ca3af;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      th{background:#1d4ed8;color:#fff;padding:8px 10px;text-align:left;font-size:11px;}
      td{padding:7px 10px;border-bottom:1px solid #e5e7eb;vertical-align:middle;}
      tr:nth-child(even) td{background:#f8fafc;}
      .badge{display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
      .laminar{background:#dbeafe;color:#1d4ed8;}
      .turbulent{background:#fee2e2;color:#dc2626;}
      .transition{background:#fef9c3;color:#a16207;}
      .network-wrap{display:flex;align-items:center;flex-wrap:wrap;gap:4px;padding:16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px;}
      .network-summary{font-size:12px;color:#64748b;margin-top:8px;}
      @media print{body{margin:20px;}}
    </style>
  </head><body>
    <h1>📊 Airflow Simulation Report</h1>
    <div class="sub">Simulation: <b>${name || 'Untitled'}</b> &nbsp;·&nbsp; Generated: ${now}</div>

    <div class="section">
      <h2>Pipe Network — ${networkShapes.length} Segment${networkShapes.length !== 1 ? 's' : ''}</h2>
      <div class="network-wrap">${networkDiagram}</div>
      <div class="network-summary">
        Network sequence: <b>${networkShapes.map((s, i) => `${i+1}. ${shapeLabel[s]}`).join(' → ')}</b>
      </div>
    </div>

    <div class="section">
      <h2>Pipe Configuration</h2>
      <div class="grid">
        <div class="metric"><div class="label">Base Shape</div><div class="value">${shapeIcon[params.pipe.shape as PipeShape] ?? ''} ${shapeLabel[params.pipe.shape as PipeShape] ?? params.pipe.shape}</div></div>
        <div class="metric"><div class="label">Length</div><div class="value">${params.pipe.length_m}<span class="unit"> m</span></div></div>
        <div class="metric"><div class="label">Inner Diameter</div><div class="value">${(params.pipe.inner_diameter_m*1000).toFixed(1)}<span class="unit"> mm</span></div></div>
        <div class="metric"><div class="label">Material</div><div class="value">${params.pipe.material}</div></div>
        <div class="metric"><div class="label">Roughness ε</div><div class="value">${params.pipe.absolute_roughness_m}<span class="unit"> m</span></div></div>
        <div class="metric"><div class="label">Temperature</div><div class="value">${params.air.temperature_C}<span class="unit"> °C</span></div></div>
      </div>
    </div>

    <div class="section">
      <h2>Flow Results</h2>
      <div class="grid">
        <div class="metric"><div class="label">Avg Velocity</div><div class="value">${computed.velocity.toFixed(4)}<span class="unit"> m/s</span></div></div>
        <div class="metric"><div class="label">Reynolds Number</div><div class="value">${computed.reynolds.toFixed(0)}</div></div>
        <div class="metric"><div class="label">Flow Regime</div><div class="value"><span class="badge ${computed.flowRegime}">${computed.flowRegime}</span></div></div>
        <div class="metric"><div class="label">Total Pressure Drop</div><div class="value">${(computed.pressureDrop/1000).toFixed(4)}<span class="unit"> kPa</span></div></div>
        <div class="metric"><div class="label">Friction Factor f</div><div class="value">${computed.frictionFactor.toFixed(6)}</div></div>
        <div class="metric"><div class="label">Mass Flow Rate</div><div class="value">${computed.massFlow.toFixed(4)}<span class="unit"> kg/s</span></div></div>
        <div class="metric"><div class="label">Air Density</div><div class="value">${computed.density.toFixed(4)}<span class="unit"> kg/m³</span></div></div>
        <div class="metric"><div class="label">Wall Shear Stress</div><div class="value">${computed.wallShear.toFixed(4)}<span class="unit"> Pa</span></div></div>
        <div class="metric"><div class="label">Minor Loss Δp</div><div class="value">${(computed.minorDrop/1000).toFixed(4)}<span class="unit"> kPa</span></div></div>
      </div>
    </div>

    ${segments.length > 0 ? `
    <div class="section">
      <h2>Connected Pipe Segments (${segments.length})</h2>
      <table>
        <thead><tr><th>#</th><th>Name</th><th>Shape</th><th>Length</th><th>Diameter</th><th>Material</th><th>Velocity</th><th>Reynolds</th><th>Regime</th></tr></thead>
        <tbody>${segments.map((s, i) => {
          const area = Math.PI * (s.innerD / 2) ** 2;
          const v = area > 0 ? s.flowRate / area : 0;
          const rho = params.air.density_kg_m3;
          const mu = params.air.dynamic_viscosity_Pa_s;
          const Re = mu > 0 ? (rho * v * s.innerD) / mu : 0;
          const regime = Re < 2300 ? 'Laminar' : Re < 4000 ? 'Transition' : 'Turbulent';
          return `<tr>
            <td>${i+1}</td>
            <td>${s.name}</td>
            <td><span style="font-size:14px;">${shapeIcon[s.shape as PipeShape] ?? ''}</span> ${shapeLabel[s.shape as PipeShape] ?? s.shape}</td>
            <td>${s.length} m</td><td>${(s.innerD*1000).toFixed(1)} mm</td><td>${s.material}</td>
            <td>${v.toFixed(3)} m/s</td><td>${Re.toFixed(0)}</td>
            <td><span class="badge ${regime.toLowerCase()}">${regime}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>` : ''}

    <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af;">
      SmartTracker — Airflow Analysis Platform &nbsp;·&nbsp; ${now}
    </div>
    <script>window.onload=()=>window.print();</script>
  </body></html>`);
  win.document.close();
}

/* ─────────────────────────────────────────────────────────────────────────────
   THREE.JS loaded from CDN via script tag injection
   We use window.THREE after it loads. TubeGeometry + OrbitControls come from
   the same CDN build which includes them.
───────────────────────────────────────────────────────────────────────────── */

declare global {
  interface Window {
    THREE: any;
    OrbitControls: any;
  }
}

// ─── Physics ──────────────────────────────────────────────────────────────────

function computeAirDensity(T: number, P: number) { return P / (287.05 * (T + 273.15)); }
function computeDynamicViscosity(T: number) {
  const t = T + 273.15, mu0 = 1.716e-5, T0 = 273.15, S = 110.4;
  return mu0 * Math.pow(t / T0, 1.5) * ((T0 + S) / (t + S));
}
function computeRe(rho: number, v: number, D: number, mu: number) {
  return mu === 0 || D === 0 ? 0 : (rho * v * D) / mu;
}
function computeFF(Re: number, eps: number, D: number) {
  if (Re <= 0) return 0;
  if (Re < 2300) return 64 / Re;
  const rel = eps / D; let f = 0.02;
  for (let i = 0; i < 50; i++) { const r = -2 * Math.log10(rel / 3.7 + 2.51 / (Re * Math.sqrt(f))); f = 1 / (r * r); }
  return f;
}
function computeDP(f: number, L: number, D: number, rho: number, v: number) {
  return D === 0 ? 0 : f * (L / D) * 0.5 * rho * v * v;
}
function getRegime(Re: number): 'laminar' | 'transition' | 'turbulent' {
  return Re < 2300 ? 'laminar' : Re < 4000 ? 'transition' : 'turbulent';
}

// ─── Materials ────────────────────────────────────────────────────────────────

const MATERIALS: Record<string, { label: string; roughness: number; hex: number; metalness: number; roughnessVal: number }> = {
  'Steel':            { label: 'Steel',            roughness: 0.000045,  hex: 0x8899aa, metalness: 0.9, roughnessVal: 0.3 },
  'Galvanized Steel': { label: 'Galvanized Steel',  roughness: 0.00015,   hex: 0x9aabb8, metalness: 0.8, roughnessVal: 0.4 },
  'Copper':           { label: 'Copper',            roughness: 0.0000015, hex: 0xc87533, metalness: 0.95, roughnessVal: 0.2 },
  'PVC':              { label: 'PVC / Plastic',     roughness: 0.0000015, hex: 0xd4c9b8, metalness: 0.0, roughnessVal: 0.7 },
  'Ductile Iron':     { label: 'Ductile Iron',      roughness: 0.00026,   hex: 0x6b6b7a, metalness: 0.7, roughnessVal: 0.5 },
  'Concrete':         { label: 'Concrete',          roughness: 0.001,     hex: 0xb0a090, metalness: 0.0, roughnessVal: 0.9 },
  'Aluminium':        { label: 'Aluminium',         roughness: 0.000045,  hex: 0xaab5c0, metalness: 0.9, roughnessVal: 0.25 },
};

// ─── Pipe shapes ──────────────────────────────────────────────────────────────

type PipeShape = 'straight' | 'l-shaped' | 's-curve' | 'u-bend' | 'helix';

const PIPE_SHAPES: Record<PipeShape, { label: string; icon: string; description: string }> = {
  'straight': { label: 'Straight',  icon: '━', description: 'Linear pipe run' },
  'l-shaped': { label: 'L-Shaped',  icon: '┗', description: '90° elbow bend' },
  's-curve':  { label: 'S-Curve',   icon: '∫', description: 'Double bend' },
  'u-bend':   { label: 'U-Bend',    icon: '∪', description: '180° return bend' },
  'helix':    { label: 'Helix',     icon: '⌀', description: 'Spiral coil' },
};

// ─── Build a segment's local path points, starting at origin going +X ─────────
// Returns points in local space; caller translates/rotates to connect them.
function segmentPoints(shape: PipeShape, s: number): { pts: [number,number,number][], exitDir: [number,number,number] } {
  switch (shape) {
    case 'straight':
      return {
        pts: [[0,0,0],[s,0,0],[2*s,0,0],[3*s,0,0]],
        exitDir: [1,0,0],
      };
    case 'l-shaped':
      return {
        pts: [[0,0,0],[s,0,0],[2*s,0,0],[2*s,s,0],[2*s,2*s,0],[2*s,3*s,0]],
        exitDir: [0,1,0],
      };
    case 's-curve':
      return {
        pts: [[0,0,0],[s,0,0],[1.5*s,0.5*s,0],[2*s,0,0],[2.5*s,-0.5*s,0],[3*s,0,0],[4*s,0,0]],
        exitDir: [1,0,0],
      };
    case 'u-bend':
      return {
        pts: [[0,0,0],[s,0,0],[1.5*s,-0.3*s,0],[1.5*s,-s,0],[1.5*s,-1.5*s,0],[s,-1.5*s,0],[0,-1.5*s,0],[-s,-1.5*s,0]],
        exitDir: [-1,0,0],
      };
    case 'helix': {
      const helixPts: [number,number,number][] = [];
      for (let i = 0; i <= 16; i++) {
        const a = (i / 16) * Math.PI * 2.5;
        helixPts.push([Math.cos(a)*s, i*s*0.3, Math.sin(a)*s]);
      }
      return { pts: helixPts, exitDir: [0,1,0] };
    }
  }
}

// ─── Build a connected multi-segment path ─────────────────────────────────────
function buildNetworkPath(shapes: PipeShape[], THREE: any): any[] {
  if (shapes.length === 0) shapes = ['straight'];
  const scale = 0.4;
  const allPoints: any[] = [];
  let cursor = new THREE.Vector3(0, 0, 0);
  // direction the next segment should start going (unit vector)
  let dir = new THREE.Vector3(1, 0, 0);

  for (let si = 0; si < shapes.length; si++) {
    const { pts, exitDir } = segmentPoints(shapes[si], scale);

    // Build a quaternion that rotates local +X to current dir
    const localX = new THREE.Vector3(1, 0, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(localX, dir);

    const segStart = si === 0 ? 0 : 1; // skip first point on subsequent segments (avoid duplicate)
    for (let i = segStart; i < pts.length; i++) {
      const local = new THREE.Vector3(pts[i][0], pts[i][1], pts[i][2]);
      local.applyQuaternion(q);
      local.add(cursor);
      allPoints.push(local);
    }

    // Update cursor to last point
    const lastLocal = new THREE.Vector3(pts[pts.length-1][0], pts[pts.length-1][1], pts[pts.length-1][2]);
    lastLocal.applyQuaternion(q);
    cursor = cursor.clone().add(lastLocal);

    // Update direction for next segment
    const nextDir = new THREE.Vector3(exitDir[0], exitDir[1], exitDir[2]);
    nextDir.applyQuaternion(q);
    dir = nextDir.normalize();
  }

  // Centre the whole path
  const box = new THREE.Box3();
  allPoints.forEach(p => box.expandByPoint(p));
  const centre = new THREE.Vector3();
  box.getCenter(centre);
  return allPoints.map(p => p.clone().sub(centre));
}

// ─── CFD heatmap colour (blue→cyan→green→yellow→red) ─────────────────────────

function heatmapColor(t: number): [number, number, number] {
  // t in [0,1]: 0=blue(low), 1=red(high)
  const stops: [number, [number,number,number]][] = [
    [0.00, [0,0,255]],
    [0.25, [0,200,255]],
    [0.50, [0,255,100]],
    [0.75, [255,220,0]],
    [1.00, [255,30,0]],
  ];
  let lo = stops[0], hi = stops[stops.length - 1];
  for (let i = 0; i < stops.length - 1; i++) {
    if (t >= stops[i][0] && t <= stops[i+1][0]) { lo = stops[i]; hi = stops[i+1]; break; }
  }
  const f = (t - lo[0]) / (hi[0] - lo[0] + 1e-9);
  return [
    lo[1][0] + (hi[1][0] - lo[1][0]) * f,
    lo[1][1] + (hi[1][1] - lo[1][1]) * f,
    lo[1][2] + (hi[1][2] - lo[1][2]) * f,
  ];
}

// ─── Particle color schemes ───────────────────────────────────────────────────

function getParticleColor(t: number, scheme: 'rainbow' | 'blue' | 'fire' | 'cyan' | 'purple'): [number, number, number] {
  switch (scheme) {
    case 'rainbow':
      return heatmapColor(t);
    case 'blue':
      return [
        30 + t * 100,
        150 + t * 105,
        255,
      ];
    case 'fire':
      return [
        255,
        50 + t * 150,
        t * 100,
      ];
    case 'cyan':
      return [
        t * 100,
        200 + t * 55,
        255,
      ];
    case 'purple':
      return [
        150 + t * 105,
        50 + t * 100,
        255,
      ];
  }
}

// ─── Three.js Scene Component ─────────────────────────────────────────────────

interface SceneProps {
  pipeShape: PipeShape;
  networkShapes: PipeShape[];   // connected multi-segment network
  pipeRadius: number;
  pipeLength: number;
  material: string;
  velocity: number;
  pressureDrop: number;
  reynolds: number;
  flowRegime: string;
  colorMode: 'pressure' | 'friction' | 'velocity' | 'material';
  particleColorScheme: 'rainbow' | 'blue' | 'fire' | 'cyan' | 'purple';
  particleSize: 'small' | 'medium' | 'large';
  isDark: boolean;
}

function ThreePipeScene(props: SceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<any>(null);

  // Load Three.js + OrbitControls from CDN once
  const [threeReady, setThreeReady] = useState(!!window.THREE);

  useEffect(() => {
    if (window.THREE) { setThreeReady(true); return; }
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js';
      s2.onload = () => setThreeReady(true);
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  }, []);

  // Build / rebuild scene when Three is ready or props change
  useEffect(() => {
    if (!threeReady || !mountRef.current) return;
    const THREE = window.THREE;
    const container = mountRef.current;

    // Cleanup previous scene
    if (sceneRef.current) {
      sceneRef.current.dispose();
    }

    /* ── Renderer ── */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = ''; // Clear previous content
    container.appendChild(renderer.domElement);

    /* ── Scene ── */
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(props.isDark ? 0x040a18 : 0xdde6f0);

    /* ── Camera ── */
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 0.5, 5); // Centered in viewport
    camera.lookAt(0, 0, 0);

    /* ── Orbit Controls ── */
    let controls: any = null;
    if (window.THREE && THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 20;
      controls.target.set(0, 0, 0);
      controls.enablePan = true;
      controls.enableRotate = true;
      controls.enableZoom = true;
      controls.rotateSpeed = 1.0;
      controls.panSpeed = 1.0;
      controls.zoomSpeed = 1.0;
      controls.maxPolarAngle = Math.PI;
      controls.minPolarAngle = 0;
      controls.update();
    }

    /* ── Lights ── */
    const ambient = new THREE.AmbientLight(0x445566, props.isDark ? 1.2 : 2.0);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, props.isDark ? 1.5 : 2.5);
    mainLight.position.set(8, 10, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, props.isDark ? 0.8 : 1.2);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, props.isDark ? 0.5 : 0.8);
    rimLight.position.set(0, -3, 5);
    scene.add(rimLight);

    /* ── Build pipe path ── */
    const { pipeRadius, pipeLength, material, colorMode, particleColorScheme, particleSize } = props;
    const displayR = Math.max(0.06, Math.min(0.22, pipeRadius * 1.5));
    const mat = MATERIALS[material] || MATERIALS['Steel'];

    // Build connected network path from all shapes
    const shapes = props.networkShapes.length > 0 ? props.networkShapes : [props.pipeShape];
    const pathPoints = buildNetworkPath(shapes, THREE);

    const curve = new THREE.CatmullRomCurve3(pathPoints, false, 'catmullrom', 0.3);
    const tubeSegments = 100;
    const radSegments = 32; // More segments for smoother appearance
    const tubeGeom = new THREE.TubeGeometry(curve, tubeSegments, displayR, radSegments, false);

    /* ── Vertex color based on colorMode ── */
    const posArr = tubeGeom.attributes.position.array as Float32Array;
    const colors = new Float32Array(posArr.length);
    const vCount = posArr.length / 3;

    // Assign colors based on position along the tube
    for (let vi = 0; vi < vCount; vi++) {
      const ringIdx = Math.floor(vi / (radSegments + 1));
      const t = ringIdx / tubeSegments;

      let heat = 0;
      if (colorMode === 'pressure') {
        // Pressure gradient: high (red) at inlet, low (green) at outlet
        heat = 1 - t;
      } else if (colorMode === 'velocity') {
        // Velocity: varies through the bend
        heat = 0.3 + 0.7 * (1 - Math.abs(t - 0.5) * 2);
      } else if (colorMode === 'friction') {
        // Friction: highest at the bend
        heat = Math.pow(Math.sin(t * Math.PI), 1.5);
      } else {
        // Material: uniform color
        heat = 0.5;
      }

      const [r, g, b] = heatmapColor(heat);
      colors[vi * 3] = r / 255;
      colors[vi * 3 + 1] = g / 255;
      colors[vi * 3 + 2] = b / 255;
    }

    tubeGeom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const useHeatmap = colorMode !== 'material';
    const pipeMat = new THREE.MeshStandardMaterial({
      vertexColors: useHeatmap,
      color: useHeatmap ? undefined : new THREE.Color(mat.hex),
      metalness: 0.3,
      roughness: 0.4,
      envMapIntensity: 0.8,
      side: THREE.DoubleSide,
    });

    const pipeMesh = new THREE.Mesh(tubeGeom, pipeMat);
    pipeMesh.castShadow = true;
    pipeMesh.receiveShadow = true;
    scene.add(pipeMesh);

    /* ── End caps ── */
    const capGeom = new THREE.CircleGeometry(displayR, radSegments);
    const capMat = new THREE.MeshStandardMaterial({ 
      color: useHeatmap ? 0xff4444 : mat.hex, 
      metalness: 0.3, 
      roughness: 0.4 
    });
    const cap1 = new THREE.Mesh(capGeom, capMat);
    const cap2 = new THREE.Mesh(capGeom, capMat.clone());
    cap2.material.color.setHex(useHeatmap ? 0x44ff44 : mat.hex);
    
    const p0 = curve.getPoint(0), p1 = curve.getPoint(0.01);
    const pe = curve.getPoint(1), pm = curve.getPoint(0.99);
    cap1.position.copy(p0); cap1.lookAt(p1); scene.add(cap1);
    cap2.position.copy(pe); cap2.lookAt(pm); scene.add(cap2);

    /* ── Flow particles - Modern glowing effect with external streams ── */
    const pCount = 1000; // More particles for entrance/exit streams
    const pPositions = new Float32Array(pCount * 3);
    const pColors = new Float32Array(pCount * 3);
    const pSizes = new Float32Array(pCount);
    const pT = new Float32Array(pCount);
    const pR = new Float32Array(pCount);
    const pTheta = new Float32Array(pCount);
    const pSpeed = new Float32Array(pCount); // Individual speeds
    const pExternal = new Float32Array(pCount); // Track if particle is in external stream

    for (let i = 0; i < pCount; i++) {
      // 70% inside pipe, 15% entrance stream, 15% exit stream
      const rand = Math.random();
      if (rand < 0.15) {
        // Entrance stream (before pipe)
        pT[i] = -0.15 + Math.random() * 0.15; // -0.15 to 0
        pExternal[i] = 1;
      } else if (rand < 0.30) {
        // Exit stream (after pipe)
        pT[i] = 1 + Math.random() * 0.15; // 1 to 1.15
        pExternal[i] = 2;
      } else {
        // Inside pipe
        pT[i] = Math.random();
        pExternal[i] = 0;
      }
      
      pR[i] = Math.pow(Math.random(), 0.7) * 0.75;
      pTheta[i] = Math.random() * Math.PI * 2;
      pSpeed[i] = 0.8 + Math.random() * 0.4;
      
      // Vibrant gradient colors
      const heat = Math.abs(pT[i]);
      const [r, g, b] = getParticleColor(heat > 1 ? 1 : heat, particleColorScheme);
      pColors[i*3] = r/255; 
      pColors[i*3+1] = g/255; 
      pColors[i*3+2] = b/255;
      
      // Varied sizes
      pSizes[i] = 3 + Math.random() * 6;
    }

    const pGeom = new THREE.BufferGeometry();
    pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    pGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
    pGeom.setAttribute('size', new THREE.BufferAttribute(pSizes, 1));

    // Create glowing particle material with custom shader
    const particleSizeMap = { small: 0.12, medium: 0.2, large: 0.3 };
    const pMat = new THREE.PointsMaterial({
      vertexColors: true,
      sizeAttenuation: true,
      size: particleSizeMap[particleSize],
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: createGlowTexture(THREE),
    });
    
    const particles = new THREE.Points(pGeom, pMat);
    scene.add(particles);

    // Helper function to create glow texture
    function createGlowTexture(THREE: any) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d')!;
      
      // Create radial gradient for glow effect
      const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.4)');
      gradient.addColorStop(0.7, 'rgba(255,255,255,0.1)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 64, 64);
      
      const texture = new THREE.Texture(canvas);
      texture.needsUpdate = true;
      return texture;
    }

    /* ── Animation loop ── */
    let rafId = 0;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      
      // Get current velocity (updates in real-time)
      const currentVelocity = props.velocity || 1;
      const speedFactor = 0.003 + (currentVelocity / 10) * 0.02;
      
      // Animate particles along the curve with varied speeds
      const posAttr = pGeom.attributes.position as any;
      const colorAttr = pGeom.attributes.color as any;
      
      for (let i = 0; i < pCount; i++) {
        // Velocity profile: faster in center, slower near walls
        const velocityMultiplier = (1 - pR[i] * 0.5) * pSpeed[i];
        
        // Move particle along curve
        pT[i] += speedFactor * velocityMultiplier;
        
        // Reset particle at entrance when it exits
        if (pT[i] > 1.15) {
          pT[i] = -0.15;
          pR[i] = Math.pow(Math.random(), 0.7) * 0.75;
          pTheta[i] = Math.random() * Math.PI * 2;
          pSpeed[i] = 0.8 + Math.random() * 0.4;
        }

        // Handle particles in different zones
        let pt, tan, normal, binormal, rOff, theta;
        let brightness = 1.0;
        
        if (pT[i] < 0) {
          // Entrance stream (before pipe starts)
          const streamT = (pT[i] + 0.15) / 0.15; // 0 to 1 in entrance zone
          const p0 = curve.getPoint(0);
          const tan0 = curve.getTangent(0);
          
          // Extend backwards along tangent
          pt = new THREE.Vector3(
            p0.x - tan0.x * (1 - streamT) * displayR * 3,
            p0.y - tan0.y * (1 - streamT) * displayR * 3,
            p0.z - tan0.z * (1 - streamT) * displayR * 3
          );
          
          tan = tan0;
          const up = new THREE.Vector3(0, 1, 0);
          normal = new THREE.Vector3().crossVectors(tan, up).normalize();
          binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();
          
          // Expanding cone at entrance
          rOff = pR[i] * displayR * (0.3 + streamT * 0.7);
          theta = pTheta[i];
          brightness = streamT * 0.8; // Fade in
          
        } else if (pT[i] > 1) {
          // Exit stream (after pipe ends)
          const streamT = (pT[i] - 1) / 0.15; // 0 to 1 in exit zone
          const p1 = curve.getPoint(1);
          const tan1 = curve.getTangent(1);
          
          // Extend forward along tangent
          pt = new THREE.Vector3(
            p1.x + tan1.x * streamT * displayR * 3,
            p1.y + tan1.y * streamT * displayR * 3,
            p1.z + tan1.z * streamT * displayR * 3
          );
          
          tan = tan1;
          const up = new THREE.Vector3(0, 1, 0);
          normal = new THREE.Vector3().crossVectors(tan, up).normalize();
          binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();
          
          // Expanding cone at exit
          rOff = pR[i] * displayR * (1 + streamT * 0.5);
          theta = pTheta[i] + streamT * 0.3;
          brightness = (1 - streamT) * 0.8; // Fade out
          
        } else {
          // Inside pipe
          pt = curve.getPoint(pT[i]);
          tan = curve.getTangent(pT[i]);
          
          const up = new THREE.Vector3(0, 1, 0);
          normal = new THREE.Vector3().crossVectors(tan, up).normalize();
          binormal = new THREE.Vector3().crossVectors(tan, normal).normalize();
          
          rOff = pR[i] * displayR * 0.8;
          theta = pTheta[i] + pT[i] * 0.5;
          brightness = 1.0;
        }
        
        // Set position
        posAttr.array[i*3] = pt.x + normal.x * rOff * Math.cos(theta) + binormal.x * rOff * Math.sin(theta);
        posAttr.array[i*3+1] = pt.y + normal.y * rOff * Math.cos(theta) + binormal.y * rOff * Math.sin(theta);
        posAttr.array[i*3+2] = pt.z + normal.z * rOff * Math.cos(theta) + binormal.z * rOff * Math.sin(theta);
        
        // Keep colors bright and visible
        const heat = Math.abs(pT[i] > 1 ? 1 : (pT[i] < 0 ? 0 : pT[i]));
        const [r, g, b] = getParticleColor(heat, particleColorScheme);
        colorAttr.array[i*3] = (r/255) * brightness;
        colorAttr.array[i*3+1] = (g/255) * brightness;
        colorAttr.array[i*3+2] = (b/255) * brightness;
      }
      
      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      
      if (controls) controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(animate);

    /* ── Resize handler ── */
    const onResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    // Call onResize immediately to set correct dimensions
    onResize();
    
    window.addEventListener('resize', onResize);

    // Store cleanup
    sceneRef.current = {
      dispose: () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener('resize', onResize);
        if (controls) controls.dispose();
        renderer.dispose();
        tubeGeom.dispose(); pipeMat.dispose();
        capGeom.dispose(); capMat.dispose();
        pGeom.dispose(); pMat.dispose();
        if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      },
    };

    return () => { sceneRef.current?.dispose(); sceneRef.current = null; };
  }, [threeReady, props.pipeShape, props.networkShapes, props.pipeRadius, props.pipeLength, props.material,
      props.velocity, props.pressureDrop, props.reynolds,
      props.flowRegime, props.colorMode, props.particleColorScheme, props.particleSize, props.isDark]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {!threeReady && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(160,200,255,0.5)', fontFamily: '"IBM Plex Mono",monospace', fontSize: '13px', gap: '10px' }}>
          <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
          Loading 3D engine…
        </div>
      )}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      {/* Heatmap legend - vertical on right side */}
      <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', pointerEvents: 'none' }}>
        <span style={{ ...overlayTag, fontSize: '7px', padding: '2px 4px' }}>HIGH</span>
        <div style={{ width: '8px', height: '100px', borderRadius: '4px', background: 'linear-gradient(to bottom, #ff1e00, #ffdc00, #00ff64, #00c8ff, #0000ff)', border: '1px solid rgba(255,255,255,0.15)' }} />
        <span style={{ ...overlayTag, fontSize: '7px', padding: '2px 4px' }}>LOW</span>
      </div>
    </div>
  );
}

const overlayTag: React.CSSProperties = {
  background: 'rgba(2,8,20,0.75)', backdropFilter: 'blur(8px)',
  border: '1px solid rgba(80,120,200,0.2)', borderRadius: '3px',
  color: 'rgba(160,200,255,0.6)', fontSize: '7px',
  fontFamily: '"IBM Plex Mono",monospace', padding: '2px 4px',
};

// ─── Shared UI primitives ─────────────────────────────────────────────────────

function Field({ label, value, unit, onChange, min, max, step, description, readOnly, isDark = true }: {
  label: string; value: number | string; unit?: string; onChange: (v: string) => void;
  min?: number; max?: number; step?: number; description?: string; readOnly?: boolean; isDark?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ ...fld.label, color: isDark ? 'rgba(200,210,230,0.7)' : '#374151' }}>{label}</span>
        {unit && <span style={{ ...fld.unit, color: isDark ? 'rgba(150,180,220,0.5)' : '#6b7280', background: isDark ? 'rgba(100,140,200,0.12)' : '#f3f4f6', border: isDark ? '1px solid rgba(100,140,200,0.2)' : '1px solid #e5e7eb' }}>{unit}</span>}
      </div>
      {description && <div style={{ ...fld.desc, color: isDark ? 'rgba(150,170,200,0.45)' : '#9ca3af' }}>{description}</div>}
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(e.target.value)} readOnly={readOnly} disabled={readOnly}
        style={{ ...fld.input, background: isDark ? 'rgba(10,20,40,0.6)' : '#ffffff', border: isDark ? '1px solid rgba(80,120,200,0.2)' : '1px solid #d1d5db', color: isDark ? '#e8f0ff' : '#111827', ...(readOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} />
    </div>
  );
}

const fld: Record<string, React.CSSProperties> = {
  label: { fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: '"IBM Plex Mono",monospace' },
  unit:  { fontSize: '9px', fontFamily: '"IBM Plex Mono",monospace', padding: '1px 5px', borderRadius: '4px' },
  desc:  { fontSize: '9px', fontFamily: '"IBM Plex Mono",monospace', marginBottom: '2px' },
  input: { width: '100%', padding: '7px 10px', borderRadius: '8px', fontSize: '13px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
};

function Metric({ label, value, unit, hi, isDark = true }: { label: string; value: string; unit?: string; hi?: string; isDark?: boolean }) {
  return (
    <div style={{ background: isDark ? 'rgba(8,18,40,0.7)' : '#f9fafb', border: `1px solid ${hi ? hi + '40' : (isDark ? 'rgba(80,120,200,0.15)' : '#e5e7eb')}`, borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px', backdropFilter: isDark ? 'blur(8px)' : 'none' }}>
      <div style={{ fontSize: '9px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: isDark ? 'rgba(170,190,230,0.5)' : '#6b7280' }}>{label}</div>
      <div style={{ fontSize: '16px', fontFamily: '"Space Grotesk","IBM Plex Mono",sans-serif', fontWeight: '700', color: hi || (isDark ? '#e8f0ff' : '#111827'), lineHeight: 1.1 }}>{value}</div>
      {unit && <div style={{ fontSize: '10px', fontFamily: '"IBM Plex Mono",monospace', color: isDark ? 'rgba(150,180,230,0.4)' : '#9ca3af' }}>{unit}</div>}
    </div>
  );
}

function SecHdr({ icon, title, isDark = true }: { icon: string; title: string; isDark?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ width: '26px', height: '26px', background: isDark ? 'linear-gradient(135deg,rgba(80,140,255,0.2),rgba(120,80,220,0.2))' : 'linear-gradient(135deg,rgba(36,99,235,0.1),rgba(99,102,241,0.1))', border: isDark ? '1px solid rgba(100,160,255,0.25)' : '1px solid #e5e7eb', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>{icon}</div>
      <span style={{ fontSize: '10px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: isDark ? 'rgba(160,200,255,0.7)' : '#374151' }}>{title}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Simulation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const simulationId = searchParams.get('id');

  // ── theme ──
  const [theme, setTheme] = useState<'dark'|'light'>(() =>
    (localStorage.getItem('sim-theme') as 'dark'|'light') || 'light'
  );
  const isDark = theme === 'dark';
  const toggleTheme = () => setTheme(t => {
    const next = t === 'dark' ? 'light' : 'dark';
    localStorage.setItem('sim-theme', next);
    return next;
  });

  // ── form state (names match old Simulation.tsx) ──
  const [name,                   setName]                   = useState('');
  const [pipeLengthM,            setPipeLengthM]            = useState(20);
  const [pipeInnerDiameterM,     setPipeInnerDiameterM]     = useState(0.5);
  const [pipeOuterDiameterM,     setPipeOuterDiameterM]     = useState(0.55);
  const [pipeMaterial,           setPipeMaterial]           = useState('Steel');
  const [pipeAbsoluteRoughnessM, setPipeAbsoluteRoughnessM] = useState(MATERIALS['Steel'].roughness);
  const [airTemperatureC,        setAirTemperatureC]        = useState(20);
  const [airPressurePa,          setAirPressurePa]          = useState(101325);
  const [volumetricFlowRateM3S,  setVolumetricFlowRateM3S]  = useState(0.25);
  const [minorLossKTotal,        setMinorLossKTotal]        = useState(0.5);
  const [includeMinorLosses,     setIncludeMinorLosses]     = useState(true);
  const [velocityProfileMode,    setVelocityProfileMode]    = useState<'auto_by_re'|'laminar'|'turbulent'>('auto_by_re');
  const [crossSectionSamples,    setCrossSectionSamples]    = useState(50);

  // ── new 3D UI state ──
  const [pipeShape,   setPipeShape]   = useState<PipeShape>('straight');
  const [networkShapes, setNetworkShapes] = useState<PipeShape[]>(['straight']);
  const [colorMode,   setColorMode]   = useState<'pressure'|'friction'|'velocity'|'material'>('material');
  const [particleColorScheme, setParticleColorScheme] = useState<'rainbow'|'blue'|'fire'|'cyan'|'purple'>('purple');
  const [particleSize, setParticleSize] = useState<'small'|'medium'|'large'>('small');

  // ── app state ──
  const [submitting,      setSubmitting]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [backendResult,   setBackendResult]   = useState<any>(null);

  // ── multi-pipe segments ──
  const [segments, setSegments] = useState<PipeSegment[]>([]);
  const [showSegments, setShowSegments] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addSegment = useCallback(() => {
    setSegments(prev => [...prev, {
      id: Math.random().toString(36).slice(2),
      name: `Pipe ${prev.length + 1}`,
      shape: 'straight',
      length: pipeLengthM,
      innerD: pipeInnerDiameterM,
      material: pipeMaterial,
      flowRate: volumetricFlowRateM3S,
    }]);
  }, [pipeLengthM, pipeInnerDiameterM, pipeMaterial, volumetricFlowRateM3S]);

  const removeSegment = useCallback((id: string) => {
    setSegments(prev => prev.filter(s => s.id !== id));
  }, []);

  const updateSegment = useCallback((id: string, field: keyof PipeSegment, val: any) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...s, [field]: val } : s));
  }, []);

  // Combined pressure drop across all segments in series
  const totalSegmentDrop = useMemo(() => {
    const rho = computeAirDensity(airTemperatureC, airPressurePa);
    const mu  = computeDynamicViscosity(airTemperatureC);
    return segments.reduce((sum, s) => {
      const area = Math.PI * (s.innerD / 2) ** 2;
      const v = area > 0 ? s.flowRate / area : 0;
      const Re = computeRe(rho, v, s.innerD, mu);
      const f  = computeFF(Re, MATERIALS[s.material]?.roughness ?? 0.000045, s.innerD);
      return sum + computeDP(f, s.length, s.innerD, rho, v);
    }, 0);
  }, [segments, airTemperatureC, airPressurePa]);

  // File upload: parse JSON or CSV pipe definition
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        let parsed: any = null;

        if (file.name.endsWith('.json')) {
          parsed = JSON.parse(text);
        } else if (file.name.endsWith('.csv')) {
          // CSV format: name,shape,length_m,inner_diameter_m,material,flow_rate_m3s
          const lines = text.trim().split('\n');
          const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
          const rows = lines.slice(1).map(l => {
            const vals = l.split(',').map(v => v.trim());
            const obj: any = {};
            headers.forEach((h, i) => obj[h] = vals[i]);
            return obj;
          });
          parsed = { segments: rows };
        }

        if (!parsed) { setError('Could not parse file. Use JSON or CSV format.'); return; }

        // Single pipe definition
        if (parsed.pipe || parsed.length_m || parsed.inner_diameter_m) {
          const p = parsed.pipe || parsed;
          if (p.length_m)           setPipeLengthM(Number(p.length_m));
          if (p.inner_diameter_m)   setPipeInnerDiameterM(Number(p.inner_diameter_m));
          if (p.outer_diameter_m)   setPipeOuterDiameterM(Number(p.outer_diameter_m));
          if (p.material && MATERIALS[p.material]) setPipeMaterial(p.material);
          if (p.shape && PIPE_SHAPES[p.shape as PipeShape]) setPipeShape(p.shape);
          if (parsed.air?.temperature_C) setAirTemperatureC(Number(parsed.air.temperature_C));
          if (parsed.air?.pressure_Pa)   setAirPressurePa(Number(parsed.air.pressure_Pa));
          if (parsed.flow?.volumetric_flow_rate_m3_s) setVolumetricFlowRateM3S(Number(parsed.flow.volumetric_flow_rate_m3_s));
          if (parsed.name) setName(parsed.name);
          setError(null);
        }

        // Multi-segment definition
        if (parsed.segments && Array.isArray(parsed.segments)) {
          const newSegs: PipeSegment[] = parsed.segments.map((s: any, i: number) => ({
            id: Math.random().toString(36).slice(2),
            name: s.name || `Pipe ${i + 1}`,
            shape: (PIPE_SHAPES[s.shape as PipeShape] ? s.shape : 'straight') as PipeShape,
            length: Number(s.length_m || s.length || 10),
            innerD: Number(s.inner_diameter_m || s.inner_d || 0.1),
            material: MATERIALS[s.material] ? s.material : 'Steel',
            flowRate: Number(s.flow_rate_m3s || s.flow_rate || 0.25),
          }));
          setSegments(newSegs);
          setShowSegments(true);
          setError(null);
        }
      } catch {
        setError('Failed to parse file. Check the format and try again.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  useEffect(() => {
    setPipeAbsoluteRoughnessM(MATERIALS[pipeMaterial]?.roughness ?? 0.000045);
  }, [pipeMaterial]);

  useEffect(() => {
    if (simulationId) loadExistingSimulation(parseInt(simulationId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationId]);

  const loadExistingSimulation = async (id: number) => {
    setLoadingExisting(true);
    try {
      const res = await simulationAPI.getById(id);
      const sim = res.data;
      setName(sim.name ?? '');
      const p = sim.parameters;
      if (p?.pipe) {
        setPipeLengthM(p.pipe.length_m ?? 10);
        setPipeInnerDiameterM(p.pipe.inner_diameter_m ?? 0.5);
        setPipeOuterDiameterM(p.pipe.outer_diameter_m ?? 0.55);
        setPipeMaterial(p.pipe.material ?? 'Steel');
        setPipeAbsoluteRoughnessM(p.pipe.absolute_roughness_m ?? 0.000045);
      }
      if (p?.air) { setAirTemperatureC(p.air.temperature_C ?? 20); setAirPressurePa(p.air.pressure_Pa ?? 101325); }
      if (p?.flow) {
        setVolumetricFlowRateM3S(p.flow.volumetric_flow_rate_m3_s ?? 0.25);
        if (p.flow.velocity_profile_model) setVelocityProfileMode(p.flow.velocity_profile_model);
      }
      if (p?.losses) { setIncludeMinorLosses(p.losses.include_minor_losses ?? true); setMinorLossKTotal(p.losses.minor_loss_K_total ?? 0.5); }
      if (p?.cross_section) setCrossSectionSamples(p.cross_section.samples ?? 50);
      if (sim.results) setBackendResult(sim);
    } catch (err: any) {
      setError('Failed to load simulation: ' + (err.response?.data?.detail || err.message));
    } finally { setLoadingExisting(false); }
  };

  // ── physics ──
  const computed = useMemo(() => {
    const rho  = computeAirDensity(airTemperatureC, airPressurePa);
    const mu   = computeDynamicViscosity(airTemperatureC);
    const area = Math.PI * (pipeInnerDiameterM / 2) ** 2;
    const v    = area > 0 ? volumetricFlowRateM3S / area : 0;
    const Re   = computeRe(rho, v, pipeInnerDiameterM, mu);
    const f    = computeFF(Re, pipeAbsoluteRoughnessM, pipeInnerDiameterM);
    const dPf  = computeDP(f, pipeLengthM, pipeInnerDiameterM, rho, v);
    const dPm  = includeMinorLosses ? minorLossKTotal * 0.5 * rho * v * v : 0;
    const regime = getRegime(Re);
    const sp: 'laminar'|'turbulent' =
      velocityProfileMode === 'auto_by_re' ? (regime === 'turbulent' ? 'turbulent' : 'laminar')
      : velocityProfileMode === 'turbulent' ? 'turbulent' : 'laminar';
    return {
      density: rho, viscosity: mu, velocity: v, reynolds: Re,
      frictionFactor: f, pressureDrop: dPf + dPm,
      frictionDrop: dPf, minorDrop: dPm, flowRegime: regime,
      selectedProfile: sp, massFlow: rho * volumetricFlowRateM3S,
      area, wallShear: (f / 8) * rho * v * v,
    };
  }, [airTemperatureC, airPressurePa, pipeInnerDiameterM, volumetricFlowRateM3S,
      pipeAbsoluteRoughnessM, pipeLengthM, includeMinorLosses, minorLossKTotal, velocityProfileMode]);

  const generatedParameters = useMemo(() => ({
    type: 'cylindrical_air_flow',
    pipe: { length_m: pipeLengthM, inner_diameter_m: pipeInnerDiameterM, outer_diameter_m: pipeOuterDiameterM, inner_radius_m: pipeInnerDiameterM/2, material: pipeMaterial, absolute_roughness_m: pipeAbsoluteRoughnessM, shape: pipeShape },
    air: { property_mode: 'assume_tp', temperature_C: airTemperatureC, pressure_Pa: airPressurePa, density_kg_m3: computed.density, dynamic_viscosity_Pa_s: computed.viscosity },
    flow: { volumetric_flow_rate_m3_s: volumetricFlowRateM3S, average_velocity_m_s: computed.velocity, reynolds_number: computed.reynolds, flow_regime: computed.flowRegime, velocity_profile_model: computed.selectedProfile },
    losses: { include_minor_losses: includeMinorLosses, minor_loss_K_total: minorLossKTotal, friction_factor_darcy: computed.frictionFactor, pressure_drop_Pa: computed.pressureDrop },
    cross_section: { samples: crossSectionSamples },
  }), [pipeLengthM, pipeInnerDiameterM, pipeOuterDiameterM, pipeMaterial, pipeAbsoluteRoughnessM,
       pipeShape, airTemperatureC, airPressurePa, volumetricFlowRateM3S, includeMinorLosses,
       minorLossKTotal, crossSectionSamples, computed]);

  const handleSave = async () => {
    setError(null);
    if (!name.trim()) { setError('Please enter a simulation name.'); return; }
    if (simulationId) { setError('Viewing an existing simulation — go to Dashboard to create a new one.'); return; }
    setSaving(true); setSubmitting(true);
    try {
      const res = await simulationAPI.create({ name: name.trim(), parameters: generatedParameters });
      setBackendResult(res.data); setSaved(true); setTimeout(() => setSaved(false), 3000);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save simulation.');
    } finally { setSaving(false); setSubmitting(false); }
  };

  const reColor = computed.reynolds < 2300 ? '#4fbbf7' : computed.reynolds < 4000 ? '#f7c14f' : '#f7614f';
  const isViewing = !!simulationId;

  const sceneProps: SceneProps = {
    pipeShape, networkShapes, pipeRadius: pipeInnerDiameterM / 2, pipeLength: pipeLengthM,
    material: pipeMaterial, velocity: computed.velocity,
    pressureDrop: computed.pressureDrop, reynolds: computed.reynolds,
    flowRegime: computed.flowRegime, colorMode, particleColorScheme, particleSize,
    isDark,
  };

  return (
    <div style={{ ...C.page, ...(isDark ? {} : LT.page) }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');
        *{box-sizing:border-box;}
        input[type=number]::-webkit-inner-spin-button{opacity:0.3;}
        input[type=number]:focus{border-color:rgba(80,160,255,0.5)!important;box-shadow:0 0 0 3px rgba(80,160,255,0.1);}
        input[type=number]:disabled{opacity:0.5;cursor:not-allowed;}
        select{appearance:none;-webkit-appearance:none;}
        select:focus{border-color:rgba(80,160,255,0.5)!important;outline:none;}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        ::-webkit-scrollbar{width:6px;height:6px;}
        ::-webkit-scrollbar-track{background:${theme === 'dark' ? 'rgba(10,20,40,0.3)' : 'rgba(200,210,230,0.3)'};border-radius:3px;}
        ::-webkit-scrollbar-thumb{background:${theme === 'dark' ? 'rgba(80,120,200,0.4)' : 'rgba(100,120,160,0.4)'};border-radius:3px;transition:background 0.2s;}
        ::-webkit-scrollbar-thumb:hover{background:${theme === 'dark' ? 'rgba(80,120,200,0.6)' : 'rgba(100,120,160,0.6)'};}
        @media(max-width:900px){
          .sim-body{grid-template-columns:1fr!important;overflow:auto!important;height:auto!important;}
          .sim-left{border-right:none!important;border-bottom:1px solid rgba(80,120,200,0.12);max-height:none!important;overflow:visible!important;}
          .sim-viewport{height:300px!important;min-height:300px!important;}
          .sim-right{border-left:none!important;border-top:1px solid rgba(80,120,200,0.12);max-height:none!important;overflow:visible!important;}
          .sim-nav{padding:8px 12px!important;flex-wrap:wrap;gap:6px;}
          .sim-nav-title{font-size:12px!important;}
          .sim-nav-sub{display:none!important;}
          .sim-nav-btns{gap:6px!important;flex-wrap:wrap;}
          .sim-nav-btns button{padding:6px 10px!important;font-size:11px!important;}
          .sim-name-bar{padding:6px 12px!important;}
          .sim-name-input{width:180px!important;font-size:12px!important;}
        }
        @media(max-width:480px){
          .sim-viewport{height:240px!important;min-height:240px!important;}
          .sim-card-grid{grid-template-columns:1fr!important;}
        }</style>
      <div style={{ ...C.bg, ...(isDark ? {} : { background: 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(200,220,255,0.4) 0%,transparent 70%)' }) }}/>
      <div style={{ ...C.gridBg, ...(isDark ? {} : { backgroundImage: 'linear-gradient(rgba(36,99,235,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(36,99,235,0.06) 1px,transparent 1px)' }) }}/>

      {/* ── Nav ── */}
      <nav style={{ ...C.nav, ...(isDark ? {} : LT.nav) }} className="sim-nav">
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => navigate('/dashboard')} style={{ ...C.backBtn, ...(isDark ? {} : LT.backBtn) }}>← Dashboard</button>
          <div style={C.divider}/>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={{ ...C.navTitle, ...(isDark ? {} : LT.navTitle) }} className="sim-nav-title">Cylindrical Air Flow Simulator {isViewing && <span style={{ fontSize:'11px', color:'#a0c4ff', opacity:0.7 }}>(Viewing)</span>}</span>
            <span style={C.navSub} className="sim-nav-sub">{isViewing ? 'Read-only · existing simulation' : '3D live simulation · drag to orbit · inputs update instantly'}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }} className="sim-nav-btns">
          {loadingExisting && <span style={{ fontSize:'11px', fontFamily:'"IBM Plex Mono"', color:'rgba(160,200,255,0.5)', animation:'pulse 1.5s infinite' }}>Loading…</span>}
          {/* Theme toggle */}
          <button onClick={toggleTheme} title="Toggle theme"
            style={{ width:'34px', height:'34px', borderRadius:'50%', border:`1px solid ${isDark?'rgba(80,120,200,0.3)':'#d1d5db'}`, background: isDark?'rgba(80,120,200,0.1)':'#f3f4f6', cursor:'pointer', fontSize:'16px', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s' }}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <div style={{ ...C.regimeBadge, borderColor: reColor+'60', color: reColor }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:reColor, animation:'pulse 2s infinite' }}/>
            {computed.flowRegime.charAt(0).toUpperCase()+computed.flowRegime.slice(1)}
          </div>
          {!isViewing && (
            <button onClick={handleSave} disabled={saving||submitting} style={{ ...C.saveBtn, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderColor:'rgba(37,99,235,0.5)', color:'#fff', ...(saved?{background:'linear-gradient(135deg,#059669,#047857)',borderColor:'rgba(5,150,105,0.5)'}:{}), ...(saving?{opacity:0.7}:{}) }}>
              {saving ? 'Saving…' : saved ? 'Saved!' : 'Save'}
            </button>
          )}
          {/* Download Report */}
          <button onClick={() => downloadReport(generatedParameters, computed, name, segments, networkShapes)}
            title="Download PDF report"
            style={{ ...C.saveBtn, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderColor:'rgba(37,99,235,0.5)', color:'#fff' }}>
            Report
          </button>
          {/* File Upload */}
          <input ref={fileInputRef} type="file" accept=".json,.csv" style={{ display:'none' }} onChange={handleFileUpload} />
          <button onClick={() => fileInputRef.current?.click()}
            title="Import pipe definition from JSON or CSV"
            style={{ ...C.saveBtn, background:'linear-gradient(135deg,#2563eb,#7c3aed)', borderColor:'rgba(37,99,235,0.5)', color:'#fff' }}>
            Import
          </button>
        </div>
      </nav>

      {/* ── Name bar ── */}
      <div style={{ ...C.nameBar, ...(isDark ? {} : LT.nameBar) }} className="sim-name-bar">
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder={isViewing?'Simulation name':'Name this simulation…'}
          readOnly={isViewing} disabled={isViewing}
          style={{ ...C.nameInput, ...(isDark ? {} : LT.nameInput), ...(isViewing?{opacity:0.6,cursor:'default'}:{}) }} className="sim-name-input"/>
        {isViewing && <span style={{ fontSize:'11px', fontFamily:'"IBM Plex Mono"', color:'rgba(160,200,255,0.35)', marginLeft:'14px' }}>Go to Dashboard → New Simulation to create a new one</span>}
      </div>

      {error && (
        <div style={C.errBanner}>⚠ {error}<button onClick={()=>setError(null)} style={C.errClose}>✕</button></div>
      )}

      {/* ── Main layout: left sidebar + 3D viewport + right metrics ── */}
      <div style={{ ...C.body, ...(isDark ? {} : LT.body) }} className="sim-body">

        {/* ──── LEFT: inputs ──── */}
        <div style={{ ...C.left, ...(isDark ? {} : LT.left) }} className="sim-left">

          {/* Pipe Network Builder */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="🔗" title="Pipe Network" isDark={isDark}/>
            <p style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', margin:'0 0 10px' }}>
              Add segments in order — they connect end-to-end automatically
            </p>

            {/* Current network sequence */}
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:10 }}>
              {networkShapes.map((shape, idx) => (
                <div key={idx} style={{ display:'flex', alignItems:'center', gap:6, background: isDark?'rgba(4,12,30,0.6)':'#f9fafb', border: isDark?'1px solid rgba(80,120,200,0.15)':'1px solid #e5e7eb', borderRadius:8, padding:'6px 8px' }}>
                  <span style={{ fontSize:16 }}>{PIPE_SHAPES[shape].icon}</span>
                  <span style={{ flex:1, fontSize:11, fontFamily:'"IBM Plex Mono",monospace', fontWeight:700, color: isDark?'#e8f0ff':'#111827' }}>
                    {idx + 1}. {PIPE_SHAPES[shape].label}
                  </span>
                  {/* Move up */}
                  {idx > 0 && (
                    <button onClick={() => {
                      const n = [...networkShapes];
                      [n[idx-1], n[idx]] = [n[idx], n[idx-1]];
                      setNetworkShapes(n);
                    }} style={{ background:'none', border:'none', cursor:'pointer', color: isDark?'rgba(160,200,255,0.5)':'#6b7280', fontSize:12, padding:'0 2px' }}>↑</button>
                  )}
                  {/* Move down */}
                  {idx < networkShapes.length - 1 && (
                    <button onClick={() => {
                      const n = [...networkShapes];
                      [n[idx], n[idx+1]] = [n[idx+1], n[idx]];
                      setNetworkShapes(n);
                    }} style={{ background:'none', border:'none', cursor:'pointer', color: isDark?'rgba(160,200,255,0.5)':'#6b7280', fontSize:12, padding:'0 2px' }}>↓</button>
                  )}
                  {/* Remove */}
                  <button onClick={() => setNetworkShapes(prev => prev.filter((_, i) => i !== idx))}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#f87171', fontSize:13, padding:'0 2px' }}>✕</button>
                </div>
              ))}
            </div>

            {/* Add shape buttons */}
            <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', marginBottom:6 }}>Add segment</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
              {(Object.entries(PIPE_SHAPES) as [PipeShape, typeof PIPE_SHAPES[PipeShape]][]).map(([key, sh]) => (
                <button key={key} onClick={() => { setNetworkShapes(prev => [...prev, key]); setPipeShape(key); }} disabled={isViewing}
                  style={{ padding:'8px 6px', borderRadius:9, border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #e5e7eb', background: isDark?'rgba(10,20,40,0.4)':'#f9fafb', color: isDark?'rgba(160,180,220,0.7)':'#374151', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:isViewing?'not-allowed':'pointer', transition:'all 0.15s', display:'flex', flexDirection:'column', alignItems:'center', gap:3 }}>
                  <span style={{ fontSize:16 }}>{sh.icon}</span>
                  <span>{sh.label}</span>
                </button>
              ))}
            </div>

            {/* Quick presets */}
            <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:700, textTransform:'uppercase', letterSpacing:'.08em', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', margin:'10px 0 6px' }}>Presets</div>
            <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
              {[
                { label:'Simple L-run',    shapes: ['straight','l-shaped','straight'] as PipeShape[] },
                { label:'S-bend run',      shapes: ['straight','s-curve','straight'] as PipeShape[] },
                { label:'U-return',        shapes: ['straight','u-bend','straight'] as PipeShape[] },
                { label:'Full circuit',    shapes: ['straight','l-shaped','straight','l-shaped','straight','u-bend'] as PipeShape[] },
                { label:'Helix + exit',    shapes: ['straight','helix','straight'] as PipeShape[] },
              ].map(p => (
                <button key={p.label} onClick={() => setNetworkShapes(p.shapes)} disabled={isViewing}
                  style={{ padding:'7px 10px', borderRadius:8, border: isDark?'1px solid rgba(99,102,241,0.25)':'1px solid #e5e7eb', background: isDark?'rgba(99,102,241,0.08)':'#f5f3ff', color: isDark?'#a5b4fc':'#6d28d9', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:isViewing?'not-allowed':'pointer', textAlign:'left' as const }}>
                  {p.label} <span style={{ opacity:.5, fontWeight:400 }}>({p.shapes.length} seg)</span>
                </button>
              ))}
            </div>

            {/* Clear */}
            {networkShapes.length > 1 && (
              <button onClick={() => setNetworkShapes(['straight'])} disabled={isViewing}
                style={{ marginTop:8, width:'100%', padding:'6px', borderRadius:7, border: isDark?'1px solid rgba(248,113,113,0.3)':'1px solid #fecaca', background:'transparent', color:'#f87171', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer' }}>
                Reset to single pipe
              </button>
            )}
          </div>

          {/* Colour mode */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="🎨" title="Visualisation Mode" isDark={isDark}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {(['pressure','velocity','friction','material'] as const).map(m => (
                <button key={m} onClick={()=>setColorMode(m)}
                  style={{ padding:'9px 6px', borderRadius:'9px', border:`1px solid ${colorMode===m?(isDark?'rgba(100,160,255,0.6)':'#2463eb'):(isDark?'rgba(80,120,200,0.2)':'#e5e7eb')}`, background: colorMode===m?(isDark?'rgba(80,140,255,0.15)':'#dbeafe'):(isDark?'rgba(10,20,40,0.4)':'#f9fafb'), color: colorMode===m?(isDark?'#a0c4ff':'#1d4ed8'):(isDark?'rgba(160,180,220,0.6)':'#6b7280'), fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Particle Colors */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="✨" title="Particle Effects" isDark={isDark}/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div>
                <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(200,210,230,0.7)':'#374151', display:'block', marginBottom:'6px' }}>Color Scheme</span>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {(['rainbow','blue','fire','cyan','purple'] as const).map(scheme => (
                    <button key={scheme} onClick={()=>setParticleColorScheme(scheme)}
                      style={{ padding:'7px 6px', borderRadius:'8px', border:`1px solid ${particleColorScheme===scheme?(isDark?'rgba(100,160,255,0.6)':'#2463eb'):(isDark?'rgba(80,120,200,0.2)':'#e5e7eb')}`, background: particleColorScheme===scheme?(isDark?'rgba(80,140,255,0.15)':'#dbeafe'):(isDark?'rgba(10,20,40,0.4)':'#f9fafb'), color: particleColorScheme===scheme?(isDark?'#a0c4ff':'#1d4ed8'):(isDark?'rgba(160,180,220,0.6)':'#6b7280'), fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                      {scheme}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(200,210,230,0.7)':'#374151', display:'block', marginBottom:'6px' }}>Particle Size</span>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px' }}>
                  {(['small','medium','large'] as const).map(size => (
                    <button key={size} onClick={()=>setParticleSize(size)}
                      style={{ padding:'7px 6px', borderRadius:'8px', border:`1px solid ${particleSize===size?(isDark?'rgba(100,160,255,0.6)':'#2463eb'):(isDark?'rgba(80,120,200,0.2)':'#e5e7eb')}`, background: particleSize===size?(isDark?'rgba(80,140,255,0.15)':'#dbeafe'):(isDark?'rgba(10,20,40,0.4)':'#f9fafb'), color: particleSize===size?(isDark?'#a0c4ff':'#1d4ed8'):(isDark?'rgba(160,180,220,0.6)':'#6b7280'), fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pipe Geometry */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="⌀" title="Pipe Geometry" isDark={isDark}/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Field label="Length" value={pipeLengthM} unit="m" min={0.5} max={1000} step={0.5} onChange={v=>setPipeLengthM(Number(v))} description="Total pipe run" readOnly={isViewing} isDark={isDark}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <Field label="Inner Ø" value={pipeInnerDiameterM} unit="m" min={0.001} max={5} step={0.001} onChange={v=>setPipeInnerDiameterM(Number(v))} readOnly={isViewing} isDark={isDark}/>
                <Field label="Outer Ø" value={pipeOuterDiameterM} unit="m" min={0.002} max={5.5} step={0.001} onChange={v=>setPipeOuterDiameterM(Number(v))} readOnly={isViewing} isDark={isDark}/>
              </div>
              <Field label="Roughness ε" value={pipeAbsoluteRoughnessM} unit="m" min={0} max={0.01} step={0.000001} onChange={v=>setPipeAbsoluteRoughnessM(Number(v))} description="Absolute roughness" readOnly={isViewing} isDark={isDark}/>
              <div>
                <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(200,210,230,0.7)':'#374151', display:'block', marginBottom:'4px' }}>Material</span>
                <div style={{ position:'relative' }}>
                  <select value={pipeMaterial} onChange={e=>setPipeMaterial(e.target.value)} disabled={isViewing}
                    style={{ ...C.sel, background: isDark?'rgba(10,20,40,0.6)':'#ffffff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', color: isDark?'#e8f0ff':'#111827', ...(isViewing?{opacity:0.5,cursor:'not-allowed'}:{}) }}>
                    {Object.entries(MATERIALS).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}
                  </select>
                  <span style={C.arr}>▾</span>
                </div>
              </div>
            </div>
          </div>

          {/* Air + Flow */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="🌡" title="Air Properties" isDark={isDark}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <Field label="Temp" value={airTemperatureC} unit="°C" min={-40} max={200} step={1} onChange={v=>setAirTemperatureC(Number(v))} readOnly={isViewing} isDark={isDark}/>
              <Field label="Pressure" value={airPressurePa} unit="Pa" min={50000} max={500000} step={100} onChange={v=>setAirPressurePa(Number(v))} readOnly={isViewing} isDark={isDark}/>
            </div>
            <div style={{ marginTop:'8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
              <div style={{ ...C.pill, background: isDark?'rgba(0,10,30,0.5)':'#f3f4f6', border: isDark?'1px solid rgba(80,120,200,0.12)':'1px solid #e5e7eb' }}><span style={{ ...C.pillL, color: isDark?'rgba(140,170,220,0.4)':'#6b7280' }}>Density</span><span style={{ ...C.pillV, color: isDark?'rgba(180,210,255,0.7)':'#111827' }}>{computed.density.toFixed(4)}<small> kg/m³</small></span></div>
              <div style={{ ...C.pill, background: isDark?'rgba(0,10,30,0.5)':'#f3f4f6', border: isDark?'1px solid rgba(80,120,200,0.12)':'1px solid #e5e7eb' }}><span style={{ ...C.pillL, color: isDark?'rgba(140,170,220,0.4)':'#6b7280' }}>Viscosity</span><span style={{ ...C.pillV, color: isDark?'rgba(180,210,255,0.7)':'#111827' }}>{(computed.viscosity*1e5).toFixed(3)}<small> ×10⁻⁵</small></span></div>
            </div>
          </div>

          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="💨" title="Flow Conditions" isDark={isDark}/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Field label="Flow Rate Q" value={volumetricFlowRateM3S} unit="m³/s" min={0.0001} max={100} step={0.001} onChange={v=>setVolumetricFlowRateM3S(Number(v))} readOnly={isViewing} isDark={isDark}/>
              <Field label="Minor Loss K" value={minorLossKTotal} unit="—" min={0} max={10} step={0.1} onChange={v=>setMinorLossKTotal(Number(v))} readOnly={isViewing||!includeMinorLosses} isDark={isDark}/>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" id="incl" checked={includeMinorLosses} disabled={isViewing} onChange={e=>setIncludeMinorLosses(e.target.checked)} style={{ accentColor:'#667eea', width:'14px', height:'14px' }}/>
                <label htmlFor="incl" style={{ fontSize:'10px', fontFamily:'"IBM Plex Mono"', color: isDark?'rgba(200,210,230,0.6)':'#374151' }}>Include minor losses</label>
              </div>
              <div>
                <span style={{ fontSize:'10px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(200,210,230,0.7)':'#374151', display:'block', marginBottom:'4px' }}>Velocity Profile</span>
                <div style={{ position:'relative' }}>
                  <select value={velocityProfileMode} onChange={e=>setVelocityProfileMode(e.target.value as any)} disabled={isViewing}
                    style={{ ...C.sel, background: isDark?'rgba(10,20,40,0.6)':'#ffffff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', color: isDark?'#e8f0ff':'#111827', ...(isViewing?{opacity:0.5}:{}) }}>
                    <option value="auto_by_re">Auto (by Reynolds)</option>
                    <option value="laminar">Laminar (parabolic)</option>
                    <option value="turbulent">Turbulent (1/7 power)</option>
                  </select>
                  <span style={C.arr}>▾</span>
                </div>
              </div>
              <Field label="Cross-Section Samples" value={crossSectionSamples} min={10} max={120} step={1} onChange={v=>setCrossSectionSamples(Math.round(Number(v)))} readOnly={isViewing} isDark={isDark}/>
            </div>
          </div>

        </div>{/* end LEFT */}

        {/* ──── CENTRE: 3D viewport ──── */}
        <div style={{ ...C.viewport, background: isDark ? '#040a18' : '#dde6f0' }} className="sim-viewport">
          <ThreePipeScene {...sceneProps}/>
        </div>

        {/* ──── RIGHT: metrics ──── */}
        <div style={{ ...C.right, ...(isDark ? {} : LT.right) }} className="sim-right">
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <SecHdr icon="⚡" title="Live Metrics" isDark={isDark}/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Metric label="Avg Velocity" value={computed.velocity.toFixed(3)} unit="m/s" hi="#4fbbf7" isDark={isDark}/>
              <Metric label="Reynolds No."
                value={computed.reynolds < 1000 ? computed.reynolds.toFixed(1) : (computed.reynolds/1000).toFixed(2)+'k'}
                hi={reColor} isDark={isDark}/>
              <Metric label="Flow Regime"
                value={computed.flowRegime.charAt(0).toUpperCase()+computed.flowRegime.slice(1)}
                unit={computed.selectedProfile==='laminar'?'Parabolic profile':'1/7 Power Law'}
                hi={reColor} isDark={isDark}/>
              <Metric label="Friction Factor f" value={computed.frictionFactor.toFixed(5)} unit="Darcy–Weisbach" isDark={isDark}/>
              <Metric label="Total Δp" value={(computed.pressureDrop/1000).toFixed(4)} unit="kPa" hi="#f7614f" isDark={isDark}/>
              <Metric label="Friction Δp" value={(computed.frictionDrop/1000).toFixed(4)} unit="kPa" isDark={isDark}/>
              <Metric label="Minor Loss Δp" value={(computed.minorDrop/1000).toFixed(4)} unit="kPa" isDark={isDark}/>
              <Metric label="Mass Flow ṁ" value={computed.massFlow.toFixed(4)} unit="kg/s" isDark={isDark}/>
              <Metric label="Wall Shear τ" value={computed.wallShear.toFixed(4)} unit="Pa" isDark={isDark}/>
            </div>
          </div>

          {backendResult?.results && (
            <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
              <SecHdr icon="🖥" title="Backend Output" isDark={isDark}/>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {typeof backendResult.results.mean !== 'undefined' && <Metric label="Mean" value={Number(backendResult.results.mean).toFixed(4)} isDark={isDark}/>}
                {typeof backendResult.results.median !== 'undefined' && <Metric label="Median" value={Number(backendResult.results.median).toFixed(4)} isDark={isDark}/>}
              </div>
            </div>
          )}

          {/* ── Multi-pipe connector ── */}
          <div style={{ ...C.card, ...(isDark ? {} : LT.card) }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <div style={{ width:'26px', height:'26px', background: isDark?'rgba(99,102,241,0.2)':'rgba(99,102,241,0.1)', border: isDark?'1px solid rgba(99,102,241,0.3)':'1px solid #e5e7eb', borderRadius:'7px', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px' }}>🔗</div>
                <span style={{ fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', letterSpacing:'0.12em', textTransform:'uppercase', color: isDark?'rgba(160,200,255,0.7)':'#374151' }}>Pipe Network</span>
              </div>
              <button onClick={() => setShowSegments(v => !v)}
                style={{ background:'none', border:'none', color: isDark?'rgba(160,200,255,0.5)':'#6b7280', cursor:'pointer', fontSize:'14px', padding:'2px 6px' }}>
                {showSegments ? '▲' : '▼'}
              </button>
            </div>

            {showSegments && (
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                <p style={{ fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', margin:0 }}>
                  Add pipe segments in series. Import from JSON/CSV or add manually.
                </p>

                <button onClick={addSegment}
                  style={{ padding:'7px', background: isDark?'rgba(99,102,241,0.15)':'#ede9fe', border: isDark?'1px solid rgba(99,102,241,0.3)':'1px solid #c4b5fd', borderRadius:'8px', color: isDark?'#a5b4fc':'#6d28d9', fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer' }}>
                  + Add Segment
                </button>

                {segments.length === 0 && (
                  <div style={{ textAlign:'center', padding:'12px', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.4)':'#9ca3af' }}>
                    No segments yet. Add one or import a file.
                  </div>
                )}

                {segments.map((seg, idx) => (
                  <div key={seg.id} style={{ background: isDark?'rgba(4,12,30,0.6)':'#f9fafb', border: isDark?'1px solid rgba(80,120,200,0.15)':'1px solid #e5e7eb', borderRadius:'8px', padding:'8px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'6px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                        <span style={{ fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(99,162,255,0.7)':'#6366f1', fontWeight:'700' }}>#{idx+1}</span>
                        <input value={seg.name} onChange={e => updateSegment(seg.id, 'name', e.target.value)}
                          style={{ background:'transparent', border:'none', borderBottom: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', color: isDark?'#e8f0ff':'#111827', fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'600', outline:'none', width:'80px', padding:'1px 0' }} />
                      </div>
                      <button onClick={() => removeSegment(seg.id)}
                        style={{ background:'none', border:'none', color:'#f87171', cursor:'pointer', fontSize:'13px', padding:'0 2px' }}>✕</button>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'5px' }}>
                      <div>
                        <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', marginBottom:'2px' }}>SHAPE</div>
                        <select value={seg.shape} onChange={e => updateSegment(seg.id, 'shape', e.target.value)}
                          style={{ width:'100%', padding:'4px 6px', background: isDark?'rgba(10,20,40,0.6)':'#fff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', borderRadius:'5px', color: isDark?'#e8f0ff':'#111827', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace' }}>
                          {Object.entries(PIPE_SHAPES).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', marginBottom:'2px' }}>MATERIAL</div>
                        <select value={seg.material} onChange={e => updateSegment(seg.id, 'material', e.target.value)}
                          style={{ width:'100%', padding:'4px 6px', background: isDark?'rgba(10,20,40,0.6)':'#fff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', borderRadius:'5px', color: isDark?'#e8f0ff':'#111827', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace' }}>
                          {Object.keys(MATERIALS).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', marginBottom:'2px' }}>LENGTH (m)</div>
                        <input type="number" value={seg.length} min={0.1} step={0.5}
                          onChange={e => updateSegment(seg.id, 'length', Number(e.target.value))}
                          style={{ width:'100%', padding:'4px 6px', background: isDark?'rgba(10,20,40,0.6)':'#fff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', borderRadius:'5px', color: isDark?'#e8f0ff':'#111827', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace' }} />
                      </div>
                      <div>
                        <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', color: isDark?'rgba(150,170,210,0.5)':'#9ca3af', marginBottom:'2px' }}>INNER Ø (m)</div>
                        <input type="number" value={seg.innerD} min={0.001} step={0.01}
                          onChange={e => updateSegment(seg.id, 'innerD', Number(e.target.value))}
                          style={{ width:'100%', padding:'4px 6px', background: isDark?'rgba(10,20,40,0.6)':'#fff', border: isDark?'1px solid rgba(80,120,200,0.2)':'1px solid #d1d5db', borderRadius:'5px', color: isDark?'#e8f0ff':'#111827', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace' }} />
                      </div>
                    </div>
                    {/* Per-segment result */}
                    {(() => {
                      const rho = computeAirDensity(airTemperatureC, airPressurePa);
                      const mu  = computeDynamicViscosity(airTemperatureC);
                      const area = Math.PI * (seg.innerD / 2) ** 2;
                      const v = area > 0 ? seg.flowRate / area : 0;
                      const Re = computeRe(rho, v, seg.innerD, mu);
                      const f  = computeFF(Re, MATERIALS[seg.material]?.roughness ?? 0.000045, seg.innerD);
                      const dp = computeDP(f, seg.length, seg.innerD, rho, v);
                      const regime = getRegime(Re);
                      const rc = regime === 'laminar' ? '#4fbbf7' : regime === 'transition' ? '#f7c14f' : '#f7614f';
                      return (
                        <div style={{ marginTop:'6px', display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'4px' }}>
                          <div style={{ background: isDark?'rgba(0,8,24,0.5)':'#f3f4f6', borderRadius:'5px', padding:'4px 6px', fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace' }}>
                            <div style={{ color: isDark?'rgba(150,170,210,0.4)':'#9ca3af' }}>v</div>
                            <div style={{ color: isDark?'#e8f0ff':'#111', fontWeight:'700' }}>{v.toFixed(2)} m/s</div>
                          </div>
                          <div style={{ background: isDark?'rgba(0,8,24,0.5)':'#f3f4f6', borderRadius:'5px', padding:'4px 6px', fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace' }}>
                            <div style={{ color: isDark?'rgba(150,170,210,0.4)':'#9ca3af' }}>Δp</div>
                            <div style={{ color:'#f7614f', fontWeight:'700' }}>{(dp/1000).toFixed(3)} kPa</div>
                          </div>
                          <div style={{ background: isDark?'rgba(0,8,24,0.5)':'#f3f4f6', borderRadius:'5px', padding:'4px 6px', fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace' }}>
                            <div style={{ color: isDark?'rgba(150,170,210,0.4)':'#9ca3af' }}>Re</div>
                            <div style={{ color: rc, fontWeight:'700' }}>{Re > 1000 ? (Re/1000).toFixed(1)+'k' : Re.toFixed(0)}</div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ))}

                {segments.length > 0 && (
                  <div style={{ background: isDark?'rgba(247,97,79,0.1)':'#fef2f2', border: isDark?'1px solid rgba(247,97,79,0.3)':'1px solid #fecaca', borderRadius:'8px', padding:'10px' }}>
                    <div style={{ fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', textTransform:'uppercase', letterSpacing:'.08em', color: isDark?'rgba(247,97,79,0.8)':'#dc2626', marginBottom:'4px' }}>
                      Total Network Δp ({segments.length} segments in series)
                    </div>
                    <div style={{ fontSize:'20px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', color:'#f7614f' }}>
                      {(totalSegmentDrop/1000).toFixed(4)} <span style={{ fontSize:'12px', color: isDark?'rgba(247,97,79,0.6)':'#ef4444' }}>kPa</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>{/* end RIGHT */}

      </div>{/* end body */}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const C: Record<string, React.CSSProperties> = {
  page:     { minHeight:'100vh', height:'100vh', overflow:'hidden', background:'#020c1e', color:'#e8f0ff', fontFamily:'"IBM Plex Mono",monospace', position:'relative', display:'flex', flexDirection:'column' },
  bg:       { position:'fixed', inset:0, background:'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(30,80,180,0.25) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 80% 80%,rgba(80,20,160,0.15) 0%,transparent 60%)', pointerEvents:'none', zIndex:0 },
  gridBg:   { position:'fixed', inset:0, backgroundImage:'linear-gradient(rgba(80,120,200,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(80,120,200,0.04) 1px,transparent 1px)', backgroundSize:'40px 40px', pointerEvents:'none', zIndex:0 },
  nav:      { position:'relative', zIndex:10, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 24px', borderBottom:'1px solid rgba(80,120,200,0.15)', background:'rgba(2,12,30,0.85)', backdropFilter:'blur(12px)', flexShrink:0 },
  backBtn:  { background:'rgba(80,120,200,0.1)', border:'1px solid rgba(80,120,200,0.2)', borderRadius:'8px', color:'rgba(160,200,255,0.7)', fontSize:'12px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'600', padding:'7px 12px', cursor:'pointer' },
  divider:  { width:'1px', height:'28px', background:'rgba(80,120,200,0.2)' },
  navTitle: { fontSize:'14px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:'700', color:'#e8f0ff' },
  navSub:   { fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', color:'rgba(140,170,220,0.4)', marginTop:'1px' },
  regimeBadge: { display:'flex', alignItems:'center', gap:'8px', padding:'5px 12px', borderRadius:'999px', border:'1px solid', fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', background:'rgba(2,12,30,0.6)', letterSpacing:'0.05em' },
  saveBtn:  { padding:'8px 18px', background:'linear-gradient(135deg,rgba(80,140,255,0.25),rgba(120,80,220,0.25))', border:'1px solid rgba(100,160,255,0.4)', borderRadius:'9px', color:'#a0c4ff', fontSize:'12px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.3s' },
  nameBar:  { position:'relative', zIndex:10, padding:'9px 24px', borderBottom:'1px solid rgba(80,120,200,0.08)', background:'rgba(2,12,30,0.5)', display:'flex', alignItems:'center', flexShrink:0 },
  nameInput:{ background:'transparent', border:'none', borderBottom:'1px solid rgba(80,120,200,0.2)', color:'rgba(200,220,255,0.8)', fontSize:'13px', fontFamily:'"Space Grotesk",sans-serif', fontWeight:'600', padding:'3px 0', outline:'none', width:'320px' },
  errBanner:{ position:'relative', zIndex:10, padding:'9px 24px', background:'rgba(200,50,50,0.15)', borderBottom:'1px solid rgba(200,80,80,0.3)', color:'#fca5a5', fontSize:'12px', fontFamily:'"IBM Plex Mono",monospace', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 },
  errClose: { background:'transparent', border:'none', color:'#fca5a5', cursor:'pointer', fontSize:'14px', padding:'0 4px' },
  body:     { position:'relative', zIndex:10, display:'grid', gridTemplateColumns:'240px 1fr 220px', gap:'0', flex:1, minHeight:0, overflow:'hidden' },
  left:     { borderRight:'1px solid rgba(80,120,200,0.12)', overflowY:'auto', overflowX:'hidden', padding:'10px', display:'flex', flexDirection:'column', gap:'8px', background:'rgba(2,10,25,0.5)', scrollbarWidth:'thin', scrollbarColor:'rgba(80,120,200,0.3) transparent' } as React.CSSProperties,
  viewport: { position:'relative', overflow:'hidden', flex:1, minWidth:0, height:'100%', background:'#040a18' },
  controlsHint: { position:'absolute', bottom:'12px', left:'12px', background:'rgba(8,20,50,0.9)', border:'1px solid rgba(102,126,234,0.3)', borderRadius:'8px', padding:'8px 12px', backdropFilter:'blur(8px)', color:'#e8f0ff', fontSize:'10px', lineHeight:'1.5', zIndex:10, boxShadow:'0 4px 12px rgba(0,0,0,0.3)' } as React.CSSProperties,
  right:    { borderLeft:'1px solid rgba(80,120,200,0.12)', overflowY:'auto', overflowX:'hidden', padding:'10px', display:'flex', flexDirection:'column', gap:'8px', background:'rgba(2,10,25,0.5)', scrollbarWidth:'thin', scrollbarColor:'rgba(80,120,200,0.3) transparent' } as React.CSSProperties,
  card:     { background:'rgba(8,20,50,0.65)', border:'1px solid rgba(80,120,200,0.14)', borderRadius:'10px', padding:'10px', backdropFilter:'blur(8px)' },
  sel:      { width:'100%', padding:'7px 28px 7px 10px', background:'rgba(10,20,40,0.6)', border:'1px solid rgba(80,120,200,0.2)', borderRadius:'8px', color:'#e8f0ff', fontSize:'12px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'600', cursor:'pointer' } as React.CSSProperties,
  arr:      { position:'absolute', right:'10px', top:'50%', transform:'translateY(-50%)', color:'rgba(150,180,230,0.4)', fontSize:'12px', pointerEvents:'none' } as React.CSSProperties,
  pill:     { background:'rgba(0,10,30,0.5)', border:'1px solid rgba(80,120,200,0.12)', borderRadius:'7px', padding:'7px 10px', display:'flex', flexDirection:'column', gap:'2px' } as React.CSSProperties,
  pillL:    { fontSize:'9px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(140,170,220,0.4)' },
  pillV:    { fontSize:'12px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'600', color:'rgba(180,210,255,0.7)' },
};

// ─── Light theme overrides ────────────────────────────────────────────────────
const LT: Record<string, React.CSSProperties> = {
  page:     { background:'#f1f5f9', color:'#111827' },
  nav:      { background:'rgba(255,255,255,0.95)', borderBottom:'1px solid #e5e7eb' },
  backBtn:  { background:'#f3f4f6', border:'1px solid #d1d5db', color:'#374151' },
  navTitle: { color:'#111827' },
  nameBar:  { background:'#ffffff', borderBottom:'1px solid #e5e7eb' },
  nameInput:{ color:'#111827', borderBottom:'1px solid #d1d5db' },
  body:     { background:'#f1f5f9' },
  left:     { background:'#ffffff', borderRight:'1px solid #e5e7eb' } as React.CSSProperties,
  right:    { background:'#ffffff', borderLeft:'1px solid #e5e7eb' } as React.CSSProperties,
  card:     { background:'#f9fafb', border:'1px solid #e5e7eb', backdropFilter:'none' },
};