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
  const paths=[];
  function addPath(d){
    if(!d||!d.trim()) return;
    splitIntoSubpathStrings(d).forEach(sub=>{if(sub&&sub.trim())paths.push(sub);});
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
      addPath(d);
    }catch(e){}
  });
  return{paths,vbW,vbH};
}
