import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface ThreeCanvasProps {
  designBase64: string | null;
  printSize: number; // 10 to 200
  collarDistance: number; // 0 to 35
  printPosition: 'front' | 'back' | 'leftSleeve' | 'rightSleeve';
  printOffsetX: number; // -30 to 30
  shirtColorHex: string;
}

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  designBase64,
  printSize,
  collarDistance,
  printPosition,
  printOffsetX,
  shirtColorHex,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Interactive zoom camera distance state
  const [zoom, setZoom] = useState<number>(7.5);

  // References to update dynamically without rebuilding the entire scene
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const tshirtGroupRef = useRef<THREE.Group | null>(null);
  const bodyMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const printMaterialRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const decalPlaneRef = useRef<THREE.Mesh | null>(null);

  // Handle live updates of color, size, position, and texture
  useEffect(() => {
    // 1. Live Color Sync
    if (bodyMaterialRef.current) {
      bodyMaterialRef.current.color.set(shirtColorHex);
    }

    // 2. Live Print Size Scaling
    if (decalPlaneRef.current) {
      const sizeFactor = printSize / 100;
      decalPlaneRef.current.scale.set(sizeFactor, sizeFactor, 1);
    }

    // 3. Live 3D Placement (Vertical shift, horizontal offset, sleeve contour wrapping)
    if (decalPlaneRef.current) {
      if (printPosition === 'leftSleeve') {
        // Left Sleeve Layout
        const shiftY = (collarDistance / 100) * 1.2;
        const baseY = 0.55 - shiftY;
        
        const zShift = (printOffsetX / 100) * 1.2;
        const baseZ = 0.05;
        const z = baseZ + zShift;
        
        // Slope/Tilt X coordinate based on height (baseY) to follow sleeve slope and curve inwards
        const baseLeftX = -1.32 - (baseY * 0.25);
        const x = baseLeftX + Math.abs(z - baseZ) * 0.22;
        
        decalPlaneRef.current.position.set(x, baseY, z);
        decalPlaneRef.current.rotation.set(0, -Math.PI / 2, -0.15); // face leftwards tilted outwards
      } else if (printPosition === 'rightSleeve') {
        // Right Sleeve Layout
        const shiftY = (collarDistance / 100) * 1.2;
        const baseY = 0.55 - shiftY;
        
        const zShift = (printOffsetX / 100) * 1.2;
        const baseZ = 0.05;
        const z = baseZ - zShift; // symmetric direction
        
        // Slope/Tilt X coordinate based on height (baseY) to follow sleeve slope and curve inwards
        const baseRightX = 1.32 + (baseY * 0.25);
        const x = baseRightX - Math.abs(z - baseZ) * 0.22;
        
        decalPlaneRef.current.position.set(x, baseY, z);
        decalPlaneRef.current.rotation.set(0, Math.PI / 2, 0.15); // face rightwards tilted outwards
      } else {
        // Front / Back layout positioning
        const shiftX = (printOffsetX / 100) * 1.5;
        const baseTopY = 0.52; // T-shirt neckline start Y for GLB model
        const shiftY = (collarDistance / 100) * 1.2;
        decalPlaneRef.current.position.y = baseTopY - shiftY;

        // Flip placement plane (Z depth and rotation) based on Front/Back toggle
        if (printPosition === 'back') {
          decalPlaneRef.current.position.x = -shiftX; // invert X shift for back view
          decalPlaneRef.current.position.z = -0.76; // Behind GLB model chest
          decalPlaneRef.current.rotation.set(0, Math.PI, 0); // Face outwards to rear
        } else {
          decalPlaneRef.current.position.x = shiftX;
          decalPlaneRef.current.position.z = 0.89; // In front of GLB model chest
          decalPlaneRef.current.rotation.set(0, 0, 0); // Face outwards to front
        }
      }
    }
  }, [shirtColorHex, printSize, collarDistance, printPosition, printOffsetX]);

  // Handle live camera zoom distance changes
  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.position.z = zoom;
    }
  }, [zoom]);

  // Handle live texture updates
  useEffect(() => {
    if (!printMaterialRef.current || !decalPlaneRef.current) return;

    if (designBase64) {
      const loader = new THREE.TextureLoader();
      loader.load(
        designBase64,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.minFilter = THREE.LinearFilter;
          if (printMaterialRef.current) {
            printMaterialRef.current.map = texture;
            printMaterialRef.current.needsUpdate = true;
          }
          if (decalPlaneRef.current) {
            decalPlaneRef.current.visible = true;
          }
        },
        undefined,
        (err) => {
          console.error('[ThreeCanvas] Error loading texture:', err);
        }
      );
    } else {
      decalPlaneRef.current.visible = false;
    }
  }, [designBase64]);

  // Handle Camera Rotation automatically based on active printPosition (Frente, Costas, Sleeve)
  useEffect(() => {
    if (!tshirtGroupRef.current) return;

    let targetRotation = 0;
    if (printPosition === 'back') targetRotation = Math.PI;
    else if (printPosition === 'leftSleeve') targetRotation = Math.PI / 2;
    else if (printPosition === 'rightSleeve') targetRotation = -Math.PI / 2;
    
    // Smooth camera transition using simple requestAnimationFrame loop
    let currentRot = tshirtGroupRef.current.rotation.y;
    const animateRotation = () => {
      if (!tshirtGroupRef.current) return;
      const diff = targetRotation - currentRot;
      if (Math.abs(diff) > 0.01) {
        currentRot += diff * 0.15;
        tshirtGroupRef.current.rotation.y = currentRot;
        requestAnimationFrame(animateRotation);
      } else {
        tshirtGroupRef.current.rotation.y = targetRotation;
      }
    };
    animateRotation();
  }, [printPosition]);

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // 1. Scene, Camera, and WebGL Renderer
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background to match glassmorphic card container

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.0, zoom); // Centered camera height to align with t-shirt center
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // Enable WebGL canvas screenshot capturing
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);

    // 2. Print Overlay Material (Standard PBR material to react to lighting & shadows)
    const printMaterial = new THREE.MeshStandardMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false, // Prevent depth sorting artifacts (z-fighting)
      roughness: 0.85,
      metalness: 0.05,
    });
    printMaterialRef.current = printMaterial;

    // 3. Realistic 3D T-Shirt Group & Loader
    const tshirtGroup = new THREE.Group();

    const gltfLoader = new GLTFLoader();
    gltfLoader.load('/shirt_baked.glb', (gltf) => {
      const shirtMesh = gltf.scene.getObjectByName('T_Shirt_male') as THREE.Mesh;
      if (shirtMesh) {
        // Setup matte PBR fabric material with normal & occlusion maps from GLB
        const material = shirtMesh.material as THREE.MeshStandardMaterial;
        material.color.set(shirtColorHex);
        material.roughness = 0.85; // Natural cotton matte weave
        material.metalness = 0.05;
        material.side = THREE.DoubleSide;
        bodyMaterialRef.current = material;

        // FUSE PRINT DECAL INTO FABRIC:
        // Share normalMap & occlusion data from physical shirt model with the print overlay
        if (printMaterialRef.current) {
          const printMat = printMaterialRef.current as THREE.MeshStandardMaterial;
          printMat.normalMap = material.normalMap;
          printMat.normalScale = material.normalScale;
          printMat.roughness = material.roughness;
          printMat.metalness = material.metalness;
          printMat.needsUpdate = true;
        }
      }
      gltf.scene.scale.set(6, 6, 6);
      gltf.scene.position.set(0, 0.27, 0); // Center shirt vertically at origin
      tshirtGroup.add(gltf.scene);
    }, undefined, (err) => {
      console.error('[ThreeCanvas] Error loading GLTF shirt model:', err);
    });

    // 4. Curved Graphic Decal Print Overlay
    const decalGeo = new THREE.PlaneGeometry(1.36, 1.8, 16, 1);
    const decalPos = decalGeo.attributes.position;
    for (let i = 0; i < decalPos.count; i++) {
      const x = decalPos.getX(i);
      const zCurve = Math.cos((x / 1.36) * Math.PI * 0.5) * 0.08;
      decalPos.setZ(i, decalPos.getZ(i) + zCurve);
    }
    decalGeo.computeVertexNormals();

    const decalMesh = new THREE.Mesh(decalGeo, printMaterial);
    decalMesh.position.set(0, 0.52, 0.89); // Shift Y to match the centered shirt chest
    decalMesh.visible = false;
    
    decalPlaneRef.current = decalMesh;
    tshirtGroup.add(decalMesh);

    tshirtGroupRef.current = tshirtGroup;
    scene.add(tshirtGroup);

    // 5. High-End Studio Lighting Shading
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.95);
    keyLight.position.set(5, 8, 7.5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.35);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    // Initial state setup
    const sizeFactor = printSize / 100;
    decalMesh.scale.set(sizeFactor, sizeFactor, 1);
    
    const baseTopY = 0.52;
    const shiftY = (collarDistance / 100) * 1.2;
    decalMesh.position.y = baseTopY - shiftY;

    if (printPosition === 'back') {
      decalMesh.position.z = -0.76;
      decalMesh.rotation.y = Math.PI;
      tshirtGroup.rotation.y = Math.PI;
    }

    if (designBase64) {
      const loader = new THREE.TextureLoader();
      loader.load(designBase64, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        printMaterial.map = texture;
        printMaterial.needsUpdate = true;
        decalMesh.visible = true;
      });
    }

    // 7. Interactive Orbit Mouse Drag & Spin Handling
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !tshirtGroup) return;

      const deltaX = e.clientX - prevMousePos.x;
      const deltaY = e.clientY - prevMousePos.y;

      tshirtGroup.rotation.y += deltaX * 0.007;
      tshirtGroup.rotation.x += deltaY * 0.005;

      // Clamp X rotation to prevent flipping shirt upside down
      tshirtGroup.rotation.x = Math.max(-0.4, Math.min(0.4, tshirtGroup.rotation.x));

      prevMousePos = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    const canvasElement = canvasRef.current;
    canvasElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch support for mobile devices
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging || !tshirtGroup || e.touches.length !== 1) return;

      const deltaX = e.touches[0].clientX - prevMousePos.x;
      const deltaY = e.touches[0].clientY - prevMousePos.y;

      tshirtGroup.rotation.y += deltaX * 0.007;
      tshirtGroup.rotation.x += deltaY * 0.005;
      tshirtGroup.rotation.x = Math.max(-0.4, Math.min(0.4, tshirtGroup.rotation.x));

      prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    };

    canvasElement.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onMouseUp);

    // 8. Animation Render Loop
    let animationFrameId: number;
    const animate = () => {
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // 9. Resize Observer handling
    const handleResize = () => {
      if (!containerRef.current || !canvasElement) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    // Cleanup WebGL contexts and listeners
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (canvasElement) {
        canvasElement.removeEventListener('mousedown', onMouseDown);
        canvasElement.removeEventListener('touchstart', onTouchStart);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
      
      decalGeo.dispose();
      printMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full min-h-[400px] flex items-center justify-center relative cursor-grab active:cursor-grabbing select-none"
    >
      {/* Zoom / Distance Slider in the top right */}
      <div className="absolute top-4 right-4 bg-base-300/80 backdrop-blur-md px-3.5 py-2.5 rounded-2xl border border-white/5 shadow-xl flex items-center gap-2.5 z-10 pointer-events-auto select-none animate-slideIn">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-brand-primary drop-shadow-md"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
        <input 
          type="range" 
          min="4.5" 
          max="12.0" 
          step="0.1" 
          value={zoom} 
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          className="w-20 h-1 bg-base-100 rounded-lg appearance-none cursor-pointer accent-brand-primary"
          title="Distância da Câmera"
        />
      </div>

      <canvas id="three-customizer-canvas" ref={canvasRef} className="w-full h-full block" />
      
      <div className="absolute bottom-4 right-6 bg-base-300/80 backdrop-blur-md px-3 py-1.5 rounded-full text-[8px] font-black uppercase tracking-widest text-gray-400 border border-white/5 shadow-md flex items-center gap-1.5 pointer-events-none select-none">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="animate-bounce"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Arraste para girar 3D
      </div>
    </div>
  );
};
