// ============================================================
// VERSIÓN MÓVIL — interfaz ligera de consulta
// Reutiliza toda la capa de lógica/datos (App.data, App.logic,
// App.llaves, Utils, Safe, App.drive). NO carga la UI de escritorio.
//
// Arranque: core/data.js init() detecta window.__PLANNER_MOBILE__
// y llama a App.mobile.init() en vez del router de escritorio.
//
// Pantallas:
//   📅 Horarios de un día — orden = vista principal, rejilla de barras,
//      libranzas ocultas por defecto.
//   🔑 Llaves — réplica del panel lateral de escritorio (titulares,
//      cobertura, rejilla TAG3 con próximos) + alta de traspasos.
// ============================================================

App.mobile = {

    _state: { tab: 'horarios', date: null, llavesDate: null, showLibran: false, trLlaveId: null, trReceptorId: '__TIENDA__', movPrevOpen: false },

    DIAS_LARGO: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
    DIAS_CORTO: ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá'],
    MESES: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],

    // ─── HELPERS DE FECHA ────────────────────────────────────────────────────
    _todayISO: function() {
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    _shiftDate: function(iso, delta) {
        const d = new Date(iso + 'T12:00:00');
        d.setDate(d.getDate() + delta);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },
    _dow: function(iso) { return new Date(iso + 'T12:00:00').getDay(); },
    _parseMin: function(t) {
        if (!t || typeof t !== 'string' || t.indexOf(':') < 0) return null;
        const p = t.split(':');
        return parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    },
    _empNombre: function(id) {
        if (!id || id === '__TIENDA__') return 'Tienda';
        return (App.data.empleados.find(e => e.id === id) || {}).nombre || id;
    },

    // Empleados en el MISMO orden que la vista principal (vigentes en la fecha
    // o con turno ese día), ordenados por customOrder.
    _empListOrdenada: function(fecha) {
        const daySched = App.data.schedule[fecha] || {};
        return App.data.empleados
            .filter(e => Utils.empleadoVigenteEnFecha(e, fecha) || daySched[e.id] !== undefined)
            .sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));
    },

    // ─── ARRANQUE ─────────────────────────────────────────────────────────────
    init: function() {
        const hoy = this._todayISO();
        this._state.date = hoy;
        this._state.llavesDate = hoy;

        // El router de escritorio no existe en móvil: redirigir sus hooks a
        // nuestro render para que los callbacks de Drive re-rendericen aquí.
        if (App.router) {
            App.router.refreshCurrent = () => this.render();
            App.router.go = () => this.render();
            App.router.current = () => 'mobile';
        }

        // App.io vive inline en index.html (no se carga en móvil): definimos lo
        // mínimo que la capa de Drive necesita (timestamp para auto-guardado).
        if (!App.io) App.io = {};
        if (!App.io.getTimestamp) {
            App.io.getTimestamp = function() {
                const now = new Date();
                return now.toISOString().slice(0, 10).replace(/-/g, '') + '_' + now.toTimeString().slice(0, 8).replace(/:/g, '');
            };
        }

        this._buildShell();
        this.render();
    },

    _buildShell: function() {
        document.body.innerHTML = '';
        document.body.style.cssText = 'margin:0;padding:0;background:#f1f5f9;-webkit-tap-highlight-color:transparent;';

        const app = document.createElement('div');
        app.id = 'm-app';
        app.style.cssText = 'display:flex;flex-direction:column;height:100vh;height:100dvh;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;';
        app.innerHTML =
            '<header id="m-top" style="flex:0 0 auto;background:#1e293b;color:#f8fafc;padding:12px 16px;display:flex;align-items:center;justify-content:space-between;box-shadow:0 1px 6px rgba(0,0,0,0.15);">' +
                '<span style="font-size:1.02rem;font-weight:700;letter-spacing:0.01em;">Planificador</span>' +
                '<button id="m-drive-btn" onclick="App.mobile.driveTap()" style="display:inline-flex;align-items:center;gap:6px;background:#334155;color:#e2e8f0;border:none;border-radius:20px;padding:7px 14px;font-size:0.8rem;font-weight:600;cursor:pointer;">☁︎ <span id="m-drive-label">Drive</span></button>' +
            '</header>' +
            '<main id="m-content" style="flex:1 1 auto;overflow-y:auto;-webkit-overflow-scrolling:touch;padding:14px 14px 24px;box-sizing:border-box;"></main>' +
            '<nav id="m-tabs" style="flex:0 0 auto;display:flex;background:white;border-top:1px solid #e2e8f0;box-shadow:0 -1px 6px rgba(0,0,0,0.06);"></nav>';
        document.body.appendChild(app);
        this._renderTabs();
        this._updateDriveBtn();
    },

    _renderTabs: function() {
        const nav = document.getElementById('m-tabs');
        if (!nav) return;
        const tabs = [
            { key: 'horarios', label: 'Horarios', icon: '📅' },
            { key: 'llaves', label: 'Llaves', icon: '🔑' }
        ];
        nav.innerHTML = tabs.map(t => {
            const active = this._state.tab === t.key;
            return '<button onclick="App.mobile.setTab(\'' + t.key + '\')" ' +
                'style="flex:1;background:none;border:none;padding:10px 0 12px;cursor:pointer;' +
                'display:flex;flex-direction:column;align-items:center;gap:3px;' +
                'color:' + (active ? '#2563eb' : '#94a3b8') + ';' +
                'border-top:2px solid ' + (active ? '#2563eb' : 'transparent') + ';margin-top:-1px;">' +
                '<span style="font-size:1.15rem;line-height:1;">' + t.icon + '</span>' +
                '<span style="font-size:0.7rem;font-weight:700;">' + t.label + '</span>' +
            '</button>';
        }).join('');
    },

    setTab: function(tab) {
        this._state.tab = tab;
        this._renderTabs();
        this.render();
        const c = document.getElementById('m-content');
        if (c) c.scrollTop = 0;
    },

    render: function() {
        const c = document.getElementById('m-content');
        if (!c) return;
        if (this._state.tab === 'horarios') c.innerHTML = this._renderHorarios();
        else if (this._state.tab === 'llaves') c.innerHTML = this._renderLlaves();
        this._updateDriveBtn();
    },

    // Stepper de fecha — kind: 'h' (horarios) | 'l' (llaves)
    // Navega por días (‹ ›) y semanas (« »), con desplegable para saltar a una semana.
    _stepper: function(iso, kind) {
        const esHoy = iso === this._todayISO();
        const label = this.DIAS_LARGO[this._dow(iso)] + ', ' + Utils.formatDateES(iso);
        const wk = Utils.getWeekCode(iso);
        const btn = (txt, call, title) =>
            '<button onclick="App.mobile.' + call + '" title="' + title + '" style="flex:0 0 auto;width:38px;height:44px;border-radius:10px;border:1px solid #e2e8f0;background:white;font-size:1.15rem;color:#334155;cursor:pointer;">' + txt + '</button>';
        const navRow =
            '<div style="display:flex;align-items:center;gap:5px;margin-bottom:8px;">' +
                btn('«', "navWeek('" + kind + "',-1)", 'Semana anterior') +
                btn('‹', "navDay('" + kind + "',-1)", 'Día anterior') +
                '<div style="flex:1 1 auto;min-width:0;text-align:center;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:6px 4px;">' +
                    '<div style="font-size:0.9rem;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>' +
                    (esHoy ? '<div style="font-size:0.66rem;font-weight:700;color:#2563eb;">' + wk + ' · HOY</div>'
                           : '<button onclick="App.mobile.navToday(\'' + kind + '\')" style="font-size:0.66rem;font-weight:700;color:#94a3b8;background:none;border:none;cursor:pointer;padding:0;">' + wk + ' · ir a hoy</button>') +
                '</div>' +
                btn('›', "navDay('" + kind + "',1)", 'Día siguiente') +
                btn('»', "navWeek('" + kind + "',1)", 'Semana siguiente') +
            '</div>';
        const sel =
            '<select onchange="App.mobile.navJumpWeek(\'' + kind + '\',this.value)" ' +
                'style="width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #e2e8f0;border-radius:10px;font-size:0.82rem;background:white;color:#334155;font-weight:600;-webkit-appearance:none;appearance:none;">' +
                this._weekOptions(iso) +
            '</select>';
        return '<div style="margin-bottom:12px;">' + navRow + sel + '</div>';
    },

    // Opciones del desplegable de semanas: cubre el rango con datos (schedule +
    // traspasos) y, como mínimo, una ventana alrededor de hoy.
    _weekOptions: function(currentIso) {
        const curMon = Utils.getMonday(currentIso + 'T12:00:00');
        const today = this._todayISO();
        let minD = today, maxD = today;
        const consider = (d) => { if (d && d.length === 10) { if (d < minD) minD = d; if (d > maxD) maxD = d; } };
        Object.keys(App.data.schedule || {}).forEach(consider);
        (App.data.traspasoLlaves || []).forEach(t => consider(t.fecha));
        consider(currentIso);
        const back = this._shiftDate(today, -8 * 7); if (back < minD) minD = back;
        const fwd = this._shiftDate(today, 16 * 7); if (fwd > maxD) maxD = fwd;
        let mon = Utils.getMonday(minD + 'T12:00:00');
        const lastMon = Utils.getMonday(maxD + 'T12:00:00');
        const f = (iso) => { const p = iso.split('-'); return p[2] + '/' + p[1]; };
        let out = '', guard = 0;
        while (mon <= lastMon && guard < 500) {
            const sun = this._shiftDate(mon, 6);
            out += '<option value="' + mon + '"' + (mon === curMon ? ' selected' : '') + '>' +
                Utils.getWeekCode(mon) + ' · ' + f(mon) + '–' + f(sun) + '</option>';
            mon = this._shiftDate(mon, 7);
            guard++;
        }
        return out;
    },

    // ─── PANTALLA: HORARIOS DE UN DÍA ─────────────────────────────────────────
    _renderHorarios: function() {
        const fecha = this._state.date;
        const horario = App.logic._getHorarioDelDia(fecha);
        const abierta = !!(horario && !horario.closed);
        const llavesActivo = !!App.data.config.llavesActivo;
        const llaves = App.data.config.llaves || [];

        const stepper = this._stepper(fecha, 'h');

        // Empleados en orden de la vista principal, clasificados
        const ordenada = this._empListOrdenada(fecha);
        const trabajan = [];
        const libran = [];
        ordenada.forEach(emp => {
            const shift = Utils.getShift((App.data.schedule[fecha] || {})[emp.id]);
            if (shift && !shift.fixed && shift.start && shift.end) trabajan.push({ emp, shift });
            else libran.push({ emp, shift });
        });

        // Marcador de llave (sin letras A/C: la cobertura va en los contadores)
        const keyMarkers = (empId) => {
            if (!llavesActivo) return '';
            const tiene = llaves.some(l => App.logic.getTitularLlave(l.id, fecha) === empId);
            return tiene ? '<span title="Tiene la llave" style="font-size:0.9rem;">🔑</span>' : '';
        };

        if (trabajan.length === 0) {
            return stepper +
                '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:24px 0;">Nadie con turno este día.</div>' +
                this._libranBlock(libran);
        }

        // ── Rejilla de barras ────────────────────────────────────────────────
        // Span horario: del inicio más temprano al fin más tardío (mín. horario tienda)
        let minStart = 24 * 60, maxEnd = 0;
        trabajan.forEach(({ shift }) => {
            const s = this._parseMin(shift.start), e = this._parseMin(shift.end);
            if (s != null && s < minStart) minStart = s;
            if (e != null && e > maxEnd) maxEnd = e;
        });
        if (abierta) {
            const so = this._parseMin(horario.open), sc = this._parseMin(horario.close);
            if (so != null && so < minStart) minStart = so;
            if (sc != null && sc > maxEnd) maxEnd = sc;
        }
        const spanStart = Math.floor(minStart / 60) * 60;
        const spanEnd = Math.ceil(maxEnd / 60) * 60;
        const spanTotal = Math.max(60, spanEnd - spanStart);
        const horas = spanTotal / 60;
        const pct = (min) => ((min - spanStart) / spanTotal) * 100;

        const KEY_W = '22px';
        const NAME_W = '92px';
        const LEFT_LABEL = '122px'; // KEY_W (22) + gap (8) + NAME_W (92)
        const TRACK_LEFT = '130px'; // LEFT_LABEL (122) + gap (8): origen de la zona de pista

        // Hora valle: línea de referencia más marcada en su inicio y fin
        const valleBolsa = parseFloat(App.data.config.valleBolsa) || 0;
        const vS = this._parseMin(App.data.config.valleStart || '14:00');
        const vE = this._parseMin(App.data.config.valleEnd || '17:00');
        const showValle = valleBolsa > 0 && vS != null && vE != null;
        const valleLines = !showValle ? '' :
            [vS, vE].filter(v => v >= spanStart && v <= spanEnd).map(v =>
                '<div style="position:absolute;top:0;bottom:0;left:' + pct(v) + '%;width:0;border-left:2px dashed rgba(59,130,246,0.55);"></div>'
            ).join('');
        const valleOverlay = valleLines
            ? '<div style="position:absolute;top:0;bottom:0;left:' + TRACK_LEFT + ';right:0;pointer-events:none;z-index:2;">' + valleLines + '</div>'
            : '';

        // Cabecera de horas
        let hourLabels = '';
        for (let h = spanStart; h <= spanEnd; h += 60) {
            const isEdge = h === spanStart;
            hourLabels += '<span style="position:absolute;left:' + pct(h) + '%;transform:translateX(' + (isEdge ? '0' : '-50%') + ');font-size:0.6rem;color:#94a3b8;font-variant-numeric:tabular-nums;">' + String(h / 60).padStart(2, '0') + '</span>';
        }
        // Fondo de rejilla (una línea por hora)
        const gridBg = 'background-image:repeating-linear-gradient(to right,#eef2f7 0,#eef2f7 1px,transparent 1px,transparent calc(100%/' + horas + '));';

        const barRows = trabajan.map(({ emp, shift }) => {
            const color = shift.color || '#6b7280';
            const s = this._parseMin(shift.start), e = this._parseMin(shift.end);
            const left = pct(s), width = Math.max(1.5, pct(e) - pct(s));
            const horasTxt = shift.start + '–' + shift.end;
            const esTag3 = ['MNG', 'AM', 'SPV'].includes(Utils.getRolEnFecha(emp, fecha));
            const rowBg = esTag3 ? 'background:rgba(250,204,21,0.12);' : '';
            // Descanso (si el turno lo define) como hueco claro sobre la barra
            let breakHtml = '';
            const bs = this._parseMin(shift.breakStart), be = this._parseMin(shift.breakEnd);
            if (bs != null && be != null && be > bs) {
                breakHtml = '<div style="position:absolute;top:0;bottom:0;left:' + pct(bs) + '%;width:' + (pct(be) - pct(bs)) + '%;background:#f1f5f9;opacity:0.85;"></div>';
            }
            const mk = keyMarkers(emp.id);
            return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;border-radius:6px;' + rowBg + '">' +
                    '<div style="flex:0 0 ' + KEY_W + ';width:' + KEY_W + ';text-align:center;line-height:1;">' + mk + '</div>' +
                    '<div style="flex:0 0 ' + NAME_W + ';width:' + NAME_W + ';overflow:hidden;">' +
                        '<div style="font-size:0.8rem;font-weight:700;color:#1e293b;white-space:nowrap;text-overflow:ellipsis;overflow:hidden;">' + emp.nombre + '</div>' +
                        '<span style="font-size:0.66rem;color:' + color + ';font-weight:700;font-variant-numeric:tabular-nums;">' + horasTxt + '</span>' +
                    '</div>' +
                    '<div style="position:relative;flex:1 1 auto;height:22px;border-radius:5px;border:1px solid #e2e8f0;' + gridBg + '">' +
                        '<div style="position:absolute;top:2px;bottom:2px;left:' + left + '%;width:' + width + '%;background:' + color + ';border-radius:4px;box-shadow:0 1px 2px rgba(0,0,0,0.12);"></div>' +
                        breakHtml +
                    '</div>' +
                '</div>';
        }).join('');

        // ── Contadores de cobertura (chivato) — Tag 3 y Total, por franjas 30' ──
        const nSlots = spanTotal / 30;
        const openMin = abierta ? this._parseMin(horario.open) : null;
        const closeMin = abierta ? this._parseMin(horario.close) : null;
        const tag3Style = (n, open) => {
            if (!open) return 'background:#f8fafc;color:#cbd5e1;';
            if (n === 0) return 'background:#fee2e2;color:#dc2626;';
            if (n === 1) return 'background:#dcfce7;color:#16a34a;';
            if (n === 2) return 'background:#bbf7d0;color:#15803d;';
            return 'background:#fef08a;color:#854d0e;'; // ≥3
        };
        const totalStyle = (n, open) => {
            if (!open) return 'background:#f8fafc;color:#cbd5e1;';
            if (n <= 1) return 'background:#ffffff;color:#ef4444;';
            const level = Math.min(n, 10), intensity = (level - 2) / 8;
            const r = Math.round(224 - 221 * intensity), g = Math.round(242 - 137 * intensity), b = Math.round(254 - 93 * intensity);
            return 'background:rgb(' + r + ',' + g + ',' + b + ');color:' + (intensity > 0.5 ? '#ffffff' : '#0c4a6e') + ';';
        };
        let tag3Cells = '', totalCells = '';
        for (let i = 0; i < nSlots; i++) {
            const slotMin = spanStart + i * 30;
            const open = abierta && openMin != null && slotMin >= openMin && slotMin < closeMin;
            const st = App.logic.calcCoverage(fecha, slotMin);
            const cellBase = 'flex:1 1 0;min-width:0;text-align:center;font-size:0.55rem;font-weight:700;line-height:16px;height:16px;font-variant-numeric:tabular-nums;border-right:1px solid rgba(255,255,255,0.5);';
            tag3Cells += '<div style="' + cellBase + tag3Style(st.tag3, open) + '">' + (open || st.tag3 ? st.tag3 : '') + '</div>';
            totalCells += '<div style="' + cellBase + totalStyle(st.total, open) + '">' + (open || st.total ? st.total : '') + '</div>';
        }
        const counterRow = (label, cells) =>
            '<div style="display:flex;align-items:center;gap:8px;margin-top:4px;">' +
                '<div style="flex:0 0 ' + LEFT_LABEL + ';width:' + LEFT_LABEL + ';font-size:0.62rem;font-weight:700;color:#64748b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + label + '</div>' +
                '<div style="display:flex;flex:1 1 auto;border-radius:4px;overflow:hidden;border:1px solid #e2e8f0;">' + cells + '</div>' +
            '</div>';
        const countersHtml =
            '<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f1f5f9;">' +
                counterRow('🔑 Tag 3', tag3Cells) +
                counterRow('👥 Total', totalCells) +
            '</div>';

        const barsSection =
            '<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:12px 12px 14px;margin-bottom:14px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
                    '<div style="flex:0 0 ' + LEFT_LABEL + ';width:' + LEFT_LABEL + ';font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;">Trabajan (' + trabajan.length + ')</div>' +
                    '<div style="position:relative;flex:1 1 auto;height:14px;">' + hourLabels + '</div>' +
                '</div>' +
                '<div style="position:relative;">' + valleOverlay + barRows + countersHtml + '</div>' +
            '</div>';

        return stepper + barsSection + this._libranBlock(libran);
    },

    // Bloque de libranzas — oculto por defecto, con botón para mostrar
    _libranBlock: function(libran) {
        if (!libran.length) return '';
        const btn = '<button onclick="App.mobile.toggleLibran()" style="width:100%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:10px;font-size:0.78rem;font-weight:700;color:#64748b;cursor:pointer;">' +
            (this._state.showLibran ? '▲ Ocultar libranzas / ausencias' : '▼ Ver libranzas / ausencias (' + libran.length + ')') + '</button>';
        if (!this._state.showLibran) return btn;
        const chips = libran.map(({ emp, shift }) => {
            const code = shift && shift.code ? shift.code : 'L';
            const color = shift && shift.color ? shift.color : '#94a3b8';
            return '<span style="display:inline-flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:4px 9px 4px 5px;font-size:0.78rem;color:#475569;">' +
                '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:4px;background:' + color + ';color:#fff;font-size:0.62rem;font-weight:800;">' + code + '</span>' +
                emp.nombre + '</span>';
        }).join('');
        return btn + '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;">' + chips + '</div>';
    },

    toggleLibran: function() { this._state.showLibran = !this._state.showLibran; this.render(); },

    // ── Navegación genérica (kind: 'h' horarios | 'l' llaves) ────────────────
    _navField: function(kind) { return kind === 'l' ? 'llavesDate' : 'date'; },
    navDay: function(kind, delta) { const f = this._navField(kind); this._state[f] = this._shiftDate(this._state[f], delta); this.render(); },
    navWeek: function(kind, delta) { const f = this._navField(kind); this._state[f] = this._shiftDate(this._state[f], delta * 7); this.render(); },
    navToday: function(kind) { this._state[this._navField(kind)] = this._todayISO(); this.render(); },
    navJumpWeek: function(kind, mondayIso) {
        if (!mondayIso) return;
        const f = this._navField(kind);
        const cur = this._state[f];
        const curMon = Utils.getMonday(cur + 'T12:00:00');
        const offset = Math.round((new Date(cur + 'T12:00:00') - new Date(curMon + 'T12:00:00')) / 86400000);
        this._state[f] = this._shiftDate(mondayIso, offset);
        this.render();
    },

    // ─── PANTALLA: LLAVES (réplica del panel lateral + alta de traspaso) ──────
    _renderLlaves: function() {
        if (!App.data.config.llavesActivo) {
            return '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px 16px;">La gestión de llaves no está activada.</div>';
        }
        const llaves = App.data.config.llaves || [];
        if (!llaves.length) {
            return '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:40px 16px;">No hay llaves configuradas.</div>';
        }

        const fecha = this._state.llavesDate;
        const horario = App.logic._getHorarioDelDia(fecha);
        const abierta = !!(horario && !horario.closed);

        const stepper = this._stepper(fecha, 'l');

        // Cobertura apertura/cierre — una mini llave por cada llave que la cubre (como escritorio)
        let coverageHtml = '';
        if (abierta) {
            const cov = App.logic._checkKeysCoverageDay(fecha);
            if (cov) {
                const daySched = App.data.schedule[fecha] || {};
                const cuentaCobertura = (tipo) => llaves.filter(l => {
                    const tid = tipo === 'open'
                        ? (App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, fecha) : App.logic.getTitularLlave(l.id, fecha))
                        : App.logic.getTitularLlave(l.id, fecha);
                    if (!tid || tid === '__TIENDA__') return false;
                    const sh = Utils.getShift(daySched[tid]);
                    if (!sh || sh.fixed) return false;
                    return tipo === 'open' ? sh.start <= horario.open : sh.end >= horario.close;
                }).length;
                const KEY_MINI = '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#15803d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/></svg>';
                const side = (ok, txt, n) => {
                    const badge = '<span style="display:inline-flex;align-items:center;gap:4px;border-radius:6px;padding:3px 9px;font-size:0.72rem;font-weight:700;' +
                        (ok ? 'background:#dcfce7;color:#15803d;">✓ ' : 'background:#fee2e2;color:#dc2626;">✕ ') + txt + '</span>';
                    const keys = (ok && n > 0) ? '<div style="margin-top:3px;display:flex;justify-content:center;gap:1px;">' + KEY_MINI.repeat(n) + '</div>' : '';
                    return '<div style="text-align:center;">' + badge + keys + '</div>';
                };
                coverageHtml = '<div style="display:flex;justify-content:center;gap:14px;margin-bottom:12px;">' +
                    side(cov.hasApertura, 'Apertura', cuentaCobertura('open')) +
                    side(cov.hasCierre, 'Cierre', cuentaCobertura('close')) + '</div>';
            }
        }

        // Rejilla TAG3 + próximos 5 días
        const tag3 = App.data.empleados
            .filter(e => e.active !== false && ['MNG', 'AM', 'SPV'].includes(Utils.getRolEnFecha(e, fecha)))
            .sort((a, b) => (a.customOrder || 0) - (b.customOrder || 0));

        const dObj = new Date(fecha + 'T12:00:00');
        const futuros = [];
        for (let i = 1; i <= 5; i++) { const fd = new Date(dObj); fd.setDate(fd.getDate() + i); futuros.push(fd.getFullYear() + '-' + String(fd.getMonth() + 1).padStart(2, '0') + '-' + String(fd.getDate()).padStart(2, '0')); }

        const dayInfo = (empId, d) => {
            const horD = App.logic._getHorarioDelDia(d);
            const openD = !!(horD && !horD.closed);
            const sv = (App.data.schedule[d] || {})[empId];
            const sh = sv ? Utils.getShift(sv) : null;
            const isFixed = !!(sh && sh.fixed);
            const isWorking = !!sv && !isFixed;
            return {
                isLibre: !sv || isFixed,
                code: sh ? (sh.code || '') : '',
                opens: openD && isWorking && App.llaves._esOpener(empId, d),
                closes: openD && isWorking && App.llaves._esCloser(empId, d)
            };
        };

        const keyCell = (empId, d) => {
            const tras = App.data.traspasoLlaves || [];
            const entrega = tras.some(t => t.dadorId === empId && t.fecha === d);
            const recibe = tras.some(t => t.receptorId === empId && t.dadorId != null && t.fecha === d);
            const tiene = llaves.some(l => App.logic.getTitularLlave(l.id, d) === empId);
            if (entrega) return '🔑→';
            if (recibe) return '→🔑';
            if (tiene) return '🔑';
            return '';
        };

        const thS = 'padding:3px 2px;text-align:center;font-size:0.6rem;font-weight:700;color:#94a3b8;border-bottom:2px solid #e2e8f0;white-space:nowrap;';
        const tdS = 'padding:4px 2px;text-align:center;border-bottom:1px solid #f1f5f9;font-size:0.72rem;';
        const futHead = futuros.map(fd => { const fo = new Date(fd + 'T12:00:00'); return '<th style="' + thS + '">' + this.DIAS_CORTO[fo.getDay()] + '<br>' + fo.getDate() + '</th>'; }).join('');

        const rows = tag3.map(emp => {
            const info = dayInfo(emp.id, fecha);
            const kc = keyCell(emp.id, fecha);
            const libreCell = info.isLibre ? '<span style="display:inline-block;padding:1px 5px;background:#dcfce7;color:#16a34a;border-radius:4px;font-weight:700;">' + (info.code || 'L') + '</span>' : '';
            const abreCell = info.opens ? '<span style="display:inline-block;padding:1px 5px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-weight:800;">A</span>' : '';
            const cierraCell = info.closes ? '<span style="display:inline-block;padding:1px 5px;background:#fef9c3;color:#854d0e;border-radius:4px;font-weight:800;">C</span>' : '';
            const futCells = futuros.map(fd => {
                const fi = dayInfo(emp.id, fd);
                let c = '';
                if (fi.isLibre) c = '<span style="color:#16a34a;font-weight:600;">' + (fi.code || 'L') + '</span>';
                else {
                    const parts = [];
                    if (fi.opens) parts.push('<span style="color:#1d4ed8;font-weight:800;">A</span>');
                    if (fi.closes) parts.push('<span style="color:#854d0e;font-weight:800;">C</span>');
                    c = parts.length ? parts.join(' ') : '<span style="color:#cbd5e1;">·</span>';
                }
                return '<td style="' + tdS + '">' + c + '</td>';
            }).join('');
            return '<tr>' +
                '<td style="padding:4px 4px 4px 2px;font-size:0.74rem;font-weight:600;color:#1e293b;white-space:nowrap;border-bottom:1px solid #f1f5f9;">' + emp.nombre + '</td>' +
                '<td style="' + tdS + 'white-space:nowrap;">' + kc + '</td>' +
                '<td style="' + tdS + '">' + libreCell + '</td>' +
                '<td style="' + tdS + '">' + abreCell + '</td>' +
                '<td style="' + tdS + '">' + cierraCell + '</td>' +
                '<td style="width:2px;background:#e2e8f0;padding:0;"></td>' +
                futCells +
            '</tr>';
        }).join('');

        const gridSection =
            '<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:10px;margin-bottom:14px;overflow-x:auto;">' +
                '<div style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin-bottom:6px;">Equipo TAG3</div>' +
                '<table style="border-collapse:collapse;min-width:100%;">' +
                    '<thead><tr>' +
                        '<th style="' + thS + 'text-align:left;"></th>' +
                        '<th style="' + thS + '">🔑</th><th style="' + thS + '">LIBRA</th><th style="' + thS + '">ABRE</th><th style="' + thS + '">CIERRA</th>' +
                        '<th style="width:2px;padding:0;background:#e2e8f0;"></th>' +
                        futHead +
                    '</tr></thead><tbody>' + rows + '</tbody>' +
                '</table>' +
            '</div>';

        // ── Formulario: nuevo traspaso ────────────────────────────────────────
        if (!this._state.trLlaveId) this._state.trLlaveId = llaves[0].id;
        const llaveOpts = llaves.map((l, idx) => {
            const tid = App.logic.getTitularLlave(l.id, fecha);
            const lbl = 'L' + (idx + 1) + (l.alias ? ' ' + l.alias : '') + ' — ' + this._empNombre(tid);
            return '<option value="' + l.id + '"' + (l.id === this._state.trLlaveId ? ' selected' : '') + '>' + lbl + '</option>';
        }).join('');
        const recOpts = '<option value="__TIENDA__"' + (this._state.trReceptorId === '__TIENDA__' ? ' selected' : '') + '>🏪 Dejar en tienda</option>' +
            tag3.map(e => '<option value="' + e.id + '"' + (e.id === this._state.trReceptorId ? ' selected' : '') + '>' + e.nombre + '</option>').join('');

        const selStyle = 'width:100%;box-sizing:border-box;padding:11px 12px;border:1px solid #cbd5e1;border-radius:9px;font-size:0.9rem;background:white;color:#1e293b;-webkit-appearance:none;appearance:none;';
        const lblStyle = 'display:block;font-size:0.72rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.04em;margin:0 0 5px 2px;';

        const form =
            '<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:14px;">' +
                '<div style="font-size:0.74rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Nuevo traspaso</div>' +
                '<div style="margin-bottom:11px;"><label style="' + lblStyle + '">Fecha</label>' +
                    '<input type="date" value="' + fecha + '" onchange="App.mobile.setLlavesDate(this.value)" style="' + selStyle + 'font-variant-numeric:tabular-nums;"></div>' +
                '<div style="margin-bottom:11px;"><label style="' + lblStyle + '">Llave</label>' +
                    '<select onchange="App.mobile._state.trLlaveId=this.value" style="' + selStyle + '">' + llaveOpts + '</select></div>' +
                '<div style="margin-bottom:14px;"><label style="' + lblStyle + '">Recibe</label>' +
                    '<select onchange="App.mobile._state.trReceptorId=this.value" style="' + selStyle + '">' + recOpts + '</select></div>' +
                '<button onclick="App.mobile.guardarTraspaso()" style="width:100%;padding:14px;border:none;border-radius:10px;background:#2563eb;color:white;font-size:0.95rem;font-weight:700;cursor:pointer;">💾 Guardar traspaso</button>' +
            '</div>';

        // ── Movimientos previstos desde hoy (tabla + exportar PDF) ────────────
        const movsAll = this._movimientosDesdeHoy();
        const open = this._state.movPrevOpen;

        let panel = '';
        if (open) {
            const empCell = (id) => (!id || id === '__TIENDA__')
                ? '<span style="color:#f59e0b;font-weight:600;white-space:nowrap;">🏪 En tienda</span>'
                : this._empNombre(id);
            const th = 'padding:7px 8px;text-align:left;font-size:0.64rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid #e2e8f0;white-space:nowrap;';
            const td = 'padding:8px;border-bottom:1px solid #f1f5f9;font-size:0.78rem;vertical-align:top;';
            let rows = '';
            movsAll.forEach(m => {
                const l = llaves[m.llaveIdx];
                const lbl = 'Llave ' + (m.llaveIdx + 1) + (l && l.alias ? ' · ' + l.alias : '');
                rows += '<tr>' +
                    '<td style="' + td + 'white-space:nowrap;color:#475569;">' + Utils.formatDateES(m.fecha) + '</td>' +
                    '<td style="' + td + 'font-weight:600;color:#1e293b;">' + lbl + '</td>' +
                    '<td style="' + td + 'color:#475569;">' + empCell(m.dadorId) + '</td>' +
                    '<td style="' + td + 'font-weight:700;color:#1e293b;">' + empCell(m.receptorId) + '</td>' +
                '</tr>';
            });
            const tableHtml = movsAll.length
                ? '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;"><thead><tr>' +
                    '<th style="' + th + '">Fecha</th><th style="' + th + '">Llave</th><th style="' + th + '">Entrega</th><th style="' + th + '">Recibe</th>' +
                    '</tr></thead><tbody>' + rows + '</tbody></table></div>'
                : '<div style="color:#94a3b8;font-size:0.83rem;text-align:center;padding:16px 0;">Sin movimientos previstos.</div>';
            panel = '<div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px 12px;margin-top:8px;">' + tableHtml + '</div>';
        }

        const movBlock =
            '<div style="margin-top:14px;">' +
                '<div style="display:flex;gap:8px;">' +
                    '<button onclick="App.mobile.toggleMovPrev()" style="flex:1 1 auto;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:11px;font-size:0.8rem;font-weight:700;color:#64748b;cursor:pointer;">' +
                        (open ? '▲ Ocultar movimientos previstos' : '▼ Movimientos previstos desde hoy (' + movsAll.length + ')') +
                    '</button>' +
                    '<button onclick="App.mobile.exportMovimientosPDF()" title="Exportar a PDF" style="flex:0 0 auto;background:#1e293b;color:#f8fafc;border:none;border-radius:10px;padding:11px 16px;font-size:0.8rem;font-weight:700;cursor:pointer;">📄 PDF</button>' +
                '</div>' +
                panel +
            '</div>';

        return stepper + coverageHtml + gridSection + form + movBlock;
    },

    // Traspasos reales (con dador) desde hoy en adelante, con índice de llave
    _movimientosDesdeHoy: function() {
        const hoy = this._todayISO();
        const llaves = App.data.config.llaves || [];
        const idx = {};
        llaves.forEach((l, i) => { idx[l.id] = i; });
        return (App.data.traspasoLlaves || [])
            .filter(t => t.fecha >= hoy && t.dadorId != null)
            .sort((a, b) => a.fecha.localeCompare(b.fecha) || ((idx[a.llaveId] || 0) - (idx[b.llaveId] || 0)))
            .map(t => ({ ...t, llaveIdx: idx[t.llaveId] || 0 }));
    },

    toggleMovPrev: function() { this._state.movPrevOpen = !this._state.movPrevOpen; this.render(); },

    // Abre una ventana imprimible reutilizando el generador de PDF de escritorio
    // (App.ui._renderLlavesPresView). En el móvil: guardar como PDF / compartir.
    exportMovimientosPDF: function() {
        const html = this._buildMovPrintHTML();
        const w = window.open('', '_blank');
        if (!w) { alert('Permite las ventanas emergentes para exportar el PDF.'); return; }
        w.document.open();
        w.document.write(html);
        w.document.close();
    },

    _buildMovPrintHTML: function() {
        const hoy = this._todayISO();
        const storeName = (App.data.storeConfig && App.data.storeConfig.nombre) ? App.data.storeConfig.nombre : '';
        // Horizonte: cubrir todos los movimientos futuros (mínimo 15 días, como escritorio)
        let maxDate = hoy;
        (App.data.traspasoLlaves || []).forEach(t => { if (t.fecha >= hoy && t.fecha > maxDate) maxDate = t.fecha; });
        const dias = Math.max(15, Math.round((new Date(maxDate + 'T12:00:00') - new Date(hoy + 'T12:00:00')) / 86400000) + 1);

        let inner;
        if (App.ui && App.ui._renderLlavesPresView) {
            App.uiState.llavesPresDesde = hoy;
            App.uiState.llavesPresDias = dias;
            inner = App.ui._renderLlavesPresView(); // mismo formato que la versión de escritorio
        } else {
            inner = '<div style="color:#888;">Vista de movimientos no disponible.</div>';
        }

        return '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
            '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
            '<title>Cambios de llave</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b;padding:14px;margin:0;}' +
            '.no-print{display:none!important;}h1{font-size:18px;margin:0 0 2px;}.sub{color:#64748b;font-size:12px;margin-bottom:14px;}' +
            '@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;color-adjust:exact;}}@page{size:A4 landscape;margin:8mm;}</style>' +
            '</head><body onload="window.print()">' +
            '<h1>🔑 Cambios de llave programados</h1>' +
            '<div class="sub">' + (storeName ? storeName + ' · ' : '') + 'desde ' + Utils.formatDateES(hoy) + '</div>' +
            inner +
            '</body></html>';
    },

    setLlavesDate: function(iso) { if (iso) { this._state.llavesDate = iso; this.render(); } },

    guardarTraspaso: function() {
        const ok = App.logic.traspasoSave(this._state.trLlaveId, this._state.llavesDate, this._state.trReceptorId);
        if (ok) {
            this._state.trReceptorId = '__TIENDA__';
            this._toast('✅ Traspaso guardado');
        }
        this.render();
    },

    // ─── DRIVE (carga manual) ─────────────────────────────────────────────────
    _updateDriveBtn: function() {
        const label = document.getElementById('m-drive-label');
        if (!label) return;
        label.textContent = (App.drive && App.drive.isConnected()) ? 'Cargar' : 'Conectar';
    },

    driveTap: function() {
        if (!App.drive) return;
        if (App.drive.isConnected()) this._showDriveList();
        else App.drive.connect();
    },

    _showDriveList: function() {
        const overlay = document.createElement('div');
        overlay.id = 'm-drive-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;display:flex;align-items:flex-end;';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML =
            '<div style="background:white;width:100%;max-height:80vh;border-radius:16px 16px 0 0;display:flex;flex-direction:column;box-shadow:0 -8px 40px rgba(0,0,0,0.3);">' +
                '<div style="padding:16px 18px 10px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f1f5f9;">' +
                    '<span style="font-size:1rem;font-weight:700;color:#1e293b;">☁︎ Cargar copia de Drive</span>' +
                    '<button onclick="document.getElementById(\'m-drive-overlay\').remove()" style="background:none;border:none;font-size:1.3rem;color:#94a3b8;cursor:pointer;">✕</button>' +
                '</div>' +
                '<div id="m-drive-files" style="overflow-y:auto;padding:12px 14px 20px;">' +
                    '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:24px 0;">Buscando copias…</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(overlay);

        App.drive.listFiles((files) => {
            const cont = document.getElementById('m-drive-files');
            if (!cont) return;
            if (!files.length) {
                cont.innerHTML = '<div style="color:#94a3b8;font-size:0.85rem;text-align:center;padding:24px 0;">No se encontraron copias en Drive.</div>';
                return;
            }
            cont.innerHTML = files.map(f => {
                const nombre = f.name.replace(/Backup_(Auto|Manual)_/, '').replace(/_\d{8}_\d{6}\.json$/, '');
                const fecha = f.createdTime ? new Date(f.createdTime).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' }) : '';
                return '<button onclick="App.mobile.loadDriveFile(\'' + f.id + '\')" ' +
                    'style="display:block;width:100%;text-align:left;background:white;border:1px solid #e2e8f0;border-radius:10px;padding:11px 13px;margin-bottom:8px;cursor:pointer;">' +
                    '<div style="font-size:0.88rem;font-weight:700;color:#1e293b;">' + nombre + '</div>' +
                    '<div style="font-size:0.74rem;color:#94a3b8;margin-top:2px;">' + fecha + '</div>' +
                '</button>';
            }).join('');
        });
    },

    loadDriveFile: function(fileId) {
        const cont = document.getElementById('m-drive-files');
        if (cont) cont.innerHTML = '<div style="color:#64748b;font-size:0.85rem;text-align:center;padding:24px 0;">Cargando…</div>';
        App.drive.loadFile(fileId,
            (data) => {
                if (App.logic.saveSnapshot) App.logic.saveSnapshot('Antes de cargar desde Drive (móvil)');
                App.data = { ...App.data, ...data };
                App.data.fixedShifts = [
                    { id: "fixed_L", code: "L", desc: "Libre", start: "", end: "", color: "#22c55e", fixed: true },
                    { id: "fixed_F", code: "F", desc: "Festivo", start: "", end: "", color: "#22c55e", fixed: true },
                    { id: "fixed_R", code: "R", desc: "Recuperación", start: "", end: "", color: "#22c55e", fixed: true },
                    { id: "fixed_V", code: "V", desc: "Vacaciones", start: "", end: "", color: "#a855f7", fixed: true },
                    { id: "fixed_B", code: "B", desc: "Baja médica", start: "", end: "", color: "#ef4444", fixed: true },
                    { id: "fixed_P", code: "P", desc: "Permiso", start: "", end: "", color: "#ec4899", fixed: true }
                ];
                Safe.saveImmediate('v40_db', App.data);
                const ov = document.getElementById('m-drive-overlay');
                if (ov) ov.remove();
                this.render();
                this._toast('✅ Datos cargados desde Drive');
            },
            () => {
                const c = document.getElementById('m-drive-files');
                if (c) c.innerHTML = '<div style="color:#dc2626;font-size:0.85rem;text-align:center;padding:24px 0;">Error al cargar la copia.</div>';
            }
        );
    },

    _toast: function(msg) {
        const t = document.createElement('div');
        t.textContent = msg;
        t.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f8fafc;padding:10px 18px;border-radius:24px;font-size:0.82rem;font-weight:600;z-index:10000;box-shadow:0 4px 20px rgba(0,0,0,0.3);';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2600);
    }
};
