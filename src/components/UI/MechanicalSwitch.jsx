import { motion } from 'framer-motion';

export default function MechanicalSwitch({ label, active, onClick, disabled }) {
  return (
    <div 
      onClick={() => !disabled && onClick()} 
      className={`relative cursor-pointer flex items-center justify-between p-3 border transition-all select-none
        ${active ? 'bg-zinc-900 border-lime-400' : 'border-zinc-800 hover:border-zinc-600'}
        ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
    >
      <span className={`text-[10px] font-bold tracking-widest ${active ? 'text-lime-400' : 'text-zinc-500'}`}>
        {label}
      </span>
      <div className={`w-8 h-4 border border-zinc-700 relative ${active ? 'bg-lime-900/20' : 'bg-black'}`}>
        <motion.div 
          animate={{ x: active ? 16 : 2 }} 
          className={`absolute top-[2px] w-3 h-3 ${active ? 'bg-lime-400 shadow-[0_0_8px_#ccff00]' : 'bg-zinc-600'}`} 
        />
      </div>
    </div>
  );
}