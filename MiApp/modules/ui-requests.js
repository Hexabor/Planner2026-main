// ============================================================
// UI: Solicitudes y tienda
// ============================================================

Object.assign(App.ui, {
        reqTypeToggle: function(type) {
            const isHRL = type === 'HRL';
            document.getElementById('rq-end-group').style.display  = isHRL ? 'none' : '';
            document.getElementById('rq-hrl-group').style.display  = isHRL ? '' : 'none';
            document.getElementById('rq-start-label').textContent  = isHRL ? 'Fecha' : 'Fecha Inicio';
        },

        // --- STORE ---
        renderStore: function(c) {
            let html = `<div class="store-container">
                <h2 style="margin: 0 0 20px 0; font-size: 1.3rem; color: var(--text-main);">🏪 Configuración de Tienda</h2>
                
                <div class="store-grid">
                    <!-- HORARIO BASE (Arriba Izquierda) -->
                    <div class="store-card">
                        <div class="store-card-header">
                            <div class="store-card-title">📅 Horario Base</div>
                        </div>
                        <table class="store-table">
                            <thead>
                                <tr>
                                    <th>Día</th>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th style="text-align:center; width:40px;">Cerrado</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo","Festivo"].forEach(d => {
                const cf = App.data.storeConfig.base[d] || {open:"10:00", close:"22:00", closed:false};
                const dayLabel = d === "Festivo" ? "🎉 Festivo" : d;
                html += `<tr>
                    <td class="store-day-name">${dayLabel}</td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','open',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.open)}</select></td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','close',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.close)}</select></td>
                    <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${cf.closed?'checked':''} onchange="App.logic.stBase('${d}','closed',this.checked)"></td>
                </tr>`;
            });
            
            html += `</tbody></table></div>
                    
                    <!-- EXCEPCIONES (Arriba Derecha) -->
                    <div class="store-card">
                        <div class="store-card-header">
                            <div class="store-card-title">⚠️ Excepciones de Horario</div>
                            <button class="store-add-btn" onclick="App.logic.specAdd()">+ Añadir</button>
                        </div>`;
            
            if(App.data.storeConfig.special.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay excepciones configuradas</div>`;
            } else {
                html += `<table class="store-table">
                    <thead>
                        <tr>
                            <th style="width:110px;">Fecha</th>
                            <th style="width:70px;">Apert.</th>
                            <th style="width:70px;">Cierre</th>
                            <th style="width:40px; text-align:center;">Off</th>
                            <th style="width:60px;"></th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                App.data.storeConfig.special.forEach((s, i) => {
                    const specOnChange = `App.logic.specUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('store-spec-' + i, s.date, specOnChange)}</td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'open',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.open)}</select></td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'close',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.close)}</select></td>
                        <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${s.closed?'checked':''} onchange="App.logic.specUpd(${i},'closed',this.checked); App.ui.renderCalendario(document.querySelector('.main-scroll'));"></td>
                        <td><button class="store-del-btn" onclick="App.logic.specDel(${i})">✕</button></td>
                    </tr>`;
                });
                
                html += `</tbody></table>`;
            }
            
            html += `</div></div>
                
                <!-- FESTIVOS (Abajo Full Width) -->
                <div class="store-card store-full-width">
                    <div class="store-card-header">
                        <div class="store-card-title">🎊 Festivos ${Utils.infoTip(Utils.Tips.festivosVsDiasEspeciales)}</div>
                        <button class="store-add-btn" onclick="App.logic.holAdd()">+ Añadir</button>
                    </div>`;
            
            if(App.data.storeConfig.holidays.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay festivos configurados</div>`;
            } else {
                html += `<table class="store-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nombre</th>
                            <th style="width:60px;"></th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                App.data.storeConfig.holidays.forEach((hol, i) => {
                    const holOnChange = `App.logic.holUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('store-hol-' + i, hol.date, holOnChange)}</td>
                        <td><input type="text" class="store-text-input" value="${hol.note}" onchange="App.logic.holUpd(${i},'note',this.value)" placeholder="Nombre del festivo"></td>
                        <td><button class="store-del-btn" onclick="App.logic.holDel(${i})">✕</button></td>
                    </tr>`;
                });
                
                html += `</tbody></table>`;
            }
            
            html += `</div></div>`;
            c.innerHTML = html;
        },

        _calRenderFestivos: function() {
            const rerender = "App.ui.renderCalendario(document.querySelector('.main-scroll'))";
            let html = `<div class="store-card store-full-width" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <div class="store-card-header">
                    <div class="store-card-title" style="font-weight:700; font-size:1rem;">🎊 Festivos ${Utils.infoTip(Utils.Tips.festivosVsDiasEspeciales)}</div>
                    <button class="store-add-btn" onclick="App.logic.holAdd()">+ Añadir</button>
                </div>`;
            if(App.data.storeConfig.holidays.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay festivos configurados</div>`;
            } else {
                html += `<table class="store-table"><thead><tr><th>Fecha</th><th>Nombre</th><th style="width:60px;"></th></tr></thead><tbody>`;
                App.data.storeConfig.holidays.forEach((hol, i) => {
                    const holOnChange = `App.logic.holUpd(${i}, 'date', this.dataset.isoValue); ${rerender}`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('cal-hol-' + i, hol.date, holOnChange)}</td>
                        <td><input type="text" class="store-text-input" value="${hol.note}" onchange="App.logic.holUpd(${i},'note',this.value)" placeholder="Nombre del festivo"></td>
                        <td><button class="store-del-btn" onclick="App.logic.holDel(${i})">✕</button></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
            html += `</div>`;
            return html;
        },

        _calRenderTienda: function() {
            const rerender = "App.ui.renderCalendario(document.querySelector('.main-scroll'))";
            let html = `<div class="store-grid">
                <div class="store-card" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <div class="store-card-header">
                        <div class="store-card-title" style="font-weight:700; font-size:1rem;">📅 Horario Base</div>
                    </div>
                    <table class="store-table"><thead><tr><th>Día</th><th>Apertura</th><th>Cierre</th><th style="text-align:center;width:40px;">Cerrado</th></tr></thead><tbody>`;
            ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo","Festivo"].forEach(d => {
                const cf = App.data.storeConfig.base[d] || {open:"10:00", close:"22:00", closed:false};
                const dayLabel = d === "Festivo" ? "🎉 Festivo" : d;
                html += `<tr>
                    <td class="store-day-name">${dayLabel}</td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','open',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.open)}</select></td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','close',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.close)}</select></td>
                    <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${cf.closed?'checked':''} onchange="App.logic.stBase('${d}','closed',this.checked)"></td>
                </tr>`;
            });
            html += `</tbody></table></div>
                <div class="store-card" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <div class="store-card-header">
                        <div class="store-card-title" style="font-weight:700; font-size:1rem;">⚠️ Excepciones de Horario</div>
                        <button class="store-add-btn" onclick="App.logic.specAdd()">+ Añadir</button>
                    </div>`;
            if(App.data.storeConfig.special.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay excepciones configuradas</div>`;
            } else {
                html += `<table class="store-table"><thead><tr><th style="width:110px;">Fecha</th><th style="width:70px;">Apert.</th><th style="width:70px;">Cierre</th><th style="width:40px;text-align:center;">Off</th><th style="width:60px;"></th></tr></thead><tbody>`;
                App.data.storeConfig.special.forEach((s, i) => {
                    const specOnChange = `App.logic.specUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('cal-spec-' + i, s.date, specOnChange)}</td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'open',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.open)}</select></td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'close',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.close)}</select></td>
                        <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${s.closed?'checked':''} onchange="App.logic.specUpd(${i},'closed',this.checked); ${rerender}"></td>
                        <td><button class="store-del-btn" onclick="App.logic.specDel(${i})">✕</button></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
            html += `</div></div>`;
            return html;
        },

        // ============================================================
        // REQUESTS — movidas desde ui-employees.js
        // ============================================================

        // ── Helpers compartidos de iconos Lucide ────────────────────────
        _reqIco: function(path, size=16) {
            return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
        },
        _reqTypeMeta: function() {
            return {
                VAC: { label:'Vacaciones',      color:'#16a34a', bg:'#dcfce7', border:'#86efac', ico:'<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>' },
                LIB: { label:'Día libre',       color:'#2563eb', bg:'#dbeafe', border:'#93c5fd', ico:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>' },
                HRL: { label:'Horas libres',    color:'#0891b2', bg:'#cffafe', border:'#67e8f9', ico:'<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>' },
                AP:  { label:'Asuntos propios', color:'#7c3aed', bg:'#ede9fe', border:'#c4b5fd', ico:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
                BAJ: { label:'Baja médica',     color:'#dc2626', bg:'#fee2e2', border:'#fca5a5', ico:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
            };
        },

        // Reconstruye controles (#req-fixed) y módulo (#req-module) — sin remontar la shell
        _reqRefresh: function() {
            const fixed = document.getElementById('req-fixed');
            const mod   = document.getElementById('req-module');
            if (!fixed || !mod) { App.ui.renderRequests(document.querySelector('.main-scroll')); return; }
            fixed.innerHTML = App.ui._reqBuildFixed();
            App.ui._reqShowList(mod);
        },

        // Construye el HTML de controles + filtros con el estado actual
        _reqBuildFixed: function() {
            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const ICO = {
                plus: ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
            };
            const showArchived = App.uiState.reqShowArchived;
            const active   = App.data.requests.filter(r => !r.archived);
            const archived = App.data.requests.filter(r =>  r.archived);

            const pill = (label, on, onclick) =>
                `<button onclick="${onclick}" style="padding:4px 11px;border-radius:5px;border:none;font-size:0.76rem;font-weight:600;cursor:pointer;
                    background:${on?'white':'transparent'};color:${on?'#1e293b':'#64748b'};
                    box-shadow:${on?'0 1px 3px rgba(0,0,0,0.1)':'none'};">${label}</button>`;

            const controlBar = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="display:flex;gap:3px;background:#f1f5f9;padding:3px;border-radius:7px;">
                            ${pill('Activas' + (active.length ? ' (' + active.length + ')' : ''), !showArchived,
                                'App.uiState.reqShowArchived=false; App.ui._reqRefresh()')}
                            ${pill('Archivadas' + (archived.length ? ' (' + archived.length + ')' : ''), showArchived,
                                'App.uiState.reqShowArchived=true; App.ui._reqRefresh()')}
                        </div>
                    </div>
                    ${!showArchived ? '<button onclick="App.logic.reqSelect(null)" style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:none;background:#2563eb;color:white;font-size:0.82rem;font-weight:600;cursor:pointer;">' + ICO.plus + ' Nueva solicitud</button>' : ''}
                </div>`;

            const ALL_TYPES = ['LIB','HRL','AP','BAJ'];
            const activeFilter = App.uiState.reqTypeFilter || ALL_TYPES;
            const allTypesActive = ALL_TYPES.every(t => activeFilter.includes(t));
            const empFilter = App.uiState.reqEmpFilter || 'todos';
            const TYPE_META = App.ui._reqTypeMeta();

            // Empleados con requests en la vista actual
            const _showArch = App.uiState.reqShowArchived;
            const _reqsVis = App.data.requests.filter(r => _showArch ? r.archived : !r.archived);
            const _empIds = [...new Set(_reqsVis.map(r => r.empId))];
            const _empsReqs = App.data.empleados.filter(e => _empIds.includes(e.id)).sort((a,b) => a.customOrder - b.customOrder);

            const _ps = (on, color, bg, border) =>
                'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ' +
                (on ? (border||color) : '#e2e8f0') + ';background:' + (on ? (bg||'#eff6ff') : 'white') + ';color:' + (on ? color : '#94a3b8') + ';';

            let filterBar = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;">';
            // Fila tipos
            filterBar += '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">';
            filterBar += '<button onclick="App.logic.reqResetTypeFilter()" style="' + _ps(allTypesActive,'#2563eb','#eff6ff','#93c5fd') + '">Todos</button>';
            ALL_TYPES.forEach(function(t) {
                const m = TYPE_META[t];
                const on = activeFilter.length === 1 && activeFilter[0] === t;
                filterBar += '<button onclick="App.logic.reqToggleType(\'' + t + '\')" title="' + m.label + '" style="' + _ps(on, m.color, m.bg, m.border) + '">' + ico(m.ico, 12) + ' ' + m.label + '</button>';
            });
            filterBar += '</div>';
            // Fila empleados (solo si hay más de uno)
            if(_empsReqs.length > 1) {
                filterBar += '<div style="display:flex;align-items:center;gap:5px;flex-wrap:wrap;">';
                filterBar += '<button onclick="App.uiState.reqEmpFilter=\'todos\'; App.ui._reqRefresh()" style="' + _ps(empFilter==='todos','#64748b','#f1f5f9','#cbd5e1') + '">Todos</button>';
                _empsReqs.forEach(function(e) {
                    const on = empFilter === e.id;
                    filterBar += '<button onclick="App.logic.reqSetEmpFilter(\'' + e.id + '\')" style="' + _ps(on,'#475569','#f1f5f9','#94a3b8') + '">' + e.nombre.split(' ')[0] + '</button>';
                });
                filterBar += '</div>';
            }
            filterBar += '</div>';

            return controlBar + filterBar;
        },

        renderRequests: function(c) {
            if (!c) return;
            const section = App.uiState.reqSection || 'solicitudes';
            // Migrar clave antigua
            if (section === 'individual' || section === 'recurring') App.uiState.reqSection = 'solicitudes';
            const subSection = App.uiState.reqSubSection || 'puntuales';

            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const ICO = {
                solicitudes: ico('<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>'),
                event:  ico('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>'),
                key:    ico('<circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/>'),
            };

            // --- Botones principales (3 grandes) ---
            const mainBtn = (key, icoHtml, label) => {
                const active = (App.uiState.reqSection || 'solicitudes') === key;
                return `<button onclick="App.uiState.reqSection='${key}'; App.ui.renderRequests(document.querySelector('.main-scroll'))"
                    style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:7px;border:1.5px solid ${active?'#2563eb':'#e2e8f0'};
                           font-size:0.8rem;font-weight:600;cursor:pointer;
                           background:${active?'#eff6ff':'white'};color:${active?'#2563eb':'#64748b'};
                           transition:all 0.15s;">
                    ${icoHtml} ${label}
                </button>`;
            };
            const llavesBtn = App.data.config.llavesActivo ? mainBtn('llaves', ICO.key, 'Llaves') : '';

            // --- Sub-tabs dentro de Solicitudes ---
            const subTab = (key, label) => {
                const active = subSection === key;
                return `<button onclick="App.uiState.reqSubSection='${key}'; App.ui.renderRequests(document.querySelector('.main-scroll'))"
                    style="padding:3px 10px;border-radius:14px;border:1px solid ${active?'#2563eb':'#e2e8f0'};
                           font-size:0.7rem;font-weight:600;cursor:pointer;
                           background:${active?'#eff6ff':'white'};color:${active?'#2563eb':'#94a3b8'};">
                    ${label}
                </button>`;
            };
            const subBarContent = (App.uiState.reqSection || 'solicitudes') === 'solicitudes'
                ? `${subTab('puntuales', 'Puntuales')}${subTab('periodicas', 'Periódicas')}${subTab('libranzas', 'Plan de libranzas')}${subTab('vacaciones', 'Plan de vacaciones')}`
                : '';

            const mainBar = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0;">
                <div style="display:flex;align-items:center;gap:12px;">
                    <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#1e293b;flex-shrink:0;">Gestión diaria</h2>
                    <div style="display:flex;gap:6px;">
                        ${mainBtn('solicitudes', ICO.solicitudes, 'Solicitudes')}
                        ${mainBtn('eventos', ICO.event, 'Eventos')}
                        ${llavesBtn}
                    </div>
                </div>
                ${subBarContent ? `<div style="display:flex;gap:4px;margin-right:auto;margin-left:40px;">${subBarContent}</div>` : ''}
            </div>
            <div style="height:1px;background:#e2e8f0;margin:10px 0 12px;"></div>`;

            // Construir sectionBar completo (subBar ya integrado en mainBar)
            const sectionBar = mainBar;
            const subBar = '';

            if (section === 'eventos') {
                this._renderEventos(c, sectionBar);
                this.renderEventoInspector(null);
                return;
            }

            if (section === 'llaves') {
                this._renderLlaves(c, sectionBar);
                this.renderDayInspector(App.llaves._ui.inspectorDate || new Date().toISOString().slice(0,10));
                return;
            }

            // --- SOLICITUDES DE STAFF ---
            if (subSection === 'periodicas') {
                this.renderRecurringList(c, sectionBar + subBar);
                this.renderRecurringInspector(App.uiState.recurringSelectedId);
                return;
            }

            if (subSection === 'libranzas') {
                this._renderLibranzas(c, sectionBar + subBar);
                return;
            }

            if (subSection === 'vacaciones') {
                this._renderPlanGeneric(c, sectionBar + subBar, 'vacaciones');
                return;
            }

            // --- Puntuales (por defecto) ---
            // Forzar flex-column en el contenedor padre para fill-height
            if (c.parentElement) c.parentElement.style.cssText += ';display:flex;flex-direction:column;';
            c.style.cssText = 'display:flex;flex-direction:column;height:100%;min-height:0;padding:16px 16px 0 16px;box-sizing:border-box;';

            c.innerHTML = sectionBar + subBar + `
                <div id="req-fixed" style="flex-shrink:0;max-width:680px;margin:0 auto;width:100%;"></div>
                <div id="req-module" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;padding-bottom:16px;"></div>`;

            document.getElementById('req-fixed').innerHTML = App.ui._reqBuildFixed();
            App.ui._reqShowList(document.getElementById('req-module'));
            // Abrir inspector con nueva petición al entrar en la sección
            App.ui.renderReqInspector(App.uiState.selectedReqId || null);
        },

        _reqShowList: function(mod) {
            if (!mod) return;
            const showArchived = App.uiState.reqShowArchived;
            const sk  = App.uiState.reqSortKey  || 'start';
            const sd  = App.uiState.reqSortDir === 'asc' ? 1 : -1;
            const activeFilter = App.uiState.reqTypeFilter || ['LIB','HRL','AP','BAJ'];
            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const TYPE_ICO = {
                VAC: ico('<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>'),
                LIB: ico('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
                HRL: ico('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>'),
                AP:  ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>'),
                BAJ: ico('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
            };
            const empName = r => { const e = App.data.empleados.find(e => e.id === r.empId); return e ? e.nombre : ''; };
            const sortFns = {
                emp:    (a,b) => empName(a).localeCompare(empName(b)) * sd,
                type:   (a,b) => a.type.localeCompare(b.type) * sd,
                start:  (a,b) => a.start.localeCompare(b.start) * sd,
                status: (a,b) => a.status.localeCompare(b.status) * sd,
            };
            const list = App.data.requests.filter(r => showArchived ? r.archived : !r.archived);
            const _ef = App.uiState.reqEmpFilter || 'todos';
            const filtered = [...list].sort(sortFns[sk] || sortFns.start).filter(r => activeFilter.includes(r.type) && (_ef === 'todos' || r.empId === _ef));

            if (filtered.length === 0) {
                mod.innerHTML = `<div style="max-width:580px;margin:20px auto;text-align:center;padding:50px 20px;border:2px dashed #e2e8f0;border-radius:10px;color:#94a3b8;">
                    <div style="font-size:0.9rem;">${showArchived ? 'No hay solicitudes archivadas.' : activeFilter.length < 5 ? 'No hay solicitudes con los filtros seleccionados.' : 'No hay solicitudes activas.'}</div>
                </div>`;
                return;
            }

            const TH_WIDTH = { emp: '', type: '', start: '', status: 'width:95px;' };
            const th = (key, label) => {
                const isActive = sk === key;
                const arrow = isActive ? (App.uiState.reqSortDir === 'asc' ? ' ↑' : ' ↓') : '';
                return `<th style="cursor:pointer;user-select:none;white-space:nowrap;padding:8px 12px;font-size:0.72rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;${TH_WIDTH[key]||''}" onclick="App.logic.reqSort('${key}')">${label}${arrow}</th>`;
            };

            let html = `<div style="max-width:580px;margin:0 auto;">
                <table style="width:100%;border-collapse:collapse;background:white;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;">
                    <thead><tr style="background:#f8fafc;border-bottom:1px solid #e2e8f0;">
                        ${th('emp','Empleado')}${th('type','Tipo')}${th('start','Fecha')}${th('status','Estado')}
                        <th style="width:40px;text-align:center;padding:8px;"></th>
                    </tr></thead><tbody>`;

            filtered.forEach((r, i) => {
                const name = empName(r);
                const icoT = TYPE_ICO[r.type] || ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>');
                let stBg='#fef9c3', stColor='#92400e', stText='Pendiente';
                if (r.status==='approved') { stBg='#dcfce7'; stColor='#166534'; stText='Aprobada'; }
                if (r.status==='rejected') { stBg='#fee2e2'; stColor='#991b1b'; stText='Rechazada'; }
                const wk = Utils.getWeekCode(r.start);
                const dateStr = r.type==='HRL'
                    ? `${Utils.formatDateES(r.start)} · ${r.hrlFrom}–${r.hrlTo}`
                    : r.start===r.end ? Utils.formatDateES(r.start)
                    : `${Utils.formatDateES(r.start)} → ${Utils.formatDateES(r.end)}`;
                const isSel = App.uiState.selectedId === r.id;
                const rowBg = isSel ? '#eff6ff' : (i%2===0?'white':'#fafafa');
                const rowBL = isSel ? '3px solid #2563eb' : '3px solid transparent';
                const recurPill = r.recurringId ? `<span style="display:inline-block;margin-top:4px;padding:1px 7px;border-radius:20px;font-size:0.62rem;font-weight:700;background:#ede9fe;color:#7c3aed;letter-spacing:0.02em;">🔁 Recurrente</span>` : '';
                const archIco = r.archived
                    ? ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><polyline points="10 12 12 10 14 12"/><line x1="12" y1="10" x2="12" y2="17"/>', 14)
                    : ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>', 14);

                html += `<tr style="background:${rowBg};border-left:${rowBL};cursor:pointer;"
                    onclick="App.logic.reqSelect('${r.id}')"
                    onmouseover="if(!${isSel})this.style.background='#f0f9ff'"
                    onmouseout="if(!${isSel})this.style.background='${rowBg}'">
                    <td style="padding:10px 12px;font-size:0.88rem;font-weight:500;color:#1e293b;">${name}</td>
                    <td style="padding:10px 12px;">
                        <div style="display:flex;flex-direction:column;gap:2px;">
                            <div style="display:flex;align-items:center;gap:6px;color:#475569;">${icoT}<span style="font-size:0.82rem;font-weight:600;">${r.type}</span></div>
                            ${recurPill}
                        </div>
                    </td>
                    <td style="padding:10px 12px;">
                        <div style="font-size:0.83rem;color:#1e293b;">${dateStr}</div>
                        <div style="font-size:0.68rem;color:#94a3b8;margin-top:1px;">${wk}</div>
                    </td>
                    <td style="padding:10px 12px;position:relative;white-space:nowrap;">
                        <span onclick="event.stopPropagation(); App.ui.showStatusPopover('${r.id}', this)"
                            style="display:inline-flex;align-items:center;gap:4px;padding:3px 9px;border-radius:20px;font-size:0.72rem;font-weight:600;background:${stBg};color:${stColor};cursor:pointer;user-select:none;"
                            onmouseover="this.style.filter='brightness(0.93)'"
                            onmouseout="this.style.filter=''">
                            ${stText} <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                        </span>
                    </td>
                    <td style="padding:10px;text-align:center;">
                        <button title="${r.archived?'Restaurar':'Archivar'}" onclick="event.stopPropagation(); App.logic.reqToggleArchive('${r.id}')"
                            style="display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:6px;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#94a3b8;"
                            onmouseover="this.style.borderColor='#94a3b8';this.style.color='#475569';"
                            onmouseout="this.style.borderColor='#e2e8f0';this.style.color='#94a3b8';">${archIco}</button>
                    </td>
                </tr>`;
            });
            html += `</tbody></table></div></div>`;
            mod.innerHTML = html;
        },


        renderReqInspector: function(id) {
            const r = id ? App.data.requests.find(x => x.id === id) : { empId: "", type: "VAC", start: "", end: "", status: "pending", note: "", hrlFrom: "", hrlTo: "" };
            const p = document.getElementById('inspector-content');
            let empOpts = `<option value="">-- Seleccionar Empleado --</option>`;
            App.data.empleados.sort((a,b) => a.nombre.localeCompare(b.nombre)).forEach(e => { empOpts += `<option value="${e.id}" ${e.id===r.empId?'selected':''}>${e.nombre} ${!e.active?'(Inactivo)':''}</option>`; });
            const isHRL = r.type === 'HRL';
            p.innerHTML = `
                <h3>${id?'✏️ Editar Solicitud':'➕ Nueva Solicitud'}</h3>
                <div class="form-group">
                    <label>Empleado</label>
                    <select id="rq-emp">${empOpts}</select>
                </div>
                <div class="form-group">
                    <label>Tipo de Ausencia</label>
                    <select id="rq-type" onchange="App.ui.reqTypeToggle(this.value)">
                        <option value="LIB" ${r.type==='LIB'?'selected':''}>🏠 Día Libre / Petición (LIB)</option>
                        <option value="BAJ" ${r.type==='BAJ'?'selected':''}>🏥 Baja Médica (BAJ)</option>
                        <option value="AP"  ${r.type==='AP' ?'selected':''}>📋 Asuntos Propios (AP)</option>
                        <option value="HRL" ${r.type==='HRL'?'selected':''}>⏰ Horas Libres (HRL)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label id="rq-start-label">${isHRL ? 'Fecha' : 'Fecha Inicio'}</label>
                    ${Utils.getDateInputHTML('rq-start', r.start, 'Utils.handleDateInput(this)')}
                </div>
                <div class="form-group" id="rq-end-group" style="${isHRL ? 'display:none' : ''}">
                    <label>Fecha Fin (Inclusive)</label>
                    ${Utils.getDateInputHTML('rq-end', r.end, 'Utils.handleDateInput(this)')}
                </div>
                <div class="form-group" id="rq-hrl-group" style="${isHRL ? '' : 'display:none'}">
                    <label>Tramo de horas a respetar</label>
                    <div style="display:flex; gap:8px; align-items:center;">
                        <div style="flex:1;">
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">Desde</div>
                            <select id="rq-hrl-from" style="font-weight:700; font-size:0.9rem;">
                                ${Utils.getTimeOptions(r.hrlFrom||'', true)}
                            </select>
                        </div>
                        <span style="font-size:1.1rem; color:var(--text-muted); margin-top:18px;">→</span>
                        <div style="flex:1;">
                            <div style="font-size:0.7rem; color:var(--text-muted); margin-bottom:4px;">Hasta</div>
                            <select id="rq-hrl-to" style="font-weight:700; font-size:0.9rem;">
                                ${Utils.getTimeOptions(r.hrlTo||'', true)}
                            </select>
                        </div>
                    </div>
                    <div style="font-size:0.7rem; color:var(--text-muted); margin-top:5px; line-height:1.4;">⚠️ Cualquier turno que <strong>no ocupe</strong> estas horas es válido (tarde, L, F, V…)</div>
                </div>
                <div class="form-group">
                    <label>Estado de la Solicitud</label>
                    <select id="rq-status" style="font-weight:600; padding:11px 12px;">
                        <option value="pending"  ${r.status==='pending' ?'selected':''}>🟡 Pendiente de Aprobación</option>
                        <option value="approved" ${r.status==='approved'?'selected':''}>🟢 Aprobada</option>
                        <option value="rejected" ${r.status==='rejected'?'selected':''}>🔴 Rechazada</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Comentarios / Notas</label>
                    <textarea id="rq-note" placeholder="Añade comentarios adicionales...">${r.note||''}</textarea>
                </div>
                
                ${id && r.status === 'approved' && !isHRL ? (() => {
                    const typeToShiftCode = { 'VAC': 'V', 'LIB': 'L', 'BAJ': 'B', 'AP': 'P' };
                    const shiftCode = typeToShiftCode[r.type] || '?';
                    const typeNames = { 'VAC': 'Vacaciones', 'LIB': 'Día libre', 'BAJ': 'Baja médica', 'AP': 'Asuntos propios' };
                    const typeName = typeNames[r.type] || r.type;
                    let numDays = 0;
                    if(r.start && r.end) {
                        const start = new Date(r.start);
                        const end = new Date(r.end);
                        numDays = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
                    }
                    return `
                    <div style="margin: 20px 0; padding: 15px; background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px;">
                        <div style="font-weight: 700; margin-bottom: 10px; color: #166534; font-size: 0.85rem;">📅 ASIGNACIÓN DE TURNOS</div>
                        <div style="font-size: 0.75rem; color: #15803d; margin-bottom: 12px; line-height: 1.5;">
                            ${typeName} aprobada para ${numDays} día${numDays !== 1 ? 's' : ''} (${Utils.formatDateES(r.start)} → ${Utils.formatDateES(r.end)})
                        </div>
                        <button class="btn btn-success" onclick="App.logic.reqCreateShifts('${id}')" style="width: 100%; margin-bottom: 8px; font-size: 0.85rem;">
                            📅 Crear ${numDays} turno${numDays !== 1 ? 's' : ''} "${shiftCode}" en planificador
                        </button>
                        <button class="btn btn-warning" onclick="App.logic.reqRemoveShifts('${id}')" style="width: 100%; font-size: 0.85rem;">
                            🗑️ Eliminar turnos "${shiftCode}" del planificador
                        </button>
                        <div style="font-size: 0.7rem; color: #059669; margin-top: 10px; line-height: 1.4;">
                            💡 <strong>Tip:</strong> Usa "Crear turnos" para asignar automáticamente.
                        </div>
                    </div>
                    `;
                })() : ''}
                
                <button class="btn btn-primary" onclick="App.logic.reqSave('${id||''}')">💾 Guardar Solicitud</button>
                ${id ? `<button class="btn btn-danger" onclick="App.logic.reqDel('${id}')">🗑️ Eliminar</button>` : ''}`;
        },

        renderEventoInspector: function(id) {
            const ev = id ? (App.data.eventos||[]).find(e => e.id === id) : null;
            const TIPO_LABEL = { curso:'Curso', mentoria:'Mentoría', visita:'Visita', otro:'Otro' };
            const p = document.getElementById('inspector-content');
            if(!p) return;
            const empOpts = App.data.empleados.filter(e => e.active !== false)
                .sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}" ${ev?.empId===e.id?'selected':''}>${e.nombre}</option>`).join('');
            p.innerHTML = `
                <h3>${id ? '✏️ Editar Evento' : '➕ Nuevo Evento'}</h3>
                <div class="form-group">
                    <label>Empleado</label>
                    <select id="ev-empId">${empOpts}</select>
                </div>
                <div class="form-group">
                    <label>Tipo</label>
                    <select id="ev-tipo">
                        ${['curso','mentoria','visita','otro'].map(t=>`<option value="${t}" ${ev?.tipo===t?'selected':''}>${TIPO_LABEL[t]}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Fecha</label>
                    <input type="date" id="ev-fechaInicio" value="${ev?.fechaInicio||''}" style="display:none;">
                    ${Utils.getDateInputHTML('ev-fechaInicio-picker', ev?.fechaInicio||'', "document.getElementById('ev-fechaInicio').value=this.dataset.isoValue;")}
                </div>
                <div class="form-group">
                    <label>Hora inicio</label>
                    <select id="ev-horaInicio">${Utils.getTimeOptions(ev?.horaInicio||'09:00', false, 9)}</select>
                </div>
                <div class="form-group">
                    <label>Hora fin</label>
                    <select id="ev-horaFin">${Utils.getTimeOptions(ev?.horaFin||'10:00', false, 9)}</select>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <input type="text" id="ev-desc" value="${ev?.desc||''}" placeholder="Ej: Curso de atención al cliente" style="width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.9rem;">
                </div>
                <button class="btn btn-primary" onclick="
                    const _f = document.getElementById('ev-fechaInicio').value;
                    App.logic.eventoSave({id:'${id||''}', empId:document.getElementById('ev-empId').value, tipo:document.getElementById('ev-tipo').value, desc:document.getElementById('ev-desc').value, fechaInicio:_f, fechaFin:_f, horaInicio:document.getElementById('ev-horaInicio').value, horaFin:document.getElementById('ev-horaFin').value});
                ">💾 Guardar Evento</button>
                ${id ? `<button class="btn btn-danger" onclick="App.logic.eventoDel('${id}')">🗑️ Eliminar</button>` : ''}
            `;
        },

        // ============================================================
        // PETICIONES RECURRENTES — UI
        // ============================================================

        renderRecurringList: function(c, sectionToggle) {
            sectionToggle = sectionToggle || '';
            const patterns = App.data.recurringRequests || [];
            const DAY_LABELS = { 1:'L', 2:'M', 3:'X', 4:'J', 5:'V', 6:'S', 7:'D' };
            const TYPE_LABEL = { libre: '🗓 Día libre', franja: '⏰ Franja' };
            const FRANJA_LABEL = { manana: 'Mañana', tarde: 'Tarde' };

            let html = sectionToggle + `<div style="max-width:580px;margin:0 auto;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <span style="font-size:0.82rem;color:#64748b;font-weight:500;">${patterns.length} patrón${patterns.length!==1?'es':''}</span>
                    <button onclick="App.logic.recurringSelect(null)"
                        style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:none;
                               background:#2563eb;color:white;font-size:0.82rem;font-weight:600;cursor:pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nuevo patrón
                    </button>
                </div>`;

            if (patterns.length === 0) {
                html += `<div style="text-align:center;padding:50px;border:2px dashed #e2e8f0;border-radius:8px;color:#94a3b8;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">🔁</div>
                    <div style="font-weight:600;margin-bottom:6px;">No hay patrones recurrentes</div>
                    <div style="font-size:0.85rem;">Crea un patrón para generar peticiones periódicas automáticamente.</div>
                </div>`;
            } else {
                html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
                patterns.forEach(p => {
                    const emp = App.data.empleados.find(e => e.id === p.empId);
                    const empName = emp ? emp.nombre : '(empleado eliminado)';
                    const linked = (App.data.requests || []).filter(r => r.recurringId === p.id).length;
                    const pending = (App.data.requests || []).filter(r => r.recurringId === p.id && !r.archived && r.status === 'pending').length;
                    const isSelected = App.uiState.recurringSelectedId === p.id;

                    const dayPills = [1,2,3,4,5,6,7].map(d => {
                        const active = (p.days || []).includes(d);
                        return `<span style="display:inline-flex;align-items:center;justify-content:center;
                            width:22px;height:22px;border-radius:4px;font-size:0.7rem;font-weight:700;
                            background:${active ? '#2563eb' : '#f1f5f9'};
                            color:${active ? 'white' : '#94a3b8'};">${DAY_LABELS[d]}</span>`;
                    }).join('');

                    const typeLabel = TYPE_LABEL[p.type] || p.type;
                    const franjaLabel = p.type === 'franja' && p.franja ? ` · ${FRANJA_LABEL[p.franja]}` : '';
                    const rangeLabel = `${Utils.formatDateES(p.dateFrom)} → ${Utils.formatDateES(p.dateTo)}`;

                    html += `<div class="rr-row" data-id="${p.id}"
                        style="background:${isSelected ? '#eff6ff' : 'white'};
                               border:2px solid ${isSelected ? '#2563eb' : '#e2e8f0'};
                               border-radius:8px;padding:14px 16px;cursor:pointer;transition:border-color 0.15s;"
                        onclick="App.logic.recurringSelect('${p.id}')"
                        onmouseover="if('${p.id}'!==App.uiState.recurringSelectedId)this.style.borderColor='#93c5fd'"
                        onmouseout="if('${p.id}'!==App.uiState.recurringSelectedId)this.style.borderColor='#e2e8f0'">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                            <div style="flex:1;min-width:0;">
                                <div style="font-weight:700;font-size:0.95rem;margin-bottom:6px;">${empName}</div>
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
                                    ${dayPills}
                                </div>
                                <div style="font-size:0.8rem;color:#64748b;">
                                    ${typeLabel}${franjaLabel} · ${rangeLabel}
                                    ${p.note ? `· <em>${p.note}</em>` : ''}
                                </div>
                            </div>
                            <div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end;flex-shrink:0;">
                                <button class="btn btn-primary" style="width:auto;margin:0;padding:5px 12px;font-size:0.78rem;"
                                    onclick="event.stopPropagation(); App.logic.recurringGenerate('${p.id}')">
                                    ↗ Aplicar patrón
                                </button>
                                ${pending > 0 ? `<button onclick="event.stopPropagation(); App.ui.showRecurringApproveModal('${p.id}')"
                                    style="padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:700;cursor:pointer;
                                           border:none;background:#fef3c7;color:#b45309;transition:background 0.15s;"
                                    onmouseover="this.style.background='#fde68a'"
                                    onmouseout="this.style.background='#fef3c7'">
                                    ⏳ ${pending} pendiente${pending!==1?'s':''}
                                </button>` : ''}
                                ${linked > 0 ? `<span style="font-size:0.7rem;color:#64748b;">${linked} petición${linked!==1?'es':''}</span>` : ''}
                            </div>
                        </div>
                    </div>`;
                });
                html += `</div>`;
            }
            html += `</div>`; // cierre max-width centrado
            c.innerHTML = html;
        },

        renderRecurringInspector: function(id) {
            const p = document.getElementById('inspector-content');
            if (!p) return;

            const r = id ? (App.data.recurringRequests || []).find(x => x.id === id) : null;
            const type   = r ? r.type   : 'libre';
            const franja = r ? r.franja : 'tarde';
            const DAY_LABELS = ['L','M','X','J','V','S','D'];

            let empOpts = `<option value="">-- Seleccionar empleado --</option>`;
            App.data.empleados
                .filter(e => e.active !== false)
                .sort((a,b) => a.nombre.localeCompare(b.nombre))
                .forEach(e => {
                    empOpts += `<option value="${e.id}" ${r && r.empId === e.id ? 'selected' : ''}>${e.nombre}</option>`;
                });

            const btnStyle = (active) =>
                `padding:8px 14px;border-radius:6px;border:2px solid ${active ? '#2563eb' : '#e2e8f0'};
                 background:${active ? '#2563eb' : '#f8fafc'};color:${active ? 'white' : '#475569'};
                 font-weight:600;font-size:0.85rem;cursor:pointer;transition:all 0.15s;`;

            let daysHtml = '';
            for (let i = 0; i < 7; i++) {
                const dayNum = i + 1;
                const isActive = r && (r.days || []).includes(dayNum);
                daysHtml += `<button type="button" data-day="${dayNum}"
                    onclick="App.ui.rrToggleDay(this)"
                    class="rr-day-btn${isActive ? ' active' : ''}"
                    style="width:36px;height:36px;border-radius:6px;
                           border:2px solid ${isActive ? '#2563eb' : '#e2e8f0'};
                           background:${isActive ? '#2563eb' : '#f8fafc'};
                           color:${isActive ? 'white' : '#475569'};
                           font-weight:700;font-size:0.88rem;cursor:pointer;">
                    ${DAY_LABELS[i]}</button>`;
            }

            p.innerHTML = `
                <h3 style="margin:0 0 18px 0;">${id ? '✏️ Editar patrón' : '➕ Nuevo patrón recurrente'}</h3>

                <div class="form-group">
                    <label>Empleado</label>
                    <select id="rr-emp">${empOpts}</select>
                </div>

                <div class="form-group">
                    <label>Tipo</label>
                    <div style="display:flex;gap:8px;">
                        <button type="button" data-type="libre"
                            onclick="App.ui.rrSetType(this,'libre')"
                            class="rr-type-btn${type === 'libre' ? ' active' : ''}"
                            style="${btnStyle(type === 'libre')}">🗓 Día libre</button>
                        <button type="button" data-type="franja"
                            onclick="App.ui.rrSetType(this,'franja')"
                            class="rr-type-btn${type === 'franja' ? ' active' : ''}"
                            style="${btnStyle(type === 'franja')}">⏰ Franja horaria</button>
                    </div>
                </div>

                <div id="rr-franja-group" class="form-group" style="display:${type === 'franja' ? '' : 'none'};">
                    <label>Franja libre</label>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <button type="button" data-franja="manana"
                            onclick="App.ui.rrSetFranja(this,'manana')"
                            class="rr-franja-btn${franja === 'manana' ? ' active' : ''}"
                            style="${btnStyle(franja === 'manana')}">🌅 Mañana <span style="font-weight:400;font-size:0.75rem;">(10–16h)</span></button>
                        <button type="button" data-franja="tarde"
                            onclick="App.ui.rrSetFranja(this,'tarde')"
                            class="rr-franja-btn${franja === 'tarde' ? ' active' : ''}"
                            style="${btnStyle(franja === 'tarde')}">🌇 Tarde <span style="font-weight:400;font-size:0.75rem;">(16–22h)</span></button>
                        <button type="button" data-franja="custom"
                            onclick="App.ui.rrSetFranja(this,'custom')"
                            class="rr-franja-btn${franja === 'custom' ? ' active' : ''}"
                            style="${btnStyle(franja === 'custom')}">⏱ Personalizada</button>
                    </div>
                    <div id="rr-franja-custom" style="display:${franja === 'custom' ? '' : 'none'};margin-top:10px;">
                        <div style="display:flex;align-items:center;gap:10px;">
                            <div style="flex:1;">
                                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Desde</div>
                                <select id="rr-custom-from" style="font-weight:700;font-size:0.9rem;">
                                    ${Utils.getTimeOptions(r && r.hrlFrom ? r.hrlFrom : '10:00', true)}
                                </select>
                            </div>
                            <span style="font-size:1.1rem;color:var(--text-muted);margin-top:16px;">→</span>
                            <div style="flex:1;">
                                <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Hasta</div>
                                <select id="rr-custom-to" style="font-weight:700;font-size:0.9rem;">
                                    ${Utils.getTimeOptions(r && r.hrlTo ? r.hrlTo : '14:00', true)}
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label>Días de la semana</label>
                    <div style="display:flex;gap:5px;">${daysHtml}</div>
                </div>

                <div class="form-group">
                    <label>Período de vigencia</label>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Desde</div>
                            ${Utils.getDateInputHTML('rr-from', r ? r.dateFrom : '', 'Utils.handleDateInput(this)')}
                        </div>
                        <div>
                            <div style="font-size:0.72rem;color:var(--text-muted);margin-bottom:4px;">Hasta</div>
                            ${Utils.getDateInputHTML('rr-to', r ? r.dateTo : '', 'Utils.handleDateInput(this)')}
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-weight:400;">
                        <input type="checkbox" id="rr-skip-holidays" ${!r || r.skipHolidays ? 'checked' : ''}
                            style="width:16px;height:16px;">
                        <span>No generar en festivos</span>
                    </label>
                </div>

                <div class="form-group">
                    <label>Nota (opcional)</label>
                    <input type="text" id="rr-note" value="${r && r.note ? r.note.replace(/"/g, '&quot;') : ''}"
                        placeholder="Ej: Clases de idiomas" style="padding:8px 10px;">
                </div>

                <button class="btn btn-primary" style="width:100%;margin-bottom:8px;"
                    onclick="App.logic.recurringSave('${id || ''}')">
                    💾 Guardar patrón
                </button>
                ${id ? `
                <button class="btn" style="width:100%;margin-bottom:8px;background:#f8fafc;border:1px solid var(--border);"
                    onclick="App.logic.recurringGenerate('${id}')">
                    ↗ Aplicar patrón
                </button>
                <button class="btn btn-danger" style="width:100%;"
                    onclick="App.logic.recurringDel('${id}')">
                    🗑️ Eliminar patrón
                </button>` : ''}
            `;
        },

        rrToggleDay: function(btn) {
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');
            btn.style.background   = isActive ? '#2563eb' : '#f8fafc';
            btn.style.color        = isActive ? 'white'   : '#475569';
            btn.style.borderColor  = isActive ? '#2563eb' : '#e2e8f0';
        },

        rrSetType: function(btn, type) {
            document.querySelectorAll('.rr-type-btn').forEach(b => {
                const isActive = b.dataset.type === type;
                b.classList.toggle('active', isActive);
                b.style.background  = isActive ? '#2563eb' : '#f8fafc';
                b.style.color       = isActive ? 'white'   : '#475569';
                b.style.borderColor = isActive ? '#2563eb' : '#e2e8f0';
            });
            const fg = document.getElementById('rr-franja-group');
            if (fg) fg.style.display = type === 'franja' ? '' : 'none';
        },

        rrSetFranja: function(btn, franja) {
            document.querySelectorAll('.rr-franja-btn').forEach(b => {
                const isActive = b.dataset.franja === franja;
                b.classList.toggle('active', isActive);
                b.style.background  = isActive ? '#2563eb' : '#f8fafc';
                b.style.color       = isActive ? 'white'   : '#475569';
                b.style.borderColor = isActive ? '#2563eb' : '#e2e8f0';
            });
            const customPanel = document.getElementById('rr-franja-custom');
            if (customPanel) customPanel.style.display = franja === 'custom' ? '' : 'none';
        },

        showRecurringConflictModal: function(conflictItems, empName, typeLabel, onConfirm) {
            const existing = document.getElementById('rr-conflict-overlay');
            if (existing) existing.remove();

            const TYPE_LABEL = typeLabel || { VAC:'Vacaciones', LIB:'Día libre', HRL:'Horas libres', AP:'Asuntos propios', BAJ:'Baja médica' };
            // decisions: { [date]: 'skip'|'overwrite' }
            const decisions = {};

            const overlay = document.createElement('div');
            overlay.id = 'rr-conflict-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';

            const render = () => {
                const allDecided = conflictItems.every(ci => decisions[ci.date]);

                let rowsHtml = conflictItems.map((ci, idx) => {
                    const r = ci.req;
                    const tipo = TYPE_LABEL[r.type] || r.type;
                    const rango = r.start === r.end
                        ? Utils.formatDateES(r.start)
                        : Utils.formatDateES(r.start) + ' \u2192 ' + Utils.formatDateES(r.end);
                    const stColor = r.status === 'approved' ? '#16a34a' : r.status === 'rejected' ? '#dc2626' : '#92400e';
                    const stText  = r.status === 'approved' ? 'Aprobada' : r.status === 'rejected' ? 'Rechazada' : 'Pendiente';
                    const dec = decisions[ci.date];
                    const btnSkip = '<button data-idx="' + idx + '" data-action="skip" style="padding:4px 10px;border-radius:5px;font-size:0.75rem;font-weight:700;cursor:pointer;border:2px solid ' + (dec==='skip'?'#2563eb':'#e2e8f0') + ';background:' + (dec==='skip'?'#eff6ff':'white') + ';color:' + (dec==='skip'?'#2563eb':'#64748b') + ';">Saltar</button>';
                    const btnOvr = '<button data-idx="' + idx + '" data-action="overwrite" style="padding:4px 10px;border-radius:5px;font-size:0.75rem;font-weight:700;cursor:pointer;border:2px solid ' + (dec==='overwrite'?'#dc2626':'#e2e8f0') + ';background:' + (dec==='overwrite'?'#fef2f2':'white') + ';color:' + (dec==='overwrite'?'#dc2626':'#64748b') + ';">Sobreescribir</button>';
                    return '<div style="display:grid;grid-template-columns:90px 1fr auto auto;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;">'
                        + '<span style="font-weight:700;font-size:0.82rem;">' + Utils.formatDateES(ci.date) + '</span>'
                        + '<span style="font-size:0.8rem;color:#475569;">' + tipo + (r.hrlFrom ? ' \xb7 ' + r.hrlFrom + '\u2013' + r.hrlTo : '') + (r.note ? ' \xb7 <em>' + r.note + '</em>' : '') + ' <span style="font-size:0.72rem;font-weight:700;color:' + stColor + ';">(' + stText + ')</span></span>'
                        + btnSkip + btnOvr
                        + '</div>';
                }).join('');

                const confirmStyle = allDecided
                    ? 'padding:9px 20px;border-radius:6px;background:#2563eb;color:white;border:none;cursor:pointer;font-size:0.88rem;font-weight:700;'
                    : 'padding:9px 20px;border-radius:6px;background:#e2e8f0;color:#94a3b8;border:none;cursor:not-allowed;font-size:0.88rem;font-weight:700;';

                overlay.innerHTML = '<div style="background:white;border-radius:10px;padding:26px 28px;max-width:560px;width:93%;box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:82vh;overflow-y:auto;">'
                    + '<h3 style="margin:0 0 8px 0;font-size:1.05rem;">\u26a0\ufe0f Conflictos detectados</h3>'
                    + '<p style="color:#64748b;margin-bottom:6px;font-size:0.85rem;">Elige qu\xe9 hacer con cada petici\xf3n existente de <strong>' + empName + '</strong>:</p>'
                    + '<div style="display:flex;gap:6px;margin-bottom:12px;">'
                    + '<button id="rco-all-skip" style="padding:3px 10px;border-radius:4px;font-size:0.75rem;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;color:#475569;">Saltar todas</button>'
                    + '<button id="rco-all-ovr" style="padding:3px 10px;border-radius:4px;font-size:0.75rem;border:1px solid #e2e8f0;background:#f8fafc;cursor:pointer;color:#475569;">Sobreescribir todas</button>'
                    + '</div>'
                    + '<div id="rco-rows" style="margin-bottom:18px;">' + rowsHtml + '</div>'
                    + '<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;">'
                    + '<span style="font-size:0.78rem;color:#94a3b8;flex:1;">' + (allDecided ? '\u2705 Todo decidido' : Object.keys(decisions).length + ' / ' + conflictItems.length + ' decididos') + '</span>'
                    + '<button id="rco-cancel" style="padding:9px 16px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;font-size:0.88rem;">Cancelar</button>'
                    + '<button id="rco-confirm" ' + (allDecided ? '' : 'disabled') + ' style="' + confirmStyle + '">Confirmar</button>'
                    + '</div></div>';

                document.body.appendChild(overlay);

                // Botones individuales
                overlay.querySelectorAll('[data-action]').forEach(btn => {
                    btn.onclick = () => {
                        const ci = conflictItems[parseInt(btn.dataset.idx)];
                        decisions[ci.date] = btn.dataset.action;
                        overlay.remove();
                        render();
                    };
                });
                // Saltar / sobreescribir todas
                document.getElementById('rco-all-skip').onclick = () => {
                    conflictItems.forEach(ci => decisions[ci.date] = 'skip');
                    overlay.remove(); render();
                };
                document.getElementById('rco-all-ovr').onclick = () => {
                    conflictItems.forEach(ci => decisions[ci.date] = 'overwrite');
                    overlay.remove(); render();
                };
                // Cancelar
                document.getElementById('rco-cancel').onclick = () => overlay.remove();
                // Confirmar
                if (allDecided) {
                    document.getElementById('rco-confirm').onclick = () => { overlay.remove(); onConfirm(decisions); };
                }
            };

            render();
        },

        showRecurringApproveModal: function(patternId) {
            const existing = document.getElementById('rr-approve-overlay');
            if (existing) existing.remove();

            const pattern = (App.data.recurringRequests || []).find(p => p.id === patternId);
            if (!pattern) return;
            const pending = (App.data.requests || []).filter(r =>
                r.recurringId === patternId && !r.archived && r.status === 'pending'
            ).sort((a, b) => a.start.localeCompare(b.start));
            if (pending.length === 0) return;

            const TYPE_LABEL = { VAC:'Vacaciones', LIB:'Día libre', HRL:'Horas libres', AP:'Asuntos propios', BAJ:'Baja médica' };
            const checked = {}; // id -> true
            pending.forEach(r => checked[r.id] = true);

            const overlay = document.createElement('div');
            overlay.id = 'rr-approve-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';

            const render = () => {
                const selectedCount = Object.values(checked).filter(Boolean).length;
                const allChecked = selectedCount === pending.length;

                const rows = pending.map(r => {
                    const tipo = TYPE_LABEL[r.type] || r.type;
                    const fecha = r.start === r.end
                        ? Utils.formatDateES(r.start)
                        : Utils.formatDateES(r.start) + ' \u2192 ' + Utils.formatDateES(r.end);
                    const isChecked = checked[r.id];
                    return '<label style="display:grid;grid-template-columns:20px 1fr;gap:10px;align-items:center;'
                        + 'padding:7px 0;border-bottom:1px solid #f1f5f9;cursor:pointer;'
                        + (isChecked ? 'opacity:1;' : 'opacity:0.45;') + '">'
                        + '<input type="checkbox" data-rid="' + r.id + '" ' + (isChecked ? 'checked' : '') + ' style="width:16px;height:16px;cursor:pointer;accent-color:#2563eb;">'
                        + '<span style="font-size:0.83rem;">'
                        + '<strong>' + fecha + '</strong>'
                        + ' <span style="color:#64748b;">\xb7 ' + tipo + (r.hrlFrom ? ' ' + r.hrlFrom + '\u2013' + r.hrlTo : '') + '</span>'
                        + (r.note ? ' <span style="color:#94a3b8;font-style:italic;">\xb7 ' + r.note + '</span>' : '')
                        + '</span></label>';
                }).join('');

                overlay.innerHTML = '<div style="background:white;border-radius:10px;padding:26px 28px;max-width:480px;width:93%;'
                    + 'box-shadow:0 20px 60px rgba(0,0,0,0.25);max-height:80vh;display:flex;flex-direction:column;">'
                    + '<h3 style="margin:0 0 4px 0;font-size:1.05rem;">\u2705 Aprobar eventos pendientes</h3>'
                    + '<p style="color:#64748b;font-size:0.83rem;margin:0 0 12px 0;">Patr\xf3n de <strong>' + (App.data.empleados.find(e=>e.id===pattern.empId)||{}).nombre + '</strong></p>'
                    + '<label style="display:flex;align-items:center;gap:8px;font-size:0.8rem;color:#475569;margin-bottom:10px;cursor:pointer;">'
                    + '<input type="checkbox" id="rra-all" ' + (allChecked?'checked':'') + ' style="width:15px;height:15px;accent-color:#2563eb;"> Seleccionar todos'
                    + '</label>'
                    + '<div style="overflow-y:auto;flex:1;min-height:0;padding-right:2px;">' + rows + '</div>'
                    + '<div style="display:flex;gap:8px;justify-content:flex-end;align-items:center;margin-top:16px;padding-top:14px;border-top:1px solid #f1f5f9;">'
                    + '<span style="flex:1;font-size:0.78rem;color:#94a3b8;">' + selectedCount + ' de ' + pending.length + ' seleccionadas</span>'
                    + '<button id="rra-cancel" style="padding:8px 16px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;font-size:0.87rem;">Cancelar</button>'
                    + '<button id="rra-confirm" ' + (selectedCount===0?'disabled':'') + ' style="padding:8px 18px;border-radius:6px;border:none;cursor:' + (selectedCount===0?'not-allowed':'pointer') + ';font-size:0.87rem;font-weight:700;background:' + (selectedCount===0?'#e2e8f0':'#16a34a') + ';color:' + (selectedCount===0?'#94a3b8':'white') + ';">'
                    + '\u2714 Aprobar ' + (selectedCount > 0 ? '(' + selectedCount + ')' : '') + '</button>'
                    + '</div></div>';

                document.body.appendChild(overlay);

                // Checkbox individual
                overlay.querySelectorAll('[data-rid]').forEach(cb => {
                    cb.onchange = () => {
                        checked[cb.dataset.rid] = cb.checked;
                        overlay.remove(); render();
                    };
                });
                // Seleccionar todos
                document.getElementById('rra-all').onchange = (e) => {
                    pending.forEach(r => checked[r.id] = e.target.checked);
                    overlay.remove(); render();
                };
                // Cancelar
                document.getElementById('rra-cancel').onclick = () => overlay.remove();
                // Confirmar
                if (selectedCount > 0) {
                    document.getElementById('rra-confirm').onclick = () => {
                        const toApprove = pending.filter(r => checked[r.id]);
                        App.logic.saveSnapshot('Aprobar eventos recurrentes');
                        toApprove.forEach(r => {
                            const idx = App.data.requests.findIndex(req => req.id === r.id);
                            if (idx !== -1) App.data.requests[idx].status = 'approved';
                        });
                        Safe.save('v40_db', App.data);
                        overlay.remove();
                        App.router.go('requests');
                    };
                }
            };

            render();
        },

        showStatusPopover: function(reqId, anchor) {
            // Cerrar cualquier popover existente
            const prev = document.getElementById('req-status-popover');
            if (prev) {
                prev.remove();
                // Si era el mismo botón, solo cerrar
                if (prev.dataset.reqid === reqId) return;
            }

            const STATES = [
                { key: 'pending',  label: 'Pendiente', bg: '#fef08a', color: '#78350f', dot: '#eab308' },
                { key: 'approved', label: 'Aprobada',  bg: '#dcfce7', color: '#166534', dot: '#16a34a' },
                { key: 'rejected', label: 'Rechazada', bg: '#fee2e2', color: '#991b1b', dot: '#dc2626' }
            ];
            const req = (App.data.requests || []).find(r => r.id === reqId);
            if (!req) return;

            const pop = document.createElement('div');
            pop.id = 'req-status-popover';
            pop.dataset.reqid = reqId;
            pop.style.cssText = 'position:fixed;z-index:9999;background:white;border-radius:8px;'
                + 'box-shadow:0 4px 20px rgba(0,0,0,0.18);padding:6px;display:flex;flex-direction:column;gap:4px;min-width:130px;';

            STATES.forEach(s => {
                const btn = document.createElement('button');
                const isCurrent = req.status === s.key;
                btn.style.cssText = 'display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;border:none;'
                    + 'cursor:' + (isCurrent ? 'default' : 'pointer') + ';text-align:left;font-size:0.82rem;font-weight:600;'
                    + 'background:' + (isCurrent ? s.bg : 'white') + ';color:' + (isCurrent ? s.color : '#475569') + ';';
                btn.onmouseover = () => { if (!isCurrent) btn.style.background = '#f8fafc'; };
                btn.onmouseout  = () => { if (!isCurrent) btn.style.background = 'white'; };
                const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + s.dot + ';flex-shrink:0;"></span>';
                btn.innerHTML = dot + s.label + (isCurrent ? ' <span style="margin-left:auto;opacity:0.5;font-size:0.7rem;">\u2714</span>' : '');
                if (!isCurrent) {
                    btn.onclick = () => {
                        pop.remove();
                        App.logic.reqSetStatus(reqId, s.key);
                    };
                }
                pop.appendChild(btn);
            });

            document.body.appendChild(pop);

            // Posicionar bajo el anchor
            const rect = anchor.getBoundingClientRect();
            const popH = 120; // aprox
            const below = rect.bottom + popH < window.innerHeight;
            pop.style.top  = (below ? rect.bottom + 4 : rect.top - popH - 4) + 'px';
            pop.style.left = Math.min(rect.left, window.innerWidth - 145) + 'px';

            // Cerrar al click fuera
            const dismiss = (e) => {
                if (!pop.contains(e.target) && e.target !== anchor) {
                    pop.remove();
                    document.removeEventListener('mousedown', dismiss);
                }
            };
            setTimeout(() => document.addEventListener('mousedown', dismiss), 0);
        },

        _renderLibranzas: function(c, sectionBar) {
            if (c.parentElement) c.parentElement.style.cssText += ';display:flex;flex-direction:column;';
            c.style.cssText = 'padding:16px;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;';

            if (!App.data.libranzaPlans) App.data.libranzaPlans = [];
            if (!App.uiState.libranzas) App.uiState.libranzas = { mode: 'list', empId: null, selected: [], denied: [], year: new Date().getFullYear(), editId: null };
            if (!App.uiState.libranzas.denied) App.uiState.libranzas.denied = [];
            const st = App.uiState.libranzas;

            if (st.mode === 'calendar') {
                this._renderLibranzasCalendar(c, sectionBar);
            } else {
                this._renderLibranzasList(c, sectionBar);
            }
        },

        _renderLibranzasList: function(c, sectionBar) {
            const plans = App.data.libranzaPlans || [];
            const todayStr = new Date().toISOString().slice(0,10);

            let html = sectionBar + `<div style="max-width:680px;margin:0 auto;width:100%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                    <span style="font-size:0.82rem;color:#64748b;font-weight:500;">${plans.length} plan${plans.length!==1?'es':''}</span>
                    <button onclick="App.uiState.libranzas.mode='calendar';App.uiState.libranzas.selected=[];App.uiState.libranzas.denied=[];App.uiState.libranzas.editId=null;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                        style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:none;
                               background:#2563eb;color:white;font-size:0.82rem;font-weight:600;cursor:pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Nuevo plan
                    </button>
                </div>`;

            if (plans.length === 0) {
                html += `<div style="text-align:center;padding:50px;border:2px dashed #e2e8f0;border-radius:8px;color:#94a3b8;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">📋</div>
                    <div style="font-weight:600;margin-bottom:6px;">No hay planes de libranza</div>
                    <div style="font-size:0.85rem;">Crea un plan para asignar días libres a un empleado.</div>
                </div>`;
            } else {
                html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
                plans.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).forEach(p => {
                    const emp = App.data.empleados.find(e => e.id === p.empId);
                    const empName = emp ? emp.nombre : '(eliminado)';
                    const futureDates = p.dates.filter(d => d >= todayStr);
                    const pastDates = p.dates.filter(d => d < todayStr);
                    const dateRange = p.dates.length > 0 ? `${Utils.formatDateES(p.dates[0])} → ${Utils.formatDateES(p.dates[p.dates.length-1])}` : '';
                    // Contar revocadas
                    let revokedCount = 0;
                    if (p.applied) {
                        p.dates.forEach(d => {
                            const sv = (App.data.schedule[d] || {})[p.empId];
                            if (!sv) { revokedCount++; return; }
                            const sh = Utils.getShift(sv);
                            if (!sh || !sh.fixed || (sh.code !== 'L' && sh.code !== 'F')) revokedCount++;
                        });
                    }
                    const deniedCount = (p.denied || []).length;
                    let appliedBadge = '';
                    if (!p.applied) {
                        appliedBadge = `<span style="padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:0.68rem;font-weight:700;">Pendiente</span>`;
                    } else if (revokedCount > 0) {
                        appliedBadge = `<span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:4px;font-size:0.68rem;font-weight:700;">${revokedCount} revocada${revokedCount !== 1 ? 's' : ''}</span>`;
                    } else {
                        appliedBadge = `<span style="padding:2px 8px;background:#dcfce7;color:#15803d;border-radius:4px;font-size:0.68rem;font-weight:700;">Aplicado</span>`;
                    }
                    if (deniedCount > 0) {
                        appliedBadge += ` <span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:4px;font-size:0.68rem;font-weight:700;">${deniedCount} denegado${deniedCount !== 1 ? 's' : ''}</span>`;
                    }

                    html += `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;cursor:pointer;transition:box-shadow 0.15s;"
                        onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-weight:700;font-size:0.88rem;color:#1e293b;">${empName}</span>
                                ${appliedBadge}
                            </div>
                            <div style="display:flex;gap:4px;">
                                ${!p.applied ? `<button onclick="event.stopPropagation();App.ui._libranzaPlanApply('${p.id}')" title="Aplicar al planificador" style="background:none;border:none;cursor:pointer;color:#16a34a;padding:2px 4px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>` : ''}
                                <button onclick="event.stopPropagation();App.ui._libranzaPlanEdit('${p.id}')" title="Editar" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px 4px;">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                                </button>
                                <button onclick="event.stopPropagation();App.ui._libranzaPlanDel('${p.id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:2px 4px;">✕</button>
                            </div>
                        </div>
                        <div style="font-size:0.78rem;color:#64748b;">${p.dates.length} día${p.dates.length!==1?'s':''} · ${dateRange}</div>
                        ${pastDates.length > 0 && futureDates.length > 0 ? `<div style="font-size:0.7rem;color:#94a3b8;margin-top:2px;">${futureDates.length} pendiente${futureDates.length!==1?'s':''}, ${pastDates.length} pasado${pastDates.length!==1?'s':''}</div>` : ''}
                    </div>`;
                });
                html += `</div>`;
            }
            html += `</div>`;

            c.innerHTML = html;
            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        _renderLibranzasCalendar: function(c, sectionBar) {
            const st = App.uiState.libranzas;
            if (!st.empId && App.data.empleados.length > 0) st.empId = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder)[0]?.id || null;

            const DIAS_H = ['L','M','X','J','V','S','D'];
            const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const holidays = new Set((App.data.storeConfig.holidays || []).map(h => h.date));

            const empOpts = App.data.empleados
                .filter(e => e.active !== false)
                .sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}" ${e.id === st.empId ? 'selected' : ''}>${e.nombre}</option>`).join('');

            // Detectar fechas revocadas: están en el plan aplicado pero ya no tienen L/F en schedule
            const editingPlan = st.editId ? (App.data.libranzaPlans || []).find(p => p.id === st.editId) : null;
            const revokedSet = new Set();
            if (editingPlan && editingPlan.applied) {
                editingPlan.dates.forEach(d => {
                    const sv = (App.data.schedule[d] || {})[st.empId];
                    if (!sv) { revokedSet.add(d); return; }
                    const sh = Utils.getShift(sv);
                    if (!sh || !sh.fixed || (sh.code !== 'L' && sh.code !== 'F')) revokedSet.add(d);
                });
            }

            const buildMonth = (year, month) => {
                const first = new Date(year, month, 1);
                let startDow = first.getDay();
                startDow = startDow === 0 ? 6 : startDow - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let cells = '';
                for (let i = 0; i < startDow; i++) cells += `<div style="width:28px;height:24px;"></div>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const isSelected = st.selected.includes(iso);
                    const isDenied = st.denied.includes(iso);
                    const isRevoked = revokedSet.has(iso);
                    const isHoliday = holidays.has(iso);
                    const isSun = new Date(year, month, d).getDay() === 0;
                    const isPast = iso < new Date().toISOString().slice(0,10);
                    let bg = 'white', color = '#1e293b', border = '1px solid #e2e8f0', title = '';
                    if (isDenied) {
                        bg = '#ef4444'; color = 'white'; border = '1px solid #dc2626';
                        title = 'title="Denegado — esta fecha no se aplicará"';
                    } else if (isSelected && isRevoked) {
                        bg = '#ef4444'; color = 'white'; border = '1px solid #dc2626';
                        title = 'title="Revocada — esta libranza fue concedida pero se modificó posteriormente"';
                    } else if (isSelected) {
                        bg = '#2563eb'; color = 'white'; border = '1px solid #2563eb';
                    } else if (isHoliday) {
                        bg = '#fef3c7'; color = '#92400e'; border = '1px solid #fcd34d';
                    } else if (isSun) { color = '#7c3aed'; }
                    if (isPast && !isRevoked && !isDenied) { bg = isSelected ? '#93c5fd' : '#f8fafc'; color = isSelected ? 'white' : '#cbd5e1'; }
                    const cursor = isPast ? 'default' : 'pointer';
                    const onclick = isPast ? '' : `onclick="App.ui._libranzaToggle('${iso}', this)"`;
                    cells += `<div ${onclick} ${title} style="width:28px;height:24px;display:flex;align-items:center;justify-content:center;
                        font-size:0.72rem;font-weight:${isSelected?'700':'500'};border-radius:4px;cursor:${cursor};
                        background:${bg};color:${color};border:${border};transition:all 0.1s;">${d}</div>`;
                }
                return `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    <div style="text-align:center;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:6px;">${MESES[month]} ${year}</div>
                    <div style="display:grid;grid-template-columns:repeat(7,28px);gap:2px;justify-content:center;">
                        ${DIAS_H.map(d => `<div style="width:28px;text-align:center;font-size:0.6rem;font-weight:700;color:#94a3b8;">${d}</div>`).join('')}
                        ${cells}
                    </div>
                </div>`;
            };

            let monthsHtml = '';
            for (let m = 0; m < 12; m++) monthsHtml += buildMonth(st.year, m);

            const count = st.selected.filter(d => d >= new Date().toISOString().slice(0,10)).length;
            const countDenied = st.denied.filter(d => d >= new Date().toISOString().slice(0,10)).length;
            const countFestivos = st.selected.filter(d => holidays.has(d)).length;
            const countRevoked = revokedSet.size;

            let summaryContent = '';
            if (count > 0 || countDenied > 0) {
                let info = count > 0 ? `${count} día${count !== 1 ? 's' : ''}` : '';
                if (countDenied > 0) info += `${info ? ' · ' : ''}<span style="color:#ef4444;font-weight:700;">${countDenied} denegado${countDenied !== 1 ? 's' : ''}</span>`;
                if (countRevoked > 0) info += ` · <span style="color:#ef4444;font-weight:700;">${countRevoked} revocada${countRevoked !== 1 ? 's' : ''}</span>`;
                if (countFestivos > 0) info += ` (${countFestivos} festivo → F)`;
                summaryContent = `<span style="font-size:0.78rem;font-weight:600;color:#1e293b;">${info}</span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.ui._libranzaClear()" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Limpiar</button>
                        <button onclick="App.ui._libranzaSavePlan()" style="padding:4px 10px;border:none;border-radius:5px;background:#2563eb;color:white;font-size:0.72rem;font-weight:700;cursor:pointer;">${st.editId ? 'Guardar cambios' : 'Crear plan'}</button>
                    </div>`;
            } else {
                summaryContent = `<span style="font-size:0.78rem;color:#94a3b8;">Selecciona los días de libranza en el calendario</span>`;
            }

            c.innerHTML = sectionBar + `
                <div style="max-width:980px;margin:0 auto;width:100%;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;height:34px;">
                        <button onclick="App.uiState.libranzas.mode='list';App.ui.renderRequests(document.querySelector('.main-scroll'))"
                            style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;flex-shrink:0;">◀ Volver</button>
                        <select onchange="App.uiState.libranzas.empId=this.value; App.uiState.libranzas.selected=[]; App.uiState.libranzas.denied=[]; App.ui.renderRequests(document.querySelector('.main-scroll'))"
                            style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.78rem;color:#1e293b;max-width:120px;flex-shrink:0;">${empOpts}</select>
                        <div id="libranza-summary" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex:1;padding:5px 10px;background:${count > 0 ? '#eff6ff' : '#f8fafc'};border:1px solid ${count > 0 ? '#bfdbfe' : '#e2e8f0'};border-radius:6px;height:100%;box-sizing:border-box;">
                            ${summaryContent}
                        </div>
                        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                            <button onclick="App.uiState.libranzas.year--;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">◀</button>
                            <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:40px;text-align:center;">${st.year}</span>
                            <button onclick="App.uiState.libranzas.year++;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">▶</button>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
                        ${monthsHtml}
                    </div>
                </div>`;

            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        _libranzaToggle: function(iso, el) {
            const sel = App.uiState.libranzas.selected;
            const den = App.uiState.libranzas.denied;
            const holidays = new Set((App.data.storeConfig.holidays || []).map(h => h.date));
            const selIdx = sel.indexOf(iso);
            const denIdx = den.indexOf(iso);

            if (denIdx >= 0) {
                // Denied → deselected
                den.splice(denIdx, 1);
                const isHoliday = holidays.has(iso);
                const isSun = new Date(iso + 'T12:00:00').getDay() === 0;
                el.style.background = isHoliday ? '#fef3c7' : 'white';
                el.style.color = isHoliday ? '#92400e' : (isSun ? '#7c3aed' : '#1e293b');
                el.style.border = isHoliday ? '1px solid #fcd34d' : '1px solid #e2e8f0';
                el.style.fontWeight = '500';
                el.title = '';
            } else if (selIdx >= 0) {
                // Selected → denied
                sel.splice(selIdx, 1);
                den.push(iso);
                den.sort();
                el.style.background = '#ef4444';
                el.style.color = 'white';
                el.style.border = '1px solid #dc2626';
                el.style.fontWeight = '700';
                el.title = 'Denegado — esta fecha no se aplicará';
            } else {
                // Deselected → selected
                sel.push(iso);
                sel.sort();
                el.style.background = '#2563eb';
                el.style.color = 'white';
                el.style.border = '1px solid #2563eb';
                el.style.fontWeight = '700';
                el.title = '';
            }

            const todayStr = new Date().toISOString().slice(0,10);
            const count = sel.filter(d => d >= todayStr).length;
            const countDen = den.filter(d => d >= todayStr).length;
            const summaryEl = document.getElementById('libranza-summary');
            if (summaryEl) {
                const editId = App.uiState.libranzas.editId;
                if (count > 0 || countDen > 0) {
                    const countF = sel.filter(d => holidays.has(d)).length;
                    let info = count > 0 ? `${count} día${count !== 1 ? 's' : ''} seleccionado${count !== 1 ? 's' : ''}` : '';
                    if (countDen > 0) info += `${info ? ' · ' : ''}<span style="color:#ef4444;font-weight:700;">${countDen} denegado${countDen !== 1 ? 's' : ''}</span>`;
                    if (countF > 0) info += ` (${countF} festivo → F)`;
                    summaryEl.innerHTML = `<span style="font-size:0.78rem;font-weight:600;color:#1e293b;">${info}</span>
                        <div style="display:flex;gap:4px;">
                            <button onclick="App.ui._libranzaClear()" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Limpiar</button>
                            <button onclick="App.ui._libranzaSavePlan()" style="padding:4px 10px;border:none;border-radius:5px;background:#2563eb;color:white;font-size:0.72rem;font-weight:700;cursor:pointer;">${editId ? 'Guardar cambios' : 'Crear plan'}</button>
                        </div>`;
                    summaryEl.style.background = '#eff6ff';
                    summaryEl.style.borderColor = '#bfdbfe';
                } else {
                    summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#94a3b8;">Selecciona los días de libranza en el calendario</span>`;
                    summaryEl.style.background = '#f8fafc';
                    summaryEl.style.borderColor = '#e2e8f0';
                }
            }
        },

        _libranzaClear: function() {
            App.uiState.libranzas.selected = [];
            App.uiState.libranzas.denied = [];
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _libranzaSavePlan: function() {
            const st = App.uiState.libranzas;
            const emp = App.data.empleados.find(e => e.id === st.empId);
            if (!emp) return;
            const todayStr = new Date().toISOString().slice(0,10);
            const dates = st.selected.filter(d => d >= todayStr).sort();
            const denied = st.denied.filter(d => d >= todayStr).sort();
            if (dates.length === 0 && denied.length === 0) { alert('No hay días futuros seleccionados.'); return; }

            if (!App.data.libranzaPlans) App.data.libranzaPlans = [];

            if (st.editId) {
                // Editar plan existente
                const plan = App.data.libranzaPlans.find(p => p.id === st.editId);
                if (plan) {
                    plan.empId = st.empId;
                    plan.dates = dates;
                    plan.denied = denied;
                    plan.applied = false; // resetear al editar
                }
            } else {
                // Crear nuevo
                App.data.libranzaPlans.push({
                    id: 'lp_' + Date.now(),
                    empId: st.empId,
                    dates,
                    denied,
                    createdAt: new Date().toISOString(),
                    applied: false
                });
            }

            Safe.save('v40_db', App.data);
            st.mode = 'list';
            st.selected = [];
            st.denied = [];
            st.editId = null;
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _libranzaPlanEdit: function(planId) {
            const plan = (App.data.libranzaPlans || []).find(p => p.id === planId);
            if (!plan) return;
            const st = App.uiState.libranzas;
            st.mode = 'calendar';
            st.empId = plan.empId;
            st.selected = [...plan.dates];
            st.denied = [...(plan.denied || [])];
            st.editId = plan.id;
            const allDates = [...plan.dates, ...(plan.denied || [])];
            st.year = allDates[0] ? parseInt(allDates[0].slice(0,4)) : new Date().getFullYear();
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _libranzaPlanDel: function(planId) {
            if (!confirm('¿Eliminar este plan de libranzas?')) return;
            App.data.libranzaPlans = (App.data.libranzaPlans || []).filter(p => p.id !== planId);
            Safe.save('v40_db', App.data);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _libranzaPlanApply: function(planId) {
            const plan = (App.data.libranzaPlans || []).find(p => p.id === planId);
            if (!plan) return;
            const emp = App.data.empleados.find(e => e.id === plan.empId);
            if (!emp) return;

            const todayStr = new Date().toISOString().slice(0,10);
            const deniedSet = new Set(plan.denied || []);
            const dates = plan.dates.filter(d => d >= todayStr && !deniedSet.has(d));
            if (dates.length === 0) { alert('No quedan días futuros en este plan (excluidos los denegados).'); return; }

            const holidays = new Set((App.data.storeConfig.holidays || []).map(h => h.date));
            const fixedL = App.data.fixedShifts.find(s => s.code === 'L');
            const fixedF = App.data.fixedShifts.find(s => s.code === 'F');

            // Detectar conflictos
            const conflicts = [];
            dates.forEach(d => {
                const sv = (App.data.schedule[d] || {})[emp.id];
                if (sv) {
                    const sh = Utils.getShift(sv);
                    if (sh && !sh.fixed) {
                        conflicts.push({ date: d, shift: sh });
                    }
                }
            });

            if (conflicts.length > 0) {
                const lista = conflicts.map(cf => `• ${Utils.formatDateES(cf.date)} — ${cf.shift.code || cf.shift.start + '–' + cf.shift.end}`).join('\n');
                if (!confirm(`⚠️ ${conflicts.length} día${conflicts.length !== 1 ? 's' : ''} ya tiene${conflicts.length !== 1 ? 'n' : ''} turno:\n\n${lista}\n\n[Aceptar] → Sobreescribir\n[Cancelar] → Cancelar`)) return;
            }

            let countL = 0, countF = 0;
            const countFestivos = dates.filter(d => holidays.has(d)).length;
            if (countFestivos > 0) {
                alert(`ℹ️ ${countFestivos} día${countFestivos !== 1 ? 's' : ''} coincide${countFestivos !== 1 ? 'n' : ''} con festivo y se marcarán como F en lugar de L.`);
            }

            dates.forEach(d => {
                if (!App.data.schedule[d]) App.data.schedule[d] = {};
                if (holidays.has(d)) {
                    App.data.schedule[d][emp.id] = fixedF.id;
                    countF++;
                } else {
                    App.data.schedule[d][emp.id] = fixedL.id;
                    countL++;
                }
            });

            plan.applied = true;
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();

            alert(`✅ Plan aplicado para ${emp.nombre}:\n• ${countL} día${countL !== 1 ? 's' : ''} → L\n${countF > 0 ? `• ${countF} día${countF !== 1 ? 's' : ''} → F (festivo)\n` : ''}`);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        // ============================================================
        // PLAN GENÉRICO (vacaciones) — reutilizable
        // ============================================================
        _planConfig: function(type) {
            if (type === 'vacaciones') return {
                dataKey: 'vacacionesPlans', uiKey: 'vacacionesPlan', shiftCode: 'V',
                label: 'vacaciones', emoji: '🏖️', color: '#a855f7',
                idPrefix: 'vp_', badge: 'Vacaciones'
            };
            return null;
        },

        // Barra de 3 vistas siempre visible (en list / global / agenda): Tarjetas / Global / Agenda
        _planToolbar: function(type) {
            const cfg = this._planConfig(type);
            const mode = App.uiState[cfg.uiKey].mode;
            const _r = `App.ui.renderRequests(document.querySelector('.main-scroll'))`;
            const btn = (key, label, icon) => {
                const on = mode === key;
                return `<button onclick="App.uiState.${cfg.uiKey}.mode='${key}';${_r}"
                    style="display:flex;align-items:center;gap:5px;padding:5px 12px;border:1px solid ${on?'#2563eb':'#e2e8f0'};border-radius:6px;background:${on?'#eff6ff':'white'};color:${on?'#2563eb':'#64748b'};font-size:0.78rem;font-weight:600;cursor:pointer;">${icon}${label}</button>`;
            };
            return `<div style="display:flex;gap:4px;">${btn('list','Tarjetas','📇')}${btn('global','Vista global','📅')}${btn('agenda','Agenda','📋')}</div>`;
        },

        _renderPlanGeneric: function(c, sectionBar, type) {
            if (c.parentElement) c.parentElement.style.cssText += ';display:flex;flex-direction:column;';
            c.style.cssText = 'padding:16px;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;';
            const cfg = this._planConfig(type);
            if (!App.data[cfg.dataKey]) App.data[cfg.dataKey] = [];
            if (!App.uiState[cfg.uiKey]) App.uiState[cfg.uiKey] = { mode: 'list', empId: null, selected: [], year: new Date().getFullYear(), editId: null };
            const st = App.uiState[cfg.uiKey];
            if (st.mode === 'calendar') this._renderPlanCalendar(c, sectionBar, type);
            else if (st.mode === 'global') this._renderPlanGlobal(c, sectionBar, type);
            else if (st.mode === 'agenda') this._renderPlanAgenda(c, sectionBar, type);
            else this._renderPlanList(c, sectionBar, type);
        },

        _renderPlanList: function(c, sectionBar, type) {
            const cfg = this._planConfig(type);
            const plans = App.data[cfg.dataKey] || [];
            const todayStr = new Date().toISOString().slice(0,10);
            const uiKey = cfg.uiKey;

            // Detectar empleados con múltiples planes (para botón fusionar)
            const empPlanCount = {};
            plans.forEach(p => { empPlanCount[p.empId] = (empPlanCount[p.empId] || 0) + 1; });
            const hasDuplicates = Object.values(empPlanCount).some(c => c > 1);

            let html = sectionBar + `<div style="max-width:680px;margin:0 auto;width:100%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        ${this._planToolbar(type)}
                        <span style="font-size:0.82rem;color:#64748b;font-weight:500;">${plans.length} plan${plans.length!==1?'es':''}</span>
                    </div>
                    <div style="display:flex;gap:6px;">
                        ${hasDuplicates ? `<button onclick="App.ui._planMergeAll('${type}')"
                            style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:1px solid #e2e8f0;
                                   background:white;color:#64748b;font-size:0.82rem;font-weight:600;cursor:pointer;">
                            🔗 Fusionar
                        </button>` : ''}
                        <button onclick="App.uiState.${uiKey}.mode='calendar';App.uiState.${uiKey}.selected=[];App.uiState.${uiKey}.editId=null;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                            style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:none;
                                   background:#2563eb;color:white;font-size:0.82rem;font-weight:600;cursor:pointer;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Nuevo plan
                        </button>
                    </div>
                </div>`;

            if (plans.length === 0) {
                html += `<div style="text-align:center;padding:50px;border:2px dashed #e2e8f0;border-radius:8px;color:#94a3b8;">
                    <div style="font-size:2.5rem;margin-bottom:12px;">${cfg.emoji}</div>
                    <div style="font-weight:600;margin-bottom:6px;">No hay planes de ${cfg.label}</div>
                    <div style="font-size:0.85rem;">Crea un plan para asignar ${cfg.label} a un empleado.</div>
                </div>`;
            } else {
                html += `<div style="display:flex;flex-direction:column;gap:8px;">`;
                plans.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).forEach(p => {
                    const emp = App.data.empleados.find(e => e.id === p.empId);
                    const empName = emp ? emp.nombre : '(eliminado)';
                    const dateRange = p.dates.length > 0 ? `${Utils.formatDateES(p.dates[0])} → ${Utils.formatDateES(p.dates[p.dates.length-1])}` : '';
                    let revokedCount = 0;
                    if (p.applied) {
                        p.dates.forEach(d => {
                            const sv = (App.data.schedule[d] || {})[p.empId];
                            if (!sv) { revokedCount++; return; }
                            const sh = Utils.getShift(sv);
                            if (!sh || !sh.fixed || sh.code !== cfg.shiftCode) revokedCount++;
                        });
                    }
                    let badge = '';
                    if (!p.applied) badge = `<span style="padding:2px 8px;background:#fef3c7;color:#92400e;border-radius:4px;font-size:0.68rem;font-weight:700;">Pendiente</span>`;
                    else if (revokedCount > 0) badge = `<span style="padding:2px 8px;background:#fee2e2;color:#dc2626;border-radius:4px;font-size:0.68rem;font-weight:700;">${revokedCount} revocada${revokedCount!==1?'s':''}</span>`;
                    else badge = `<span style="padding:2px 8px;background:#dcfce7;color:#15803d;border-radius:4px;font-size:0.68rem;font-weight:700;">Aplicado</span>`;

                    html += `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;cursor:pointer;transition:box-shadow 0.15s;"
                        onmouseover="this.style.boxShadow='0 2px 8px rgba(0,0,0,0.08)'" onmouseout="this.style.boxShadow='none'">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="font-weight:700;font-size:0.88rem;color:#1e293b;">${empName}</span>
                                ${badge}
                            </div>
                            <div style="display:flex;gap:4px;">
                                ${!p.applied ? `<button onclick="event.stopPropagation();App.ui._planApply('${type}','${p.id}')" title="Aplicar" style="background:none;border:none;cursor:pointer;color:#16a34a;padding:2px 4px;">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                </button>` : ''}
                                <button onclick="event.stopPropagation();App.ui._planEdit('${type}','${p.id}')" title="Editar" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px 4px;">
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                                </button>
                                <button onclick="event.stopPropagation();App.ui._planDel('${type}','${p.id}')" title="Eliminar" style="background:none;border:none;cursor:pointer;color:#ef4444;padding:2px 4px;">✕</button>
                            </div>
                        </div>
                        <div style="font-size:0.78rem;color:#64748b;">${p.dates.length} día${p.dates.length!==1?'s':''} · ${dateRange}</div>
                    </div>`;
                });
                html += `</div>`;
            }

            // Planes virtuales (V del schedule sin plan) — solo vacaciones
            if (type === 'vacaciones') {
                const orphans = this._getOrphanVacDays();
                if (orphans.length > 0) {
                    html += `<div style="margin-top:16px;padding-top:12px;border-top:1px dashed #e2e8f0;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                            <span style="font-size:0.72rem;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;">Del planificador (sin plan asociado)</span>
                            <button onclick="App.ui._planAbsorbOrphans()"
                                style="padding:4px 12px;border:1px solid #c4b5fd;border-radius:6px;background:#faf5ff;color:#7c3aed;font-size:0.72rem;font-weight:600;cursor:pointer;">
                                🔗 Incorporar a planes
                            </button>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">`;
                    orphans.forEach(p => {
                        const emp = App.data.empleados.find(e => e.id === p.empId);
                        const empName = emp ? emp.nombre : '?';
                        const dateRange = `${Utils.formatDateES(p.dates[0])} → ${Utils.formatDateES(p.dates[p.dates.length-1])}`;
                        html += `<div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:8px;padding:10px 14px;opacity:0.8;">
                            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                                <span style="font-weight:600;font-size:0.85rem;color:#7c3aed;">${empName}</span>
                                <span style="padding:2px 8px;background:#f3e8ff;color:#7c3aed;border-radius:4px;font-size:0.65rem;font-weight:700;">Planificador</span>
                            </div>
                            <div style="font-size:0.75rem;color:#64748b;">${p.dates.length} día${p.dates.length!==1?'s':''} · ${dateRange}</div>
                        </div>`;
                    });
                    html += `</div></div>`;
                }
            }

            html += `</div>`;
            c.innerHTML = html;
            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        _renderPlanCalendar: function(c, sectionBar, type) {
            const cfg = this._planConfig(type);
            const st = App.uiState[cfg.uiKey];
            if (!st.empId && App.data.empleados.length > 0) st.empId = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder)[0]?.id || null;

            const DIAS_H = ['L','M','X','J','V','S','D'];
            const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

            const empOpts = App.data.empleados
                .filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}" ${e.id === st.empId ? 'selected' : ''}>${e.nombre}</option>`).join('');

            // Revocadas
            const editingPlan = st.editId ? (App.data[cfg.dataKey] || []).find(p => p.id === st.editId) : null;
            const revokedSet = new Set();
            if (editingPlan && editingPlan.applied) {
                editingPlan.dates.forEach(d => {
                    const sv = (App.data.schedule[d] || {})[st.empId];
                    if (!sv) { revokedSet.add(d); return; }
                    const sh = Utils.getShift(sv);
                    if (!sh || !sh.fixed || sh.code !== cfg.shiftCode) revokedSet.add(d);
                });
            }

            const buildMonth = (year, month) => {
                const first = new Date(year, month, 1);
                let startDow = first.getDay();
                startDow = startDow === 0 ? 6 : startDow - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let cells = '';
                for (let i = 0; i < startDow; i++) cells += `<div style="width:28px;height:24px;"></div>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const isSelected = st.selected.includes(iso);
                    const isRevoked = revokedSet.has(iso);
                    const isSun = new Date(year, month, d).getDay() === 0;
                    const isPast = iso < new Date().toISOString().slice(0,10);
                    let bg = 'white', color = '#1e293b', border = '1px solid #e2e8f0', title = '';
                    if (isSelected && isRevoked) { bg = '#ef4444'; color = 'white'; border = '1px solid #dc2626'; title = `title="Revocada — estas ${cfg.label} fueron concedidas pero se modificaron"`; }
                    else if (isSelected) { bg = cfg.color; color = 'white'; border = `1px solid ${cfg.color}`; }
                    else if (isSun) { color = '#7c3aed'; }
                    if (isPast && !isRevoked) { bg = isSelected ? cfg.color + '88' : '#f8fafc'; color = isSelected ? 'white' : '#cbd5e1'; }
                    const cursor = isPast ? 'default' : 'pointer';
                    const onclick = isPast ? '' : `onclick="App.ui._planToggle('${type}','${iso}', this)"`;
                    cells += `<div ${onclick} ${title} style="width:28px;height:24px;display:flex;align-items:center;justify-content:center;
                        font-size:0.72rem;font-weight:${isSelected?'700':'500'};border-radius:4px;cursor:${cursor};
                        background:${bg};color:${color};border:${border};transition:all 0.1s;">${d}</div>`;
                }
                return `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    <div style="text-align:center;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:6px;">${MESES[month]} ${year}</div>
                    <div style="display:grid;grid-template-columns:repeat(7,28px);gap:2px;justify-content:center;">
                        ${DIAS_H.map(d => `<div style="width:28px;text-align:center;font-size:0.6rem;font-weight:700;color:#94a3b8;">${d}</div>`).join('')}
                        ${cells}
                    </div>
                </div>`;
            };

            let monthsHtml = '';
            for (let m = 0; m < 12; m++) monthsHtml += buildMonth(st.year, m);

            const count = st.selected.filter(d => d >= new Date().toISOString().slice(0,10)).length;
            const countRevoked = revokedSet.size;
            let summaryContent = '';
            if (count > 0) {
                let info = `${count} día${count !== 1 ? 's' : ''}`;
                if (countRevoked > 0) info += ` · <span style="color:#ef4444;font-weight:700;">${countRevoked} revocada${countRevoked !== 1 ? 's' : ''}</span>`;
                summaryContent = `<span style="font-size:0.78rem;font-weight:600;color:#1e293b;">${info}</span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.ui._planClear('${type}')" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Limpiar</button>
                        <button onclick="App.ui._planSave('${type}')" style="padding:4px 10px;border:none;border-radius:5px;background:${cfg.color};color:white;font-size:0.72rem;font-weight:700;cursor:pointer;">${st.editId ? 'Guardar' : 'Crear plan'}</button>
                    </div>`;
            } else {
                summaryContent = `<span style="font-size:0.78rem;color:#94a3b8;">Selecciona los días de ${cfg.label} en el calendario</span>`;
            }

            c.innerHTML = sectionBar + `
                <div style="max-width:980px;margin:0 auto;width:100%;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;height:34px;">
                        <button onclick="App.uiState.${cfg.uiKey}.mode='list';App.ui.renderRequests(document.querySelector('.main-scroll'))"
                            style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;flex-shrink:0;">◀ Volver</button>
                        <select onchange="App.uiState.${cfg.uiKey}.empId=this.value;App.uiState.${cfg.uiKey}.selected=[];App.ui.renderRequests(document.querySelector('.main-scroll'))"
                            style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.78rem;color:#1e293b;max-width:120px;flex-shrink:0;">${empOpts}</select>
                        <div id="plan-summary-${type}" style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex:1;padding:5px 10px;background:${count > 0 ? '#f5f3ff' : '#f8fafc'};border:1px solid ${count > 0 ? '#c4b5fd' : '#e2e8f0'};border-radius:6px;height:100%;box-sizing:border-box;">
                            ${summaryContent}
                        </div>
                        <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                            <button onclick="App.uiState.${cfg.uiKey}.year--;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">◀</button>
                            <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:40px;text-align:center;">${st.year}</span>
                            <button onclick="App.uiState.${cfg.uiKey}.year++;App.ui.renderRequests(document.querySelector('.main-scroll'))"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">▶</button>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">${monthsHtml}</div>
                </div>`;
            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        _planToggle: function(type, iso, el) {
            const cfg = this._planConfig(type);
            const sel = App.uiState[cfg.uiKey].selected;
            const idx = sel.indexOf(iso);
            if (idx >= 0) { sel.splice(idx, 1); el.style.background = 'white'; el.style.color = '#1e293b'; el.style.border = '1px solid #e2e8f0'; el.style.fontWeight = '500'; }
            else { sel.push(iso); sel.sort(); el.style.background = cfg.color; el.style.color = 'white'; el.style.border = `1px solid ${cfg.color}`; el.style.fontWeight = '700'; }
            // Actualizar summary inline
            const count = sel.filter(d => d >= new Date().toISOString().slice(0,10)).length;
            const summaryEl = document.getElementById(`plan-summary-${type}`);
            if (summaryEl) {
                const editId = App.uiState[cfg.uiKey].editId;
                if (count > 0) {
                    summaryEl.innerHTML = `<span style="font-size:0.78rem;font-weight:600;color:#1e293b;">${count} día${count !== 1 ? 's' : ''}</span>
                        <div style="display:flex;gap:4px;">
                            <button onclick="App.ui._planClear('${type}')" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Limpiar</button>
                            <button onclick="App.ui._planSave('${type}')" style="padding:4px 10px;border:none;border-radius:5px;background:${cfg.color};color:white;font-size:0.72rem;font-weight:700;cursor:pointer;">${editId ? 'Guardar' : 'Crear plan'}</button>
                        </div>`;
                    summaryEl.style.background = '#f5f3ff'; summaryEl.style.borderColor = '#c4b5fd';
                } else {
                    summaryEl.innerHTML = `<span style="font-size:0.78rem;color:#94a3b8;">Selecciona los días de ${cfg.label} en el calendario</span>`;
                    summaryEl.style.background = '#f8fafc'; summaryEl.style.borderColor = '#e2e8f0';
                }
            }
        },

        _planClear: function(type) { const cfg = this._planConfig(type); App.uiState[cfg.uiKey].selected = []; App.ui.renderRequests(document.querySelector('.main-scroll')); },

        _planSave: function(type) {
            const cfg = this._planConfig(type);
            const st = App.uiState[cfg.uiKey];
            const emp = App.data.empleados.find(e => e.id === st.empId);
            if (!emp) return;
            const dates = st.selected.slice().sort();
            if (dates.length === 0) { alert('No hay días seleccionados.'); return; }
            if (!App.data[cfg.dataKey]) App.data[cfg.dataKey] = [];
            if (st.editId) {
                const plan = App.data[cfg.dataKey].find(p => p.id === st.editId);
                if (plan) {
                    plan.empId = st.empId;
                    plan.dates = dates;
                    // Mantener applied si todas las fechas ya tienen el turno correcto en schedule
                    if (plan.applied) {
                        const allApplied = dates.every(d => {
                            const sv = (App.data.schedule[d] || {})[st.empId];
                            const sh = sv ? Utils.getShift(sv) : null;
                            return sh && sh.fixed && sh.code === cfg.shiftCode;
                        });
                        plan.applied = allApplied;
                    }
                }
            } else {
                App.data[cfg.dataKey].push({ id: cfg.idPrefix + Date.now(), empId: st.empId, dates, createdAt: new Date().toISOString(), applied: false });
            }
            Safe.save('v40_db', App.data);
            st.mode = 'list'; st.selected = []; st.editId = null;
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planEdit: function(type, planId) {
            const cfg = this._planConfig(type);
            const plan = (App.data[cfg.dataKey] || []).find(p => p.id === planId);
            if (!plan) return;
            const st = App.uiState[cfg.uiKey];
            st.mode = 'calendar'; st.empId = plan.empId; st.selected = [...plan.dates]; st.editId = plan.id;
            st.year = plan.dates[0] ? parseInt(plan.dates[0].slice(0,4)) : new Date().getFullYear();
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planDel: function(type, planId) {
            const cfg = this._planConfig(type);
            if (!confirm(`¿Eliminar este plan de ${cfg.label}?`)) return;
            App.data[cfg.dataKey] = (App.data[cfg.dataKey] || []).filter(p => p.id !== planId);
            Safe.save('v40_db', App.data);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planApply: function(type, planId) {
            const cfg = this._planConfig(type);
            const plan = (App.data[cfg.dataKey] || []).find(p => p.id === planId);
            if (!plan) return;
            const emp = App.data.empleados.find(e => e.id === plan.empId);
            if (!emp) return;
            const dates = plan.dates.filter(d => d >= new Date().toISOString().slice(0,10));
            if (dates.length === 0) { alert('No quedan días futuros en este plan.'); return; }
            const fixedShift = App.data.fixedShifts.find(s => s.code === cfg.shiftCode);
            // Conflictos
            const conflicts = [];
            dates.forEach(d => {
                const sv = (App.data.schedule[d] || {})[emp.id];
                if (sv) { const sh = Utils.getShift(sv); if (sh && !sh.fixed) conflicts.push({ date: d, shift: sh }); }
            });
            if (conflicts.length > 0) {
                const lista = conflicts.map(cf => `• ${Utils.formatDateES(cf.date)} — ${cf.shift.code || cf.shift.start + '–' + cf.shift.end}`).join('\n');
                if (!confirm(`⚠️ ${conflicts.length} día${conflicts.length !== 1 ? 's' : ''} ya tiene${conflicts.length !== 1 ? 'n' : ''} turno:\n\n${lista}\n\n[Aceptar] → Sobreescribir\n[Cancelar] → Cancelar`)) return;
            }
            dates.forEach(d => {
                if (!App.data.schedule[d]) App.data.schedule[d] = {};
                App.data.schedule[d][emp.id] = fixedShift.id;
            });
            plan.applied = true;
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            alert(`✅ ${cfg.badge} aplicadas para ${emp.nombre}: ${dates.length} día${dates.length !== 1 ? 's' : ''} → ${cfg.shiftCode}`);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        // Helper: ¿este día+empleado pertenece a un plan genérico aplicado?
        _isPlanDay: function(type, empId, date) {
            const cfg = this._planConfig(type);
            if (!cfg || !App.data[cfg.dataKey]) return null;
            return App.data[cfg.dataKey].find(p => p.applied && p.empId === empId && p.dates.includes(date)) || null;
        },

        // Escanear schedule para V no cubiertas por ningún plan
        _getOrphanVacDays: function() {
            const plans = App.data.vacacionesPlans || [];
            const planDates = new Set();
            plans.forEach(p => p.dates.forEach(d => planDates.add(p.empId + '|' + d)));
            const byEmp = {};
            Object.keys(App.data.schedule || {}).forEach(date => {
                const day = App.data.schedule[date];
                Object.keys(day).forEach(empId => {
                    const sv = day[empId];
                    const sh = Utils.getShift(sv);
                    if (sh && sh.fixed && sh.code === 'V' && !planDates.has(empId + '|' + date)) {
                        if (!byEmp[empId]) byEmp[empId] = [];
                        byEmp[empId].push(date);
                    }
                });
            });
            // Devolver como pseudo-planes
            return Object.keys(byEmp).map(empId => ({
                id: '__orphan_' + empId,
                empId,
                dates: byEmp[empId].sort(),
                applied: true,
                virtual: true,
                createdAt: '2000-01-01'
            }));
        },

        _planAbsorbOrphans: function() {
            const orphans = this._getOrphanVacDays();
            if (orphans.length === 0) { alert('No hay vacaciones huérfanas.'); return; }
            if (!App.data.vacacionesPlans) App.data.vacacionesPlans = [];
            let absorbed = 0;
            orphans.forEach(orph => {
                // Buscar plan existente del empleado
                const existing = App.data.vacacionesPlans.find(p => p.empId === orph.empId);
                if (existing) {
                    // Fusionar fechas
                    const merged = [...new Set([...existing.dates, ...orph.dates])].sort();
                    existing.dates = merged;
                    existing.applied = true;
                } else {
                    // Crear plan nuevo
                    App.data.vacacionesPlans.push({
                        id: 'vp_absorbed_' + Date.now() + '_' + orph.empId,
                        empId: orph.empId,
                        dates: orph.dates,
                        createdAt: new Date().toISOString(),
                        applied: true
                    });
                }
                absorbed += orph.dates.length;
            });
            Safe.save('v40_db', App.data);
            alert(`✅ ${absorbed} día${absorbed !== 1 ? 's' : ''} de ${orphans.length} empleado${orphans.length !== 1 ? 's' : ''} incorporados a sus planes de vacaciones.`);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planMergeAll: function(type) {
            const cfg = this._planConfig(type);
            const plans = App.data[cfg.dataKey] || [];
            const byEmp = {};
            plans.forEach(p => {
                if (!byEmp[p.empId]) byEmp[p.empId] = [];
                byEmp[p.empId].push(p);
            });
            let mergedCount = 0;
            Object.keys(byEmp).forEach(empId => {
                const group = byEmp[empId];
                if (group.length <= 1) return;
                // Fusionar todas las fechas, deduplicar, ordenar
                const allDates = [...new Set(group.flatMap(p => p.dates))].sort();
                const anyApplied = group.some(p => p.applied);
                // Conservar el más antiguo como base
                const base = group.sort((a,b) => a.createdAt.localeCompare(b.createdAt))[0];
                base.dates = allDates;
                base.applied = anyApplied;
                // Eliminar los demás
                const idsToRemove = new Set(group.filter(p => p.id !== base.id).map(p => p.id));
                App.data[cfg.dataKey] = App.data[cfg.dataKey].filter(p => !idsToRemove.has(p.id));
                mergedCount += idsToRemove.size;
            });
            if (mergedCount === 0) { alert('No hay planes duplicados para fusionar.'); return; }
            Safe.save('v40_db', App.data);
            alert(`✅ ${mergedCount} plan${mergedCount !== 1 ? 'es' : ''} fusionado${mergedCount !== 1 ? 's' : ''}. Cada empleado tiene ahora un único plan.`);
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _renderPlanGlobal: function(c, sectionBar, type) {
            const cfg = this._planConfig(type);
            const plans = App.data[cfg.dataKey] || [];
            const st = App.uiState[cfg.uiKey];
            if (!st.year) st.year = new Date().getFullYear();

            const DIAS_H = ['L','M','X','J','V','S','D'];
            const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const _rerender = `App.ui.renderRequests(document.querySelector('.main-scroll'))`;

            // Colores por empleado
            const EMP_COLORS = ['#2563eb','#7c3aed','#0891b2','#dc2626','#d97706','#16a34a','#db2777','#4f46e5','#0d9488','#b91c1c','#ca8a04','#059669'];
            const activeEmps = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder);
            const empColorMap = {};
            activeEmps.forEach((e, i) => { empColorMap[e.id] = EMP_COLORS[i % EMP_COLORS.length]; });

            // Incluir huérfanos en vacaciones
            const allPlans = type === 'vacaciones' ? [...plans, ...this._getOrphanVacDays()] : plans;

            // Índice: fecha → [{ empId, color, nombre }]  (deduplicar por empId+fecha)
            const dateIndex = {};
            const _seen = new Set();
            allPlans.forEach(p => {
                const emp = App.data.empleados.find(e => e.id === p.empId);
                const color = empColorMap[p.empId] || '#94a3b8';
                const nombre = emp ? emp.nombre : '?';
                p.dates.forEach(d => {
                    const key = p.empId + '|' + d;
                    if (_seen.has(key)) return;
                    _seen.add(key);
                    if (!dateIndex[d]) dateIndex[d] = [];
                    dateIndex[d].push({ empId: p.empId, color, nombre });
                });
            });

            const buildMonth = (year, month) => {
                const first = new Date(year, month, 1);
                let startDow = first.getDay();
                startDow = startDow === 0 ? 6 : startDow - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let cells = '';
                for (let i = 0; i < startDow; i++) cells += `<div style="width:28px;height:24px;"></div>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const entries = dateIndex[iso] || [];
                    const isSun = new Date(year, month, d).getDay() === 0;
                    let bg = 'white', color = isSun ? '#7c3aed' : '#1e293b', border = '1px solid #e2e8f0', title = '';
                    if (entries.length === 1) {
                        bg = entries[0].color + '22'; border = `2px solid ${entries[0].color}`;
                        color = entries[0].color; title = `title="${entries[0].nombre}"`;
                    } else if (entries.length > 1) {
                        // Múltiples empleados — gradiente
                        const names = entries.map(e => e.nombre).join(', ');
                        bg = `linear-gradient(135deg, ${entries.map((e,i) => e.color + ' ' + Math.round(i/entries.length*100) + '%, ' + e.color + ' ' + Math.round((i+1)/entries.length*100) + '%').join(', ')})`;
                        color = 'white'; border = '2px solid #475569';
                        title = `title="${entries.length} personas: ${names}"`;
                    }
                    cells += `<div ${title} style="width:28px;height:24px;display:flex;align-items:center;justify-content:center;
                        font-size:0.72rem;font-weight:${entries.length > 0 ? '700' : '500'};border-radius:4px;
                        background:${bg};color:${color};border:${border};">${d}</div>`;
                }
                return `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    <div style="text-align:center;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:6px;">${MESES[month]} ${year}</div>
                    <div style="display:grid;grid-template-columns:repeat(7,28px);gap:2px;justify-content:center;">
                        ${DIAS_H.map(d => `<div style="width:28px;text-align:center;font-size:0.6rem;font-weight:700;color:#94a3b8;">${d}</div>`).join('')}
                        ${cells}
                    </div>
                </div>`;
            };

            let monthsHtml = '';
            for (let m = 0; m < 12; m++) monthsHtml += buildMonth(st.year, m);

            // Leyenda de empleados (incluyendo huérfanos)
            const empsWithPlans = [...new Set(allPlans.map(p => p.empId))];
            const legend = empsWithPlans.map(eid => {
                const emp = App.data.empleados.find(e => e.id === eid);
                const color = empColorMap[eid] || '#94a3b8';
                const totalDays = allPlans.filter(p => p.empId === eid).reduce((s, p) => s + p.dates.length, 0);
                return `<div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:12px;height:12px;border-radius:3px;background:${color};flex-shrink:0;"></div>
                    <span style="font-size:0.78rem;color:#1e293b;font-weight:600;">${emp ? emp.nombre : '?'}</span>
                    <span style="font-size:0.7rem;color:#94a3b8;">${totalDays}d</span>
                </div>`;
            }).join('');

            c.innerHTML = sectionBar + `
                <div style="max-width:980px;margin:0 auto;width:100%;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        ${this._planToolbar(type)}
                        <div style="display:flex;align-items:center;gap:3px;">
                            <button onclick="App.uiState.${cfg.uiKey}.year--;${_rerender}"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">◀</button>
                            <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:40px;text-align:center;">${st.year}</span>
                            <button onclick="App.uiState.${cfg.uiKey}.year++;${_rerender}"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">▶</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px 20px;margin-bottom:12px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                        ${legend}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
                        ${monthsHtml}
                    </div>
                </div>`;
            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        // ─── Vista Agenda (global día a día, 2 bloques × 3 columnas) ───
        _renderPlanAgenda: function(c, sectionBar, type) {
            const cfg = this._planConfig(type);
            const st = App.uiState[cfg.uiKey];
            // Sin padding vertical en el scrollport para que el sticky ancle limpio al borde
            c.style.padding = '0 16px';
            if (!st.agendaCursoY) {
                const t = new Date();
                st.agendaCursoY = t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1;
            }
            const cursoY = st.agendaCursoY;
            const rangeStart = `${cursoY}-03-01`;
            const endMonthLast = new Date(cursoY+1, 2, 0).getDate();
            const rangeEnd = `${cursoY+1}-02-${String(endMonthLast).padStart(2,'0')}`;

            const days = [];
            let cur = new Date(rangeStart + 'T00:00:00');
            const end = new Date(rangeEnd + 'T00:00:00');
            while (cur <= end) { days.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }

            // Índice peticiones: date → [{planId, empId, empName, applied}]
            const plans = App.data[cfg.dataKey] || [];
            const planIndex = {};
            plans.forEach(p => {
                const emp = App.data.empleados.find(e => e.id === p.empId);
                const empName = emp ? emp.nombre : '?';
                p.dates.forEach(d => {
                    if (!planIndex[d]) planIndex[d] = [];
                    planIndex[d].push({ planId: p.id, empId: p.empId, empName, applied: !!p.applied });
                });
            });
            Object.keys(planIndex).forEach(d => planIndex[d].sort((a,b) => a.empName.localeCompare(b.empName)));

            // Índice V en schedule: date → [{empId, empName}]
            const grantedIndex = {};
            Object.keys(App.data.schedule || {}).forEach(date => {
                const day = App.data.schedule[date];
                Object.keys(day).forEach(empId => {
                    const sh = Utils.getShift(day[empId]);
                    if (sh && sh.fixed && sh.code === 'V') {
                        if (!grantedIndex[date]) grantedIndex[date] = [];
                        const emp = App.data.empleados.find(e => e.id === empId);
                        grantedIndex[date].push({ empId, empName: emp ? emp.nombre : '?' });
                    }
                });
            });
            Object.keys(grantedIndex).forEach(d => grantedIndex[d].sort((a,b) => a.empName.localeCompare(b.empName)));

            const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const today = new Date().toISOString().slice(0,10);
            const _r = `App.ui.renderRequests(document.querySelector('.main-scroll'))`;

            const yearNav = `<div style="display:flex;align-items:center;gap:3px;">
                <button onclick="App.uiState.${cfg.uiKey}.agendaCursoY=${cursoY-1};${_r}"
                    style="padding:3px 9px;border:1px solid #e2e8f0;border-radius:5px;background:#f1f5f9;cursor:pointer;font-size:0.82rem;color:#64748b;">◀</button>
                <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:68px;text-align:center;">${cursoY}/${cursoY+1}</span>
                <button onclick="App.uiState.${cfg.uiKey}.agendaCursoY=${cursoY+1};${_r}"
                    style="padding:3px 9px;border:1px solid #e2e8f0;border-radius:5px;background:#f1f5f9;cursor:pointer;font-size:0.82rem;color:#64748b;">▶</button>
            </div>`;

            let html = sectionBar + `<div style="max-width:980px;margin:0 auto;width:100%;padding:16px 0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
                    ${this._planToolbar(type)}
                    ${yearNav}
                </div>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:0.67rem;color:var(--text-muted);">
                    <span><span style="display:inline-block;width:10px;height:10px;background:#fef9c3;border:1px solid #fde047;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Pendiente</span>
                    <span><span style="display:inline-block;width:10px;height:10px;background:#dcfce7;border:1px solid #86efac;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>Aplicado</span>
                    <span><span style="display:inline-block;width:10px;height:10px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>V en planificador</span>
                    <span style="color:#94a3b8;">· click en vacío de Otorgadas → elegir empleado</span>
                </div>
                <table style="border-collapse:separate;border-spacing:0;font-size:0.75rem;table-layout:fixed;margin:0 auto;">
                    <thead>
                        <tr>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 3px;font-size:0.64rem;color:#64748b;font-weight:600;width:28px;background:#f1f5f9;border-right:1px solid #e2e8f0;border-bottom:2px solid #cbd5e1;">WK</th>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 4px;text-align:left;font-size:0.64rem;color:#64748b;font-weight:600;width:44px;background:#f1f5f9;border-bottom:2px solid #cbd5e1;">Fecha</th>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 3px;font-size:0.64rem;color:#64748b;font-weight:600;width:28px;background:#f1f5f9;border-right:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;">Día</th>
                            <th colspan="3" style="position:sticky;top:0;z-index:5;padding:4px 5px;font-size:0.64rem;color:#92400e;font-weight:700;background:#fef9c3;border-right:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;">PETICIONES</th>
                            <th colspan="3" style="position:sticky;top:0;z-index:5;padding:4px 5px;font-size:0.64rem;color:#5b21b6;font-weight:700;background:#ede9fe;border-bottom:2px solid #cbd5e1;">OTORGADAS</th>
                        </tr>
                    </thead>
                    <tbody>`;

            let lastWk = null, wkParity = 0;
            days.forEach(date => {
                const d = new Date(date + 'T00:00:00');
                const dow = d.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isMon = dow === 1;
                const wk = Utils.getWeekCode(date);
                const isHoliday = (App.data.storeConfig.holidays || []).some(h => h.date === date);
                const isToday = date === today;
                if (wk !== lastWk) { lastWk = wk; wkParity = 1 - wkParity; }

                const pets = planIndex[date] || [];
                const grants = grantedIndex[date] || [];

                const weekSep = isMon ? 'border-top:2px solid #94a3b8;' : '';
                const weekBg = wkParity === 0 ? '#ffffff' : '#f8fafc';
                const rowBg = isHoliday ? '#fef3c7' : isWeekend ? '#f0f4f8' : weekBg;
                const todayHL = isToday ? 'outline:2px solid #2563eb;outline-offset:-2px;' : '';
                const dayColor = isWeekend ? '#94a3b8' : '#1e293b';
                const dayW = isWeekend ? '700' : '400';
                const wkDisplay = wk.replace(/^\d{4}/, '').replace('WK','W');
                const dateDisplay = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                const bdBot = 'border-bottom:1px solid #f1f5f9;';
                const cellBase = `padding:2px 4px;${bdBot}${weekSep}`;
                const rowId = isToday ? 'id="plan-agenda-today"' : '';

                const petCell = (e, isLast) => {
                    const lbr = isLast ? 'border-right:2px solid #cbd5e1;' : '';
                    if (!e) return `<td style="${cellBase}${lbr}width:128px;"></td>`;
                    const bg = e.applied ? '#dcfce7' : '#fef9c3';
                    const bdr = e.applied ? '#86efac' : '#fde047';
                    const first = e.empName.split(' ')[0];
                    return `<td style="${cellBase}${lbr}width:128px;">
                        <div style="display:flex;align-items:center;background:${bg};border:1px solid ${bdr};border-radius:4px;padding:2px 5px;min-height:20px;cursor:pointer;"
                             onclick="event.stopPropagation();App.ui._planAgendaMenu('petition','${date}','${e.empId}','${e.planId}',this)"
                             title="${e.empName}${e.applied?' · aplicado':' · pendiente'}">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${first}${e.applied?' ✓':''}</span>
                        </div></td>`;
                };
                const grantCell = (e, isLast) => {
                    const lbr = isLast ? '' : '';
                    if (!e) return `<td style="${cellBase}${lbr}width:128px;cursor:pointer;" onclick="event.stopPropagation();App.ui._planAgendaMenu('empty','${date}',null,null,this)" onmouseover="this.style.background='#faf5ff'" onmouseout="this.style.background=''"></td>`;
                    const first = e.empName.split(' ')[0];
                    return `<td style="${cellBase}${lbr}width:128px;">
                        <div style="display:flex;align-items:center;background:#ede9fe;border:1px solid #c4b5fd;border-radius:4px;padding:2px 5px;min-height:20px;cursor:pointer;"
                             onclick="event.stopPropagation();App.ui._planAgendaMenu('granted','${date}','${e.empId}',null,this)"
                             title="${e.empName}">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${first}</span>
                        </div></td>`;
                };

                html += `<tr ${rowId} style="background:${rowBg};${todayHL}">
                    <td style="padding:2px 3px;text-align:center;color:#94a3b8;font-size:0.62rem;font-weight:700;border-right:1px solid #e2e8f0;${bdBot}${weekSep}">${isMon?wkDisplay:''}</td>
                    <td style="padding:2px 6px;font-size:0.71rem;color:${dayColor};${bdBot}${weekSep}">${dateDisplay}</td>
                    <td style="padding:2px 4px;text-align:center;color:${dayColor};font-size:0.67rem;font-weight:${dayW};border-right:2px solid #cbd5e1;${bdBot}${weekSep}">${DAY_ES[dow]}</td>
                    ${petCell(pets[0]||null,false)}
                    ${petCell(pets[1]||null,false)}
                    ${petCell(pets[2]||null,true)}
                    ${grantCell(grants[0]||null,false)}
                    ${grantCell(grants[1]||null,false)}
                    ${grantCell(grants[2]||null,true)}
                </tr>`;
            });

            html += `</tbody></table></div>`;
            const prevScroll = c.scrollTop;
            c.innerHTML = html;

            if (prevScroll > 0) {
                c.scrollTop = prevScroll;
            } else {
                const todayRow = document.getElementById('plan-agenda-today');
                if (todayRow) setTimeout(() => todayRow.scrollIntoView({ block:'center', behavior:'instant' }), 50);
            }

            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        // Dropdown contextual para la vista agenda
        _planAgendaMenu: function(kind, date, empId, planId, el) {
            this._planAgendaCloseMenu();
            const rect = el.getBoundingClientRect();
            const menu = document.createElement('div');
            menu.id = 'plan-agenda-menu';
            const left = Math.min(rect.left, window.innerWidth - 240);
            const top = Math.min(rect.bottom + 2, window.innerHeight - 200);
            menu.style.cssText = `position:fixed;left:${left}px;top:${top}px;background:white;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:9999;min-width:200px;padding:4px;font-size:0.8rem;max-height:320px;overflow-y:auto;`;
            menu.oncontextmenu = (e) => { e.preventDefault(); App.ui._planAgendaCloseMenu(); };

            const item = (label, onclick, color) => `<button onclick="${onclick}" style="display:block;width:100%;padding:6px 10px;border:none;background:none;text-align:left;cursor:pointer;border-radius:4px;font-size:0.78rem;color:${color||'#1e293b'};" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">${label}</button>`;

            let body = '';
            if (kind === 'petition') {
                body = item('📋 Ir a su plan', `App.ui._planAgendaGoToPlan('${planId}')`) +
                       item('✓ Aprobar este día', `App.ui._planAgendaApproveDate('${date}','${empId}')`, '#16a34a');
            } else if (kind === 'granted') {
                body = item('📅 Ir al día en planificador', `App.ui._planAgendaGoToDay('${date}')`) +
                       item('✕ Revocar vacaciones', `App.ui._planAgendaRevoke('${date}','${empId}')`, '#dc2626');
            } else if (kind === 'empty') {
                const dayV = new Set();
                Object.keys(App.data.schedule[date] || {}).forEach(eid => {
                    const sh = Utils.getShift(App.data.schedule[date][eid]);
                    if (sh && sh.fixed && sh.code === 'V') dayV.add(eid);
                });
                const picks = App.data.empleados
                    .filter(e => e.active !== false && !dayV.has(e.id) && Utils.empleadoVigenteEnRango(e, date, date))
                    .sort((a,b) => a.nombre.localeCompare(b.nombre));
                if (picks.length === 0) {
                    body = `<div style="padding:6px 10px;color:#94a3b8;">Sin candidatos.</div>`;
                } else {
                    body = `<div style="padding:3px 8px;font-size:0.64rem;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Otorgar V a…</div>` +
                        picks.map(e => item(e.nombre, `App.ui._planAgendaAssign('${date}','${e.id}')`)).join('');
                }
            }
            menu.innerHTML = body;
            document.body.appendChild(menu);

            const close = (ev) => {
                const insideMenu = ev && ev.target && ev.target.closest && ev.target.closest('#plan-agenda-menu');
                if (ev && ev.type === 'contextmenu') {
                    if (insideMenu) ev.preventDefault();
                    App.ui._planAgendaCloseMenu();
                    return;
                }
                if (insideMenu) return;
                App.ui._planAgendaCloseMenu();
            };
            App.ui._planAgendaCloseFn = close;
            setTimeout(() => {
                document.addEventListener('click', close);
                document.addEventListener('contextmenu', close);
            }, 0);
        },

        _planAgendaCloseMenu: function() {
            const m = document.getElementById('plan-agenda-menu'); if (m) m.remove();
            const cf = document.getElementById('plan-agenda-conflict'); if (cf) cf.remove();
            const bd = document.getElementById('plan-agenda-backdrop'); if (bd) bd.remove();
            if (App.ui._planAgendaCloseFn) {
                document.removeEventListener('click', App.ui._planAgendaCloseFn);
                document.removeEventListener('contextmenu', App.ui._planAgendaCloseFn);
                App.ui._planAgendaCloseFn = null;
            }
        },

        _planAgendaGoToDay: function(date) {
            App.ui._planAgendaCloseMenu();
            App.uiState.currentDate = date;
            App.router.go('planificador');
        },

        _planAgendaGoToPlan: function(planId) {
            App.ui._planAgendaCloseMenu();
            App.ui._planEdit('vacaciones', planId);
        },

        _planAgendaAssign: function(date, empId) {
            App.ui._planAgendaCloseMenu();
            const emp = App.data.empleados.find(e => e.id === empId);
            if (!emp) return;
            const sv = (App.data.schedule[date] || {})[empId];
            if (sv) {
                const sh = Utils.getShift(sv);
                if (sh && !sh.fixed) { App.ui._planAgendaConflictPopup(date, empId, sh); return; }
            }
            const fixed = App.data.fixedShifts.find(s => s.code === 'V');
            if (!fixed) { alert('No existe el turno fijo V en la configuración.'); return; }
            if (!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = fixed.id;
            Safe.save('v40_db', App.data);
            if (App.logic.checkAlerts) App.logic.checkAlerts();
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planAgendaApproveDate: function(date, empId) {
            App.ui._planAgendaAssign(date, empId);
        },

        _planAgendaRevoke: function(date, empId) {
            App.ui._planAgendaCloseMenu();
            if (!App.data.schedule[date]) return;
            delete App.data.schedule[date][empId];
            Safe.save('v40_db', App.data);
            if (App.logic.checkAlerts) App.logic.checkAlerts();
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        _planAgendaConflictPopup: function(date, empId, shift) {
            App.ui._planAgendaCloseMenu();
            const emp = App.data.empleados.find(e => e.id === empId);
            const desc = shift.code || `${shift.start}–${shift.end}`;
            const bd = document.createElement('div');
            bd.id = 'plan-agenda-backdrop';
            bd.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.35);z-index:9999;';
            bd.onclick = () => App.ui._planAgendaCloseMenu();
            const pop = document.createElement('div');
            pop.id = 'plan-agenda-conflict';
            pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:1px solid #fca5a5;border-radius:8px;padding:18px 22px;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:10000;max-width:400px;';
            pop.innerHTML = `
                <div style="font-weight:700;color:#dc2626;margin-bottom:8px;font-size:0.95rem;">⚠️ Conflicto de turno</div>
                <div style="color:#475569;line-height:1.5;font-size:0.85rem;margin-bottom:14px;">
                    <strong>${emp ? emp.nombre : '?'}</strong> ya tiene el turno <strong>${desc}</strong> asignado el <strong>${Utils.formatDateES(date)}</strong>.<br><br>
                    No se otorga la vacación. Revisa la situación en el planificador antes de continuar.
                </div>
                <div style="display:flex;justify-content:flex-end;gap:6px;">
                    <button onclick="App.ui._planAgendaCloseMenu()" style="padding:6px 14px;border:1px solid #e2e8f0;background:white;color:#64748b;font-size:0.82rem;font-weight:600;border-radius:5px;cursor:pointer;">Cancelar</button>
                    <button onclick="App.ui._planAgendaGoToDay('${date}')" style="padding:6px 14px;border:none;background:#2563eb;color:white;font-size:0.82rem;font-weight:600;border-radius:5px;cursor:pointer;">📅 Ir al día</button>
                </div>`;
            document.body.appendChild(bd);
            document.body.appendChild(pop);
        },

        _renderEventos: function(c, sectionBar) {
            const TIPO_LABEL = { curso:'Curso', mentoria:'Mentoría', visita:'Visita', otro:'Otro' };
            const TIPO_COLOR = { curso:'#2563eb', mentoria:'#7c3aed', visita:'#0891b2', otro:'#64748b' };
            const ALL_TIPOS = ['curso','mentoria','visita','otro'];
            const tipoFilter = App.uiState.evTipoFilter || 'todos';
            const evEmpFilter = App.uiState.evEmpFilter || 'todos';

            const empName = id => { const e = App.data.empleados.find(e => e.id === id); return e ? e.nombre : '—'; };

            // Empleados con eventos
            const empIdsEv = [...new Set((App.data.eventos||[]).map(ev => ev.empId))];
            const empsConEv = App.data.empleados.filter(e => empIdsEv.includes(e.id)).sort((a,b) => a.customOrder - b.customOrder);

            const _ps = (on, color, bg, border) =>
                'display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ' +
                (on ? (border||color) : '#e2e8f0') + ';background:' + (on ? (bg||'#eff6ff') : 'white') + ';color:' + (on ? color : '#94a3b8') + ';';

            // Build evFilterBar
            const _evPill = (label, onclick, on, color, bg, border) =>
                '<button onclick="' + onclick + '" style="display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;cursor:pointer;border:1px solid ' +
                (on ? (border||color) : '#e2e8f0') + ';background:' + (on ? (bg||'#eff6ff') : 'white') + ';color:' + (on ? color : '#94a3b8') + ';">' + label + '</button>';
            const _refresh = "App.ui.renderRequests(document.querySelector('.main-scroll'))";
            let evFilterBar = '<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px;">';
            evFilterBar += '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
            evFilterBar += _evPill('Todos', 'App.uiState.evTipoFilter=\'todos\';' + _refresh, tipoFilter==='todos', '#2563eb', '#eff6ff', '#93c5fd');
            ALL_TIPOS.forEach(t => {
                const c2 = TIPO_COLOR[t];
                evFilterBar += _evPill(TIPO_LABEL[t], 'App.uiState.evTipoFilter=\'' + t + '\';' + _refresh, tipoFilter===t, c2, c2+'18', c2+'60');
            });
            evFilterBar += '</div>';
            if(empsConEv.length > 1) {
                evFilterBar += '<div style="display:flex;gap:5px;flex-wrap:wrap;">';
                evFilterBar += _evPill('Todos', 'App.uiState.evEmpFilter=\'todos\';' + _refresh, evEmpFilter==='todos', '#64748b', '#f1f5f9', '#cbd5e1');
                empsConEv.forEach(e => {
                    evFilterBar += _evPill(e.nombre.split(' ')[0], 'App.uiState.evEmpFilter=\'' + e.id + '\';' + _refresh, evEmpFilter===e.id, '#475569', '#f1f5f9', '#94a3b8');
                });
                evFilterBar += '</div>';
            }
            evFilterBar += '</div>';

            const hoy = new Date().toISOString().slice(0, 10);
            const showArchived = App.uiState.evShowArchived || false;

            const todos = (App.data.eventos || []).slice().sort((a,b) => a.fechaInicio.localeCompare(b.fechaInicio));
            const filtered = todos.filter(ev =>
                (tipoFilter === 'todos' || ev.tipo === tipoFilter) &&
                (evEmpFilter === 'todos' || ev.empId === evEmpFilter)
            );
            const eventos = filtered.filter(ev => showArchived ? ev.fechaInicio < hoy : ev.fechaInicio >= hoy);
            const countActivos = filtered.filter(ev => ev.fechaInicio >= hoy).length;
            const countArchivados = filtered.filter(ev => ev.fechaInicio < hoy).length;

            // Toggle activas/archivadas
            const _toggleArchived = `App.uiState.evShowArchived=!App.uiState.evShowArchived;${_refresh}`;
            const archiveToggle = `<div style="display:flex;gap:4px;margin-bottom:10px;">
                <button onclick="App.uiState.evShowArchived=false;${_refresh}" style="${_ps(!showArchived,'#2563eb','#eff6ff','#93c5fd')}">Activos (${countActivos})</button>
                <button onclick="App.uiState.evShowArchived=true;${_refresh}" style="${_ps(showArchived,'#64748b','#f1f5f9','#cbd5e1')}">Archivados (${countArchivados})</button>
            </div>`;

            const _buildEvTable = (evList) => evList.length === 0
                ? `<div style="padding:32px;text-align:center;color:#94a3b8;font-size:0.85rem;">${showArchived ? 'Sin eventos pasados.' : 'Sin eventos próximos. Pulsa "+ Nuevo evento" para añadir uno.'}</div>`
                : `<table style="width:100%;border-collapse:collapse;">
                    <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                        <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Empleado</th>
                        <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Tipo</th>
                        <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Fechas</th>
                        <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Horario</th>
                        <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Descripción</th>
                        <th style="padding:8px 12px;width:64px;"></th>
                    </tr></thead>
                    <tbody>
                    ${evList.map(ev => `<tr style="border-bottom:1px solid #f1f5f9;${showArchived ? 'opacity:0.6;' : ''}">
                        <td style="padding:9px 12px;font-size:0.82rem;font-weight:600;color:#1e293b;">${empName(ev.empId)}</td>
                        <td style="padding:9px 12px;"><span style="background:${TIPO_COLOR[ev.tipo]||'#64748b'}18;color:${TIPO_COLOR[ev.tipo]||'#64748b'};border:1px solid ${TIPO_COLOR[ev.tipo]||'#64748b'}40;border-radius:4px;padding:2px 8px;font-size:0.72rem;font-weight:700;">${TIPO_LABEL[ev.tipo]||'Otro'}</span></td>
                        <td style="padding:9px 12px;font-size:0.8rem;color:#475569;white-space:nowrap;">${ev.fechaInicio}</td>
                        <td style="padding:9px 12px;font-size:0.8rem;color:#475569;white-space:nowrap;">${ev.horaInicio} – ${ev.horaFin}</td>
                        <td style="padding:9px 12px;font-size:0.8rem;color:#475569;">${ev.desc||'—'}</td>
                        <td style="padding:9px 12px;white-space:nowrap;">
                            <button onclick="App.ui.renderEventoInspector('${ev.id}')" title="Editar" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:14px;padding:2px 5px;">✏️</button>
                            <button onclick="App.logic.eventoDel('${ev.id}')" title="Borrar" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:14px;padding:2px 5px;">🗑</button>
                        </td>
                    </tr>`).join('')}
                    </tbody>
                </table>`;
            const listaHtml = _buildEvTable(eventos);

            c.style.cssText = 'padding:16px;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;';
            c.innerHTML = sectionBar + `
                <div style="max-width:800px;margin:0 auto;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e293b;">📅 Eventos extra</h3>
                        <button onclick="App.ui.renderEventoInspector(null)"
                            style="padding:7px 16px;background:#2563eb;color:white;border:none;border-radius:6px;font-weight:700;font-size:0.82rem;cursor:pointer;">+ Nuevo evento</button>
                    </div>
                    ${archiveToggle}
                    ${evFilterBar}
                    ${listaHtml}
                </div>`;
        },

        // Helper: generar rango de fechas para las vistas de llaves
        _llavesDateRange: function() {
            const offset = App.uiState.llavesCalOffset || 0;
            const start = new Date();
            start.setDate(start.getDate() + offset * 21); // desplazar en bloques de 3 semanas
            const end = new Date(start);
            end.setDate(end.getDate() + 20); // 21 días (3 semanas)
            const dates = [];
            const cur = new Date(start);
            while (cur <= end) { dates.push(cur.toISOString().slice(0, 10)); cur.setDate(cur.getDate() + 1); }
            const fmt = d => `${d.getDate()}/${d.getMonth()+1}`;
            const label = `${fmt(start)} — ${fmt(end)}`;
            return { dates, label };
        },

        _llavesCalNav: function() {
            const offset = App.uiState.llavesCalOffset || 0;
            const _r = `App.ui.renderRequests(document.querySelector('.main-scroll'))`;
            return `<div style="display:flex;align-items:center;gap:4px;">
                <button onclick="App.uiState.llavesCalOffset=${offset-1};${_r}" style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">◀</button>
                <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:140px;text-align:center;">${this._llavesDateRange().label}</span>
                <button onclick="App.uiState.llavesCalOffset=${offset+1};${_r}" style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">▶</button>
            </div>`;
        },

        // Vista: por persona — filas = llaves, columnas = días, una tabla por TAG3
        _llavesVistaPersona: function(llaves, hoy) {
            if (llaves.length === 0) return '<div style="padding:32px;text-align:center;color:#94a3b8;">No hay llaves configuradas.</div>';
            const { dates } = this._llavesDateRange();
            const LLAVE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#dc2626', '#d97706'];
            const tag3 = App.data.empleados
                .filter(e => e.active !== false && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, hoy)))
                .sort((a,b) => a.customOrder - b.customOrder);

            if (tag3.length === 0) return '<div style="padding:32px;text-align:center;color:#94a3b8;">No hay empleados TAG3.</div>';

            // Cabecera de días
            const DIAS_LETRA = ['D','L','M','X','J','V','S'];
            const dayHeaders = dates.map(d => {
                const dow = new Date(d + 'T12:00:00').getDay();
                const day = new Date(d + 'T12:00:00').getDate();
                const isSun = dow === 0;
                const isToday = d === hoy;
                return `<th style="padding:2px 0;min-width:22px;font-size:0.58rem;font-weight:${isToday?'800':'600'};color:${isToday?'#2563eb':(isSun?'#7c3aed':'#94a3b8')};text-align:center;${isToday?'background:#eff6ff;border-radius:4px;':''}">
                    ${DIAS_LETRA[dow]}<br>${day}
                </th>`;
            }).join('');

            let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e293b;">👤 Vista por persona</h3>
                ${this._llavesCalNav()}
            </div>`;

            tag3.forEach(emp => {
                html += `<div style="margin-bottom:16px;background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;">
                    <div style="font-weight:700;font-size:0.85rem;color:#1e293b;margin-bottom:6px;">${emp.nombre}</div>
                    <div style="overflow-x:auto;">
                    <table style="border-collapse:collapse;width:100%;">
                        <thead><tr><th style="padding:2px 4px;text-align:left;font-size:0.6rem;color:#94a3b8;min-width:60px;"></th>${dayHeaders}</tr></thead>
                        <tbody>`;
                llaves.forEach((l, li) => {
                    const color = LLAVE_COLORS[li % LLAVE_COLORS.length];
                    html += `<tr><td style="padding:3px 4px;font-size:0.68rem;font-weight:600;color:#475569;white-space:nowrap;">L${li+1}${l.alias?' '+l.alias:''}</td>`;
                    dates.forEach(d => {
                        const titInicio = App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, d) : App.logic.getTitularLlave(l.id, d);
                        const titFin = App.logic.getTitularLlave(l.id, d);
                        const alInicio = titInicio === emp.id;
                        const alFinal = titFin === emp.id;
                        let cellContent = '', title = '';
                        if (alInicio && alFinal) {
                            cellContent = `<div style="height:14px;border-radius:3px;background:${color};"></div>`;
                        } else if (alInicio && !alFinal) {
                            title = 'Entrega llave';
                            cellContent = `<div style="height:14px;display:flex;align-items:center;">
                                <div style="width:40%;height:100%;border-radius:3px 0 0 3px;background:${color};"></div>
                                <svg width="8" height="8" viewBox="0 0 8 8" style="flex-shrink:0;"><polygon points="0,0 8,4 0,8" fill="#ef4444"/></svg>
                            </div>`;
                        } else if (!alInicio && alFinal) {
                            title = 'Recibe llave';
                            cellContent = `<div style="height:14px;display:flex;align-items:center;justify-content:flex-end;">
                                <svg width="8" height="8" viewBox="0 0 8 8" style="flex-shrink:0;"><polygon points="8,0 0,4 8,8" fill="#22c55e"/></svg>
                                <div style="width:40%;height:100%;border-radius:0 3px 3px 0;background:${color};"></div>
                            </div>`;
                        } else {
                            cellContent = `<div style="height:14px;"></div>`;
                        }
                        html += `<td style="padding:1px;border-right:1px solid #f1f5f9;" ${title ? `title="${title}"` : ''}>${cellContent}</td>`;
                    });
                    html += `</tr>`;
                });
                html += `</tbody></table></div></div>`;
            });

            return html;
        },

        // Vista: por llave — filas = TAG3, columnas = días, colores por llave
        _llavesVistaLlave: function(llaves, hoy) {
            if (llaves.length === 0) return '<div style="padding:32px;text-align:center;color:#94a3b8;">No hay llaves configuradas.</div>';
            const { dates } = this._llavesDateRange();
            const LLAVE_COLORS = ['#2563eb', '#7c3aed', '#0891b2', '#dc2626', '#d97706'];
            const tag3 = App.data.empleados
                .filter(e => e.active !== false && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, hoy)))
                .sort((a,b) => a.customOrder - b.customOrder);

            if (tag3.length === 0) return '<div style="padding:32px;text-align:center;color:#94a3b8;">No hay empleados TAG3.</div>';

            const DIAS_LETRA = ['D','L','M','X','J','V','S'];
            const dayHeaders = dates.map(d => {
                const dow = new Date(d + 'T12:00:00').getDay();
                const day = new Date(d + 'T12:00:00').getDate();
                const isSun = dow === 0;
                const isToday = d === hoy;
                return `<th style="padding:2px 0;min-width:22px;font-size:0.58rem;font-weight:${isToday?'800':'600'};color:${isToday?'#2563eb':(isSun?'#7c3aed':'#94a3b8')};text-align:center;${isToday?'background:#eff6ff;border-radius:4px;':''}">
                    ${DIAS_LETRA[dow]}<br>${day}
                </th>`;
            }).join('');

            // Leyenda de llaves
            const legend = llaves.map((l, i) => {
                const color = LLAVE_COLORS[i % LLAVE_COLORS.length];
                return `<div style="display:flex;align-items:center;gap:4px;">
                    <div style="width:12px;height:12px;border-radius:3px;background:${color};"></div>
                    <span style="font-size:0.72rem;font-weight:600;color:#475569;">L${i+1}${l.alias?' '+l.alias:''}</span>
                </div>`;
            }).join('');

            let html = `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e293b;">🔑 Vista por llave</h3>
                ${this._llavesCalNav()}
            </div>
            <div style="display:flex;gap:12px;margin-bottom:12px;padding:6px 10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">${legend}</div>
            <div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;overflow-x:auto;">
                <table style="border-collapse:collapse;width:100%;">
                    <thead><tr><th style="padding:2px 4px;text-align:left;font-size:0.6rem;color:#94a3b8;min-width:70px;"></th>${dayHeaders}</tr></thead>
                    <tbody>`;

            // Mapear color por empId para lookups rápidos
            const empColor = {};
            tag3.forEach(emp => { empColor[emp.id] = null; }); // se usará el color de la llave, no del empleado

            tag3.forEach(emp => {
                html += `<tr><td style="padding:4px 4px;font-size:0.72rem;font-weight:600;color:#1e293b;white-space:nowrap;">${emp.nombre}</td>`;
                dates.forEach(d => {
                    // Para cada llave, ver si este empleado la tiene al inicio y/o al final del día
                    const segmentos = []; // { color, half: 'full'|'left'|'right' }
                    llaves.forEach((l, li) => {
                        const color = LLAVE_COLORS[li % LLAVE_COLORS.length];
                        const titInicio = App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, d) : App.logic.getTitularLlave(l.id, d);
                        const titFin = App.logic.getTitularLlave(l.id, d);
                        const alInicio = titInicio === emp.id;
                        const alFinal = titFin === emp.id;
                        if (alInicio && alFinal) segmentos.push({ color, half: 'full', llave: `L${li+1}` });
                        else if (alInicio) segmentos.push({ color, half: 'left', llave: `L${li+1} → entrega` });
                        else if (alFinal) segmentos.push({ color, half: 'right', llave: `L${li+1} ← recibe` });
                    });

                    let cellTitle = '';
                    let cellContent = '<div style="height:16px;"></div>';
                    if (segmentos.length === 1) {
                        const s = segmentos[0];
                        cellTitle = s.llave;
                        if (s.half === 'full') {
                            cellContent = `<div style="height:16px;border-radius:3px;background:${s.color};"></div>`;
                        } else if (s.half === 'left') {
                            cellContent = `<div style="height:16px;display:flex;align-items:center;">
                                <div style="width:40%;height:100%;border-radius:3px 0 0 3px;background:${s.color};"></div>
                                <svg width="9" height="9" viewBox="0 0 9 9" style="flex-shrink:0;"><polygon points="0,0 9,4.5 0,9" fill="#ef4444"/></svg>
                            </div>`;
                        } else {
                            cellContent = `<div style="height:16px;display:flex;align-items:center;justify-content:flex-end;">
                                <svg width="9" height="9" viewBox="0 0 9 9" style="flex-shrink:0;"><polygon points="9,0 0,4.5 9,9" fill="#22c55e"/></svg>
                                <div style="width:40%;height:100%;border-radius:0 3px 3px 0;background:${s.color};"></div>
                            </div>`;
                        }
                    } else if (segmentos.length > 1) {
                        const n = segmentos.length;
                        const stops = segmentos.map((s, i) => {
                            const yStart = Math.round(i / n * 100);
                            const yEnd = Math.round((i + 1) / n * 100);
                            return `${s.color} ${yStart}%, ${s.color} ${yEnd}%`;
                        }).join(', ');
                        cellContent = `<div style="height:16px;border-radius:3px;background:linear-gradient(to bottom, ${stops});"></div>`;
                        cellTitle = segmentos.map(s => s.llave).join(' / ');
                    }
                    html += `<td style="padding:1px;border-right:1px solid #f1f5f9;" ${cellTitle ? `title="${cellTitle}"` : ''}>${cellContent}</td>`;
                });
                html += `</tr>`;
            });

            // Fila tienda — misma lógica de segmentos con estilo translúcido
            html += `<tr><td colspan="${dates.length + 1}" style="padding:0;height:6px;"></td></tr>`;
            html += `<tr><td style="padding:4px 4px;font-size:0.72rem;font-weight:600;color:#f59e0b;white-space:nowrap;">🏪 Tienda</td>`;
            dates.forEach(d => {
                const segmentos = [];
                llaves.forEach((l, li) => {
                    const color = LLAVE_COLORS[li % LLAVE_COLORS.length];
                    const titInicio = App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, d) : App.logic.getTitularLlave(l.id, d);
                    const titFin = App.logic.getTitularLlave(l.id, d);
                    const alInicio = titInicio === '__TIENDA__';
                    const alFinal = titFin === '__TIENDA__';
                    if (alInicio && alFinal) segmentos.push({ color, half: 'full', llave: `L${li+1}` });
                    else if (alInicio) segmentos.push({ color, half: 'left', llave: `L${li+1} → sale` });
                    else if (alFinal) segmentos.push({ color, half: 'right', llave: `L${li+1} ← entra` });
                });
                let cellContent = '<div style="height:16px;"></div>', cellTitle = '';
                if (segmentos.length === 1) {
                    const s = segmentos[0];
                    cellTitle = s.llave;
                    if (s.half === 'full') {
                        cellContent = `<div style="height:16px;border-radius:3px;background:${s.color}40;"></div>`;
                    } else if (s.half === 'left') {
                        cellContent = `<div style="height:16px;display:flex;align-items:center;">
                            <div style="width:40%;height:100%;border-radius:3px 0 0 3px;background:${s.color}40;"></div>
                            <svg width="9" height="9" viewBox="0 0 9 9" style="flex-shrink:0;"><polygon points="0,0 9,4.5 0,9" fill="#ef444480"/></svg>
                        </div>`;
                    } else {
                        cellContent = `<div style="height:16px;display:flex;align-items:center;justify-content:flex-end;">
                            <svg width="9" height="9" viewBox="0 0 9 9" style="flex-shrink:0;"><polygon points="9,0 0,4.5 9,9" fill="#22c55e80"/></svg>
                            <div style="width:40%;height:100%;border-radius:0 3px 3px 0;background:${s.color}40;"></div>
                        </div>`;
                    }
                } else if (segmentos.length > 1) {
                    const n = segmentos.length;
                    const stops = segmentos.map((s, i) => `${s.color}40 ${Math.round(i/n*100)}%, ${s.color}40 ${Math.round((i+1)/n*100)}%`).join(', ');
                    cellContent = `<div style="height:16px;border-radius:3px;background:linear-gradient(to bottom, ${stops});"></div>`;
                    cellTitle = segmentos.map(s => s.llave).join(' / ');
                }
                html += `<td style="padding:1px;" ${cellTitle ? `title="${cellTitle}"` : ''}>${cellContent}</td>`;
            });
            html += `</tr>`;

            html += `</tbody></table></div>`;
            return html;
        },

        _llavesReiniciar: function() {
            const llaves = App.data.config.llaves || [];
            if (llaves.length === 0) { alert('No hay llaves configuradas.'); return; }

            const hoy = new Date().toISOString().slice(0, 10);
            const fecha = prompt('🔄 Reiniciar cadena de traspasos\n\nIndica la fecha a partir de la cual quieres reiniciar.\nTodo lo anterior quedará archivado.\n\nFecha (AAAA-MM-DD):', hoy);
            if (!fecha || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return;

            // Contar traspasos que se van a eliminar
            const aEliminar = (App.data.traspasoLlaves || []).filter(t => t.fecha >= fecha);
            if (aEliminar.length === 0 && !confirm('No hay traspasos a partir de esa fecha.\n\n¿Quieres crear los puntos de partida igualmente?')) return;
            if (aEliminar.length > 0 && !confirm(`Se eliminarán ${aEliminar.length} traspaso${aEliminar.length !== 1 ? 's' : ''} desde el ${Utils.formatDateES(fecha)} en adelante.\n\nSe crearán nuevos puntos de partida para cada llave con su portador actual.\n\n¿Continuar?`)) return;

            // 1. Para cada llave, determinar quién la tiene el día anterior a la fecha de corte
            const prevDate = new Date(fecha + 'T12:00:00');
            prevDate.setDate(prevDate.getDate() - 1);
            const prevStr = prevDate.toISOString().slice(0, 10);
            const titulares = {};
            llaves.forEach(l => {
                const tid = App.logic.getTitularLlave(l.id, prevStr);
                titulares[l.id] = tid || '__TIENDA__';
            });

            // 2. Eliminar todos los traspasos desde la fecha de corte
            App.data.traspasoLlaves = (App.data.traspasoLlaves || []).filter(t => t.fecha < fecha);

            // 3. Crear nuevos traspasos ancla: tienda → titular para cada llave
            const now = new Date().toISOString();
            llaves.forEach(l => {
                App.data.traspasoLlaves.push({
                    id: 'tr_reset_' + Date.now() + '_' + l.id,
                    llaveId: l.id,
                    dadorId: '__TIENDA__',
                    receptorId: titulares[l.id],
                    fecha: fecha,
                    source: 'reset',
                    creadoEn: now
                });
            });

            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();

            // Resumen
            const resumen = llaves.map((l, i) => {
                const tid = titulares[l.id];
                const emp = tid !== '__TIENDA__' ? App.data.empleados.find(e => e.id === tid) : null;
                const nombre = emp ? emp.nombre : '🏪 Tienda';
                return `• L${i + 1}${l.alias ? ' ' + l.alias : ''} → ${nombre}`;
            }).join('\n');
            alert(`✅ Cadena reiniciada desde ${Utils.formatDateES(fecha)}\n\n${aEliminar.length} traspaso${aEliminar.length !== 1 ? 's' : ''} eliminado${aEliminar.length !== 1 ? 's' : ''}\n\nNuevos portadores:\n${resumen}\n\nYa puedes crear nuevos traspasos desde este punto.`);

            App.logic._refreshLlaves();
        },

        _renderLlaves: function(c, sectionBar) {
            const hoy = new Date().toISOString().slice(0,10);
            const llaves = App.data.config.llaves || [];
            const traspasos = (App.data.traspasoLlaves || []).slice().sort((a,b) => a.fecha.localeCompare(b.fecha));

            const empName = id => {
                if(!id) return '<span style="color:#94a3b8;">—</span>';
                if(id === '__TIENDA__') return '<span style="color:#f59e0b;font-weight:600;">🏪 En tienda</span>';
                const e = App.data.empleados.find(e => e.id === id);
                return e ? e.nombre : '—';
            };
            const llaveLabel = (llaveId) => {
                const idx = llaves.findIndex(l => l.id === llaveId);
                if(idx < 0) return 'Llave ?';
                return `Llave ${idx+1}${llaves[idx].alias ? ' · ' + llaves[idx].alias : ''}`;
            };

            // Titular de una llave al cierre del día d (tras todos los traspasos de ese día)
            const titularAlFinalDeDia = (llaveId, fechaStr) => App.logic.getTitularLlave(llaveId, fechaStr);

            const _celdaLlave = (llaveId, fechaStr, llaveIdx) => {
                const sep = llaveIdx === 0 ? 'border-left:2px solid #cbd5e1;' : '';
                const tid = titularAlFinalDeDia(llaveId, fechaStr);
                if (!tid) return `<td style="padding:6px 8px;font-size:0.75rem;color:#cbd5e1;text-align:center;${sep}">—</td>`;
                if (tid === '__TIENDA__') return `<td style="padding:6px 8px;font-size:0.75rem;color:#f59e0b;text-align:center;${sep}">Tienda</td>`;
                const e = App.data.empleados.find(e => e.id === tid);
                const nombre = e ? e.nombre : tid;
                return `<td style="padding:6px 8px;font-size:0.75rem;color:#1e293b;text-align:center;font-weight:600;${sep}">${nombre}</td>`;
            };

            // Detectar traspasos con flujo roto: el dador no tiene realmente la llave
            const brokenIds = new Set();
            const traspasoPorLlave = {};
            traspasos.forEach(t => {
                if (!traspasoPorLlave[t.llaveId]) traspasoPorLlave[t.llaveId] = [];
                traspasoPorLlave[t.llaveId].push(t);
            });
            const resetIds = new Set();
            Object.keys(traspasoPorLlave).forEach(llaveId => {
                const lista = traspasoPorLlave[llaveId]; // ya ordenados por fecha
                let broken = false;
                lista.forEach(t => {
                    // Los traspasos de reinicio son puntos de partida — nunca rotos, resetean la cadena
                    if (t.source === 'reset') {
                        resetIds.add(t.id);
                        broken = false; // limpiar cascada
                        return;
                    }
                    if (broken) {
                        brokenIds.add(t.id);
                        return;
                    }
                    const titularReal = App.logic.getTitularLlaveInicio
                        ? App.logic.getTitularLlaveInicio(t.llaveId, t.fecha)
                        : null;
                    const dador = t.dadorId || '__TIENDA__';
                    if (titularReal === null && dador === '__TIENDA__') return;
                    if (titularReal !== dador) {
                        brokenIds.add(t.id);
                        broken = true;
                    }
                });
            });

            const _fila = (t, esPasado) => {
                const isBroken = brokenIds.has(t.id);
                const isReset = resetIds.has(t.id);
                const dadorHtml = empName(t.dadorId || '__TIENDA__');
                const celdasLlaves = llaves.map((l, idx) => _celdaLlave(l.id, t.fecha, idx)).join('');
                let rowBg = '', rowBorder = '', rowTitle = '', dateExtra = '', dateColor = '#475569', dadorColor = '#475569';
                if (isReset) {
                    rowBg = 'background:#eff6ff;';
                    rowBorder = 'border-left:3px solid #2563eb;';
                    rowTitle = 'title="Punto de inicio — cadena reiniciada desde esta fecha"';
                    dateExtra = ' 🔵';
                    dateColor = '#2563eb';
                } else if (isBroken) {
                    rowBg = 'background:#fef2f2;';
                    rowBorder = 'border-left:3px solid #ef4444;';
                    rowTitle = 'title="Flujo roto: el entregador no tiene esta llave en esta fecha"';
                    dateExtra = ' ⚠';
                    dateColor = '#dc2626';
                    dadorColor = '#dc2626';
                }
                return `<tr style="border-bottom:1px solid #f1f5f9;${esPasado?'opacity:0.65;':''}${rowBg}${rowBorder}" ${rowTitle}>
                    <td style="padding:9px 12px;font-size:0.8rem;color:${dateColor};white-space:nowrap;">${Utils.formatDateES(t.fecha)}${dateExtra}</td>
                    <td style="padding:9px 12px;font-size:0.82rem;font-weight:600;color:#1e293b;">${llaveLabel(t.llaveId)}</td>
                    <td style="padding:9px 12px;font-size:0.82rem;color:${dadorColor};">${isReset ? '<span style="color:#2563eb;font-weight:600;">Inicio</span>' : dadorHtml}</td>
                    <td style="padding:9px 12px;font-size:0.82rem;color:#1e293b;font-weight:600;">${empName(t.receptorId)}</td>
                    ${celdasLlaves}
                    <td style="padding:9px 12px;text-align:right;white-space:nowrap;">
                        <button onclick="App.ui.renderTraspasoInspector('${t.id}', '${t.fecha}')" title="Editar" style="background:none;border:none;cursor:pointer;color:#64748b;padding:2px 4px;vertical-align:middle;">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2l3 3-9 9H2v-3L11 2z"/></svg>
                        </button>
                        ${!esPasado ? `<button onclick="App.logic.traspasoDel('${t.id}'${isBroken ? ', true' : ''})" title="${isBroken ? 'Borrar traspasos rotos' : 'Borrar'}" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:13px;padding:2px 4px;vertical-align:middle;">✕</button>` : ''}
                    </td>
                </tr>`;
            };

            const thLlaves = llaves.map((l, idx) =>
                `<th style="padding:8px 8px;text-align:center;font-size:0.7rem;font-weight:700;color:#64748b;text-transform:uppercase;white-space:nowrap;${idx===0?'border-left:2px solid #cbd5e1;':'border-left:1px solid #e2e8f0;'}">${l.alias || ('L'+(idx+1))}</th>`
            ).join('');

            const thead = `<thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Fecha</th>
                <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Llave</th>
                <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Entrega</th>
                <th style="padding:8px 12px;text-align:left;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Recibe</th>
                ${thLlaves}
                <th style="width:40px;"></th>
            </tr></thead>`;

            // Filtros de traspasos
            const _trFilterEmp = App.uiState.trFilterEmp || 'todos';
            const _trFilterLlave = App.uiState.trFilterLlave || 'todos';
            const _r = `App.ui.renderRequests(document.querySelector('.main-scroll'))`;

            // Personas involucradas en traspasos (para filtro)
            const _empIds = [...new Set(traspasos.flatMap(t => [t.dadorId, t.receptorId]).filter(id => id && id !== '__TIENDA__'))];
            const _empsFilter = App.data.empleados.filter(e => _empIds.includes(e.id)).sort((a,b) => a.customOrder - b.customOrder);

            const _ps = (on, color) => `padding:3px 8px;border-radius:14px;border:1px solid ${on?color:'#e2e8f0'};font-size:0.65rem;font-weight:600;cursor:pointer;background:${on?color+'18':'white'};color:${on?color:'#94a3b8'};`;
            let filterBar = `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:10px;">`;
            filterBar += `<button onclick="App.uiState.trFilterEmp='todos';App.uiState.trFilterLlave='todos';${_r}" style="${_ps(_trFilterEmp==='todos'&&_trFilterLlave==='todos','#2563eb')}">Todos</button>`;
            llaves.forEach((l, i) => {
                filterBar += `<button onclick="App.uiState.trFilterLlave='${l.id}';App.uiState.trFilterEmp='todos';${_r}" style="${_ps(_trFilterLlave===l.id,'#7c3aed')}">L${i+1}${l.alias?' '+l.alias:''}</button>`;
            });
            _empsFilter.forEach(e => {
                filterBar += `<button onclick="App.uiState.trFilterEmp='${e.id}';App.uiState.trFilterLlave='todos';${_r}" style="${_ps(_trFilterEmp===e.id,'#0891b2')}">${e.nombre.split(' ')[0]}</button>`;
            });
            filterBar += `</div>`;

            const matchFilter = t => {
                if (_trFilterLlave !== 'todos' && t.llaveId !== _trFilterLlave) return false;
                if (_trFilterEmp !== 'todos' && t.dadorId !== _trFilterEmp && t.receptorId !== _trFilterEmp) return false;
                return true;
            };

            const proximos = traspasos.filter(t => t.fecha >= hoy && matchFilter(t));
            const pasados  = traspasos.filter(t => t.fecha < hoy && matchFilter(t));

            const proximosHtml = proximos.length === 0
                ? `<div style="padding:32px;text-align:center;color:#94a3b8;font-size:0.85rem;">Sin traspasos planificados. Pulsa "+ Nuevo traspaso" para añadir uno.</div>`
                : `<table style="width:100%;border-collapse:collapse;">${thead}<tbody>${proximos.map(t => _fila(t, false)).join('')}</tbody></table>`;

            const pasadosFiltered = pasados;
            const archivoHtml = pasadosFiltered.length === 0 ? '' : `
                <details style="margin-top:18px;">
                    <summary style="cursor:pointer;font-size:0.78rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;padding:6px 0;user-select:none;">
                        📁 Archivo (${pasadosFiltered.length})
                    </summary>
                    <div style="margin-top:8px;">
                        <table style="width:100%;border-collapse:collapse;">${thead}<tbody>${pasadosFiltered.map(t => _fila(t, true)).join('')}</tbody></table>
                    </div>
                </details>`;

            const estadoActualHtml = llaves.length === 0 ? '' : `
                <div style="margin-bottom:18px;padding:12px 16px;background:#f8fafc;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;margin-bottom:8px;">Estado actual</div>
                    <div style="display:flex;flex-wrap:wrap;gap:8px;">
                        ${llaves.map((l, idx) => {
                            const titularId = App.logic.getTitularLlave(l.id, hoy);
                            const esPersona = titularId && titularId !== '__TIENDA__';
                            const titular = esPersona ? App.data.empleados.find(e => e.id === titularId) : null;
                            const nombre = titular ? titular.nombre : 'En tienda';
                            const color = titular ? '#059669' : '#f59e0b';
                            const border = titular ? '#bbf7d0' : '#fef3c7';
                            return `<div style="padding:6px 12px;background:white;border-radius:6px;border:1px solid ${border};font-size:0.82rem;">
                                <span style="font-weight:700;color:#334155;">Llave ${idx+1}${l.alias?' · '+l.alias:''}</span>
                                <span style="color:${color};margin-left:6px;">● ${nombre}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>`;

            const llavesView = App.uiState.llavesView || 'traspasos';
            const _lvBtn = (key, label) => {
                const active = llavesView === key;
                return `<button onclick="App.uiState.llavesView='${key}';App.ui.renderRequests(document.querySelector('.main-scroll'))"
                    style="padding:5px 12px;border-radius:20px;border:1px solid ${active?'#2563eb':'#e2e8f0'};
                           font-size:0.72rem;font-weight:600;cursor:pointer;
                           background:${active?'#eff6ff':'white'};color:${active?'#2563eb':'#94a3b8'};">
                    ${label}
                </button>`;
            };
            const viewTabs = `<div style="display:flex;gap:5px;margin-bottom:14px;">
                ${_lvBtn('traspasos','Traspasos')}
                ${_lvBtn('porPersona','Por persona')}
                ${_lvBtn('porLlave','Por llave')}
            </div>`;

            c.style.cssText = 'padding:16px;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;';

            if (llavesView === 'porPersona') {
                c.innerHTML = sectionBar + `<div style="max-width:900px;margin:0 auto;">${viewTabs}${this._llavesVistaPersona(llaves, hoy)}</div>`;
                const insp = document.getElementById('inspector-content');
                if (insp) insp.innerHTML = '';
                return;
            }
            if (llavesView === 'porLlave') {
                c.innerHTML = sectionBar + `<div style="max-width:900px;margin:0 auto;">${viewTabs}${this._llavesVistaLlave(llaves, hoy)}</div>`;
                const insp = document.getElementById('inspector-content');
                if (insp) insp.innerHTML = '';
                return;
            }

            c.innerHTML = sectionBar + `
                <div style="max-width:800px;margin:0 auto;">
                    ${viewTabs}
                    <div id="llaves-optimizer-wrapper">${App.llaves._renderPanel()}</div>
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                        <h3 style="margin:0;font-size:1rem;font-weight:700;color:#1e293b;">🔑 Traspasos de llave</h3>
                        <div style="display:flex;gap:6px;">
                            <button onclick="App.ui._llavesReiniciar()"
                                style="padding:7px 14px;background:white;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;font-size:0.78rem;cursor:pointer;">🔄 Reiniciar cadena</button>
                            <button onclick="App.ui.renderDayInspector('${hoy}')"
                                style="padding:7px 16px;background:#2563eb;color:white;border:none;border-radius:6px;font-weight:700;font-size:0.82rem;cursor:pointer;">+ Nuevo traspaso</button>
                        </div>
                    </div>
                    ${estadoActualHtml}
                    ${filterBar}
                    ${proximosHtml}
                    ${archivoHtml}
                </div>`;
        },

        renderDayInspector: function(fecha) {
            const p = document.getElementById('inspector-content');
            if (!p) return;

            // Persistir fecha para restaurar al volver a la sección
            App.llaves._ui.inspectorDate = fecha;

            // Navegación fechas
            const dObj = new Date(fecha + 'T12:00:00');
            const prevDate = new Date(dObj); prevDate.setDate(prevDate.getDate() - 1);
            const nextDate = new Date(dObj); nextDate.setDate(nextDate.getDate() + 1);
            const prevStr = prevDate.toISOString().slice(0,10);
            const nextStr = nextDate.toISOString().slice(0,10);
            const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const MESES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
            const dLabel = `${DIAS[dObj.getDay()]} ${dObj.getDate()} ${MESES[dObj.getMonth()]} ${dObj.getFullYear()}`;

            const llaves  = App.data.config.llaves || [];
            const horario = App.logic._getHorarioDelDia(fecha);
            const storeOpen = !!(horario && !horario.closed);

            // TAG3 activos en la fecha
            const tag3 = App.data.empleados
                .filter(e => e.active !== false && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fecha)))
                .sort((a, b) => a.customOrder - b.customOrder);

            // 5 fechas futuras
            const futureDates = [];
            for (let i = 1; i <= 5; i++) {
                const fd = new Date(dObj); fd.setDate(fd.getDate() + i);
                futureDates.push(fd.toISOString().slice(0,10));
            }

            // SVGs de llave (igual que planner grid)
            const KEY_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/></svg>';
            const ARW_OUT = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="2" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>';
            const ARW_IN  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="14" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>';
            const STORE   = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M2 6h12v8H2z"/><path d="M1 6l2-4h10l2 4"/><line x1="6" y1="10" x2="10" y2="10"/></svg>';

            // Col llave: misma lógica que planner grid
            const getKeyContent = (empId, date) => {
                if (!App.data.config.llavesActivo || !App.data.traspasoLlaves) return '';
                const recibe     = App.data.traspasoLlaves.some(t => t.receptorId === empId && t.dadorId != null && t.fecha === date);
                const entrega    = App.data.traspasoLlaves.some(t => t.dadorId === empId && t.fecha === date);
                const dejaTienda = App.data.traspasoLlaves.some(t => t.dadorId === empId && t.receptorId === '__TIENDA__' && t.fecha === date);
                const cogeTienda = App.data.traspasoLlaves.some(t => t.receptorId === empId && t.dadorId === '__TIENDA__' && t.fecha === date);
                const tieneLlave = llaves.some(l => App.logic.getTitularLlave(l.id, date) === empId);
                if (dejaTienda)  return KEY_SVG + ARW_OUT + STORE;
                if (cogeTienda)  return KEY_SVG + ARW_IN  + STORE;
                if (entrega)     return KEY_SVG + ARW_OUT;
                if (recibe)      return ARW_IN  + KEY_SVG;
                if (tieneLlave)  return KEY_SVG;
                return '';
            };

            // Info turno/apertura/cierre para cualquier día
            const getDayInfo = (empId, date) => {
                const horD = App.logic._getHorarioDelDia(date);
                const storeOpenD = !!(horD && !horD.closed);
                const sv = (App.data.schedule[date] || {})[empId];
                let isFixed = false;
                if (sv && typeof sv === 'string') { const sh = Utils.getShift(sv); if (sh) isFixed = !!sh.fixed; }
                const isWorking = !isFixed && !!sv;
                return {
                    isLibre: !sv || isFixed,
                    opens:   storeOpenD && isWorking && App.llaves._esOpener(empId, date),
                    closes:  storeOpenD && isWorking && App.llaves._esCloser(empId, date),
                    sv, isFixed
                };
            };

            // Sección llaves (titular por llave)
            const keysHtml = llaves.map((l, idx) => {
                const tid = App.logic.getTitularLlave(l.id, fecha);
                const emp = tid && tid !== '__TIENDA__' ? App.data.empleados.find(e => e.id === tid) : null;
                const titLabel = tid === '__TIENDA__' ? '🏪 Tienda' : (emp ? emp.nombre : '—');
                // Detectar si el titular está ausente hoy (libra, vacaciones, baja...)
                const isAbsent = emp ? getDayInfo(emp.id, fecha).isLibre : (tid === '__TIENDA__');
                const absentStyle = isAbsent ? 'background:#f1f5f9;opacity:0.55;border-radius:4px;padding:2px 6px;' : 'padding:2px 6px;';
                const absentTitle = isAbsent && emp ? ' title="Ausente hoy"' : '';
                return `<div style="display:flex;align-items:center;gap:6px;font-size:0.8rem;${absentStyle}"${absentTitle}>
                    <span style="font-weight:700;color:#2563eb;width:20px;">L${idx+1}</span>
                    <span style="color:#94a3b8;min-width:64px;">${l.alias || ''}</span>
                    <span style="color:#1e293b;">${titLabel}</span>
                </div>`;
            }).join('');

            // Cabecera de la tabla
            const thS = 'padding:3px 2px;text-align:center;font-size:0.65rem;font-weight:700;letter-spacing:.04em;color:#94a3b8;border-bottom:2px solid #e2e8f0;white-space:nowrap;';
            const sepTh = `<th style="${thS}width:2px;padding:0;background:#e2e8f0;"></th>`;
            const futureHeaders = futureDates.map(fd => {
                const fo = new Date(fd + 'T12:00:00');
                return `<th style="${thS}">${DIAS[fo.getDay()].slice(0,2)}<br>${fo.getDate()}</th>`;
            }).join('');

            // Filas de empleados
            const tdS = 'padding:3px 2px;text-align:center;vertical-align:middle;border-bottom:1px solid #f1f5f9;';
            const rowsHtml = tag3.map(emp => {
                // Datos de hoy
                const sv = (App.data.schedule[fecha] || {})[emp.id];
                let shiftLabel = '—', isFixed = false, shiftColor = '#94a3b8';
                if (sv && typeof sv === 'string') {
                    const sh = Utils.getShift(sv);
                    if (sh) { shiftLabel = sh.code; isFixed = !!sh.fixed; shiftColor = sh.color || '#94a3b8'; }
                    else shiftLabel = sv;
                } else if (sv) {
                    shiftLabel = `${sv.start}–${sv.end}`; shiftColor = sv.color || '#6b7280';
                }
                const isWorking = !isFixed && !!sv;
                const isLibreToday = !sv || isFixed;
                const opens  = storeOpen && isWorking && App.llaves._esOpener(emp.id, fecha);
                const closes = storeOpen && isWorking && App.llaves._esCloser(emp.id, fecha);

                // Col 2: llave (réplica planner grid)
                const keyContent = getKeyContent(emp.id, fecha);
                const keyTitle = !keyContent ? '' :
                    keyContent.includes('__TIENDA__') ? '' :
                    (keyContent.includes('stroke="#ef4444"') && keyContent.includes('store')) ? 'Deja llave en tienda' :
                    (keyContent.includes('stroke="#22c55e"') && keyContent.includes('store')) ? 'Recoge llave de tienda' :
                    keyContent.includes('stroke="#ef4444"') ? 'Entrega llave' :
                    keyContent.includes('stroke="#22c55e"') ? 'Recibe llave' : 'Tiene llave';

                // Col 3: LIBRE — muestra el código de turno si es fijo, o L si no hay turno
                const libreLabel = shiftLabel !== '—' ? shiftLabel : 'L';
                const libreTitle = !isLibreToday ? '' : (shiftLabel !== '—' ? `Libranza (${shiftLabel})` : 'Sin turno asignado');
                const libreCell = isLibreToday
                    ? `<span style="display:inline-block;padding:2px 6px;background:${shiftColor}22;color:${shiftColor};border-radius:4px;font-size:0.72rem;font-weight:700;">${libreLabel}</span>`
                    : '';

                // Col 4: ABRE
                const abreCell = opens
                    ? `<span style="display:inline-block;padding:2px 6px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-size:0.72rem;font-weight:700;">A</span>`
                    : '';

                // Col 5: CIERRA
                const cierraCell = closes
                    ? `<span style="display:inline-block;padding:2px 6px;background:#fef9c3;color:#854d0e;border-radius:4px;font-size:0.72rem;font-weight:700;">C</span>`
                    : '';

                // Cols futuros
                const futureCells = futureDates.map(fd => {
                    const info = getDayInfo(emp.id, fd);
                    let content = '', tooltip = '';
                    if (info.isLibre) {
                        let fLabel = 'L';
                        if (info.sv && typeof info.sv === 'string') {
                            const fSh = Utils.getShift(info.sv);
                            if (fSh && fSh.fixed) fLabel = fSh.code;
                        }
                        tooltip = fLabel === 'L' ? 'Sin turno' : `Libranza (${fLabel})`;
                        content = `<span style="color:#16a34a;font-size:0.72rem;font-weight:600;">${fLabel}</span>`;
                    } else {
                        const parts = [];
                        if (info.opens)  { parts.push(`<span style="color:#1d4ed8;font-size:0.72rem;font-weight:700;">A</span>`); }
                        if (info.closes) { parts.push(`<span style="color:#854d0e;font-size:0.72rem;font-weight:700;">C</span>`); }
                        if (!parts.length) {
                            tooltip = 'Trabaja (sin apertura ni cierre)';
                            parts.push(`<span style="color:#94a3b8;font-size:0.75rem;">·</span>`);
                        } else {
                            tooltip = [info.opens ? 'Abre tienda' : '', info.closes ? 'Cierra tienda' : ''].filter(Boolean).join(' + ');
                        }
                        content = parts.join('');
                    }
                    return `<td style="${tdS}" title="${tooltip}">${content}</td>`;
                }).join('');

                const sepTd = `<td style="padding:0;width:2px;background:#e2e8f0;border-bottom:1px solid #e2e8f0;"></td>`;
                return `<tr>
                    <td style="padding:3px 6px 3px 2px;font-size:0.78rem;font-weight:600;color:#1e293b;white-space:nowrap;border-bottom:1px solid #f1f5f9;">${emp.nombre}</td>
                    <td style="${tdS}white-space:nowrap;" title="${keyTitle}">${keyContent}</td>
                    <td style="${tdS}" title="${libreTitle}">${libreCell}</td>
                    <td style="${tdS}" title="${opens ? 'Abre tienda' : ''}">${abreCell}</td>
                    <td style="${tdS}" title="${closes ? 'Cierra tienda' : ''}">${cierraCell}</td>
                    ${sepTd}
                    ${futureCells}
                </tr>`;
            }).join('');

            const storeBadge = storeOpen
                ? `<span style="color:#16a34a;font-size:0.73rem;">Abierta ${horario.open}–${horario.close}</span>`
                : `<span style="color:#dc2626;font-size:0.73rem;">Cerrada</span>`;

            // Cobertura de llave para apertura y cierre
            const coverage = storeOpen ? App.logic._checkKeysCoverageDay(fecha) : null;
            const covOk  = 'display:inline-flex;align-items:center;gap:2px;padding:1px 6px;background:#dcfce7;color:#15803d;border-radius:4px;font-size:0.68rem;font-weight:700;';
            const covBad = 'display:inline-flex;align-items:center;gap:2px;padding:1px 6px;background:#fee2e2;color:#dc2626;border-radius:4px;font-size:0.68rem;font-weight:700;';
            const covSvgOk  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#15803d" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,8 6.5,11.5 13,4.5"/></svg>';
            const covSvgBad = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#dc2626" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>';
            // Mini llave SVG para cobertura
            const KEY_MINI = (color) => `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/></svg>`;

            // Estilos gris para días sin gestión de llaves instaurada
            const covGrey = 'display:inline-flex;align-items:center;gap:2px;padding:1px 6px;background:#f1f5f9;color:#94a3b8;border-radius:4px;font-size:0.68rem;font-weight:700;';
            const covSvgGrey = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="8" x2="13" y2="8"/></svg>';

            let coverageHtml = '';
            if (coverage) {
                const esHoy = fecha === new Date().toISOString().slice(0,10);
                const daySched = App.data.schedule[fecha] || {};

                // ¿Hay alguna llave con titular humano al inicio/final del día?
                const anyHolderInicio = llaves.some(l => {
                    const tid = App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, fecha) : null;
                    return tid && tid !== '__TIENDA__';
                });
                const anyHolderFin = llaves.some(l => {
                    const tid = App.logic.getTitularLlave(l.id, fecha);
                    return tid && tid !== '__TIENDA__';
                });

                // Llaves que cubren apertura (titular al inicio del día trabaja y abre)
                const keysApertura = llaves.filter(l => {
                    const tid = App.logic.getTitularLlaveInicio ? App.logic.getTitularLlaveInicio(l.id, fecha) : App.logic.getTitularLlave(l.id, fecha);
                    if (!tid || tid === '__TIENDA__') return false;
                    const sv = daySched[tid];
                    if (!sv) return false;
                    const sh = Utils.getShift(sv);
                    return sh && !sh.fixed && sh.start === horario.open;
                });

                // Llaves que cubren cierre (titular al final del día trabaja y cierra)
                const keysCierre = llaves.filter(l => {
                    const tid = App.logic.getTitularLlave(l.id, fecha);
                    if (!tid || tid === '__TIENDA__') return false;
                    const sv = daySched[tid];
                    if (!sv) return false;
                    const sh = Utils.getShift(sv);
                    return sh && !sh.fixed && sh.end === horario.close;
                });

                const aKeysHtml = keysApertura.length > 0
                    ? `<div style="display:flex;justify-content:center;gap:1px;margin-top:2px;">${keysApertura.map(() => KEY_MINI('#15803d')).join('')}</div>` : '';
                const cKeysHtml = keysCierre.length > 0
                    ? `<div style="display:flex;justify-content:center;gap:1px;margin-top:2px;">${keysCierre.map(() => KEY_MINI('#15803d')).join('')}</div>` : '';

                // Apertura: gris si no hay gestión instaurada, verde/rojo si sí
                let aSpan;
                if (!anyHolderInicio) {
                    aSpan = `<div style="text-align:center;"><span style="${covGrey}" title="Sin gestión de llaves para apertura">${covSvgGrey} Apertura</span></div>`;
                } else if (esHoy) {
                    aSpan = coverage.hasApertura ? `<div style="text-align:center;"><span style="${covOk}" title="Un portador de llave abre la tienda">${covSvgOk} Apertura</span>${aKeysHtml}</div>` : '';
                } else {
                    aSpan = coverage.hasApertura
                        ? `<div style="text-align:center;"><span style="${covOk}" title="Un portador de llave abre la tienda">${covSvgOk} Apertura</span>${aKeysHtml}</div>`
                        : `<div style="text-align:center;"><span style="${covBad}" title="Nadie con llave abre la tienda">${covSvgBad} Apertura</span></div>`;
                }

                // Cierre: gris si no hay gestión instaurada, verde/rojo si sí
                let cSpan;
                if (!anyHolderFin) {
                    cSpan = `<div style="text-align:center;"><span style="${covGrey}" title="Sin gestión de llaves para cierre">${covSvgGrey} Cierre</span></div>`;
                } else {
                    cSpan = coverage.hasCierre
                        ? `<div style="text-align:center;"><span style="${covOk}" title="Un portador de llave cierra la tienda">${covSvgOk} Cierre</span>${cKeysHtml}</div>`
                        : `<div style="text-align:center;"><span style="${covBad}" title="Nadie con llave cierra la tienda">${covSvgBad} Cierre</span></div>`;
                }

                coverageHtml = (aSpan || cSpan) ? `<div style="display:flex;justify-content:center;gap:12px;margin-bottom:10px;">${aSpan}${cSpan}</div>` : '';
            }

            // Form: opciones de llave y receptor
            const llaveOpts = llaves.map((l, idx) => {
                const titId = App.logic.getTitularLlave(l.id, fecha);
                const tit = titId ? App.data.empleados.find(e => e.id === titId) : null;
                const label = `L${idx+1}${l.alias ? ' ' + l.alias : ''} — ${tit ? tit.nombre : 'Sin titular'}`;
                return `<option value="${l.id}">${label}</option>`;
            }).join('');

            const tag3Opts = `<option value="__TIENDA__">🏪 Dejar en tienda</option>` +
                App.data.empleados
                .filter(e => e.active !== false && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fecha)))
                .sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

            const dateOnChange = `App.ui.renderDayInspector(this.dataset.isoValue);`;
            const nb = 'padding:4px 10px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer;font-size:0.88rem;font-weight:700;color:#334155;';

            p.innerHTML = `<div style="padding:14px 16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                    <button onclick="App.ui.renderDayInspector('${prevStr}')" style="${nb}">◀</button>
                    <span style="font-weight:700;font-size:0.88rem;color:#1e293b;">${dLabel}</span>
                    <button onclick="App.ui.renderDayInspector('${nextStr}')" style="${nb}">▶</button>
                </div>
                <div style="text-align:center;margin-bottom:6px;">${storeBadge}</div>
                ${coverageHtml}

                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px;margin-bottom:12px;">
                    <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:5px;">Llaves</div>
                    ${keysHtml}
                </div>

                <div style="margin-bottom:16px;overflow-x:auto;">
                    <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:4px;">Equipo TAG3</div>
                    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
                        <colgroup>
                            <col style="width:56px;">
                            <col style="width:28px;">
                            <col style="width:38px;">
                            <col style="width:38px;">
                            <col style="width:38px;">
                            <col style="width:2px;">
                            <col style="width:28px;"><col style="width:28px;"><col style="width:28px;"><col style="width:28px;"><col style="width:28px;">
                        </colgroup>
                        <thead>
                        <tr>
                            <th colspan="5" style="padding:1px 2px;text-align:center;font-size:0.6rem;font-weight:700;color:#64748b;border-bottom:none;letter-spacing:.03em;">${DIAS[dObj.getDay()]} ${dObj.getDate()} ${MESES[dObj.getMonth()]}</th>
                            <th style="border-bottom:none;"></th>
                            <th colspan="${futureDates.length}" style="padding:1px 2px;text-align:center;font-size:0.6rem;font-weight:600;color:#94a3b8;border-bottom:none;">Próximos</th>
                        </tr>
                        <tr>
                            <th style="${thS}text-align:left;padding-left:2px;"></th>
                            <th style="${thS}" title="Llaves">🔑</th>
                            <th style="${thS}" title="Libra">LIBRA</th>
                            <th style="${thS}" title="Abre tienda">ABRE</th>
                            <th style="${thS}" title="Cierra tienda">CIERRA</th>
                            ${sepTh}
                            ${futureHeaders}
                        </tr></thead>
                        <tbody>${rowsHtml}</tbody>
                    </table>
                </div>

                <div style="border-top:2px solid #e2e8f0;padding-top:14px;">
                    <div style="font-size:0.68rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;">Nuevo traspaso</div>
                    <input type="hidden" id="tr-fecha" value="${fecha}">
                    <div class="form-group" style="margin-bottom:8px;">
                        <label>Fecha</label>
                        ${Utils.getDateInputHTML('tr-fecha-picker', fecha, dateOnChange)}
                    </div>
                    <div class="form-group" style="margin-bottom:8px;">
                        <label>Llave</label>
                        <select id="tr-llaveId">${llaveOpts}</select>
                    </div>
                    <div class="form-group" style="margin-bottom:12px;">
                        <label>Recibe</label>
                        <select id="tr-receptorId">${tag3Opts}</select>
                    </div>
                    <button class="btn btn-primary" onclick="App.logic.traspasoSave(document.getElementById('tr-llaveId').value, document.getElementById('tr-fecha').value, document.getElementById('tr-receptorId').value)">
                        💾 Guardar traspaso
                    </button>
                </div>
            </div>`;
        },

        renderTraspasoInspector: function(id, fecha) {
            const p = document.getElementById('inspector-content');
            if(!p) return;
            const hoy = new Date().toISOString().slice(0,10);

            // Sin id = nuevo traspaso → delegar al inspector de día (ya tiene el formulario)
            if (!id) {
                this.renderDayInspector(fecha || hoy);
                return;
            }

            const llaves = App.data.config.llaves || [];
            const editData = (App.data.traspasoLlaves || []).find(t => t.id === id);
            const fechaRef = editData ? editData.fecha : (fecha || hoy);

            if(!App.data.config.llavesActivo || llaves.length === 0) {
                p.innerHTML = `<div style="padding:20px;color:#94a3b8;font-size:0.85rem;">
                    La gestión de llaves no está activa o no hay llaves configuradas.<br>
                    <button onclick="App.router.go('config')" style="margin-top:10px;padding:6px 12px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;font-size:0.82rem;cursor:pointer;">Ir a Configuración</button>
                </div>`;
                return;
            }

            const tag3Opts = `<option value="__TIENDA__"${editData && editData.receptorId === '__TIENDA__' ? ' selected' : ''}>🏪 Dejar en tienda (sin portador)</option>` +
                App.data.empleados
                .filter(e => e.active !== false && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fechaRef)))
                .sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}"${editData && editData.receptorId === e.id ? ' selected' : ''}>${e.nombre}</option>`).join('');

            const llaveOpts = llaves.map((l, idx) => {
                const label = `Llave ${idx+1}${l.alias?' · '+l.alias:''}`;
                const sel = editData && editData.llaveId === l.id ? ' selected' : '';
                return `<option value="${l.id}"${sel}>${label}</option>`;
            }).join('');

            // Mostrar quién entrega (dador del traspaso)
            const dadorId = editData ? editData.dadorId : null;
            const dadorName = dadorId === '__TIENDA__' ? '🏪 Tienda' : (dadorId ? (App.data.empleados.find(e => e.id === dadorId)?.nombre || '—') : '—');

            const dateOnChange = `document.getElementById('tr-fecha').value=this.dataset.isoValue; App.ui.renderTraspasoInspector('${id}', this.dataset.isoValue);`;

            p.innerHTML = `
                <div style="padding:20px;">
                    <div style="margin-bottom:14px;">
                        <button onclick="App.ui.renderDayInspector('${fechaRef}')" style="background:none;border:none;cursor:pointer;font-size:0.78rem;color:#64748b;padding:0;">
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px;margin-right:3px;"><polyline points="10,2 4,8 10,14"/></svg>Volver al día
                        </button>
                    </div>
                    <h3 style="margin:0 0 18px;font-size:1rem;font-weight:700;color:#1e293b;">Editar traspaso</h3>
                    <div class="form-group">
                        <label>Fecha del traspaso</label>
                        <input type="hidden" id="tr-fecha" value="${fechaRef}">
                        ${Utils.getDateInputHTML('tr-fecha-picker', fechaRef, dateOnChange)}
                    </div>
                    <div class="form-group">
                        <label>Llave</label>
                        <select id="tr-llaveId">${llaveOpts}</select>
                    </div>
                    <div style="margin-bottom:14px;padding:8px 12px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;font-size:0.82rem;">
                        <span style="color:#64748b;">Entrega:</span> <span style="font-weight:600;color:#1e293b;">${dadorName}</span>
                    </div>
                    <div class="form-group">
                        <label>Recibe la llave</label>
                        <select id="tr-receptorId">${tag3Opts}</select>
                    </div>
                    <button class="btn btn-primary" onclick="App.logic.traspasoUpdate('${id}', document.getElementById('tr-llaveId').value, document.getElementById('tr-fecha').value, document.getElementById('tr-receptorId').value)">Guardar cambios</button>
                </div>`;
        }

});
