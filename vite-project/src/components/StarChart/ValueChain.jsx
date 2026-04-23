import React, { useRef, useState, useEffect } from 'react';

const ValueChain = () => {
  const containerRef = useRef(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [revealedPanels, setRevealedPanels] = useState(-1);

  // Time-based sequential reveal once the section is reached
  useEffect(() => {
    if (scrollProgress <= 0) {
      setRevealedPanels(-1);
    } else if (scrollProgress > 0.02 && revealedPanels === -1) {
      setRevealedPanels(0);
    }
  }, [scrollProgress, revealedPanels]);

  useEffect(() => {
    if (revealedPanels >= 0 && revealedPanels < 4) {
      const timer = setTimeout(() => {
        setRevealedPanels(prev => prev + 1);
      }, 500); // 500ms delay between each panel appearance
      return () => clearTimeout(timer);
    }
  }, [revealedPanels]);

  // Local scroll progress for this component
  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const scrollableDistance = rect.height - windowHeight;
      if (scrollableDistance <= 0) return;

      const scrolled = -rect.top;
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100vw', height: '300vh', padding: 0, background: '#050510' }}>
      <div style={{ position: 'sticky', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, overflow: 'hidden' }}>
        
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          color: '#ffffff', fontFamily: "'Georgia', serif", textAlign: 'center', width: '90%', maxWidth: '1200px'
        }}>
          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              position: 'absolute', top: '-60px', left: '1rem',
              color: '#e0e0e0', fontSize: 'clamp(20px, 2.8vw, 34px)', letterSpacing: '2px',
              textAlign: 'left', fontWeight: '300',
              opacity: scrollProgress > 0 ? 1 : 0,
              transition: 'opacity 0.8s ease'
            }}>
              The impact of <span style={{ color: '#ff6666', fontWeight: 'bold' }}>Digital X</span> across Astellas
            </div>
            {['Research', 'Development', 'Manufacturing', 'Commercial'].map((step, idx) => {
              const isVisible = idx < revealedPanels;
              
              return (
                <div key={step} style={{ 
                  flex: 1, 
                  padding: '2rem 1rem', 
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  background: 'rgba(200, 230, 255, 0.1)',
                  opacity: isVisible ? 1 : 0,
                  transform: `translateY(${isVisible ? '0' : '30px'})`,
                  transition: 'all 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                  boxShadow: isVisible ? '0 10px 30px rgba(0, 0, 0, 0.5)' : 'none'
                }}>
                  <div style={{ fontSize: '0.9rem', color: '#888', marginBottom: '0.5rem' }}>Case 0{idx + 1}</div>
                  <h3 style={{ margin: 0, fontSize: 'clamp(16px, 1.5vw, 24px)', fontWeight: 'bold', color: '#cce6ff' }}>
                    {step}
                  </h3>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ValueChain;
