// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: red; icon-glyph: qrcode;

const API_URL  = "https://qr-bank-sooty.vercel.app/api/banks"
const TEMPLATES = ["BdT8CDO","compact2","compact","qr_only","print"]
const CACHE_KEY = "vqr_cache_v4"
const LAST_KEY  = "vqr_last_v4"
const CACHE_TTL = 3600

function g(a,...keys){for(const k of keys)if(a[k]&&String(a[k]).trim()&&String(a[k]).trim()!=="-")return String(a[k]).trim();return ""}
function readCache(){try{const o=JSON.parse(Keychain.get(CACHE_KEY));if(Date.now()/1000-o.ts>CACHE_TTL)return null;return o.accounts}catch{return null}}
function writeCache(l){try{Keychain.set(CACHE_KEY,JSON.stringify({ts:Math.floor(Date.now()/1000),accounts:l}))}catch{}}
function staleCache(){try{return JSON.parse(Keychain.get(CACHE_KEY)).accounts}catch{return null}}
function saveLastSel(acc){try{Keychain.set(LAST_KEY,JSON.stringify({bin:g(acc,"bin","data__bin"),stk:g(acc,"stk","data_num","datanum")}))}catch{}}
function loadLastSel(accounts){try{const last=JSON.parse(Keychain.get(LAST_KEY));const idx=accounts.findIndex(a=>g(a,"bin","data__bin")===last.bin&&g(a,"stk","data_num","datanum")===last.stk);return idx>=0?idx:0}catch{return 0}}

async function fetchAccounts(){
  const cached=readCache();if(cached)return cached
  const req=new Request(API_URL);req.timeoutInterval=10
  const data=await req.loadJSON()
  const list=(Array.isArray(data.accounts)?data.accounts:[]).filter(a=>g(a,"bin","data__bin")&&g(a,"stk","data_num","datanum"))
  if(list.length)writeCache(list);return list
}

async function main(){
  let accounts
  try{accounts=await fetchAccounts()}
  catch(e){
    accounts=staleCache()
    if(!accounts?.length){
      const err=new Alert();err.title="❌ Lỗi kết nối";err.message=e.message
      err.addAction("Thử lại");err.addCancelAction("Đóng")
      if(await err.presentAlert()===0)await main();return
    }
  }

  const selIdx = loadLastSel(accounts)
  const accsData = accounts.map(a=>({
    bin:    g(a,"bin","data__bin"),
    stk:    g(a,"stk","data_num","datanum"),
    label:  g(a,"list_name","label","shortName","code"),
    bank:   g(a,"shortName","data__shortName"),
    nameAc: g(a,"nameAc","name_ac"),
    logo:   g(a,"data__logo","logo"),
    tmpl:   g(a,"template")||"BdT8CDO",
  }))

  const html = buildHTML(accsData, selIdx)
  const wv = new WebView()
  await wv.loadHTML(html)
  await wv.present(true)

  // Poll for user action
  while (true) {
    await new Promise(r => Timer.schedule(300, false, r))
    const raw = await wv.evaluateJavaScript("window.__action||''")
    if (!raw) continue
    await wv.evaluateJavaScript("window.__action=''")

    let data
    try { data = JSON.parse(raw) } catch { continue }

    if (data.action === "save") {
      try {
        const r = new Request(data.url); Photos.save(await r.loadImage())
        await wv.evaluateJavaScript("toast('✅ Đã lưu vào Photos')")
      } catch { await wv.evaluateJavaScript("toast('❌ Không lưu được')") }
    } else if (data.action === "share") {
      try {
        const r = new Request(data.url)
        const img = await r.loadImage()
        await ShareSheet.present([img])
      } catch {}
    } else if (data.action === "close") {
      // save last selected
      const idx = data.selIdx || 0
      if (accounts[idx]) saveLastSel(accounts[idx])
      break
    }
  }
}

function buildHTML(accounts, selIdx) {
  const accsJSON = JSON.stringify(accounts)
  const tmplsJSON = JSON.stringify(TEMPLATES)
  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
<style>
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent}
:root{
  --bg:#0d0d12;--surface:#17171f;--card:#1e1e28;
  --accent:#7c6aff;--accent2:#a78bfa;
  --green:#22c55e;--border:#252530;
  --text:#f0f0f5;--sub:#6b6b80;
  --r:14px;
}
html,body{height:100%;background:var(--bg);color:var(--text);
  font-family:-apple-system,BlinkMacSystemFont,sans-serif;overflow:hidden}
#app{display:flex;flex-direction:column;height:100vh;height:100dvh;gap:0}

/* HEADER */
.hdr{flex-shrink:0;padding:16px 18px 10px;display:flex;align-items:center;gap:8px;
  background:var(--surface);border-bottom:1px solid var(--border)}
.hdr-title{font-size:1.15rem;font-weight:800;
  background:linear-gradient(120deg,#7c6aff,#c084fc);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.hdr-badge{margin-left:auto;font-size:.68rem;font-weight:700;
  background:rgba(124,106,255,.18);color:var(--accent2);
  padding:3px 10px;border-radius:20px}

/* ACCOUNT PILLS */
.pills-row{flex-shrink:0;padding:10px 14px 0;
  display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}
.pills-row::-webkit-scrollbar{display:none}
.pill{flex-shrink:0;display:flex;align-items:center;gap:7px;
  padding:7px 13px;border-radius:24px;
  border:1.5px solid var(--border);background:var(--card);
  cursor:pointer;transition:all .17s;white-space:nowrap}
.pill.on{border-color:var(--accent);background:rgba(124,106,255,.15);
  box-shadow:0 0 0 3px rgba(124,106,255,.12)}
.pill img{width:20px;height:20px;border-radius:5px;object-fit:contain;background:#fff;padding:1px}
.pill-name{font-size:.78rem;font-weight:700;color:var(--sub)}
.pill.on .pill-name{color:var(--accent2)}
.pill-tail{font-size:.65rem;color:var(--sub);font-family:ui-monospace,monospace}

/* INPUTS */
.inp-row{flex-shrink:0;padding:10px 14px;display:flex;gap:8px}
.iw{flex:1;display:flex;flex-direction:column;gap:4px}
.iw label{font-size:.62rem;font-weight:700;color:var(--sub);text-transform:uppercase;letter-spacing:.6px}
.iw input,.iw select{
  width:100%;padding:10px 12px;
  background:var(--card);border:1.5px solid var(--border);
  border-radius:11px;color:var(--text);font-size:.9rem;font-family:inherit;
  outline:none;-webkit-appearance:none;transition:border-color .15s}
.iw input:focus,.iw select:focus{border-color:var(--accent)}
.iw select{background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236b6b80' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat;background-position:right 10px center;padding-right:26px}

/* PRESET CHIPS */
.chips{flex-shrink:0;padding:0 14px 8px;display:flex;gap:6px;overflow-x:auto;scrollbar-width:none}
.chips::-webkit-scrollbar{display:none}
.chip{flex-shrink:0;padding:5px 11px;border-radius:20px;font-size:.7rem;font-weight:600;
  background:var(--card);border:1px solid var(--border);color:var(--sub);
  cursor:pointer;font-family:ui-monospace,monospace;white-space:nowrap;transition:all .15s}
.chip:active{background:rgba(124,106,255,.2);border-color:var(--accent);color:var(--accent2);transform:scale(.95)}

/* QR CARD */
.qr-area{flex:1;display:flex;align-items:center;justify-content:center;padding:4px 14px;min-height:0;overflow:hidden}
.qr-card{width:100%;max-width:340px;
  background:var(--surface);border:1px solid var(--border);
  border-radius:var(--r);overflow:hidden;
  box-shadow:0 12px 48px rgba(0,0,0,.5)}
.qc-head{padding:11px 14px;border-bottom:1px solid var(--border);
  display:flex;align-items:center;gap:9px}
.qc-head img{width:32px;height:32px;border-radius:8px;object-fit:contain;
  background:#fff;padding:2px;border:1px solid var(--border);flex-shrink:0}
.qch-name{font-size:.85rem;font-weight:700}
.qch-stk{font-size:.68rem;color:var(--sub);font-family:ui-monospace,monospace;margin-top:1px}
.qch-amt{margin-left:auto;background:rgba(34,197,94,.14);color:var(--green);
  font-size:.72rem;font-weight:700;padding:3px 9px;border-radius:20px;white-space:nowrap;flex-shrink:0}
.qc-body{padding:12px;position:relative;display:flex;justify-content:center}
.qc-body img{width:100%;max-width:260px;aspect-ratio:1;border-radius:8px;
  border:1px solid var(--border);display:block;transition:opacity .2s}
.qc-body img.loading{opacity:.3}
.qr-spin-wrap{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  border-radius:8px;pointer-events:none}
.qr-spin-wrap.hide{display:none}
.spin{width:32px;height:32px;border:3px solid var(--border);border-top-color:var(--accent);
  border-radius:50%;animation:sp .7s linear infinite}
@keyframes sp{to{transform:rotate(360deg)}}

/* ACTIONS */
.acts{flex-shrink:0;display:grid;grid-template-columns:repeat(4,1fr);gap:8px;
  padding:10px 14px calc(env(safe-area-inset-bottom,0px)+10px);
  background:var(--surface);border-top:1px solid var(--border)}
.ab{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;
  padding:11px 4px;border-radius:12px;border:1px solid var(--border);
  background:var(--card);cursor:pointer;transition:all .15s;-webkit-appearance:none}
.ab:active{transform:scale(.92);opacity:.75}
.ab-icon{font-size:1.4rem;line-height:1}
.ab-lbl{font-size:.59rem;font-weight:700;color:var(--sub);text-align:center;line-height:1.3;letter-spacing:.2px}
.ab.v{background:rgba(124,106,255,.15);border-color:rgba(124,106,255,.35)}
.ab.v .ab-lbl{color:var(--accent2)}
.ab.g{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.28)}
.ab.g .ab-lbl{color:var(--green)}

/* TOAST */
#toast{position:fixed;bottom:calc(env(safe-area-inset-bottom,0px)+80px);
  left:50%;transform:translateX(-50%) translateY(8px);
  background:rgba(240,240,245,.1);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);
  border:1px solid rgba(255,255,255,.12);
  color:#fff;padding:9px 20px;border-radius:26px;
  font-size:.8rem;font-weight:600;
  opacity:0;transition:all .22s;pointer-events:none;white-space:nowrap;z-index:99}
#toast.on{opacity:1;transform:translateX(-50%) translateY(0)}
</style>
</head>
<body>
<div id="app">
  <div class="hdr">
    <div class="hdr-title">VietQR</div>
    <div class="hdr-badge" id="badge"></div>
  </div>
  <div class="pills-row" id="pills"></div>
  <div class="inp-row">
    <div class="iw" style="flex:2.2">
      <label>Số tiền</label>
      <input id="amt" type="text" inputmode="numeric" placeholder="Không bắt buộc" autocomplete="off"/>
    </div>
    <div class="iw" style="flex:1.4">
      <label>Template</label>
      <select id="tmpl"></select>
    </div>
  </div>
  <div class="chips" id="chips"></div>
  <div class="qr-area">
    <div class="qr-card">
      <div class="qc-head">
        <img id="qlogo" src="" onerror="this.style.display='none'"/>
        <div><div class="qch-name" id="qname"></div><div class="qch-stk" id="qstk"></div></div>
        <span class="qch-amt" id="qamt"></span>
      </div>
      <div class="qc-body">
        <img id="qimg" src="" alt="QR"/>
        <div class="qr-spin-wrap" id="qspin"><div class="spin"></div></div>
      </div>
    </div>
  </div>
  <div class="acts">
    <button class="ab v" onclick="doSave()">
      <span class="ab-icon">💾</span><span class="ab-lbl">Lưu ảnh</span>
    </button>
    <button class="ab v" onclick="doCopy()">
      <span class="ab-icon">🔗</span><span class="ab-lbl">Copy link</span>
    </button>
    <button class="ab g" onclick="doShare()">
      <span class="ab-icon">⬆️</span><span class="ab-lbl">Chia sẻ</span>
    </button>
    <button class="ab" onclick="doRefresh()">
      <span class="ab-icon">🔄</span><span class="ab-lbl">Làm mới</span>
    </button>
  </div>
</div>
<div id="toast"></div>

<script>
const ACCS = ${accsJSON}
const TMPLS = ${tmplsJSON}
let sel = ${selIdx}, curUrl = "", tid = 0, dbt = null

// template select
const tmplEl = document.getElementById("tmpl")
TMPLS.forEach(t => { const o = document.createElement("option"); o.value = o.textContent = t; tmplEl.appendChild(o) })
tmplEl.value = ACCS[sel]?.tmpl || TMPLS[0]
tmplEl.addEventListener("change", gen)

// amount input
const amtEl = document.getElementById("amt")
amtEl.addEventListener("input", function(){
  const raw = this.value.replace(/\\D/g,"")
  this.value = raw ? Number(raw).toLocaleString("vi-VN") + " ₫" : ""
  clearTimeout(dbt); dbt = setTimeout(gen, 280)
})
amtEl.addEventListener("focus", function(){
  const raw = this.value.replace(/\\D/g,""); this.value = raw ? Number(raw).toLocaleString("vi-VN") : ""
})
amtEl.addEventListener("blur", function(){
  const raw = this.value.replace(/\\D/g,""); this.value = raw ? Number(raw).toLocaleString("vi-VN") + " ₫" : ""
})

// preset chips
const presets = [20000,50000,100000,200000,500000,1000000,2000000]
const chipsEl = document.getElementById("chips")
presets.forEach(v => {
  const c = document.createElement("button"); c.className = "chip"
  c.textContent = Number(v).toLocaleString("vi-VN") + " ₫"
  c.onclick = () => { amtEl.value = Number(v).toLocaleString("vi-VN") + " ₫"; gen() }
  chipsEl.appendChild(c)
})

// pills
function renderPills() {
  const wrap = document.getElementById("pills")
  wrap.innerHTML = ""
  document.getElementById("badge").textContent = ACCS.length + " tài khoản"
  ACCS.forEach((a, i) => {
    const d = document.createElement("div")
    d.className = "pill" + (i === sel ? " on" : "")
    const tail = a.stk.slice(-4).padStart(a.stk.length, "·")
    d.innerHTML = \`<img src="\${a.logo}" onerror="this.style.display='none'"/>
      <div><div class="pill-name">\${a.label}</div>
      <div class="pill-tail">\${a.bank} · \${tail}</div></div>\`
    d.onclick = () => { sel = i; tmplEl.value = a.tmpl || TMPLS[0]; renderPills(); gen() }
    wrap.appendChild(d)
    if (i === sel) setTimeout(() => d.scrollIntoView({behavior:"smooth",inline:"center",block:"nearest"}), 60)
  })
}

// generate QR
function gen() {
  const a = ACCS[sel]; if (!a) return
  const tmpl = tmplEl.value || TMPLS[0]
  const raw = amtEl.value.replace(/\\D/g,"")
  let url = \`https://img.vietqr.io/image/\${a.bin}-\${a.stk}-\${tmpl}.png\`
  const p = []
  if (raw) p.push("amount=" + encodeURIComponent(raw))
  if (a.nameAc) p.push("accountName=" + encodeURIComponent(a.nameAc))
  if (p.length) url += "?" + p.join("&")
  curUrl = url

  document.getElementById("qlogo").src = a.logo
  document.getElementById("qname").textContent = a.label + "  ·  " + a.bank
  document.getElementById("qstk").textContent = "STK: " + a.stk
  document.getElementById("qamt").textContent = raw ? Number(raw).toLocaleString("vi-VN") + " ₫" : ""
  document.getElementById("qamt").style.display = raw ? "" : "none"

  const img = document.getElementById("qimg")
  const spin = document.getElementById("qspin")
  img.className = "loading"; spin.className = "qr-spin-wrap"
  const id = ++tid
  const tmp = new Image()
  tmp.onload = () => { if (id !== tid) return; img.src = url; img.className = ""; spin.className = "qr-spin-wrap hide" }
  tmp.onerror = () => { if (id !== tid) return; spin.className = "qr-spin-wrap hide" }
  tmp.src = url
}

function rawAmt() { return amtEl.value.replace(/\\D/g,"") }

function toast(msg) {
  const t = document.getElementById("toast"); t.textContent = msg; t.classList.add("on")
  setTimeout(() => t.classList.remove("on"), 2000)
}

function emit(data) { window.__action = JSON.stringify({...data, selIdx: sel}) }

function doSave()    { emit({action:"save", url:curUrl}) }
function doCopy()    { try { navigator.clipboard.writeText(curUrl) } catch {} emit({action:"copy", url:curUrl}); toast("✓ Đã copy link") }
function doShare()   { emit({action:"share", url:curUrl}) }
function doRefresh() { curUrl = ""; gen() }

renderPills(); gen()
</script>
</body></html>`
}

await main()
