// ─── PLAYBACK ────────────────────────────────────────────────────────────────
// S.playHead now indexes into S.scrubPoints (point-level), not S.moves
// (move-level). This is what gives the slider smooth, accurate scrubbing —
// see the comment above buildScrubPoints() in gcode.js for why the old
// move-level model felt broken when dragging.
function setSlider(val){
  S.playHead=val;
  playSlider.value=val;
  updatePlayStat();
  redraw();
}
function updatePlayStat(){
  const total=S.scrubPoints.length;
  const cur=Math.max(0,Math.min(S.playHead,total));
  playStat.textContent=`Point ${cur}/${total}`;
}

playSlider.oninput=()=>setSlider(+playSlider.value);

document.getElementById('playRewind').onclick=()=>{stopPlay();setSlider(0);};
document.getElementById('playEnd').onclick=()=>{stopPlay();setSlider(S.scrubPoints.length);};

function stopPlay(){
  S.playing=false;clearInterval(S.playTimer);
  playBtn.textContent='▶';playBtn.classList.remove('act');
}
function startPlay(){
  if(S.playHead>=S.scrubPoints.length) S.playHead=0;
  S.playing=true;
  playBtn.textContent='⏸';playBtn.classList.add('act');
  // advance a few points per tick so playback speed feels similar to before,
  // now that the unit of progress is "points" instead of coarse "moves"
  const stepPerTick=Math.max(1,Math.round(S.scrubPoints.length/400));
  S.playTimer=setInterval(()=>{
    S.playHead+=stepPerTick;
    if(S.playHead>=S.scrubPoints.length){
      S.playHead=S.scrubPoints.length;
      playSlider.value=S.playHead;
      updatePlayStat();
      redraw();
      stopPlay();
      return;
    }
    playSlider.value=S.playHead;
    updatePlayStat();
    redraw();
  },18);
}
playBtn.onclick=()=>{ if(S.playing) stopPlay(); else startPlay(); };
