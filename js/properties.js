// ─── IMPORT ──────────────────────────────────────────────────────────────────
function importFile(file){
  if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext!=='svg'){setStatus('Phase 1: SVG files only');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const{paths,vbW,vbH}=parseSVG(e.target.result);
      if(!paths.length){setStatus('No drawable paths in SVG');return;}
      const aspect=vbH/vbW;
      const w=Math.min(S.bedW*0.75,100);
      const h=w*aspect;
      S.obj={name:file.name,paths,vbW,vbH,x:(S.bedW-w)/2,y:(S.bedH-h)/2,w,h,sx:1,sy:1};
      S.moves=[];S.scrubPoints=[];S.gcodeLines=[];S.showPreview=false;S.playHead=0;
      stopPlay();
      emptyHint.style.display='none';
      playbar.classList.remove('visible');
      document.getElementById('sliceBtn').style.display='';
      document.getElementById('previewBtn').style.display='none';
      document.getElementById('dlBtn').style.display='none';
      segCount.style.display='none';gcInfo.style.display='none';
      renderGcode();updateProps();updateActions();redraw();
      setStatus(`Loaded: ${file.name} — ${paths.length} paths (viewBox ${vbW}×${vbH})`);
      renderSidebar();
    }catch(err){setStatus('Parse error: '+err.message);}
  };
  reader.readAsText(file);
}

// ─── PROPS PANEL ─────────────────────────────────────────────────────────────
function updateProps(){
  const o=S.obj;
  if(!o){propPanel.innerHTML='<div style="font-size:10px;color:var(--text-dim)">No object selected</div>';return;}
  propPanel.innerHTML=`
    <div class="row"><span class="lbl">X pos</span><input class="inp" type="number" step="0.1" id="px" value="${o.x.toFixed(1)}"/><span class="unit">mm</span></div>
    <div class="row"><span class="lbl">Y pos</span><input class="inp" type="number" step="0.1" id="py" value="${o.y.toFixed(1)}"/><span class="unit">mm</span></div>
    <div class="row"><span class="lbl">Width</span><input class="inp" type="number" step="0.1" id="pw" value="${(o.w*o.sx).toFixed(1)}"/><span class="unit">mm</span></div>
    <div class="row"><span class="lbl">Height</span><input class="inp" type="number" step="0.1" id="ph" value="${(o.h*o.sy).toFixed(1)}"/><span class="unit">mm</span></div>
    <div class="row"><span class="lbl">Scale X</span><input class="inp" type="number" step="0.01" id="psx" value="${o.sx.toFixed(3)}"/><span class="unit">×</span></div>
    <div class="row"><span class="lbl">Scale Y</span><input class="inp" type="number" step="0.01" id="psy" value="${o.sy.toFixed(3)}"/><span class="unit">×</span></div>
  `;
  const bind=(id,fn)=>{const el=document.getElementById(id);if(el)el.onchange=e=>{fn(+e.target.value);updateProps();redraw();};};
  bind('px',v=>{S.obj.x=v;});
  bind('py',v=>{S.obj.y=v;});
  bind('pw',v=>{S.obj.sx=v/S.obj.w;});
  bind('ph',v=>{S.obj.sy=v/S.obj.h;});
  bind('psx',v=>{S.obj.sx=v;});
  bind('psy',v=>{S.obj.sy=v;});
}
function updateActions(){
  if(!S.obj){actPanel.innerHTML='<div style="font-size:10px;color:var(--text-dim)">Import a file first</div>';return;}
  actPanel.innerHTML=`
    <button class="action-btn" id="mirrorH">↔ Mirror H</button>
    <button class="action-btn" id="mirrorV">↕ Mirror V</button>
    <button class="action-btn" id="centerBtn">⊕ Center on Bed</button>
    <button class="action-btn" id="fitBtn">▢ Fit to Bed 80%</button>
    <button class="action-btn danger" id="removeBtn">✕ Remove</button>
  `;
  document.getElementById('mirrorH').onclick=()=>{S.obj.sx*=-1;updateProps();redraw();};
  document.getElementById('mirrorV').onclick=()=>{S.obj.sy*=-1;updateProps();redraw();};
  document.getElementById('centerBtn').onclick=()=>{
    S.obj.x=(S.bedW-S.obj.w*Math.abs(S.obj.sx))/2;
    S.obj.y=(S.bedH-S.obj.h*Math.abs(S.obj.sy))/2;
    updateProps();redraw();
  };
  document.getElementById('fitBtn').onclick=()=>{
    const sc=Math.min(S.bedW*0.8/S.obj.w,S.bedH*0.8/S.obj.h);
    S.obj.sx=sc;S.obj.sy=sc;
    S.obj.x=(S.bedW-S.obj.w*sc)/2;
    S.obj.y=(S.bedH-S.obj.h*sc)/2;
    updateProps();redraw();
  };
  document.getElementById('removeBtn').onclick=()=>{
    S.obj=null;S.moves=[];S.scrubPoints=[];S.gcodeLines=[];S.showPreview=false;stopPlay();
    emptyHint.style.display='';playbar.classList.remove('visible');
    document.getElementById('sliceBtn').style.display='none';
    document.getElementById('previewBtn').style.display='none';
    document.getElementById('dlBtn').style.display='none';
    segCount.style.display='none';gcInfo.style.display='none';
    renderGcode();updateProps();updateActions();redraw();setStatus('Object removed');renderSidebar();
  };
}
