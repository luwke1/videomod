import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Viewport from './components/Layout/Viewport';

const { ipcRenderer } = window.require('electron');

export default function App() {
  const [file, setFile] = useState(null);
  const [videoDuration, setVideoDuration] = useState(10);
  const [logs, setLogs] = useState([{ msg: "DA3_SYSTEM_READY...", type: "info" }]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultPath, setResultPath] = useState(null);
  const videoRef = useRef(null);

  // Cleaned params state: pointSize is gone
  const [params, setParams] = useState({
    trimStart: 0,
    trimEnd: 5,
    cuda: true,
    highQuality: false 
  });

  const addLog = (msg, type = "info") => setLogs(prev => [...prev, { msg, type }]);

  useEffect(() => {
    ipcRenderer.on('status-update', (_, msg) => addLog(msg));
    ipcRenderer.on('process-complete', (_, path) => {
      setIsProcessing(false);
      setResultPath(path);
      addLog(`RENDER_SUCCESS: ${path}`, "success");
    });
    return () => {
      ipcRenderer.removeAllListeners('status-update');
      ipcRenderer.removeAllListeners('process-complete');
    };
  }, []);

  const handleUpload = async () => {
    const path = await ipcRenderer.invoke('select-file');
    if (path) {
      setFile(path);
      setResultPath(null);
      addLog(`MOUNTED: ${path.split('\\').pop()}`);
    }
  };

  const handleProcess = () => {
    if (!file) return;
    setIsProcessing(true);
    setResultPath(null);
    addLog("EXEC_DA3_PIPELINE...");
    ipcRenderer.send('run-process', {
      videoPath: file,
      trimStart: params.trimStart,
      trimEnd: params.trimEnd,
      useCuda: params.cuda
    });
  };

  const handleMetadata = (e) => {
    const dur = e.target.duration;
    setVideoDuration(dur);
    setParams(p => ({ ...p, trimEnd: Math.min(dur, 5) }));
  };

  return (
    <div className="flex h-screen w-screen bg-[#020202] text-zinc-300 font-mono overflow-hidden">
      <Sidebar 
        file={file}
        isProcessing={isProcessing}
        handleUpload={handleUpload}
        videoRef={videoRef}
        handleMetadata={handleMetadata}
        videoDuration={videoDuration}
        params={params}
        setParams={setParams}
        handleProcess={handleProcess}
        logs={logs}
      />

      {/* Cleaned Viewport: pointSize props are gone */}
      <Viewport resultPath={resultPath} />
    </div>
  );
}