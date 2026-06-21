// ─── REDRAW ──────────────────────────────────────────────────────────────────
function redraw(){
  const{px,py,dpi}=getPad();
  ctx.clearRect(0,0,cW,cH);
  ctx.fillStyle='#080c12';ctx.fillRect(0,0,cW,cH);

  // grid
  ctx.strokeStyle='#141a24';ctx.lineWidth=0.5;
  for(let x=0;x<=S.bedW;x+=10){ctx.beginPath();ctx.moveTo(px+x*dpi,py);ctx.lineTo(px+x*dpi,py+S.bedH*dpi);ctx.stroke();}
  for(let y=0;y<=S.bedH;y+=10){ctx.beginPath();ctx.moveTo(px,py+y*dpi);ctx.lineTo(px+S.bedW*dpi,py+y*dpi);ctx.stroke();}

  // bed border
  ctx.strokeStyle='#39c5bb';ctx.lineWidth=1.5;
  ctx.strokeRect(px,py,S.bedW*dpi,S.bedH*dpi);
  ctx.fillStyle='#1a5f5c';ctx.font='10px monospace';
  ctx.fillText(S.bedW+'×'+S.bedH+'mm',px+4,py+S.bedH*dpi-4);

  if(!S.obj) return;
  const o=S.obj;
  const sw=o.w*o.sx,sh=o.h*o.sy;

  // transform mm → canvas px
  function canvasPt(mx,my){return[px+mx*dpi, py+my*dpi];}

  if(S.showPreview&&S.scrubPoints.length>0){
    drawToolpathPreview(canvasPt);
  } else {
    // Edit mode: show SVG outline. Shapes are filled (translucent) as ONE
    // Path2D per shape using the shape's own fill-rule, so holes — like the
    // alien icon's eyes, which are evenodd subpaths cut into the head —
    // preview correctly as gaps instead of being filled solid.
    const ox=px+o.x*dpi, oy=py+o.y*dpi;
    ctx.save();
    ctx.translate(ox,oy);
    ctx.scale((sw/o.vbW)*dpi,(sh/o.vbH)*dpi);
    ctx.strokeStyle='#39c5bb';ctx.lineWidth=1.5/((sw/o.vbW)*dpi);
    ctx.fillStyle='rgba(57,197,187,0.10)';
    const shapes=(o.shapes&&o.shapes.length)?o.shapes:o.paths.map(d=>({subpaths:[d],fillRule:'nonzero',hasFill:false}));
    shapes.forEach(shape=>{
      try{
        const combined=new Path2D();
        shape.subpaths.forEach(d=>combined.addPath(new Path2D(d)));
        if(shape.hasFill) ctx.fill(combined, shape.fillRule==='evenodd'?'evenodd':'nonzero');
        ctx.stroke(combined);
      }catch(e){}
    });
    ctx.restore();
    // selection
    ctx.strokeStyle='#39c5bb';ctx.lineWidth=1;ctx.setLineDash([4,3]);
    ctx.strokeRect(ox-2,oy-2,sw*dpi+4,sh*dpi+4);ctx.setLineDash([]);
    getHandles(o).forEach(h=>{
      const hx=px+h.mx*dpi, hy=py+h.my*dpi;
      const hot=S.hoverHandle===h.id;
      ctx.fillStyle=hot?'#39c5bb':'#0d1117';
      ctx.fillRect(hx-4,hy-4,8,8);
      ctx.strokeStyle='#39c5bb';ctx.lineWidth=1.5;ctx.strokeRect(hx-4,hy-4,8,8);
    });
  }
}

// Returns the 8 resize-handle positions in mm space (id + midpoint coords),
// computed from the object's current bounding box. Used both for drawing
// (render.js) and for hit-testing / resize math (main.js) so the two stay
// perfectly in sync — there is exactly one source of truth for "where are
// the handles right now".
function getHandles(o){
  const x0=o.x, y0=o.y, x1=o.x+o.w*Math.abs(o.sx), y1=o.y+o.h*Math.abs(o.sy);
  const mx=(x0+x1)/2, my=(y0+y1)/2;
  return[
    {id:'nw',mx:x0,my:y0},{id:'n',mx,my:y0},{id:'ne',mx:x1,my:y0},
    {id:'w',mx:x0,my},                       {id:'e',mx:x1,my},
    {id:'sw',mx:x0,my:y1},{id:'s',mx,my:y1},{id:'se',mx:x1,my:y1},
  ];
}

// Draws the toolpath up to S.playHead using the flattened scrubPoints stream.
// Because scrubPoints is point-level (not move-level), this renders partial
// segments smoothly — dragging the slider by one tick moves the pen by one
// point instead of revealing/hiding an entire shape at once.
function drawToolpathPreview(canvasPt){
  const limit=Math.max(0,Math.min(S.playHead,S.scrubPoints.length));
  if(limit===0) return;

  // Walk the stream once, drawing contiguous travel/draw runs as polylines
  // and pen events as dots, stopping at `limit`.
  let i=0;
  while(i<limit){
    const kind=S.scrubPoints[i].kind;
    if(kind==='pen'){
      const ev=S.scrubPoints[i];
      const[cx,cy]=canvasPt(ev.pt[0],ev.pt[1]);
      ctx.fillStyle=ev.action==='down'?'#e3b341':'rgba(227,179,65,0.4)';
      ctx.beginPath();ctx.arc(cx,cy,3,0,Math.PI*2);ctx.fill();
      i++;
      continue;
    }
    // contiguous run of the same kind (travel or draw)
    const runStart=i;
    while(i<limit&&S.scrubPoints[i].kind===kind) i++;
    const runEnd=Math.min(i,limit); // points [runStart, runEnd)
    if(runEnd-runStart<1) continue;
    if(kind==='travel'){
      ctx.strokeStyle='rgba(77,166,255,0.55)';ctx.lineWidth=0.8;ctx.setLineDash([4,5]);
    }else{
      ctx.strokeStyle='#56d364';ctx.lineWidth=1.4;ctx.setLineDash([]);
    }
    ctx.beginPath();
    // connect from the point immediately before this run (if any) so runs
    // join up visually instead of leaving gaps at run boundaries
    const startIdx=runStart>0?runStart-1:runStart;
    for(let k=startIdx;k<runEnd;k++){
      if(S.scrubPoints[k].kind==='pen') continue;
      const[cx,cy]=canvasPt(S.scrubPoints[k].pt[0],S.scrubPoints[k].pt[1]);
      k===startIdx?ctx.moveTo(cx,cy):ctx.lineTo(cx,cy);
    }
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // playhead cursor dot at current scrub position
  let cur=S.scrubPoints[limit-1];
  if(cur){
    const[cx,cy]=canvasPt(cur.pt[0],cur.pt[1]);
    ctx.fillStyle='#fff';ctx.strokeStyle='#39c5bb';ctx.lineWidth=1.5;
    ctx.beginPath();ctx.arc(cx,cy,4,0,Math.PI*2);ctx.fill();ctx.stroke();
  }
}
