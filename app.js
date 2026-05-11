/* MoneyTrack - Pencatatan Uang
 * Pure HTML/CSS/JS, data disimpan di localStorage.
 */
(() => {
  'use strict';

  // ============ STATE ============
  const STORAGE_KEY = 'moneytrack:v1';
  const CURRENCY_SYMBOLS = { IDR: 'Rp', USD: '$', EUR: '€', MYR: 'RM', SGD: 'S$' };

  const defaultState = () => ({
    currency: 'IDR',
    theme: 'light',
    accounts: [
      { id: uid(), name: 'Tunai', initial: 0, icon: '💵', color: '#10b981' },
      { id: uid(), name: 'Bank', initial: 0, icon: '🏦', color: '#0ea5e9' },
      { id: uid(), name: 'E-Wallet', initial: 0, icon: '📱', color: '#8b5cf6' },
    ],
    categories: [
      { id: uid(), name: 'Makanan', type: 'expense', icon: '🍔', color: '#ef4444' },
      { id: uid(), name: 'Transportasi', type: 'expense', icon: '🚗', color: '#f59e0b' },
      { id: uid(), name: 'Belanja', type: 'expense', icon: '🛒', color: '#ec4899' },
      { id: uid(), name: 'Hiburan', type: 'expense', icon: '🎬', color: '#8b5cf6' },
      { id: uid(), name: 'Tagihan', type: 'expense', icon: '📄', color: '#6366f1' },
      { id: uid(), name: 'Kesehatan', type: 'expense', icon: '💊', color: '#14b8a6' },
      { id: uid(), name: 'Pendidikan', type: 'expense', icon: '📚', color: '#0ea5e9' },
      { id: uid(), name: 'Lainnya', type: 'expense', icon: '📦', color: '#64748b' },
      { id: uid(), name: 'Gaji', type: 'income', icon: '💼', color: '#22c55e' },
      { id: uid(), name: 'Bonus', type: 'income', icon: '🎁', color: '#84cc16' },
      { id: uid(), name: 'Investasi', type: 'income', icon: '📈', color: '#10b981' },
      { id: uid(), name: 'Lain-lain', type: 'income', icon: '💰', color: '#06b6d4' },
    ],
    transactions: [],
    budgets: [],
    goals: [],
  });

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  let state = loadState();

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      // merge defaults for missing keys
      return { ...defaultState(), ...parsed };
    } catch (e) {
      console.error(e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  // ============ HELPERS ============
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  function fmtMoney(n) {
    const sym = CURRENCY_SYMBOLS[state.currency] || '';
    const num = Math.round(Number(n) || 0);
    const sign = num < 0 ? '-' : '';
    const abs = Math.abs(num).toLocaleString('id-ID');
    return `${sign}${sym}${abs}`;
  }

  function fmtDate(iso) {
    const d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function monthKey(d) {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2200);
  }

  function confirmAction(msg) { return window.confirm(msg); }

  // ============ COMPUTED ============
  function getAccountById(id) { return state.accounts.find(a => a.id === id); }
  function getCategoryById(id) { return state.categories.find(c => c.id === id); }

  function accountBalance(accountId) {
    const acc = getAccountById(accountId);
    if (!acc) return 0;
    let bal = Number(acc.initial) || 0;
    for (const t of state.transactions) {
      if (t.type === 'income' && t.accountId === accountId) bal += Number(t.amount);
      else if (t.type === 'expense' && t.accountId === accountId) bal -= Number(t.amount);
      else if (t.type === 'transfer') {
        if (t.accountId === accountId) bal -= Number(t.amount);
        if (t.accountToId === accountId) bal += Number(t.amount);
      }
    }
    return bal;
  }

  function totalBalance() {
    return state.accounts.reduce((sum, a) => sum + accountBalance(a.id), 0);
  }

  function txInMonth(ym) {
    return state.transactions.filter(t => monthKey(t.date) === ym);
  }

  // ============ NAV / ROUTING ============
  function setView(view) {
    $$('.view').forEach(v => v.classList.toggle('active', v.id === `view-${view}`));
    $$('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
    const titles = {
      dashboard: 'Dashboard',
      transactions: 'Transaksi',
      categories: 'Kategori',
      accounts: 'Akun',
      budgets: 'Budget',
      goals: 'Target',
      settings: 'Pengaturan',
    };
    $('#pageTitle').textContent = titles[view] || '';
    if (window.innerWidth < 900) $('#sidebar').classList.remove('open');
    renderAll();
  }

  // ============ RENDER: DASHBOARD ============
  function renderDashboard() {
    $('#totalBalance').textContent = fmtMoney(totalBalance());
    $('#totalAccounts').textContent = `${state.accounts.length} akun`;

    const ym = monthKey(new Date());
    const mTx = txInMonth(ym);
    const income = mTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0);
    const expense = mTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0);
    const net = income - expense;

    $('#monthIncome').textContent = fmtMoney(income);
    $('#monthIncomeCount').textContent = `${mTx.filter(t => t.type === 'income').length} transaksi`;
    $('#monthExpense').textContent = fmtMoney(expense);
    $('#monthExpenseCount').textContent = `${mTx.filter(t => t.type === 'expense').length} transaksi`;
    $('#monthNet').textContent = fmtMoney(net);
    const pct = income > 0 ? Math.round((net / income) * 100) : null;
    $('#monthNetPct').textContent = pct === null ? '—' : `${pct >= 0 ? '+' : ''}${pct}% dari pemasukan`;

    // Pie chart: expense by category this month
    const byCat = {};
    for (const t of mTx.filter(x => x.type === 'expense')) {
      byCat[t.categoryId] = (byCat[t.categoryId] || 0) + Number(t.amount);
    }
    const pieData = Object.entries(byCat)
      .map(([catId, total]) => {
        const cat = getCategoryById(catId);
        return { label: cat ? cat.name : 'Tanpa Kategori', color: cat ? cat.color : '#94a3b8', value: total };
      })
      .sort((a, b) => b.value - a.value);

    $('#pieMonthLabel').textContent = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    drawPie($('#pieChart'), pieData);
    renderLegend($('#pieLegend'), pieData);

    // Bar chart: 6 months trend
    const months = [];
    const d = new Date();
    d.setDate(1);
    for (let i = 5; i >= 0; i--) {
      const dd = new Date(d.getFullYear(), d.getMonth() - i, 1);
      months.push({
        key: monthKey(dd),
        label: dd.toLocaleDateString('id-ID', { month: 'short' }),
      });
    }
    const barData = months.map(m => {
      const txs = txInMonth(m.key);
      return {
        label: m.label,
        income: txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0),
        expense: txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0),
      };
    });
    drawBars($('#barChart'), barData);

    // Recent tx
    const recent = [...state.transactions]
      .sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id))
      .slice(0, 6);
    renderTxList($('#recentTx'), recent);
  }

  // ============ RENDER: TRANSACTIONS ============
  function renderTransactions() {
    // populate filter selects
    const catSel = $('#txCategoryFilter');
    const accSel = $('#txAccountFilter');
    const prevCat = catSel.value, prevAcc = accSel.value;
    catSel.innerHTML = '<option value="">Semua Kategori</option>' +
      state.categories.map(c => `<option value="${c.id}">${c.icon || ''} ${esc(c.name)}</option>`).join('');
    accSel.innerHTML = '<option value="">Semua Akun</option>' +
      state.accounts.map(a => `<option value="${a.id}">${a.icon || ''} ${esc(a.name)}</option>`).join('');
    catSel.value = prevCat;
    accSel.value = prevAcc;

    const q = $('#txSearch').value.toLowerCase().trim();
    const typeF = $('#txTypeFilter').value;
    const catF = catSel.value;
    const accF = accSel.value;
    const monthF = $('#txMonthFilter').value; // YYYY-MM

    let list = [...state.transactions];
    if (q) list = list.filter(t => (t.note || '').toLowerCase().includes(q));
    if (typeF) list = list.filter(t => t.type === typeF);
    if (catF) list = list.filter(t => t.categoryId === catF);
    if (accF) list = list.filter(t => t.accountId === accF || t.accountToId === accF);
    if (monthF) list = list.filter(t => monthKey(t.date) === monthF);

    list.sort((a, b) => (b.date + b.id).localeCompare(a.date + a.id));
    renderTxList($('#allTx'), list);
  }

  function renderTxList(container, list) {
    if (!list.length) {
      container.innerHTML = `<div class="empty">Belum ada transaksi. Klik "+ Transaksi" untuk mulai.</div>`;
      return;
    }
    // group by date
    const groups = {};
    for (const t of list) {
      (groups[t.date] ||= []).push(t);
    }
    const html = Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const items = groups[date].map(t => renderTxItem(t)).join('');
      return `<div class="tx-group">
        <div class="panel-sub" style="padding:6px 10px">${fmtDate(date)}</div>
        ${items}
      </div>`;
    }).join('');
    container.innerHTML = html;

    $$('.tx-item', container).forEach(el => {
      el.addEventListener('click', () => openTxModal(el.dataset.id));
    });
  }

  function renderTxItem(t) {
    const cat = getCategoryById(t.categoryId);
    const acc = getAccountById(t.accountId);
    const accTo = getAccountById(t.accountToId);
    let icon = '💱', title = 'Transfer', color = '#64748b', sign = '', amountClass = 'transfer';

    if (t.type === 'transfer') {
      icon = '🔄';
      title = `Transfer: ${acc ? acc.name : '?'} → ${accTo ? accTo.name : '?'}`;
    } else {
      icon = (cat && cat.icon) || '•';
      title = (cat && cat.name) || 'Tanpa Kategori';
      color = (cat && cat.color) || '#64748b';
      if (t.type === 'income') { sign = '+'; amountClass = 'income'; }
      else { sign = '-'; amountClass = 'expense'; }
    }

    const note = t.note ? ` · ${esc(t.note)}` : '';
    const accName = acc ? acc.name : '';

    return `<div class="tx-item" data-id="${t.id}">
      <div class="tx-icon" style="background:${color}20;color:${color}">${icon}</div>
      <div class="tx-main">
        <div class="tx-title">${esc(title)}</div>
        <div class="tx-sub">${esc(accName)}${note}</div>
      </div>
      <div class="tx-amount ${amountClass}">${sign}${fmtMoney(t.amount)}</div>
    </div>`;
  }

  // ============ RENDER: CATEGORIES ============
  function renderCategories() {
    const el = $('#catList');
    if (!state.categories.length) {
      el.innerHTML = `<div class="empty">Belum ada kategori.</div>`;
      return;
    }
    el.innerHTML = state.categories.map(c => `
      <div class="cat-item" data-id="${c.id}">
        <div class="cat-icon" style="background:${c.color}">${c.icon || '•'}</div>
        <div>
          <div class="cat-name">${esc(c.name)}</div>
          <div class="cat-type">${c.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}</div>
        </div>
      </div>
    `).join('');
    $$('.cat-item', el).forEach(node => {
      node.addEventListener('click', () => openCatModal(node.dataset.id));
    });
  }

  // ============ RENDER: ACCOUNTS ============
  function renderAccounts() {
    const el = $('#accList');
    if (!state.accounts.length) {
      el.innerHTML = `<div class="empty">Belum ada akun.</div>`;
      return;
    }
    el.innerHTML = state.accounts.map(a => `
      <div class="acc-item" data-id="${a.id}">
        <div class="acc-icon" style="background:${a.color}">${a.icon || '🏦'}</div>
        <div>
          <div class="acc-name">${esc(a.name)}</div>
          <div class="acc-balance">${fmtMoney(accountBalance(a.id))}</div>
        </div>
      </div>
    `).join('');
    $$('.acc-item', el).forEach(node => {
      node.addEventListener('click', () => openAccModal(node.dataset.id));
    });
  }

  // ============ RENDER: BUDGETS ============
  function renderBudgets() {
    const el = $('#budgetList');
    if (!state.budgets.length) {
      el.innerHTML = `<div class="empty">Belum ada budget. Klik "+ Budget" untuk menambah.</div>`;
      return;
    }
    const ym = monthKey(new Date());
    const mTx = txInMonth(ym).filter(t => t.type === 'expense');
    el.innerHTML = state.budgets.map(b => {
      const cat = getCategoryById(b.categoryId);
      const spent = mTx.filter(t => t.categoryId === b.categoryId).reduce((s, t) => s + Number(t.amount), 0);
      const pct = b.limit > 0 ? Math.min(100, (spent / b.limit) * 100) : 0;
      const cls = pct >= 100 ? 'danger' : pct >= 80 ? 'warn' : '';
      return `<div class="budget-item" data-id="${b.id}">
        <div class="budget-top">
          <div class="budget-name">
            <div class="budget-cat-icon" style="background:${cat ? cat.color : '#94a3b8'}">${cat ? (cat.icon || '•') : '?'}</div>
            ${esc(cat ? cat.name : 'Kategori dihapus')}
          </div>
          <div class="budget-amount">${fmtMoney(spent)} / ${fmtMoney(b.limit)}</div>
        </div>
        <div class="progress"><div class="progress-bar ${cls}" style="width:${pct}%"></div></div>
      </div>`;
    }).join('');
    $$('.budget-item', el).forEach(node => {
      node.addEventListener('click', () => openBudgetModal(node.dataset.id));
    });
  }

  // ============ RENDER: GOALS ============
  function renderGoals() {
    const el = $('#goalList');
    if (!state.goals.length) {
      el.innerHTML = `<div class="empty">Belum ada target tabungan.</div>`;
      return;
    }
    el.innerHTML = state.goals.map(g => {
      const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
      const cls = pct >= 100 ? 'danger' : '';
      const deadline = g.deadline ? `Tenggat: ${fmtDate(g.deadline)}` : 'Tanpa tenggat';
      return `<div class="goal-item" data-id="${g.id}">
        <div class="goal-name">⭐ ${esc(g.name)}</div>
        <div class="goal-deadline">${deadline}</div>
        <div class="goal-amounts">
          <span>Terkumpul: <strong>${fmtMoney(g.saved)}</strong></span>
          <span>Target: <strong>${fmtMoney(g.target)}</strong></span>
        </div>
        <div class="progress"><div class="progress-bar ${cls}" style="width:${pct}%;background:${pct>=100?'#22c55e':'#6366f1'}"></div></div>
        <div class="panel-sub" style="margin-top:8px">${Math.round(pct)}% tercapai</div>
      </div>`;
    }).join('');
    $$('.goal-item', el).forEach(node => {
      node.addEventListener('click', () => openGoalModal(node.dataset.id));
    });
  }

  // ============ RENDER ALL ============
  function renderAll() {
    renderDashboard();
    renderTransactions();
    renderCategories();
    renderAccounts();
    renderBudgets();
    renderGoals();
  }

  // ============ CHARTS (Canvas) ============
  function drawPie(canvas, data) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.width, H = canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2, cy = H / 2, r = Math.min(W, H) / 2 - 10;
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) {
      ctx.fillStyle = getCssVar('--text-muted');
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Belum ada pengeluaran bulan ini', cx, cy);
      return;
    }
    let a0 = -Math.PI / 2;
    for (const d of data) {
      const a1 = a0 + (d.value / total) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      ctx.fillStyle = d.color;
      ctx.fill();
      a0 = a1;
    }
    // donut hole
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = getCssVar('--surface');
    ctx.fill();
    // center total
    ctx.fillStyle = getCssVar('--text');
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fmtMoney(total), cx, cy);
  }

  function renderLegend(el, data) {
    const total = data.reduce((s, d) => s + d.value, 0);
    if (total === 0) { el.innerHTML = ''; return; }
    el.innerHTML = data.map(d => {
      const pct = Math.round((d.value / total) * 100);
      return `<div class="legend-item"><span class="dot" style="background:${d.color}"></span>${esc(d.label)} · ${pct}%</div>`;
    }).join('');
  }

  function drawBars(canvas, data) {
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    const padL = 50, padR = 10, padT = 10, padB = 30;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const max = Math.max(1, ...data.flatMap(d => [d.income, d.expense]));
    const groupW = chartW / data.length;
    const barW = Math.min(18, (groupW - 10) / 2);

    // grid + y-axis labels
    ctx.strokeStyle = getCssVar('--border');
    ctx.fillStyle = getCssVar('--text-muted');
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let i = 0; i <= 4; i++) {
      const y = padT + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(W - padR, y);
      ctx.stroke();
      const val = max * (1 - i / 4);
      ctx.fillText(shortNum(val), padL - 6, y);
    }

    ctx.textAlign = 'center';
    data.forEach((d, i) => {
      const gx = padL + groupW * i + groupW / 2;
      const incH = (d.income / max) * chartH;
      const expH = (d.expense / max) * chartH;
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(gx - barW - 1, padT + chartH - incH, barW, incH);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(gx + 1, padT + chartH - expH, barW, expH);
      ctx.fillStyle = getCssVar('--text-muted');
      ctx.fillText(d.label, gx, H - padB + 14);
    });
  }

  function shortNum(n) {
    const abs = Math.abs(n);
    if (abs >= 1e9) return (n / 1e9).toFixed(1) + 'M';
    if (abs >= 1e6) return (n / 1e6).toFixed(1) + 'jt';
    if (abs >= 1e3) return (n / 1e3).toFixed(0) + 'rb';
    return String(Math.round(n));
  }

  function getCssVar(name) {
    return getComputedStyle(document.body).getPropertyValue(name).trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  // ============ MODAL HELPERS ============
  function openModal(id) { $('#' + id).classList.add('open'); }
  function closeModal(id) { $('#' + id).classList.remove('open'); }

  // ============ TRANSACTION MODAL ============
  function openTxModal(txId = null) {
    const form = $('#txForm');
    form.reset();
    $('#txId').value = '';
    $('#txDeleteBtn').style.display = 'none';

    let tx = null;
    if (txId) tx = state.transactions.find(t => t.id === txId);

    const type = tx ? tx.type : 'expense';
    setTxType(type);
    $('#txDate').value = tx ? tx.date : todayISO();

    if (tx) {
      $('#txModalTitle').textContent = 'Edit Transaksi';
      $('#txId').value = tx.id;
      $('#txAmount').value = tx.amount;
      $('#txNote').value = tx.note || '';
      $('#txAccount').value = tx.accountId || '';
      $('#txCategory').value = tx.categoryId || '';
      if (tx.accountToId) $('#txAccountTo').value = tx.accountToId;
      $('#txDeleteBtn').style.display = '';
    } else {
      $('#txModalTitle').textContent = 'Tambah Transaksi';
    }

    openModal('txModal');
    $('#txAmount').focus();
  }

  function setTxType(type) {
    $('#txType').value = type;
    $$('#txModal .tab').forEach(b => b.classList.toggle('active', b.dataset.txType === type));

    // populate categories by type
    const catSel = $('#txCategory');
    const cats = state.categories.filter(c => c.type === type);
    catSel.innerHTML = cats.map(c => `<option value="${c.id}">${c.icon || ''} ${esc(c.name)}</option>`).join('')
      || '<option value="">(tidak ada kategori)</option>';

    // populate accounts
    const accOpts = state.accounts.map(a => `<option value="${a.id}">${a.icon || ''} ${esc(a.name)}</option>`).join('')
      || '<option value="">(tidak ada akun)</option>';
    $('#txAccount').innerHTML = accOpts;
    $('#txAccountTo').innerHTML = accOpts;

    // transfer: hide category, show accountTo
    const isTransfer = type === 'transfer';
    $('#txCategoryWrap').style.display = isTransfer ? 'none' : '';
    $('#txAccountToWrap').style.display = isTransfer ? '' : 'none';
    $('#txCategory').required = !isTransfer;
  }

  $$('#txModal .tab').forEach(tab => {
    tab.addEventListener('click', () => setTxType(tab.dataset.txType));
  });

  $('#txForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#txId').value || uid();
    const type = $('#txType').value;
    const amount = Math.abs(Number($('#txAmount').value));
    const date = $('#txDate').value || todayISO();
    const note = $('#txNote').value.trim();
    const accountId = $('#txAccount').value;
    const accountToId = $('#txAccountTo').value;
    const categoryId = $('#txCategory').value;

    if (!amount || amount <= 0) return toast('Jumlah tidak valid');
    if (!accountId) return toast('Pilih akun');
    if (type === 'transfer') {
      if (!accountToId) return toast('Pilih akun tujuan');
      if (accountId === accountToId) return toast('Akun asal & tujuan sama');
    } else if (!categoryId) {
      return toast('Pilih kategori');
    }

    const tx = {
      id,
      type,
      amount,
      date,
      note,
      accountId,
      accountToId: type === 'transfer' ? accountToId : null,
      categoryId: type === 'transfer' ? null : categoryId,
    };

    const idx = state.transactions.findIndex(t => t.id === id);
    if (idx >= 0) state.transactions[idx] = tx;
    else state.transactions.push(tx);

    saveState();
    closeModal('txModal');
    renderAll();
    toast(idx >= 0 ? 'Transaksi diperbarui' : 'Transaksi ditambahkan');
  });

  $('#txDeleteBtn').addEventListener('click', () => {
    const id = $('#txId').value;
    if (!id) return;
    if (!confirmAction('Hapus transaksi ini?')) return;
    state.transactions = state.transactions.filter(t => t.id !== id);
    saveState();
    closeModal('txModal');
    renderAll();
    toast('Transaksi dihapus');
  });

  // ============ CATEGORY MODAL ============
  function openCatModal(catId = null) {
    const form = $('#catForm');
    form.reset();
    $('#catId').value = '';
    $('#catDeleteBtn').style.display = 'none';
    $('#catColor').value = '#6366f1';

    if (catId) {
      const c = state.categories.find(x => x.id === catId);
      if (!c) return;
      $('#catModalTitle').textContent = 'Edit Kategori';
      $('#catId').value = c.id;
      $('#catName').value = c.name;
      $('#catType').value = c.type;
      $('#catIcon').value = c.icon || '';
      $('#catColor').value = c.color || '#6366f1';
      $('#catDeleteBtn').style.display = '';
    } else {
      $('#catModalTitle').textContent = 'Tambah Kategori';
    }
    openModal('catModal');
    $('#catName').focus();
  }

  $('#catForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#catId').value || uid();
    const cat = {
      id,
      name: $('#catName').value.trim(),
      type: $('#catType').value,
      icon: $('#catIcon').value.trim() || '•',
      color: $('#catColor').value,
    };
    if (!cat.name) return toast('Nama wajib diisi');
    const idx = state.categories.findIndex(c => c.id === id);
    if (idx >= 0) state.categories[idx] = cat;
    else state.categories.push(cat);
    saveState();
    closeModal('catModal');
    renderAll();
    toast(idx >= 0 ? 'Kategori diperbarui' : 'Kategori ditambahkan');
  });

  $('#catDeleteBtn').addEventListener('click', () => {
    const id = $('#catId').value;
    if (!id) return;
    const used = state.transactions.some(t => t.categoryId === id);
    if (used && !confirmAction('Kategori ini digunakan oleh beberapa transaksi. Tetap hapus? (transaksi akan kehilangan kategori)')) return;
    if (!used && !confirmAction('Hapus kategori ini?')) return;
    state.categories = state.categories.filter(c => c.id !== id);
    state.budgets = state.budgets.filter(b => b.categoryId !== id);
    saveState();
    closeModal('catModal');
    renderAll();
    toast('Kategori dihapus');
  });

  // ============ ACCOUNT MODAL ============
  function openAccModal(accId = null) {
    const form = $('#accForm');
    form.reset();
    $('#accId').value = '';
    $('#accDeleteBtn').style.display = 'none';
    $('#accColor').value = '#0ea5e9';
    $('#accInitial').value = 0;

    if (accId) {
      const a = state.accounts.find(x => x.id === accId);
      if (!a) return;
      $('#accModalTitle').textContent = 'Edit Akun';
      $('#accId').value = a.id;
      $('#accName').value = a.name;
      $('#accInitial').value = a.initial || 0;
      $('#accIcon').value = a.icon || '';
      $('#accColor').value = a.color || '#0ea5e9';
      $('#accDeleteBtn').style.display = '';
    } else {
      $('#accModalTitle').textContent = 'Tambah Akun';
    }
    openModal('accModal');
    $('#accName').focus();
  }

  $('#accForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#accId').value || uid();
    const acc = {
      id,
      name: $('#accName').value.trim(),
      initial: Number($('#accInitial').value) || 0,
      icon: $('#accIcon').value.trim() || '🏦',
      color: $('#accColor').value,
    };
    if (!acc.name) return toast('Nama akun wajib diisi');
    const idx = state.accounts.findIndex(a => a.id === id);
    if (idx >= 0) state.accounts[idx] = acc;
    else state.accounts.push(acc);
    saveState();
    closeModal('accModal');
    renderAll();
    toast(idx >= 0 ? 'Akun diperbarui' : 'Akun ditambahkan');
  });

  $('#accDeleteBtn').addEventListener('click', () => {
    const id = $('#accId').value;
    if (!id) return;
    const used = state.transactions.some(t => t.accountId === id || t.accountToId === id);
    if (used) return toast('Akun tidak bisa dihapus: masih dipakai transaksi');
    if (!confirmAction('Hapus akun ini?')) return;
    state.accounts = state.accounts.filter(a => a.id !== id);
    saveState();
    closeModal('accModal');
    renderAll();
    toast('Akun dihapus');
  });

  // ============ BUDGET MODAL ============
  function openBudgetModal(budgetId = null) {
    const form = $('#budgetForm');
    form.reset();
    $('#budgetId').value = '';
    $('#budgetDeleteBtn').style.display = 'none';

    const cats = state.categories.filter(c => c.type === 'expense');
    $('#budgetCategory').innerHTML = cats.map(c => `<option value="${c.id}">${c.icon || ''} ${esc(c.name)}</option>`).join('')
      || '<option value="">(tidak ada kategori pengeluaran)</option>';

    if (budgetId) {
      const b = state.budgets.find(x => x.id === budgetId);
      if (!b) return;
      $('#budgetModalTitle').textContent = 'Edit Budget';
      $('#budgetId').value = b.id;
      $('#budgetCategory').value = b.categoryId;
      $('#budgetLimit').value = b.limit;
      $('#budgetDeleteBtn').style.display = '';
    } else {
      $('#budgetModalTitle').textContent = 'Tambah Budget';
    }
    openModal('budgetModal');
  }

  $('#budgetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#budgetId').value || uid();
    const categoryId = $('#budgetCategory').value;
    const limit = Number($('#budgetLimit').value);
    if (!categoryId) return toast('Pilih kategori');
    if (!limit || limit <= 0) return toast('Batas harus > 0');

    // prevent duplicate budget for same category
    const existing = state.budgets.find(b => b.categoryId === categoryId && b.id !== id);
    if (existing) return toast('Sudah ada budget untuk kategori ini');

    const budget = { id, categoryId, limit };
    const idx = state.budgets.findIndex(b => b.id === id);
    if (idx >= 0) state.budgets[idx] = budget;
    else state.budgets.push(budget);
    saveState();
    closeModal('budgetModal');
    renderAll();
    toast(idx >= 0 ? 'Budget diperbarui' : 'Budget ditambahkan');
  });

  $('#budgetDeleteBtn').addEventListener('click', () => {
    const id = $('#budgetId').value;
    if (!id) return;
    if (!confirmAction('Hapus budget ini?')) return;
    state.budgets = state.budgets.filter(b => b.id !== id);
    saveState();
    closeModal('budgetModal');
    renderAll();
    toast('Budget dihapus');
  });

  // ============ GOAL MODAL ============
  function openGoalModal(goalId = null) {
    const form = $('#goalForm');
    form.reset();
    $('#goalId').value = '';
    $('#goalDeleteBtn').style.display = 'none';
    $('#goalSaved').value = 0;

    if (goalId) {
      const g = state.goals.find(x => x.id === goalId);
      if (!g) return;
      $('#goalModalTitle').textContent = 'Edit Target';
      $('#goalId').value = g.id;
      $('#goalName').value = g.name;
      $('#goalTarget').value = g.target;
      $('#goalSaved').value = g.saved || 0;
      $('#goalDeadline').value = g.deadline || '';
      $('#goalDeleteBtn').style.display = '';
    } else {
      $('#goalModalTitle').textContent = 'Tambah Target';
    }
    openModal('goalModal');
    $('#goalName').focus();
  }

  $('#goalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = $('#goalId').value || uid();
    const goal = {
      id,
      name: $('#goalName').value.trim(),
      target: Number($('#goalTarget').value) || 0,
      saved: Number($('#goalSaved').value) || 0,
      deadline: $('#goalDeadline').value || null,
    };
    if (!goal.name) return toast('Nama target wajib diisi');
    if (goal.target <= 0) return toast('Target harus > 0');
    const idx = state.goals.findIndex(g => g.id === id);
    if (idx >= 0) state.goals[idx] = goal;
    else state.goals.push(goal);
    saveState();
    closeModal('goalModal');
    renderAll();
    toast(idx >= 0 ? 'Target diperbarui' : 'Target ditambahkan');
  });

  $('#goalDeleteBtn').addEventListener('click', () => {
    const id = $('#goalId').value;
    if (!id) return;
    if (!confirmAction('Hapus target ini?')) return;
    state.goals = state.goals.filter(g => g.id !== id);
    saveState();
    closeModal('goalModal');
    renderAll();
    toast('Target dihapus');
  });

  // ============ IMPORT / EXPORT ============
  function download(filename, content, type = 'application/json') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  $('#exportJsonBtn').addEventListener('click', () => {
    download(`moneytrack-${todayISO()}.json`, JSON.stringify(state, null, 2));
    toast('Export JSON berhasil');
  });

  $('#exportCsvBtn').addEventListener('click', () => {
    const headers = ['Tanggal', 'Tipe', 'Jumlah', 'Kategori', 'Akun', 'Akun Tujuan', 'Catatan'];
    const rows = state.transactions.map(t => {
      const cat = getCategoryById(t.categoryId);
      const acc = getAccountById(t.accountId);
      const accTo = getAccountById(t.accountToId);
      return [
        t.date,
        t.type,
        t.amount,
        cat ? cat.name : '',
        acc ? acc.name : '',
        accTo ? accTo.name : '',
        (t.note || '').replace(/"/g, '""'),
      ];
    });
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    download(`moneytrack-transaksi-${todayISO()}.csv`, csv, 'text/csv');
    toast('Export CSV berhasil');
  });

  $('#importJsonInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirmAction('Import akan menimpa semua data saat ini. Lanjutkan?')) {
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state = { ...defaultState(), ...data };
        saveState();
        applyTheme();
        renderAll();
        toast('Import berhasil');
      } catch (err) {
        toast('File tidak valid');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  });

  $('#resetAllBtn').addEventListener('click', () => {
    if (!confirmAction('Yakin mau reset SEMUA data? Tindakan ini tidak bisa dibatalkan.')) return;
    state = defaultState();
    saveState();
    renderAll();
    toast('Semua data direset');
  });

  $('#currencySelect').addEventListener('change', (e) => {
    state.currency = e.target.value;
    saveState();
    renderAll();
  });

  // ============ THEME ============
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    $('#themeToggle').textContent = state.theme === 'dark' ? '☀️' : '🌙';
  }

  $('#themeToggle').addEventListener('click', () => {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    saveState();
    applyTheme();
    renderAll();
  });

  // ============ EVENT BINDINGS ============
  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });
  $$('[data-view]').forEach(btn => {
    if (btn.classList.contains('nav-item')) return;
    btn.addEventListener('click', () => setView(btn.dataset.view));
  });

  $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

  $('#addTxBtn').addEventListener('click', () => openTxModal());
  $('#addCatBtn').addEventListener('click', () => openCatModal());
  $('#addAccBtn').addEventListener('click', () => openAccModal());
  $('#addBudgetBtn').addEventListener('click', () => openBudgetModal());
  $('#addGoalBtn').addEventListener('click', () => openGoalModal());

  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) modal.classList.remove('open');
    });
  });
  $$('.modal').forEach(m => {
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.remove('open'); });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') $$('.modal.open').forEach(m => m.classList.remove('open'));
  });

  // filters
  ['txSearch', 'txTypeFilter', 'txCategoryFilter', 'txAccountFilter', 'txMonthFilter'].forEach(id => {
    $('#' + id).addEventListener('input', renderTransactions);
    $('#' + id).addEventListener('change', renderTransactions);
  });
  $('#clearFilters').addEventListener('click', () => {
    ['txSearch', 'txTypeFilter', 'txCategoryFilter', 'txAccountFilter', 'txMonthFilter'].forEach(id => {
      $('#' + id).value = '';
    });
    renderTransactions();
  });

  // ============ INIT ============
  applyTheme();
  $('#currencySelect').value = state.currency;
  renderAll();
  setView('dashboard');
})();
