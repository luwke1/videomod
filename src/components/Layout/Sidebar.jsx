import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import MechanicalSwitch from '../UI/MechanicalSwitch';
import TerminalLog from '../UI/TerminalLog';
import Trimmer from '../UI/Trimmer';

export default function Sidebar({ 
  file, 
  isProcessing, 
  handleUpload, 
  videoRef, 
  handleMetadata, 
  videoDuration, 
  params, 
  setParams, 
  handleProcess, 
  logs 
}) {
  return (
    <section className="w-[350px] flex flex-col border-r border-zinc-800 bg-[#080808] z-50 shadow-2xl">
      
      {/* DRAG HEADER */}
      <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex items-center px-4 titlebar-drag-region select-none">
        <div className={`w-2 h-2 mr-3 ${isProcessing ? 'bg-amber-400 animate-pulse' : 'bg-lime-400'}`} />
        <span className="text-xs font-bold tracking-[0.3em] text-zinc-400">DA3_MOD</span>
      </div>

      <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
        {/* 01 // SOURCE MOUNT */}
        <div className="space-y-2">
          <label className="text-[10px] text-zinc-500 font-bold tracking-widest block">01 // SOURCE MOUNT</label>
          <div
            onClick={!isProcessing ? handleUpload : undefined}
            className={`h-16 border border-dashed flex items-center justify-center cursor-pointer transition-all
              ${file ? 'bg-zinc-900 border-lime-400/40' : 'border-zinc-700 hover:bg-zinc-900 hover:border-zinc-500'}`}
          >
            <span className="text-[10px] text-zinc-400 truncate px-4">
              {file ? file.split('\\').pop() : "[ CLICK TO LOAD .MP4 ]"}
            </span>
          </div>
        </div>

        <AnimatePresence>
          {file && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }} 
              animate={{ opacity: 1, height: 'auto' }} 
              className="space-y-8 overflow-hidden"
            >
              {/* VIDEO PREVIEW */}
              <div className="aspect-video bg-black border border-zinc-800 relative group">
                <video
                  ref={videoRef}
                  src={file}
                  className="w-full h-full object-contain opacity-50 group-hover:opacity-100 transition-opacity"
                  onLoadedMetadata={handleMetadata}
                />
                <div className="absolute top-2 left-2 text-[9px] bg-black/80 px-1 text-lime-400 border border-lime-400/30">
                  DUR: {videoDuration.toFixed(1)}s
                </div>
              </div>

              {/* 02 // TRIMMER COMPONENT */}
              <Trimmer 
                videoDuration={videoDuration} 
                params={params} 
                setParams={setParams} 
                videoRef={videoRef} 
              />

              {/* 03 // COMPUTE */}
              <div className="space-y-2">
                <label className="text-[10px] text-zinc-500 font-bold tracking-widest block">03 // DA3 COMPUTE</label>
                <div className="space-y-2">
                  <MechanicalSwitch 
                    label="USE GPU BACKEND" 
                    active={params.cuda} 
                    onClick={() => setParams(p => ({ ...p, cuda: !p.cuda }))} 
                    disabled={isProcessing} 
                  />
                  <MechanicalSwitch 
                    label="METRIC ALIGNMENT" 
                    active={params.highQuality} 
                    onClick={() => setParams(p => ({ ...p, highQuality: !p.highQuality }))} 
                    disabled={isProcessing} 
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* EXECUTE BUTTON */}
      <div className="p-4 border-t border-zinc-800">
        <button
          onClick={handleProcess}
          disabled={!file || isProcessing}
          className={`w-full py-4 text-xs font-bold tracking-[0.2em] uppercase transition-all
             ${!file ? 'bg-zinc-900 text-zinc-600 border border-zinc-800' : ''}
             ${file && !isProcessing ? 'bg-white text-black hover:bg-lime-400 hover:border-lime-400' : ''}
             ${isProcessing ? 'bg-zinc-900 text-lime-400 border border-lime-400 animate-pulse' : ''}`}
        >
          {isProcessing ? "PROCESSING DA3..." : "GENERATE DEPTH MAP"}
        </button>
      </div>

      <TerminalLog logs={logs} />
    </section>
  );
}