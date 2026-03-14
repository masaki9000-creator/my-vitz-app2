import React, { useState, useEffect } from 'react';
import { useScrollProgress } from '../../hooks/useScrollProgress';
import StarChartOverlays from './StarChartOverlays';
import StarChartD3 from './StarChartD3';

const StarChartContainer = () => {
  const scrollProgress = useScrollProgress();
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Compute declarative phase state strictly from the current scroll progress
  const isRed = scrollProgress >= 0.1;
  const isBig = scrollProgress >= 0.25;
  const isSplit = scrollProgress >= 0.45;
  const isOncology = scrollProgress >= 0.65;
  const isRandD = scrollProgress >= 0.85;

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '750vh' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
        <StarChartOverlays scrollProgress={scrollProgress} />
        <StarChartD3
          dimensions={dimensions}
          scrollProgress={scrollProgress}
          isRed={isRed}
          isBig={isBig}
          isSplit={isSplit}
          isOncology={isOncology}
          isRandD={isRandD}
        />
      </div>
    </div>
  );
};

export default StarChartContainer;
