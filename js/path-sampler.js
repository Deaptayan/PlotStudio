// ─── SAMPLE SVG PATH → points array ─────────────────────────────────────────
// stepMM: mm per step in viewBox units (we pass actual step in vb units)
// NOTE: `d` is expected to be a SINGLE subpath (one M ... [Z]) — see svg-parser.js
// for why multi-subpath strings must never reach this function directly.
function sampleSVGPath(d, stepVB){
  const el=document.createElementNS('http://www.w3.org/2000/svg','path');
  el.setAttribute('d',d);
  const len=el.getTotalLength();
  if(!len||isNaN(len)||len<0.01) return[];
  const n=Math.max(2,Math.min(2000,Math.ceil(len/Math.max(stepVB,0.1))));
  const pts=[];
  for(let i=0;i<=n;i++){
    const p=el.getPointAtLength(len*i/n);
    pts.push([p.x,p.y]);
  }
  return pts;
}
