import React, { useRef, useState, useEffect } from 'react';
import StarChartOverlays from './StarChartOverlays';
import StarChartD3 from './StarChartD3';
import ProductsUnderDevelopment from './ProductsUnderDevelopment';
import ValueChain from './ValueChain';

const StarChartContainer = () => {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollableDistance = rect.height - windowHeight;
      if (scrollableDistance <= 0) return;

      const scrolled = -rect.top;
      // Clamp between 0 and 1
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      setScrollProgress(progress);
    };

    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
      handleScroll();
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Compute declarative phase state strictly from local scroll progress (0 to 1 over 2400vh)
  const isRed = scrollProgress >= 0.06;
  const isBig = scrollProgress >= 0.17;
  const isSplit = scrollProgress >= 0.28;
  const isOncology = scrollProgress >= 0.40;
  const isRandD = scrollProgress >= 0.52;
  const isFocusAstellas = scrollProgress >= 0.65;
  
  let visibleProductCount = 0;
  if (scrollProgress >= 0.95) visibleProductCount = 6;
  else if (scrollProgress >= 0.90) visibleProductCount = 5;
  else if (scrollProgress >= 0.85) visibleProductCount = 4;
  else if (scrollProgress >= 0.80) visibleProductCount = 3;
  else if (scrollProgress >= 0.75) visibleProductCount = 2;
  else if (scrollProgress >= 0.70) visibleProductCount = 1;

  return (
    <div style={{ position: 'relative', width: '100vw' }}>
      {/* The main scroll area for the animation */}
      <div ref={containerRef} style={{ position: 'relative', height: '2500vh', width: '100vw' }}>
        {/* Sticky inner container stays on screen while scrolling the 2500vh wrapper, then scrolls up */}
        <div style={{ position: 'sticky', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
          {/* Title remains visible during this section, then scrolls up */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000, textAlign: 'center', pointerEvents: 'none',
            background: '#151820', // Completely opaque dark color so text underneath doesn't show through
            padding: '20px 0',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <h1 style={{
              margin: 0, padding: '0 20px', color: '#fff', fontSize: 'clamp(22px, 5vmin, 51px)',
              fontFamily: "'Georgia', serif", fontWeight: '300', letterSpacing: '2px',
            }}>
              A Star in a Pharma Nebula
            </h1>
          </div>

          <StarChartOverlays scrollProgress={scrollProgress} visibleProductCount={visibleProductCount} />
          <StarChartD3
            dimensions={dimensions}
            scrollProgress={scrollProgress}
            isRed={isRed}
            isBig={isBig}
            isSplit={isSplit}
            isOncology={isOncology}
            isRandD={isRandD}
            isFocusAstellas={isFocusAstellas}
            visibleProductCount={visibleProductCount}
          />
        </div>
      </div>
      
      {/* Content that slides up at the end of the scroll */}
      <ProductsUnderDevelopment />
      
      {/* The new Value Chain section that follows */}
      <ValueChain />
    </div>
  );
};

export default StarChartContainer;
