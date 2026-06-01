/**
 * Mis Gastos — PWA
 * Arquitectura: Repository pattern + Event-driven UI
 * Persistencia: localStorage (100% offline)
 *
 * Modelo de datos (MonthData):
 *   {
 *     monthKey: "2025-06",
 *     salary: number,
 *     fixed:    [ { id, name, icon, color, amount, active } ],   // se copian de mes a mes
 *     variable: [ { id, name, icon, color, amount, active } ],   // se copian, active heredado del mes previo
 *   }
 *
 *   `active` indica si el gasto se incluye en el total de ESE mes.
 *   Tanto fijos como variables se pueden crear, editar, alternar (incluir/omitir) y eliminar.
 */

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
];

// Defaults que se siembran SOLO la primera vez que se usa la app.
const FIXED_EXPENSES_DEFAULTS = [
  { id: 'alquiler',  name: 'Alquiler',                        icon: '🏠', color: '#7c6af7' },
  { id: 'internet',  name: 'Personal (internet + telefonía)', icon: '📡', color: '#34d399' },
  { id: 'expensas',  name: 'Expensas',                        icon: '🏢', color: '#60a5fa' },
  { id: 'luz',       name: 'Luz',                             icon: '💡', color: '#fbbf24' },
  { id: 'seguro',    name: 'Seguro',                          icon: '🛡️', color: '#f472b6' },
  { id: 'tel_hugo',  name: 'Telefonía Hugo',                  icon: '📱', color: '#a78bfa' },
  { id: 'tel_elba',  name: 'Telefonía Elba',                  icon: '📱', color: '#c084fc' },
  { id: 'tarjeta',   name: 'Tarjeta de crédito',              icon: '💳', color: '#fb923c' },
];

const VARIABLE_EXPENSES_DEFAULTS = [
  { id: 'nafta', name: 'Nafta', icon: '⛽', color: '#f87171' },
];

const VARIABLE_COLORS = ['#f87171','#fb923c','#fbbf24','#34d399','#60a5fa','#a78bfa','#f472b6','#c084fc'];
const FIXED_COLORS = ['#7c6af7','#34d399','#60a5fa','#fbbf24','#f472b6','#a78bfa','#c084fc','#fb923c'];

const STORAGE_PREFIX = 'mg_';
const SETTINGS_KEY = STORAGE_PREFIX + 'settings';

// ── Storage Repository ────────────────────────────────────────────────────────

const Repository = {
  _key(monthKey) { return STORAGE_PREFIX + 'month_' + monthKey; },

  getMonth(monthKey) {
    try {
      const raw = localStorage.getItem(this._key(monthKey));
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  saveMonth(monthKey, data) {
    try { localStorage.setItem(this._key(monthKey), JSON.stringify(data)); }
    catch (e) { console.error('Error saving data:', e); }
  },

  getAllMonthKeys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(STORAGE_PREFIX + 'month_'))
      .map(k => k.replace(STORAGE_PREFIX + 'month_', ''))
      .sort((a, b) => b.localeCompare(a));
  },

  getSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { salaryHidden: false };
    } catch { return { salaryHidden: false }; }
  },

  saveSettings(settings) {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
    catch (e) { console.error('Error saving settings:', e); }
  },
};

// ── Month Data Factory ────────────────────────────────────────────────────────

/**
 * Crea la estructura de un mes.
 *   - Gastos FIJOS: se arrastran del mes previo (carry-forward) con su monto,
 *     para que solo ajustes las variaciones de precio.
 *   - Gastos VARIABLES: NO se arrastran. Cada mes arranca vacío y se cargan
 *     solo los que efectivamente existieron ese mes.
 */
function createMonthData(monthKey, prevMonthKey) {
  const prev = prevMonthKey ? Repository.getMonth(prevMonthKey) : null;
  let fixed, variable, salary;

  if (prev) {
    fixed = (prev.fixed || []).map(e => ({ ...e }));   // se copian
    variable = [];                                      // arrancan de cero
    salary = prev.salary ?? 0;
  } else {
    fixed = FIXED_EXPENSES_DEFAULTS.map(def => ({ ...def, amount: 0, active: true }));
    variable = [];
    salary = 0;
  }

  return { monthKey, salary, fixed, variable };
}

function getOrCreateMonthData(monthKey) {
  let data = Repository.getMonth(monthKey);
  if (data) {
    const migrated = migrateMonthData(data);
    Repository.saveMonth(monthKey, migrated);
    return migrated;
  }

  const keys = Repository.getAllMonthKeys();
  const prevKey = keys.find(k => k < monthKey) ?? null;
  return createMonthData(monthKey, prevKey);
}

/** Compatibilidad hacia atrás con estructuras anteriores. */
function migrateMonthData(data) {
  if (!Array.isArray(data.fixed)) data.fixed = [];
  if (!Array.isArray(data.variable)) data.variable = [];

  // El formato viejo tenía "extra" sin campo `active` (todos incluidos por defecto).
  // Al migrar, se preserva active:true para no excluir gastos que el usuario ya había cargado.
  if (Array.isArray(data.extra) && data.extra.length) {
    data.extra.forEach(ex => {
      data.variable.push({
        id: ex.id || ('var_' + Date.now() + '_' + Math.random().toString(36).slice(2,6)),
        name: ex.name,
        icon: ex.icon || '📝',
        color: ex.color || '#f87171',
        amount: ex.amount || 0,
        active: ex.active ?? true,
      });
    });
  }
  delete data.extra;

  // Fallbacks para registros sin campo `active` guardados antes de esta versión.
  data.fixed.forEach(e => { if (e.active === undefined) e.active = true; });
  // Variables sin `active`: se excluyen por defecto — en meses nuevos arrancan vacíos.
  data.variable.forEach(e => { if (e.active === undefined) e.active = false; });

  return data;
}

// ── Formatters ────────────────────────────────────────────────────────────────

const fmt = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0,
});
const fmtCompact = new Intl.NumberFormat('es-AR', {
  style: 'currency', currency: 'ARS', notation: 'compact', maximumFractionDigits: 1,
});

function formatARS(amount) { return fmt.format(amount); }
function formatPercent(value, total) {
  if (!total) return '0%';
  return Math.round((value / total) * 100) + '%';
}

// ── Application State ─────────────────────────────────────────────────────────

const State = {
  currentYear: new Date().getFullYear(),
  currentMonth: new Date().getMonth(),
  monthData: null,
  chartType: 'donut',
  chart: null,
  settings: { salaryHidden: false },

  get monthKey() {
    const m = String(this.currentMonth + 1).padStart(2, '0');
    return this.currentYear + '-' + m;
  },
  get monthLabel() {
    return MONTH_NAMES[this.currentMonth] + ' ' + this.currentYear;
  },
};

// ── Computed ──────────────────────────────────────────────────────────────────

function sumActive(list) {
  return list.filter(e => e.active).reduce((s, e) => s + (e.amount || 0), 0);
}

function computeTotals(data) {
  const fixedTotal = sumActive(data.fixed);
  const variableTotal = sumActive(data.variable);
  const totalExpenses = fixedTotal + variableTotal;
  const available = (data.salary || 0) - totalExpenses;
  const savingsPercent = formatPercent(Math.max(0, available), data.salary || 0);
  const spentPercent = formatPercent(Math.min(totalExpenses, data.salary || 0), data.salary || 0);
  return { fixedTotal, variableTotal, totalExpenses, available, savingsPercent, spentPercent };
}

// ── Chart ─────────────────────────────────────────────────────────────────────

function buildChartData(data) {
  const items = [
    ...data.fixed.filter(e => e.active && e.amount > 0),
    ...data.variable.filter(e => e.active && e.amount > 0),
  ];
  return {
    labels: items.map(e => e.name),
    amounts: items.map(e => e.amount),
    colors: items.map(e => e.color || '#7c6af7'),
  };
}

function buildChartConfig(type, labels, amounts, colors) {
  if (type === 'donut') {
    return {
      type: 'doughnut',
      data: { labels, datasets: [{ data: amounts, backgroundColor: colors, borderWidth: 2, borderColor: '#1a1a2e', hoverOffset: 6 }] },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { color: '#9999bb', font: { family: 'DM Sans', size: 11 }, boxWidth: 12, padding: 10 } },
          tooltip: { callbacks: { label: ctx => ' ' + formatARS(ctx.parsed) } },
        },
      },
    };
  }
  return {
    type: 'bar',
    data: { labels, datasets: [{ data: amounts, backgroundColor: colors, borderRadius: 6, borderSkipped: false }] },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ' ' + formatARS(ctx.parsed.x) } },
      },
      scales: {
        x: { ticks: { color: '#9999bb', font: { family: 'DM Mono', size: 10 }, callback: v => fmtCompact.format(v) }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: '#9999bb', font: { family: 'DM Sans', size: 10 } }, grid: { display: false } },
      },
    },
  };
}

function renderChart() {
  const { labels, amounts, colors } = buildChartData(State.monthData);
  const canvas = document.getElementById('expenseChart');
  const empty = document.getElementById('chartEmpty');

  if (amounts.length === 0) {
    canvas.classList.add('hidden');
    empty.classList.remove('hidden');
    if (State.chart) { State.chart.destroy(); State.chart = null; }
    return;
  }

  canvas.classList.remove('hidden');
  empty.classList.add('hidden');

  const neededType = State.chartType === 'donut' ? 'doughnut' : 'bar';

  // Reuse existing chart instance when type matches to avoid flicker on data updates.
  if (State.chart && State.chart.config.type === neededType) {
    State.chart.data.labels = labels;
    State.chart.data.datasets[0].data = amounts;
    State.chart.data.datasets[0].backgroundColor = colors;
    State.chart.update('none');
    return;
  }

  if (State.chart) State.chart.destroy();
  State.chart = new Chart(canvas, buildChartConfig(State.chartType, labels, amounts, colors));
}

// ── UI Rendering ──────────────────────────────────────────────────────────────

function renderAll() {
  const data = State.monthData;
  const totals = computeTotals(data);

  document.getElementById('monthLabel').textContent = State.monthLabel;

  renderSalary(data.salary || 0);
  document.getElementById('summaryExpenses').textContent = formatARS(totals.totalExpenses);

  const availableEl = document.getElementById('summaryAvailable');
  availableEl.textContent = formatARS(totals.available);
  availableEl.className = 'card-amount ' + (totals.available < 0 ? 'danger' : 'success');
  document.getElementById('summarySavings').textContent = totals.savingsPercent;
  document.getElementById('summarySpent').textContent = totals.spentPercent;

  document.getElementById('fixedTotal').textContent = formatARS(totals.fixedTotal);
  document.getElementById('variableTotal').textContent = formatARS(totals.variableTotal);

  renderExpenseList('fixedList', data.fixed, 'fixed');
  renderExpenseList('variableList', data.variable, 'variable');

  renderChart();
}

function renderSalary(amount) {
  const el = document.getElementById('summaryIncome');
  const btn = document.getElementById('toggleSalaryBtn');
  if (State.settings.salaryHidden) {
    el.textContent = '• • • • •';
    btn.textContent = '🙈';
    btn.classList.add('muted');
  } else {
    el.textContent = formatARS(amount);
    btn.textContent = '👁';
    btn.classList.remove('muted');
  }
}

/** Render para fijos y variables (mismo comportamiento: editar / incluir / eliminar). */
function renderExpenseList(listId, items, type) {
  const ul = document.getElementById(listId);
  ul.innerHTML = '';

  if (items.length === 0) {
    ul.innerHTML = '<li class="empty-state">Sin gastos cargados</li>';
    return;
  }

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = 'expense-item' + (item.active ? '' : ' inactive');
    li.dataset.id = item.id;
    li.dataset.type = type;

    const inactiveBadge = !item.active ? '<span class="exp-badge-inactive">omitido</span>' : '';
    li.innerHTML =
      '<div class="exp-icon" style="background:' + item.color + '22">' + item.icon + '</div>' +
      '<span class="exp-name">' + escapeHtml(item.name) + inactiveBadge + '</span>' +
      '<span class="exp-amount">' + (item.amount ? formatARS(item.amount) : '—') + '</span>';
    li.addEventListener('click', () => openExpenseModal(item, type));
    ul.appendChild(li);
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Settings ──────────────────────────────────────────────────────────────────

function openSettingsModal() {
  document.getElementById('settingsSalaryHidden').checked = State.settings.salaryHidden;
  showModal('settingsModal');
}

// ── Salary ────────────────────────────────────────────────────────────────────

function openSalaryModal() {
  document.getElementById('salaryMonthLabel').textContent = State.monthLabel;
  document.getElementById('salaryInput').value = State.monthData.salary || '';
  showModal('salaryModal');
}

function saveSalary() {
  const val = parseFloat(document.getElementById('salaryInput').value) || 0;
  State.monthData.salary = val;
  persistAndRender();
  closeModal('salaryModal');
}

function toggleSalaryVisibility() {
  State.settings.salaryHidden = !State.settings.salaryHidden;
  Repository.saveSettings(State.settings);
  renderSalary(State.monthData.salary || 0);
}

// ── Expense Modal (fijos + variables: crear / editar / eliminar) ──────────────

let _editingExpense = null;   // null => crear nuevo
let _editingType = null;      // 'fixed' | 'variable'

function openExpenseModal(item, type) {
  _editingExpense = item;
  _editingType = type;

  document.getElementById('expenseModalTitle').textContent = item.name;
  document.getElementById('expenseNameInput').classList.add('hidden');
  document.getElementById('expenseAmountInput').value = item.amount || '';

  document.getElementById('expenseActiveRow').classList.remove('hidden');
  document.getElementById('expenseActiveToggle').checked = item.active;

  document.getElementById('deleteExpenseBtn').classList.remove('hidden');

  showModal('expenseModal');
}

function openAddExpenseModal(type) {
  _editingExpense = null;
  _editingType = type;

  document.getElementById('expenseModalTitle').textContent =
    type === 'fixed' ? 'Nuevo gasto fijo' : 'Nuevo gasto variable';

  document.getElementById('expenseNameInput').classList.remove('hidden');
  document.getElementById('expenseNameInput').value = '';
  document.getElementById('expenseAmountInput').value = '';

  document.getElementById('expenseActiveRow').classList.remove('hidden');
  document.getElementById('expenseActiveToggle').checked = true;

  document.getElementById('deleteExpenseBtn').classList.add('hidden');

  showModal('expenseModal');
}

function saveExpense() {
  const amount = parseFloat(document.getElementById('expenseAmountInput').value) || 0;
  const active = document.getElementById('expenseActiveToggle').checked;

  if (_editingExpense) {
    _editingExpense.amount = amount;
    _editingExpense.active = active;
  } else {
    const name = document.getElementById('expenseNameInput').value.trim();
    if (!name) return;

    const list = _editingType === 'fixed' ? State.monthData.fixed : State.monthData.variable;
    const palette = _editingType === 'fixed' ? FIXED_COLORS : VARIABLE_COLORS;
    const icon = _editingType === 'fixed' ? '📌' : '📝';

    list.push({
      id: _editingType + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name, icon,
      color: palette[list.length % palette.length],
      amount, active,
    });
  }

  persistAndRender();
  closeModal('expenseModal');
}

function deleteExpense() {
  if (!_editingExpense) return;
  const key = _editingType === 'fixed' ? 'fixed' : 'variable';
  State.monthData[key] = State.monthData[key].filter(e => e.id !== _editingExpense.id);
  persistAndRender();
  closeModal('expenseModal');
}

// ── Month Picker ──────────────────────────────────────────────────────────────

function openMonthModal() {
  document.getElementById('yearInput').value = State.currentYear;
  const grid = document.getElementById('monthGrid');
  grid.innerHTML = '';
  MONTH_NAMES.forEach((name, idx) => {
    const btn = document.createElement('button');
    btn.className = 'month-btn' + (idx === State.currentMonth ? ' active' : '');
    btn.textContent = name.slice(0, 3);
    btn.dataset.month = idx;
    btn.addEventListener('click', () => {
      grid.querySelectorAll('.month-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
    grid.appendChild(btn);
  });
  showModal('monthModal');
}

function goToSelectedMonth() {
  const year = parseInt(document.getElementById('yearInput').value) || State.currentYear;
  const activeBtn = document.querySelector('#monthGrid .month-btn.active');
  const month = activeBtn ? parseInt(activeBtn.dataset.month) : State.currentMonth;
  navigateToMonth(year, month);
  closeModal('monthModal');
}

// ── Navigation ────────────────────────────────────────────────────────────────

function navigateToMonth(year, month) {
  State.currentYear = year;
  State.currentMonth = month;
  State.monthData = getOrCreateMonthData(State.monthKey);
  renderAll();
}

function prevMonth() {
  let m = State.currentMonth - 1, y = State.currentYear;
  if (m < 0) { m = 11; y--; }
  navigateToMonth(y, m);
}

function nextMonth() {
  let m = State.currentMonth + 1, y = State.currentYear;
  if (m > 11) { m = 0; y++; }
  navigateToMonth(y, m);
}

// ── Persistence ───────────────────────────────────────────────────────────────

function persistAndRender() {
  Repository.saveMonth(State.monthKey, State.monthData);
  renderAll();
}

// ── Modal Helpers ─────────────────────────────────────────────────────────────

function showModal(id) { document.getElementById(id).classList.remove('hidden'); }
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }

// ── Event Wiring ──────────────────────────────────────────────────────────────

function wireEvents() {
  document.getElementById('openSettings').addEventListener('click', openSettingsModal);
  document.getElementById('closeSettingsModal').addEventListener('click', () => closeModal('settingsModal'));
  document.getElementById('settingsSalaryHidden').addEventListener('change', e => {
    State.settings.salaryHidden = e.target.checked;
    Repository.saveSettings(State.settings);
    renderSalary(State.monthData.salary || 0);
  });

  document.getElementById('editSalaryBtn').addEventListener('click', openSalaryModal);
  document.getElementById('toggleSalaryBtn').addEventListener('click', toggleSalaryVisibility);
  document.getElementById('closeSalaryModal').addEventListener('click', () => closeModal('salaryModal'));
  document.getElementById('saveSalaryBtn').addEventListener('click', saveSalary);

  document.getElementById('closeExpenseModal').addEventListener('click', () => closeModal('expenseModal'));
  document.getElementById('saveExpenseBtn').addEventListener('click', saveExpense);
  document.getElementById('deleteExpenseBtn').addEventListener('click', deleteExpense);

  document.getElementById('addFixedBtn').addEventListener('click', () => openAddExpenseModal('fixed'));
  document.getElementById('addVariableBtn').addEventListener('click', () => openAddExpenseModal('variable'));

  document.getElementById('monthDisplay').addEventListener('click', openMonthModal);
  document.getElementById('closeMonthModal').addEventListener('click', () => closeModal('monthModal'));
  document.getElementById('goToMonthBtn').addEventListener('click', goToSelectedMonth);

  document.getElementById('prevMonth').addEventListener('click', prevMonth);
  document.getElementById('nextMonth').addEventListener('click', nextMonth);

  document.querySelectorAll('.toggle-btn[data-chart]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn[data-chart]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.chartType = btn.dataset.chart;
      renderChart();
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.add('hidden');
    });
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!document.getElementById('salaryModal').classList.contains('hidden')) saveSalary();
      else if (!document.getElementById('expenseModal').classList.contains('hidden')) saveExpense();
    }
    if (e.key === 'Escape') {
      ['salaryModal','expenseModal','monthModal','settingsModal'].forEach(closeModal);
    }
  });
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

function init() {
  State.settings = Repository.getSettings();
  wireEvents();
  State.monthData = getOrCreateMonthData(State.monthKey);
  renderAll();

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
