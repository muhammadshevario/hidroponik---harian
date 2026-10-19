import { firebaseConfig, isFirebaseConfigured } from "/firebase-config.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";

const $ = (id) => document.getElementById(id);
const form = $("reportForm");
const badge = $("connectionBadge");
const formMessage = $("formMessage");
const submitButton = $("submitButton");
const photoInput = $("photo");
let db = null, storage = null, reports = [], selectedPhotoUrl = "";
let unsubscribe = null;

const today = new Date();
$("reportDate").value = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

function setBadge(text, type) {
  badge.textContent = text;
  badge.className = `status-pill ${type}`;
}
function showMessage(text, type="") {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}
function escapeHtml(value="") {
  return String(value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
}
function fmtDate(dateString) {
  if (!dateString) return "—";
  const d = new Date(`${dateString}T00:00:00`);
  return Number.isNaN(d.getTime()) ? dateString : d.toLocaleDateString("id-ID", {day:"2-digit", month:"short", year:"numeric"});
}
function num(id) {
  const v = $(id).value.trim();
  return v === "" ? null : Number(v);
}
function mean(values) {
  const nums = values.filter(v => Number.isFinite(v));
  return nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : null;
}
function fmtNum(n, digits=1) {
  return n == null ? "—" : Number(n).toLocaleString("id-ID", {maximumFractionDigits:digits});
}
function getDateValue(r) {
  return r.reportDate || (r.createdAt?.toDate ? r.createdAt.toDate().toISOString().slice(0,10) : "");
}
function updateStats() {
  $("totalReports").textContent = reports.length.toLocaleString("id-ID");
  $("avgPh").textContent = fmtNum(mean(reports.map(r=>r.ph)), 2);
  $("avgPpm").textContent = fmtNum(mean(reports.map(r=>r.ppm)), 0);
  const latest = [...reports].sort((a,b)=>(getDateValue(b)||"").localeCompare(getDateValue(a)||""))[0];
  $("latestDate").textContent = latest ? fmtDate(getDateValue(latest)) : "—";
  $("latestAuthor").textContent = latest ? (latest.author || "Anggota tim") : "Belum ada laporan";
}
function conditionClass(c) {
  return c === "Baik" ? "good" : c === "Bermasalah" ? "bad" : "watch";
}
function renderReports() {
  const term = $("searchInput").value.trim().toLowerCase();
  const condition = $("conditionFilter").value;
  const filtered = [...reports].filter(r => {
    const matches = `${r.author||""} ${r.plant||""} ${r.notes||""}`.toLowerCase().includes(term);
    return matches && (!condition || r.condition === condition);
  }).sort((a,b)=>(getDateValue(b)||"").localeCompare(getDateValue(a)||""));
  const host = $("reportsList");
  if (!filtered.length) {
    host.innerHTML = `<div class="empty-state">${reports.length ? "Tidak ada laporan yang cocok dengan filter." : "Belum ada laporan. Tambahkan laporan pertama tim."}</div>`;
    return;
  }
  host.innerHTML = filtered.map(r => `
    <button class="report-row" data-id="${escapeHtml(r.id)}" type="button">
      <div class="report-date">${escapeHtml(fmtDate(getDateValue(r)))}</div>
      <div class="report-main"><strong>${escapeHtml(r.plant || "Tanaman tanpa nama")}</strong><span>oleh ${escapeHtml(r.author || "Anggota tim")}</span>
        <div class="report-metrics">${r.ph != null ? `<span>pH ${escapeHtml(fmtNum(r.ph,2))}</span>` : ""}${r.ppm != null ? `<span>${escapeHtml(fmtNum(r.ppm,0))} PPM</span>` : ""}${r.height != null ? `<span>${escapeHtml(fmtNum(r.height,1))} cm</span>` : ""}</div>
      </div>
      <span class="condition ${conditionClass(r.condition)}">${escapeHtml(r.condition || "—")}</span>
      <span class="row-chevron">›</span>
    </button>`).join("");
  host.querySelectorAll("[data-id]").forEach(btn => btn.addEventListener("click", () => showDetail(btn.dataset.id)));
}
function drawChart() {
  const canvas = $("growthChart"), ctx = canvas.getContext("2d");
  const wrap = canvas.parentElement;
  const w = Math.max(260, wrap.clientWidth), h = 220, dpr = window.devicePixelRatio || 1;
  canvas.width = w*dpr; canvas.height = h*dpr; canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  ctx.scale(dpr,dpr); ctx.clearRect(0,0,w,h);
  const points = [...reports].filter(r => r.height != null && Number.isFinite(Number(r.height)))
    .sort((a,b)=>(getDateValue(a)||"").localeCompare(getDateValue(b)||""))
    .slice(-20);
  $("chartEmpty").classList.toggle("hidden", points.length > 0);
  $("chartCount").textContent = `${points.length} titik data`;
  if (!points.length) return;
  const pad = {l:38,r:12,t:14,b:38}, cw=w-pad.l-pad.r, ch=h-pad.t-pad.b;
  const vals=points.map(r=>Number(r.height)), min=Math.min(0,...vals), max=Math.max(...vals,1), range=max-min || 1;
  ctx.font="11px system-ui"; ctx.fillStyle="#758078"; ctx.strokeStyle="#e6ece7"; ctx.lineWidth=1;
  for(let i=0;i<=4;i++){
    const v=min+(range*i/4), y=pad.t+ch-(i/4)*ch;
    ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(w-pad.r,y);ctx.stroke();
    ctx.fillText(fmtNum(v,1),3,y+4);
  }
  const xy=points.map((r,i)=>({x:pad.l+(points.length===1?cw/2:i*cw/(points.length-1)),y:pad.t+ch-((Number(r.height)-min)/range)*ch,r}));
  ctx.strokeStyle="#258454";ctx.lineWidth=2.5;ctx.beginPath();
  xy.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();
  xy.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,4,0,Math.PI*2);ctx.fillStyle="#258454";ctx.fill();ctx.strokeStyle="#fff";ctx.lineWidth=2;ctx.stroke();});
  const labels=[xy[0],xy[Math.floor((xy.length-1)/2)],xy[xy.length-1]];
  ctx.fillStyle="#758078";ctx.font="10px system-ui";ctx.textAlign="center";
  labels.forEach(p=>ctx.fillText(fmtDate(getDateValue(p.r)).replace(/\s+\d{4}$/,""),p.x,h-12));
  ctx.textAlign="start";
}
function showDetail(id) {
  const r=reports.find(item=>item.id===id); if(!r) return;
  $("detailTitle").textContent = r.plant || "Laporan tanaman";
  $("detailBody").innerHTML = `
    <div class="detail-meta"><span>${escapeHtml(fmtDate(getDateValue(r)))}</span><span>Pelapor: ${escapeHtml(r.author||"—")}</span><span class="condition ${conditionClass(r.condition)}">${escapeHtml(r.condition||"—")}</span></div>
    <div class="detail-metric-grid">
      <div><small>pH larutan</small><strong>${r.ph==null?"—":escapeHtml(fmtNum(r.ph,2))}</strong></div>
      <div><small>PPM larutan</small><strong>${r.ppm==null?"—":escapeHtml(fmtNum(r.ppm,0))}</strong></div>
      <div><small>Tinggi tanaman</small><strong>${r.height==null?"—":escapeHtml(fmtNum(r.height,1))+" cm"}</strong></div>
      <div><small>Umur tanaman</small><strong>${r.hst==null?"—":escapeHtml(r.hst)+" HST"}</strong></div>
    </div>
    <h3>Catatan harian</h3><p class="detail-notes">${escapeHtml(r.notes||"Tidak ada catatan.")}</p>
    ${r.photoUrl?`<img class="detail-photo" src="${escapeHtml(r.photoUrl)}" alt="Foto kondisi tanaman" loading="lazy">`:""}
    <p class="detail-id">ID laporan: ${escapeHtml(r.id)}</p>`;
  $("detailDialog").showModal();
}
async function uploadPhoto(file, reportId) {
  if (!file) return "";
  if (file.size > 5*1024*1024) throw new Error("Foto terlalu besar. Maksimal 5 MB.");
  if (!file.type.startsWith("image/")) throw new Error("File harus berupa gambar.");
  if (!storage) throw new Error("Firebase Storage belum siap. Kosongkan foto atau aktifkan Storage di Firebase.");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-90);
  const path = `report-photos/${reportId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {contentType:file.type});
  return await getDownloadURL(storageRef);
}
function startFirebase() {
  if (!isFirebaseConfigured) {
    $("setupNotice").classList.remove("hidden");
    setBadge("Belum terhubung", "pending");
    $("reportsList").innerHTML = `<div class="empty-state">Situs belum terhubung ke database. Ikuti panduan README untuk mengatur Firebase.</div>`;
    return;
  }
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    storage = getStorage(app);
    setBadge("Menghubungkan…", "pending");
    const q = query(collection(db,"reports"), orderBy("reportDate","desc"));
    unsubscribe = onSnapshot(q, snapshot => {
      reports = snapshot.docs.map(d=>({id:d.id,...d.data()}));
      setBadge("Tersinkron", "connected");
      updateStats(); renderReports(); drawChart();
    }, error => {
      console.error(error);
      setBadge("Gagal memuat", "error");
      $("reportsList").innerHTML = `<div class="empty-state">Gagal membaca data. Periksa koneksi, Firestore, dan aturan keamanan Firebase.</div>`;
    });
  } catch (error) {
    console.error(error);
    setBadge("Konfigurasi salah", "error");
    showMessage("Konfigurasi Firebase belum benar. Periksa firebase-config.js.", "error");
  }
}
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!db) {
    showMessage("Belum tersambung ke Firebase. Lengkapi konfigurasi terlebih dahulu.", "error");
    return;
  }
  const author=$("author").value.trim(), plant=$("plant").value.trim(), reportDate=$("reportDate").value;
  if(!author || !plant || !reportDate) { showMessage("Isi nama pelapor, tanaman, dan tanggal.", "error"); return; }
  const ph=num("ph"), ppm=num("ppm"), height=num("height"), hst=num("hst");
  if(ph!=null && (ph<0||ph>14)){showMessage("Nilai pH harus di antara 0 sampai 14.","error");return;}
  const file=photoInput.files[0];
  submitButton.disabled=true; submitButton.textContent="Menyimpan…"; showMessage("Mengirim laporan ke database bersama…","pending");
  try {
    // Create a document first so photo storage path can be tied to a report ID.
    const docRef = await addDoc(collection(db,"reports"), {
      author, plant, reportDate, hst, ph, ppm, height,
      condition:$("condition").value,
      notes:$("notes").value.trim(),
      photoUrl:"",
      createdAt:serverTimestamp()
    });
    if(file) {
      try {
        const photoUrl=await uploadPhoto(file,docRef.id);
        // A separate photo update would require updateDoc; keep the record reliable if upload fails.
        const { updateDoc, doc } = await import("https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js");
        await updateDoc(doc(db,"reports",docRef.id),{photoUrl});
      } catch(photoError) {
        console.error(photoError);
        showMessage(`Laporan tersimpan, tetapi foto gagal diunggah: ${photoError.message}`,"error");
        form.reset(); $("reportDate").value=reportDate; return;
      }
    }
    showMessage("Laporan berhasil disimpan dan akan terlihat oleh anggota tim yang membuka situs ini.","success");
    const keepDate=reportDate;
    form.reset(); $("reportDate").value=keepDate;
    window.scrollTo({top:0,behavior:"smooth"});
  } catch(error) {
    console.error(error);
    showMessage(`Gagal menyimpan laporan: ${error.message || "Periksa koneksi dan aturan Firebase."}`,"error");
  } finally {
    submitButton.disabled=false; submitButton.innerHTML='Simpan laporan <span>↗</span>';
  }
});
photoInput.addEventListener("change",()=>{
  const file=photoInput.files[0], host=$("photoPreview");
  if(!file){host.classList.add("hidden");host.innerHTML="";return;}
  if(!file.type.startsWith("image/")){showMessage("File harus berupa gambar.","error");photoInput.value="";return;}
  if(file.size>5*1024*1024){showMessage("Foto terlalu besar. Maksimal 5 MB.","error");photoInput.value="";return;}
  const url=URL.createObjectURL(file);
  host.classList.remove("hidden");host.innerHTML=`<img src="${url}" alt="Pratinjau foto"><span>${escapeHtml(file.name)}</span>`;
});
$("searchInput").addEventListener("input",renderReports);
$("conditionFilter").addEventListener("change",renderReports);
$("closeDialog").addEventListener("click",()=>$("detailDialog").close());
$("detailDialog").addEventListener("click",e=>{if(e.target===$("detailDialog"))$("detailDialog").close();});
window.addEventListener("resize",()=>{if(reports.length)drawChart();});
startFirebase();
