import React from 'react';

export default function Trimmer({ videoDuration, params, setParams, videoRef }) {
  // Helper to clamp start time
  const updateStart = (val) => {
    if (val < params.trimEnd) {
      setParams(p => ({ ...p, trimStart: val }));
      // Live preview seek
      if (videoRef.current) videoRef.current.currentTime = val;
    }
  };

  // Helper to clamp end time
  const updateEnd = (val) => {
    if (val > params.trimStart) {
      setParams(p => ({ ...p, trimEnd: val }));
      // Live preview seek
      if (videoRef.current) videoRef.current.currentTime = val;
    }
  };

  return (
    <div className="space-y-4">
      <label className="text-[10px] text-zinc-500 font-bold tracking-widest block">
        02 // TRIM RANGE ({params.trimStart.toFixed(1)}s - {params.trimEnd.toFixed(1)}s)
      </label>

      {/* The Track Container */}
      <div className="relative h-8 w-full bg-zinc-900/50 border border-zinc-800 flex items-center px-2">
        
        {/* Active Highlight Zone (Green Area) */}
        <div
          className="absolute h-full top-0 bg-lime-400/10 border-x border-lime-400/50 pointer-events-none"
          style={{
            left: `${(params.trimStart / videoDuration) * 100}%`,
            right: `${100 - (params.trimEnd / videoDuration) * 100}%`
          }}
        />

        {/* Start Slider Input (Invisible but interactive) */}
        <input
          type="range" 
          min={0} 
          max={videoDuration} 
          step={0.1}
          value={params.trimStart}
          onChange={(e) => updateStart(parseFloat(e.target.value))}
          className={`absolute inset-0 w-full opacity-0 cursor-ew-resize ${params.trimStart > videoDuration / 2 ? 'z-30' : 'z-20'}`}
        />

        {/* End Slider Input (Invisible but interactive) */}
        <input
          type="range" 
          min={0} 
          max={videoDuration} 
          step={0.1}
          value={params.trimEnd}
          onChange={(e) => updateEnd(parseFloat(e.target.value))}
          className="absolute inset-0 w-full z-25 opacity-0 cursor-ew-resize"
        />

        {/* Visual Thumb Handles (Purely decorative, they follow the inputs) */}
        <div 
          className="absolute h-4 w-1 bg-lime-400 z-10 pointer-events-none transform -translate-x-1/2" 
          style={{ left: `${(params.trimStart / videoDuration) * 100}%` }} 
        />
        <div 
          className="absolute h-4 w-1 bg-lime-400 z-10 pointer-events-none transform -translate-x-1/2" 
          style={{ left: `${(params.trimEnd / videoDuration) * 100}%` }} 
        />
      </div>
    </div>
  );
}