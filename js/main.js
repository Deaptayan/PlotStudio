// ─── CANVAS MOUSE ─────────────────────────────────────────────────────────────
// Supports two interactions in edit mode: dragging the object to reposition
// it, and dragging one of its 8 selection handles to resize it (typical
// slicer behaviour — corner handles scale both axes together by default,
// matching the object's locked aspect ratio unless the user unlocks it in
// the Transform panel; edge handles stretch one axis only). Each drag (move
// or resize) pushes exactly ONE history snapshot at the moment the drag
// starts, not on every mousemove — otherwise a single drag would flood the
// undo stack with hundreds of intermediate states and "undo" would barely
// move the object back.

const MIN_SIZE_MM=2; // never let a resize collapse the object to ~nothing

function hitTestHandle(o,mx,my,dpi,px,py){
  for(const h of getHandles(o)){
    const hx=px+h.mx*dpi, hy=py+h.my*dpi;
    if(Math.abs(mx-hx)<=6&&Math.abs(my-hy)<=6) return h.id;
  }
  return null;
}
const HANDLE_CURSORS={nw:'nwse-resize',se:'nwse-resize',ne:'nesw-resize',sw:'nesw-resize',n:'ns-resize',s:'ns-resize',e:'ew-resize',w:'ew-resize'};

canvas.addEventListener('mousedown',e=>{
  if(!S.obj||S.showPreview) return;
  const{px,py,dpi}=getPad();
  const o=S.obj;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;

  const handle=hitTestHandle(o,mx,my,dpi,px,py);
  if(handle){
    pushHistory();
    S.resizing=true; S.resizeHandle=handle;
    S.resizeStartObj={x:o.x,y:o.y,w:o.w,h:o.h,sx:o.sx,sy:o.sy};
    S.resizeStartMouse={mx,my};
    S.resizeDriveAxis=null; // re-decided fresh for this drag — see mousemove
    canvas.style.cursor=HANDLE_CURSORS[handle];
    return;
  }

  const ox=px+o.x*dpi,oy=py+o.y*dpi;
  const ow=o.w*Math.abs(o.sx)*dpi,oh=o.h*Math.abs(o.sy)*dpi;
  if(mx>=ox&&mx<=ox+ow&&my>=oy&&my<=oy+oh){
    pushHistory();
    S.dragging=true;S.dragSX=mx;S.dragSY=my;S.objX0=o.x;S.objY0=o.y;
    canvas.style.cursor='grabbing';
  }
});

canvas.addEventListener('mousemove',e=>{
  const{px,py,dpi}=getPad();
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;

  if(S.resizing&&S.obj){
    const o=S.obj, start=S.resizeStartObj;
    const dxMM=(mx-S.resizeStartMouse.mx)/dpi;
    const dyMM=(my-S.resizeStartMouse.my)/dpi;
    const signX=Math.sign(start.sx||1), signY=Math.sign(start.sy||1);
    const x0=start.x, y0=start.y;
    const w0=start.w*Math.abs(start.sx), h0=start.h*Math.abs(start.sy);
    const handle=S.resizeHandle;
    const lockAspect=o.lockAspect!==false;
    const isCorner=handle.length===2;

    let newW=w0, newH=h0, newX=x0, newY=y0;
    const hasE=handle.includes('e'), hasW=handle.includes('w');
    const hasN=handle.includes('n'), hasS=handle.includes('s');

    if(hasE) newW=Math.max(MIN_SIZE_MM, w0+dxMM);
    if(hasW){ newW=Math.max(MIN_SIZE_MM, w0-dxMM); newX=x0+(w0-newW); }
    if(hasS) newH=Math.max(MIN_SIZE_MM, h0+dyMM);
    if(hasN){ newH=Math.max(MIN_SIZE_MM, h0-dyMM); newY=y0+(h0-newH); }

    // Corner handles keep the original aspect ratio by default (typical
    // slicer behaviour). BUG FIX (resize flicker): which axis "drives" the
    // proportional resize used to be re-decided on EVERY mousemove by
    // comparing the instantaneous |dxMM| vs |dyMM" since the drag started.
    // A real drag is rarely perfectly horizontal or vertical — it wobbles
    // diagonally — so those two deltas are often nearly equal and flip back
    // and forth across the >= boundary from one mousemove to the next. Each
    // flip picked a different driving axis and produced a visibly different
    // size, so the object jittered between two close values many times a
    // second. Fix: decide the driving axis ONCE, the first time this drag
    // moves far enough to tell (a few mm), and keep using that same axis for
    // the rest of the drag — exactly like real slicers, where the resize
    // doesn't suddenly change its mind about which dimension you're
    // dragging halfway through the gesture.
    if(isCorner&&lockAspect&&w0>0&&h0>0){
      const aspect=w0/h0;
      if(S.resizeDriveAxis===null||S.resizeDriveAxis===undefined){
        const DECIDE_THRESHOLD_MM=1.5;
        if(Math.abs(dxMM)>DECIDE_THRESHOLD_MM||Math.abs(dyMM)>DECIDE_THRESHOLD_MM){
          S.resizeDriveAxis=Math.abs(dxMM)>=Math.abs(dyMM)?'x':'y';
        }
      }
      const drive=S.resizeDriveAxis||'x';
      if(drive==='x'){
        newH=newW/aspect;
        if(hasN) newY=y0+(h0-newH);
      }else{
        newW=newH*aspect;
        if(hasW) newX=x0+(w0-newW);
      }
    }

    o.w=start.w; o.h=start.h; // geometry units never change — only sx/sy scale them
    o.sx=(newW/start.w)*signX;
    o.sy=(newH/start.h)*signY;
    o.x=newX; o.y=newY;
    updateProps();redraw();updateBoundsWarning();
    return;
  }

  if(S.dragging&&S.obj){
    const dx=(mx-S.dragSX)/dpi,dy=(my-S.dragSY)/dpi;
    const ow=S.obj.w*Math.abs(S.obj.sx), oh=S.obj.h*Math.abs(S.obj.sy);
    // Clamp range is [min(0, bedW-ow), max(0, bedW-ow)] rather than always
    // [0, bedW-ow] — for an object SMALLER than the bed this is identical to
    // before. For an object LARGER than the bed (now possible since SVGs
    // load at their true native size, which may exceed the bed), bedW-ow is
    // negative; the old clamp collapsed to a single point at 0 and the
    // object could never be dragged at all. This keeps dragging free in
    // both directions while still stopping it from sliding completely off
    // into empty canvas space.
    const loX=Math.min(0,S.bedW-ow), hiX=Math.max(0,S.bedW-ow);
    const loY=Math.min(0,S.bedH-oh), hiY=Math.max(0,S.bedH-oh);
    S.obj.x=Math.max(loX,Math.min(hiX,S.objX0+dx));
    S.obj.y=Math.max(loY,Math.min(hiY,S.objY0+dy));
    posLabel.textContent=` | (${S.obj.x.toFixed(1)}, ${S.obj.y.toFixed(1)}) mm`;
    updateProps();redraw();updateBoundsWarning();
    return;
  }

  // Not dragging/resizing: update hover state for handle highlight + cursor
  if(S.obj&&!S.showPreview){
    const handle=hitTestHandle(S.obj,mx,my,dpi,px,py);
    if(handle!==S.hoverHandle){ S.hoverHandle=handle; redraw(); }
    if(handle) canvas.style.cursor=HANDLE_CURSORS[handle];
    else{
      const o=S.obj;
      const ox=px+o.x*dpi,oy=py+o.y*dpi;
      const ow=o.w*Math.abs(o.sx)*dpi,oh=o.h*Math.abs(o.sy)*dpi;
      canvas.style.cursor=(mx>=ox&&mx<=ox+ow&&my>=oy&&my<=oy+oh)?'grab':'default';
    }
  }
});

function endCanvasDrag(){
  S.dragging=false;S.resizing=false;S.resizeHandle=null;
  canvas.style.cursor='default';
}
canvas.addEventListener('mouseup',endCanvasDrag);
canvas.addEventListener('mouseleave',()=>{ if(!S.dragging&&!S.resizing) S.hoverHandle=null; endCanvasDrag(); redraw(); });

// ─── TOOLBAR BUTTONS ─────────────────────────────────────────────────────────
document.getElementById('importBtn').onclick=()=>document.getElementById('fileInput').click();
document.getElementById('fileInput').onchange=e=>importFile(e.target.files[0]);
document.getElementById('sliceBtn').onclick=slice;

document.getElementById('previewBtn').onclick=()=>{
  S.showPreview=!S.showPreview;
  document.getElementById('previewBtn').textContent=S.showPreview?'✕ Edit Mode':'◉ Preview';
  document.getElementById('previewBtn').className='tbtn'+(S.showPreview?' act':'');
  if(S.showPreview){playbar.classList.add('visible');}else{stopPlay();playbar.classList.remove('visible');}
  redraw();
};

document.getElementById('dlBtn').onclick=()=>{
  if(!S.gcodeLines.length){setStatus('Slice first');return;}
  const blob=new Blob([S.gcodeLines.join('\n')],{type:'text/plain'});
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=(S.obj?S.obj.name.replace(/\.svg$/i,''):'drawing')+'.gcode';
  a.click();
};

// ─── NAV TABS ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.navitem').forEach(el=>{
  el.onclick=()=>{
    document.querySelectorAll('.navitem').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');S.activeSection=el.dataset.sec;renderSidebar();
  };
});

// ─── DRAG DROP ON CANVAS ─────────────────────────────────────────────────────
cwrap.addEventListener('dragover',e=>e.preventDefault());
cwrap.addEventListener('drop',e=>{e.preventDefault();importFile(e.dataTransfer.files[0]);});

// ─── KEYBOARD SHORTCUTS ───────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();
  if(tag==='input'||tag==='select'||tag==='textarea') return; // don't hijack typing
  if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&e.key.toLowerCase()==='z'){ e.preventDefault(); undo(); updateBoundsWarning(); }
  else if((e.ctrlKey||e.metaKey)&&((e.shiftKey&&e.key.toLowerCase()==='z')||e.key.toLowerCase()==='y')){ e.preventDefault(); redo(); updateBoundsWarning(); }
});

// ─── INIT ────────────────────────────────────────────────────────────────────
updateBedLabels();renderSidebar();resizeCanvas();updateBoundsWarning();
