// Si ya tienes API, reemplaza el mock dentro de cargarDatos() y elimina esta importación
import { empleadosMock, currentUserName } from './empleados.mock.js';

const state = { all: [], filtered: [], page: 1, pageSize: 10 };

const el = {
  empresa: document.getElementById('f-empresa'),
  cargo: document.getElementById('f-cargo'),
  btnBuscar: document.getElementById('btn-buscar'),
  btnLimpiar: document.getElementById('btn-limpiar'),
  tbody: document.querySelector('#tabla-empleados tbody'),
  contador: document.getElementById('contador'),
  paginacion: document.getElementById('paginacion'),
  btnImprimir: document.getElementById('btn-imprimir'),
  btnExportar: document.getElementById('btn-exportar'),
  btnVolver: document.getElementById('btn-volver'),
  userName: document.getElementById('user-name')
};

// ===== Datos =====
async function cargarDatos() {
  // --- Con backend ---
  // const res = await fetch('/api/empleados'); // ajusta ruta
  // state.all = await res.json();

  // --- Mock local (quítalo al conectar tu API) ---
  state.all = empleadosMock;
  el.userName.textContent = currentUserName || '[Nombre]';

  poblarFiltros(state.all);
  aplicarFiltros();
}

function poblarFiltros(data) {
  const empresas = Array.from(new Set(data.map(e => e.empresa))).sort();
  const cargos = Array.from(new Set(data.map(e => e.cargo))).sort();
  for (const emp of empresas) {
    const o = document.createElement('option'); o.value = emp; o.textContent = emp;
    el.empresa.appendChild(o);
  }
  for (const c of cargos) {
    const o = document.createElement('option'); o.value = c; o.textContent = c;
    el.cargo.appendChild(o);
  }
}

// ===== Filtros & render =====
function aplicarFiltros() {
  const fEmp = el.empresa.value;
  const fCar = el.cargo.value;
  state.page = 1;
  state.filtered = state.all.filter(e =>
    (fEmp === '__all__' || e.empresa === fEmp) &&
    (fCar === '__all__' || e.cargo === fCar)
  );
  render();
}

function limpiarFiltros() {
  el.empresa.value = '__all__';
  el.cargo.value = '__all__';
  aplicarFiltros();
}

function render() { renderTabla(); renderContador(); renderPaginacion(); }

function renderTabla() {
  const start = (state.page - 1) * state.pageSize;
  const rows = state.filtered.slice(start, start + state.pageSize);
  el.tbody.innerHTML = '';
  for (const e of rows) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${e.nombre}</td><td>${e.empresa}</td><td>${e.cargo}</td>`;
    el.tbody.appendChild(tr);
  }
}

function renderContador() {
  el.contador.textContent = `Mostrando ${state.filtered.length} de ${state.all.length} empleados`;
}

function renderPaginacion() {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / state.pageSize));
  state.page = Math.min(state.page, totalPages);

  const mk = (label, p, disabled=false, active=false) => {
    const b = document.createElement('button');
    b.textContent = label;
    if (disabled) b.disabled = true;
    if (active) b.classList.add('is-active');
    b.addEventListener('click', () => { state.page = p; render(); });
    return b;
  };

  const page = state.page;
  el.paginacion.innerHTML = '';
  el.paginacion.appendChild(mk('Anterior', Math.max(1, page - 1), page === 1));

  const range = getRange(page, totalPages, 7);
  for (const p of range) el.paginacion.appendChild(mk(String(p), p, false, p === page));

  el.paginacion.appendChild(mk('Siguiente', Math.min(totalPages, page + 1), page === totalPages));
}

function getRange(current, total, max=7) {
  let start = Math.max(1, current - Math.floor(max/2));
  let end = start + max - 1;
  if (end > total) { end = total; start = Math.max(1, end - max + 1); }
  return Array.from({length: end - start + 1}, (_, i) => start + i);
}

// ===== Acciones =====
function imprimirLista() { window.print(); }

function exportarExcelCSV() {
  const rows = [['Empleado','Empresa','Cargo'], ...state.filtered.map(e => [e.nombre, e.empresa, e.cargo])];
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'empleados.csv'; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function volverAlPanel() {
  // Si tu panel principal es index.html en la raíz:
  window.location.href = '../index.html';
  // Cambia la ruta si quieres volver a un "Formulario 7" específico.
}

// Eventos
el.btnBuscar.addEventListener('click', aplicarFiltros);
el.btnLimpiar.addEventListener('click', limpiarFiltros);
el.btnImprimir.addEventListener('click', imprimirLista);
el.btnExportar.addEventListener('click', exportarExcelCSV);
el.btnVolver.addEventListener('click', volverAlPanel);

// Init
cargarDatos();
