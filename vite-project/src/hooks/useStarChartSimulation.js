import { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { overseasData, oncologyData, rdData, TOP5 } from '../utils/chartData';

export const useStarChartSimulation = ({ dimensions, isBig, isRed, isSplit, isOncology, isRandD }) => {
  const { width, height } = dimensions;

  const [csvData, setCsvData] = useState([]);
  const [tick, setTick] = useState(0); 
  const [splitRatioState, setSplitRatioState] = useState({ isOncology: false, isRandD: false, opacity: 0 });

  const simulationRef = useRef(null);
  const nodesRef = useRef([]);
  const top5MapRef = useRef(new Map());
  const timerRef = useRef(null);
  const timerRef2 = useRef(null);
  const gradientRatiosRef = useRef(new Map());
  const prevProps = useRef({ isBig, isRed, isSplit, isOncology, isRandD });
  const isTransitioningRef = useRef(false);

  // Fetch CSV once
  useEffect(() => {
    let ignore = false;
    d3.csv('/pharma_ranking_2025_cleaned.csv').then((data) => {
      if (ignore) return;
      const formatted = data.map((d) => ({
        ...d,
        sales: +d.sales_million_yen,
        rd: d.rd_million_yen ? +d.rd_million_yen : 0,
      }));
      setCsvData(formatted);
    });
    return () => { ignore = true; };
  }, []);

  // Compute layout parameters derived from dimensions and data
  const layoutParams = useMemo(() => {
    if (!csvData.length || !width || !height) return null;
    
    const h1Element = document.querySelector('h1');
    const titleHeight = h1Element ? h1Element.offsetHeight + 20 : 70;
    const titleBottom = titleHeight + 1;
    const availableWidth = width * 0.92;
    const availableHeight = height - titleBottom - 80;
    const dotCenterY = titleBottom + Math.min(width, height) * 0.4;
    const padding = 14;

    const maxSales = d3.max(csvData, (d) => d.sales);
    const minSize = Math.min(width, height) * 0.01;
    const maxSize = Math.min(width, height) * 0.1;
    const sizeScale = d3.scaleSqrt().domain([0, maxSales]).range([minSize, maxSize]);

    const top5Data = TOP5.map((name) => csvData.find((d) => d.company === name)).filter(Boolean);
    const baseDiameterSum = top5Data.reduce((sum, d) => sum + sizeScale(d.sales) * 2, 0);
    const basePaddingSum = padding * (top5Data.length - 1);
    const maxBaseDiameter = d3.max(top5Data, d => sizeScale(d.sales)) * 2;
    
    const widthScale = (availableWidth - basePaddingSum) / baseDiameterSum;
    const heightScale = availableHeight / maxBaseDiameter;
    const bigScale = Math.min(3.5, widthScale, heightScale * 0.7);

    const getBigR = (d) => sizeScale(d.sales) * bigScale;

    const centerY = height * 0.52;
    const radii = top5Data.map((d) => getBigR(d));
    const totalWidth = radii.reduce((sum, r) => sum + r * 2, 0) + padding * (top5Data.length - 1);
    let startX = (width - totalWidth) / 2;
    
    const top5Positions = top5Data.map((d, i) => {
      const r = radii[i];
      const x = startX + r;
      startX += r * 2 + padding;
      return { company: d.company, x, y: centerY, r };
    });

    return { titleBottom, dotCenterY, sizeScale, getBigR, top5Positions, top5Data };
  }, [csvData, width, height]);

  // Setup / Reset Simulation when Data or Dimensions change
  useEffect(() => {
    if (!layoutParams) return;

    if (simulationRef.current) simulationRef.current.stop();
    if (timerRef.current) timerRef.current.stop();
    if (timerRef2.current) timerRef2.current.stop();

    const { dotCenterY, titleBottom, sizeScale, top5Positions } = layoutParams;
    const top5Map = new Map(top5Positions.map(p => [p.company, p]));
    top5MapRef.current = top5Map;

    const nodes = csvData.map(d => ({ ...d, baseR: sizeScale(d.sales) }));
    nodesRef.current = nodes;

    const asterias = nodes.find((d) => d.company === 'アステラス製薬');
    if (asterias) {
      asterias.fx = width / 2;
      asterias.fy = height / 2;
    }

    const simulation = d3.forceSimulation(nodes)
      .force('charge', d3.forceManyBody().strength(-5))
      .force('center', d3.forceCenter(width / 2, dotCenterY))
      .force('collide', d3.forceCollide().radius((d) => d.baseR + 2))
      .alphaDecay(0.05);

    const yMin = titleBottom + 5;
    const yMax = height - 20;

    if (prevProps.current.isBig) {
      simulation.tick(150); 
      nodes.forEach(d => {
        d.x = Math.max(d.baseR, Math.min(width - d.baseR, d.x));
        d.y = Math.max(yMin + d.baseR, Math.min(yMax - d.baseR, d.y));
        d.ix = d.x; d.iy = d.y; 
        
        if (top5Map.has(d.company)) {
          const p = top5Map.get(d.company);
          d.renderX = p.x; d.renderY = p.y; d.renderR = p.r; d.renderOpacity = 1;
        } else {
          d.renderOpacity = 0; d.renderR = 0;
        }
      });
      simulation.stop();
    }

    simulation.on('tick', () => {
      if (!prevProps.current.isBig && !isTransitioningRef.current) {
        nodes.forEach(d => {
          d.x = Math.max(d.baseR, Math.min(width - d.baseR, d.x));
          d.y = Math.max(yMin + d.baseR, Math.min(yMax - d.baseR, d.y));
        });
        setTick(t => t + 1); 
      }
    });

    simulationRef.current = simulation;

    setSplitRatioState({ isOncology: prevProps.current.isOncology, isRandD: prevProps.current.isRandD, opacity: prevProps.current.isSplit ? 1 : 0 });

    return () => {
      simulation.stop();
      if (timerRef.current) timerRef.current.stop();
      if (timerRef2.current) timerRef2.current.stop();
    };
  }, [layoutParams, width, height]);

  // Transition Engine
  useEffect(() => {
    if (!layoutParams || !nodesRef.current.length) return;
    const nodes = nodesRef.current;
    const simulation = simulationRef.current;
    const p = prevProps.current;

    const isBigChanged = isBig !== p.isBig;
    const isSplitChanged = isSplit !== p.isSplit;
    const isOncologyChanged = isOncology !== p.isOncology;
    const isRandDChanged = isRandD !== p.isRandD;
    const isPieDataChanged = isOncologyChanged || isRandDChanged;

    if (isBigChanged) {
      if (timerRef.current) timerRef.current.stop();
      isTransitioningRef.current = true;
      
      nodes.forEach(d => {
        d.startX = d.renderX !== undefined ? d.renderX : d.x;
        d.startY = d.renderY !== undefined ? d.renderY : d.y;
        d.startR = d.renderR !== undefined ? d.renderR : d.baseR;
        d.startOpacity = d.renderOpacity !== undefined ? d.renderOpacity : 1;
        
        if (isBig) {
          if (d.ix == null) d.ix = d.x;
          if (d.iy == null) d.iy = d.y;
          
          const target = top5MapRef.current.get(d.company);
          d.targetX = target ? target.x : d.x;
          d.targetY = target ? target.y : d.y;
          d.targetR = target ? target.r : 0;
          d.targetOpacity = target ? 1 : 0;
        } else {
          d.targetX = d.ix != null ? d.ix : d.x;
          d.targetY = d.iy != null ? d.iy : d.y;
          d.targetR = d.baseR;
          d.targetOpacity = 1;
        }
      });

      if (isBig) {
        simulation.stop();
      } else {
        simulation.stop();
        nodes.forEach(d => { d.fx = null; d.fy = null; });
        const astellasNode = nodes.find((d) => d.company === 'アステラス製薬');
        if (astellasNode) {
          astellasNode.fx = width / 2;
          astellasNode.fy = height / 2;
        }
      }

      timerRef.current = d3.timer((elapsed) => {
        const duration = isBig ? 1200 : 800;
        const t = Math.min(1, elapsed / duration);
        const easeT = d3.easeCubicOut(t);
        
        nodes.forEach(d => {
          d.renderX = d.startX + (d.targetX - d.startX) * easeT;
          d.renderY = d.startY + (d.targetY - d.startY) * easeT;
          d.renderR = d.startR + (d.targetR - d.startR) * easeT;
          d.renderOpacity = d.startOpacity + (d.targetOpacity - d.startOpacity) * easeT;
        });
        
        setTick(tick => tick + 1);
        
        if (t === 1) {
          timerRef.current.stop();
          isTransitioningRef.current = false;
          if (!isBig) {
             // Restart layout seamlessly
            nodes.forEach(n => {
              n.x = n.targetX; n.y = n.targetY;
              n.renderX = undefined; n.renderY = undefined; n.renderR = undefined; n.renderOpacity = undefined;
            });
            if (simulationRef.current) simulationRef.current.alpha(0.05).restart();
          } else {
            // Keep the override rendered properties locked into exactly their grid targets
            nodes.forEach(n => {
              n.renderX = n.targetX; n.renderY = n.targetY; n.renderR = n.targetR; n.renderOpacity = n.targetOpacity;
            });
          }
        }
      });
    }

    if (isPieDataChanged && isSplit && !isBigChanged) {
      if (timerRef2.current) timerRef2.current.stop();

      const targets = layoutParams.top5Positions.map(pos => {
        const oldRatio = p.isRandD ? (rdData[pos.company] || 0) : (p.isOncology ? (oncologyData[pos.company] || 0) : (overseasData[pos.company] || 0));
        const newRatio = isRandD ? (rdData[pos.company] || 0) : (isOncology ? (oncologyData[pos.company] || 0) : (overseasData[pos.company] || 0));
        return {
          company: pos.company,
          start: gradientRatiosRef.current.get(pos.company) ?? oldRatio,
          end: newRatio
        };
      });

      timerRef2.current = d3.timer(elapsed => {
        const duration = 1000;
        const t = Math.min(1, elapsed / duration);
        const easeT = d3.easeCubicOut(t);

        targets.forEach(item => {
          gradientRatiosRef.current.set(item.company, item.start + (item.end - item.start) * easeT);
        });

        setTick(tick => tick + 1);

        if (t === 1) timerRef2.current.stop();
      });

      setSplitRatioState(s => ({ ...s, opacity: 0 }));
      const id = setTimeout(() => {
        setSplitRatioState({ isOncology, isRandD, opacity: 1 });
      }, 500);
      
      prevProps.current = { isBig, isRed, isSplit, isOncology, isRandD };
      return () => {
        clearTimeout(id);
        if (timerRef2.current) timerRef2.current.stop();
      };
    } else {
      setSplitRatioState({ isOncology, isRandD, opacity: isSplit ? 1 : 0 });
    }

    prevProps.current = { isBig, isRed, isSplit, isOncology, isRandD };
  }, [isBig, isRed, isSplit, isOncology, isRandD, layoutParams]);

  return {
    nodes: nodesRef.current,
    layoutParams,
    csvData,
    gradientRatiosRef,
    splitRatioState,
    top5Map: top5MapRef.current
  };
};
