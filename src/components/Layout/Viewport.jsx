import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Center, OrbitControls } from '@react-three/drei';
import VolumetricPlayer from '../3D/VolumetricPlayer';

export default function Viewport({ resultPath }) {
  const rgbVideoRef = useRef(null);
  const depthVideoRef = useRef(null);
  const controlsRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(1);
  const [colorMode, setColorMode] = useState('rgb'); // 'rgb' or 'depth'

  // Sync timeline with video playback
  // Sync timeline with Master (RGB) video playback
  useEffect(() => {
    const rgb = rgbVideoRef.current;
    const depth = depthVideoRef.current;
    if (!rgb || !depth) return;

    // UI Updates
    const updateTime = () => setCurrentTime(rgb.currentTime);
    const updateDuration = () => setDuration(rgb.duration);

    // Slave Synchronization Functions
    const syncPlay = () => depth.play().catch(() => { }); // Catch abort errors during rapid clicking
    const syncPause = () => depth.pause();
    const syncSeek = () => { depth.currentTime = rgb.currentTime; };
    const syncWait = () => depth.pause();

    // Aggressive Drift Monitor Loop
    let driftFrameId;
    const monitorDrift = () => {
      // Only check for drift if both are actively playing
      if (!rgb.paused && !depth.paused) {
        const drift = Math.abs(rgb.currentTime - depth.currentTime);
        // If drift exceeds ~50ms (roughly 1.5 frames at 30fps), force alignment
        if (drift > 0.05) {
          depth.currentTime = rgb.currentTime;
        }
      }
      driftFrameId = requestAnimationFrame(monitorDrift);
    };

    // Attach to Master (RGB) Video
    rgb.addEventListener('timeupdate', updateTime);
    rgb.addEventListener('loadedmetadata', updateDuration);
    rgb.addEventListener('play', syncPlay);
    rgb.addEventListener('pause', syncPause);
    rgb.addEventListener('playing', syncPlay); // Catches recovery from buffering
    rgb.addEventListener('waiting', syncWait); // Pauses depth if RGB is buffering
    rgb.addEventListener('seeking', syncSeek); // Syncs during scrubbing
    rgb.addEventListener('seeked', syncSeek);  // Syncs precisely at scrub end / loop restart

    monitorDrift(); // Start the loop

    return () => {
      rgb.removeEventListener('timeupdate', updateTime);
      rgb.removeEventListener('loadedmetadata', updateDuration);
      rgb.removeEventListener('play', syncPlay);
      rgb.removeEventListener('pause', syncPause);
      rgb.removeEventListener('playing', syncPlay);
      rgb.removeEventListener('waiting', syncWait);
      rgb.removeEventListener('seeking', syncSeek);
      rgb.removeEventListener('seeked', syncSeek);
      cancelAnimationFrame(driftFrameId);
    };
  }, [resultPath]);

  const togglePlay = () => {
    // Only command the Master video; the event listeners will handle the Slave automatically
    if (isPlaying) {
      rgbVideoRef.current.pause();
    } else {
      rgbVideoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    // Only seek the Master video to avoid race conditions
    rgbVideoRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const resetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  // Format paths for electron local file loading
  const rgbSrc = resultPath ? `file://${resultPath.replace(/\\/g, '/')}/trimmed.mp4` : null;
  const depthSrc = resultPath ? `file://${resultPath.replace(/\\/g, '/')}/depth_web.mp4` : null;

  return (
    <section className="flex-1 relative bg-black titlebar-drag-region flex flex-col">
      <div className="flex-1 relative overflow-hidden">
        {resultPath ? (
          <Suspense fallback={<LoadingState />}>
            {/* Hidden Video Elements serving as texture sources */}
            <video ref={rgbVideoRef} src={rgbSrc} loop muted playsInline className="hidden" crossOrigin="anonymous" />
            <video ref={depthVideoRef} src={depthSrc} loop muted playsInline className="hidden" crossOrigin="anonymous" />

            <div className="w-full h-full no-drag cursor-crosshair">
              <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                <ambientLight intensity={1.5} />
                <directionalLight position={[0, 0, 5]} intensity={1} />
                <OrbitControls ref={controlsRef} makeDefault enablePan={true} />

                <Center>
                  <VolumetricPlayer
                    rgbVideoRef={rgbVideoRef}
                    depthVideoRef={depthVideoRef}
                    colorMode={colorMode}
                  />
                </Center>
              </Canvas>
            </div>
          </Suspense>
        ) : (
          <EmptyState />
        )}
      </div>

      {/* PLAYER CONTROLS (Only visible when video is loaded) */}
      {resultPath && (
        <div className="h-20 bg-zinc-950 border-t border-zinc-800 flex items-center px-6 gap-6 no-drag">
          <button
            onClick={togglePlay}
            className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-700 hover:border-lime-400 text-lime-400 transition-colors"
          >
            {isPlaying ? "||" : "▶"}
          </button>

          {/* Timeline Scrubber */}
          <div className="flex-1 flex items-center gap-4">
            <span className="text-[10px] text-zinc-500 font-mono w-10 text-right">{currentTime.toFixed(1)}s</span>
            <input
              type="range"
              min={0}
              max={duration || 1}
              step={0.01}
              value={currentTime}
              onChange={handleSeek}
              className="flex-1 accent-lime-400 h-1 bg-zinc-800 appearance-none cursor-ew-resize"
            />
            <span className="text-[10px] text-zinc-500 font-mono w-10">{duration.toFixed(1)}s</span>
          </div>

          {/* UI Toggles */}
          <div className="flex gap-2">
            <button
              onClick={() => setColorMode(colorMode === 'rgb' ? 'depth' : 'rgb')}
              className="px-4 py-2 text-[10px] font-bold tracking-widest border border-zinc-700 hover:border-lime-400 text-zinc-400 hover:text-lime-400"
            >
              MODE: {colorMode.toUpperCase()}
            </button>
            <button
              onClick={resetCamera}
              className="px-4 py-2 text-[10px] font-bold tracking-widest border border-zinc-700 hover:border-lime-400 text-zinc-400 hover:text-lime-400"
            >
              RESET VIEW
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

const LoadingState = () => (
  <div className="absolute inset-0 flex items-center justify-center text-lime-400 font-mono text-xs animate-pulse">
    INITIALIZING_VOLUMETRIC_PLAYER...
  </div>
);

const EmptyState = () => (
  <div className="absolute inset-0 flex flex-col items-center justify-center opacity-20 select-none">
    <div className="text-[120px] font-black text-zinc-800 leading-none">NULL</div>
    <div className="font-mono text-xs tracking-[1em] text-zinc-600 mt-4">AWAITING DATA STREAM</div>
  </div>
);