import React, { useState, useEffect } from 'react';

const spriteSets = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [[-5, 0], [-6, 0], [-7, 0]],
  scratchWallN: [[0, 0], [0, -1]],
  scratchWallS: [[-7, -1], [-6, -2]],
  scratchWallE: [[-2, -2], [-2, -3]],
  scratchWallW: [[-4, 0], [-4, -1]],
  tired: [[-3, -2]],
  sleeping: [[-2, 0], [-2, -1]],
  N: [[-1, -2], [-1, -3]],
  NE: [[0, -2], [0, -3]],
  E: [[-3, 0], [-3, -1]],
  SE: [[-5, -1], [-5, -2]],
  S: [[-6, -3], [-7, -2]],
  SW: [[-5, -3], [-6, -1]],
  W: [[-4, -2], [-4, -3]],
  NW: [[-1, 0], [-1, -1]],
};

export default function AnimatedCat({ isRunning, dx, dy }) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    let animationFrameId;
    let lastTime = 0;

    const loop = (time) => {
      if (time - lastTime > 100) {
        lastTime = time;
        setFrameIndex(prev => prev + 1);
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  // Determine direction
  let direction = "";
  if (isRunning) {
    // Note: dy is target - current.
    // So if dy > 0, target is below cat -> South
    // In oneko.js: diffY is nekoPosY - mousePosY (which is -dy).
    // Let's re-calculate using the provided dx/dy (which are target - current).
    // If target is to the right, dx > 0 (East).
    direction = dy < -0.5 ? "N" : "";
    direction += dy > 0.5 ? "S" : "";
    direction += dx < -0.5 ? "W" : "";
    direction += dx > 0.5 ? "E" : "";
  }

  // Default to E if empty string
  if (isRunning && direction === "") direction = "E";

  const currentSet = isRunning ? spriteSets[direction] : spriteSets["idle"];
  const sprite = currentSet[frameIndex % currentSet.length];

  return (
    <div className="relative flex items-center justify-center w-8 h-8">
      <div
        className="w-[32px] h-[32px] scale-125"
        style={{
          backgroundImage: "url('/oneko.gif')",
          backgroundPosition: `${sprite[0] * 32}px ${sprite[1] * 32}px`,
          imageRendering: "pixelated",
          pointerEvents: "none"
        }}
      />
    </div>
  );
}
