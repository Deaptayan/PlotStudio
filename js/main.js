// ─── CANVAS MOUSE ─────────────────────────────────────────────────────────────
canvas.addEventListener('mousedown',e=>{
  if(!S.obj||S.showPreview) return;
  const{px,py,dpi}=getPad();
  const o=S.obj;
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;
  const ox=px+o.x*dpi,oy=py+o.y*dpi;
  const ow=o.w*Math.abs(o.sx)*dpi,oh=o.h*Math.abs(o.sy)*dpi;
  if(mx>=ox&&mx<=ox+ow&&my>=oy&&my<=oy+oh){
    S.dragging=true;S.dragSX=mx;S.dragSY=my;S.objX0=o.x;S.objY0=o.y;
    canvas.style.cursor='grabbing';
  }
});
canvas.addEventListener('mousemove',e=>{
  if(!S.dragging||!S.obj) return;
  const{dpi}=getPad();
  const r=canvas.getBoundingClientRect();
  const mx=e.clientX-r.left,my=e.clientY-r.top;
  const dx=(mx-S.dragSX)/dpi,dy=(my-S.dragSY)/dpi;
  S.obj.x=Math.max(0,Math.min(S.bedW-S.obj.w*Math.abs(S.obj.sx),S.objX0+dx));
  S.obj.y=Math.max(0,Math.min(S.bedH-S.obj.h*Math.abs(S.obj.sy),S.objY0+dy));
  posLabel.textContent=` | (${S.obj.x.toFixed(1)}, ${S.obj.y.toFixed(1)}) mm`;
  updateProps();redraw();
});
canvas.addEventListener('mouseup',()=>{S.dragging=false;canvas.style.cursor='default';});
canvas.addEventListener('mouseleave',()=>{S.dragging=false;canvas.style.cursor='default';});

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

// ─── INIT ────────────────────────────────────────────────────────────────────
updateBedLabels();renderSidebar();resizeCanvas();
