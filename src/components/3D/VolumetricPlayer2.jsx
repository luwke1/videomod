import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';

const vertexShader = `
  uniform sampler2D uMap;
  uniform float uDepthScale;
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vUv = uv;
    vec2 depthUv = vec2(vUv.x, vUv.y * 0.5);
    float depthValue = texture2D(uMap, depthUv).r;
    vDepth = depthValue;
    
    vec3 newPosition = position;
    newPosition.z += depthValue * uDepthScale;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uMap;
  uniform float uThreshold; 
  varying vec2 vUv;
  varying float vDepth;

  void main() {
    vec2 colorUv = vec2(vUv.x, 0.5 + (vUv.y * 0.5));
    
    // Stop the stretching using our dynamic threshold
    if (fwidth(vDepth) > uThreshold) {
      discard;
    }

    gl_FragColor = texture2D(uMap, colorUv);
  }
`;

// Added a default threshold of 0.05 to the props
export default function VolumetricPlayer({ videoRef, colorMode, depthScale = 2.5, threshold = 0.05 }) {
  const meshRef = useRef();
  const materialRef = useRef();
  const [aspectRatio, setAspectRatio] = useState(16 / 9);

  // Add uThreshold to the uniforms object
  const uniforms = useMemo(() => ({
    uMap: { value: null },
    uDepthScale: { value: depthScale },
    uThreshold: { value: threshold }
  }), []);

  useEffect(() => {
    if (!videoRef.current || !materialRef.current) return;

    const videoTexture = new THREE.VideoTexture(videoRef.current);
    videoTexture.minFilter = THREE.LinearFilter;
    videoTexture.colorSpace = THREE.SRGBColorSpace;

    materialRef.current.uniforms.uMap.value = videoTexture;

    const updateAspect = () => {
      const w = videoRef.current.videoWidth;
      const h = videoRef.current.videoHeight / 2; 
      if (w && h) setAspectRatio(w / h);
    };

    videoRef.current.addEventListener('loadedmetadata', updateAspect);
    if (videoRef.current.readyState >= 1) updateAspect();

    return () => {
      if (videoRef.current) {
        videoRef.current.removeEventListener('loadedmetadata', updateAspect);
      }
      videoTexture.dispose();
    }
  }, [videoRef]);

  // Keep uniforms updated if React props change
  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uDepthScale.value = depthScale;
      materialRef.current.uniforms.uThreshold.value = threshold;
    }
  }, [depthScale, threshold]);

  const planeWidth = 8;
  const planeHeight = 8 / aspectRatio;

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[planeWidth, planeHeight, 512, 512]} />
      <shaderMaterial 
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        wireframe={false}
      />
    </mesh>
  );
}