// ─── HATCH FILL ──────────────────────────────────────────────────────────────
// Powers "Exact as SVG" mode: instead of only drawing each shape's outline,
// we additionally fill its interior with parallel scanlines (classic pen-
// plotter hatching), so solid-fill artwork (icons, logos, silhouettes) comes
// out looking like the original image rather than a wireframe of it.
//
// A shape from the SVG parser is a group of subpaths that all belong to one
// source element (see svg-parser.js `shapes`). Some of those subpaths are
// "holes" cut out of the others — e.g. the alien icon's two eyes are
// subpaths nested inside the head subpath, combined with fill-rule:evenodd
// so the eyes render as transparent holes rather than solid black. Hatching
// must honour that: a scanline crossing the head should skip back out again
// when it enters an eye, not paint straight through it.

// Crossing of one closed polygon's edges with horizontal line y=Y.
// Returns [{x, dir}] where dir is +1/-1 depending on edge winding direction.
function scanlineIntersections(poly, Y){
  const xs=[];
  const n=poly.length;
  for(let i=0;i<n;i++){
    const [x1,y1]=poly[i];
    const [x2,y2]=poly[(i+1)%n];
    if((y1<=Y&&y2>Y)||(y2<=Y&&y1>Y)){
      const t=(Y-y1)/(y2-y1);
      xs.push({x:x1+t*(x2-x1), dir:(y2>y1)?1:-1});
    }
  }
  return xs;
}

// Builds the filled-interior intervals [x0,x1] of a scanline at y=Y across
// ALL of a shape's subpaths combined, honouring fillRule (holes included).
function scanlineFillIntervals(polys, fillRule, Y){
  const crossings=[];
  polys.forEach((poly,pi)=>{
    scanlineIntersections(poly,Y).forEach(c=>crossings.push({...c, pi}));
  });
  if(!crossings.length) return[];
  crossings.sort((a,b)=>a.x-b.x);

  const intervals=[];
  let intervalStart=null;

  if(fillRule==='evenodd'){
    // Track parity per-polygon; combined "inside" = XOR of all parities.
    const parity={};
    let insideCombined=false;
    for(let i=0;i<crossings.length;i++){
      const c=crossings[i];
      parity[c.pi]=!parity[c.pi];
      const wasInside=insideCombined;
      let onCount=0;
      for(const k in parity) if(parity[k]) onCount++;
      insideCombined=onCount%2===1;
      if(!wasInside&&insideCombined) intervalStart=c.x;
      else if(wasInside&&!insideCombined&&intervalStart!==null){
        intervals.push([intervalStart,c.x]);
        intervalStart=null;
      }
    }
  } else {
    // nonzero: running winding sum, inside whenever sum !== 0
    let winding=0;
    for(let i=0;i<crossings.length;i++){
      const c=crossings[i];
      const wasInside=winding!==0;
      winding+=c.dir;
      const isInside=winding!==0;
      if(!wasInside&&isInside) intervalStart=c.x;
      else if(wasInside&&!isInside&&intervalStart!==null){
        intervals.push([intervalStart,c.x]);
        intervalStart=null;
      }
    }
  }
  return intervals;
}

// Main entry: given a shape's already-SAMPLED polygons (arrays of [x,y] in
// viewBox units, one per subpath, each implicitly closed) plus the shape's
// fillRule and the desired hatch line spacing (in viewBox units), returns an
// array of line segments (each [[x0,y0],[x1,y1]]) that fill the interior.
// `angleDeg` lets fill lines run at an angle (0 = horizontal).
function hatchFillShape(polys, fillRule, spacingVB, angleDeg){
  if(!polys.length||spacingVB<=0) return[];
  const angle=(angleDeg||0)*Math.PI/180;
  const cos=Math.cos(-angle), sin=Math.sin(-angle);
  const cosBack=Math.cos(angle), sinBack=Math.sin(angle);

  // Rotate polygons into hatch-space so we can always scan horizontally,
  // then rotate the resulting segments back.
  const rotated=polys.map(poly=>poly.map(([x,y])=>[x*cos-y*sin, x*sin+y*cos]));

  let minY=Infinity,maxY=-Infinity;
  rotated.forEach(poly=>poly.forEach(([,y])=>{if(y<minY)minY=y;if(y>maxY)maxY=y;}));
  if(!isFinite(minY)||!isFinite(maxY)) return[];

  const segments=[];
  // Offset the first scanline by half a step so hatching looks centred
  // rather than always starting exactly on the bbox edge.
  const start=minY+spacingVB*0.5;
  for(let y=start;y<=maxY;y+=spacingVB){
    const intervals=scanlineFillIntervals(rotated, fillRule, y);
    intervals.forEach(([x0,x1])=>{
      if(x1-x0<1e-6) return;
      const p0=[x0*cosBack-y*sinBack, x0*sinBack+y*cosBack];
      const p1=[x1*cosBack-y*sinBack, x1*sinBack+y*cosBack];
      segments.push([p0,p1]);
    });
  }
  return segments;
}
