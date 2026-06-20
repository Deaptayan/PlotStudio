// ─── NEAREST NEIGHBOUR OPTIMIZER ─────────────────────────────────────────────
function dist(a,b){return Math.sqrt((a[0]-b[0])**2+(a[1]-b[1])**2)}

function optimizeSegments(segs){
  if(segs.length<=1) return segs;
  const used=new Array(segs.length).fill(false);
  const out=[segs[0]]; used[0]=true;
  for(let i=1;i<segs.length;i++){
    const last=out[out.length-1];
    const curEnd=last[last.length-1];
    let best=-1,bestD=Infinity,bestFlip=false;
    for(let j=0;j<segs.length;j++){
      if(used[j]) continue;
      const s=segs[j];
      const d0=dist(curEnd,s[0]),d1=dist(curEnd,s[s.length-1]);
      if(d0<bestD){bestD=d0;best=j;bestFlip=false}
      if(d1<bestD){bestD=d1;best=j;bestFlip=true}
    }
    if(best===-1) break;
    out.push(bestFlip?[...segs[best]].reverse():segs[best]);
    used[best]=true;
  }
  return out;
}
