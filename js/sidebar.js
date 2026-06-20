// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function renderSidebar(){
  const sc=document.getElementById('scontent');
  const sec=S.activeSection;
  if(sec==='file'){
    sc.innerHTML=`
      <div class="stitle">Import</div>
      <div class="drop-zone" id="dropZone">
        <span class="drop-icon">⬇</span>
        Click or drag SVG here<br>
        <span style="font-size:10px;color:var(--text-dim)">PNG·JPG·PDF coming in Phase 2</span>
      </div>
      <div style="margin-top:10px;font-size:10px;color:var(--text-mut)" id="fileInfo">
        ${S.obj?`<b style="color:var(--text-pri)">${S.obj.name}</b><br>${S.obj.paths.length} paths · vb ${S.obj.vbW}×${S.obj.vbH}`:'No file loaded'}
      </div>
      <div class="stitle" style="margin-top:12px">Sample Quality</div>
      <div class="row"><span class="lbl">Step</span><input class="inp" type="number" step="0.1" min="0.1" max="5" id="stepSize" value="${S.stepSize}"/><span class="unit">mm</span></div>
      <div style="font-size:9px;color:var(--text-dim);margin-top:2px">Smaller = smoother paths, more G-code lines</div>
    `;
    document.getElementById('dropZone').onclick=()=>document.getElementById('fileInput').click();
    document.getElementById('dropZone').ondragover=e=>{e.preventDefault();e.currentTarget.classList.add('drag');};
    document.getElementById('dropZone').ondragleave=e=>e.currentTarget.classList.remove('drag');
    document.getElementById('dropZone').ondrop=e=>{e.preventDefault();e.currentTarget.classList.remove('drag');importFile(e.dataTransfer.files[0]);};
    document.getElementById('stepSize').onchange=e=>{S.stepSize=Math.max(0.1,+e.target.value);};
    return;
  }
  if(sec==='machine'){
    sc.innerHTML=`
      <div class="stitle">Bed Size</div>
      ${[[200,200],[300,300],[500,500]].map(([w,h])=>`
        <div class="sitem ${S.bedW===w&&S.bedH===h?'active':''}" data-bw="${w}" data-bh="${h}">${w}×${h} mm</div>
      `).join('')}
      <div class="sitem" id="customToggle">Custom…</div>
      <div id="customBed" style="display:none;margin-top:6px">
        <div class="row"><span class="lbl">Width</span><input class="inp" type="number" id="cbw" value="${S.bedW}"/><span class="unit">mm</span></div>
        <div class="row"><span class="lbl">Height</span><input class="inp" type="number" id="cbh" value="${S.bedH}"/><span class="unit">mm</span></div>
        <button class="action-btn" id="applyCustom" style="margin-top:4px">Apply</button>
      </div>
      <div class="stitle" style="margin-top:12px">Origin</div>
      ${['Top Left','Bottom Left','Center'].map(o=>`<div class="sitem ${S.origin===o?'active':''}" data-origin="${o}">${o}</div>`).join('')}
    `;
    sc.querySelectorAll('[data-bw]').forEach(el=>el.onclick=()=>{S.bedW=+el.dataset.bw;S.bedH=+el.dataset.bh;updateBedLabels();renderSidebar();redraw();});
    document.getElementById('customToggle').onclick=()=>{const cb=document.getElementById('customBed');cb.style.display=cb.style.display==='none'?'':'none';};
    document.getElementById('applyCustom').onclick=()=>{S.bedW=+document.getElementById('cbw').value||200;S.bedH=+document.getElementById('cbh').value||200;updateBedLabels();renderSidebar();redraw();};
    sc.querySelectorAll('[data-origin]').forEach(el=>el.onclick=()=>{S.origin=el.dataset.origin;updateBedLabels();renderSidebar();redraw();});
    return;
  }
  if(sec==='gcsettings'){
    sc.innerHTML=`
      <div class="stitle">Motion</div>
      <div class="row"><span class="lbl">Feed</span><input class="inp" type="number" id="gfeed" value="${S.feedrate}"/><span class="unit" style="width:50px;font-size:9px">mm/min</span></div>
      <div class="row"><span class="lbl">Travel</span><input class="inp" type="number" id="gtravel" value="${S.travelSpeed}"/><span class="unit" style="width:50px;font-size:9px">mm/min</span></div>
      <div class="stitle" style="margin-top:10px">Pen</div>
      <div class="row"><span class="lbl">Up cmd</span><input class="inp" type="text" id="gpu" value="${S.penUp}"/></div>
      <div class="row"><span class="lbl">Down cmd</span><input class="inp" type="text" id="gpd" value="${S.penDown}"/></div>
    `;
    document.getElementById('gfeed').onchange=e=>S.feedrate=+e.target.value;
    document.getElementById('gtravel').onchange=e=>S.travelSpeed=+e.target.value;
    document.getElementById('gpu').onchange=e=>S.penUp=e.target.value;
    document.getElementById('gpd').onchange=e=>S.penDown=e.target.value;
    return;
  }
  if(sec==='layers'){
    sc.innerHTML=`
      <div class="stitle">Layers</div>
      ${S.obj?`<div class="sitem active">● Layer 1 — ${S.obj.paths.length} paths</div>`:'<div style="font-size:10px;color:var(--text-dim)">No layers yet</div>'}
    `;
  }
}

// ─── GCODE VIEWER ─────────────────────────────────────────────────────────────
function renderGcode(){
  if(!S.gcodeLines.length){gcview.innerHTML='<div class="gc-empty">No G-code yet</div>';gcLineCount.textContent='';return;}
  gcLineCount.textContent=S.gcodeLines.length+' lines';
  const frag=document.createDocumentFragment();
  S.gcodeLines.forEach(l=>{
    const div=document.createElement('div');
    div.className='gcline';
    if(l.startsWith(';')) div.classList.add('cmt');
    else if(l.startsWith('G0')) div.classList.add('g0');
    else if(l.startsWith('G1')) div.classList.add('g1');
    else if(l.startsWith('M3')) div.classList.add('m3');
    div.textContent=l||' ';
    frag.appendChild(div);
  });
  gcview.innerHTML='';gcview.appendChild(frag);
}
