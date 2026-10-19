/**
 * Capa de datos - IndexedDB + localStorage fallback
 * Persistencia local segura para el Consultorio Médico CC
 */
const DB = {
  name: 'ConsultorioCC',
  version: 1,
  db: null,

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.name, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        const stores = [
          'pacientes', 'citas', 'cobros', 'servicios',
          'estudios', 'cotizaciones', 'gastos', 'config'
        ];
        stores.forEach(s => {
          if (!db.objectStoreNames.contains(s)) {
            const store = db.createObjectStore(s, { keyPath: 'id', autoIncrement: false });
            if (s === 'pacientes') store.createIndex('nombre', 'nombre', { unique: false });
            if (s === 'citas') {
              store.createIndex('fecha', 'fecha', { unique: false });
              store.createIndex('medico', 'medico', { unique: false });
            }
            if (s === 'cobros') store.createIndex('fecha', 'fecha', { unique: false });
            if (s === 'cotizaciones') store.createIndex('estatus', 'estatus', { unique: false });
          }
        });
      };
      req.onsuccess = (e) => {
        this.db = e.target.result;
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async get(store, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readonly');
      const req = tx.objectStore(store).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },

  async put(store, data) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(store, id) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async clear(store) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(store, 'readwrite');
      const req = tx.objectStore(store).clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  },

  // Contadores para folios
  async nextFolio(tipo) {
    const cfg = await this.get('config', 'folios') || { id: 'folios', cobro: 0, lab: 0 };
    if (tipo === 'cobro') cfg.cobro = (cfg.cobro || 0) + 1;
    if (tipo === 'lab') cfg.lab = (cfg.lab || 0) + 1;
    await this.put('config', cfg);
    const num = tipo === 'cobro' ? cfg.cobro : cfg.lab;
    return (tipo === 'cobro' ? 'A' : 'L') + String(num).padStart(5, '0');
  }
};
