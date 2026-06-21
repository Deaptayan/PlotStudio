// ─── SVG PARSER ──────────────────────────────────────────────────────────────
//
// BUG FIX (diagonal lines across the drawing):
// A single <path d="..."> can contain MULTIPLE subpaths, each starting with
// its own M/m command, e.g. "M..Z M..Z M..Z". SVGPathElement.getTotalLength()
// and getPointAtLength() treat the WHOLE d string as one continuous path —
// including invisible "jumps" between the end of one subpath and the M of the
// next. When we sample at fixed length intervals (see path-sampler.js), some
// sample points land on that invisible jump, producing a straight diagonal
// line connecting unrelated parts of the drawing (e.g. hat outline -> head
// outline -> collar). The chef-hat SVG's main path has 4 separate M commands
// inside one d attribute, which is exactly what triggered this.
//
// THE FIX: rather than naively splitting the `d` STRING on M/m (which breaks
// any subpath that starts with a *relative* `m`, since a leading `m` is only
// relative to the previous subpath's end point — splitting it out loses that
// context and silently relocates the subpath), we let the browser fully
// parse + normalize the path into a single list of absolute-coordinate
// segments via getPathData({normalize:true}), then split THAT segment list
// at each 'M' segment. Every resulting subpath is rebuilt as a clean,
// self-contained, absolute-coordinate `d` string, so splitting is lossless
// and correct regardless of how the original path mixed M/m/relative commands.

function splitIntoSubpathStrings(d){
  if(!d||!d.trim()) return[];
  const el=document.createElementNS('http://www.w3.org/2000/svg','path');
  el.setAttribute('d',d);

  // Prefer the modern, spec-correct normalizer when available.
  if(typeof el.getPathData==='function'){
    let segs;
    try{ segs=el.getPathData({normalize:true}); }catch(e){ segs=null; }
    if(segs&&segs.length){
      const subs=[];
      let cur=[];
      segs.forEach(seg=>{
        if(seg.type==='M'&&cur.length){ subs.push(cur); cur=[]; }
        cur.push(seg);
      });
      if(cur.length) subs.push(cur);
      return subs.map(segList=>segList.map(seg=>seg.type+seg.values.join(',')).join(' '));
    }
  }

  // Fallback for browsers without getPathData: sample the combined path with
  // getPointAtLength and cut it wherever consecutive sampled points jump by
  // an outlier distance relative to the local point spacing — this detects
  // the invisible connector between subpaths without needing to re-parse
  // path syntax. Coarser, but only used as a last resort.
  const len=el.getTotalLength();
  if(!len||isNaN(len)) return[d];
  const n=Math.min(4000,Math.max(50,Math.ceil(len/0.25)));
  const pts=[];
  for(let i=0;i<=n;i++){const p=el.getPointAtLength(len*i/n);pts.push([p.x,p.y]);}
  const segments=[[pts[0]]];
  const avgStep=len/n;
  for(let i=1;i<pts.length;i++){
    const dx=pts[i][0]-pts[i-1][0],dy=pts[i][1]-pts[i-1][1];
    const d2=Math.sqrt(dx*dx+dy*dy);
    if(d2>avgStep*8&&d2>1) segments.push([]);
    segments[segments.length-1].push(pts[i]);
  }
  return segments.filter(s=>s.length>=2).map(s=>'M'+s.map(p=>p[0]+','+p[1]).join(' L'));
}

// Parses an SVG length attribute like "800px", "21mm", "8.5in", "100" (unitless
// = px per the SVG/CSS spec) into millimetres. Percentage values can't be
// resolved without a containing-block size, so they're treated as absent.
function parseLengthToMM(str){
  if(!str) return null;
  const m=String(str).trim().match(/^([0-9.+-eE]+)\s*(px|mm|cm|in|pt|pc|%)?$/);
  if(!m) return null;
  const val=parseFloat(m[1]);
  if(isNaN(val)) return null;
  const unit=m[2]||'px';
  const factors={ px:25.4/96, mm:1, cm:10, in:25.4, pt:25.4/72, pc:25.4/6 };
  if(unit==='%') return null;
  return val*factors[unit];
}

function parseSVG(text){
  const parser=new DOMParser();
  const doc=parser.parseFromString(text,'image/svg+xml');
  const svg=doc.querySelector('svg');
  let vbW=200,vbH=200;
  const vb=svg&&svg.getAttribute('viewBox');
  if(vb){const p=vb.trim().split(/[\s,]+/);vbW=+p[2]||200;vbH=+p[3]||200;}
  else{
    const sw=svg&&parseFloat(svg.getAttribute('width'));
    const sh=svg&&parseFloat(svg.getAttribute('height'));
    if(sw)vbW=sw; if(sh)vbH=sh;
  }

  // REAL PHYSICAL SIZE: the SVG's width/height attributes (e.g. "800px",
  // "21mm") describe the artwork's intended physical size — separate from
  // viewBox, which only defines the internal coordinate space used by the
  // path data. We resolve both so the app can load the drawing at the size
  // its author intended by default, rather than an arbitrary guess.
  let physW=null, physH=null;
  if(svg){
    physW=parseLengthToMM(svg.getAttribute('width'));
    physH=parseLengthToMM(svg.getAttribute('height'));
  }
  // No usable width/height (or percentage-based): fall back to treating
  // viewBox units as CSS px, the standard behaviour browsers use when an
  // SVG has a viewBox but no explicit physical size.
  if(physW==null||physH==null){
    physW=vbW*(25.4/96);
    physH=vbH*(25.4/96);
  }

  const paths=[];      // flat list, all subpaths — used by outline mode & edit-mode preview
  const shapes=[];     // grouped by source element — used by hatch-fill (exact mode)

  // Resolves the effective fill / fill-rule for an element, walking up
  // through inherited attributes (covers the common "fill set on a parent
  // <g>" pattern) and CSS shorthand in a style="" attribute.
  function effectiveFill(el){
    let cur=el;
    while(cur&&cur.nodeType===1){
      const style=cur.getAttribute('style')||'';
      const styleMatch=style.match(/fill\s*:\s*([^;]+)/i);
      const attr=cur.getAttribute('fill');
      const val=styleMatch?styleMatch[1].trim():attr;
      if(val) return val;
      cur=cur.parentElement;
    }
    return '#000000'; // SVG default fill when unspecified is black, not none
  }
  function effectiveFillRule(el){
    let cur=el;
    while(cur&&cur.nodeType===1){
      const style=cur.getAttribute('style')||'';
      const styleMatch=style.match(/fill-rule\s*:\s*([^;]+)/i);
      const attr=cur.getAttribute('fill-rule')||cur.getAttribute('clip-rule');
      const val=styleMatch?styleMatch[1].trim():attr;
      if(val) return val==='evenodd'?'evenodd':'nonzero';
      cur=cur.parentElement;
    }
    return 'nonzero';
  }

  function addPath(d,el){
    if(!d||!d.trim()) return;
    const subs=splitIntoSubpathStrings(d).filter(s=>s&&s.trim());
    if(!subs.length) return;
    subs.forEach(sub=>paths.push(sub));
    const fill=effectiveFill(el);
    const hasFill=!(fill==='none'||fill==='transparent');
    shapes.push({subpaths:subs, fill, fillRule:effectiveFillRule(el), hasFill});
  }
  doc.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon').forEach(el=>{
    try{
      let d='';const t=el.tagName.toLowerCase();
      if(t==='path') d=el.getAttribute('d')||'';
      else if(t==='rect'){
        const x=+el.getAttribute('x')||0,y=+el.getAttribute('y')||0;
        const w=+el.getAttribute('width')||0,h=+el.getAttribute('height')||0;
        const rx=Math.min(+el.getAttribute('rx')||0,w/2),ry=Math.min(+el.getAttribute('ry')||rx,h/2);
        if(rx>0){d=`M${x+rx},${y} L${x+w-rx},${y} Q${x+w},${y} ${x+w},${y+ry} L${x+w},${y+h-ry} Q${x+w},${y+h} ${x+w-rx},${y+h} L${x+rx},${y+h} Q${x},${y+h} ${x},${y+h-ry} L${x},${y+ry} Q${x},${y} ${x+rx},${y} Z`;}
        else{d=`M${x},${y} L${x+w},${y} L${x+w},${y+h} L${x},${y+h} Z`;}
      }else if(t==='circle'){
        const cx=+el.getAttribute('cx')||0,cy=+el.getAttribute('cy')||0,r=+el.getAttribute('r')||0;
        d=`M${cx-r},${cy} A${r},${r} 0 1,0 ${cx+r},${cy} A${r},${r} 0 1,0 ${cx-r},${cy} Z`;
      }else if(t==='ellipse'){
        const cx=+el.getAttribute('cx')||0,cy=+el.getAttribute('cy')||0;
        const rx=+el.getAttribute('rx')||0,ry=+el.getAttribute('ry')||0;
        d=`M${cx-rx},${cy} A${rx},${ry} 0 1,0 ${cx+rx},${cy} A${rx},${ry} 0 1,0 ${cx-rx},${cy} Z`;
      }else if(t==='line'){
        const x1=+el.getAttribute('x1')||0,y1=+el.getAttribute('y1')||0;
        const x2=+el.getAttribute('x2')||0,y2=+el.getAttribute('y2')||0;
        d=`M${x1},${y1} L${x2},${y2}`;
      }else if(t==='polyline'||t==='polygon'){
        const pts=(el.getAttribute('points')||'').trim().split(/[\s,]+/);
        const pairs=[];
        for(let i=0;i<pts.length-1;i+=2) pairs.push([+pts[i],+pts[i+1]]);
        if(pairs.length>0){
          d='M'+pairs[0][0]+','+pairs[0][1];
          for(let i=1;i<pairs.length;i++) d+=' L'+pairs[i][0]+','+pairs[i][1];
          if(t==='polygon') d+=' Z';
        }
      }
      if(t==='line'){
        // A <line> is a single open stroke — never a fillable region, even
        // if a fill attribute happens to be present (browsers ignore it too).
        if(d&&d.trim()){
          const subs=splitIntoSubpathStrings(d).filter(s=>s&&s.trim());
          subs.forEach(sub=>paths.push(sub));
          if(subs.length) shapes.push({subpaths:subs, fill:'none', fillRule:'nonzero', hasFill:false});
        }
      }else{
        addPath(d,el);
      }
    }catch(e){}
  });
  return{paths,shapes,vbW,vbH,physW,physH};
}
