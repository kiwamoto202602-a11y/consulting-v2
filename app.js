// ===== Firebase =====
const firebaseConfig = {
  apiKey: "AIzaSyDRGq-1d5nvrOtlToYd5lLcsTfosijgFzo",
  authDomain: "consulting-37154.firebaseapp.com",
  projectId: "consulting-37154",
  storageBucket: "consulting-37154.firebasestorage.app",
  messagingSenderId: "502558740127",
  appId: "1:502558740127:web:1b01f4325585ca0e9ddcaa"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// ===== 定数 =====
const STATUS_LIST = [
  { id: '初回面談', color: 'badge-gray',   activeColor:'#536172', activeBg:'#EEEAE4' },
  { id: '資料収集', color: 'badge-blue',   activeColor:'#1B3A5C', activeBg:'#E6EEF6' },
  { id: '書類作成', color: 'badge-amber',  activeColor:'#8B5C08', activeBg:'#FDF1DB' },
  { id: '銀行提出', color: 'badge-purple', activeColor:'#5230A0', activeBg:'#F0ECFE' },
  { id: '審査中',   color: 'badge-orange', activeColor:'#B84E1A', activeBg:'#FEF0E4' },
  { id: '承認',     color: 'badge-green',  activeColor:'#145C30', activeBg:'#E4F3EC' },
  { id: '否決',     color: 'badge-red',    activeColor:'#94190F', activeBg:'#FEE8E6' },
];
const DEFAULT_DOCUMENTS = [
  '決算書（直近2〜3期分）','試算表（最新月）','確定申告書','法人税申告書',
  '会社概要・パンフレット','登記簿謄本（履歴事項全部証明書）','印鑑証明書',
  '代表者の本人確認書類','事業計画書','資金繰り表','借入一覧表',
  '不動産登記簿（担保がある場合）',
];
const MIME_ICONS = {
  'application/pdf':'📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':'📝',
  'application/msword':'📝',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':'📊',
  'application/vnd.ms-excel':'📊',
  'image/jpeg':'🖼️','image/png':'🖼️',
};

// ===== ユーティリティ =====
let currentUser = null;

function toast(msg, type='success') {
  const el = document.createElement('div');
  const isErr = type === 'error';
  el.style.cssText = `pointer-events:auto;display:flex;align-items:center;gap:8px;padding:10px 16px;border-radius:8px;font-size:13px;font-weight:500;color:#FFF;box-shadow:0 4px 16px rgba(0,0,0,0.18);animation:slideIn 0.2s ease;font-family:'Noto Sans JP',sans-serif;background:${isErr?'#8B1A0F':'#145C30'};`;
  el.innerHTML = `<svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="${isErr?'M6 18L18 6M6 6l12 12':'M5 13l4 4L19 7'}"/></svg>${msg}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.style.opacity = '0', 2600);
  setTimeout(() => el.remove(), 3000);
}

function showModal(html) {
  document.getElementById('modal-box').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) closeModal();
});

function fmtDate(ts) {
  if (!ts) return '-';
  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`;
}
function fmtMoney(v) {
  if (v === null || v === undefined || v === '') return '-';
  return Number(v).toLocaleString('ja-JP') + '万円';
}
function escAttr(s) { return String(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escJS(s) { return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }
function sanitizeStoragePath(s) { return String(s||'').replace(/[#?&]/g,'_'); }
function statusBadge(status) {
  const s = STATUS_LIST.find(x => x.id === status) || { color:'badge-gray' };
  return `<span class="badge ${s.color}">${status || '-'}</span>`;
}
function isNearDeadline(deadline) {
  if (!deadline) return false;
  const d = deadline.toDate ? deadline.toDate() : new Date(deadline);
  const diff = (d - new Date()) / (1000*60*60*24);
  return diff >= 0 && diff <= 7;
}
function setPageTitle(title) { document.getElementById('page-title').textContent = title; }
function setTopbarActions(html) { document.getElementById('topbar-actions').innerHTML = html; }
function updateNavActive(path) {
  document.querySelectorAll('.nav-link').forEach(a => {
    const p = a.dataset.path;
    const current = path === '/' ? '/' : path;
    const isActive = current === p || (p !== '/' && current.startsWith(p));
    a.classList.toggle('active-nav', isActive);
  });
}
function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.remove('hidden');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.add('hidden');
}

// ===== 認証 =====
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-screen').style.display = 'flex';
    const name = user.displayName || user.email;
    document.getElementById('sidebar-user').textContent = name;
    const av = document.getElementById('sidebar-avatar');
    if (av) av.textContent = (name||'U')[0].toUpperCase();
    handleRoute();
  } else {
    currentUser = null;
    document.getElementById('login-screen').style.display = '';
    document.getElementById('app-screen').style.display = 'none';
  }
});

document.getElementById('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const btn = e.target.querySelector('button[type="submit"]');
  errEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = '認証中...';
  try {
    await auth.signInWithEmailAndPassword(email, password);
  } catch {
    errEl.textContent = 'メールアドレスまたはパスワードが正しくありません';
    errEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'ログイン';
  }
});
async function handleLogout() { await auth.signOut(); }

// ===== パスワード管理 =====
async function sendPasswordReset(e) {
  e && e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  if (!email) { alert('メールアドレスを入力してください'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    alert('パスワードリセットメールを送信しました。メールをご確認ください。');
  } catch {
    alert('送信に失敗しました。メールアドレスを確認してください。');
  }
}
function showChangePasswordModal() {
  ['pw-current','pw-new','pw-confirm'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('pw-error').style.display = 'none';
  document.getElementById('pw-success').style.display = 'none';
  document.getElementById('pw-change-modal').style.display = 'flex';
  closeSidebar();
}
async function doChangePassword() {
  const current = document.getElementById('pw-current').value;
  const newPw = document.getElementById('pw-new').value;
  const confirm = document.getElementById('pw-confirm').value;
  const errEl = document.getElementById('pw-error');
  const okEl = document.getElementById('pw-success');
  errEl.style.display = 'none'; okEl.style.display = 'none';
  if (newPw.length < 6) { errEl.textContent = 'パスワードは6文字以上にしてください'; errEl.style.display = 'block'; return; }
  if (newPw !== confirm) { errEl.textContent = 'パスワードが一致しません'; errEl.style.display = 'block'; return; }
  try {
    const credential = firebase.auth.EmailAuthProvider.credential(currentUser.email, current);
    await currentUser.reauthenticateWithCredential(credential);
    await currentUser.updatePassword(newPw);
    okEl.style.display = 'block';
    setTimeout(() => { document.getElementById('pw-change-modal').style.display = 'none'; }, 1500);
  } catch(e) {
    errEl.textContent = e.code === 'auth/wrong-password' ? '現在のパスワードが正しくありません' : 'パスワード変更に失敗しました';
    errEl.style.display = 'block';
  }
}

// ===== ルーター =====
function navigate(path) { window.location.hash = '#' + path; }
function handleRoute() {
  const hash = window.location.hash.slice(1) || '/';
  updateNavActive(hash);
  const parts = hash.split('/').filter(Boolean);
  if (hash === '/' || hash === '') return renderDashboard();
  if (hash === '/clients') return renderClients();
  if (hash === '/cases') return renderCases();
  if (parts[0] === 'clients' && parts[1]) return renderClientDetail(parts[1]);
  if (parts[0] === 'cases' && parts[1]) return renderCaseDetail(parts[1]);
  renderDashboard();
}


// ===== ローディング =====
function loadingHTML() {
  return `<div style="display:flex;align-items:center;justify-content:center;height:160px;">
    <div style="width:24px;height:24px;border-radius:50%;border:2px solid var(--border-2);border-top-color:var(--primary);animation:spin 0.7s linear infinite;"></div>
  </div>
  <style>@keyframes spin{to{transform:rotate(360deg);}}</style>`;
}

// ===== ダッシュボード =====
async function renderDashboard() {
  setPageTitle('ダッシュボード');
  setTopbarActions(`<a href="#/cases/new" class="btn-primary">
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>新規案件</a>`);
  document.getElementById('page-content').innerHTML = loadingHTML();

  let cases = [], clients = [];
  try {
    const [casesSnap, clientsSnap] = await Promise.all([
      db.collection('cases').orderBy('createdAt','desc').limit(50).get(),
      db.collection('clients').orderBy('createdAt','desc').limit(100).get(),
    ]);
    cases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
    console.error(e); return;
  }
  const now = new Date();

  const inProgress = cases.filter(c => c.status !== '承認' && c.status !== '否決').length;
  const thisMonthApproved = cases.filter(c => {
    if (c.status !== '承認') return false;
    const u = c.updatedAt?.toDate ? c.updatedAt.toDate() : new Date(c.updatedAt||0);
    return u.getMonth() === now.getMonth() && u.getFullYear() === now.getFullYear();
  }).length;
  const soonCases = cases.filter(c => {
    if (!c.deadline || c.status === '承認' || c.status === '否決') return false;
    const d = c.deadline.toDate ? c.deadline.toDate() : new Date(c.deadline);
    const diff = (d - now) / (1000*60*60*24);
    return diff >= 0 && diff <= 7;
  });
  const statusCounts = STATUS_LIST.map(s => ({ ...s, count: cases.filter(c => c.status === s.id).length }));

  const incompleteTasks = [];
  cases.forEach(c => {
    (c.tasks||[]).filter(t => !t.completed).forEach(t => {
      incompleteTasks.push({ ...t, caseId: c.id, caseTitle: c.title, clientName: c.clientName });
    });
  });
  incompleteTasks.sort((a,b) => {
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1; if (!b.dueDate) return -1;
    return new Date(a.dueDate) - new Date(b.dueDate);
  });

  document.getElementById('page-content').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:22px;">
    <div>
      <h1 class="h-serif" style="font-size:22px;color:var(--t1);letter-spacing:0.04em;">ダッシュボード</h1>
      <p style="font-size:12.5px;color:var(--t3);margin-top:4px;">${currentUser?.displayName||currentUser?.email} さん、こんにちは</p>
    </div>

    <!-- Metrics -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;">
      <div class="metric-card mc-blue">
        <div class="metric-val">${clients.length}<span class="metric-unit">社</span></div>
        <div class="metric-lbl">総顧客数</div>
      </div>
      <div class="metric-card mc-gold">
        <div class="metric-val">${inProgress}<span class="metric-unit">件</span></div>
        <div class="metric-lbl">進行中案件</div>
      </div>
      <div class="metric-card mc-green">
        <div class="metric-val">${thisMonthApproved}<span class="metric-unit">件</span></div>
        <div class="metric-lbl">今月承認</div>
      </div>
      <div class="metric-card ${soonCases.length > 0 ? 'mc-red' : 'mc-gray'}">
        <div class="metric-val">${soonCases.length}<span class="metric-unit">件</span></div>
        <div class="metric-lbl">期限7日以内</div>
      </div>
    </div>

    <!-- Status grid -->
    <div class="surface" style="padding:20px 22px;">
      <p class="h-serif" style="font-size:15px;color:var(--t1);margin-bottom:16px;">ステータス別案件数</p>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:8px;">
        ${statusCounts.map(s => `
          <a href="#/cases?status=${encodeURIComponent(s.id)}" style="text-align:center;padding:12px 6px;border-radius:8px;border:1px solid var(--border-2);background:#FAFAF7;cursor:pointer;text-decoration:none;display:block;transition:border-color 0.15s;" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border-2)'">
            <p style="font-family:'DM Mono',monospace;font-size:22px;font-weight:500;color:var(--t1);">${s.count}</p>
            <p style="font-size:10px;color:var(--t2);margin-top:5px;letter-spacing:0.02em;">${s.id}</p>
          </a>`).join('')}
      </div>
    </div>

    <!-- Incomplete tasks -->
    ${incompleteTasks.length > 0 ? `
    <div class="surface" style="padding:20px 22px;">
      <p class="h-serif" style="font-size:15px;color:var(--t1);margin-bottom:16px;">未完了タスク <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--t3);font-weight:400;">${incompleteTasks.length}</span></p>
      <div style="display:flex;flex-direction:column;gap:6px;">
        ${incompleteTasks.slice(0,10).map(t => {
          const isOverdue = t.dueDate && new Date(t.dueDate) < now;
          const isDueSoon = t.dueDate && !isOverdue && (new Date(t.dueDate) - now) / (1000*60*60*24) <= 3;
          return `<a href="#/cases/${t.caseId}" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;border:1px solid var(--border-2);text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#F7F5F0'" onmouseout="this.style.background='transparent'">
            <div style="width:16px;height:16px;border-radius:4px;border:1.5px solid #C8D4DF;flex-shrink:0;"></div>
            <div style="flex:1;min-width:0;">
              <p style="font-size:13px;font-weight:500;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.title}</p>
              <p style="font-size:11px;color:var(--t3);margin-top:2px;">${t.caseTitle}${t.assigneeName ? ' · '+t.assigneeName : ''}</p>
            </div>
            ${t.dueDate ? `<span style="font-size:11px;padding:2px 8px;border-radius:999px;font-weight:500;flex-shrink:0;background:${isOverdue?'#FEE8E6':isDueSoon?'#FEF0E4':'#F0EDE8'};color:${isOverdue?'#94190F':isDueSoon?'#B84E1A':'#6B5A48'};">${isOverdue?'期限超過':t.dueDate}</span>` : ''}
          </a>`;
        }).join('')}
        ${incompleteTasks.length > 10 ? `<p style="font-size:12px;color:var(--t3);text-align:center;padding-top:8px;">他 ${incompleteTasks.length-10} 件</p>` : ''}
      </div>
    </div>` : ''}

    <!-- Bottom row -->
    <div style="display:grid;grid-template-columns:${soonCases.length>0?'1fr 1fr':'1fr'};gap:16px;">
      ${soonCases.length > 0 ? `
      <div class="surface" style="padding:20px 22px;border-color:#F5D0CC;">
        <p style="font-size:13px;font-weight:600;color:#94190F;margin-bottom:14px;display:flex;align-items:center;gap:6px;">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
          期限が迫っている案件
        </p>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${soonCases.map(c => {
            const d = c.deadline?.toDate ? c.deadline.toDate() : new Date(c.deadline);
            const diff = Math.ceil((d - now) / (1000*60*60*24));
            return `<a href="#/cases/${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#FEF2F0;border-radius:8px;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#FEE8E6'" onmouseout="this.style.background='#FEF2F0'">
              <div><p style="font-size:13px;font-weight:500;color:var(--t1);">${c.title}</p><p style="font-size:11px;color:var(--t3);margin-top:2px;">${c.clientName}</p></div>
              <span style="font-size:11px;font-weight:600;color:#94190F;padding:3px 9px;background:#FEE8E6;border-radius:999px;flex-shrink:0;">${diff===0?'今日':`あと${diff}日`}</span>
            </a>`;
          }).join('')}
        </div>
      </div>` : ''}

      <div class="surface" style="padding:20px 22px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <p class="h-serif" style="font-size:15px;color:var(--t1);">最近の案件</p>
          <a href="#/cases" style="font-size:12px;color:var(--primary);text-decoration:none;" onmouseover="this.style.opacity='0.7'" onmouseout="this.style.opacity='1'">すべて表示 →</a>
        </div>
        ${cases.slice(0,5).length === 0
          ? `<p style="font-size:13px;color:var(--t3);text-align:center;padding:32px 0;">案件がまだありません</p>`
          : `<div style="display:flex;flex-direction:column;gap:4px;">${cases.slice(0,5).map(c=>`
            <a href="#/cases/${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#F7F5F0'" onmouseout="this.style.background='transparent'">
              <div style="min-width:0;">
                <p style="font-size:13px;font-weight:500;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${c.title}</p>
                <p style="font-size:11px;color:var(--t3);margin-top:2px;">${c.clientName}</p>
              </div>
              ${statusBadge(c.status)}
            </a>`).join('')}</div>`}
      </div>
    </div>
  </div>`;
}

// ===== 顧客管理 =====
let clientsCache = [];
async function renderClients() {
  setPageTitle('顧客管理');
  setTopbarActions(`<button onclick="openClientModal(null)" class="btn-primary">
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>顧客追加</button>`);
  document.getElementById('page-content').innerHTML = loadingHTML();
  try {
    const snap = await db.collection('clients').orderBy('createdAt','desc').get();
    clientsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderClientsTable('');
  } catch(e) {
    document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
    console.error(e);
  }
}

function renderClientsTable(search) {
  const filtered = clientsCache.filter(c =>
    !search || c.name?.includes(search) || c.industry?.includes(search) || c.representative?.includes(search)
  );
  document.getElementById('page-content').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div style="position:relative;max-width:320px;">
      <svg style="position:absolute;left:11px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--t3);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
      <input type="text" id="client-search" value="${escAttr(search)}" oninput="renderClientsTable(this.value)" placeholder="会社名・業種・担当者で検索"
        style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;">
    </div>
    ${filtered.length === 0
      ? `<div style="text-align:center;padding:64px 0;color:var(--t3);font-size:13px;">${search?'検索結果がありません':'顧客がまだ登録されていません'}</div>`
      : `<div class="surface" style="overflow:hidden;">
          <table>
            <thead><tr>
              <th>会社名</th>
              <th class="hidden md:table-cell">業種</th>
              <th class="hidden md:table-cell">代表者</th>
              <th class="hidden lg:table-cell">電話番号</th>
              <th style="text-align:right;">操作</th>
            </tr></thead>
            <tbody>
              ${filtered.map(c=>`
              <tr>
                <td>
                  <a href="#/clients/${c.id}" style="font-weight:600;color:var(--primary);text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${c.name}</a>
                  <div style="font-size:11px;color:var(--t3);margin-top:2px;" class="md:hidden">${c.industry||''}</div>
                </td>
                <td class="hidden md:table-cell" style="color:var(--t2);">${c.industry||'-'}</td>
                <td class="hidden md:table-cell" style="color:var(--t2);">${c.representative||'-'}</td>
                <td class="hidden lg:table-cell" style="color:var(--t2);">${c.phone||'-'}</td>
                <td style="text-align:right;">
                  <div style="display:flex;align-items:center;justify-content:flex-end;gap:4px;">
                    <a href="#/cases?client=${c.id}" style="font-size:11.5px;color:var(--primary);padding:5px 10px;border-radius:5px;border:1px solid var(--primary-t);text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='var(--primary-t)'" onmouseout="this.style.background='transparent'">案件</a>
                    <button onclick="openClientModal('${c.id}')" style="font-size:11.5px;color:var(--t2);padding:5px 10px;border-radius:5px;border:1px solid var(--border);background:transparent;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#F0EDE8'" onmouseout="this.style.background='transparent'">編集</button>
                    <button onclick="deleteClient('${c.id}','${escJS(c.name)}')" style="font-size:11.5px;color:#94190F;padding:5px 10px;border-radius:5px;border:1px solid #F5CECA;background:transparent;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='#FEE8E6'" onmouseout="this.style.background='transparent'">削除</button>
                  </div>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

function openClientModal(id) {
  const client = id ? clientsCache.find(c => c.id === id) : null;
  showModal(`
  <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;border-bottom:1px solid var(--border-2);">
    <h2 style="font-family:'Shippori Mincho B1',serif;font-size:17px;color:var(--t1);">${client?'顧客情報を編集':'顧客を追加'}</h2>
    <button onclick="closeModal()" style="width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;font-size:18px;color:var(--t3);display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='#F0EDE8'" onmouseout="this.style.background='transparent'">&times;</button>
  </div>
  <div style="padding:20px 24px;display:flex;flex-direction:column;gap:14px;">
    ${mfield('会社名 *','name','text',client?.name||'','株式会社〇〇')}
    ${mfield('業種','industry','text',client?.industry||'','製造業、飲食業など')}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      ${mfield('役職','representativeTitle','text',client?.representativeTitle||'','代表取締役')}
      ${mfield('代表者名','representative','text',client?.representative||'','山田 太郎')}
    </div>
    ${mfield('メールアドレス','email','email',client?.email||'','info@company.com')}
    ${mfield('電話番号','phone','text',client?.phone||'','03-0000-0000')}
    ${mfield('住所','address','text',client?.address||'','東京都〇〇区...')}
    <div>
      <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">備考</label>
      <textarea id="field-notes" rows="3" placeholder="メモ・特記事項など"
        style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;resize:vertical;">${client?.notes||''}</textarea>
    </div>
  </div>
  <div style="display:flex;gap:10px;padding:16px 24px;border-top:1px solid var(--border-2);">
    <button onclick="closeModal()" class="btn-ghost" style="flex:1;justify-content:center;">キャンセル</button>
    <button onclick="saveClient('${id||''}')" class="btn-primary" style="flex:1;justify-content:center;">保存</button>
  </div>`);
}

function mfield(label, id, type, value, placeholder) {
  return `<div>
    <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">${label}</label>
    <input id="field-${id}" type="${type}" value="${value||''}" placeholder="${placeholder}"
      style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
  </div>`;
}

function field(label, id, type, value, placeholder) { return mfield(label, id, type, value, placeholder); }

async function saveClient(id) {
  const name = document.getElementById('field-name').value.trim();
  if (!name) { toast('会社名は必須です', 'error'); return; }
  const data = {
    name, industry:v('industry'), representative:v('representative'),
    representativeTitle:v('representativeTitle'), email:v('email'),
    phone:v('phone'), address:v('address'), notes:v('notes'),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
  };
  try {
    if (id) {
      await db.collection('clients').doc(id).update(data);
      toast('顧客情報を更新しました');
    } else {
      data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('clients').add(data);
      toast('顧客を追加しました');
    }
    closeModal(); renderClients();
  } catch { toast('保存に失敗しました', 'error'); }
}
async function deleteClient(id, name) {
  if (!confirm(`「${name}」を削除しますか？`)) return;
  try { await db.collection('clients').doc(id).delete(); toast('削除しました'); renderClients(); }
  catch { toast('削除に失敗しました', 'error'); }
}
function v(id) { return document.getElementById('field-'+id)?.value || ''; }

// ===== 顧客詳細 =====
async function renderClientDetail(id) {
  setPageTitle('顧客詳細'); setTopbarActions('');
  document.getElementById('page-content').innerHTML = loadingHTML();
  let docSnap, casesSnap;
  try {
    [docSnap, casesSnap] = await Promise.all([
      db.collection('clients').doc(id).get(),
      db.collection('cases').where('clientId','==',id).orderBy('createdAt','desc').get(),
    ]);
  } catch(e) {
    document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
    console.error(e); return;
  }
  if (!docSnap.exists) { toast('顧客が見つかりません','error'); navigate('/clients'); return; }
  const client = { id: docSnap.id, ...docSnap.data() };
  const cases = casesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!clientsCache.length) clientsCache = [client];
  setPageTitle(client.name);
  setTopbarActions(`
    <a href="#/cases/new?clientId=${id}&clientName=${encodeURIComponent(client.name)}" class="btn-primary" style="margin-right:6px;text-decoration:none;">
      <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>新規案件
    </a>
    <button onclick="openClientModal('${id}')" class="btn-ghost">編集</button>`);

  document.getElementById('page-content').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:18px;max-width:800px;">
    <a href="#/clients" style="display:inline-flex;align-items:center;gap:4px;font-size:12.5px;color:var(--t2);text-decoration:none;" onmouseover="this.style.color='var(--t1)'" onmouseout="this.style.color='var(--t2)'">
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>顧客一覧
    </a>
    <div class="surface" style="padding:24px;">
      <h2 class="h-serif" style="font-size:18px;margin-bottom:18px;">${client.name}</h2>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;">
        ${[['業種',client.industry],['役職',client.representativeTitle],['代表者',client.representative],
           ['メール',client.email],['電話',client.phone],['住所',client.address]].map(([l,val])=>`
          <div>
            <p style="font-size:10.5px;color:var(--t3);letter-spacing:0.06em;text-transform:uppercase;font-weight:600;">${l}</p>
            <p style="font-size:13px;margin-top:4px;">${val||'-'}</p>
          </div>`).join('')}
      </div>
      ${client.notes ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid var(--border-2);">
        <p style="font-size:10.5px;color:var(--t3);letter-spacing:0.06em;text-transform:uppercase;font-weight:600;margin-bottom:6px;">備考</p>
        <p style="font-size:13px;color:var(--t2);">${client.notes}</p>
      </div>` : ''}
    </div>
    <div class="surface" style="padding:20px 22px;">
      <p class="h-serif" style="font-size:15px;margin-bottom:14px;">案件一覧 <span style="font-family:'DM Mono',monospace;font-size:13px;color:var(--t3);font-weight:400;">${cases.length}</span></p>
      ${cases.length === 0
        ? `<p style="text-align:center;padding:32px 0;font-size:13px;color:var(--t3);">案件がまだありません</p>`
        : `<div style="display:flex;flex-direction:column;gap:4px;">${cases.map(c=>`
          <a href="#/cases/${c.id}" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-radius:8px;text-decoration:none;transition:background 0.15s;" onmouseover="this.style.background='#F7F5F0'" onmouseout="this.style.background='transparent'">
            <div>
              <p style="font-size:13px;font-weight:500;color:var(--t1);">${c.title}</p>
              <p style="font-size:11px;color:var(--t3);margin-top:2px;">${fmtDate(c.deadline)!=='-'?'期限: '+fmtDate(c.deadline):''}</p>
            </div>
            ${statusBadge(c.status)}
          </a>`).join('')}</div>`}
    </div>
  </div>`;
}

// ===== 案件一覧 =====
let casesCache = [];
async function renderCases() {
  setPageTitle('案件管理');
  setTopbarActions(`<a href="#/cases/new" class="btn-primary">
    <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>新規案件</a>`);
  document.getElementById('page-content').innerHTML = loadingHTML();
  try {
    const snap = await db.collection('cases').orderBy('createdAt','desc').get();
    casesCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {
    document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
    console.error(e); return;
  }
  const urlStatus = new URLSearchParams(window.location.hash.split('?')[1]||'').get('status')||'';
  const urlClient = new URLSearchParams(window.location.hash.split('?')[1]||'').get('client')||'';
  renderCasesTable('', urlStatus, urlClient);
}

function renderCasesTable(search, statusFilter, clientFilter) {
  const filtered = casesCache.filter(c => {
    const ms = !search || c.title?.includes(search) || c.clientName?.includes(search) || c.bankName?.includes(search);
    const mst = !statusFilter || c.status === statusFilter;
    const mc = !clientFilter || c.clientId === clientFilter;
    return ms && mst && mc;
  });
  document.getElementById('page-content').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:16px;">
    <div style="display:flex;flex-wrap:wrap;gap:10px;">
      <div style="position:relative;flex:1;min-width:200px;">
        <svg style="position:absolute;left:11px;top:50%;transform:translateY(-50%);width:14px;height:14px;color:var(--t3);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        <input type="text" id="case-search" value="${escAttr(search)}" oninput="renderCasesTable(this.value,'${escJS(statusFilter)}','${escJS(clientFilter)}')" placeholder="案件名・顧客・銀行で検索"
          style="width:100%;padding:9px 12px 9px 34px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;">
      </div>
      <select id="case-status-filter" onchange="renderCasesTable(document.getElementById('case-search').value,this.value,'${escJS(clientFilter)}')"
        style="padding:9px 32px 9px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;min-width:160px;">
        <option value="">すべてのステータス</option>
        ${STATUS_LIST.map(s=>`<option value="${s.id}" ${statusFilter===s.id?'selected':''}>${s.id}</option>`).join('')}
      </select>
      ${statusFilter||clientFilter ? `<button onclick="renderCasesTable('','','')" class="btn-ghost">フィルタ解除</button>` : ''}
    </div>
    <p style="font-size:12px;color:var(--t3);">${filtered.length}件の案件</p>
    ${filtered.length === 0
      ? `<div style="text-align:center;padding:64px 0;font-size:13px;color:var(--t3);">案件がありません</div>`
      : `<div class="surface" style="overflow:hidden;">
          <table>
            <thead><tr>
              <th>案件名</th>
              <th class="hidden md:table-cell">顧客名</th>
              <th class="hidden lg:table-cell">融資希望額</th>
              <th class="hidden lg:table-cell">申請銀行</th>
              <th>ステータス</th>
              <th class="hidden md:table-cell">期限</th>
            </tr></thead>
            <tbody>
              ${filtered.map(c=>`
              <tr>
                <td><a href="#/cases/${c.id}" style="font-weight:600;color:var(--primary);text-decoration:none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${c.title}</a></td>
                <td class="hidden md:table-cell" style="color:var(--t2);">${c.clientName||'-'}</td>
                <td class="hidden lg:table-cell" style="font-family:'DM Mono',monospace;font-size:12.5px;">${fmtMoney(c.loanAmount)}</td>
                <td class="hidden lg:table-cell" style="color:var(--t2);">${c.bankName||'-'}</td>
                <td>${statusBadge(c.status)}</td>
                <td class="hidden md:table-cell" style="font-size:12.5px;${isNearDeadline(c.deadline)?'color:#94190F;font-weight:600;':'color:var(--t2);'}">${fmtDate(c.deadline)}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`}
  </div>`;
}

// ===== 案件詳細 =====
let caseData = null;
let activeTab = 'overview';

async function renderCaseDetail(id) {
  const isNew = id === 'new';
  setTopbarActions('');
  document.getElementById('page-content').innerHTML = loadingHTML();
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1]||'');
  const preClientId = urlParams.get('clientId')||'';
  const preClientName = urlParams.get('clientName')||'';
  let clients = [];
  try {
    const clientsSnap = await db.collection('clients').orderBy('name').get();
    clients = clientsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    clientsCache = clients;
  } catch(e) {
    document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
    console.error(e); return;
  }
  if (isNew) {
    caseData = {
      title:'', clientId:preClientId, clientName:preClientName,
      loanAmount:'', loanPurpose:'', bankName:'',
      status:'初回面談', assigneeName:currentUser?.displayName||currentUser?.email||'',
      caseDate:new Date().toISOString().split('T')[0],
      deadline:'', notes:'', documents:[], tasks:[],
    };
    if (preClientId && preClientName) {
      try { await autoGenerateTitle(preClientId, preClientName); } catch(e) { console.error(e); }
    }
  } else {
    let snap;
    try { snap = await db.collection('cases').doc(id).get(); }
    catch(e) {
      document.getElementById('page-content').innerHTML = `<p style="text-align:center;padding:64px 0;color:#94190F;font-size:13px;">データ取得に失敗しました</p>`;
      console.error(e); return;
    }
    if (!snap.exists) { toast('案件が見つかりません','error'); navigate('/cases'); return; }
    const d = snap.data();
    caseData = {
      ...d,
      caseDate: d.caseDate||new Date().toISOString().split('T')[0],
      deadline: d.deadline ? (d.deadline.toDate ? d.deadline.toDate().toISOString().split('T')[0] : d.deadline) : '',
      documents: d.documents||[], tasks: d.tasks||[],
    };
  }
  activeTab = 'overview';
  setPageTitle(isNew ? '新規案件作成' : caseData.title);
  renderCaseDetailUI(id, clients, isNew);
}

function renderCaseDetailUI(id, clients, isNew) {
  const isNew_ = id === 'new';
  const submitted = caseData.documents?.filter(d=>d.submitted).length||0;
  const allDocs = [...DEFAULT_DOCUMENTS, ...(caseData.documents?.filter(d=>d.custom).map(d=>d.name)||[])];
  const completedTasks = caseData.tasks?.filter(t=>t.completed).length||0;

  document.getElementById('page-content').innerHTML = `
  <div style="display:flex;flex-direction:column;gap:18px;max-width:840px;margin:0 auto;">
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <a href="#/cases" style="color:var(--t3);display:flex;" onmouseover="this.style.color='var(--t1)'" onmouseout="this.style.color='var(--t3)'">
          <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
        </a>
        <div>
          <h1 class="h-serif" style="font-size:20px;color:var(--t1);">${isNew_?'新規案件作成':caseData.title}</h1>
          ${!isNew_?`<p style="font-size:12px;color:var(--t3);margin-top:3px;">${caseData.clientName}</p>`:''}
        </div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        ${!isNew_?`<button onclick="deleteCase('${id}')" class="btn-danger">削除</button>`:''}
        <button onclick="saveCase('${id}')" id="save-btn" class="btn-primary">保存</button>
      </div>
    </div>

    ${!isNew_?`
    <!-- Status bar -->
    <div class="surface" style="padding:16px 18px;">
      <p style="font-size:10.5px;font-weight:600;color:var(--t3);letter-spacing:0.06em;text-transform:uppercase;margin-bottom:12px;">進捗ステータス</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">
        ${STATUS_LIST.map((s,i)=>{
          const isActive = caseData.status === s.id;
          const isDone = STATUS_LIST.findIndex(x=>x.id===caseData.status) > i;
          return `<button onclick="setCaseStatus('${s.id}','${id}')"
            style="padding:6px 12px;border-radius:999px;font-size:11.5px;font-weight:${isActive?'600':'400'};cursor:pointer;border:1.5px solid ${isActive?s.activeColor:'transparent'};background:${isActive?s.activeBg:isDone?'#F0EDE8':'#F5F3EF'};color:${isActive?s.activeColor:isDone?'#B0A898':'var(--t2)'};transition:all 0.15s;font-family:'Noto Sans JP',sans-serif;">${i+1}. ${s.id}</button>`;
        }).join('')}
      </div>
    </div>
    <!-- Tabs -->
    <div style="display:flex;border-bottom:1px solid var(--border-2);gap:0;">
      ${[
        {id:'overview',label:'基本情報'},
        {id:'documents',label:`書類・ファイル`,count:`${submitted}/${allDocs.length}`},
        {id:'tasks',label:'タスク',count:`${completedTasks}/${caseData.tasks?.length||0}`},
      ].map(t=>`
        <button onclick="switchTab('${t.id}','${id}')" class="tab-btn ${activeTab===t.id?'active':''}" style="padding:10px 18px;display:flex;align-items:center;gap:6px;background:transparent;border:none;border-bottom:2px solid ${activeTab===t.id?'var(--primary)':'transparent'};cursor:pointer;">
          ${t.label}
          ${t.count!==undefined?`<span style="font-family:'DM Mono',monospace;font-size:11px;padding:1px 6px;border-radius:999px;background:${activeTab===t.id?'var(--primary)':'var(--border-2)'};color:${activeTab===t.id?'#FFF':'var(--t2)'};">${t.count}</span>`:''}
        </button>`).join('')}
    </div>` : ''}

    <div id="tab-content"></div>
  </div>`;

  renderTabContent(id, clients);
}

function setCaseStatus(status, id) { caseData.status = status; renderCaseDetailUI(id, clientsCache, false); }
function switchTab(tab, id) { activeTab = tab; renderCaseDetailUI(id, clientsCache, false); }

function renderTabContent(id, clients) {
  const isNew_ = id === 'new';
  const container = document.getElementById('tab-content');
  if (!container) return;

  if (isNew_ || activeTab === 'overview') {
    container.innerHTML = `
    <div class="surface" style="padding:24px;">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">
        <div style="grid-column:span 2;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">案件名 <span style="font-weight:400;color:var(--t3);">（自動生成）</span></label>
          <input type="text" id="cd-title" value="${caseData.title||''}" readonly
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">顧客 *</label>
          <select id="cd-clientId" onchange="handleClientChange(this.value,'${id}')"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
            <option value="">顧客を選択してください</option>
            ${clients.map(c=>`<option value="${c.id}" ${caseData.clientId===c.id?'selected':''}>${c.name}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">ステータス</label>
          <select id="cd-status" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
            ${STATUS_LIST.map(s=>`<option value="${s.id}" ${caseData.status===s.id?'selected':''}>${s.id}</option>`).join('')}
          </select>
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">融資希望額（万円）</label>
          <input type="number" id="cd-loanAmount" value="${caseData.loanAmount||''}" placeholder="1000"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">申請銀行</label>
          <input type="text" id="cd-bankName" value="${caseData.bankName||''}" placeholder="〇〇銀行"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">資金使途</label>
          <input type="text" id="cd-loanPurpose" value="${caseData.loanPurpose||''}" placeholder="設備投資、運転資金など"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">担当者</label>
          <input type="text" id="cd-assigneeName" value="${caseData.assigneeName||''}" placeholder="担当者名"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">作成日</label>
          <input type="date" id="cd-caseDate" value="${caseData.caseDate||''}"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div>
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">期限</label>
          <input type="date" id="cd-deadline" value="${caseData.deadline||''}"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        </div>
        <div style="grid-column:span 2;">
          <label style="display:block;font-size:11px;font-weight:600;color:var(--t2);margin-bottom:7px;letter-spacing:0.04em;text-transform:uppercase;">メモ・備考</label>
          <textarea id="cd-notes" rows="4" placeholder="顧客との会話メモ、銀行との交渉状況など"
            style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;resize:vertical;">${caseData.notes||''}</textarea>
        </div>
      </div>
    </div>`;
    return;
  }

  if (activeTab === 'documents') {
    const allDocs = [...DEFAULT_DOCUMENTS, ...(caseData.documents?.filter(d=>d.custom).map(d=>d.name)||[])];
    const submitted = caseData.documents?.filter(d=>d.submitted).length||0;
    container.innerHTML = `
    <div class="surface" style="padding:22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
        <p class="h-serif" style="font-size:15px;">必要書類チェックリスト</p>
        <span style="font-family:'DM Mono',monospace;font-size:12.5px;color:var(--t2);">${submitted}/${allDocs.length}</span>
      </div>
      <div class="progress-track" style="margin-bottom:18px;">
        <div class="progress-fill" style="width:${allDocs.length?(submitted/allDocs.length*100):0}%;"></div>
      </div>
      <div style="display:flex;flex-direction:column;gap:4px;margin-bottom:16px;">
        ${allDocs.map(docName=>{
          const item = caseData.documents?.find(d=>d.name===docName);
          const isSubmitted = item?.submitted||false;
          const isCustom = !DEFAULT_DOCUMENTS.includes(docName);
          return `
          <div style="display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:7px;${isSubmitted?'background:#F4FAF7;':''}transition:background 0.15s;" onmouseover="this.style.background='#F7F5F0'" onmouseout="this.style.background='${isSubmitted?'#F4FAF7':''}'">
            <button onclick="toggleDoc('${docName.replace(/'/g,"\\'")}','${id}')"
              style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${isSubmitted?'#166534':'#C8D4DF'};background:${isSubmitted?'#166534':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;transition:all 0.15s;">
              ${isSubmitted?`<svg width="10" height="10" fill="none" stroke="#FFF" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`:''}
            </button>
            <span style="flex:1;font-size:13px;${isSubmitted?'text-decoration:line-through;color:var(--t3);':'color:var(--t1);'}">${escAttr(docName)}</span>
            ${item?.submittedAt&&isSubmitted?`<span style="font-size:11px;color:var(--t3);">${new Date(item.submittedAt).toLocaleDateString('ja-JP')}</span>`:''}
            ${isCustom?`<button onclick="removeCustomDoc('${docName.replace(/'/g,"\\'")}','${id}')" style="color:var(--t3);background:none;border:none;cursor:pointer;font-size:16px;line-height:1;padding:2px;" onmouseover="this.style.color='#94190F'" onmouseout="this.style.color='var(--t3)'">&times;</button>`:''}
          </div>`;
        }).join('')}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:20px;">
        <input type="text" id="custom-doc-input" placeholder="書類を追加（例: 見積書）" onkeydown="if(event.key==='Enter')addCustomDoc('${id}')"
          style="flex:1;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
        <button onclick="addCustomDoc('${id}')" class="btn-ghost">追加</button>
      </div>
      <div style="border-top:1px solid var(--border-2);padding-top:20px;">
        <p class="h-serif" style="font-size:15px;margin-bottom:14px;">アップロード済みファイル</p>
        <div id="file-upload-section"></div>
      </div>
    </div>`;
    if (caseData.clientName && caseData.title) {
      initFileUpload(caseData.clientName, caseData.title, document.getElementById('file-upload-section'));
    } else {
      document.getElementById('file-upload-section').innerHTML = `<p style="font-size:13px;color:var(--t3);text-align:center;padding:24px 0;">顧客名・案件名を設定してから保存してください</p>`;
    }
    return;
  }

  if (activeTab === 'tasks') {
    container.innerHTML = `
    <div class="surface" style="padding:22px;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <p class="h-serif" style="font-size:15px;">タスク</p>
        <button onclick="showAddTaskForm('${id}')" class="btn-ghost" style="display:flex;align-items:center;gap:6px;color:var(--primary);border-color:var(--primary-t);">
          <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>タスク追加
        </button>
      </div>
      <div id="task-add-form"></div>
      ${!caseData.tasks?.length
        ? `<p style="text-align:center;padding:40px 0;font-size:13px;color:var(--t3);">タスクがありません</p>`
        : `<div style="display:flex;flex-direction:column;gap:6px;">
            ${caseData.tasks.map(t=>`
            <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border-radius:8px;border:1px solid ${t.completed?'transparent':'var(--border-2)'};background:${t.completed?'#F7F5F0':'var(--card)'};">
              <button onclick="toggleTask('${t.id}','${id}')"
                style="width:18px;height:18px;border-radius:4px;border:1.5px solid ${t.completed?'#166534':'#C8D4DF'};background:${t.completed?'#166534':'transparent'};display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;margin-top:1px;transition:all 0.15s;">
                ${t.completed?`<svg width="10" height="10" fill="none" stroke="#FFF" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>`:''}
              </button>
              <div style="flex:1;">
                <p style="font-size:13px;${t.completed?'text-decoration:line-through;color:var(--t3);':'color:var(--t1);font-weight:500;'}">${escAttr(t.title)}</p>
                <div style="display:flex;gap:12px;margin-top:4px;">
                  ${t.dueDate?`<span style="font-size:11px;color:var(--t3);">期限: ${escAttr(t.dueDate)}</span>`:''}
                  ${t.assigneeName?`<span style="font-size:11px;color:var(--t3);">担当: ${escAttr(t.assigneeName)}</span>`:''}
                </div>
              </div>
              <button onclick="removeTask('${t.id}','${id}')" style="color:var(--t3);background:none;border:none;cursor:pointer;font-size:16px;padding:2px;line-height:1;" onmouseover="this.style.color='#94190F'" onmouseout="this.style.color='var(--t3)'">&times;</button>
            </div>`).join('')}
          </div>`}
    </div>`;
  }
}

function showAddTaskForm(id) {
  document.getElementById('task-add-form').innerHTML = `
  <div style="margin-bottom:14px;padding:16px;background:var(--primary-t);border-radius:8px;border:1px solid #D0DDE8;display:flex;flex-direction:column;gap:10px;">
    <input type="text" id="new-task-title" placeholder="タスク内容" autofocus
      style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <input type="date" id="new-task-due" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
      <input type="text" id="new-task-assignee" placeholder="担当者名" style="width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:6px;font-size:13px;">
    </div>
    <div style="display:flex;gap:8px;">
      <button onclick="document.getElementById('task-add-form').innerHTML=''" class="btn-ghost" style="flex:1;justify-content:center;">キャンセル</button>
      <button onclick="addTask('${id}')" class="btn-primary" style="flex:1;justify-content:center;">追加</button>
    </div>
  </div>`;
}

function toggleDoc(docName, id) {
  const docs = caseData.documents||[];
  const existing = docs.find(d=>d.name===docName);
  if (existing) { existing.submitted=!existing.submitted; existing.submittedAt=existing.submitted?new Date().toISOString():null; }
  else { docs.push({name:docName,submitted:true,submittedAt:new Date().toISOString()}); }
  caseData.documents = docs;
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'documents', caseData.documents);
}
function addCustomDoc(id) {
  const val = document.getElementById('custom-doc-input')?.value.trim();
  if (!val) return;
  caseData.documents = [...(caseData.documents||[]), {name:val,submitted:false,submittedAt:null,custom:true}];
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'documents', caseData.documents);
}
function removeCustomDoc(docName, id) {
  caseData.documents = caseData.documents.filter(d=>d.name!==docName);
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'documents', caseData.documents);
}
function addTask(id) {
  const title = document.getElementById('new-task-title')?.value.trim();
  if (!title) { toast('タスク名を入力してください','error'); return; }
  caseData.tasks = [...(caseData.tasks||[]), {
    id:Date.now().toString(), title,
    dueDate:document.getElementById('new-task-due')?.value||'',
    assigneeName:document.getElementById('new-task-assignee')?.value||'',
    completed:false, createdAt:new Date().toISOString(),
  }];
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'tasks', caseData.tasks);
}
function toggleTask(taskId, id) {
  caseData.tasks = caseData.tasks.map(t => t.id===taskId ? {...t,completed:!t.completed} : t);
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'tasks', caseData.tasks);
}
function removeTask(taskId, id) {
  caseData.tasks = caseData.tasks.filter(t=>t.id!==taskId);
  renderCaseDetailUI(id, clientsCache, false);
  autoSaveField(id, 'tasks', caseData.tasks);
}
async function handleClientChange(clientId, id) {
  const client = clientsCache.find(c=>c.id===clientId);
  caseData.clientId = clientId;
  caseData.clientName = client?.name||'';
  if (id==='new' && clientId && client?.name) {
    await autoGenerateTitle(clientId, client.name);
    document.getElementById('cd-title').value = caseData.title;
  }
}
async function autoGenerateTitle(clientId, clientName) {
  const snap = await db.collection('cases').where('clientId','==',clientId).get();
  caseData.title = `${clientName}_${String(snap.size+1).padStart(3,'0')}`;
}
function syncCaseFormData() {
  if (document.getElementById('cd-clientId')) {
    caseData.clientId = document.getElementById('cd-clientId')?.value||caseData.clientId;
    caseData.status = document.getElementById('cd-status')?.value||caseData.status;
    caseData.loanAmount = document.getElementById('cd-loanAmount')?.value||'';
    caseData.bankName = document.getElementById('cd-bankName')?.value||'';
    caseData.loanPurpose = document.getElementById('cd-loanPurpose')?.value||'';
    caseData.assigneeName = document.getElementById('cd-assigneeName')?.value||'';
    caseData.caseDate = document.getElementById('cd-caseDate')?.value||'';
    caseData.deadline = document.getElementById('cd-deadline')?.value||'';
    caseData.notes = document.getElementById('cd-notes')?.value||'';
  }
}
async function autoSaveField(id, field, value) {
  if (!id || id==='new') return;
  try {
    await db.collection('cases').doc(id).update({[field]:value,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    showAutoSaveIndicator();
  } catch(e) { console.error('自動保存失敗:', e); toast('自動保存に失敗しました','error'); }
}
function showAutoSaveIndicator() {
  let el = document.getElementById('autosave-indicator');
  if (!el) { el=document.createElement('div'); el.id='autosave-indicator'; document.body.appendChild(el); }
  el.textContent = '✓ 自動保存しました';
  el.style.opacity = '1';
  clearTimeout(el._timer);
  el._timer = setTimeout(()=>{ el.style.opacity='0'; }, 1600);
}
async function saveCase(id) {
  syncCaseFormData();
  if (!caseData.title.trim()) { toast('案件名は必須です','error'); return; }
  if (!caseData.clientId) { toast('顧客を選択してください','error'); return; }
  const btn = document.getElementById('save-btn');
  if (btn) btn.textContent = '保存中...';
  const payload = { ...caseData, deadline:caseData.deadline?new Date(caseData.deadline):null, updatedAt:firebase.firestore.FieldValue.serverTimestamp() };
  delete payload.id;
  try {
    if (id==='new') {
      payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      const ref = await db.collection('cases').add(payload);
      toast('案件を作成しました'); navigate('/cases/'+ref.id);
    } else {
      await db.collection('cases').doc(id).update(payload);
      toast('保存しました'); if (btn) btn.textContent='保存';
    }
  } catch(e) { toast('保存に失敗しました: '+e.message,'error'); if (btn) btn.textContent='保存'; }
}
async function deleteCase(id) {
  if (!confirm('この案件を削除しますか？')) return;
  try { await db.collection('cases').doc(id).delete(); toast('削除しました'); navigate('/cases'); }
  catch { toast('削除に失敗しました','error'); }
}

// ===== File Upload =====
async function compressImage(file) {
  return new Promise(resolve => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.onload = () => {
      const MAX=1280; let {width,height}=img;
      if (width>MAX||height>MAX) {
        if (width>height) { height=Math.round(height*MAX/width); width=MAX; }
        else { width=Math.round(width*MAX/height); height=MAX; }
      }
      const canvas=document.createElement('canvas');
      canvas.width=width; canvas.height=height;
      canvas.getContext('2d').drawImage(img,0,0,width,height);
      canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob||file); },'image/jpeg',0.7);
    };
    img.src=url;
  });
}
function fileIcon(mimeType) { return MIME_ICONS[mimeType]||'📎'; }
function fmtBytes(bytes) {
  if (!bytes) return '';
  const n=Number(bytes);
  if (n<1024) return `${n} B`;
  if (n<1024*1024) return `${(n/1024).toFixed(1)} KB`;
  return `${(n/1024/1024).toFixed(1)} MB`;
}
async function initFileUpload(clientName, caseName, container) {
  container.innerHTML = `
  <div id="fu-root">
    <p style="font-size:12px;color:var(--t2);margin-bottom:12px;">保存先: <strong style="color:var(--t1);">${clientName} / ${caseName}</strong></p>
    <div id="fu-dropzone" class="drop-zone" style="border:2px dashed var(--border);border-radius:10px;padding:36px;text-align:center;cursor:pointer;transition:all 0.2s;">
      <input type="file" id="fu-input" multiple style="display:none;">
      <svg style="width:40px;height:40px;color:var(--t3);margin:0 auto 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
      <p style="font-size:13px;font-weight:500;color:var(--t2);">クリックまたはドラッグ＆ドロップでアップロード</p>
      <p style="font-size:11px;color:var(--t3);margin-top:5px;">PDF・Word・Excel・画像など</p>
    </div>
    <div id="fu-list" style="margin-top:14px;">${loadingHTML()}</div>
  </div>`;
  const dropzone=document.getElementById('fu-dropzone');
  const input=document.getElementById('fu-input');
  dropzone.addEventListener('click',()=>input.click());
  input.addEventListener('change',e=>handleFiles(e.target.files,clientName,caseName));
  dropzone.addEventListener('dragover',e=>{e.preventDefault();dropzone.classList.add('drag-over');});
  dropzone.addEventListener('dragleave',()=>dropzone.classList.remove('drag-over'));
  dropzone.addEventListener('drop',e=>{e.preventDefault();dropzone.classList.remove('drag-over');handleFiles(e.dataTransfer.files,clientName,caseName);});
  await loadFileList(clientName, caseName);
}
async function loadFileList(clientName, caseName) {
  const listEl=document.getElementById('fu-list');
  if (!listEl) return;
  try {
    const ref=storage.ref(`${sanitizeStoragePath(clientName)}/${sanitizeStoragePath(caseName)}`);
    const result=await ref.listAll();
    if (result.items.length===0) {
      listEl.innerHTML=`<p style="text-align:center;padding:24px 0;font-size:13px;color:var(--t3);">まだファイルがありません</p>`;
      return;
    }
    const files=await Promise.all(result.items.map(async item=>{
      const meta=await item.getMetadata();
      const url=await item.getDownloadURL();
      return {name:item.name,fullPath:item.fullPath,url,size:meta.size,contentType:meta.contentType,timeCreated:meta.timeCreated};
    }));
    files.sort((a,b)=>new Date(b.timeCreated)-new Date(a.timeCreated));
    listEl.innerHTML=`<style>.fu-hidden{display:none}</style><div class="surface" style="overflow:hidden;">
      ${files.map(f=>{
        const isImg=f.contentType&&f.contentType.startsWith('image/');
        const isPDF=f.contentType==='application/pdf';
        return `<div class="fu-file-row" style="border-bottom:1px solid var(--border-2);">
          <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;" onmouseover="this.style.background='#F7F5F0'" onmouseout="this.style.background='transparent'">
            ${isImg?`<img src="${f.url}" style="width:48px;height:48px;object-fit:cover;border-radius:4px;flex-shrink:0;cursor:pointer;" loading="lazy" onclick="this.closest('.fu-file-row').querySelector('.fu-preview-area').classList.toggle('fu-hidden');">`:`<span style="font-size:20px;flex-shrink:0;">${fileIcon(f.contentType)}</span>`}
            <div style="min-width:0;flex:1;">
              <a href="${f.url}" target="_blank" rel="noopener noreferrer" style="font-size:13px;font-weight:500;color:var(--primary);text-decoration:none;display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${f.name}</a>
              <p style="font-size:11px;color:var(--t3);margin-top:2px;">${fmtBytes(f.size)}${f.size&&f.timeCreated?' · ':''}${f.timeCreated?new Date(f.timeCreated).toLocaleDateString('ja-JP'):''}</p>
            </div>
            ${isPDF?`<button onclick="this.closest('.fu-file-row').querySelector('.fu-preview-area').classList.toggle('fu-hidden');" style="color:var(--t3);background:none;border:none;cursor:pointer;padding:4px;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--t3)'" title="プレビュー"><svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg></button>`:''}
            <a href="${f.url}&response-content-disposition=attachment" target="_blank" style="color:var(--t3);padding:4px;" onmouseover="this.style.color='var(--primary)'" onmouseout="this.style.color='var(--t3)'">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            </a>
            <button onclick="deleteStorageFile('${escJS(f.fullPath)}','${escJS(clientName)}','${escJS(caseName)}')" style="color:var(--t3);background:none;border:none;cursor:pointer;padding:4px;" onmouseover="this.style.color='#94190F'" onmouseout="this.style.color='var(--t3)'">
              <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
          ${isImg||isPDF?`<div class="fu-preview-area fu-hidden" style="padding:0 14px 12px;">${isImg?`<img src="${f.url}" style="max-width:100%;max-height:400px;border-radius:6px;" loading="lazy">`:`<iframe src="${f.url}" style="width:100%;height:500px;border:1px solid var(--border-2);border-radius:6px;" loading="lazy"></iframe>`}</div>`:''}
        </div>`;
      }).join('')}
    </div>`;
  } catch {
    listEl.innerHTML=`<p style="text-align:center;padding:24px 0;font-size:13px;color:#94190F;">ファイル一覧の取得に失敗しました</p>`;
  }
}
async function handleFiles(fileList, clientName, caseName) {
  const files=Array.from(fileList);
  if (!files.length) return;
  const dropzone=document.getElementById('fu-dropzone');
  if (dropzone) dropzone.innerHTML=`<div style="display:flex;flex-direction:column;align-items:center;gap:10px;"><div style="width:28px;height:28px;border:2px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;"></div><p style="font-size:13px;color:var(--primary);font-weight:500;">アップロード中...</p></div>`;
  let success=0;
  for (const file of files) {
    try {
      let uploadFile=file;
      if (file.type==='image/jpeg'||file.type==='image/png') {
        const blob=await compressImage(file);
        uploadFile=new File([blob],file.name,{type:'image/jpeg'});
      }
      await storage.ref(`${sanitizeStoragePath(clientName)}/${sanitizeStoragePath(caseName)}/${file.name}`).put(uploadFile);
      success++;
    } catch { toast(`「${file.name}」のアップロードに失敗しました`,'error'); }
  }
  if (success>0) toast(`${success}件のファイルをアップロードしました`);
  if (dropzone) {
    dropzone.innerHTML=`<input type="file" id="fu-input" multiple style="display:none;"><svg style="width:40px;height:40px;color:var(--t3);margin:0 auto 10px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg><p style="font-size:13px;font-weight:500;color:var(--t2);">クリックまたはドラッグ＆ドロップでアップロード</p><p style="font-size:11px;color:var(--t3);margin-top:5px;">PDF・Word・Excel・画像など</p>`;
    const ni=document.getElementById('fu-input');
    dropzone.onclick = ()=>ni.click();
    ni.onchange = e=>handleFiles(e.target.files,clientName,caseName);
  }
  await loadFileList(clientName, caseName);
}
async function deleteStorageFile(fullPath, clientName, caseName) {
  const name=fullPath.split('/').pop();
  if (!confirm(`「${name}」を削除しますか？`)) return;
  try { await storage.ref(fullPath).delete(); toast('ファイルを削除しました'); await loadFileList(clientName,caseName); }
  catch { toast('削除に失敗しました','error'); }
}

window.addEventListener('hashchange', handleRoute);