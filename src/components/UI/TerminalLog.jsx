import React, { useEffect, useRef } from 'react';

export default function TerminalLog({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="h-32 bg-[#050505] border-t border-zinc-800 p-3 font-mono text-[10px] overflow-y-auto font-bold custom-scrollbar">
      {logs.map((log, i) => (
        <div key={i} className="mb-1 flex">
          <span className="text-zinc-600 mr-2 opacity-50">
            [{new Date().toLocaleTimeString().split(' ')[0]}]
          </span>
          <span className={log.type === 'error' ? 'text-red-500' : 'text-lime-400/90'}>
            {log.msg}
          </span>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}