// ─── UNDO / REDO ─────────────────────────────────────────────────────────────
// Snapshot-based history for the loaded object's transform (position, size,
// scale, mirror). Every action that changes the object's placement — drag,
// resize-handle drag, Fit to Bed, Center, Mirror, typing a new width/height —
// calls pushHistory() FIRST (capturing the state right before the change).
// Undo restores the most recent snapshot; redo re-applies it.
//
// We snapshot only the transform-relevant fields (not the SVG geometry
// itself, which never changes), so each entry is tiny and this stays fast
// even with a long history.
function snapshotObj(o){
  if(!o) return null;
  return { x:o.x, y:o.y, w:o.w, h:o.h, sx:o.sx, sy:o.sy };
}
function pushHistory(){
  if(!S.obj) return;
  S.history.push(snapshotObj(S.obj));
  if(S.history.length>100) S.history.shift(); // cap memory use
  S.future=[]; // a new action invalidates any redo branch
  updateUndoRedoButtons();
}
function undo(){
  if(!S.obj||!S.history.length) return;
  S.future.push(snapshotObj(S.obj));
  const prev=S.history.pop();
  Object.assign(S.obj,prev);
  updateProps();redraw();updateUndoRedoButtons();
}
function redo(){
  if(!S.obj||!S.future.length) return;
  S.history.push(snapshotObj(S.obj));
  const next=S.future.pop();
  Object.assign(S.obj,next);
  updateProps();redraw();updateUndoRedoButtons();
}
function clearHistory(){
  S.history=[];S.future=[];updateUndoRedoButtons();
}
function updateUndoRedoButtons(){
  const u=document.getElementById('undoBtn'), r=document.getElementById('redoBtn');
  if(u) u.disabled=!S.history.length;
  if(r) r.disabled=!S.future.length;
}
