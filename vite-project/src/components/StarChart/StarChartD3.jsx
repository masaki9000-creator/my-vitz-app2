import React, { useRef, useState, useEffect } from 'react';
import * as d3 from 'd3';
import { useStarChartSimulation } from '../../hooks/useStarChartSimulation';
import { companyShortNames, oncologyData, rdData, overseasData, getCutoffP, companyEnglishNames } from '../../utils/chartData';

const astellasProducts = [
  { name: 'Xtandi (Prostate Cancer)', sales: 9123, color: '#b71c1c', textColor: '#ff6666' }, // dark red slice, bright red text
  { name: 'PADCEV (Urothelial Cancer)', sales: 1641, color: '#e53935', textColor: '#ff8888' }, // red slice, lighter red text
  { name: 'XOSPATA (Acute Myeloid Leukemia)', sales: 680, color: '#f44336', textColor: '#ffaaaa' }, // light red slice, pinkish text
  { name: 'izervay (Geographic Atrophy)', sales: 583, color: '#ef5350', textColor: '#ffcccc' }, // lighter red slice, very light pink text
  { name: 'VEOZAH (Vasomotor Symptoms)', sales: 338, color: '#e57373', textColor: '#ffe6e6' }, // pink slice, nearly white text
  { name: 'VYLOY (Gastric Cancer)', sales: 122, color: '#ffcdd2', textColor: '#ffffff' }   // very light pink slice, white text
];
const astellasTotalSales = astellasProducts.reduce((sum, p) => sum + p.sales, 0);

const StarChartD3 = (props) => {
  const { dimensions, isRed, isBig, isSplit, isFocusAstellas, visibleProductCount } = props;
  const { width, height } = dimensions;

  // Utilize our custom hook: Handles 100% of physics calculating and Tween state
  const { nodes, layoutParams, csvData, gradientRatiosRef, splitRatioState, top5Map, focusTransforms } = useStarChartSimulation(props);

  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const tooltipRef = useRef(null);
  const [productFillProgress, setProductFillProgress] = useState(0);
  const fillProgressRef = useRef(0);

  const targetFillRatio = React.useMemo(() => {
    let ratio = 0;
    for (let i = 0; i < (visibleProductCount || 0); i++) {
      if (astellasProducts[i]) {
        ratio += astellasProducts[i].sales / astellasTotalSales;
      }
    }
    return ratio;
  }, [visibleProductCount]);

  useEffect(() => {
    const startProgress = fillProgressRef.current;
    const endProgress = targetFillRatio;
    
    if (startProgress === endProgress) return;

    const duration = 800; // 0.8 seconds to animate to the new target
    let timer = d3.timer((elapsed) => {
      const t = Math.min(1, elapsed / duration);
      const easeT = d3.easeCubicOut(t);
      const currentVal = startProgress + (endProgress - startProgress) * easeT;
      
      setProductFillProgress(currentVal);
      fillProgressRef.current = currentVal;
      
      if (t === 1) timer.stop();
    });

    return () => {
      if (timer) timer.stop();
    };
  }, [targetFillRatio]);

  const handleMouseEnter = (e, d) => {
    if (isBig) return;
    setHoveredNodeId(d.company);
    if (tooltipRef.current) {
      tooltipRef.current.style.opacity = 1;
      const engName = companyEnglishNames[d.company] || d.company;
      tooltipRef.current.innerHTML = `<strong>${engName}</strong><br/><span style="font-size: 12px; color: #ccc;">Revenue: ¥${Math.round(d.sales / 100).toLocaleString()}B</span>`;
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
          const isAstellasFocus = isAstellasNode && isFocusAstellas;
          const fgColor = isAstellasFocus ? '#f8bbd0' : (isAstellasNode ? '#e53835bb' : '#9e9e9e');
          const bgColor = isAstellasNode ? '#f8bbd0' : '#e0e0e0';

          if (isAstellasNode && (visibleProductCount > 0 || productFillProgress > 0)) {
            const stops = [];
            let cumRatio = 0;
            
            // Use the animated state rather than binding directly to scroll progress
            const fillProgress = productFillProgress;
            
            astellasProducts.forEach((prod, i) => {
              const prodRatio = prod.sales / astellasTotalSales;
              const startRatio = cumRatio;
              const endRatio = cumRatio + prodRatio;
              
              if (fillProgress > startRatio) {
                const pStart = getCutoffP(startRatio);
                const pctStart = ((pStart + 1) / 2) * 100;
                
                const actualEndRatio = Math.min(endRatio, fillProgress);
                const pEnd = getCutoffP(actualEndRatio);
                const pctEnd = ((pEnd + 1) / 2) * 100;

                stops.push(<stop key={`${i}-start`} offset={`${Math.max(0, pctStart - blurWidth)}%`} stopColor={prod.color} />);
                stops.push(<stop key={`${i}-end`} offset={`${Math.min(100, pctEnd + blurWidth)}%`} stopColor={prod.color} />);
              }
              
              cumRatio = endRatio;
            });

            // Fill the remainder with the background color
            if (fillProgress < 1) {
              const pUnfilled = getCutoffP(fillProgress);
              const pctUnfilled = ((pUnfilled + 1) / 2) * 100;
              stops.push(<stop key="unfilled-start" offset={`${Math.max(0, pctUnfilled - blurWidth)}%`} stopColor={bgColor} />);
              stops.push(<stop key="unfilled-end" offset="100%" stopColor={bgColor} />);
            }

            return (
              <linearGradient key={gradId} id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
                {stops}
              </linearGradient>
            );
          }

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
      let opacity = d.renderOpacity !== undefined ? d.renderOpacity : 1;

      const isAstellas = d.company === 'アステラス製薬';
      const isHovered = hoveredNodeId === d.company;

      // During focus-Astellas phase, fade out top5 base dots including Astellas
      if (isTop5 && focusTransforms.size > 0) {
        const ft = focusTransforms.get(d.company);
        if (ft) {
          opacity = opacity * (ft.baseOpacity !== undefined ? ft.baseOpacity : ft.opacity);
        }
      }
      
      const isHoverActive = isHovered && !isBig;
      const fillNormal = (isAstellas && isRed) ? '#ff6666' : '#ffffff';
      const finalOpacity = isHoverActive ? 1 : opacity;
      
      const strokeColor = isHoverActive ? 'rgba(180, 180, 190, 0.95)' : 'rgba(180, 180, 190, 0)';
      const strokeWidth = isHoverActive ? '4px' : '0px';
      
      const filter = (isAstellas && isRed) ? 'url(#redGlow)' : 'url(#glow)';
      const computedClass = isAstellas ? 'astellas-dot top5-dot' : (isTop5 ? 'top5-dot other-dot' : 'other-dot');

      return (
        <circle
          key={d.company}
          className={computedClass}
          cx={cx || 0}
          cy={cy || 0}
          r={r || 0}
          fill={fillNormal}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          opacity={finalOpacity}
          filter={filter}
          style={{
            cursor: 'pointer',
            pointerEvents: (isBig && !isTop5) ? 'none' : 'auto',
            transition: 'stroke 0.2s ease, stroke-width 0.2s ease, filter 0.7s ease, opacity 0.2s ease, fill 2s ease'
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

          // Focus phase: get animated transform from focusTransforms
          const focusT = focusTransforms.get(pos.company);
          const tx = focusT ? focusT.x : pos.x;
          const ty = focusT ? focusT.y : pos.y;
          const focusOpacity = focusT ? focusT.opacity : 1;
          const focusScale = focusT ? focusT.scale : 1;
          const textExtraScale = focusT && focusT.textScale !== undefined ? focusT.textScale : 1;

          return (
            <g
              key={pos.company}
              className={`top5-big-${cleanId}`}
              transform={`translate(${tx}, ${ty}) scale(${focusScale})`}
              style={{
                opacity: focusOpacity,
                transition: focusT ? undefined : `opacity 0.6s ease`
              }}
            >
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
                  opacity: (isFocusAstellas && isAstellasNode) ? 0 : splitRatioState.opacity,
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

              <g transform={`translate(0, ${-pos.r}) scale(${textExtraScale})`}>
                <text
                  textAnchor="middle"
                  fill={isAstellasNode ? '#ff9999' : '#aaaaaa'}
                  fontFamily="'Georgia', serif"
                  fontSize={`${companyFontSize}px`}
                  fontWeight="300"
                  y={-companyFontSize * 1.5}
                >
                  {shortName}
                </text>

                <text
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily="'Georgia', serif"
                  fontSize={`${revenueFontSize}px`}
                  fontWeight="bold"
                  y={-companyFontSize * 0.5}
                >
                  {`¥${salesB}B`}
                </text>
              </g>

              {isAstellasNode && (
                <g className="astellas-products-list" transform={`translate(${pos.r + uniformBaseSize * 2.5}, 0)`}>
                  {astellasProducts.map((prod, i) => {
                    const isVisible = i < visibleProductCount;
                    const lineHeight = uniformBaseSize * 2.4;
                    const startY = - (astellasProducts.length * lineHeight) / 2 + lineHeight / 2;
                    const yOffset = startY + i * lineHeight;
                    
                    const match = prod.name.match(/^(.*?)\s*(\(.*?\))$/);
                    const mainName = match ? match[1] : prod.name;
                    const parenText = match ? match[2] : '';
                    
                    return (
                      <text
                        key={prod.name}
                        x={0}
                        y={yOffset}
                        fill={prod.textColor || prod.color}
                        fontFamily="'Georgia', serif"
                        fontSize={`${uniformBaseSize * 1.6}px`}
                        fontWeight="bold"
                        dominantBaseline="central"
                        style={{
                          opacity: isVisible ? 1 : 0,
                          transform: `translateX(${isVisible ? '0px' : '-20px'})`,
                          transition: 'opacity 0.6s ease, transform 0.6s cubic-bezier(0.2, 0.8, 0.2, 1)'
                        }}
                      >
                        {mainName}
                        {parenText && (
                          <tspan fontSize={`${uniformBaseSize * 1.0}px`} fontWeight="normal" opacity={0.85}>
                            {` ${parenText}`}
                          </tspan>
                        )}
                        {`: ¥${prod.sales.toLocaleString()}B`}
                      </text>
                    );
                  })}
                </g>
              )}
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
          pointerEvents: 'none', color: '#fff', fontSize: '14px', fontFamily: "'Georgia', serif",
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)', transition: 'opacity 0.2s ease', zIndex: 10,
        }}
      ></div>
    </>
  );
};

export default StarChartD3;
