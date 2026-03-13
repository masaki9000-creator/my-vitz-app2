import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3'; const SimpleStarChart = () => {
  const svgRef = useRef(null);
  const tooltipRef = useRef(null);
  const nodesRef = useRef(null);
  const simulationRef = useRef(null);
  const formattedDataRef = useRef(null);
  const calcTop5PositionsRef = useRef(null);
  const getBigRRef = useRef(null);

  const scrollProgressRef = useRef(0);
  const isBigRef = useRef(false);
  const isRedRef = useRef(false);
  const isSplitRef = useRef(false);
  const isOncologyRef = useRef(false);

  // Math helper: find x offset (p in [-1, 1]) such that left spherical cap area = targetRatio
  const getCutoffP = (targetRatio) => {
    if (targetRatio <= 0) return -1;
    if (targetRatio >= 1) return 1;
    let low = -1, high = 1, mid;
    for (let i = 0; i < 20; i++) {
      mid = (low + high) / 2;
      const currentRatio = (Math.asin(mid) + mid * Math.sqrt(1 - mid * mid) + Math.PI / 2) / Math.PI;
      if (currentRatio < targetRatio) low = mid; else high = mid;
    }
    return mid;
  };

  const overseasData = {
    '武田薬品工業': 0.909,
    'アステラス製薬': 0.86,
    '大塚HD': 0.70,
    '第一三共': 0.69,
    '中外製薬': 0.604
  };

  const companyShortNames = {
    'アステラス製薬': 'Astellas',
    '武田薬品工業': 'Takeda',
    '大塚HD': 'Otsuka',
    '第一三共': 'Daiichi Sankyo',
    '中外製薬': 'Chugai'
  };

  const oncologyData = {
    '武田薬品工業': 0.11,
    'アステラス製薬': 0.57,
    '大塚HD': 0.10,
    '第一三共': 0.49,
    '中外製薬': 0.27
  };

  const rdData = {
    '武田薬品工業': 0.159,
    'アステラス製薬': 0.171,
    '大塚HD': 0.135,
    '第一三共': 0.229,
    '中外製薬': 0.155
  };

  const [dimensions, setDimensions] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };

    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const scrolled = docHeight > 0 ? scrollTop / docHeight : 0;
      setScrollProgress(scrolled);
      scrollProgressRef.current = scrolled;
    };

    handleScroll();

    window.addEventListener('resize', handleResize);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

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

      // 上位5社（左から大きい順）
      const TOP5 = ['武田薬品工業', '大塚HD', 'アステラス製薬', '第一三共', '中外製薬'];

      const asterias = formattedData.find((d) => d.company === 'アステラス製薬');
      if (asterias) {
        asterias.fx = width / 2;
        asterias.fy = height / 2;
      }

      const maxSales = d3.max(formattedData, (d) => d.sales);
      const minSize = Math.min(width, height) * 0.01;
      const maxSize = Math.min(width, height) * 0.1;
      const sizeScale = d3.scaleSqrt()
        .domain([0, maxSales])
        .range([minSize, maxSize]);

      // isBigフェーズ: 5社が画面幅に収まるよう動的にスケールを計算
      // 5社の売上に基づく相対的な半径を計算
      const top5Data = TOP5.map((name) => formattedData.find((d) => d.company === name)).filter(Boolean);

      // まずsizeScaleによる各社の基本半径を算出
      // 5社の直径合計 + padding（5-1=4個）が画面幅の92%に収まるようbigScaleを計算
      const padding = 14;
      const availableWidth = width * 0.92;
      const availableHeight = height - titleBottom - 80; // Ensure enough vertical room for titles + text

      const baseDiameterSum = top5Data.reduce((sum, d) => sum + sizeScale(d.sales) * 2, 0);
      const basePaddingSum = padding * (top5Data.length - 1);
      const maxBaseDiameter = d3.max(top5Data, d => sizeScale(d.sales)) * 2;

      const widthScale = (availableWidth - basePaddingSum) / baseDiameterSum;
      const heightScale = availableHeight / maxBaseDiameter;

      // Take the minimum of width scaling, height scaling (reduced by 0.7 for text headroom), or max absolute scale
      const bigScale = Math.min(3.5, widthScale, heightScale * 0.7);

      // 各社のbigR = sizeScale(sales) * bigScale
      const getBigR = (d) => sizeScale(d.sales) * bigScale;
      getBigRRef.current = getBigR;

      const initialIsRed = scrollProgressRef.current >= 0.1;
      const initialIsBig = scrollProgressRef.current >= 0.25;
      const initialIsSplit = scrollProgressRef.current >= 0.45;
      const initialIsOncology = scrollProgressRef.current >= 0.65;
      const initialIsRandD = scrollProgressRef.current >= 0.85;

      // 5社の横並び目標位置を計算（左から大きい順）
      const calcTop5Positions = () => {
        const centerY = height * 0.52;
        // 各社のビッグ半径
        const radii = top5Data.map((d) => getBigR(d));
        // 左端から配置
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

      const dotCenterY = titleBottom + Math.min(width, height) * 0.4;
      const simulation = d3.forceSimulation(formattedData)
        .force('charge', d3.forceManyBody().strength(-5))
        .force('center', d3.forceCenter(width / 2, dotCenterY))
        .force('collide', d3.forceCollide().radius((d) => sizeScale(d.sales) + 2))
        .alphaDecay(0.05);

      if (initialIsBig) {
        simulation.stop();
        // Snap nodes directly to their positions so they don't float around on resize
        formattedData.forEach(d => {
          if (top5Map.has(d.company)) {
            const p = top5Map.get(d.company);
            d.x = p.x;
            d.y = p.y;
            d.ix = p.x;
            d.iy = p.y;
          }
        });
      }

      simulationRef.current = simulation;
      formattedDataRef.current = formattedData;

      // Text is now handled by React DOM overlay.

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

      // Variables moved up for ReferenceError fix.

      // Define soft linear gradients for each company's overseas split area
      const blurWidth = 0.5; // Controls the softness of the gradient edge (narrowed)
      top5Positions.forEach(pos => {
        const ratio = (initialIsRandD ? rdData[pos.company] : (initialIsOncology ? oncologyData[pos.company] : overseasData[pos.company])) || 0.5;
        const p = getCutoffP(ratio); // between -1 and 1
        const p_pct = ((p + 1) / 2) * 100; // Convert to 0-100%

        const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');
        const gradId = `grad-${cleanId}`;
        const grad = defs.append('linearGradient')
          .attr('id', gradId)
          .attr('x1', '0%').attr('y1', '0%')
          .attr('x2', '100%').attr('y2', '0%');

        const isAstellas = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
        const fgColor = isAstellas ? '#e53835bb' : '#9e9e9e'; // Overseas color
        const bgColor = isAstellas ? '#f8bbd0' : '#e0e0e0';   // Domestic color

        // Create a dual-stop gradient to make a soft dividing line exactly at p_pct
        grad.append('stop')
          .attr('offset', `${Math.max(0, p_pct - blurWidth)}%`)
          .attr('stop-color', fgColor);

        grad.append('stop')
          .attr('offset', `${Math.min(100, p_pct + blurWidth)}%`)
          .attr('stop-color', bgColor);
      });

      // Create groups in z-index order (nodes first, then top5 on top)
      const nodesGroup = svg.append('g').attr('class', 'nodes-group');

      // TOP5 dedicated SVG group (static, independent from force simulation)
      const top5BigGroup = svg.append('g')
        .attr('class', 'top5-big-group')
        .attr('opacity', initialIsBig ? 1 : 0)
        .style('pointer-events', 'none');

      top5Positions.forEach((pos) => {
        const companyData = formattedData.find((d) => d.company === pos.company);
        if (!companyData) return;
        const salesB = Math.round(companyData.sales / 100).toLocaleString();
        const isAstellas = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
        const shortName = companyShortNames[pos.company] || pos.company;
        const cleanId = (companyShortNames[pos.company] || 'other').replace(/\s+/g, '');

        const dotG = top5BigGroup.append('g')
          .attr('class', `top5-big-${cleanId}`)
          .attr('transform', `translate(${pos.x}, ${pos.y})`);

        // Add Gradient split circle
        const gradId = `grad-${cleanId}`;
        dotG.append('circle')
          .attr('class', 'split-bg-circle')
          .attr('r', pos.r)
          .attr('fill', `url(#${gradId})`)
          .attr('opacity', initialIsSplit ? 1 : 0);

        const ratio = (initialIsRandD ? rdData[pos.company] : (initialIsOncology ? oncologyData[pos.company] : overseasData[pos.company])) || 0;
        const ratioPercent = (ratio * 100).toFixed(1);
        const p = getCutoffP(ratio); // between -1 and 1

        // Calculate a uniform font size so all companies look consistent regardless of their circle size
        const uniformBaseSize = Math.min(width, height) * 0.02; // e.g. ~16px on a 800px high screen

        // Ratio text inside the pie, centered on the filled area or left-aligned if small
        const textAnchor = ratio < 0.3 ? 'start' : 'middle';
        const textX = ratio < 0.3 ? -pos.r + pos.r * 0.15 : pos.r * (p - 1) / 2;
        const ratioFontSize = uniformBaseSize * 1.5; // Make the ratio a bit larger, but perfectly uniform across all dots
        dotG.append('text')
          .attr('class', 'split-ratio-text')
          .attr('text-anchor', textAnchor)
          .attr('fill', '#ffffff')
          .style('paint-order', 'stroke fill')
          .attr('stroke', 'rgba(0, 0, 0, 0.25)')
          .attr('stroke-width', '2px')
          .attr('stroke-linejoin', 'round')
          .attr('font-family', "'Georgia', serif")
          .attr('font-size', `${ratioFontSize}px`)
          .attr('font-weight', 'bold')
          .attr('x', textX)
          .attr('y', '0.3em')
          .attr('opacity', initialIsSplit ? 1 : 0)
          .text(`${ratioPercent}%`);

        // Company name label (above dot)
        const companyFontSize = uniformBaseSize * 1.25;
        dotG.append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', isAstellas ? '#ff9999' : '#aaaaaa')
          .attr('font-family', "'Georgia', serif")
          .attr('font-size', `${companyFontSize}px`)
          .attr('font-weight', '300')
          .attr('y', -pos.r - companyFontSize * 1.5) // Moved closer to revenue
          .text(shortName);

        // Revenue label (just above dot)
        const revenueFontSize = uniformBaseSize * 0.95;
        dotG.append('text')
          .attr('text-anchor', 'middle')
          .attr('fill', '#ffffff')
          .attr('font-family', "'Georgia', serif")
          .attr('font-size', `${revenueFontSize}px`)
          .attr('font-weight', 'bold')
          .attr('y', -pos.r - companyFontSize * 0.5) // Kept relative spacing tight
          .text(`\u00a5${salesB}B`);
      });



      const nodes = nodesGroup
        .selectAll('circle')
        .data(formattedData)
        .enter()
        .append('circle')
        .attr('class', (d) => {
          if (d.company === 'アステラス製薬') return 'astellas-dot top5-dot';
          if (top5Map.has(d.company)) return 'top5-dot other-dot';
          return 'other-dot';
        })
        .attr('r', (d) => {
          d.baseR = sizeScale(d.sales);
          const isTop5 = top5Map.has(d.company);
          if (initialIsBig && isTop5) {
            return getBigR(d);
          } else if (initialIsBig) {
            return 0;
          }
          return d.baseR;
        })
        .attr('fill', (d) => {
          if (d.company === 'アステラス製薬' && initialIsRed) return '#ff6666';
          return '#ffffff';
        })
        .attr('stroke', 'none')
        .attr('opacity', (d) => {
          const isTop5 = top5Map.has(d.company);
          if (initialIsBig && isTop5) return 1.0;
          return initialIsBig ? 0 : 1.0;
        })
        .attr('filter', (d) => (d.company === 'アステラス製薬' && initialIsRed) ? 'url(#redGlow)' : 'url(#glow)')
        .style('cursor', 'pointer')
        .style('pointer-events', () => {
          return initialIsBig ? 'none' : 'auto';
        })
        .on('mouseover', (event, d) => {
          if (scrollProgressRef.current >= 0.25) return;
          d3.select(event.currentTarget).attr('fill', '#cce6ff').attr('opacity', 1);
          tooltip.style('opacity', 1)
            .html(`<strong>${d.company_en || d.company}</strong><br/><span style="font-size: 12px; color: #ccc;">Revenue: ¥${Math.round(d.sales / 100).toLocaleString()}B</span>`);
        })
        .on('mousemove', (event) => {
          tooltip.style('left', `${event.clientX + 15}px`).style('top', `${event.clientY - 25}px`);
        })
        .on('mouseout', (event, d) => {
          if (scrollProgressRef.current >= 0.25) return;
          const isRed = scrollProgressRef.current >= 0.1;
          const isBig = scrollProgressRef.current >= 0.25;
          const isTop5 = top5Map.has(d.company);

          let targetOpacity = 1.0;
          if (isBig && !isTop5) {
            targetOpacity = 0;
          } else if (isSplitRef.current && isTop5) {
            targetOpacity = 0; // Fixes the bug where mouseout turns the split-pie back to a solid dot
          }

          d3.select(event.currentTarget)
            .attr('fill', (d.company === 'アステラス製薬' && isRed) ? '#ff6666' : '#ffffff')
            .attr('opacity', targetOpacity);
          tooltip.style('opacity', 0);
        });

      nodesRef.current = nodes;


      // The redundant top5Labels D3 group was completely removed.

      const yMin = titleBottom + 5;
      const yMax = height - 20;

      // TOP5判定用のMap（tick内でも参照するため外側で定義）
      const top5DataCompanies = new Set(TOP5);

      simulation.on('tick', () => {
        const isBigNow = scrollProgressRef.current >= 0.25;

        if (isBigNow) {
          // isBig時: SVG nodes are hidden (opacity: 0). Just update without bounds if tick fires.
          nodes.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
        } else {
          // 通常時: 全ノードを境界内にクランプ
          nodes
            .attr('cx', (d) => (d.x = Math.max(sizeScale(d.sales), Math.min(width - sizeScale(d.sales), d.x))))
            .attr('cy', (d) => (d.y = Math.max(yMin + sizeScale(d.sales), Math.min(yMax - sizeScale(d.sales), d.y))));
        }


      });

    }).catch((error) => {
      console.error('CSV Load Error:', error);
    });

    return () => {
      ignore = true;
      if (simulationRef.current) {
        simulationRef.current.stop();
      }
      svg.selectAll('*').remove();
    };
  }, [dimensions]);

  useEffect(() => {
    if (!svgRef.current) return;

    const isRed = scrollProgress >= 0.1;
    const isBig = scrollProgress >= 0.25;
    const isSplit = scrollProgress >= 0.45;
    const isOncology = scrollProgress >= 0.65;
    const isRandD = scrollProgress >= 0.85;
    const svg = d3.select(svgRef.current);

    // Simulation control - only act on state CHANGE to avoid restarting every scroll event
    const simulation = simulationRef.current;
    const formattedData = formattedDataRef.current;
    const prevIsBig = isBigRef.current;
    const prevIsRed = isRedRef.current;
    const prevIsSplit = isSplitRef.current;
    const prevIsOncology = isOncologyRef.current;

    // Use a top level local var, we don't strictly need a ref if we just compare to a lazily added ref, but let's add it properly.
    if (!svg.node()._prevIsRandD) svg.node()._prevIsRandD = false;
    const prevIsRandD = svg.node()._prevIsRandD;

    // Update ref state
    isBigRef.current = isBig;
    isRedRef.current = isRed;
    isSplitRef.current = isSplit;
    isOncologyRef.current = isOncology;
    svg.node()._prevIsRandD = isRandD;

    const isBigChanged = isBig !== prevIsBig;
    const isSplitChanged = isSplit !== prevIsSplit;
    const isOncologyChanged = isOncology !== prevIsOncology;
    const isRandDChanged = isRandD !== prevIsRandD;

    const isPieDataChanged = isOncologyChanged || isRandDChanged;

    if (isPieDataChanged && isSplit && !isBigChanged) {
      // Animate the gradient and text switching while staying in split state
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
            const isAstellas = pos.company === '\u30a2\u30b9\u30c6\u30e9\u30b9\u88fd\u85ac';
            const fgColor = isAstellas ? '#e53835bb' : '#9e9e9e'; // Overseas color
            const bgColor = isAstellas ? '#f8bbd0' : '#e0e0e0';   // Domestic color
            d3.select(this).attr('stop-color', i === 0 ? fgColor : bgColor);
            return i === 0 ? `${Math.max(0, p_pct - blurWidth)}%` : `${Math.min(100, p_pct + blurWidth)}%`;
          });

        const textG = svg.select(`.top5-big-${cleanId}`);
        textG.select('.split-ratio-text')
          .transition().duration(500).attr('opacity', 0)
          .on('end', function () {
            // Recenter the text based on the new filled area
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

    if (simulation && isBigChanged) {
      if (isBig) {
        // Stop simulation when entering big phase
        simulation.stop();
        // Capture tight cluster positions before morphing out
        if (formattedData) {
          formattedData.forEach((d) => {
            if (d.ix == null) d.ix = d.x;
            if (d.iy == null) d.iy = d.y;
          });
        }
      } else {
        // Keep simulation stopped so it doesn't fight the return transition
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

    // Force sim nodes: morph top 5 to their final horizontal positions
    if (isBigChanged || isSplitChanged) {
      const positions = calcTop5PositionsRef.current ? calcTop5PositionsRef.current() : [];
      const posMap = new Map(positions.map((p) => [p.company, p]));

      const nodes = svg.selectAll('.other-dot, .astellas-dot').interrupt();

      if (isBig) {
        nodes.transition()
          .duration(1200) // smooth morph
          .ease(d3.easeCubicOut)
          .attr('cx', (d) => {
            const pos = posMap.get(d.company);
            return pos ? pos.x : d.x;
          })
          .attr('cy', (d) => {
            const pos = posMap.get(d.company);
            return pos ? pos.y : d.y;
          })
          .attr('r', (d) => {
            const pos = posMap.get(d.company);
            return pos ? pos.r : 0;
          })
          .attr('opacity', (d) => posMap.has(d.company) ? 1.0 : 0)
          .style('pointer-events', (d) => posMap.has(d.company) ? 'auto' : 'none');

        // Fade in/out the split chart components
        svg.selectAll('.split-bg-circle, .split-ratio-text')
          .interrupt()
          .transition()
          .delay(isSplit ? 200 : 0)
          .duration(800)
          .attr('opacity', isSplit ? 1.0 : 0);
      } else {
        // Restore d.x and d.y to captured tight positions
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

        svg.selectAll('.split-bg-circle, .split-ratio-text')
          .interrupt()
          .attr('opacity', 0);

        setTimeout(() => {
          if (simulationRef.current && !isBigRef.current) {
            simulationRef.current.alpha(0.05).restart();
          }
        }, 850);
      }
    }

    // Astellas color update - smooth gradient from white to red as user scrolls between 0.1 and 0.2
    {
      const redStart = 0.09;
      const redEnd = 0.15
      const t = Math.max(0, Math.min(1, (scrollProgress - redStart) / (redEnd - redStart)));
      const astellasColor = d3.interpolateRgb('#ffffff', '#ff6666')(t);
      const glowOpacity = t; // fade glow in progressively too

      svg.selectAll('.astellas-dot')
        .attr('fill', astellasColor)
        .attr('filter', 'url(#redGlow)')
        .style('filter', t > 0 ? `url(#redGlow)` : 'url(#glow)')
        .attr('opacity', (d) => {
          // keep opacity as-is; just color change
          return isBig ? (isRed ? 1.0 : 0) : 1.0;
        });
    }

    // top5BigGroup opacity
    if (isBigChanged) {
      svg.selectAll('.top5-big-group')
        .interrupt()
        .transition()
        .delay(isBig ? 800 : 0) // wait for main circle morph to nearly finish
        .duration(isBig ? 500 : 200)
        .attr('opacity', isBig ? 1 : 0);
    }


  }, [scrollProgress, dimensions.width, dimensions.height]);

  return (
    <div style={{ position: 'relative', width: '100vw', minHeight: '750vh' }}>
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'fixed', top: '20px', left: 0, right: 0, zIndex: 100, textAlign: 'center' }}>
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
        <svg ref={svgRef} style={{ display: 'block', pointerEvents: 'auto' }}></svg>
      </div>

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
      <div
        ref={tooltipRef}
        style={{
          position: 'fixed', opacity: 0, background: 'rgba(10, 15, 30, 0.9)',
          padding: '10px 15px', border: '1px solid #445588', borderRadius: '6px',
          pointerEvents: 'none', color: '#fff', fontSize: '14px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.5)', transition: 'opacity 0.2s ease', zIndex: 10,
        }}
      ></div>
    </div>
  );
};

export default SimpleStarChart;