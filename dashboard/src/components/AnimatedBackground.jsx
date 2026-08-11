import { motion } from 'framer-motion';

export default function AnimatedBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* Base animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50 dark:from-slate-900 dark:via-[#0b1120] dark:to-indigo-950/40 animate-gradient-x opacity-80" />
      
      {/* Floating Blobs */}
      <motion.div
        animate={{
          x: [0, 100, 0],
          y: [0, -50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, repeatType: "reverse" }}
        className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-violet-300/30 dark:bg-violet-900/20 blur-[100px] mix-blend-multiply dark:mix-blend-screen"
      />
      <motion.div
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.5, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, repeatType: "reverse", delay: 2 }}
        className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-indigo-300/30 dark:bg-indigo-900/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen"
      />
    </div>
  );
}
