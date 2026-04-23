import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { hexbin } from 'd3-hexbin';
import './ProductsUnderDevelopment.css';

const pipelineData = [
  { name: "BlueStar Japan", focus: "NA", area: "Diabetes", disease: "Digital therapeutic for the management of diabetes", modality: "Digital therapeutic", phase: "Pivotal study (Japan)" },
  { name: "ASP5502", focus: "NA", area: "Immunology", disease: "Primary Sjogren's syndrome", modality: "Small molecule", phase: "1" },
  { name: "roxadustat", focus: "NA", area: "Nephrology", disease: "Anemia associated with chronic kidney disease in pediatric patients", modality: "Small molecule", phase: "3" },
  { name: "ASP1002", focus: "Immuno-Oncology", area: "Oncology", disease: "Cancer", modality: "Antibody", phase: "1" },
  { name: "ASP1570", focus: "Immuno-Oncology", area: "Oncology", disease: "Cancer", modality: "Small molecule", phase: "1" },
  { name: "ASP2138", focus: "Immuno-Oncology", area: "Oncology", disease: "Gastric and gastroesophageal junction adenocarcinoma, pancreatic adenocarcinoma", modality: "Antibody", phase: "1" },
  { name: "ASP3082", focus: "Targeted Protein Degradation", area: "Oncology", disease: "Cancer", modality: "Small molecule", phase: "1" },
  { name: "ASP546C/XNW27011", focus: "NA", area: "Oncology", disease: "Cancer", modality: "Antibody-drug conjugate (ADC)", phase: "1" },
  { name: "ASP5834", focus: "Targeted Protein Degradation", area: "Oncology", disease: "Cancer", modality: "Small molecule", phase: "1" },
  { name: "ASP5541 (PRL-02)", focus: "NA", area: "Oncology", disease: "Prostate cancer", modality: "Small molecule", phase: "1" },
  { name: "PADCEV", focus: "NA", area: "Oncology", disease: "Cisplatin-eligible muscle-invasive bladder cancer (combo with pembrolizumab)", modality: "Antibody-drug conjugate (ADC)", phase: "2" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "ALK-positive non-small cell lung cancer", modality: "Small molecule", phase: "3" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "Post-chemotherapy maintenance acute myeloid leukemia", modality: "Small molecule", phase: "1" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "Post-hematopoietic stem cell transplant maintenance acute myeloid leukemia", modality: "Small molecule", phase: "3" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "myeloid leukemia with high intensity induction of chemotherapy", modality: "Small molecule", phase: "3" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "Newly diagnosed acute myeloid leukemia with low intensity induction of chemotherapy", modality: "Small molecule", phase: "3" },
  { name: "XOSPATA", focus: "NA", area: "Oncology", disease: "Acute myeloid leukemia in pediatric patients", modality: "Small molecule", phase: "3" },
  { name: "VYLOY", focus: "NA", area: "Oncology", disease: "Gastric and gastroesophageal junction adenocarcinoma (combo with pembrolizumab and chemotherapy)", modality: "Antibody", phase: "3" },
  { name: "ASP7317", focus: "Blindness and Regeneration", area: "Ophthalmology", disease: "Geographic atrophy secondary to age-related macular degeneration", modality: "Cell therapy", phase: "1" },
  { name: "ASP5354", focus: "NA", area: "Other", disease: "Intraoperative ureter visualization for use in patients undergoing minimally invasive and open abdominopelvic surgeries", modality: "-", phase: "3" },
  { name: "AT132", focus: "Genetic Regulation", area: "Rare Diseases", disease: "X-linked myotubular myopathy", modality: "Gene therapy", phase: "2" },
  { name: "AT845", focus: "Genetic Regulation", area: "Rare Diseases", disease: "Pompe disease", modality: "Gene therapy", phase: "2" },
  { name: "Akyva", focus: "NA", area: "Urology", disease: "Implantable device for underactive bladder", modality: "-", phase: "Early feasibility study" },
  { name: "mirabegron", focus: "NA", area: "Urology", disease: "Neurogenic detrusor overactivity in pediatric patients (aged 6 months to less than 3 years)", modality: "Small molecule", phase: "3" },
  { name: "VEOZAH", focus: "NA", area: "Women's health", disease: "Vasomotor symptoms in breast cancer patients on adjuvant endocrine therapy", modality: "Small molecule", phase: "3" }
];

// Sort the data so items with the same Primary Focus (or same name for NA) are physically adjacent
const sortedPipelineData = [...pipelineData].sort((a, b) => {
  const aFocus = a.focus === "NA" ? "ZZZ" : a.focus;
  const bFocus = b.focus === "NA" ? "ZZZ" : b.focus;
  if (aFocus !== bFocus) return aFocus.localeCompare(bFocus);
  return a.name.localeCompare(b.name);
});

const HexbinChart = ({ width, height, setTooltip, scrollPhase }) => {
  const svgRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const highlightPhaseRef = useRef(scrollPhase);

  useEffect(() => {
    highlightPhaseRef.current = scrollPhase;
  }, [scrollPhase]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    if (svgRef.current) {
      observer.observe(svgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !width || !height || !isVisible) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    // Define safe area
    const safeTop = 90; 
    const safeBottom = 300; 
    const safeHeight = Math.max(height - safeTop - safeBottom, 300);
    const cx = width / 2;
    const cy = safeTop + safeHeight / 2;

    const r = Math.max(Math.min(width * 0.042, height * 0.052), 10); 
    const hexbinGenerator = hexbin().radius(r);

    // Dynamically calculate spread to ensure clusters stay within screen bounds
    const hexWidth = Math.sqrt(3) * r;
    const hexHeight = 1.5 * r;

    // Explicitly define a scattered, organic layout with guaranteed gaps between different Focus groups
    // This perfectly aligns to the hex grid to ensure the "honeycomb" (蜂の巣) interlocking visual is maintained
    const layoutGroups = {
      "NA": [
        { row: -2, col: 2 }, { row: -2, col: 3 }, { row: -2, col: 4 },
        { row: -1, col: 2 }, { row: -1, col: 3 }, { row: -1, col: 4 }, { row: -1, col: 5 },
        { row: 0, col: 2 }, { row: 0, col: 3 }, { row: 0, col: 4 }, { row: 0, col: 5 }, { row: 0, col: 6 },
        { row: 1, col: 2 }, { row: 1, col: 3 }, { row: 1, col: 4 }, { row: 1, col: 5 },
        { row: 2, col: 3 } // 17 items, separated on the right
      ],
      "Immuno-Oncology": [
        { row: -2, col: -4 }, { row: -2, col: -3 }, 
        { row: -1, col: -4 } // 3 items, top-left
      ],
      "Targeted Protein Degradation": [
        { row: 0, col: -2 }, { row: 0, col: -1 } // 2 items, center-left
      ],
      "Genetic Regulation": [
        { row: 2, col: -3 }, { row: 2, col: -2 } // 2 items, bottom-left
      ],
      "Blindness and Regeneration": [
        { row: -2, col: -1 } // 1 item, top center-left
      ]
    };

    // Group the sorted data by Primary Focus
    const groupedData = {
      "Immuno-Oncology": [],
      "Targeted Protein Degradation": [],
      "Genetic Regulation": [],
      "Blindness and Regeneration": [],
      "NA": []
    };
    sortedPipelineData.forEach(item => {
      groupedData[item.focus].push(item);
    });

    const dataMap = new Map();
    // Map each group to its respective integer coordinates
    Object.keys(layoutGroups).forEach(groupName => {
      const groupData = groupedData[groupName];
      const groupLayout = layoutGroups[groupName];
      groupLayout.forEach((pos, i) => {
        dataMap.set(`${pos.row},${pos.col}`, groupData[i]);
      });
    });

    // Deterministic pseudo-random based on coordinates to create organic noise
    const seededRandom = (r, c) => {
      const seed = r * 1000 + c;
      const x = Math.sin(seed * 9999) * 10000;
      return x - Math.floor(x);
    };

    const bins = [];
    let index = 0;

    // Iterate over a much larger grid to create an irregular, sprawling background web
    for (let row = -7; row <= 7; row++) {
      for (let col = -12; col <= 12; col++) {
        // Average horizontal shift of the overall layout is roughly +0.25, subtracting it centers the whole nebula
        const xOffset = (row % 2 !== 0 ? 0.5 : 0) - 0.25; 
        const x = cx + (col + xOffset) * hexWidth;
        const y = cy + row * hexHeight;
        
        const data = dataMap.get(`${row},${col}`);
        
        // If it has data, ALWAYS include it.
        // If it's an empty background bin, decide whether to keep it based on a noisy distance function
        if (!data) {
          // Euclidean distance approximation (scaling row to match hex aspect ratio)
          const dist = Math.sqrt(Math.pow(col, 2) + Math.pow(row * 1.5, 2));
          const noise = seededRandom(row, col);
          
          // Organic threshold: Solid up to dist ~4, fading into jagged irregular edges up to dist ~12
          // This allows it to randomly overlap with the text boxes for a dynamic, sprawling effect.
          if (dist + noise * 8 > 12) {
             continue; // Skip this background cell, creating jagged edges and holes
          }
        }

        bins.push({ x, y, row, col, index: index++, data: data || null });
      }
    }

    // Sort bins so empty background cells are drawn first in SVG, 
    // ensuring the data bins' crisp borders overlap correctly.
    bins.sort((a, b) => {
      if (a.data && !b.data) return 1;
      if (!a.data && b.data) return -1;
      return 0;
    });

    const customColor = d3.scaleLinear()
      .domain([0, 0.33, 0.66, 1])
      .range(["#e6e6e0", "#fcae91", "#fb6a4a", "#a50f15"]);

    // Assign color based on Clinical Phase for meaningful data visualization
    bins.forEach((b, i) => {
      if (!b.data) return;
      let phaseVal = 0.1;
      const p = String(b.data.phase).toLowerCase();
      if (p.includes('3') || p.includes('pivotal')) phaseVal = 1.0;
      else if (p.includes('2')) phaseVal = 0.6;
      else if (p.includes('1')) phaseVal = 0.3;
      
      const pseudoRandom = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
      b.dummyValue = Math.max(0, Math.min(1, phaseVal * 0.8 + pseudoRandom * 0.2));
    });

    const paths = svg.append("g")
      .selectAll("path")
      .data(bins)
      .join("path")
      .attr("d", hexbinGenerator.hexagon())
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("fill", d => d.data ? customColor(d.dummyValue) : "rgba(255, 255, 255, 0.05)")
      .attr("stroke", d => d.data ? "#050510" : "rgba(255, 255, 255, 0.25)")
      .attr("stroke-width", d => d.data ? "2px" : "1px")
      .style("cursor", d => d.data ? "pointer" : "default");

    // Add Hover Interactions
    paths.on("mouseenter", (event, d) => {
      if (!d.data) return; // Do not trigger hover for empty filler bins

      d3.select(event.currentTarget)
        .transition().duration(200)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", "3px")
        .attr("transform", `translate(${d.x},${d.y}) scale(1.05)`)
        .attr("opacity", 1);
      
      // Display tooltip to the left or right of the hex.
      // If the node is on the right side of the screen, show tooltip on its left, and vice versa.
      const isRightSide = d.x > cx; 
      setTooltip({ 
        x: isRightSide ? d.x - r - 15 : d.x + r + 15, 
        y: d.y, 
        position: isRightSide ? 'left' : 'right',
        data: d.data 
      });
    }).on("mouseleave", (event, d) => {
      if (!d.data) return;

      const phase = highlightPhaseRef.current;
      d3.select(event.currentTarget)
        .transition().duration(200)
        .attr("stroke", () => {
           if (phase === 'NA' && d.data.focus === "NA") return "#ffffff";
           if (phase === 'focusArea' && d.data.focus !== "NA") return "#ffffff";
           return "#050510";
        })
        .attr("stroke-width", () => {
           if (phase === 'NA' && d.data.focus === "NA") return "2.5px";
           if (phase === 'focusArea' && d.data.focus !== "NA") return "2.5px";
           return "2px";
        })
        .attr("opacity", () => {
           if (phase === 'NA' && d.data.focus !== "NA") return 0.5;
           if (phase === 'focusArea' && d.data.focus === "NA") return 0.5;
           return 0.9;
        })
        .attr("transform", `translate(${d.x},${d.y}) scale(1)`);
      
      setTooltip(null);
    });

    if (!svgRef.current.hasAnimated) {
      paths.attr("opacity", 0)
        .transition()
        .duration((d, i) => 1200 + pseudoRandomDelay(i + 100) * 800)
        .delay((d, i) => pseudoRandomDelay(i) * 1500)
        .ease(d3.easeCubicInOut)
        .attr("opacity", 0.9);
      
      svgRef.current.hasAnimated = true;
      svgRef.current.isAnimatingInitial = true;
      setTimeout(() => {
        if (svgRef.current) svgRef.current.isAnimatingInitial = false;
      }, 3500); // 1200 + 800 + 1500 = 3500ms max duration
    } else {
      paths.attr("opacity", d => {
        if (highlightPhaseRef.current === 'NA' && (!d.data || d.data.focus !== "NA")) return 0.5;
        if (highlightPhaseRef.current === 'focusArea' && (!d.data || d.data.focus === "NA")) return 0.5;
        return 0.9;
      });
    }

  }, [width, height, isVisible]);

  // Update Highlight Effect
  useEffect(() => {
    if (!svgRef.current || !isVisible || !svgRef.current.hasAnimated) return;

    if (svgRef.current.isAnimatingInitial) {
      if (scrollPhase === 'none') {
        return; // Let the initial animation finish
      } else {
        svgRef.current.isAnimatingInitial = false;
        d3.select(svgRef.current).selectAll("path").interrupt(); // Cancel slow fade-in
      }
    }

    const svg = d3.select(svgRef.current);
    const paths = svg.selectAll("path");

    paths.transition("highlight").duration(800)
      .attr("stroke", d => {
        if (scrollPhase === 'NA' && d && d.data && d.data.focus === "NA") return "#ffffff";
        if (scrollPhase === 'focusArea' && d && d.data && d.data.focus !== "NA") return "#ffffff";
        return d && d.data ? "#050510" : "rgba(255, 255, 255, 0.25)";
      })
      .attr("stroke-width", d => {
        if (scrollPhase === 'NA' && d && d.data && d.data.focus === "NA") return "2.5px";
        if (scrollPhase === 'focusArea' && d && d.data && d.data.focus !== "NA") return "2.5px";
        return d && d.data ? "2px" : "1px";
      })
      .attr("opacity", d => {
        if (scrollPhase === 'NA' && (!d || !d.data || d.data.focus !== "NA")) return 0.5;
        if (scrollPhase === 'focusArea' && (!d || !d.data || d.data.focus === "NA")) return 0.5;
        return 0.9;
      });

    paths.style("filter", d => {
        if (scrollPhase === 'NA' && d && d.data && d.data.focus === "NA") return "drop-shadow(0px 0px 2px rgba(255,255,255,0.3))";
        if (scrollPhase === 'focusArea' && d && d.data && d.data.focus !== "NA") return "drop-shadow(0px 0px 2px rgba(255,255,255,0.3))";
        return "none";
    });
  }, [scrollPhase, isVisible]);

  const pseudoRandomDelay = (i) => Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1;

  return <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />;
};

const ProductsUnderDevelopment = () => {
  const containerRef = useRef(null);
  const stickyRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [tooltip, setTooltip] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [showTitle, setShowTitle] = useState(false);

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    
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

    window.addEventListener('scroll', handleScroll);
    handleScroll();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Hexbin animation takes 3500ms. We reveal the title box right after.
          setTimeout(() => {
            setShowTitle(true);
          }, 3800);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    if (stickyRef.current) observer.observe(stickyRef.current);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  let scrollPhase = 'none';
  if (scrollProgress >= 0.66) scrollPhase = 'focusArea';
  else if (scrollProgress >= 0.33) scrollPhase = 'NA';

  const { width, height } = dimensions;
  const safeTop = 90;
  const safeBottom = 300;
  const safeHeight = Math.max(height - safeTop - safeBottom, 300);
  const cx = width / 2;
  const cy = safeTop + safeHeight / 2;
  const r = Math.max(Math.min(width * 0.042, height * 0.052), 10);
  const hexWidth = Math.sqrt(3) * r;

  const textTop = cy - 4.5 * r;
  const naTextLeft = cx + 4.5 * hexWidth;
  const focusTextRight = cx + 5.5 * hexWidth;

  return (
    <div ref={containerRef} className="products-container" style={{ position: 'relative', width: '100vw', height: '900vh', padding: 0 }}>
      
      <div ref={stickyRef} style={{ position: 'sticky', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }}>
          <HexbinChart width={dimensions.width} height={dimensions.height} setTooltip={setTooltip} scrollPhase={scrollPhase} />
        </div>

        {/* Highlight Text Overlay: NA */}
        <div style={{
          position: 'absolute', top: textTop, left: naTextLeft,
          opacity: scrollPhase === 'NA' ? 1 : 0,
          transform: scrollPhase === 'NA' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          pointerEvents: 'none', zIndex: 50,
          color: '#ffcc99', fontFamily: "'Georgia', serif",
          textAlign: 'left',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          <div style={{ fontSize: 'clamp(14px, 1.4vw, 20px)', lineHeight: '1.4', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Programs mainly for<br />expanding uses of existing products
          </div>
        </div>

        {/* Highlight Text Overlay: Focus Area */}
        <div style={{
          position: 'absolute', top: textTop, right: focusTextRight,
          opacity: scrollPhase === 'focusArea' ? 1 : 0,
          transform: scrollPhase === 'focusArea' ? 'translateY(0)' : 'translateY(20px)',
          transition: 'opacity 0.8s ease, transform 0.8s ease',
          pointerEvents: 'none', zIndex: 50,
          color: '#ffcc99', fontFamily: "'Georgia', serif",
          textAlign: 'left',
          textShadow: '0 2px 8px rgba(0,0,0,0.8)'
        }}>
          <div style={{ fontSize: 'clamp(14px, 1.4vw, 20px)', lineHeight: '1.4', fontWeight: 'bold', whiteSpace: 'nowrap' }}>
            Programs of our<br />4 focusing area
          </div>
          <ul style={{ 
            marginTop: '12px', 
            marginLeft: '20px',
            fontSize: 'clamp(12px, 1.1vw, 16px)', 
            lineHeight: '1.6', 
            color: '#ffffff',
            opacity: 0.9,
            paddingLeft: '1em'
          }}>
            <li>Immuno-oncology</li>
            <li>Blindness and Regeneration</li>
            <li>Target Protein Degradation</li>
            <li>Genetic Regulation</li>
          </ul>
        </div>

      {/* Tooltip Overlay */}
      {tooltip && (
        <div style={{
          position: 'absolute', top: tooltip.y, left: tooltip.x,
          transform: tooltip.position === 'left' ? 'translate(-100%, -50%)' : 'translate(0, -50%)',
          pointerEvents: 'none', zIndex: 100,
          background: 'rgba(30, 35, 45, 0.95)', border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px', padding: '16px', color: '#fff',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)', minWidth: '320px', maxWidth: 'min(450px, 90vw)',
          fontFamily: "'Georgia', serif",
        }}>
          <div style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#ff6666', marginBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '6px' }}>
            {tooltip.data.name}
          </div>
          {tooltip.data.focus !== "NA" && (
            <div style={{ fontSize: '0.9em', marginBottom: '6px', lineHeight: '1.4' }}>
              <span style={{ opacity: 0.6, display: 'block', fontSize: '0.85em' }}>Primary Focus</span>
              <span style={{ color: '#ffcc99', fontWeight: 'bold' }}>{tooltip.data.focus}</span>
            </div>
          )}
          <div style={{ fontSize: '0.9em', marginBottom: '6px', lineHeight: '1.4' }}>
            <span style={{ opacity: 0.6, display: 'block', fontSize: '0.85em' }}>Therapeutic Area</span>
            {tooltip.data.area}
          </div>
          <div style={{ fontSize: '0.9em', marginBottom: '6px', lineHeight: '1.4' }}>
            <span style={{ opacity: 0.6, display: 'block', fontSize: '0.85em' }}>Target Disease</span>
            {tooltip.data.disease}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '0.9em' }}>
              <span style={{ opacity: 0.6, display: 'block', fontSize: '0.85em' }}>Modality</span>
              {tooltip.data.modality}
            </div>
            <div style={{ fontSize: '0.9em', textAlign: 'right' }}>
              <span style={{ opacity: 0.6, display: 'block', fontSize: '0.85em' }}>Phase</span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{tooltip.data.phase}</span>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          position: 'absolute', bottom: '15%', left: '50%',
          transform: `translate(-50%, ${showTitle ? '0' : '30px'})`,
          opacity: showTitle ? 1 : 0,
          transition: 'all 1.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
          background: 'rgba(50, 55, 65, 0.85)', padding: '20px 40px', borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff',
          fontSize: 'clamp(11px, 1.6vw, 16px)', fontFamily: "'Georgia', serif", textAlign: 'center',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)',
          zIndex: 50,
          width: 'max-content', maxWidth: '90vw', lineHeight: '1.6',
        }}
      >
        <div style={{ marginBottom: '8px', color: '#ffffff', fontWeight: 'bold', fontSize: '1.4em' }}>
          Development Programs
        </div>
        <div style={{ fontSize: '0.9em', color: '#ccc' }}>
          Hover over the hexagons to see details about the development pipeline.
        </div>
      </div>
      </div>
    </div>
  );
};

export default ProductsUnderDevelopment;
