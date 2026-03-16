import React, { useRef, useState } from 'react';
import { useStarChartSimulation } from '../../hooks/useStarChartSimulation';
import { companyShortNames, oncologyData, rdData, overseasData, getCutoffP } from '../../utils/chartData';

const StarChartD3 = (props) => {
  const { dimensions, isRed, isBig, isSplit } = props;
  const { width, height } = dimensions;

  // Utilize our custom hook: Handles 100% of physics calculating and Tween state
  const { nodes, layoutParams, csvData, gradientRatiosRef, splitRatioState, top5Map } = useStarChartSimulation(props);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const tooltipRef = useRef(null);

  const handleMouseEnter = (e, d) => {
    if (isBig) return;
    setHoveredNodeId(d.company);
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = 1;
      tooltipRef.current.innerHTML = `<strong>${d.company_en || d.company}</strong><br/><span style="font-size: 12px; color: #ccc;">Revenue: ¥${Math.round(d.sales / 100).toLocaleString()}B</span>`;
    }
  };

  const handleMouseMove = (e) => {
    if (isBig) return;
    if (tooltipRef.current) {
      tooltipRef.current.style.left = `${e.clientX + 15}px`;
      tooltipRef.current.style.top = `${e.clientY - 25}px`;
    }
  };

  const handleMouseLeave = () => {
    if (isBig) return;
    setHoveredNodeId(null);
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = 0;
    }
  };

  const renderDefs = () => {
    if (!layoutParams) return null;
    const glowStrength = Math.min(width, height) * 0.0015;
    const blurWidth = 0.5;

    return (
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation={glowStrength} result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="redGlow">
          <feGaussianBlur stdDeviation={glowStrength * 2} result="coloredBlur" />
          <feFlood floodColor="#ff6666" result="redColor" />
          <feComposite in="redColor" in2="coloredBlur" operator="in" result="redBlur" />
          <feMerge>
            <feMergeNode in="redBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {layoutParams.top5Positions.map(pos => {
          const targetRatio = props.isRandD ? (rdData[pos.company] || 0) : (props.isOncology ? (oncologyData[pos.company] || 0) : (overseasData[pos.company] || 0));
          const ratio = gradientRatiosRef.current.get(pos.company) ?? targetRatio;
          
          const p = getCutoffP(ratio);
          const p_pct = ((p + 1) / 2) * 100;
          const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');
          const gradId = `grad-${cleanId}`;
          const isAstellasNode = pos.company === 'アステラス製薬';
          const fgColor = isAstellasNode ? '#e53835bb' : '#9e9e9e';
          const bgColor = isAstellasNode ? '#f8bbd0' : '#e0e0e0';

          return (
            <linearGradient key={gradId} id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset={`${Math.max(0, p_pct - blurWidth)}%`} stopColor={fgColor} style={{ transition: 'stop-color 1s ease' }} />
              <stop offset={`${Math.min(100, p_pct + blurWidth)}%`} stopColor={bgColor} style={{ transition: 'stop-color 1s ease' }} />
            </linearGradient>
          );
        })}
      </defs>
    );
  };

  const renderNodes = () => {
    return nodes.map(d => {
      const isTop5 = top5Map?.has(d.company);
      const cx = d.renderX !== undefined ? d.renderX : d.x;
      const cy = d.renderY !== undefined ? d.renderY : d.y;
      const r = d.renderR !== undefined ? d.renderR : d.baseR;
      const opacity = d.renderOpacity !== undefined ? d.renderOpacity : 1;

      const isAstellas = d.company === 'アステラス製薬';
      const isHovered = hoveredNodeId === d.company;
      
      const fillHover = '#cce6ff';
      const fillNormal = (isAstellas && isRed) ? '#ff6666' : '#ffffff';
      const finalFill = (isHovered && !isBig) ? fillHover : fillNormal;
      const finalOpacity = (isHovered && !isBig) ? 1 : opacity;
      
      const filter = (isAstellas && isRed) ? 'url(#redGlow)' : 'url(#glow)';
      const computedClass = isAstellas ? 'astellas-dot top5-dot' : (isTop5 ? 'top5-dot other-dot' : 'other-dot');

      return (
        <circle
          key={d.company}
          className={computedClass}
          cx={cx || 0}
          cy={cy || 0}
          r={r || 0}
          fill={finalFill}
          stroke="none"
          opacity={finalOpacity}
          filter={filter}
          style={{
            cursor: 'pointer',
            pointerEvents: (isBig && !isTop5) ? 'none' : 'auto',
            transition: 'fill 0.15s ease, filter 0.7s ease'
          }}
          onMouseEnter={(e) => handleMouseEnter(e, d)}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      );
    });
  };

  const renderTop5BigGroup = () => {
    if (!layoutParams) return null;
    const uniformBaseSize = Math.min(width, height) * 0.02;

    return (
      <g
        className="top5-big-group"
        style={{
          opacity: isBig ? 1 : 0,
          pointerEvents: 'none',
          transition: `opacity ${isBig ? '0.5s 0.8s' : '0s 0s'} ease`
        }}
      >
        {layoutParams.top5Positions.map(pos => {
          const companyData = csvData.find((d) => d.company === pos.company);
          if (!companyData) return null;
          
          const salesB = Math.round(companyData.sales / 100).toLocaleString();
          const isAstellasNode = pos.company === 'アステラス製薬';
          const shortName = companyShortNames[pos.company] || pos.company;
          const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');
          const gradId = `grad-${cleanId}`;

          const activeRatio = splitRatioState.isRandD ? (rdData[pos.company] || 0) : (splitRatioState.isOncology ? (oncologyData[pos.company] || 0) : (overseasData[pos.company] || 0));
          const ratioPercent = (activeRatio * 100).toFixed(1);
          const p = getCutoffP(activeRatio);

          const textAnchor = activeRatio < 0.3 ? 'start' : 'middle';
          const textX = activeRatio < 0.3 ? -pos.r + pos.r * 0.15 : pos.r * (p - 1) / 2;
          const ratioFontSize = uniformBaseSize * 1.5;
          const companyFontSize = uniformBaseSize * 1.25;
          const revenueFontSize = uniformBaseSize * 0.95;

          return (
            <g key={pos.company} className={`top5-big-${cleanId}`} transform={`translate(${pos.x}, ${pos.y})`}>
              <circle
                className="split-bg-circle"
                r={pos.r}
                fill={`url(#${gradId})`}
                style={{
                  opacity: isSplit ? 1 : 0,
                  transition: `opacity ${isSplit ? '0.8s 0.2s' : (isBig ? '0.8s 0s' : '0s 0s')} ease`
                }}
              />
              
              <text
                className="split-ratio-text"
                textAnchor={textAnchor}
                fill="#ffffff"
                stroke="rgba(0, 0, 0, 0.25)"
                strokeWidth="2px"
                strokeLinejoin="round"
                style={{
                  paintOrder: 'stroke fill',
                  opacity: splitRatioState.opacity,
                  transition: 'opacity 0.5s ease'
                }}
                fontFamily="'Georgia', serif"
                fontSize={`${ratioFontSize}px`}
                fontWeight="bold"
                x={textX}
                y="0.3em"
              >
                {`${ratioPercent}%`}
              </text>

              <text
                textAnchor="middle"
                fill={isAstellasNode ? '#ff9999' : '#aaaaaa'}
                fontFamily="'Georgia', serif"
                fontSize={`${companyFontSize}px`}
                fontWeight="300"
                y={-pos.r - companyFontSize * 1.5}
              >
                {shortName}
              </text>

              <text
                textAnchor="middle"
                fill="#ffffff"
                fontFamily="'Georgia', serif"
                fontSize={`${revenueFontSize}px`}
                fontWeight="bold"
                y={-pos.r - companyFontSize * 0.5}
              >
                {`¥${salesB}B`}
              </text>
            </g>
          );
        })}
      </g>
    );
  };

  if (!csvData || !csvData.length) return null;

  return (
    <>
      <svg width={width} height={height} style={{ display: 'block', pointerEvents: 'auto' }}>
        <rect width={width} height={height} fill="#050510" />
        {renderDefs()}
        <g className="nodes-group">
          {renderNodes()}
        </g>
        {renderTop5BigGroup()}
      </svg>
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed', opacity: 0, background: 'rgba(10, 15, 30, 0.9)',
          padding: '10px 15px', border: '1px solid #445588', borderRadius: '6px',
          pointerEvents: 'none', color: '#fff', fontSize: '14px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)', transition: 'opacity 0.2s ease', zIndex: 10,
        }}
      ></div>
    </>
  );
};

export default StarChartD3;
