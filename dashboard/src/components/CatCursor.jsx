import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue, useAnimationFrame } from 'framer-motion';
import { MousePointer2, Cat } from 'lucide-react';
import AnimatedCat from './AnimatedCat';

export default function CatCursor() {
  const [showCat, setShowCat] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isCatRunning, setIsCatRunning] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastRotation = useRef(45);
  const idleTimer = useRef(null);
  const hasInitialized = useRef(false);
  const runningRef = useRef(false);
  const dxRef = useRef(0);
  const dyRef = useRef(0);
  
  // Motion values for exact mouse position
  // TWEAK THIS: Increase stiffness (e.g. to 1000) and damping (e.g. to 40) to make it feel like a normal cursor
  const mouseX = useSpring(0, { stiffness: 1000, damping: 40 });
  const mouseY = useSpring(0, { stiffness: 1000, damping: 40 });
  const rotate = useSpring(45, { stiffness: 300, damping: 20 });
  const scale = useSpring(1.0, { stiffness: 400, damping: 28 });
  
  // Motion values for trailing cat position
  const catX = useMotionValue(0);
  const catY = useMotionValue(0);

  // Use a constant ultra-slow walking speed so it doesn't snap like a spring
  useAnimationFrame((time, delta) => {
    if (!hasInitialized.current) return;
    
    // Smooth out target calculations by using the physics-based spring values of the main cursor!
    // This prevents the cat's target from "teleporting" instantly when the mouse suddenly changes direction.
    const springMouseX = mouseX.get();
    const springMouseY = mouseY.get();
    const springRotate = rotate.get();
    
    // Cat targets a spot further behind the rotated arrow, using the SMOOTH rotation
    const vNotch = 55;
    const rad = springRotate * (Math.PI / 180);
    const rotatedX = vNotch * Math.cos(rad) - vNotch * Math.sin(rad);
    const rotatedY = vNotch * Math.sin(rad) + vNotch * Math.cos(rad);
    
    const targetX = springMouseX + rotatedX - 12;
    const targetY = springMouseY + rotatedY - 12;

    const currentX = catX.get();
    const currentY = catY.get();
    
    const dx = targetX - currentX;
    const dy = targetY - currentY;
    const dist = Math.hypot(dx, dy);
    
    // Normalize dx and dy for direction if we are moving
    if (dist > 0.1) {
      dxRef.current = dx / dist;
      dyRef.current = dy / dist;
    }

    const moving = dist > 5; // Add a small 5px deadzone to prevent micro-jittering
    if (moving !== runningRef.current) {
      runningRef.current = moving;
      setIsCatRunning(moving);
    }
    
    if (moving) {
      // TWEAK THIS: Increase this speed value to make the cat run faster!
      // 0.5 pixels per millisecond = 500 pixels per second
      const speed = 0.2; 
      const safeDelta = Math.min(delta, 50); // Clamp delta to prevent huge jumps on lag spikes
      const moveDist = Math.min(dist, speed * safeDelta);
      const angle = Math.atan2(dy, dx);
      
      catX.set(currentX + Math.cos(angle) * moveDist);
      catY.set(currentY + Math.sin(angle) * moveDist);
    }
  });

  useEffect(() => {
    scale.set(isMoving ? 0.85 : 1.0);
  }, [isMoving, scale]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setIsVisible(true);
      setIsMoving(true);
      
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => {
        setIsMoving(false);
      }, 150);

      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
      
      const dx = e.clientX - lastPos.current.x;
      const dy = e.clientY - lastPos.current.y;
      
      const distance = Math.hypot(dx, dy);
      
      // Only update rotation if moved significantly to prevent micro-jitter
      if (distance > 3) {
        let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        // MousePointer2 natively points top-left (-135 deg). Add 135 to point it in direction of travel.
        let targetRotation = angle + 135;
        let currentRotation = rotate.get();
        
        // Prevent 360-degree jitter snapping by taking the shortest angular path
        while (targetRotation - currentRotation > 180) targetRotation -= 360;
        while (targetRotation - currentRotation < -180) targetRotation += 360;
        
        rotate.set(targetRotation);
        lastRotation.current = targetRotation;
      }
      lastPos.current = { x: e.clientX, y: e.clientY };
      
      // Target is now computed dynamically in useAnimationFrame!
      
      if (!hasInitialized.current) {
        catX.set(e.clientX - 12);
        catY.set(e.clientY - 12);
        hasInitialized.current = true;
      }
    };

    const handleMouseLeave = () => setIsVisible(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseout', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseout', handleMouseLeave);
    };
  }, [mouseX, mouseY, catX, catY, rotate]);

  return (
    <>
      <button
        onClick={() => setShowCat(prev => !prev)}
        className={`p-3 rounded-full bg-white/10 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-xl hover:text-violet-500 transition-colors z-50 fixed top-6 right-20 pointer-events-auto ${showCat ? 'text-violet-500' : 'text-slate-500 dark:text-slate-400 opacity-60'}`}
        title="Toggle Cat Companion"
        style={{ cursor: 'none' }}
      >
        <Cat size={20} />
      </button>

      {/* Primary pointer (Themed Custom Arrow) */}
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[10000] text-slate-900 dark:text-white drop-shadow-md"
        style={{
          x: mouseX,
          y: mouseY,
          rotate: rotate,
          scale: scale,
          originX: 0,
          originY: 0,
        }}
      >
        <MousePointer2 size={28} strokeWidth={1} className="fill-white dark:fill-slate-900" />
      </motion.div>
      {/* Trailing Cat */}
      {showCat && (
        <motion.div
          className="fixed top-0 left-0 pointer-events-none z-[9998] text-violet-500 dark:text-violet-400 drop-shadow-lg"
          style={{
            x: catX,
            y: catY,
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div style={{ marginLeft: '-16px', marginTop: '-16px' }}>
            <AnimatedCat isRunning={isCatRunning} dx={dxRef.current} dy={dyRef.current} />
          </div>
        </motion.div>
      )}
    </>
  );
}
