import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Add your Supabase project URL and anon/public key here.
// Supabase Dashboard -> Project Settings -> API.
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";

const $ = (id) => document.getElementById(id);
const supabaseConfigured = SUPABASE_URL.startsWith("https://") && !SUPABASE_URL.includes("YOUR_") && !SUPABASE_ANON_KEY.includes("YOUR_");
const supabase = supabaseConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

let currentUser = null;
let songs = [];
let selections = [];
let toastTimer;

function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2600);
}
function setMessage(id, message = "", type = "") {
  const el = $(id); el.textContent = message; el.className = `message ${type}`;
}
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}
function showAuth() {
  $("auth-panel").classList.remove("hidden");
  $("main-app").classList.add("hidden");
  $("logout-btn").classList.add("hidden");
  $("user-label").textContent = "";
}
function showApp() {
  $("auth-panel").classList.add("hidden");
  $("main-app").classList.remove("hidden");
  $("logout-btn").classList.remove("hidden");
  $("user-label").textContent = currentUser?.email || "";
}
async function loadData() {
  const [songResult, selectionResult] = await Promise.all([
    supabase.from("songs").select("*").order("book").order("number").order("title"),
    supabase.from("song_selections").select("song_id, selected_at")
  ]);
  if (songResult.error) throw songResult.error;
  if (selectionResult.error) throw selectionResult.error;
  songs = songResult.data || [];
  selections = selectionResult.data || [];
  render();
}
function render() {
  const selectedIds = new Set(selections.map(s => s.song_id));
  const total = songs.length, played = selectedIds.size, remaining = Math.max(0, total - played);
  $("stat-total").textContent = total;
  $("stat-played").textContent = played;
  $("stat-remaining").textContent = remaining;
  $("remaining-pill").textContent = `${remaining} remaining`;
  const progress = total ? Math.round(played / total * 100) : 0;
  $("progress-text").textContent = `${progress}%`;
  $("progress-bar").style.width = `${progress}%`;
  renderLibrary();
  renderBookStats(selectedIds);
  $("pick-btn").disabled = remaining === 0;
  if (!songs.length) {
    $("song-display").innerHTML = `<div class="empty-note"><div class="music-mark">♫</div><h3>Your playlist starts here</h3><p>Add songs to your library, then pick your first random song.</p></div>`;
  } else if (remaining === 0) {
    $("song-display").innerHTML = `<div class="empty-note"><div class="music-mark">✓</div><h3>You've played them all!</h3><p>You selected every song in your collection. Reset the round whenever you're ready for another one.</p></div>`;
    setMessage("picker-message", "You played all the songs available. Reset your selection to start again.", "success");
  }
}
function renderLibrary() {
  const q = $("search-input").value.trim().toLowerCase();
  const book = $("book-filter").value;
  const filtered = songs.filter(s => (!book || s.book === book) &&
    [s.title,s.artist,s.book,s.number].some(v => String(v || "").toLowerCase().includes(q)));
  const books = [...new Set(songs.map(s => s.book).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const previous = $("book-filter").value;
  $("book-filter").innerHTML = `<option value="">All books</option>` + books.map(b=>`<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
  if (books.includes(previous)) $("book-filter").value = previous;
  $("library-summary").textContent = `${filtered.length} of ${songs.length} songs · ${books.length} books`;
  $("songs-table").innerHTML = filtered.length ? filtered.map(s=>`<tr>
    <td>${escapeHtml(s.title)}</td><td>${escapeHtml(s.artist || "—")}</td><td>${escapeHtml(s.book)}</td><td>${escapeHtml(s.number || "—")}</td>
    <td><div class="row-actions"><button class="text-action" data-edit="${s.id}">Edit</button><button class="text-action delete" data-delete="${s.id}">Delete</button></div></td>
  </tr>`).join("") : `<tr><td colspan="5" class="table-empty">${songs.length ? "No matching songs." : "Your library is empty. Add your first song."}</td></tr>`;
}
function renderBookStats(selectedIds) {
  const groups = new Map();
  for (const song of songs) {
    if (!groups.has(song.book)) groups.set(song.book, {total:0,played:0});
    const g = groups.get(song.book); g.total++;
    if (selectedIds.has(song.id)) g.played++;
  }
  const entries = [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
  $("book-stats").innerHTML = entries.length ? entries.map(([name,g])=>{
    const pct = g.total ? Math.round(g.played/g.total*100) : 0;
    return `<div class="book-stat"><div class="book-stat-head"><span>${escapeHtml(name)}</span><span>${g.played}/${g.total}</span></div><small>${g.total-g.played} remaining · ${pct}% selected</small><div class="book-mini-track"><div class="book-mini-fill" style="width:${pct}%"></div></div></div>`;
  }).join("") : `<p class="muted">Your book statistics will appear here.</p>`;
}
async function pickSong() {
  setMessage("picker-message");
  const selectedIds = new Set(selections.map(s=>s.song_id));
  const available = songs.filter(s=>!selectedIds.has(s.id));
  if (!available.length) { render(); return; }
  const song = available[Math.floor(Math.random()*available.length)];
  const { error } = await supabase.from("song_selections").insert({song_id:song.id});
  if (error) {
    if (error.code === "23505") {
      await loadData();
      setMessage("picker-message", "Another device selected a song at the same time. Try again.", "error");
      return;
    }
    setMessage("picker-message", error.message, "error"); return;
  }
  selections.push({song_id:song.id,selected_at:new Date().toISOString()});
  $("song-display").innerHTML = `<div class="song-result"><div class="result-label">✦ Your randomly selected song</div><h3>${escapeHtml(song.title)}</h3><div class="artist">${escapeHtml(song.artist || "Unknown artist")}</div><div class="song-meta"><span>▤ ${escapeHtml(song.book)}</span><span>№ ${escapeHtml(song.number || "—")}</span></div></div>`;
  render();
  // render() only replaces the display when the round is empty.
}
async function resetRound() {
  if (!selections.length) { toast("Your selection is already empty."); return; }
  if (!confirm("Reset your selection history? All songs will become available again.")) return;
  const {error} = await supabase.from("song_selections").delete().not("song_id", "is", null);
  if (error) { toast(error.message); return; }
  selections = [];
  $("song-display").innerHTML = `<div class="empty-note"><div class="music-mark">↻</div><h3>Fresh round!</h3><p>Your whole collection is available again. Pick your next song.</p></div>`;
  setMessage("picker-message","Selection reset. Every song is available again.","success");
  render(); toast("Your selection has been reset.");
}
function openSongDialog(song=null) {
  $("song-form").reset();
  $("song-id").value = song?.id || "";
  $("song-title").value = song?.title || "";
  $("song-artist").value = song?.artist || "";
  $("song-book").value = song?.book || "";
  $("song-number").value = song?.number || "";
  $("dialog-title").textContent = song ? "Edit song" : "Add a song";
  setMessage("song-form-message");
  $("song-dialog").showModal();
}
async function saveSong(event) {
  event.preventDefault();
  const id = $("song-id").value;
  const payload = {title:$("song-title").value.trim(),artist:$("song-artist").value.trim(),book:$("song-book").value.trim(),number:$("song-number").value.trim()};
  if (!payload.title || !payload.book) return;
  const query = id ? supabase.from("songs").update(payload).eq("id",id) : supabase.from("songs").insert(payload);
  const {error} = await query;
  if (error) { setMessage("song-form-message",error.message,"error"); return; }
  $("song-dialog").close();
  await loadData(); toast(id ? "Song updated." : "Song added to your library.");
}
async function deleteSong(id) {
  const song = songs.find(s=>s.id===id);
  if (!song || !confirm(`Delete "${song.title}" from your library?`)) return;
  const {error} = await supabase.from("songs").delete().eq("id",id);
  if (error) { toast(error.message); return; }
  await loadData(); toast("Song deleted.");
}
function parseCsv(text) {
  const rows=[]; let row=[], field="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], next=text[i+1];
    if(c==='"' && quoted && next==='"'){field+='"';i++;}
    else if(c==='"') quoted=!quoted;
    else if(c===',' && !quoted){row.push(field);field="";}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&next==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field="";}
    else field+=c;
  }
  row.push(field); if(row.some(v=>v.trim()))rows.push(row);
  if(!rows.length)return [];
  const headers=rows.shift().map(h=>h.trim().toLowerCase());
  const idx=(...names)=>headers.findIndex(h=>names.includes(h));
  const ti=idx("song","title"), ai=idx("artist"), bi=idx("book"), ni=idx("number","no","page");
  if(ti<0||bi<0)throw new Error("CSV needs columns named Song and Book. Artist and Number are optional.");
  return rows.map(r=>({title:(r[ti]||"").trim(),artist:ai>=0?(r[ai]||"").trim():"",book:(r[bi]||"").trim(),number:ni>=0?(r[ni]||"").trim():""})).filter(s=>s.title&&s.book);
}
async function importCsv(file) {
  try{
    const records=parseCsv(await file.text());
    if(!records.length)throw new Error("No valid songs found in the CSV.");
    let inserted=0;
    for(let i=0;i<records.length;i+=100){
      const {data,error}=await supabase.from("songs").insert(records.slice(i,i+100)).select("id");
      if(error)throw error;
      inserted+=data.length;
    }
    await loadData(); toast(`${inserted} songs imported.`);
  }catch(e){toast(`Import failed: ${e.message}`);}
  $("import-file").value="";
}
function downloadCsv() {
  const headers=["Song","Artist","Book","Number"];
  const quote=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const csv=[headers,...songs.map(s=>[s.title,s.artist,s.book,s.number])].map(r=>r.map(quote).join(",")).join("\r\n");
  const blob=new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="piano-roulette-songs.csv";a.click();URL.revokeObjectURL(url);
}

$("auth-form").addEventListener("submit", async e=>{
  e.preventDefault(); if(!supabase){setMessage("auth-message","First configure your Supabase URL and anon key in app.js.","error");return;}
  const {error}=await supabase.auth.signInWithPassword({email:$("auth-email").value.trim(),password:$("auth-password").value});
  if(error)setMessage("auth-message",error.message,"error");
});
$("signup-btn").addEventListener("click",async()=>{
  if(!supabase){setMessage("auth-message","First configure your Supabase URL and anon key in app.js.","error");return;}
  const email=$("auth-email").value.trim(),password=$("auth-password").value;
  if(!email||password.length<6){setMessage("auth-message","Enter an email and a password of at least 6 characters.","error");return;}
  const {data,error}=await supabase.auth.signUp({email,password});
  if(error)setMessage("auth-message",error.message,"error");
  else setMessage("auth-message",data.session?"Account created. You are signed in.":"Account created. Check your email to confirm, then sign in.","success");
});
$("logout-btn").addEventListener("click",async()=>{await supabase.auth.signOut();});
$("pick-btn").addEventListener("click",pickSong);
$("reset-btn").addEventListener("click",resetRound);
$("add-song-btn").addEventListener("click",()=>openSongDialog());
$("close-dialog").addEventListener("click",()=>$("song-dialog").close());
$("cancel-song").addEventListener("click",()=>$("song-dialog").close());
$("song-form").addEventListener("submit",saveSong);
$("songs-table").addEventListener("click",e=>{
  const edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
  if(edit)openSongDialog(songs.find(s=>s.id===edit.dataset.edit));
  if(del)deleteSong(del.dataset.delete);
});
$("search-input").addEventListener("input",renderLibrary);
$("book-filter").addEventListener("change",renderLibrary);
$("export-btn").addEventListener("click",downloadCsv);
$("import-file").addEventListener("change",e=>{if(e.target.files[0])importCsv(e.target.files[0]);});

if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("./sw.js").catch(console.warn);
if(!supabaseConfigured){showAuth();setMessage("auth-message","Setup required: create a Supabase project, run supabase-setup.sql, then add your project URL and anon key to app.js.","error");}
else{
  supabase.auth.onAuthStateChange((_event,session)=>{
    currentUser=session?.user||null;
    if(currentUser){
      showApp();
      // Defer database work until after the auth event callback releases its lock.
      setTimeout(()=>loadData().catch(e=>toast(`Could not load your data: ${e.message}`)),0);
    } else showAuth();
  });
  supabase.auth.getSession().then(({data:{session}})=>{
    currentUser=session?.user||null;
    if(currentUser){showApp();loadData().catch(e=>toast(e.message));}else showAuth();
  });
}
