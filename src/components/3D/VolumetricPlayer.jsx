import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function VolumetricPlayer({ rgbVideoRef, depthVideoRef, colorMode, depthScale = 2.5 }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    if (!rgbVideoRef.current || !depthVideoRef.current || !materialRef.current) return;

    // Dynamically calculate aspect ratio to prevent geometry stretching
    const updateAspect = () => {
      const w = rgbVideoRef.current.videoWidth;
      const h = rgbVideoRef.current.videoHeight;
      if (w && h) setAspectRatio(w / h);
    };

    rgbVideoRef.current.addEventListener('loadedmetadata', updateAspect);
    updateAspect(); // Fire immediately in case it's already loaded

    const rgbTexture = new THREE.VideoTexture(rgbVideoRef.current);
    const depthTexture = new THREE.VideoTexture(depthVideoRef.current);
    
    // QUALITY FIX: The RGB video is color, the depth video is RAW LINEAR MATH
    rgbTexture.colorSpace = THREE.SRGBColorSpace;
    depthTexture.colorSpace = THREE.NoColorSpace; 

    // QUALITY FIX: Prevent ThreeJS from blurring the textures 
    rgbTexture.minFilter = THREE.LinearFilter;
    depthTexture.minFilter = THREE.LinearFilter;

    materialRef.current.displacementMap = depthTexture;
    materialRef.current.displacementScale = depthScale;
    // Centers the geometry on the Z axis instead of only pushing forward
    materialRef.current.displacementBias = -depthScale / 2; 
    
    materialRef.current.map = colorMode === 'rgb' ? rgbTexture : depthTexture;
    materialRef.current.needsUpdate = true;

    return () => {
      if (rgbVideoRef.current) {
        rgbVideoRef.current.removeEventListener('loadedmetadata', updateAspect);
      }
    }
  }, [rgbVideoRef, depthVideoRef, colorMode, depthScale]);

  // Base width is 8 units, height scales naturally
  const planeWidth = 8;
  const planeHeight = 8 / aspectRatio;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      {/* QUALITY FIX: Quadrupled vertex count (512x512) for HD physical geometry */}
      <planeGeometry args={[planeWidth, planeHeight, 512, 512]} />
      <meshStandardMaterial 
        ref={materialRef}
        wireframe={false}
        side={THREE.DoubleSide}
        roughness={0.8} // Removes plastic-like shine from the standard material
      />
    </mesh>
  );
}