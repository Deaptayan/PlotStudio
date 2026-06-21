// ─── STATE ───────────────────────────────────────────────────────────────────
const S = {
  bedW:200, bedH:200, origin:'Bottom Left',
  feedrate:1000, travelSpeed:3000, penUp:'M3 S0', penDown:'M3 S90',
  stepSize:0.5,          // mm per sample step — smaller = smoother but more lines
  fillMode:'outline',    // 'outline' = trace shape edges only | 'exact' = also hatch-fill solid regions like the source SVG
  hatchSpacing:1.0,      // mm between hatch lines when fillMode === 'exact'
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
  resizing:false, resizeHandle:null, resizeStartObj:null, resizeStartMouse:null,
  resizeDriveAxis:null,  // 'x'|'y'|null — which axis drives an aspect-locked corner resize, fixed once per drag (see main.js)
  hoverHandle:null,
  history:[],            // undo stack — snapshots of S.obj transform fields
  future:[],             // redo stack
  displayUnit:'mm',      // unit shown/entered in the Transform panel: mm|cm|in|px
};

// ─── UNIT CONVERSION ─────────────────────────────────────────────────────────
// Everything in S.obj is stored in millimetres internally — these only
// convert for display/input in the Transform panel, so the rest of the app
// (slicing, G-code, canvas math) never has to think about units.
const UNIT_TO_MM = { mm:1, cm:10, in:25.4, px:25.4/96 }; // 96 CSS px per inch
function mmToUnit(mm,u){ return mm/UNIT_TO_MM[u]; }
function unitToMm(v,u){ return v*UNIT_TO_MM[u]; }

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
  // BUG FIX (intermittent "redraw is not defined" on load): state.js is the
  // FIRST script tag, and it attaches this ResizeObserver immediately. Per
  // spec, ResizeObserver fires its callback asynchronously very soon after
  // being observed — often before later <script> tags (render.js, which
  // defines redraw()) have finished loading and running, especially under
  // any page-load timing jitter (slow network, cold cache, etc). That race
  // made this throw ~30-40% of the time on fresh loads. redraw is only ever
  // missing for this brief startup window, so a typeof guard is sufficient —
  // once render.js has run, redraw is permanently defined for the rest of
  // the page's life.
  if(typeof redraw==='function') redraw();
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

// Whether the object's current position+size bounding box is fully within
// the bed [0,0]–[bedW,bedH]. Checked by both the Slice button (to block
// slicing of out-of-bounds work) and the on-canvas warning banner — this is
// the one place that defines "fits the bed" so the two can never disagree.
// A small epsilon avoids false positives from floating-point rounding when
// an object is sitting exactly on the bed edge (e.g. after Fit to Bed).
function objectFitsBed(o){
  if(!o) return true;
  const EPS=0.01;
  const w=o.w*Math.abs(o.sx), h=o.h*Math.abs(o.sy);
  return o.x>=-EPS && o.y>=-EPS && (o.x+w)<=S.bedW+EPS && (o.y+h)<=S.bedH+EPS;
}
