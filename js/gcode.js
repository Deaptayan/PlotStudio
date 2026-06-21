// ─── BUILD MOVES LIST ────────────────────────────────────────────────────────
// moves: [{type:'travel',pts:[[x,y],[x,y]]},{type:'pen',action:'down'},{type:'draw',pts:[...]},{type:'pen',action:'up'},...]
function buildMoves(optimizedSegs, obj){
  const moves=[];
  const sw=obj.w*obj.sx, sh=obj.h*obj.sy;
  function mmPt(vx,vy){
    return[obj.x+vx*(sw/obj.vbW), obj.y+vy*(sh/obj.vbH)];
  }
  let curPos=[0,0];
  // home at start
  moves.push({type:'travel',pts:[curPos,[0,0]]});
  curPos=[0,0];

  optimizedSegs.forEach(seg=>{
    if(!seg||seg.length<2) return;
    const startMM=mmPt(seg[0][0],seg[0][1]);
    // travel to start of segment
    if(dist(curPos,startMM)>0.01){
      moves.push({type:'travel',pts:[curPos,startMM]});
      curPos=startMM;
    }
    // pen down
    moves.push({type:'pen',action:'down'});
    // draw segment
    const drawPts=seg.map(p=>mmPt(p[0],p[1]));
    moves.push({type:'draw',pts:drawPts});
    curPos=drawPts[drawPts.length-1];
    // pen up
    moves.push({type:'pen',action:'up'});
  });
  // return home
  if(dist(curPos,[0,0])>0.01){
    moves.push({type:'travel',pts:[curPos,[0,0]]});
  }
  return moves;
}

// ─── BUILD SCRUB-POINT STREAM ────────────────────────────────────────────────
// BUG FIX (slider scrubbing): the old player scrubbed at the granularity of
// whole `moves` entries — but a single 'draw' move can contain hundreds of
// points (an entire path segment), so each slider tick revealed or hid an
// entire shape at once instead of scrubbing smoothly point-by-point like the
// playback legend promises ("drag slider to scrub" / "see exactly where the
// pen is"). This flattens every move into one continuous point-level stream:
// each entry is a single line endpoint plus the info needed to render
// everything up to it. The slider's range now matches this stream's length,
// so every tick moves the pen by one point, giving smooth, accurate scrubbing
// and a playStat counter that always matches what's drawn on screen.
//
// BUG FIX (hatch-fill lines invisible in "Exact as SVG" mode): an earlier
// version of this function dropped a move's FIRST point whenever it matched
// the immediately preceding point, to avoid a zero-length scrub step where
// one move's end exactly meets the next move's start. But a hatch-fill line
// is just a 2-point 'draw' move (start, reached by the travel move right
// before it, and end). That shared start point was always a "duplicate" of
// the prior travel's endpoint, so it always got dropped — leaving only the
// line's END point in the stream. A single point can't render a line
// (moveTo with no matching lineTo draws nothing), so every one of the
// hundreds of hatch segments silently vanished. The dedup was never actually
// necessary: render.js's drawToolpathPreview already bridges each run's
// first segment from the immediately preceding scrub point (see `startIdx`
// there), so runs join up visually with no gap even without removing
// "duplicate" points here. Simplest correct fix: don't dedup at all.
function buildScrubPoints(moves){
  const pts=[];
  let penDown=false;
  moves.forEach((m,moveIdx)=>{
    if(m.type==='pen'){
      penDown=(m.action==='down');
      pts.push({moveIdx,kind:'pen',action:m.action,pt:pts.length?pts[pts.length-1].pt:[0,0]});
    }else if(m.type==='travel'||m.type==='draw'){
      m.pts.forEach(p=>{
        pts.push({moveIdx,kind:m.type,pt:p,penDown});
      });
    }
  });
  return pts;
}

// ─── G-CODE FROM MOVES ───────────────────────────────────────────────────────
function movesToGcode(moves,obj){
  const{bedW,bedH,origin,feedrate,travelSpeed,penUp,penDown}=S;
  function transform(mmX,mmY){
    let x=mmX,y=mmY;
    if(origin==='Center'){x-=bedW/2;y-=bedH/2;}
    else if(origin==='Bottom Left'){y=bedH-y;}
    return[+x.toFixed(3),+y.toFixed(3)];
  }
  const lines=[];
  lines.push('; PlotterNC Studio v0.3');
  lines.push(`; Bed: ${bedW}x${bedH}mm  Origin: ${origin}`);
  lines.push(`; File: ${obj.name}`);
  lines.push(`; Feed: ${feedrate} mm/min  Travel: ${travelSpeed} mm/min`);
  lines.push('');
  lines.push('G21 ; millimeters');
  lines.push('G90 ; absolute');
  lines.push('');
  lines.push(penUp+' ; pen up (safe start)');
  lines.push(`G0 X0 Y0 F${travelSpeed} ; home`);
  lines.push('');
  moves.forEach(m=>{
    if(m.type==='travel'){
      const[x,y]=transform(m.pts[m.pts.length-1][0],m.pts[m.pts.length-1][1]);
      lines.push(`G0 X${x} Y${y} F${travelSpeed}`);
    }else if(m.type==='pen'){
      lines.push(m.action==='down'?penDown+' ; pen down':penUp+' ; pen up');
    }else if(m.type==='draw'){
      lines.push(`G1 F${feedrate}`);
      m.pts.forEach((p,i)=>{
        if(i===0) return; // already at start from travel
        const[x,y]=transform(p[0],p[1]);
        lines.push(`G1 X${x} Y${y}`);
      });
    }
  });
  lines.push('');
  lines.push(`G0 X0 Y0 F${travelSpeed} ; return home`);
  lines.push(penUp+' ; pen up');
  lines.push('; END');
  return lines;
}

// ─── SHAPE → SEGMENTS (outline, and optionally hatch fill) ──────────────────
// Samples every subpath of every shape into point arrays. In 'exact' mode,
// shapes with a real fill (hasFill) additionally get hatch-fill line
// segments covering their interior, with holes (evenodd subpaths, e.g. eyes
// cut into a head) correctly left unfilled. Outline strokes are still drawn
// in both modes — hatch fill alone tends to leave fuzzy/uneven edges, so
// tracing the exact outline first keeps boundaries crisp.
function buildShapeSegments(o, vbStep){
  const raw=[];
  if(!o.shapes||!o.shapes.length){
    // Fallback: no shape metadata (shouldn't normally happen) — behave like
    // outline mode using the flat paths list.
    o.paths.forEach(d=>{const s=sampleSVGPath(d,vbStep);if(s.length>=2)raw.push(s);});
    return raw;
  }
  o.shapes.forEach(shape=>{
    const polys=shape.subpaths.map(d=>sampleSVGPath(d,vbStep)).filter(p=>p.length>=3);
    // always include the outline strokes
    polys.forEach(p=>raw.push(p));
    if(S.fillMode==='exact'&&shape.hasFill&&polys.length){
      const spacingVB=S.hatchSpacing*(o.vbW/(o.w*o.sx));
      const hatchSegs=hatchFillShape(polys, shape.fillRule, spacingVB, 0);
      hatchSegs.forEach(([p0,p1])=>raw.push([p0,p1]));
    }
  });
  return raw;
}

// ─── SLICE ───────────────────────────────────────────────────────────────────
function slice(){
  if(!S.obj){setStatus('Import an SVG first');return;}
  // HARD BLOCK: never slice an object that doesn't fully fit the bed. The
  // Slice button is visually disabled for this same reason (see
  // updateBoundsWarning in properties.js), but that's just UI — this check
  // is the actual authority, since a disabled button is not a guarantee
  // against the function being invoked some other way. Producing G-code for
  // geometry that hangs off the plottable area isn't useful output to block
  // gently; it's not valid for the machine to run, so we refuse outright
  // rather than slicing whatever portion happens to overlap the bed.
  if(!objectFitsBed(S.obj)){
    setStatus("Can't slice — object doesn't fit the bed. Use Fit to Bed or resize it first.");
    updateBoundsWarning();
    return;
  }
  setStatus('Slicing…');
  setTimeout(()=>{
    const o=S.obj;
    // step in viewBox units: we want ~0.5mm in mm space → convert
    const vbStep=S.stepSize*(o.vbW/(o.w*o.sx));
    const raw=buildShapeSegments(o, vbStep).filter(s=>s.length>=2);
    if(!raw.length){setStatus('No sampleable paths found');return;}
    const optimized=optimizeSegments(raw);
    S.moves=buildMoves(optimized,o);
    S.scrubPoints=buildScrubPoints(S.moves);
    S.gcodeLines=movesToGcode(S.moves,o);
    S.showPreview=true;
    S.playHead=S.scrubPoints.length;
    renderGcode();
    setSlider(S.scrubPoints.length);
    const modeLabel=S.fillMode==='exact'?' (filled)':' (outline)';
    setStatus(`Sliced${modeLabel}: ${optimized.length} segments → ${S.gcodeLines.length} G-code lines`);
    segCount.textContent=`✓ ${optimized.length} segs, ${S.moves.length} moves`;
    segCount.style.display='';
    gcInfo.style.display='';
    gcCount.textContent=S.gcodeLines.length+' lines';
    document.getElementById('previewBtn').style.display='';
    document.getElementById('dlBtn').style.display='';
    playbar.classList.add('visible');
    playSlider.max=S.scrubPoints.length;
    playSlider.value=S.scrubPoints.length;
    updatePlayStat();
  },10);
}
