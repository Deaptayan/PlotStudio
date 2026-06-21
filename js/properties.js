// ─── OUT-OF-BOUNDS WARNING ────────────────────────────────────────────────────
// Shows a persistent, hard-to-miss banner above the canvas whenever the
// object's current position+size doesn't fully fit the bed, and disables
// the Slice button so an out-of-bounds drawing can't be sliced at all —
// slicing only produces valid G-code for what's actually on the plottable
// area, so silently allowing it to "succeed" on a drawing that hangs off
// the bed would just produce toolpaths the machine can't run correctly.
// Called after every transform change: drag, resize, undo/redo, numeric
// edit, Mirror/Center/Fit, import, and remove.
function updateBoundsWarning(){
  const banner=document.getElementById('boundsWarning');
  const sliceBtn=document.getElementById('sliceBtn');
  if(!S.obj||objectFitsBed(S.obj)){
    banner.style.display='none';
    if(sliceBtn) sliceBtn.disabled=false;
    return;
  }
  const o=S.obj;
  const w=o.w*Math.abs(o.sx), h=o.h*Math.abs(o.sy);
  document.getElementById('boundsWarningText').textContent=
    `Object doesn't fit the bed (${w.toFixed(1)}×${h.toFixed(1)}mm on a ${S.bedW}×${S.bedH}mm bed) — Slice is disabled until it fits`;
  banner.style.display='flex';
  if(sliceBtn) sliceBtn.disabled=true;
}

// Shared "shrink + center to fit the bed at 80%" logic, used by both the
// Actions panel's "Fit to Bed 80%" button and the warning banner's inline
// "Fit to Bed" fix button, so there's exactly one implementation.
function fitToBed(){
  if(!S.obj) return;
  pushHistory();
  const sc=Math.min(S.bedW*0.8/S.obj.w,S.bedH*0.8/S.obj.h);
  const signX=Math.sign(S.obj.sx||1),signY=Math.sign(S.obj.sy||1);
  S.obj.sx=sc*signX;S.obj.sy=sc*signY;
  S.obj.x=(S.bedW-S.obj.w*sc)/2;
  S.obj.y=(S.bedH-S.obj.h*sc)/2;
  updateProps();redraw();updateBoundsWarning();
}
document.getElementById('boundsFixBtn').onclick=fitToBed;

// ─── IMPORT ──────────────────────────────────────────────────────────────────
function importFile(file){
  if(!file) return;
  const ext=file.name.split('.').pop().toLowerCase();
  if(ext!=='svg'){setStatus('Phase 1: SVG files only');return;}
  const reader=new FileReader();
  reader.onload=e=>{
    try{
      const{paths,shapes,vbW,vbH,physW,physH}=parseSVG(e.target.result);
      if(!paths.length){setStatus('No drawable paths in SVG');return;}

      // Load at the SVG's exact real/intended physical size, resolved from
      // its width/height attributes (see svg-parser.js) — this is the size
      // the designer actually specified, so it's what should load, full
      // stop. We do NOT auto-scale it to fit the bed: silently shrinking
      // someone's design changes it without asking. If it's bigger than the
      // bed, it loads at true size anyway (it may extend past the bed
      // outline) and the status bar just lets them know — Fit to Bed,
      // Native SVG Size, the resize handles, or typing an exact dimension
      // are all right there if they decide they want to scale it.
      const w=physW, h=physH;
      const exceedsBed = w>S.bedW||h>S.bedH;
      S.obj={name:file.name,paths,shapes,vbW,vbH,x:(S.bedW-w)/2,y:(S.bedH-h)/2,w,h,sx:1,sy:1};
      clearHistory();
      S.moves=[];S.scrubPoints=[];S.gcodeLines=[];S.showPreview=false;S.playHead=0;
      stopPlay();
      emptyHint.style.display='none';
      playbar.classList.remove('visible');
      document.getElementById('sliceBtn').style.display='';
      document.getElementById('previewBtn').style.display='none';
      document.getElementById('dlBtn').style.display='none';
      segCount.style.display='none';gcInfo.style.display='none';
      renderGcode();updateProps();updateActions();redraw();updateBoundsWarning();
      const sizeNote=exceedsBed?` at native size ${w.toFixed(1)}×${h.toFixed(1)}mm (larger than the bed — use Fit to Bed or resize to shrink it)`:` at native size ${w.toFixed(1)}×${h.toFixed(1)}mm`;
      setStatus(`Loaded: ${file.name} — ${paths.length} paths${sizeNote}`);
      renderSidebar();
    }catch(err){setStatus('Parse error: '+err.message);}
  };
  reader.readAsText(file);
}

// ─── PROPS PANEL ─────────────────────────────────────────────────────────────
function updateProps(){
  const o=S.obj;
  if(!o){propPanel.innerHTML='<div style="font-size:10px;color:var(--text-dim)">No object selected</div>';return;}
  const u=S.displayUnit;
  const dec=u==='in'?3:(u==='px'?1:2);
  const fmt=mm=>mmToUnit(mm,u).toFixed(dec);
  propPanel.innerHTML=`
    <div class="row">
      <span class="lbl">Units</span>
      <select class="inp" id="unitSel" style="flex:1">
        ${['mm','cm','in','px'].map(uu=>`<option value="${uu}" ${uu===u?'selected':''}>${uu}</option>`).join('')}
      </select>
    </div>
    <div class="row"><span class="lbl">X pos</span><input class="inp" type="number" step="any" id="px" value="${fmt(o.x)}"/><span class="unit">${u}</span></div>
    <div class="row"><span class="lbl">Y pos</span><input class="inp" type="number" step="any" id="py" value="${fmt(o.y)}"/><span class="unit">${u}</span></div>
    <div class="row">
      <span class="lbl">Width</span><input class="inp" type="number" step="any" id="pw" value="${fmt(o.w*Math.abs(o.sx))}"/><span class="unit">${u}</span>
    </div>
    <div class="row"><span class="lbl">Height</span><input class="inp" type="number" step="any" id="ph" value="${fmt(o.h*Math.abs(o.sy))}"/><span class="unit">${u}</span></div>
    <div class="row" style="margin-top:2px">
      <span class="lbl" style="width:auto;font-size:9px">🔗 Lock aspect</span>
      <input type="checkbox" id="lockAspect" ${o.lockAspect!==false?'checked':''} style="accent-color:var(--cyan);cursor:pointer"/>
    </div>
    <div class="row"><span class="lbl">Scale X</span><input class="inp" type="number" step="0.01" id="psx" value="${o.sx.toFixed(3)}"/><span class="unit">×</span></div>
    <div class="row"><span class="lbl">Scale Y</span><input class="inp" type="number" step="0.01" id="psy" value="${o.sy.toFixed(3)}"/><span class="unit">×</span></div>
  `;
  document.getElementById('unitSel').onchange=e=>{S.displayUnit=e.target.value;updateProps();};
  document.getElementById('lockAspect').onchange=e=>{S.obj.lockAspect=e.target.checked;};

  // Numeric edits commit on change (blur/Enter) and each counts as ONE
  // undoable action — pushHistory() captures the state right before the
  // edit takes effect.
  const bind=(id,fn)=>{
    const el=document.getElementById(id);
    if(el) el.onchange=e=>{
      const raw=+e.target.value;
      if(isNaN(raw)) return;
      pushHistory();
      fn(raw);
      updateProps();redraw();updateBoundsWarning();
    };
  };
  bind('px',v=>{S.obj.x=unitToMm(v,S.displayUnit);});
  bind('py',v=>{S.obj.y=unitToMm(v,S.displayUnit);});
  bind('pw',v=>{
    const mm=unitToMm(v,S.displayUnit);
    const newSx=mm/S.obj.w*Math.sign(S.obj.sx||1);
    if(S.obj.lockAspect!==false){
      const ratio=newSx/S.obj.sx;
      S.obj.sx=newSx; S.obj.sy*=ratio;
    } else S.obj.sx=newSx;
  });
  bind('ph',v=>{
    const mm=unitToMm(v,S.displayUnit);
    const newSy=mm/S.obj.h*Math.sign(S.obj.sy||1);
    if(S.obj.lockAspect!==false){
      const ratio=newSy/S.obj.sy;
      S.obj.sy=newSy; S.obj.sx*=ratio;
    } else S.obj.sy=newSy;
  });
  bind('psx',v=>{S.obj.sx=v;});
  bind('psy',v=>{S.obj.sy=v;});
}
function updateActions(){
  if(!S.obj){actPanel.innerHTML='<div style="font-size:10px;color:var(--text-dim)">Import a file first</div>';return;}
  actPanel.innerHTML=`
    <div class="row" style="margin-bottom:7px">
      <button class="action-btn" id="undoBtn" style="flex:1;margin-bottom:0">↶ Undo</button>
      <button class="action-btn" id="redoBtn" style="flex:1;margin-bottom:0">↷ Redo</button>
    </div>
    <button class="action-btn" id="mirrorH">↔ Mirror H</button>
    <button class="action-btn" id="mirrorV">↕ Mirror V</button>
    <button class="action-btn" id="centerBtn">⊕ Center on Bed</button>
    <button class="action-btn" id="fitBtn">▢ Fit to Bed 80%</button>
    <button class="action-btn" id="nativeBtn">⤢ Native SVG Size</button>
    <button class="action-btn danger" id="removeBtn">✕ Remove</button>
  `;
  document.getElementById('undoBtn').onclick=()=>{undo();updateBoundsWarning();};
  document.getElementById('redoBtn').onclick=()=>{redo();updateBoundsWarning();};
  updateUndoRedoButtons();
  document.getElementById('mirrorH').onclick=()=>{pushHistory();S.obj.sx*=-1;updateProps();redraw();updateBoundsWarning();};
  document.getElementById('mirrorV').onclick=()=>{pushHistory();S.obj.sy*=-1;updateProps();redraw();updateBoundsWarning();};
  document.getElementById('centerBtn').onclick=()=>{
    pushHistory();
    S.obj.x=(S.bedW-S.obj.w*Math.abs(S.obj.sx))/2;
    S.obj.y=(S.bedH-S.obj.h*Math.abs(S.obj.sy))/2;
    updateProps();redraw();updateBoundsWarning();
  };
  document.getElementById('fitBtn').onclick=fitToBed;
  document.getElementById('nativeBtn').onclick=()=>{
    pushHistory();
    const signX=Math.sign(S.obj.sx||1),signY=Math.sign(S.obj.sy||1);
    S.obj.sx=signX;S.obj.sy=signY;
    S.obj.x=(S.bedW-S.obj.w)/2;
    S.obj.y=(S.bedH-S.obj.h)/2;
    updateProps();redraw();updateBoundsWarning();
  };
  document.getElementById('removeBtn').onclick=()=>{
    S.obj=null;S.moves=[];S.scrubPoints=[];S.gcodeLines=[];S.showPreview=false;stopPlay();
    clearHistory();
    emptyHint.style.display='';playbar.classList.remove('visible');
    document.getElementById('sliceBtn').style.display='none';
    document.getElementById('previewBtn').style.display='none';
    document.getElementById('dlBtn').style.display='none';
    segCount.style.display='none';gcInfo.style.display='none';
    renderGcode();updateProps();updateActions();redraw();setStatus('Object removed');renderSidebar();updateBoundsWarning();
  };
}
