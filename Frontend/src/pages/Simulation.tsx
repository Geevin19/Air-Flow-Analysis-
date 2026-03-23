import { useState, useEffect, useRef, useMemo, } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { simulationAPI } from '../services/api';

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
  pipeRadius: number;       // inner radius in metres (scaled for display)
  pipeLength: number;       // pipe length in metres
  material: string;
  velocity: number;
  pressureDrop: number;
  reynolds: number;
  flowRegime: string;
  colorMode: 'pressure' | 'friction' | 'velocity' | 'material';
  particleColorScheme: 'rainbow' | 'blue' | 'fire' | 'cyan' | 'purple';
  particleSize: 'small' | 'medium' | 'large';
  theme: 'dark' | 'light';
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
    scene.background = new THREE.Color(props.theme === 'dark' ? 0x040a18 : 0xf0f4f8);

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
    const ambient = new THREE.AmbientLight(0x445566, props.theme === 'dark' ? 1.2 : 2.0);
    scene.add(ambient);

    const mainLight = new THREE.DirectionalLight(0xffffff, props.theme === 'dark' ? 1.5 : 2.5);
    mainLight.position.set(8, 10, 8);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x6688ff, props.theme === 'dark' ? 0.8 : 1.2);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff8844, props.theme === 'dark' ? 0.5 : 0.8);
    rimLight.position.set(0, -3, 5);
    scene.add(rimLight);

    /* ── Build pipe path ── */
    const { pipeShape, pipeRadius, pipeLength, material, colorMode, particleColorScheme, particleSize } = props;
    const displayR = Math.max(0.08, Math.min(0.25, pipeRadius * 1.5)); // Smaller pipe
    const mat = MATERIALS[material] || MATERIALS['Steel'];

    // Generate path points - SCALED DOWN and CENTERED
    // Use pipeLength to scale the path
    let pathPoints: any[] = [];
    const lengthScale = Math.max(0.2, Math.min(1.5, pipeLength / 20)); // Scale based on length (10m = 0.5x, 20m = 1x, 40m = 2x)
    const scale = 0.35 * lengthScale; // Adjust scale based on length
    
    switch (pipeShape) {
      case 'straight':
        pathPoints = [
          new THREE.Vector3(-2.5*scale, 0, 0),
          new THREE.Vector3(-1.2*scale, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(1.2*scale, 0, 0),
          new THREE.Vector3(2.5*scale, 0, 0),
        ];
        break;
      case 'l-shaped':
        pathPoints = [
          new THREE.Vector3(-1.5*scale, -0.3*scale, 0),
          new THREE.Vector3(-0.8*scale, -0.3*scale, 0),
          new THREE.Vector3(0, -0.3*scale, 0),
          new THREE.Vector3(0, 0.2*scale, 0),
          new THREE.Vector3(0, 0.8*scale, 0),
          new THREE.Vector3(0, 1.2*scale, 0),
        ];
        break;
      case 's-curve':
        pathPoints = [
          new THREE.Vector3(-2*scale, 0, 0),
          new THREE.Vector3(-1.2*scale, 0, 0),
          new THREE.Vector3(-0.4*scale, 0, 0.6*scale),
          new THREE.Vector3(0.4*scale, 0, -0.6*scale),
          new THREE.Vector3(1.2*scale, 0, 0),
          new THREE.Vector3(2*scale, 0, 0),
        ];
        break;
      case 'u-bend':
        // Centered U-bend
        pathPoints = [
          new THREE.Vector3(-1.5*scale, 0.2*scale, 0),
          new THREE.Vector3(-1*scale, 0.2*scale, 0),
          new THREE.Vector3(-0.6*scale, 0.2*scale, 0),
          new THREE.Vector3(-0.3*scale, 0, 0),
          new THREE.Vector3(0, -0.15*scale, 0),
          new THREE.Vector3(0.3*scale, 0, 0),
          new THREE.Vector3(0.6*scale, 0.2*scale, 0),
          new THREE.Vector3(1*scale, 0.2*scale, 0),
          new THREE.Vector3(1.5*scale, 0.2*scale, 0),
        ];
        break;
      case 'helix':
        for (let i = 0; i <= 20; i++) {
          const a = (i / 20) * Math.PI * 3;
          pathPoints.push(new THREE.Vector3(
            Math.cos(a) * 1*scale, 
            i * 0.1*scale - 1*scale, 
            Math.sin(a) * 1*scale
          ));
        }
        break;
    }

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
  }, [threeReady, props.pipeShape, props.pipeRadius, props.pipeLength, props.material,
      props.velocity, props.pressureDrop, props.reynolds,
      props.flowRegime, props.colorMode, props.particleColorScheme, props.particleSize, props.theme]);

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

function Field({ label, value, unit, onChange, min, max, step, description, readOnly }: {
  label: string; value: number | string; unit?: string; onChange: (v: string) => void;
  min?: number; max?: number; step?: number; description?: string; readOnly?: boolean;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={fld.label}>{label}</span>
        {unit && <span style={fld.unit}>{unit}</span>}
      </div>
      {description && <div style={fld.desc}>{description}</div>}
      <input type="number" value={value} min={min} max={max} step={step}
        onChange={e => onChange(e.target.value)} readOnly={readOnly} disabled={readOnly}
        style={{ ...fld.input, ...(readOnly ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }} />
    </div>
  );
}

const fld: Record<string, React.CSSProperties> = {
  label: { fontSize: '10px', fontWeight: '700', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(200,210,230,0.7)', fontFamily: '"IBM Plex Mono",monospace' },
  unit:  { fontSize: '9px', color: 'rgba(150,180,220,0.5)', fontFamily: '"IBM Plex Mono",monospace', background: 'rgba(100,140,200,0.12)', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(100,140,200,0.2)' },
  desc:  { fontSize: '9px', color: 'rgba(150,170,200,0.45)', fontFamily: '"IBM Plex Mono",monospace', marginBottom: '2px' },
  input: { width: '100%', padding: '7px 10px', background: 'rgba(10,20,40,0.6)', border: '1px solid rgba(80,120,200,0.2)', borderRadius: '8px', color: '#e8f0ff', fontSize: '13px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '600', outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box' },
};

function Metric({ label, value, unit, hi }: { label: string; value: string; unit?: string; hi?: string }) {
  return (
    <div style={{ background: 'rgba(8,18,40,0.7)', border: `1px solid ${hi ? hi + '40' : 'rgba(80,120,200,0.15)'}`, borderRadius: '8px', padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: '2px', backdropFilter: 'blur(8px)' }}>
      <div style={{ fontSize: '9px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '700', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(170,190,230,0.5)' }}>{label}</div>
      <div style={{ fontSize: '16px', fontFamily: '"Space Grotesk","IBM Plex Mono",sans-serif', fontWeight: '700', color: hi || '#e8f0ff', lineHeight: 1.1 }}>{value}</div>
      {unit && <div style={{ fontSize: '10px', fontFamily: '"IBM Plex Mono",monospace', color: 'rgba(150,180,230,0.4)' }}>{unit}</div>}
    </div>
  );
}

function SecHdr({ icon, title }: { icon: string; title: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
      <div style={{ width: '26px', height: '26px', background: 'linear-gradient(135deg,rgba(80,140,255,0.2),rgba(120,80,220,0.2))', border: '1px solid rgba(100,160,255,0.25)', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px' }}>{icon}</div>
      <span style={{ fontSize: '10px', fontFamily: '"IBM Plex Mono",monospace', fontWeight: '700', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(160,200,255,0.7)' }}>{title}</span>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Simulation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const simulationId = searchParams.get('id');

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
  const [colorMode,   setColorMode]   = useState<'pressure'|'friction'|'velocity'|'material'>('material');
  const [particleColorScheme, setParticleColorScheme] = useState<'rainbow'|'blue'|'fire'|'cyan'|'purple'>('purple');
  const [particleSize, setParticleSize] = useState<'small'|'medium'|'large'>('small');
  
  // ── theme state ──
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('simulation-theme');
    return (saved === 'light' || saved === 'dark') ? saved : 'dark';
  });

  useEffect(() => {
    localStorage.setItem('simulation-theme', theme);
  }, [theme]);

  // ── app state ──
  const [submitting,      setSubmitting]      = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saved,           setSaved]           = useState(false);
  const [error,           setError]           = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [backendResult,   setBackendResult]   = useState<any>(null);

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
    pipeShape, pipeRadius: pipeInnerDiameterM / 2, pipeLength: pipeLengthM,
    material: pipeMaterial, velocity: computed.velocity,
    pressureDrop: computed.pressureDrop, reynolds: computed.reynolds,
    flowRegime: computed.flowRegime, colorMode, particleColorScheme, particleSize,
    theme,
  };

  return (
    <div style={{ 
      ...C.page, 
      background: theme === 'dark' ? '#020c1e' : '#f5f7fa',
      color: theme === 'dark' ? '#e8f0ff' : '#1a2332'
    }}>
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
      `}</style>
      <div style={{
        ...C.bg,
        background: theme === 'dark' 
          ? 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(30,80,180,0.25) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 80% 80%,rgba(80,20,160,0.15) 0%,transparent 60%)'
          : 'radial-gradient(ellipse 80% 60% at 50% -10%,rgba(100,150,255,0.15) 0%,transparent 70%),radial-gradient(ellipse 50% 40% at 80% 80%,rgba(150,100,255,0.1) 0%,transparent 60%)'
      }}/>
      <div style={{
        ...C.gridBg,
        backgroundImage: theme === 'dark'
          ? 'linear-gradient(rgba(80,120,200,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(80,120,200,0.04) 1px,transparent 1px)'
          : 'linear-gradient(rgba(100,120,150,0.06) 1px,transparent 1px),linear-gradient(90deg,rgba(100,120,150,0.06) 1px,transparent 1px)'
      }}/>

      {/* ── Nav ── */}
      <nav style={C.nav}>
        <div style={{ display:'flex', alignItems:'center', gap:'16px' }}>
          <button onClick={() => navigate('/dashboard')} style={C.backBtn}>← Dashboard</button>
          <div style={C.divider}/>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <span style={C.navTitle}>Cylindrical Air Flow Simulator {isViewing && <span style={{ fontSize:'11px', color:'#a0c4ff', opacity:0.7 }}>(Viewing)</span>}</span>
            <span style={C.navSub}>{isViewing ? 'Read-only · existing simulation' : '3D live simulation · drag to orbit · inputs update instantly'}</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          {loadingExisting && <span style={{ fontSize:'11px', fontFamily:'"IBM Plex Mono"', color:'rgba(160,200,255,0.5)', animation:'pulse 1.5s infinite' }}>Loading…</span>}
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            style={{ 
              background: 'rgba(80,120,200,0.1)', 
              border: '1px solid rgba(80,120,200,0.2)', 
              borderRadius: '8px', 
              color: 'rgba(160,200,255,0.7)', 
              fontSize: '16px', 
              padding: '7px 12px', 
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <div style={{ ...C.regimeBadge, borderColor: reColor+'60', color: reColor }}>
            <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:reColor, animation:'pulse 2s infinite' }}/>
            {computed.flowRegime.charAt(0).toUpperCase()+computed.flowRegime.slice(1)}
          </div>
          {!isViewing && (
            <button onClick={handleSave} disabled={saving||submitting} style={{ ...C.saveBtn, ...(saved?{background:'rgba(50,200,100,0.2)',borderColor:'rgba(50,200,100,0.5)',color:'#50c878'}:{}), ...(saving?{opacity:0.7}:{}) }}>
              {saving ? '⏳ Saving…' : saved ? '✓ Saved!' : '⊕ Save'}
            </button>
          )}
        </div>
      </nav>

      {/* ── Name bar ── */}
      <div style={C.nameBar}>
        <input value={name} onChange={e=>setName(e.target.value)}
          placeholder={isViewing?'Simulation name':'Name this simulation…'}
          readOnly={isViewing} disabled={isViewing}
          style={{ ...C.nameInput, ...(isViewing?{opacity:0.6,cursor:'default'}:{}) }}/>
        {isViewing && <span style={{ fontSize:'11px', fontFamily:'"IBM Plex Mono"', color:'rgba(160,200,255,0.35)', marginLeft:'14px' }}>Go to Dashboard → New Simulation to create a new one</span>}
      </div>

      {error && (
        <div style={C.errBanner}>⚠ {error}<button onClick={()=>setError(null)} style={C.errClose}>✕</button></div>
      )}

      {/* ── Main layout: left sidebar + 3D viewport + right metrics ── */}
      <div style={C.body}>

        {/* ──── LEFT: inputs ──── */}
        <div style={C.left}>

          {/* Pipe Shape selector */}
          <div style={C.card}>
            <SecHdr icon="🔷" title="Pipe Shape"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {(Object.entries(PIPE_SHAPES) as [PipeShape, typeof PIPE_SHAPES[PipeShape]][]).map(([key, sh]) => (
                <button key={key} onClick={()=>setPipeShape(key)} disabled={isViewing}
                  style={{ padding:'10px 8px', borderRadius:'10px', border:`1px solid ${pipeShape===key?'rgba(100,160,255,0.6)':'rgba(80,120,200,0.2)'}`, background: pipeShape===key?'rgba(80,140,255,0.15)':'rgba(10,20,40,0.4)', color: pipeShape===key?'#a0c4ff':'rgba(160,180,220,0.6)', fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:isViewing?'not-allowed':'pointer', transition:'all 0.2s', display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' }}>
                  <span style={{ fontSize:'18px' }}>{sh.icon}</span>
                  <span>{sh.label}</span>
                  <span style={{ fontSize:'9px', opacity:0.6 }}>{sh.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Colour mode */}
          <div style={C.card}>
            <SecHdr icon="🎨" title="Visualisation Mode"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              {(['pressure','velocity','friction','material'] as const).map(m => (
                <button key={m} onClick={()=>setColorMode(m)}
                  style={{ padding:'9px 6px', borderRadius:'9px', border:`1px solid ${colorMode===m?'rgba(100,160,255,0.6)':'rgba(80,120,200,0.2)'}`, background: colorMode===m?'rgba(80,140,255,0.15)':'rgba(10,20,40,0.4)', color: colorMode===m?'#a0c4ff':'rgba(160,180,220,0.6)', fontSize:'11px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Particle Colors */}
          <div style={C.card}>
            <SecHdr icon="✨" title="Particle Effects"/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <div>
                <span style={{ ...fld.label, display:'block', marginBottom:'6px' }}>Color Scheme</span>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                  {(['rainbow','blue','fire','cyan','purple'] as const).map(scheme => (
                    <button key={scheme} onClick={()=>setParticleColorScheme(scheme)}
                      style={{ padding:'7px 6px', borderRadius:'8px', border:`1px solid ${particleColorScheme===scheme?'rgba(100,160,255,0.6)':'rgba(80,120,200,0.2)'}`, background: particleColorScheme===scheme?'rgba(80,140,255,0.15)':'rgba(10,20,40,0.4)', color: particleColorScheme===scheme?'#a0c4ff':'rgba(160,180,220,0.6)', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                      {scheme}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span style={{ ...fld.label, display:'block', marginBottom:'6px' }}>Particle Size</span>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'6px' }}>
                  {(['small','medium','large'] as const).map(size => (
                    <button key={size} onClick={()=>setParticleSize(size)}
                      style={{ padding:'7px 6px', borderRadius:'8px', border:`1px solid ${particleSize===size?'rgba(100,160,255,0.6)':'rgba(80,120,200,0.2)'}`, background: particleSize===size?'rgba(80,140,255,0.15)':'rgba(10,20,40,0.4)', color: particleSize===size?'#a0c4ff':'rgba(160,180,220,0.6)', fontSize:'10px', fontFamily:'"IBM Plex Mono",monospace', fontWeight:'700', cursor:'pointer', transition:'all 0.2s', textTransform:'capitalize' }}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pipe Geometry */}
          <div style={C.card}>
            <SecHdr icon="⌀" title="Pipe Geometry"/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Field label="Length" value={pipeLengthM} unit="m" min={0.5} max={1000} step={0.5} onChange={v=>setPipeLengthM(Number(v))} description="Total pipe run" readOnly={isViewing}/>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <Field label="Inner Ø" value={pipeInnerDiameterM} unit="m" min={0.001} max={5} step={0.001} onChange={v=>setPipeInnerDiameterM(Number(v))} readOnly={isViewing}/>
                <Field label="Outer Ø" value={pipeOuterDiameterM} unit="m" min={0.002} max={5.5} step={0.001} onChange={v=>setPipeOuterDiameterM(Number(v))} readOnly={isViewing}/>
              </div>
              <Field label="Roughness ε" value={pipeAbsoluteRoughnessM} unit="m" min={0} max={0.01} step={0.000001} onChange={v=>setPipeAbsoluteRoughnessM(Number(v))} description="Absolute roughness" readOnly={isViewing}/>
              <div>
                <span style={{ ...fld.label, display:'block', marginBottom:'4px' }}>Material</span>
                <div style={{ position:'relative' }}>
                  <select value={pipeMaterial} onChange={e=>setPipeMaterial(e.target.value)} disabled={isViewing}
                    style={{ ...C.sel, ...(isViewing?{opacity:0.5,cursor:'not-allowed'}:{}) }}>
                    {Object.entries(MATERIALS).map(([k,m])=><option key={k} value={k}>{m.label}</option>)}
                  </select>
                  <span style={C.arr}>▾</span>
                </div>
              </div>
            </div>
          </div>

          {/* Air + Flow */}
          <div style={C.card}>
            <SecHdr icon="🌡" title="Air Properties"/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
              <Field label="Temp" value={airTemperatureC} unit="°C" min={-40} max={200} step={1} onChange={v=>setAirTemperatureC(Number(v))} readOnly={isViewing}/>
              <Field label="Pressure" value={airPressurePa} unit="Pa" min={50000} max={500000} step={100} onChange={v=>setAirPressurePa(Number(v))} readOnly={isViewing}/>
            </div>
            <div style={{ marginTop:'8px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
              <div style={C.pill}><span style={C.pillL}>Density</span><span style={C.pillV}>{computed.density.toFixed(4)}<small> kg/m³</small></span></div>
              <div style={C.pill}><span style={C.pillL}>Viscosity</span><span style={C.pillV}>{(computed.viscosity*1e5).toFixed(3)}<small> ×10⁻⁵</small></span></div>
            </div>
          </div>

          <div style={C.card}>
            <SecHdr icon="💨" title="Flow Conditions"/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Field label="Flow Rate Q" value={volumetricFlowRateM3S} unit="m³/s" min={0.0001} max={100} step={0.001} onChange={v=>setVolumetricFlowRateM3S(Number(v))} readOnly={isViewing}/>
              <Field label="Minor Loss K" value={minorLossKTotal} unit="—" min={0} max={10} step={0.1} onChange={v=>setMinorLossKTotal(Number(v))} readOnly={isViewing||!includeMinorLosses}/>
              <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                <input type="checkbox" id="incl" checked={includeMinorLosses} disabled={isViewing} onChange={e=>setIncludeMinorLosses(e.target.checked)} style={{ accentColor:'#667eea', width:'14px', height:'14px' }}/>
                <label htmlFor="incl" style={{ fontSize:'10px', fontFamily:'"IBM Plex Mono"', color:'rgba(200,210,230,0.6)' }}>Include minor losses</label>
              </div>
              <div>
                <span style={{ ...fld.label, display:'block', marginBottom:'4px' }}>Velocity Profile</span>
                <div style={{ position:'relative' }}>
                  <select value={velocityProfileMode} onChange={e=>setVelocityProfileMode(e.target.value as any)} disabled={isViewing}
                    style={{ ...C.sel, ...(isViewing?{opacity:0.5}:{}) }}>
                    <option value="auto_by_re">Auto (by Reynolds)</option>
                    <option value="laminar">Laminar (parabolic)</option>
                    <option value="turbulent">Turbulent (1/7 power)</option>
                  </select>
                  <span style={C.arr}>▾</span>
                </div>
              </div>
              <Field label="Cross-Section Samples" value={crossSectionSamples} min={10} max={120} step={1} onChange={v=>setCrossSectionSamples(Math.round(Number(v)))} readOnly={isViewing}/>
            </div>
          </div>

        </div>{/* end LEFT */}

        {/* ──── CENTRE: 3D viewport ──── */}
        <div style={C.viewport}>
          <ThreePipeScene {...sceneProps}/>
        </div>

        {/* ──── RIGHT: metrics ──── */}
        <div style={C.right}>
          <div style={C.card}>
            <SecHdr icon="⚡" title="Live Metrics"/>
            <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
              <Metric label="Avg Velocity" value={computed.velocity.toFixed(3)} unit="m/s" hi="#4fbbf7"/>
              <Metric label="Reynolds No."
                value={computed.reynolds < 1000 ? computed.reynolds.toFixed(1) : (computed.reynolds/1000).toFixed(2)+'k'}
                hi={reColor}/>
              <Metric label="Flow Regime"
                value={computed.flowRegime.charAt(0).toUpperCase()+computed.flowRegime.slice(1)}
                unit={computed.selectedProfile==='laminar'?'Parabolic profile':'1/7 Power Law'}
                hi={reColor}/>
              <Metric label="Friction Factor f" value={computed.frictionFactor.toFixed(5)} unit="Darcy–Weisbach"/>
              <Metric label="Total Δp" value={(computed.pressureDrop/1000).toFixed(4)} unit="kPa" hi="#f7614f"/>
              <Metric label="Friction Δp" value={(computed.frictionDrop/1000).toFixed(4)} unit="kPa"/>
              <Metric label="Minor Loss Δp" value={(computed.minorDrop/1000).toFixed(4)} unit="kPa"/>
              <Metric label="Mass Flow ṁ" value={computed.massFlow.toFixed(4)} unit="kg/s"/>
              <Metric label="Wall Shear τ" value={computed.wallShear.toFixed(4)} unit="Pa"/>
            </div>
          </div>

          {backendResult?.results && (
            <div style={C.card}>
              <SecHdr icon="🖥" title="Backend Output"/>
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {typeof backendResult.results.mean !== 'undefined' && <Metric label="Mean" value={Number(backendResult.results.mean).toFixed(4)}/>}
                {typeof backendResult.results.median !== 'undefined' && <Metric label="Median" value={Number(backendResult.results.median).toFixed(4)}/>}
              </div>
            </div>
          )}
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