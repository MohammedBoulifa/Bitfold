// ---------- signature background: binary rain that "compacts" ----------
const canvas = document.getElementById('streamCanvas');
const ctx = canvas.getContext('2d');
function sizeCanvas(){
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
}
sizeCanvas();
window.addEventListener('resize', sizeCanvas);

let cols = [];
function initCols(){
  const n = Math.floor(canvas.clientWidth / 14);
  cols = Array.from({length:n}, (_,i)=>({
    x: i*14 + 4,
    y: Math.random()*40,
    speed: 0.3 + Math.random()*0.5,
    char: Math.random()>0.5 ? '1':'0'
  }));
}
initCols();
window.addEventListener('resize', initCols);

function tick(){
  ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);
  ctx.clearRect(0,0,canvas.clientWidth, canvas.clientHeight);
  ctx.font = '11px IBM Plex Mono, monospace';
  cols.forEach(c=>{
    c.y += c.speed;
    if (c.y > 46){ c.y = -10; c.char = Math.random()>0.5 ? '1':'0'; }
    const alpha = 0.15 + 0.25*Math.sin(c.y/8);
    ctx.fillStyle = `rgba(31,122,108,${Math.max(0.08,alpha)})`;
    ctx.fillText(c.char, c.x, c.y);
  });
  requestAnimationFrame(tick);
}
tick();

// ---------- tabs ----------
document.querySelectorAll('.tab').forEach(tab=>{
  tab.addEventListener('click', ()=>{
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    tab.classList.add('active');
    const which = tab.dataset.tab;
    document.getElementById('splitPanel').classList.toggle('hidden', which!=='split');
    document.getElementById('joinPanel').classList.toggle('hidden', which!=='join');
  });
});

// ---------- helpers ----------
function fmtSize(n){
  if (n < 1024) return n + ' B';
  if (n < 1024*1024) return (n/1024).toFixed(1) + ' KB';
  if (n < 1024*1024*1024) return (n/1024/1024).toFixed(2) + ' MB';
  return (n/1024/1024/1024).toFixed(2) + ' GB';
}

const SPLIT_MAGIC = 'BITFOLD-SPLIT1';
const HEADER_DELIM = '\n---\n';

// ---------- split ----------
const chunkSlider = document.getElementById('chunkSlider');
const chunkSliderLabel = document.getElementById('chunkSliderLabel');
const customChunkMB = document.getElementById('customChunkMB');

function formatMB(mb){
  if (mb >= 1024) {
    const gb = mb/1024;
    return (Number.isInteger(gb) ? gb : gb.toFixed(2).replace(/0+$/,'').replace(/\.$/,'')) + ' GB';
  }
  return mb + ' MB';
}
function syncFromSlider(){
  const mb = parseInt(chunkSlider.value, 10);
  customChunkMB.value = mb;
  chunkSliderLabel.textContent = formatMB(mb);
}
function syncFromCustom(){
  let mb = parseFloat(customChunkMB.value);
  if (!(mb > 0)) return;
  if (mb > 4096) mb = 4096;
  chunkSlider.value = Math.min(4096, Math.max(1, Math.round(mb)));
  chunkSliderLabel.textContent = formatMB(mb);
}
chunkSlider.addEventListener('input', ()=>{ syncFromSlider(); onChunkSizeChanged(); });
customChunkMB.addEventListener('input', ()=>{ syncFromCustom(); onChunkSizeChanged(); });
syncFromSlider();

const splitDrop = document.getElementById('splitDrop');
const splitInput = document.getElementById('splitInput');
const splitMeta = document.getElementById('splitMeta');
const splitPartsDiv = document.getElementById('splitParts');
const splitStatus = document.getElementById('splitStatus');

splitDrop.addEventListener('click', ()=> splitInput.click());
['dragover','dragenter'].forEach(ev=> splitDrop.addEventListener(ev, e=>{ e.preventDefault(); splitDrop.classList.add('drag'); }));
['dragleave','drop'].forEach(ev=> splitDrop.addEventListener(ev, e=>{ e.preventDefault(); splitDrop.classList.remove('drag'); }));
splitDrop.addEventListener('drop', e=>{ if (e.dataTransfer.files.length) handleSplit(e.dataTransfer.files[0]); });
splitInput.addEventListener('change', e=>{ if (e.target.files.length) handleSplit(e.target.files[0]); });

function getChunkSizeBytes(){
  const mb = parseFloat(customChunkMB.value);
  return (mb > 0 ? mb : parseInt(chunkSlider.value, 10)) * 1000 * 1000;
}

let splitParts = []; // [{name, blob}]
let currentSplitFile = null;
let chunkChangeDebounce = null;

function onChunkSizeChanged(){
  if (!currentSplitFile) return;
  clearTimeout(chunkChangeDebounce);
  chunkChangeDebounce = setTimeout(()=> rebuildSplitParts(currentSplitFile), 120);
}

function handleSplit(file){
  currentSplitFile = file;
  rebuildSplitParts(file);
}

function rebuildSplitParts(file){
  splitStatus.textContent = '';
  splitStatus.className = 'status';
  splitMeta.classList.add('hidden');
  splitPartsDiv.innerHTML = '';
  splitParts = [];

  const chunkSize = getChunkSizeBytes();
  const totalParts = Math.max(1, Math.ceil(file.size / chunkSize));

  splitMeta.innerHTML = `<b>${file.name}</b> — ${fmtSize(file.size)} → ${totalParts} part${totalParts>1?'s':''} of up to ${fmtSize(chunkSize)} each`;
  splitMeta.classList.remove('hidden');

  for (let i=0; i<totalParts; i++){
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const rawChunk = file.slice(start, end); // lazy, no full read into memory

    const header = JSON.stringify({
      magic: SPLIT_MAGIC, name: file.name, type: file.type || 'application/octet-stream',
      totalSize: file.size, partIndex: i, totalParts, partSize: end - start
    });
    const headerBlob = new Blob([header + HEADER_DELIM], {type:'text/plain'});
    const fullPart = new Blob([headerBlob, rawChunk]);
    const partName = `${file.name}.part${String(i+1).padStart(3,'0')}of${String(totalParts).padStart(3,'0')}`;
    splitParts.push({ name: partName, blob: fullPart });
  }

  if (totalParts > 1){
    const autoRow = document.createElement('div');
    autoRow.className = 'row';
    autoRow.style.marginTop = '0';
    const autoBtn = document.createElement('button');
    autoBtn.className = 'primary';
    autoBtn.textContent = `Auto-download all ${totalParts} parts, one at a time`;
    autoBtn.addEventListener('click', ()=> downloadAllPartsSequentially(autoBtn));
    autoRow.appendChild(autoBtn);
    splitPartsDiv.appendChild(autoRow);
  }

  splitParts.forEach(part=>{
    const row = document.createElement('div');
    row.className = 'row';
    row.style.marginTop = '10px';
    const btn = document.createElement('button');
    btn.className = 'primary';
    btn.textContent = `Download ${part.name}  (${fmtSize(part.blob.size)})`;
    btn.addEventListener('click', ()=> downloadPart(part));
    row.appendChild(btn);
    splitPartsDiv.appendChild(row);
  });

  splitStatus.textContent = 'Ready — download each part and send them all, or use auto-download above. Keep every part; joining needs all of them.';
  splitStatus.className = 'status ok';
}

function downloadPart(part){
  const url = URL.createObjectURL(part.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = part.name;
  a.click();
  setTimeout(()=> URL.revokeObjectURL(url), 4000);
}

// Browsers give no event for "the file finished saving to disk" on a script-triggered
// download, so this waits a delay scaled to each part's size (with sensible floor/ceiling)
// before starting the next one, rather than firing every download at once.
function estimateDownloadDelay(bytes){
  const assumedBytesPerMs = 50 * 1024; // ~50 MB/s, a conservative disk-write estimate
  return Math.min(6000, Math.max(700, bytes / assumedBytesPerMs));
}

async function downloadAllPartsSequentially(triggerBtn){
  triggerBtn.disabled = true;
  for (let i=0; i<splitParts.length; i++){
    const part = splitParts[i];
    splitStatus.textContent = `Downloading part ${i+1} of ${splitParts.length} (${part.name})…`;
    splitStatus.className = 'status';
    downloadPart(part);
    await new Promise(res=> setTimeout(res, estimateDownloadDelay(part.blob.size)));
  }
  splitStatus.textContent = `All ${splitParts.length} parts sent to your downloads. Keep every part; joining needs all of them.`;
  splitStatus.className = 'status ok';
  triggerBtn.disabled = false;
}

// ---------- join ----------
const joinDrop = document.getElementById('joinDrop');
const joinInput = document.getElementById('joinInput');
const joinMeta = document.getElementById('joinMeta');
const joinStatus = document.getElementById('joinStatus');
let joinFiles = [];

joinDrop.addEventListener('click', ()=> joinInput.click());
['dragover','dragenter'].forEach(ev=> joinDrop.addEventListener(ev, e=>{ e.preventDefault(); joinDrop.classList.add('drag'); }));
['dragleave','drop'].forEach(ev=> joinDrop.addEventListener(ev, e=>{ e.preventDefault(); joinDrop.classList.remove('drag'); }));
joinDrop.addEventListener('drop', e=>{
  if (e.dataTransfer.files.length){ joinFiles = Array.from(e.dataTransfer.files); showJoinMeta(); }
});
joinInput.addEventListener('change', e=>{
  if (e.target.files.length){ joinFiles = Array.from(e.target.files); showJoinMeta(); }
});
function showJoinMeta(){
  joinMeta.innerHTML = `${joinFiles.length} file(s) selected: ` + joinFiles.map(f=>f.name).join(', ');
  joinMeta.classList.remove('hidden');
  joinStatus.textContent = '';
}

async function parsePartHeader(file){
  // read a small prefix as text to find the header without loading the whole file
  const prefixText = await file.slice(0, 4096).text();
  const sep = prefixText.indexOf(HEADER_DELIM);
  if (sep === -1) throw new Error(`${file.name} has no valid part header`);
  const headerStr = prefixText.slice(0, sep);
  const header = JSON.parse(headerStr);
  if (header.magic !== SPLIT_MAGIC) throw new Error(`${file.name} is not a bitfold part`);
  const headerByteLength = new TextEncoder().encode(headerStr + HEADER_DELIM).length;
  const body = file.slice(headerByteLength);
  return { header, body };
}

document.getElementById('joinBtn').addEventListener('click', async ()=>{
  joinStatus.className = 'status';
  if (!joinFiles.length){ joinStatus.textContent = 'Select the part files first.'; joinStatus.className = 'status err'; return; }
  try{
    joinStatus.textContent = 'Reading part headers…';
    const parsed = await Promise.all(joinFiles.map(parsePartHeader));

    const first = parsed[0].header;
    if (!parsed.every(p => p.header.name === first.name && p.header.totalParts === first.totalParts && p.header.totalSize === first.totalSize)){
      throw new Error('these parts don\'t all belong to the same file');
    }
    if (parsed.length !== first.totalParts){
      throw new Error(`expected ${first.totalParts} parts, got ${parsed.length} — a part is missing`);
    }

    parsed.sort((a,b)=> a.header.partIndex - b.header.partIndex);
    for (let i=0;i<parsed.length;i++){
      if (parsed[i].header.partIndex !== i) throw new Error('parts are missing or duplicated');
    }

    joinStatus.textContent = 'Rebuilding file…';
    const finalBlob = new Blob(parsed.map(p=>p.body), { type: first.type });

    if (finalBlob.size !== first.totalSize){
      throw new Error(`rebuilt size ${finalBlob.size} does not match expected ${first.totalSize} — a part may be corrupted`);
    }

    const a = document.createElement('a');
    const url = URL.createObjectURL(finalBlob);
    a.href = url;
    a.download = first.name;
    a.click();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);

    joinStatus.textContent = `Rebuilt "${first.name}" (${fmtSize(finalBlob.size)}) and verified size matches original.`;
    joinStatus.className = 'status ok';
  }catch(err){
    joinStatus.textContent = 'Error: ' + err.message;
    joinStatus.className = 'status err';
  }
});
document.getElementById('resetJoin').addEventListener('click', ()=>{
  joinFiles = []; joinInput.value = '';
  joinMeta.classList.add('hidden'); joinStatus.textContent = '';
});
