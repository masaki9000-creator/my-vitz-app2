import React from 'react';

const StarChartOverlays = ({ scrollProgress }) => {
  return (
    <>
      {/* Absolute top fixed titles */}
      <div style={{ position: 'fixed', top: '20px', left: 0, right: 0, zIndex: 100, textAlign: 'center', pointerEvents: 'none' }}>
        <h1 style={{
          margin: 0, padding: '0 20px', color: '#fff', fontSize: 'clamp(22px, 5vmin, 51px)',
          fontFamily: "'Georgia', serif", fontWeight: '300', letterSpacing: '2px',
        }}>
          A Star in a Pharma Nebula
        </h1>
        <h2 style={{
          margin: '40px 0 0 0', padding: '0 20px', color: '#e0e0e0', fontSize: 'clamp(12px, 2.5vmin, 20px)',
          fontFamily: "'Georgia', serif", fontWeight: '300', letterSpacing: '2px',
          opacity: scrollProgress >= 0.25 ? 1 : 0,
          transform: `translateY(${scrollProgress >= 0.25 ? '35px' : '15px'})`,
          transition: 'all 0.6s ease'
        }}>
          FY25 Sales Revenue (JPY)
        </h2>
      </div>

      {/* Intro Description Box */}
      <div
        style={{
          position: 'fixed', bottom: '18%', left: '50%',
          transform: `translate(-50%, ${scrollProgress >= 0.1 && scrollProgress < 0.25 ? '0' : '150%'})`,
          opacity: scrollProgress >= 0.1 && scrollProgress < 0.25 ? 0.95 : 0,
          background: 'rgba(50, 55, 65, 0.98)', padding: '20px 40px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff',
          fontSize: 'clamp(11px, 1.6vw, 16px)', fontFamily: "'Georgia', serif", textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: 'none', zIndex: 50,
          width: 'max-content', maxWidth: '90vw', lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '8px' }}>
          Each dot represents the sales volume of a domestic pharmaceutical company.
        </div>
        <div>
          Among them, <span style={{ color: '#ff6666', fontWeight: 'bold' }}>Astellas Pharma</span> is one of the major players in the industry.
        </div>
      </div>

      {/* Overseas Ratio Box */}
      <div
        style={{
          position: 'fixed', bottom: '8%', left: '50%',
          transform: `translate(-50%, ${scrollProgress >= 0.45 && scrollProgress < 0.62 ? '0' : '150%'})`,
          opacity: scrollProgress >= 0.45 && scrollProgress < 0.62 ? 0.95 : 0,
          background: 'rgba(50, 55, 65, 0.85)', padding: '20px 40px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff',
          fontSize: 'clamp(11px, 1.6vw, 16px)', fontFamily: "'Georgia', serif", textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: 'none', zIndex: 50,
          width: 'max-content', maxWidth: '90vw', lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '1.4em' }}>
          Overseas Sales Ratio (%)
        </div>
        <div style={{ fontSize: '0.9em', color: '#ccc' }}>
          The filled area represents the proportion of revenue generated outside of Japan.
        </div>
      </div>

      {/* Oncology Ratio Box */}
      <div
        style={{
          position: 'fixed', bottom: '8%', left: '50%',
          transform: `translate(-50%, ${scrollProgress >= 0.65 && scrollProgress < 0.82 ? '0' : '150%'})`,
          opacity: scrollProgress >= 0.65 && scrollProgress < 0.82 ? 0.95 : 0,
          background: 'rgba(50, 55, 65, 0.85)', padding: '20px 40px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff',
          fontSize: 'clamp(11px, 1.6vw, 16px)', fontFamily: "'Georgia', serif", textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: 'none', zIndex: 50,
          width: 'max-content', maxWidth: '90vw', lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '1.4em' }}>
          Oncology Sales Ratio (%)
        </div>
        <div style={{ fontSize: '0.9em', color: '#ccc' }}>
          The filled area represents the proportion of revenue generated from oncology products.
        </div>
      </div>

      {/* R&D Expense Ratio Box */}
      <div
        style={{
          position: 'fixed', bottom: '8%', left: '50%',
          transform: `translate(-50%, ${scrollProgress >= 0.85 ? '0' : '150%'})`,
          opacity: scrollProgress >= 0.85 ? 0.95 : 0,
          background: 'rgba(50, 55, 65, 0.85)', padding: '20px 40px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff',
          fontSize: 'clamp(11px, 1.6vw, 16px)', fontFamily: "'Georgia', serif", textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          transition: 'all 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)', pointerEvents: 'none', zIndex: 50,
          width: 'max-content', maxWidth: '90vw', lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '1.4em' }}>
          R&D Expense Ratio (%)
        </div>
        <div style={{ fontSize: '0.9em', color: '#ccc' }}>
          The filled area represents the proportion of revenue invested into Research & Development.
        </div>
      </div>
    </>
  );
};

export default StarChartOverlays;
