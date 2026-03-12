import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function VolumetricPlayer({ videoRef, colorMode, depthScale = 2.5 }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  useEffect(() => {
    // Wait until the video DOM element and material are actually ready
    if (!videoRef.current || !materialRef.current) return;

    // 1. Create TWO distinct VideoTextures pointing to the SAME HTML video node.
    // This circumvents the clone() bug and forces Three.js to update both every frame.
    const rgbTexture = new THREE.VideoTexture(videoRef.current);
    const depthTexture = new THREE.VideoTexture(videoRef.current);

    // Prevent blurring
    rgbTexture.minFilter = THREE.LinearFilter;
    depthTexture.minFilter = THREE.LinearFilter;

    // 2. Setup RGB Texture (Top Half)
    rgbTexture.colorSpace = THREE.SRGBColorSpace;
    rgbTexture.repeat.set(1, 0.5);
    rgbTexture.offset.set(0, 0.5);

    // 3. Setup Depth Texture (Bottom Half)
    depthTexture.colorSpace = THREE.NoColorSpace;
    depthTexture.repeat.set(1, 0.5);
    depthTexture.offset.set(0, 0);

    const updateAspect = () => {
      const w = videoRef.current.videoWidth;
      // Divide by 2 to get the aspect ratio of a single frame from the vertical stack
      const h = videoRef.current.videoHeight / 2; 
      if (w && h) setAspectRatio(w / h);
    };

    videoRef.current.addEventListener('loadedmetadata', updateAspect);
    
    // Fallback: If the video is already loaded before the listener attaches, fire it now
    if (videoRef.current.readyState >= 1) {
      updateAspect();
    }

    // 4. Map the textures to the material
    materialRef.current.displacementMap = depthTexture;
    materialRef.current.displacementScale = depthScale;
    materialRef.current.displacementBias = -depthScale / 2; 
    
    materialRef.current.map = colorMode === 'rgb' ? rgbTexture : depthTexture;
    materialRef.current.needsUpdate = true;

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateAspect);
      }
      // CRITICAL: Clean up textures from GPU memory when the component unmounts
      rgbTexture.dispose();
      depthTexture.dispose();
    }
  }, [videoRef, colorMode, depthScale]);

  const planeWidth = 8;
  const planeHeight = 8 / aspectRatio;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[planeWidth, planeHeight, 512, 512]} />
      <meshStandardMaterial 
        ref={materialRef}
        wireframe={false}
        side={THREE.DoubleSide}
        roughness={0.8} 
      />
    </mesh>
  );
}