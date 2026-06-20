// ─── STATE ───────────────────────────────────────────────────────────────────
const S = {
  bedW:200, bedH:200, origin:'Bottom Left',
  feedrate:1000, travelSpeed:3000, penUp:'M3 S0', penDown:'M3 S90',
  stepSize:0.5,          // mm per sample step — smaller = smoother but more lines
  obj:null,
  moves:[],              // flat list of {type:'draw'|'travel'|'pen', pts:[{x,y}], seg}
  scrubPoints:[],        // flattened point-stream used for smooth slider scrubbing (see playback.js)
  gcodeLines:[],
  showPreview:false,
  playHead:0,            // index into scrubPoints[] for playback (point-level granularity)
  playing:false,
  playTimer:null,
  activeSection:'file',
  dragging:false, dragSX:0, dragSY:0, objX0:0, objY0:0,
};

// ─── DOM ─────────────────────────────────────────────────────────────────────
const canvas=document.getElementById('bed');
const ctx=canvas.getContext('2d');
const cwrap=document.getElementById('cwrap');
const emptyHint=document.getElementById('emptyHint');
const statusText=document.getElementById('statusText');
const segCount=document.getElementById('segCount');
const gcview=document.getElementById('gcview');
const gcLineCount=document.getElementById('gcLineCount');
const bedInfo=document.getElementById('bedInfo');
const originInfo=document.getElementById('originInfo');
const gcInfo=document.getElementById('gcInfo');
const gcCount=document.getElementById('gcCount');
const bedLabel=document.getElementById('bedLabel');
const originLabel=document.getElementById('originLabel');
const posLabel=document.getElementById('posLabel');
const propPanel=document.getElementById('propPanel');
const actPanel=document.getElementById('actPanel');
const playbar=document.getElementById('playbar');
const playSlider=document.getElementById('playSlider');
const playStat=document.getElementById('playStat');
const playBtn=document.getElementById('playBtn');

// ─── CANVAS SIZING ───────────────────────────────────────────────────────────
let cW=600,cH=400;
function resizeCanvas(){
  const r=cwrap.getBoundingClientRect();
  cW=r.width; cH=r.height;
  canvas.width=cW; canvas.height=cH;
  redraw();
}
new ResizeObserver(resizeCanvas).observe(cwrap);

function getDPI(){
  const sx=(cW-60)/S.bedW, sy=(cH-60)/S.bedH;
  return Math.min(sx,sy,5);
}
function getPad(){
  const dpi=getDPI();
  return{px:(cW-S.bedW*dpi)/2, py:(cH-S.bedH*dpi)/2, dpi};
}

function setStatus(msg){statusText.textContent=msg;}
function updateBedLabels(){
  bedLabel.textContent=`Bed: ${S.bedW}×${S.bedH} mm`;
  originLabel.textContent=`Origin: ${S.origin}`;
  bedInfo.textContent=`${S.bedW}×${S.bedH} mm`;
  originInfo.textContent=S.origin;
}
