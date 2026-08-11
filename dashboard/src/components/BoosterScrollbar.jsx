import React from 'react';
import { motion, useScroll, useVelocity, useSpring, useTransform } from 'framer-motion';

export default function BoosterScrollbar() {
  const { scrollYProgress, scrollY } = useScroll();
  
  // Use scrollY for pixel-based velocity which is easier to tune than 0-1 progress velocity
  const scrollVelocity = useVelocity(scrollY);
  
  // Smooth the velocity so the glow doesn't instantly snap disappear
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });

  // Calculate tail heights and opacity based on pixel velocity.
  // Adjust these thresholds (-3000 to 3000) based on how fast typical scrolling is.
  const tailOpacity = useTransform(smoothVelocity, [-1500, -100, 0, 100, 1500], [1, 0, 0, 0, 1]);
  
  // When scrolling DOWN (velocity > 0), the thumb moves DOWN, so the tail should stream ABOVE it (Top Tail)
  const topTailHeight = useTransform(smoothVelocity, [0, 2000], [0, 150]);
  
  // When scrolling UP (velocity < 0), the thumb moves UP, so the tail should stream BELOW it (Bottom Tail)
  const bottomTailHeight = useTransform(smoothVelocity, [-2000, 0], [150, 0]);

  // The thumb's top position maps directly to the scroll percentage
  const thumbTop = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div className="fixed right-1 md:right-2 top-0 bottom-0 w-[4px] md:w-[6px] z-50 pointer-events-none">
      {/* Wrapper that accounts for the thumb's own height so it doesn't overflow the screen bottom */}
      <div className="relative w-full h-[calc(100vh-80px)] mt-[40px]">
        
        {/* The Scrollbar Thumb */}
        <motion.div 
          className="absolute right-0 w-full h-[40px] bg-slate-300 dark:bg-slate-600 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.3)] z-10"
          style={{ top: thumbTop }}
        >
          {/* Top Tail (Booster streaming upwards when scrolling down) */}
          <motion.div
            className="absolute bottom-[80%] right-0 w-full bg-gradient-to-t from-cyan-400 to-transparent blur-[1px] origin-bottom"
            style={{
              height: topTailHeight,
              opacity: tailOpacity,
            }}
          />
          
          {/* Bottom Tail (Booster streaming downwards when scrolling up) */}
          <motion.div
            className="absolute top-[80%] right-0 w-full bg-gradient-to-b from-cyan-400 to-transparent blur-[1px] origin-top"
            style={{
              height: bottomTailHeight,
              opacity: tailOpacity,
            }}
          />
        </motion.div>
        
      </div>
    </div>
  );
}
