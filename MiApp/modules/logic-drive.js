// ============================================================
// GOOGLE DRIVE — Backup automático y sincronización
// ============================================================
//
// ⚙️  CONFIGURACIÓN REQUERIDA:
//    1. Crea un proyecto en https://console.cloud.google.com
//    2. Habilita la API de Google Drive
//    3. Crea credenciales OAuth 2.0 (tipo: Aplicación web)
//    4. Añade tu dominio en "Orígenes de JavaScript autorizados"
//       p.ej. https://tu-usuario.github.io
//    5. Pega aquí tu Client ID:
//
const DRIVE_CLIENT_ID = '62646010625-qdb8acrcuver3tskve9m6898pf4gconf.apps.googleusercontent.com';
//
// ============================================================

App.drive = {

    SCOPES:      'https://www.googleapis.com/auth/drive.file',
    FOLDER_NAME: 'Planificador de Turnos',
    AUTO_SAVE_MS: 30 * 60 * 1000, // 30 minutos

    _tokenClient:  null,
    _accessToken:  null,
    _folderId:     null,
    _pendingSync:  false,
    _autoTimer:    null,
    _gapiReady:    false,
    _gisReady:     false,

    // ── Estado persistente en localStorage (clave separada) ──────────────
    _loadConfig: function() {
        try {
            const s = localStorage.getItem('v40_drive');
            return s ? JSON.parse(s) : {};
        } catch(e) { return {}; }
    },
    _saveConfig: function(extra) {
        const cfg = Object.assign(this._loadConfig(), extra);
        localStorage.setItem('v40_drive', JSON.stringify(cfg));
    },

    isConnected: function() { return !!this._accessToken; },

    // ── Inicialización ───────────────────────────────────────────────────
    init: function() {
        if (DRIVE_CLIENT_ID === 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com') {
            console.warn('[Drive] CLIENT_ID no configurado — integración Drive desactivada.');
            return;
        }

        const cfg = this._loadConfig();
        this._folderId = cfg.folderId || null;

        // Cargar Google API scripts si no están ya
        this._loadScript('https://apis.google.com/js/api.js', () => {
            gapi.load('client', () => {
                gapi.client.init({}).then(() => {
                    this._gapiReady = true;
                    this._tryReady();
                });
            });
        });

        this._loadScript('https://accounts.google.com/gsi/client', () => {
            this._tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: DRIVE_CLIENT_ID,
                scope: this.SCOPES,
                callback: (resp) => {
                    if (resp.error) {
                        console.error('[Drive] OAuth error:', resp.error);
                        this._updateStatus('error', 'Error de autenticación');
                        return;
                    }
                    this._accessToken = resp.access_token;
                    gapi.client.setToken({ access_token: resp.access_token });
                    this._saveConfig({ connected: true });
                    this._updateStatus('connected');
                    this._startAutoSave();
                    this._checkOnStartup();
                    App.router.refreshCurrent();
                }
            });
            this._gisReady = true;
            this._tryReady();
        });
    },

    _tryReady: function() {
        if (!this._gapiReady || !this._gisReady) return;
        const cfg = this._loadConfig();
        if (cfg.connected) {
            // Intentar reconexión silenciosa (sin popup)
            this._tokenClient.requestAccessToken({ prompt: '' });
        }
    },

    _loadScript: function(src, callback) {
        if (document.querySelector(`script[src="${src}"]`)) {
            // ya existe, ejecutar callback si la API está lista
            if (src.includes('api.js') && window.gapi) callback();
            else if (src.includes('gsi') && window.google) callback();
            else {
                const interval = setInterval(() => {
                    const ready = src.includes('api.js') ? window.gapi : window.google;
                    if (ready) { clearInterval(interval); callback(); }
                }, 100);
            }
            return;
        }
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onload = callback;
        document.head.appendChild(s);
    },

    // ── Conexión manual ───────────────────────────────────────────────────
    connect: function() {
        if (!this._tokenClient) {
            alert('La API de Google todavía está cargando. Espera un momento e inténtalo de nuevo.');
            return;
        }
        this._tokenClient.requestAccessToken({ prompt: 'consent' });
    },

    disconnect: function() {
        if (this._accessToken) {
            google.accounts.oauth2.revoke(this._accessToken, () => {});
        }
        this._accessToken = null;
        if (this._autoTimer) { clearInterval(this._autoTimer); this._autoTimer = null; }
        localStorage.removeItem('v40_drive');
        this._updateStatus('disconnected');
        App.router.refreshCurrent();
    },

    // ── Guardar en Drive ──────────────────────────────────────────────────
    save: function(type) { // type: 'Manual' | 'Auto'
        if (!this.isConnected()) {
            if (type === 'Manual') alert('Conecta primero con Google Drive.');
            return;
        }

        Safe.flush('v40_db');

        const storeName = (App.data.storeConfig?.nombre?.trim() || 'Tienda')
            .replace(/[^a-zA-Z0-9À-ɏ\s_-]/g, '').replace(/\s+/g, '_');
        const ts = App.io.getTimestamp();
        const filename = `Backup_${type}_${storeName}_${ts}.json`;
        const content = JSON.stringify(App.data, null, 2);

        this._updateStatus('saving');

        this._getOrCreateFolder((folderId) => {
            this._uploadFile(filename, content, folderId,
                () => {
                    this._pendingSync = false;
                    const now = new Date().toISOString();
                    this._saveConfig({ lastSave: now, folderId: folderId });
                    this._updateStatus('saved', this._formatTime(new Date()));
                    if (type === 'Manual') {
                        this._showToast(`✅ Guardado en Drive: ${filename}`);
                    }
                },
                (err) => {
                    console.error('[Drive] Error al subir:', err);
                    this._updateStatus('error', 'Error al guardar');
                    if (type === 'Manual') {
                        alert('Error al guardar en Drive. Revisa la consola para más detalles.');
                    }
                }
            );
        });
    },

    // ── Listar archivos ───────────────────────────────────────────────────
    listFiles: function(callback) {
        if (!this.isConnected()) { callback([]); return; }

        this._getOrCreateFolder((folderId) => {
            gapi.client.request({
                path: 'https://www.googleapis.com/drive/v3/files',
                method: 'GET',
                params: {
                    q: `'${folderId}' in parents and mimeType='application/json' and trashed=false`,
                    orderBy: 'createdTime desc',
                    fields: 'files(id,name,createdTime,size)',
                    pageSize: 100
                }
            }).then(resp => {
                callback(resp.result.files || []);
            }).catch(err => {
                console.error('[Drive] Error al listar:', err);
                callback([]);
            });
        });
    },

    // ── Cargar archivo de Drive ───────────────────────────────────────────
    loadFile: function(fileId, onSuccess, onError) {
        gapi.client.request({
            path: `https://www.googleapis.com/drive/v3/files/${fileId}`,
            method: 'GET',
            params: { alt: 'media' }
        }).then(resp => {
            try {
                const data = typeof resp.result === 'string'
                    ? JSON.parse(resp.result)
                    : resp.result;
                onSuccess(data);
            } catch(e) {
                if (onError) onError(e);
            }
        }).catch(err => {
            console.error('[Drive] Error al cargar:', err);
            if (onError) onError(err);
        });
    },

    // ── Comprobar al arranque ─────────────────────────────────────────────
    _checkOnStartup: function() {
        const cfg = this._loadConfig();
        const lastLocal = cfg.lastLocal || null; // timestamp del último guardado local

        this.listFiles((files) => {
            if (!files.length) return;

            const latest = files[0];
            const driveTime = new Date(latest.createdTime);
            const localTime = lastLocal ? new Date(lastLocal) : null;

            if (!localTime || driveTime > localTime) {
                this._showSyncModal(latest, driveTime, localTime);
            }
        });
    },

    // ── Modal: Drive más reciente que local ───────────────────────────────
    _showSyncModal: function(file, driveTime, localTime) {
        const fmt = (d) => d ? d.toLocaleString('es-ES', { dateStyle:'short', timeStyle:'short' }) : 'Desconocido';

        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:white;border-radius:12px;padding:28px 32px;max-width:420px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size:2rem;margin-bottom:12px;">🔄</div>
                <h3 style="margin:0 0 8px 0;font-size:1.1rem;">Hay datos más recientes en Drive</h3>
                <p style="color:#64748b;font-size:0.85rem;margin-bottom:20px;">
                    ¿Qué datos quieres usar en esta sesión?
                </p>
                <div style="background:#f8fafc;border-radius:8px;padding:14px;margin-bottom:20px;font-size:0.83rem;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                        <span style="color:#64748b;">☁️ Drive (${file.name.replace(/Backup_(Auto|Manual)_/,'').replace(/_\d{8}_\d{6}\.json/,'')})</span>
                        <strong>${fmt(driveTime)}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between;">
                        <span style="color:#64748b;">💻 Este equipo</span>
                        <strong>${fmt(localTime)}</strong>
                    </div>
                </div>
                <div style="display:flex;gap:8px;">
                    <button id="drive-sync-ignore" style="padding:10px 14px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;cursor:pointer;font-size:0.82rem;font-weight:600;color:#94a3b8;">
                        Ignorar
                    </button>
                    <button id="drive-sync-local" style="flex:1;padding:10px;border-radius:8px;border:1.5px solid #e2e8f0;background:white;cursor:pointer;font-size:0.82rem;font-weight:600;color:#475569;">
                        💻 Este equipo
                    </button>
                    <button id="drive-sync-drive" style="flex:1;padding:10px;border-radius:8px;border:none;background:#2563eb;color:white;cursor:pointer;font-size:0.82rem;font-weight:600;">
                        ☁️ Cargar Drive
                    </button>
                </div>
            </div>`;

        document.body.appendChild(overlay);

        document.getElementById('drive-sync-ignore').onclick = () => {
            document.body.removeChild(overlay);
        };
        document.getElementById('drive-sync-local').onclick = () => {
            document.body.removeChild(overlay);
        };
        document.getElementById('drive-sync-drive').onclick = () => {
            document.body.removeChild(overlay);
            this._updateStatus('saving');
            this.loadFile(file.id,
                (data) => {
                    App.logic.saveSnapshot('Antes de cargar desde Drive');
                    App.data = { ...App.data, ...data };
                    App.data.fixedShifts = [
                        { id:"fixed_L", code:"L", desc:"Libre",        start:"", end:"", color:"#22c55e", fixed:true },
                        { id:"fixed_F", code:"F", desc:"Festivo",       start:"", end:"", color:"#22c55e", fixed:true },
                        { id:"fixed_R", code:"R", desc:"Recuperación",  start:"", end:"", color:"#22c55e", fixed:true },
                        { id:"fixed_V", code:"V", desc:"Vacaciones",    start:"", end:"", color:"#a855f7", fixed:true },
                        { id:"fixed_B", code:"B", desc:"Baja médica",   start:"", end:"", color:"#ef4444", fixed:true },
                        { id:"fixed_P", code:"P", desc:"Permiso",       start:"", end:"", color:"#ec4899", fixed:true }
                    ];
                    Safe.saveImmediate('v40_db', App.data);
                    this._saveConfig({ lastSave: new Date().toISOString(), lastLocal: new Date().toISOString() });
                    this._updateStatus('saved', this._formatTime(new Date()));
                    App.router.refreshCurrent();
                    this._showToast('✅ Datos cargados desde Drive');
                },
                () => { this._updateStatus('error', 'Error al cargar'); }
            );
        };
    },

    // ── Auto-guardado ─────────────────────────────────────────────────────
    _startAutoSave: function() {
        if (this._autoTimer) clearInterval(this._autoTimer);
        const mins = parseFloat(App.data.config?.backups?.autoIntervalMin) || 30;
        this._autoTimer = setInterval(() => {
            if (this._pendingSync && this.isConnected()) {
                this.save('Auto');
            }
        }, mins * 60 * 1000);
    },

    // Llamar esto cada vez que se modifiquen datos (hook desde Safe.save)
    markPending: function() {
        this._pendingSync = true;
        const now = new Date().toISOString();
        this._saveConfig({ lastLocal: now });
        this._updateStatus('pending');
    },

    // ── Backup preventivo ─────────────────────────────────────────────────
    savePreventivo: function(etiqueta) {
        if (!this.isConnected()) return;
        Safe.flush('v40_db');
        const storeName = (App.data.storeConfig?.nombre?.trim() || 'Tienda')
            .replace(/[^a-zA-Z0-9À-ɏ\s_-]/g, '').replace(/\s+/g, '_');
        const ts = App.io.getTimestamp();
        const type = 'PRE-' + etiqueta.toUpperCase();
        const filename = `Backup_${type}_${storeName}_${ts}.json`;
        const content = JSON.stringify(App.data, null, 2);
        this._getOrCreateFolder((folderId) => {
            this._uploadFile(filename, content, folderId,
                () => { this._showToast(`🛡 Backup preventivo guardado en Drive`); },
                () => { console.warn('[Drive] Error en backup preventivo:', etiqueta); }
            );
        });
    },

    // ── Upload multipart ──────────────────────────────────────────────────
    _uploadFile: function(filename, content, folderId, onSuccess, onError) {
        const metadata = { name: filename, parents: [folderId], mimeType: 'application/json' };
        const boundary = 'drive_boundary_314159265';
        const body = new Blob([
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
            JSON.stringify(metadata),
            `\r\n--${boundary}\r\nContent-Type: application/json\r\n\r\n`,
            content,
            `\r\n--${boundary}--`
        ]);

        fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this._accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: body
        })
        .then(r => r.ok ? r.json() : Promise.reject(r))
        .then(onSuccess)
        .catch(onError);
    },

    // ── Obtener/crear carpeta ─────────────────────────────────────────────
    _getOrCreateFolder: function(callback) {
        if (this._folderId) { callback(this._folderId); return; }

        // Buscar carpeta existente
        gapi.client.request({
            path: 'https://www.googleapis.com/drive/v3/files',
            params: {
                q: `mimeType='application/vnd.google-apps.folder' and name='${this.FOLDER_NAME}' and trashed=false`,
                fields: 'files(id,name)',
                pageSize: 1
            }
        }).then(resp => {
            const files = resp.result.files || [];
            if (files.length) {
                this._folderId = files[0].id;
                this._saveConfig({ folderId: this._folderId });
                callback(this._folderId);
            } else {
                // Crear carpeta
                fetch('https://www.googleapis.com/drive/v3/files', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this._accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        name: this.FOLDER_NAME,
                        mimeType: 'application/vnd.google-apps.folder'
                    })
                })
                .then(r => r.json())
                .then(folder => {
                    this._folderId = folder.id;
                    this._saveConfig({ folderId: this._folderId });
                    callback(this._folderId);
                });
            }
        });
    },

    // ── UI: indicador de estado ───────────────────────────────────────────
    _updateStatus: function(status, detail) {
        const el = document.getElementById('drive-status');
        if (!el) return;

        const states = {
            disconnected: { text: 'Drive',          color: '#94a3b8', dot: '#94a3b8', pulse: false },
            connected:    { text: 'Drive conectado', color: '#10b981', dot: '#10b981', pulse: false },
            pending:      { text: 'Drive: cambios pendientes', color: '#f59e0b', dot: '#f59e0b', pulse: false },
            saving:       { text: 'Guardando...',    color: '#3b82f6', dot: '#3b82f6', pulse: true  },
            saved:        { text: detail ? `Guardado ${detail}` : 'Guardado', color: '#10b981', dot: '#10b981', pulse: false },
            error:        { text: detail || 'Error Drive', color: '#ef4444', dot: '#ef4444', pulse: false }
        };

        const s = states[status] || states.disconnected;
        el.innerHTML = `
            <span style="width:7px;height:7px;border-radius:50%;background:${s.dot};flex-shrink:0;
                         ${s.pulse ? 'animation:drive-pulse 1s infinite;' : ''}"></span>
            <span style="font-size:0.72rem;color:${s.color};font-weight:600;">${s.text}</span>`;
    },

    _formatTime: function(d) {
        return d.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });
    },

    _showToast: function(msg) {
        const t = document.createElement('div');
        t.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1e293b;color:white;padding:12px 18px;border-radius:8px;font-size:0.83rem;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,0.3);transition:opacity 0.3s;';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 3000);
    },

    // ── Toggle panel expandible ───────────────────────────────────────────
    togglePanel: function() {
        const body   = document.getElementById('drive-panel-body');
        const toggle = document.getElementById('drive-panel-toggle');
        if (!body) return;
        const isOpen = body.style.display !== 'none';
        body.style.display   = isOpen ? 'none' : 'block';
        toggle.textContent   = isOpen ? '▼ Ver backups' : '▲ Ocultar';
        if (!isOpen) this._renderFileList();
    },

    // ── Renderizar lista de backups ───────────────────────────────────────
    _renderFileList: function() {
        const el = document.getElementById('drive-file-list');
        if (!el) return;
        el.innerHTML = '<div style="color:#94a3b8;font-size:0.78rem;padding:8px 0;">Cargando...</div>';

        this.listFiles((files) => {
            if (!files.length) {
                el.innerHTML = '<div style="color:#94a3b8;font-size:0.78rem;padding:8px 0;">No hay backups en Drive todavía.</div>';
                return;
            }
            const shown = files.slice(0, 4);
            const rest  = files.length - shown.length;
            const cfg   = this._loadConfig();
            const folderId = cfg.folderId || '';

            let html = shown.map(f => {
                const isAuto   = f.name.includes('_Auto_');
                const typeLabel = isAuto
                    ? '<span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:8px;font-size:0.68rem;font-weight:700;">Auto</span>'
                    : '<span style="background:#f3e8ff;color:#7c3aed;padding:1px 7px;border-radius:8px;font-size:0.68rem;font-weight:700;">Manual</span>';
                const date = new Date(f.createdTime).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'});
                const shortName = f.name.length > 42 ? f.name.slice(0,42) + '…' : f.name;
                return `<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;background:#f8fafc;border:1px solid #e2e8f0;">
                    ${typeLabel}
                    <span style="font-size:0.75rem;color:#64748b;white-space:nowrap;">${date}</span>
                    <span style="font-size:0.72rem;color:#94a3b8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${f.name}">${shortName}</span>
                    <button onclick="App.drive.confirmLoadBackup('${f.id}','${f.name.replace(/'/g,'')}')"
                        style="padding:3px 10px;border-radius:8px;border:1px solid #e2e8f0;background:white;color:#475569;font-size:0.7rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                        Cargar
                    </button>
                </div>`;
            }).join('');

            if (rest > 0) {
                html += `<button onclick="App.drive.openBackupModal()"
                    style="width:100%;margin-top:4px;padding:6px;border-radius:6px;border:1px dashed #cbd5e1;background:white;color:#2563eb;font-size:0.72rem;cursor:pointer;font-weight:600;">
                    + ${rest} más — Explorar todos los backups
                </button>`;
            }

            el.innerHTML = html;
        });
    },

    // ── Confirmar y cargar backup ─────────────────────────────────────────
    confirmLoadBackup: function(fileId, fileName) {
        if (!confirm(`¿Cargar el backup "${fileName}"?\n\nSe reemplazarán los datos actuales. Esta acción se puede deshacer con Ctrl+Z.`)) return;
        if (App.data.config?.backups?.preventivo?.cargarDrive !== false) App.drive.savePreventivo('CARGA');
        this._updateStatus('saving');
        this.loadFile(fileId,
            (data) => {
                App.logic.saveSnapshot('Antes de cargar backup desde Drive');
                App.data = { ...App.data, ...data };
                App.data.fixedShifts = [
                    { id:'fixed_L', code:'L', desc:'Libre',       start:'', end:'', color:'#22c55e', fixed:true },
                    { id:'fixed_F', code:'F', desc:'Festivo',      start:'', end:'', color:'#22c55e', fixed:true },
                    { id:'fixed_R', code:'R', desc:'Recuperación', start:'', end:'', color:'#22c55e', fixed:true },
                    { id:'fixed_V', code:'V', desc:'Vacaciones',   start:'', end:'', color:'#a855f7', fixed:true },
                    { id:'fixed_B', code:'B', desc:'Baja médica',  start:'', end:'', color:'#ef4444', fixed:true },
                    { id:'fixed_P', code:'P', desc:'Permiso',      start:'', end:'', color:'#ec4899', fixed:true }
                ];
                Safe.saveImmediate('v40_db', App.data);
                this._saveConfig({ lastLocal: new Date().toISOString() });
                this._updateStatus('saved', this._formatTime(new Date()));
                this._showToast(`✅ Backup cargado: ${fileName}`);
                App.router.refreshCurrent();
            },
            () => { this._updateStatus('error', 'Error al cargar'); }
        );
    },

    // ── Cambiar carpeta de Drive ──────────────────────────────────────────
    promptChangeFolder: function() {
        const current = this._loadConfig().folderName || this.FOLDER_NAME;
        const newName = prompt('Nombre de la carpeta en Drive:', current);
        if (!newName || !newName.trim() || newName.trim() === current) return;
        // Resetear folderId para que se cree/busque la nueva carpeta
        this.FOLDER_NAME = newName.trim();
        this._folderId   = null;
        this._saveConfig({ folderName: newName.trim(), folderId: null });
        const el = document.getElementById('drive-folder-name');
        if (el) el.textContent = newName.trim();
        this._showToast(`📁 Carpeta cambiada a "${newName.trim()}". Se usará en el próximo guardado.`);
    },


    // ── Modal de todos los backups con filtros ────────────────────────────
    openBackupModal: function() {
        // Crear overlay
        const overlay = document.createElement('div');
        overlay.id = 'drive-backup-modal';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
        overlay.innerHTML = `
            <div style="background:white;border-radius:12px;width:90%;max-width:620px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="padding:18px 20px 14px;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
                    <h3 style="margin:0;font-size:1rem;">☁️ Backups en Drive</h3>
                    <button onclick="document.getElementById('drive-backup-modal').remove()"
                        style="background:none;border:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;padding:0 4px;">✕</button>
                </div>
                <!-- Filtros -->
                <div style="padding:12px 20px;border-bottom:1px solid #f1f5f9;display:flex;gap:8px;flex-wrap:wrap;flex-shrink:0;">
                    <select id="bm-filter-type" onchange="App.drive._applyBackupFilters()"
                        style="padding:5px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:0.78rem;color:#475569;">
                        <option value="">Todos los tipos</option>
                        <option value="Manual">Manual</option>
                        <option value="Auto">Auto</option>
                    </select>
                    <select id="bm-filter-period" onchange="App.drive._applyBackupFilters()"
                        style="padding:5px 10px;border-radius:6px;border:1px solid #e2e8f0;font-size:0.78rem;color:#475569;">
                        <option value="">Cualquier fecha</option>
                        <option value="7">Últimos 7 días</option>
                        <option value="30">Último mes</option>
                        <option value="90">Últimos 3 meses</option>
                        <option value="365">Último año</option>
                    </select>
                    <span id="bm-count" style="font-size:0.75rem;color:#94a3b8;align-self:center;margin-left:auto;"></span>
                </div>
                <!-- Lista -->
                <div id="bm-list" style="overflow-y:auto;flex:1;padding:10px 20px;">
                    <div style="color:#94a3b8;font-size:0.82rem;padding:20px 0;text-align:center;">Cargando...</div>
                </div>
            </div>`;
        document.body.appendChild(overlay);
        // Cerrar al clicar fuera
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
        // Cargar todos los archivos
        this.listFiles((files) => {
            this._backupModalFiles = files;
            this._applyBackupFilters();
        });
    },

    _backupModalFiles: [],

    _applyBackupFilters: function() {
        const typeEl   = document.getElementById('bm-filter-type');
        const periodEl = document.getElementById('bm-filter-period');
        const listEl   = document.getElementById('bm-list');
        const countEl  = document.getElementById('bm-count');
        if (!listEl) return;

        const type   = typeEl   ? typeEl.value   : '';
        const period = periodEl ? parseInt(periodEl.value) : 0;
        const cutoff = period ? new Date(Date.now() - period * 86400000) : null;

        let files = this._backupModalFiles || [];
        if (type)   files = files.filter(f => f.name.includes('_' + type + '_'));
        if (cutoff) files = files.filter(f => new Date(f.createdTime) >= cutoff);

        if (countEl) countEl.textContent = files.length + ' backup' + (files.length !== 1 ? 's' : '');

        if (!files.length) {
            listEl.innerHTML = '<div style="color:#94a3b8;font-size:0.82rem;padding:20px 0;text-align:center;">No hay backups con estos filtros.</div>';
            return;
        }

        listEl.innerHTML = files.map(f => {
            const isAuto = f.name.includes('_Auto_');
            const pill = isAuto
                ? '<span style="background:#dbeafe;color:#1e40af;padding:1px 7px;border-radius:8px;font-size:0.68rem;font-weight:700;flex-shrink:0;">Auto</span>'
                : '<span style="background:#f3e8ff;color:#7c3aed;padding:1px 7px;border-radius:8px;font-size:0.68rem;font-weight:700;flex-shrink:0;">Manual</span>';
            const date = new Date(f.createdTime).toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'});
            const shortName = f.name.length > 44 ? f.name.slice(0,44) + '…' : f.name;
            return `<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;border:1px solid #f1f5f9;margin-bottom:4px;">
                ${pill}
                <div style="flex:1;min-width:0;">
                    <div style="font-size:0.75rem;color:#1e293b;font-weight:600;">${date}</div>
                    <div style="font-size:0.68rem;color:#94a3b8;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${f.name}">${shortName}</div>
                </div>
                <button onclick="document.getElementById('drive-backup-modal').remove();App.drive.confirmLoadBackup('${f.id}','${f.name.replace(/'/g,'')}')"
                    style="padding:4px 12px;border-radius:6px;border:1px solid #e2e8f0;background:white;color:#475569;font-size:0.72rem;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                    Cargar
                </button>
            </div>`;
        }).join('');
    },


    // ── Guardado modular (con selección de módulos) ───────────────────────
    saveModular: function() {
        if (!this.isConnected()) {
            alert('Conecta primero con Google Drive.');
            return;
        }
        Safe.flush('v40_db');

        const exportData = {
            meta: { ver: App.data.meta.ver, type: 'modular', timestamp: new Date().toISOString() }
        };

        const get = (id) => { const el = document.getElementById(id); return el ? el.checked : true; };
        if (get('cb-drv-team'))     exportData.empleados = App.data.empleados;
        if (get('cb-drv-shifts'))   { exportData.shiftDefs = App.data.shiftDefs; exportData.fixedShifts = App.data.fixedShifts; }
        if (get('cb-drv-schedule')) { exportData.schedule = App.data.schedule; exportData.requests = App.data.requests; exportData.recurringRequests = App.data.recurringRequests || []; exportData.lockedDays = App.data.lockedDays || {}; exportData.eventos = App.data.eventos || []; }
        exportData.storeConfig = {};
        if (get('cb-drv-config'))   { exportData.storeConfig.nombre = App.data.storeConfig.nombre || ''; exportData.storeConfig.base = App.data.storeConfig.base; exportData.config = App.data.config; }
        if (get('cb-drv-holidays')) exportData.storeConfig.holidays = App.data.storeConfig.holidays;
        if (get('cb-drv-special'))  exportData.storeConfig.special  = App.data.storeConfig.special;

        const storeName = (App.data.storeConfig?.nombre?.trim() || 'Tienda')
            .replace(/[^a-zA-Z0-9À-ɏ\s_-]/g, '').replace(/\s+/g, '_');
        const ts       = App.io.getTimestamp();
        const filename = `Backup_Manual_${storeName}_${ts}.json`;
        const content  = JSON.stringify(exportData, null, 2);

        this._updateStatus('saving');
        this._getOrCreateFolder((folderId) => {
            this._uploadFile(filename, content, folderId,
                () => {
                    this._pendingSync = false;
                    const now = new Date().toISOString();
                    this._saveConfig({ lastSave: now, folderId });
                    this._updateStatus('saved', this._formatTime(new Date()));
                    this._showToast(`✅ Guardado en Drive: ${filename}`);
                    App.router.refreshCurrent();
                },
                (err) => {
                    console.error('[Drive] Error al subir:', err);
                    this._updateStatus('error', 'Error al guardar');
                    alert('Error al guardar en Drive.');
                }
            );
        });
    },

};
