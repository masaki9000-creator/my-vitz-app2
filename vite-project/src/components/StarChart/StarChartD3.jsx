import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { overseasData, companyShortNames, oncologyData, rdData, TOP5, getCutoffP } from '../../utils/chartData';

const StarChartD3 = ({ dimensions, scrollProgress, isRed, isBig, isSplit, isOncology, isRandD }) => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  
  // Internal D3 references
  const simulationRef = useRef(null);
  const nodesRef = useRef(null);
  const formattedDataRef = useRef(null);
  const calcTop5PositionsRef = useRef(null);
  const top5MapRef = useRef(null);
  const getBigRRef = useRef(null);
  // Track previous props to detect phase edges
  const prevProps = useRef({ isBig: false, isRed: false, isSplit: false, isOncology: false, isRandD: false });
  const initCompleteRef = useRef(false);

  // 1. Initial Setup Effect: only runs on mount & dimension change
  useEffect(() => {
    let ignore = false;
    const width = dimensions.width;
    const height = dimensions.height;
    const svg = d3.select(svgRef.current);
    const tooltip = d3.select(tooltipRef.current);

    const h1Element = document.querySelector('h1');
    const titleHeight = h1Element ? h1Element.offsetHeight + 20 : 70;
    const titleBottom = titleHeight + 1;

    svg.attr('width', width).attr('height', height).selectAll('*').remove();

    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#050510');

    d3.csv('/pharma_ranking_2025_cleaned.csv').then((data) => {
      if (ignore) return;
      
      const formattedData = data.map((d) => ({
        ...d,
        sales: +d.sales_million_yen,
        rd: d.rd_million_yen ? +d.rd_million_yen : 0,
      }));

      const asterias = formattedData.find((d) => d.company === 'アステラス製薬');
      if (asterias) {
        asterias.fx = width / 2;
        asterias.fy = height / 2;
      }

      const maxSales = d3.max(formattedData, (d) => d.sales);
      const minSize = Math.min(width, height) * 0.01;
      const maxSize = Math.min(width, height) * 0.1;
      const sizeScale = d3.scaleSqrt().domain([0, maxSales]).range([minSize, maxSize]);

      const top5Data = TOP5.map((name) => formattedData.find((d) => d.company === name)).filter(Boolean);

      const padding = 14;
      const availableWidth = width * 0.92;
      const availableHeight = height - titleBottom - 80;
      const baseDiameterSum = top5Data.reduce((sum, d) => sum + sizeScale(d.sales) * 2, 0);
      const basePaddingSum = padding * (top5Data.length - 1);
      const maxBaseDiameter = d3.max(top5Data, d => sizeScale(d.sales)) * 2;
      
      const widthScale = (availableWidth - basePaddingSum) / baseDiameterSum;
      const heightScale = availableHeight / maxBaseDiameter;
      const bigScale = Math.min(3.5, widthScale, heightScale * 0.7);

      const getBigR = (d) => sizeScale(d.sales) * bigScale;
      getBigRRef.current = getBigR;

      // Capture the initial props for the first frame setup
      const initialIsRed = prevProps.current.isRed;
      const initialIsBig = prevProps.current.isBig;
      const initialIsSplit = prevProps.current.isSplit;
      const initialIsOncology = prevProps.current.isOncology;
      const initialIsRandD = prevProps.current.isRandD;

      const calcTop5Positions = () => {
        const centerY = height * 0.52;
        const radii = top5Data.map((d) => getBigR(d));
        const totalWidth = radii.reduce((sum, r) => sum + r * 2, 0) + padding * (top5Data.length - 1);
        let startX = (width - totalWidth) / 2;
        return top5Data.map((d, i) => {
          const r = radii[i];
          const x = startX + r;
          startX += r * 2 + padding;
          return { company: d.company, x, y: centerY, r };
        });
      };
      calcTop5PositionsRef.current = calcTop5Positions;

      const top5Positions = calcTop5Positions();
      const top5Map = new Map(top5Positions.map((p) => [p.company, p]));
      top5MapRef.current = top5Map;

      const dotCenterY = titleBottom + Math.min(width, height) * 0.4;
      const simulation = d3.forceSimulation(formattedData)
        .force('charge', d3.forceManyBody().strength(-5))
        .force('center', d3.forceCenter(width / 2, dotCenterY))
        .force('collide', d3.forceCollide().radius((d) => sizeScale(d.sales) + 2))
        .alphaDecay(0.05);
        
      if (initialIsBig) {
        simulation.stop();
        formattedData.forEach(d => {
          if (top5Map.has(d.company)) {
            const p = top5Map.get(d.company);
            d.x = p.x; d.y = p.y; d.ix = p.x; d.iy = p.y;
          }
        });
      }

      simulationRef.current = simulation;
      formattedDataRef.current = formattedData;

      const glowStrength = Math.min(width, height) * 0.0015;
      const defs = svg.append('defs');

      const glowFilter = defs.append('filter').attr('id', 'glow');
      glowFilter.append('feGaussianBlur').attr('stdDeviation', glowStrength).attr('result', 'coloredBlur');
      const feMerge = glowFilter.append('feMerge');
      feMerge.append('feMergeNode').attr('in', 'coloredBlur');
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const redGlowFilter = defs.append('filter').attr('id', 'redGlow');
      redGlowFilter.append('feGaussianBlur').attr('stdDeviation', glowStrength * 2).attr('result', 'coloredBlur');
      redGlowFilter.append('feFlood').attr('flood-color', '#ff6666').attr('result', 'redColor');
      redGlowFilter.append('feComposite').attr('in', 'redColor').attr('in2', 'coloredBlur').attr('operator', 'in').attr('result', 'redBlur');
      const redMerge = redGlowFilter.append('feMerge');
      redMerge.append('feMergeNode').attr('in', 'redBlur');
      redMerge.append('feMergeNode').attr('in', 'SourceGraphic');

      const blurWidth = 0.5;
      top5Positions.forEach(pos => {
        const ratio = (initialIsRandD ? rdData[pos.company] : (initialIsOncology ? oncologyData[pos.company] : overseasData[pos.company])) || 0.5;
        const p = getCutoffP(ratio);
        const p_pct = ((p + 1) / 2) * 100;
        const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');
        const gradId = `grad-${cleanId}`;
        const grad = defs.append('linearGradient').attr('id', gradId)
          .attr('x1', '0%').attr('y1', '0%').attr('x2', '100%').attr('y2', '0%');
          
        const isAstellasNode = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
        const fgColor = isAstellasNode ? '#e53835bb' : '#9e9e9e'; 
        const bgColor = isAstellasNode ? '#f8bbd0' : '#e0e0e0';   

        grad.append('stop').attr('offset', `${Math.max(0, p_pct - blurWidth)}%`).attr('stop-color', fgColor);
        grad.append('stop').attr('offset', `${Math.min(100, p_pct + blurWidth)}%`).attr('stop-color', bgColor);
      });

      const nodesGroup = svg.append('g').attr('class', 'nodes-group');
      const top5BigGroup = svg.append('g')
        .attr('class', 'top5-big-group')
        .attr('opacity', initialIsBig ? 1 : 0)
        .style('pointer-events', 'none');

      top5Positions.forEach((pos) => {
        const companyData = formattedData.find((d) => d.company === pos.company);
        if (!companyData) return;
        const salesB = Math.round(companyData.sales / 100).toLocaleString();
        const isAstellasNode = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
        const shortName = companyShortNames[pos.company] || pos.company;
        const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');

        const dotG = top5BigGroup.append('g').attr('class', `top5-big-${cleanId}`).attr('transform', `translate(${pos.x}, ${pos.y})`);

        const gradId = `grad-${cleanId}`;
        dotG.append('circle').attr('class', 'split-bg-circle').attr('r', pos.r)
          .attr('fill', `url(#${gradId})`).attr('opacity', initialIsSplit ? 1 : 0);

        const ratio = (initialIsRandD ? rdData[pos.company] : (initialIsOncology ? oncologyData[pos.company] : overseasData[pos.company])) || 0;
        const ratioPercent = (ratio * 100).toFixed(1);
        const p = getCutoffP(ratio); 

        const uniformBaseSize = Math.min(width, height) * 0.02;

        const textAnchor = ratio < 0.3 ? 'start' : 'middle';
        const textX = ratio < 0.3 ? -pos.r + pos.r * 0.15 : pos.r * (p - 1) / 2;
        const ratioFontSize = uniformBaseSize * 1.5;
        dotG.append('text').attr('class', 'split-ratio-text')
          .attr('text-anchor', textAnchor).attr('fill', '#ffffff')
          .style('paint-order', 'stroke fill').attr('stroke', 'rgba(0, 0, 0, 0.25)')
          .attr('stroke-width', '2px').attr('stroke-linejoin', 'round')
          .attr('font-family', "'Georgia', serif").attr('font-size', `${ratioFontSize}px`)
          .attr('font-weight', 'bold').attr('x', textX).attr('y', '0.3em')
          .attr('opacity', initialIsSplit ? 1 : 0).text(`${ratioPercent}%`);

        const companyFontSize = uniformBaseSize * 1.25; 
        dotG.append('text').attr('text-anchor', 'middle')
          .attr('fill', isAstellasNode ? '#ff9999' : '#aaaaaa')
          .attr('font-family', "'Georgia', serif").attr('font-size', `${companyFontSize}px`)
          .attr('font-weight', '300').attr('y', -pos.r - companyFontSize * 1.5).text(shortName);

        const revenueFontSize = uniformBaseSize * 0.95;
        dotG.append('text').attr('text-anchor', 'middle').attr('fill', '#ffffff')
          .attr('font-family', "'Georgia', serif").attr('font-size', `${revenueFontSize}px`)
          .attr('font-weight', 'bold').attr('y', -pos.r - companyFontSize * 0.5).text(`\u00a5${salesB}B`);
      });

      const nodes = nodesGroup.selectAll('circle').data(formattedData).enter().append('circle')
        .attr('class', (d) => {
          if (d.company === 'アステラス製薬') return 'astellas-dot top5-dot';
          if (top5Map.has(d.company)) return 'top5-dot other-dot';
          return 'other-dot';
        })
        .attr('r', (d) => {
          d.baseR = sizeScale(d.sales);
          if (initialIsBig && top5Map.has(d.company)) return getBigR(d);
          else if (initialIsBig) return 0;
          return d.baseR;
        })
        .attr('fill', (d) => (d.company === 'アステラス製薬' && initialIsRed) ? '#ff6666' : '#ffffff')
        .attr('stroke', 'none')
        .attr('opacity', (d) => (initialIsBig && !top5Map.has(d.company)) ? 0 : 1.0)
        .attr('filter', (d) => (d.company === 'アステラス製薬' && initialIsRed) ? 'url(#redGlow)' : 'url(#glow)')
        .style('cursor', 'pointer')
        .style('pointer-events', () => initialIsBig ? 'none' : 'auto')
        .on('mouseover', (event, d) => {
          if (prevProps.current.isBig) return;
          d3.select(event.currentTarget).attr('fill', '#cce6ff').attr('opacity', 1);
          tooltip.style('opacity', 1)
            .html(`<strong>${d.company_en || d.company}</strong><br/><span style="font-size: 12px; color: #ccc;">Revenue: ¥${Math.round(d.sales / 100).toLocaleString()}B</span>`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', `${event.clientX + 15}px`).style('top', `${event.clientY - 25}px`);
        })
        .on('mouseout', (event, d) => {
          const p = prevProps.current;
          if (p.isBig) return;
          
          let targetOpacity = 1.0;
          if (p.isBig && !top5Map.has(d.company)) targetOpacity = 0;
          else if (p.isSplit && top5Map.has(d.company)) targetOpacity = 0;

          d3.select(event.currentTarget)
            .attr('fill', (d.company === 'アステラス製薬' && p.isRed) ? '#ff6666' : '#ffffff')
            .attr('opacity', targetOpacity);
          tooltip.style('opacity', 0);
        });

      nodesRef.current = nodes;

      const yMin = titleBottom + 5;
      const yMax = height - 20;

      simulation.on('tick', () => {
        if (prevProps.current.isBig) {
          nodes.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
        } else {
          nodes
            .attr('cx', (d) => (d.x = Math.max(sizeScale(d.sales), Math.min(width - sizeScale(d.sales), d.x))))
            .attr('cy', (d) => (d.y = Math.max(yMin + sizeScale(d.sales), Math.min(yMax - sizeScale(d.sales), d.y))));
        }
      });
      
      initCompleteRef.current = true;
    }).catch((error) => console.error('CSV Load Error:', error));

    return () => {
      ignore = true;
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      svg.selectAll('*').remove();
      initCompleteRef.current = false;
    };
  }, [dimensions]);

  // 2. Continuous Update Effect: Reacts to phase props cleanly
  useEffect(() => {
    if (!initCompleteRef.current || !svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const simulation = simulationRef.current;
    const formattedData = formattedDataRef.current;
    const top5Map = top5MapRef.current;
    if (!simulation || !formattedData || !top5Map) return;

    const prev = prevProps.current;
    const isBigChanged = isBig !== prev.isBig;
    const isSplitChanged = isSplit !== prev.isSplit;
    const isOncologyChanged = isOncology !== prev.isOncology;
    const isRandDChanged = isRandD !== prev.isRandD;
    const isPieDataChanged = isOncologyChanged || isRandDChanged;

    if (isPieDataChanged && isSplit && !isBigChanged) {
      const positions = calcTop5PositionsRef.current ? calcTop5PositionsRef.current() : [];
      const blurWidth = 0.5;
      
      positions.forEach(pos => {
        const ratio = isRandD ? (rdData[pos.company] || 0) : (isOncology ? (oncologyData[pos.company] || 0) : (overseasData[pos.company] || 0));
        const p = getCutoffP(ratio);
        const p_pct = ((p + 1) / 2) * 100;
        const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');
        const gradId = `#grad-${cleanId}`;
        
        svg.select(gradId).selectAll('stop').interrupt().transition().duration(1000)
          .attr('offset', function (d, i) {
            const isAstellasNode = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
            const fgColor = isAstellasNode ? '#e53835bb' : '#9e9e9e'; 
            const bgColor = isAstellasNode ? '#f8bbd0' : '#e0e0e0';   
            d3.select(this).attr('stop-color', i === 0 ? fgColor : bgColor);
            return i === 0 ? `${Math.max(0, p_pct - blurWidth)}%` : `${Math.min(100, p_pct + blurWidth)}%`;
          });
          
        const textG = svg.select(`.top5-big-${cleanId}`);
        textG.select('.split-ratio-text')
          .transition().duration(500).attr('opacity', 0)
          .on('end', function () {
            const textAnchor = ratio < 0.3 ? 'start' : 'middle';
            const newTextX = ratio < 0.3 ? -pos.r + pos.r * 0.15 : pos.r * (p - 1) / 2;
            d3.select(this)
              .text(`${(ratio * 100).toFixed(1)}%`)
              .attr('x', newTextX)
              .attr('text-anchor', textAnchor)
              .transition().duration(500).attr('opacity', 1);
          });
      });
    }

    if (isBigChanged) {
      if (isBig) {
        simulation.stop();
        if (formattedData) {
          formattedData.forEach((d) => {
            if (d.ix == null) d.ix = d.x;
            if (d.iy == null) d.iy = d.y;
          });
        }
      } else {
        simulation.stop();
        if (formattedData) {
          formattedData.forEach((d) => { d.fx = null; d.fy = null; });
          const astellasNode = formattedData.find((d) => d.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac');
          if (astellasNode) {
            astellasNode.fx = dimensions.width / 2;
            astellasNode.fy = dimensions.height / 2;
          }
        }
      }
    }

    if (isBigChanged || isSplitChanged) {
      const positions = calcTop5PositionsRef.current ? calcTop5PositionsRef.current() : [];
      const posMap = new Map(positions.map((p) => [p.company, p]));

      const nodes = svg.selectAll('.other-dot, .astellas-dot').interrupt();

      if (isBig) {
        nodes.transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attr('cx', (d) => posMap.has(d.company) ? posMap.get(d.company).x : d.x)
          .attr('cy', (d) => posMap.has(d.company) ? posMap.get(d.company).y : d.y)
          .attr('r', (d) => posMap.has(d.company) ? posMap.get(d.company).r : 0)
          .attr('opacity', (d) => posMap.has(d.company) ? 1.0 : 0)
          .style('pointer-events', (d) => posMap.has(d.company) ? 'auto' : 'none');

        svg.selectAll('.split-bg-circle, .split-ratio-text')
          .interrupt()
          .transition()
          .delay(isSplit ? 200 : 0)
          .duration(800)
          .attr('opacity', isSplit ? 1.0 : 0);
      } else {
        if (formattedData) {
          formattedData.forEach((d) => {
            if (d.ix != null) d.x = d.ix;
            if (d.iy != null) d.y = d.iy;
          });
        }

        nodes.transition()
          .duration(800)
          .ease(d3.easeCubicOut)
          .attr('cx', (d) => d.ix != null ? d.ix : d.x)
          .attr('cy', (d) => d.iy != null ? d.iy : d.y)
          .attr('r', (d) => d.baseR || 0)
          .attr('opacity', 1.0)
          .style('pointer-events', 'auto');

        svg.selectAll('.split-bg-circle, .split-ratio-text').interrupt().attr('opacity', 0);

        setTimeout(() => {
          if (simulationRef.current && !prevProps.current.isBig) {
            simulationRef.current.alpha(0.05).restart();
          }
        }, 850);
      }
    }

    const isRedChanged = isRed !== prev.isRed;
    if (isRedChanged) {
      svg.selectAll('.astellas-dot')
        .interrupt('redTransition')
        .transition('redTransition')
        .duration(700) // 0.7秒かけてじわっと変化
        .attr('fill', isRed ? '#ff6666' : '#ffffff');
        
      svg.selectAll('.astellas-dot')
        .attr('filter', isRed ? 'url(#redGlow)' : 'url(#glow)')
        .style('filter', isRed ? 'url(#redGlow)' : 'url(#glow)');
    }

    if (isBigChanged) {
      svg.selectAll('.top5-big-group')
        .interrupt()
        .transition()
        .delay(isBig ? 800 : 0)
        .duration(isBig ? 500 : 200)
        .attr('opacity', isBig ? 1 : 0);
    }

    // Capture the latest frame's props
    prevProps.current = { isBig, isRed, isSplit, isOncology, isRandD };
  }, [dimensions, scrollProgress, isRed, isBig, isSplit, isOncology, isRandD]);

  return (
    <>
      <svg ref={svgRef} style={{ display: 'block', pointerEvents: 'auto' }}></svg>
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
