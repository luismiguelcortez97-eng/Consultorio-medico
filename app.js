/**
 * Consultorio Médico CC - Aplicación principal
 * Sistema integral de administración médica
 */
const App = {
  data: {
    pacientes: [],
    citas: [],
    cobros: [],
    servicios: [],
    estudios: [],
    cotizaciones: [],
    gastos: [],
    config: { nombre: 'CONSULTORIO MÉDICO CC', mensaje: '¡Gracias por confiarnos tu salud!' }
  },
  currentMedicoFilter: 'todos',
  currentAgendaFecha: null,

  async init() {
    await DB.init();
    await this.loadAll();
    await this.seedIfEmpty();
    this.bindEvents();
    this.checkAuth();
  },

  async loadAll() {
    this.data.pacientes = await DB.getAll('pacientes');
    this.data.citas = await DB.getAll('citas');
    this.data.cobros = await DB.getAll('cobros');
    this.data.servicios = await DB.getAll('servicios');
    this.data.estudios = await DB.getAll('estudios');
    this.data.cotizaciones = await DB.getAll('cotizaciones');
    this.data.gastos = await DB.getAll('gastos');
    const cfg = await DB.get('config', 'main');
    if (cfg) this.data.config = cfg;
  },

  async seedIfEmpty() {
    if (this.data.servicios.length === 0) {
      const servicios = [
        { id: 'srv1', nombre: 'Consulta médica', precio: 500 },
        { id: 'srv2', nombre: 'Aplicación intramuscular', precio: 100 },
        { id: 'srv3', nombre: 'Lavado de oído', precio: 200 },
        { id: 'srv4', nombre: 'Hidratación endovenosa', precio: 0 },
        { id: 'srv5', nombre: 'Receta médica', precio: 350 },
        { id: 'srv6', nombre: 'Justificante médico', precio: 350 }
      ];
      for (const s of servicios) await DB.put('servicios', s);
      this.data.servicios = servicios;
    }
    if (this.data.estudios.length === 0) {
      const estudios = [
        { id: 'est1', nombre: 'Biometría hemática', precio: 250 },
        { id: 'est2', nombre: 'Química sanguínea 6', precio: 350 },
        { id: 'est3', nombre: 'Examen general de orina', precio: 150 },
        { id: 'est4', nombre: 'Perfil lipídico', precio: 400 },
        { id: 'est5', nombre: 'Glucosa', precio: 80 },
        { id: 'est6', nombre: 'TSH', precio: 350 }
      ];
      for (const e of estudios) await DB.put('estudios', e);
      this.data.estudios = estudios;
    }
  },

  checkAuth() {
    if (sessionStorage.getItem('cc_auth') === '1') {
      this.showApp();
    }
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    this.refreshAll();
  },

  bindEvents() {
    // Login
    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = document.getElementById('login-user').value.trim();
      const p = document.getElementById('login-pass').value;
      if (u === 'admin' && p === 'cc2024') {
        sessionStorage.setItem('cc_auth', '1');
        this.showApp();
      } else {
        this.toast('Usuario o contraseña incorrectos', 'error');
      }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
      sessionStorage.removeItem('cc_auth');
      location.reload();
    });

    // Nav
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
    });

    // Mobile menu
    document.getElementById('btn-menu')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Forms
    document.getElementById('form-paciente').addEventListener('submit', (e) => this.savePaciente(e));
    document.getElementById('form-cita').addEventListener('submit', (e) => this.saveCita(e));
    document.getElementById('form-cobro').addEventListener('submit', (e) => this.saveCobro(e));
    document.getElementById('form-cotizacion').addEventListener('submit', (e) => this.saveCotizacion(e));
    document.getElementById('form-estudio').addEventListener('submit', (e) => this.saveEstudio(e));
    document.getElementById('form-gasto').addEventListener('submit', (e) => this.saveGasto(e));

    // Filters
    document.getElementById('search-pacientes')?.addEventListener('input', () => this.renderPacientes());
    document.getElementById('search-cobros')?.addEventListener('input', () => this.renderCobros());
    document.getElementById('filtro-fecha-cobro')?.addEventListener('change', () => this.renderCobros());
    document.getElementById('agenda-fecha')?.addEventListener('change', () => this.renderAgenda());
    document.getElementById('filtro-estado-cita')?.addEventListener('change', () => this.renderAgenda());
    document.getElementById('filtro-estatus-lab')?.addEventListener('change', () => this.renderLabs());
    document.getElementById('periodo-balance')?.addEventListener('change', () => {
      const p = document.getElementById('periodo-balance').value;
      document.getElementById('rango-personalizado').classList.toggle('hidden', p !== 'personalizado');
      if (p !== 'personalizado') this.calcularBalance();
    });

    // Médico tabs
    document.querySelectorAll('.medico-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.medico-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.currentMedicoFilter = btn.dataset.medico;
        this.renderAgenda();
      });
    });

    // Inner tabs labs
    document.querySelectorAll('.tab-inner').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-inner').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.inner-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('inner-' + btn.dataset.inner).classList.add('active');
      });
    });

    // Close modal on backdrop
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (e) => {
        if (e.target === m) this.closeModal(m.id);
      });
    });

    // Set today
    const today = new Date().toISOString().slice(0, 10);
    document.getElementById('agenda-fecha').value = today;
    this.currentAgendaFecha = today;
  },

  switchTab(tab) {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.querySelector(`.nav-item[data-tab="${tab}"]`)?.classList.add('active');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tab)?.classList.add('active');
    const titles = {
      dashboard: 'Dashboard', pacientes: 'Pacientes', agenda: 'Agenda',
      cobros: 'Cobros', laboratorios: 'Laboratorios', balances: 'Balances',
      gastos: 'Gastos', config: 'Configuración'
    };
    document.getElementById('page-title').textContent = titles[tab] || tab;
    document.getElementById('sidebar')?.classList.remove('open');
    this.refreshTab(tab);
  },

  refreshAll() {
    this.refreshTab('dashboard');
  },

  refreshTab(tab) {
    switch (tab) {
      case 'dashboard': this.renderDashboard(); break;
      case 'pacientes': this.renderPacientes(); break;
      case 'agenda': this.renderAgenda(); this.renderCanceladas(); break;
      case 'cobros': this.renderCobros(); break;
      case 'laboratorios': this.renderLabs(); this.renderEstudios(); break;
      case 'balances': this.calcularBalance(); break;
      case 'gastos': this.renderGastos(); break;
      case 'config': this.renderServiciosConfig(); break;
    }
  },

  // ========== UTILIDADES ==========
  toast(msg, type = 'success') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast show ' + type;
    setTimeout(() => t.classList.remove('show'), 3000);
  },

  showModal(id) {
    const m = document.getElementById(id);
    m.classList.add('open');
    if (id === 'modal-paciente') {
      document.getElementById('form-paciente').reset();
      document.getElementById('paciente-id').value = '';
      document.getElementById('modal-paciente-titulo').textContent = 'Nuevo paciente';
    }
    if (id === 'modal-cita') {
      document.getElementById('form-cita').reset();
      document.getElementById('cita-id').value = '';
      document.getElementById('modal-cita-titulo').textContent = 'Nueva cita';
      document.getElementById('cita-fecha').value = document.getElementById('agenda-fecha').value || new Date().toISOString().slice(0, 10);
      this.fillPacienteSelect('cita-paciente');
    }
    if (id === 'modal-cobro') {
      document.getElementById('form-cobro').reset();
      document.getElementById('cobro-fecha').value = new Date().toISOString().slice(0, 10);
      this.fillPacienteSelect('cobro-paciente');
      document.getElementById('cobro-servicios-lista').innerHTML = '';
      this.agregarLineaServicio();
      this.updateCobroTotal();
    }
    if (id === 'modal-cotizacion') {
      document.getElementById('form-cotizacion').reset();
      document.getElementById('lab-vigencia').value = 15;
      this.fillPacienteSelect('lab-paciente');
      document.getElementById('lab-estudios-lista').innerHTML = '';
      this.agregarLineaEstudio();
      this.updateLabTotal();
    }
    if (id === 'modal-estudio') {
      document.getElementById('form-estudio').reset();
      document.getElementById('estudio-id').value = '';
      document.getElementById('modal-estudio-titulo').textContent = 'Nuevo estudio';
    }
    if (id === 'modal-gasto') {
      document.getElementById('form-gasto').reset();
      document.getElementById('gasto-fecha').value = new Date().toISOString().slice(0, 10);
    }
  },

  closeModal(id) {
    document.getElementById(id).classList.remove('open');
  },

  fillPacienteSelect(selectId) {
    const sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="">Seleccionar paciente...</option>';
    this.data.pacientes
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.nombre} (${p.celular})`;
        sel.appendChild(opt);
      });
  },

  formatMoney(n) {
    return '$' + Number(n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  },

  calcularEdadFromDate(fnac) {
    if (!fnac) return 0;
    const hoy = new Date();
    const nac = new Date(fnac + 'T12:00:00');
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad;
  },

  calcularEdad() {
    const fnac = document.getElementById('paciente-fnac').value;
    document.getElementById('paciente-edad').value = this.calcularEdadFromDate(fnac);
  },

  // ========== DASHBOARD ==========
  renderDashboard() {
    const hoy = new Date().toISOString().slice(0, 10);
    const citasHoy = this.data.citas.filter(c => c.fecha === hoy && c.estado !== 'cancelada');
    const cobrosHoy = this.data.cobros.filter(c => c.fecha === hoy);
    const ingresosHoy = cobrosHoy.reduce((s, c) => s + (c.total || 0), 0) +
      this.data.cotizaciones.filter(c => c.estatus === 'PAGADO' && c.fechaPago === hoy)
        .reduce((s, c) => s + (c.total || 0), 0);
    const labsPend = this.data.cotizaciones.filter(c => c.estatus === 'PENDIENTE').length;

    document.getElementById('stat-citas-hoy').textContent = citasHoy.length;
    document.getElementById('stat-ingresos-hoy').textContent = this.formatMoney(ingresosHoy);
    document.getElementById('stat-pacientes').textContent = this.data.pacientes.length;
    document.getElementById('stat-labs-pend').textContent = labsPend;

    // Citas hoy
    const cont = document.getElementById('dashboard-citas');
    if (citasHoy.length === 0) {
      cont.className = 'list-empty';
      cont.textContent = 'No hay citas programadas para hoy';
    } else {
      cont.className = '';
      cont.innerHTML = '<table class="table"><thead><tr><th>Hora</th><th>Paciente</th><th>Médico</th><th>Estado</th></tr></thead><tbody>' +
        citasHoy.sort((a, b) => a.hora.localeCompare(b.hora)).map(c => {
          const p = this.data.pacientes.find(x => x.id === c.pacienteId);
          const medClass = c.medico === 'DR. Cortez' ? 'dr-azul' : '';
          return `<tr>
            <td>${c.hora}</td>
            <td>${p?.nombre || '—'}</td>
            <td class="${medClass}">${c.medico}</td>
            <td><span class="badge badge-${c.estado}">${c.estado}</span></td>
          </tr>`;
        }).join('') + '</tbody></table>';
    }

    // Últimos cobros
    const contC = document.getElementById('dashboard-cobros');
    const ultimos = [...this.data.cobros].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero)).slice(0, 5);
    if (ultimos.length === 0) {
      contC.className = 'list-empty';
      contC.textContent = 'Sin cobros recientes';
    } else {
      contC.className = '';
      contC.innerHTML = '<table class="table"><thead><tr><th>N°</th><th>Paciente</th><th>Total</th></tr></thead><tbody>' +
        ultimos.map(c => {
          const p = this.data.pacientes.find(x => x.id === c.pacienteId);
          return `<tr><td>${c.numero}</td><td>${p?.nombre || '—'}</td><td>${this.formatMoney(c.total)}</td></tr>`;
        }).join('') + '</tbody></table>';
    }
  },

  // ========== PACIENTES ==========
  renderPacientes() {
    const q = (document.getElementById('search-pacientes')?.value || '').toLowerCase();
    let list = this.data.pacientes;
    if (q) list = list.filter(p => p.nombre.toLowerCase().includes(q) || (p.celular || '').includes(q));
    list = list.sort((a, b) => a.nombre.localeCompare(b.nombre));

    const tbody = document.querySelector('#tabla-pacientes tbody');
    const empty = document.getElementById('pacientes-empty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(p => `
      <tr>
        <td><strong>${p.nombre}</strong></td>
        <td>${p.edad || this.calcularEdadFromDate(p.fechaNacimiento)}</td>
        <td>${p.sexo || '—'}</td>
        <td>${p.celular || '—'}</td>
        <td>
          <button class="btn-icon" title="Editar" onclick="App.editPaciente('${p.id}')">✏️</button>
          <button class="btn-icon" title="Eliminar" onclick="App.deletePaciente('${p.id}')">🗑️</button>
        </td>
      </tr>
    `).join('');
  },

  async savePaciente(e) {
    e.preventDefault();
    const id = document.getElementById('paciente-id').value || DB.generateId('pac');
    const fnac = document.getElementById('paciente-fnac').value;
    const paciente = {
      id,
      nombre: document.getElementById('paciente-nombre').value.trim(),
      fechaNacimiento: fnac,
      edad: this.calcularEdadFromDate(fnac),
      sexo: document.getElementById('paciente-sexo').value,
      celular: document.getElementById('paciente-celular').value.trim()
    };
    await DB.put('pacientes', paciente);
    const idx = this.data.pacientes.findIndex(p => p.id === id);
    if (idx >= 0) this.data.pacientes[idx] = paciente;
    else this.data.pacientes.push(paciente);
    this.closeModal('modal-paciente');
    this.renderPacientes();
    this.toast('Paciente guardado');
  },

  editPaciente(id) {
    const p = this.data.pacientes.find(x => x.id === id);
    if (!p) return;
    document.getElementById('paciente-id').value = p.id;
    document.getElementById('paciente-nombre').value = p.nombre;
    document.getElementById('paciente-fnac').value = p.fechaNacimiento || '';
    document.getElementById('paciente-edad').value = p.edad || this.calcularEdadFromDate(p.fechaNacimiento);
    document.getElementById('paciente-sexo').value = p.sexo || '';
    document.getElementById('paciente-celular').value = p.celular || '';
    document.getElementById('modal-paciente-titulo').textContent = 'Editar paciente';
    document.getElementById('modal-paciente').classList.add('open');
  },

  async deletePaciente(id) {
    if (!confirm('¿Eliminar este paciente? Esta acción no se puede deshacer.')) return;
    await DB.delete('pacientes', id);
    this.data.pacientes = this.data.pacientes.filter(p => p.id !== id);
    this.renderPacientes();
    this.toast('Paciente eliminado');
  },

  // ========== AGENDA ==========
  renderAgenda() {
    const fecha = document.getElementById('agenda-fecha').value;
    const estado = document.getElementById('filtro-estado-cita').value;
    let list = this.data.citas.filter(c => c.fecha === fecha);
    if (this.currentMedicoFilter !== 'todos') {
      list = list.filter(c => c.medico === this.currentMedicoFilter);
    }
    if (estado !== 'todos') list = list.filter(c => c.estado === estado);
    list = list.sort((a, b) => a.hora.localeCompare(b.hora));

    const tbody = document.querySelector('#tabla-agenda tbody');
    const empty = document.getElementById('agenda-empty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(c => {
      const p = this.data.pacientes.find(x => x.id === c.pacienteId);
      const medClass = c.medico === 'DR. Cortez' ? 'dr-azul' : '';
      return `<tr>
        <td>${c.hora}</td>
        <td>${p?.nombre || '—'}</td>
        <td class="${medClass}">${c.medico}</td>
        <td><span class="badge badge-${c.estado}">${c.estado}</span></td>
        <td>
          <button class="btn-icon" title="Editar" onclick="App.editCita('${c.id}')">✏️</button>
          <button class="btn-icon" title="Marcar atendida" onclick="App.setEstadoCita('${c.id}','atendida')">✅</button>
          <button class="btn-icon" title="Cancelar" onclick="App.setEstadoCita('${c.id}','cancelada')">❌</button>
        </td>
      </tr>`;
    }).join('');
  },

  renderCanceladas() {
    const canceladas = this.data.citas
      .filter(c => c.estado === 'cancelada')
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))
      .slice(0, 20);
    const cont = document.getElementById('historial-canceladas');
    if (canceladas.length === 0) {
      cont.className = 'list-empty';
      cont.textContent = 'Sin cancelaciones';
      return;
    }
    cont.className = '';
    cont.innerHTML = '<table class="table"><thead><tr><th>Fecha</th><th>Hora</th><th>Paciente</th><th>Médico</th></tr></thead><tbody>' +
      canceladas.map(c => {
        const p = this.data.pacientes.find(x => x.id === c.pacienteId);
        return `<tr><td>${c.fecha}</td><td>${c.hora}</td><td>${p?.nombre || '—'}</td><td>${c.medico}</td></tr>`;
      }).join('') + '</tbody></table>';
  },

  async saveCita(e) {
    e.preventDefault();
    const id = document.getElementById('cita-id').value || DB.generateId('cit');
    const medico = document.getElementById('cita-medico').value;
    const fecha = document.getElementById('cita-fecha').value;
    const hora = document.getElementById('cita-hora').value;

    // Evitar duplicar horario del mismo médico
    const conflicto = this.data.citas.find(c =>
      c.id !== id && c.medico === medico && c.fecha === fecha && c.hora === hora && c.estado !== 'cancelada'
    );
    if (conflicto) {
      this.toast('Ya existe una cita en ese horario para este médico', 'error');
      return;
    }

    const cita = {
      id,
      pacienteId: document.getElementById('cita-paciente').value,
      medico,
      fecha,
      hora,
      estado: document.getElementById('cita-estado').value,
      notas: document.getElementById('cita-notas').value
    };
    await DB.put('citas', cita);
    const idx = this.data.citas.findIndex(c => c.id === id);
    if (idx >= 0) this.data.citas[idx] = cita;
    else this.data.citas.push(cita);
    this.closeModal('modal-cita');
    this.renderAgenda();
    this.renderCanceladas();
    this.toast('Cita guardada');
  },

  editCita(id) {
    const c = this.data.citas.find(x => x.id === id);
    if (!c) return;
    this.fillPacienteSelect('cita-paciente');
    document.getElementById('cita-id').value = c.id;
    document.getElementById('cita-paciente').value = c.pacienteId;
    document.getElementById('cita-medico').value = c.medico;
    document.getElementById('cita-fecha').value = c.fecha;
    document.getElementById('cita-hora').value = c.hora;
    document.getElementById('cita-estado').value = c.estado;
    document.getElementById('cita-notas').value = c.notas || '';
    document.getElementById('modal-cita-titulo').textContent = 'Editar cita';
    document.getElementById('modal-cita').classList.add('open');
  },

  async setEstadoCita(id, estado) {
    const c = this.data.citas.find(x => x.id === id);
    if (!c) return;
    c.estado = estado;
    await DB.put('citas', c);
    this.renderAgenda();
    this.renderCanceladas();
    this.toast('Estado actualizado');
  },

  // ========== COBROS ==========
  renderCobros() {
    const q = (document.getElementById('search-cobros')?.value || '').toLowerCase();
    const fecha = document.getElementById('filtro-fecha-cobro')?.value;
    let list = [...this.data.cobros];
    if (fecha) list = list.filter(c => c.fecha === fecha);
    if (q) {
      list = list.filter(c => {
        const p = this.data.pacientes.find(x => x.id === c.pacienteId);
        return (c.numero || '').toLowerCase().includes(q) ||
          (p?.nombre || '').toLowerCase().includes(q);
      });
    }
    list = list.sort((a, b) => b.fecha.localeCompare(a.fecha) || b.numero.localeCompare(a.numero));

    const tbody = document.querySelector('#tabla-cobros tbody');
    const empty = document.getElementById('cobros-empty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(c => {
      const p = this.data.pacientes.find(x => x.id === c.pacienteId);
      const medClass = c.medico === 'DR. Cortez' ? 'dr-azul' : '';
      return `<tr>
        <td><strong>${c.numero}</strong></td>
        <td>${c.fecha}</td>
        <td>${p?.nombre || '—'}</td>
        <td class="${medClass}">${c.medico}</td>
        <td>${this.formatMoney(c.total)}</td>
        <td>${c.formaPago}</td>
        <td>
          <button class="btn-icon" title="Imprimir" onclick="App.imprimirCobro('${c.id}')">🖨️</button>
        </td>
      </tr>`;
    }).join('');
  },

  agregarLineaServicio() {
    const cont = document.getElementById('cobro-servicios-lista');
    const div = document.createElement('div');
    div.className = 'linea-servicio';
    const opts = this.data.servicios.map(s =>
      `<option value="${s.id}" data-precio="${s.precio}">${s.nombre} (${this.formatMoney(s.precio)})</option>`
    ).join('');
    div.innerHTML = `
      <select class="srv-select" onchange="App.onServicioChange(this)">
        <option value="">Seleccionar...</option>
        ${opts}
        <option value="custom">Otro (manual)</option>
      </select>
      <input type="number" class="srv-cant" value="1" min="1" onchange="App.updateCobroTotal()" oninput="App.updateCobroTotal()">
      <input type="number" class="srv-precio" value="0" min="0" step="0.01" onchange="App.updateCobroTotal()" oninput="App.updateCobroTotal()">
      <button type="button" class="btn-icon" onclick="this.parentElement.remove(); App.updateCobroTotal()">🗑️</button>
    `;
    cont.appendChild(div);
  },

  onServicioChange(sel) {
    const precio = sel.options[sel.selectedIndex]?.dataset?.precio;
    const precioInput = sel.parentElement.querySelector('.srv-precio');
    if (precio !== undefined) precioInput.value = precio;
    else precioInput.value = 0;
    this.updateCobroTotal();
  },

  updateCobroTotal() {
    let total = 0;
    document.querySelectorAll('#cobro-servicios-lista .linea-servicio').forEach(line => {
      const cant = parseFloat(line.querySelector('.srv-cant').value) || 0;
      const precio = parseFloat(line.querySelector('.srv-precio').value) || 0;
      total += cant * precio;
    });
    document.getElementById('cobro-total').textContent = this.formatMoney(total);
  },

  async saveCobro(e) {
    e.preventDefault();
    const servicios = [];
    document.querySelectorAll('#cobro-servicios-lista .linea-servicio').forEach(line => {
      const sel = line.querySelector('.srv-select');
      let nombre = '';
      if (sel.value && sel.value !== 'custom') {
        const srv = this.data.servicios.find(s => s.id === sel.value);
        nombre = srv?.nombre || sel.options[sel.selectedIndex].text;
      } else if (sel.value === 'custom') {
        nombre = prompt('Nombre del servicio:') || 'Servicio';
      }
      if (!nombre) return;
      const cant = parseFloat(line.querySelector('.srv-cant').value) || 1;
      const precio = parseFloat(line.querySelector('.srv-precio').value) || 0;
      servicios.push({ nombre, cantidad: cant, precio });
    });
    if (servicios.length === 0) {
      this.toast('Agrega al menos un servicio', 'error');
      return;
    }
    const total = servicios.reduce((s, x) => s + x.cantidad * x.precio, 0);
    const numero = await DB.nextFolio('cobro');
    const cobro = {
      id: DB.generateId('cob'),
      numero,
      pacienteId: document.getElementById('cobro-paciente').value,
      medico: document.getElementById('cobro-medico').value,
      servicios,
      total,
      formaPago: document.getElementById('cobro-pago').value,
      fecha: document.getElementById('cobro-fecha').value || new Date().toISOString().slice(0, 10),
      proximaCita: document.getElementById('cobro-proxima').value || null,
      mensaje: this.data.config.mensaje
    };
    await DB.put('cobros', cobro);
    this.data.cobros.push(cobro);
    this.closeModal('modal-cobro');
    this.renderCobros();
    this.toast('Cobro registrado: ' + numero);
    // Imprimir
    const paciente = this.data.pacientes.find(p => p.id === cobro.pacienteId);
    await PDF.reciboCobro(cobro, paciente);
  },

  async imprimirCobro(id) {
    const cobro = this.data.cobros.find(c => c.id === id);
    if (!cobro) return;
    const paciente = this.data.pacientes.find(p => p.id === cobro.pacienteId);
    await PDF.reciboCobro(cobro, paciente);
  },

  // ========== LABORATORIOS ==========
  renderLabs() {
    const estatus = document.getElementById('filtro-estatus-lab')?.value || 'todos';
    let list = [...this.data.cotizaciones];
    if (estatus !== 'todos') list = list.filter(c => c.estatus === estatus);
    list = list.sort((a, b) => b.fecha.localeCompare(a.fecha));

    const tbody = document.querySelector('#tabla-labs tbody');
    const empty = document.getElementById('labs-empty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(c => {
      const p = this.data.pacientes.find(x => x.id === c.pacienteId);
      return `<tr>
        <td><strong>${c.folio}</strong></td>
        <td>${c.fecha}</td>
        <td>${p?.nombre || '—'}</td>
        <td>${this.formatMoney(c.total)}</td>
        <td><span class="badge badge-${c.estatus}">${c.estatus}</span></td>
        <td>
          <button class="btn-icon" title="Imprimir" onclick="App.imprimirLab('${c.id}')">🖨️</button>
          ${c.estatus === 'PENDIENTE' ? `<button class="btn-icon" title="Marcar pagado" onclick="App.pagarLab('${c.id}')">💰</button>` : ''}
        </td>
      </tr>`;
    }).join('');
  },

  renderEstudios() {
    const tbody = document.querySelector('#tabla-estudios tbody');
    tbody.innerHTML = this.data.estudios
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
      .map(e => `
        <tr>
          <td>${e.nombre}</td>
          <td>${this.formatMoney(e.precio)}</td>
          <td>
            <button class="btn-icon" onclick="App.editEstudio('${e.id}')">✏️</button>
            <button class="btn-icon" onclick="App.deleteEstudio('${e.id}')">🗑️</button>
          </td>
        </tr>
      `).join('');
  },

  agregarLineaEstudio() {
    const cont = document.getElementById('lab-estudios-lista');
    const div = document.createElement('div');
    div.className = 'linea-estudio';
    const opts = this.data.estudios.map(e =>
      `<option value="${e.id}" data-precio="${e.precio}">${e.nombre} (${this.formatMoney(e.precio)})</option>`
    ).join('');
    div.innerHTML = `
      <select class="est-select" onchange="App.onEstudioChange(this)">
        <option value="">Seleccionar...</option>
        ${opts}
        <option value="custom">Otro (manual)</option>
      </select>
      <input type="number" class="est-precio" value="0" min="0" step="0.01" onchange="App.updateLabTotal()" oninput="App.updateLabTotal()">
      <button type="button" class="btn-icon" onclick="this.parentElement.remove(); App.updateLabTotal()">🗑️</button>
    `;
    cont.appendChild(div);
  },

  onEstudioChange(sel) {
    const precio = sel.options[sel.selectedIndex]?.dataset?.precio;
    const precioInput = sel.parentElement.querySelector('.est-precio');
    if (precio !== undefined) precioInput.value = precio;
    else precioInput.value = 0;
    this.updateLabTotal();
  },

  updateLabTotal() {
    let total = 0;
    document.querySelectorAll('#lab-estudios-lista .linea-estudio').forEach(line => {
      total += parseFloat(line.querySelector('.est-precio').value) || 0;
    });
    document.getElementById('lab-total').textContent = this.formatMoney(total);
  },

  async saveCotizacion(e) {
    e.preventDefault();
    const estudios = [];
    document.querySelectorAll('#lab-estudios-lista .linea-estudio').forEach(line => {
      const sel = line.querySelector('.est-select');
      let nombre = '';
      if (sel.value && sel.value !== 'custom') {
        const est = this.data.estudios.find(x => x.id === sel.value);
        nombre = est?.nombre || sel.options[sel.selectedIndex].text;
      } else if (sel.value === 'custom') {
        nombre = prompt('Nombre del estudio:') || 'Estudio';
      }
      if (!nombre) return;
      const precio = parseFloat(line.querySelector('.est-precio').value) || 0;
      estudios.push({ nombre, precio });
    });
    if (estudios.length === 0) {
      this.toast('Agrega al menos un estudio', 'error');
      return;
    }
    const total = estudios.reduce((s, x) => s + x.precio, 0);
    const folio = await DB.nextFolio('lab');
    const fecha = new Date().toISOString().slice(0, 10);
    const vigenciaDias = parseInt(document.getElementById('lab-vigencia').value) || 15;
    const vigenciaHasta = new Date();
    vigenciaHasta.setDate(vigenciaHasta.getDate() + vigenciaDias);
    const estatus = document.getElementById('lab-estatus').value;
    const cot = {
      id: DB.generateId('lab'),
      folio,
      pacienteId: document.getElementById('lab-paciente').value,
      medico: document.getElementById('lab-medico').value,
      estudios,
      total,
      estatus,
      fecha,
      vigenciaHasta: vigenciaHasta.toISOString().slice(0, 10),
      formaPago: estatus === 'PAGADO' ? document.getElementById('lab-pago').value : null,
      fechaPago: estatus === 'PAGADO' ? (document.getElementById('lab-fecha-pago').value || fecha) : null
    };
    await DB.put('cotizaciones', cot);
    this.data.cotizaciones.push(cot);
    this.closeModal('modal-cotizacion');
    this.renderLabs();
    this.toast('Cotización guardada: ' + folio);
    const paciente = this.data.pacientes.find(p => p.id === cot.pacienteId);
    await PDF.cotizacionLab(cot, paciente);
  },

  async imprimirLab(id) {
    const cot = this.data.cotizaciones.find(c => c.id === id);
    if (!cot) return;
    const paciente = this.data.pacientes.find(p => p.id === cot.pacienteId);
    await PDF.cotizacionLab(cot, paciente);
  },

  async pagarLab(id) {
    const cot = this.data.cotizaciones.find(c => c.id === id);
    if (!cot) return;
    const pago = prompt('Forma de pago (Efectivo / Transferencia / Tarjeta):', 'Efectivo');
    if (!pago) return;
    cot.estatus = 'PAGADO';
    cot.formaPago = pago;
    cot.fechaPago = new Date().toISOString().slice(0, 10);
    await DB.put('cotizaciones', cot);
    this.renderLabs();
    this.toast('Laboratorio marcado como PAGADO');
  },

  async saveEstudio(e) {
    e.preventDefault();
    const id = document.getElementById('estudio-id').value || DB.generateId('est');
    const estudio = {
      id,
      nombre: document.getElementById('estudio-nombre').value.trim(),
      precio: parseFloat(document.getElementById('estudio-precio').value) || 0
    };
    await DB.put('estudios', estudio);
    const idx = this.data.estudios.findIndex(x => x.id === id);
    if (idx >= 0) this.data.estudios[idx] = estudio;
    else this.data.estudios.push(estudio);
    this.closeModal('modal-estudio');
    this.renderEstudios();
    this.toast('Estudio guardado');
  },

  editEstudio(id) {
    const e = this.data.estudios.find(x => x.id === id);
    if (!e) return;
    document.getElementById('estudio-id').value = e.id;
    document.getElementById('estudio-nombre').value = e.nombre;
    document.getElementById('estudio-precio').value = e.precio;
    document.getElementById('modal-estudio-titulo').textContent = 'Editar estudio';
    document.getElementById('modal-estudio').classList.add('open');
  },

  async deleteEstudio(id) {
    if (!confirm('¿Eliminar este estudio del catálogo?')) return;
    await DB.delete('estudios', id);
    this.data.estudios = this.data.estudios.filter(e => e.id !== id);
    this.renderEstudios();
    this.toast('Estudio eliminado');
  },

  // ========== BALANCES ==========
  getPeriodoRange() {
    const periodo = document.getElementById('periodo-balance').value;
    const hoy = new Date();
    let desde, hasta;
    hasta = hoy.toISOString().slice(0, 10);
    if (periodo === 'hoy') {
      desde = hasta;
    } else if (periodo === 'semana') {
      const d = new Date(hoy);
      d.setDate(d.getDate() - d.getDay());
      desde = d.toISOString().slice(0, 10);
    } else if (periodo === 'mes') {
      desde = hoy.toISOString().slice(0, 7) + '-01';
    } else {
      desde = document.getElementById('balance-desde').value;
      hasta = document.getElementById('balance-hasta').value;
    }
    return { desde, hasta, label: periodo === 'personalizado' ? `${desde} a ${hasta}` : periodo };
  },

  calcularBalance() {
    const { desde, hasta, label } = this.getPeriodoRange();
    if (!desde || !hasta) return;

    const cobros = this.data.cobros.filter(c => c.fecha >= desde && c.fecha <= hasta);
    const labsPagados = this.data.cotizaciones.filter(c =>
      c.estatus === 'PAGADO' && c.fechaPago && c.fechaPago >= desde && c.fechaPago <= hasta
    );
    const gastos = this.data.gastos.filter(g => g.fecha >= desde && g.fecha <= hasta);

    const totalMedicos = cobros.reduce((s, c) => s + (c.total || 0), 0);
    const totalLabs = labsPagados.reduce((s, c) => s + (c.total || 0), 0);
    const totalGastos = gastos.reduce((s, g) => s + (g.monto || 0), 0);
    const totalGeneral = totalMedicos + totalLabs;

    // Por médico
    const porMedico = {};
    cobros.forEach(c => {
      if (!porMedico[c.medico]) porMedico[c.medico] = { count: 0, total: 0 };
      porMedico[c.medico].count++;
      porMedico[c.medico].total += c.total || 0;
    });

    // Por forma de pago
    const porPago = {};
    cobros.forEach(c => {
      porPago[c.formaPago] = (porPago[c.formaPago] || 0) + (c.total || 0);
    });
    labsPagados.forEach(c => {
      if (c.formaPago) porPago[c.formaPago] = (porPago[c.formaPago] || 0) + (c.total || 0);
    });

    document.getElementById('bal-total').textContent = this.formatMoney(totalGeneral);
    document.getElementById('bal-consultas').textContent = cobros.length;
    document.getElementById('bal-labs').textContent = this.formatMoney(totalLabs);
    document.getElementById('bal-gastos').textContent = this.formatMoney(totalGastos);

    // Corte médicos
    let htmlMed = '';
    ['DR. Cortez', 'Dra. Karime'].forEach(m => {
      const info = porMedico[m] || { count: 0, total: 0 };
      const cls = m === 'DR. Cortez' ? 'dr-azul' : '';
      htmlMed += `<div style="padding:8px 0;border-bottom:1px solid #eee">
        <span class="${cls}" style="font-weight:600">${m}</span><br>
        <small>${info.count} consultas — ${this.formatMoney(info.total)}</small>
      </div>`;
    });
    document.getElementById('corte-medicos').innerHTML = htmlMed || '<p class="text-muted">Sin datos</p>';

    // Por pago
    let htmlPago = Object.entries(porPago).map(([k, v]) =>
      `<div style="padding:6px 0;display:flex;justify-content:space-between"><span>${k}</span><strong>${this.formatMoney(v)}</strong></div>`
    ).join('');
    document.getElementById('corte-pagos').innerHTML = htmlPago || '<p class="text-muted">Sin datos</p>';

    // Detalle
    const movimientos = [
      ...cobros.map(c => {
        const p = this.data.pacientes.find(x => x.id === c.pacienteId);
        return { fecha: c.fecha, tipo: 'Cobro', desc: `${c.numero} - ${p?.nombre || ''} (${c.medico})`, monto: c.total };
      }),
      ...labsPagados.map(c => {
        const p = this.data.pacientes.find(x => x.id === c.pacienteId);
        return { fecha: c.fechaPago, tipo: 'Lab', desc: `${c.folio} - ${p?.nombre || ''}`, monto: c.total };
      }),
      ...gastos.map(g => ({ fecha: g.fecha, tipo: 'Gasto', desc: g.concepto, monto: -g.monto }))
    ].sort((a, b) => b.fecha.localeCompare(a.fecha));

    const cont = document.getElementById('detalle-movimientos');
    if (movimientos.length === 0) {
      cont.className = 'list-empty';
      cont.textContent = 'Sin movimientos en el periodo';
    } else {
      cont.className = '';
      cont.innerHTML = '<table class="table"><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th>Monto</th></tr></thead><tbody>' +
        movimientos.map(m => `<tr>
          <td>${m.fecha}</td>
          <td>${m.tipo}</td>
          <td>${m.desc}</td>
          <td style="color:${m.monto < 0 ? '#dc2626' : 'inherit'}">${this.formatMoney(m.monto)}</td>
        </tr>`).join('') + '</tbody></table>';
    }

    // Guardar para imprimir
    this._lastBalance = {
      periodoLabel: label,
      totalGeneral, totalMedicos, totalLabs, totalGastos,
      numConsultas: cobros.length,
      porMedico, porPago
    };
  },

  async imprimirCorte() {
    if (!this._lastBalance) this.calcularBalance();
    if (!this._lastBalance) {
      this.toast('No hay datos para el corte', 'error');
      return;
    }
    await PDF.corteCaja(this._lastBalance);
    this.toast('Corte generado');
  },

  // ========== GASTOS ==========
  renderGastos() {
    const list = [...this.data.gastos].sort((a, b) => b.fecha.localeCompare(a.fecha));
    const tbody = document.querySelector('#tabla-gastos tbody');
    const empty = document.getElementById('gastos-empty');
    if (list.length === 0) {
      tbody.innerHTML = '';
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    tbody.innerHTML = list.map(g => `
      <tr>
        <td>${g.fecha}</td>
        <td>${g.concepto}</td>
        <td>${this.formatMoney(g.monto)}</td>
        <td><button class="btn-icon" onclick="App.deleteGasto('${g.id}')">🗑️</button></td>
      </tr>
    `).join('');
  },

  async saveGasto(e) {
    e.preventDefault();
    const gasto = {
      id: DB.generateId('gas'),
      concepto: document.getElementById('gasto-concepto').value.trim(),
      monto: parseFloat(document.getElementById('gasto-monto').value) || 0,
      fecha: document.getElementById('gasto-fecha').value
    };
    await DB.put('gastos', gasto);
    this.data.gastos.push(gasto);
    this.closeModal('modal-gasto');
    this.renderGastos();
    this.toast('Gasto registrado');
  },

  async deleteGasto(id) {
    if (!confirm('¿Eliminar este gasto?')) return;
    await DB.delete('gastos', id);
    this.data.gastos = this.data.gastos.filter(g => g.id !== id);
    this.renderGastos();
    this.toast('Gasto eliminado');
  },

  // ========== CONFIG ==========
  renderServiciosConfig() {
    const cont = document.getElementById('lista-servicios');
    cont.innerHTML = this.data.servicios.map(s => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #eee">
        <span>${s.nombre}</span>
        <div>
          <input type="number" value="${s.precio}" min="0" step="0.01" style="width:90px;padding:4px 8px;border:1px solid #ddd;border-radius:6px"
            onchange="App.updateServicioPrecio('${s.id}', this.value)">
          <button class="btn-icon" onclick="App.deleteServicio('${s.id}')">🗑️</button>
        </div>
      </div>
    `).join('');
    document.getElementById('cfg-nombre').value = this.data.config.nombre || '';
    document.getElementById('cfg-mensaje').value = this.data.config.mensaje || '';
  },

  async updateServicioPrecio(id, precio) {
    const s = this.data.servicios.find(x => x.id === id);
    if (!s) return;
    s.precio = parseFloat(precio) || 0;
    await DB.put('servicios', s);
    this.toast('Precio actualizado');
  },

  async deleteServicio(id) {
    if (!confirm('¿Eliminar este servicio?')) return;
    await DB.delete('servicios', id);
    this.data.servicios = this.data.servicios.filter(s => s.id !== id);
    this.renderServiciosConfig();
  },

  async agregarServicio() {
    const nombre = prompt('Nombre del servicio:');
    if (!nombre) return;
    const precio = parseFloat(prompt('Precio (MXN):', '0')) || 0;
    const s = { id: DB.generateId('srv'), nombre, precio };
    await DB.put('servicios', s);
    this.data.servicios.push(s);
    this.renderServiciosConfig();
    this.toast('Servicio agregado');
  },

  async guardarConfig() {
    this.data.config = {
      id: 'main',
      nombre: document.getElementById('cfg-nombre').value,
      mensaje: document.getElementById('cfg-mensaje').value
    };
    await DB.put('config', this.data.config);
    this.toast('Configuración guardada');
  },

  // ========== RESPALDO ==========
  async exportarDatos() {
    const data = {
      pacientes: this.data.pacientes,
      citas: this.data.citas,
      cobros: this.data.cobros,
      servicios: this.data.servicios,
      estudios: this.data.estudios,
      cotizaciones: this.data.cotizaciones,
      gastos: this.data.gastos,
      config: this.data.config,
      exportado: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `respaldo_consultorio_cc_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    this.toast('Respaldo exportado');
  },

  async importarDatos(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const stores = ['pacientes', 'citas', 'cobros', 'servicios', 'estudios', 'cotizaciones', 'gastos'];
      for (const s of stores) {
        await DB.clear(s);
        if (data[s]) {
          for (const item of data[s]) await DB.put(s, item);
        }
      }
      if (data.config) await DB.put('config', { ...data.config, id: 'main' });
      await this.loadAll();
      this.refreshAll();
      this.toast('Datos importados correctamente');
    } catch (err) {
      this.toast('Error al importar: ' + err.message, 'error');
    }
    event.target.value = '';
  },

  async resetearDatos() {
    if (!confirm('¿BORRAR TODOS LOS DATOS? Esta acción es irreversible.')) return;
    if (!confirm('Confirma de nuevo: se eliminarán pacientes, citas, cobros, etc.')) return;
    const stores = ['pacientes', 'citas', 'cobros', 'servicios', 'estudios', 'cotizaciones', 'gastos', 'config'];
    for (const s of stores) await DB.clear(s);
    this.data = { pacientes: [], citas: [], cobros: [], servicios: [], estudios: [], cotizaciones: [], gastos: [], config: { nombre: 'CONSULTORIO MÉDICO CC', mensaje: '¡Gracias por confiarnos tu salud!' } };
    await this.seedIfEmpty();
    this.refreshAll();
    this.toast('Datos restablecidos');
  }
};

// Iniciar
document.addEventListener('DOMContentLoaded', () => App.init());
