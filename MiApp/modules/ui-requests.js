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
            if (App.uiState.reqView === 'calendar') {
                App.ui._reqShowCalendar(mod);
            } else {
                App.ui._reqShowList(mod);
            }
        },

        // Construye el HTML de controles + filtros con el estado actual
        // Construye el HTML de controles + filtros con el estado actual
        _reqBuildFixed: function() {
            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const ICO = {
                list:     ico('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
                calendar: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>'),
                plus:     ico('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>'),
            };
            const showArchived = App.uiState.reqShowArchived;
            const isCalendar   = App.uiState.reqView === 'calendar';
            const active   = App.data.requests.filter(r => !r.archived);
            const archived = App.data.requests.filter(r =>  r.archived);

            const pill = (label, on, onclick) =>
                `<button onclick="${onclick}" style="padding:4px 11px;border-radius:5px;border:none;font-size:0.76rem;font-weight:600;cursor:pointer;
                    background:${on?'white':'transparent'};color:${on?'#1e293b':'#64748b'};
                    box-shadow:${on?'0 1px 3px rgba(0,0,0,0.1)':'none'};">${label}</button>`;

            const iconBtn = (icoHtml, title, on, onclick) =>
                `<button title="${title}" onclick="${onclick}" style="display:flex;align-items:center;justify-content:center;
                    width:30px;height:30px;border-radius:6px;border:1px solid ${on?'#2563eb':'#e2e8f0'};cursor:pointer;
                    background:${on?'#eff6ff':'white'};color:${on?'#2563eb':'#64748b'};">${icoHtml}</button>`;

            let cursoY = App.uiState.reqCalCursoY;
            if (cursoY === undefined) {
                const t = new Date();
                cursoY = t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1;
                App.uiState.reqCalCursoY = cursoY;
            }
            const calNav = isCalendar ? `
                <div style="display:flex;align-items:center;gap:4px;">
                    <button onclick="App.uiState.reqCalCursoY=${cursoY-1}; App.ui._reqRefresh()"
                        style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer;padding:3px 9px;font-size:0.82rem;color:#64748b;">◀</button>
                    <span style="font-size:0.82rem;font-weight:600;color:#475569;min-width:68px;text-align:center;">${cursoY}/${cursoY+1}</span>
                    <button onclick="App.uiState.reqCalCursoY=${cursoY+1}; App.ui._reqRefresh()"
                        style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:5px;cursor:pointer;padding:3px 9px;font-size:0.82rem;color:#64748b;">▶</button>
                </div>` : '';

            const controlBar = `
                <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:10px;flex-wrap:wrap;">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="display:flex;gap:3px;background:#f1f5f9;padding:3px;border-radius:7px;">
                            ${pill('Activas' + (active.length ? ' (' + active.length + ')' : ''), !showArchived,
                                'App.uiState.reqShowArchived=false; App.ui._reqRefresh()')}
                            ${pill('Archivadas' + (archived.length ? ' (' + archived.length + ')' : ''), showArchived,
                                'App.uiState.reqShowArchived=true; App.ui._reqRefresh()')}
                        </div>
                        <div style="display:flex;gap:4px;">
                            ${iconBtn(ICO.list,     'Vista lista',      !isCalendar,
                                "App.uiState.reqView='list'; App.ui.renderRequests(document.querySelector('.main-scroll'))")}
                            ${iconBtn(ICO.calendar, 'Vista calendario', isCalendar,
                                "App.uiState.reqView='calendar'; App.ui.renderRequests(document.querySelector('.main-scroll'))")}
                        </div>
                        ${calNav}
                    </div>
                    ${!showArchived ? '<button onclick="App.logic.reqSelect(null)" style="display:flex;align-items:center;gap:5px;padding:6px 14px;border-radius:7px;border:none;background:#2563eb;color:white;font-size:0.82rem;font-weight:600;cursor:pointer;">' + ICO.plus + ' Nueva solicitud</button>' : ''}
                </div>`;

            const ALL_TYPES = ['VAC','LIB','HRL','AP','BAJ'];
            const activeFilter = App.uiState.reqTypeFilter || ALL_TYPES;
            const allActive = ALL_TYPES.every(t => activeFilter.includes(t));
            const TYPE_META = App.ui._reqTypeMeta();

            let filterBar = '<div style="display:flex;align-items:center;gap:6px;margin-bottom:12px;flex-wrap:wrap;">';
            filterBar += '<button onclick="App.logic.reqResetTypeFilter()" style="display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:20px;border:1px solid ' + (allActive?'#2563eb':'#e2e8f0') + ';background:' + (allActive?'#eff6ff':'white') + ';color:' + (allActive?'#2563eb':'#94a3b8') + ';font-size:0.73rem;font-weight:600;cursor:pointer;">' + ico('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>', 12) + ' Todo</button>';
            ALL_TYPES.forEach(function(t) {
                const m = TYPE_META[t];
                const on = activeFilter.includes(t);
                filterBar += '<button onclick="App.logic.reqToggleType(\'' + t + '\')" title="' + m.label + '" style="display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;border:1px solid ' + (on?m.border:'#e2e8f0') + ';background:' + (on?m.bg:'white') + ';color:' + (on?m.color:'#94a3b8') + ';font-size:0.73rem;font-weight:600;cursor:pointer;opacity:' + (on?'1':'0.55') + ';">' + ico(m.ico, 12) + ' ' + t + '</button>';
            });
            filterBar += '</div>';

            return controlBar + filterBar;
        },

        renderRequests: function(c) {
            if (!c) return;
            const section = App.uiState.reqSection || 'individual';
            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const ICO = {
                list:   ico('<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>'),
                repeat: ico('<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>'),
            };

            const tabBtn = (key, icoHtml, label) => {
                const active = section === key;
                return `<button onclick="App.uiState.reqSection='${key}'; App.ui.renderRequests(document.querySelector('.main-scroll'))"
                    style="display:flex;align-items:center;gap:6px;padding:7px 16px;border-radius:6px;border:none;
                           font-size:0.82rem;font-weight:600;cursor:pointer;
                           background:${active?'white':'transparent'};color:${active?'#1e293b':'#64748b'};
                           box-shadow:${active?'0 1px 4px rgba(0,0,0,0.1)':'none'};">
                    ${icoHtml} ${label}
                </button>`;
            };
            const sectionBar = `<div style="display:flex;gap:4px;background:#f1f5f9;padding:4px;border-radius:9px;width:fit-content;margin-bottom:14px;">
                ${tabBtn('individual', ICO.list,   'Peticiones')}
                ${tabBtn('recurring',  ICO.repeat, 'Recurrentes')}
            </div>`;

            if (section === 'recurring') {
                this.renderRecurringList(c, sectionBar);
                this.renderRecurringInspector(App.uiState.recurringSelectedId);
                return;
            }

            // Forzar flex-column en el contenedor padre para fill-height
            if (c.parentElement) c.parentElement.style.cssText += ';display:flex;flex-direction:column;';
            c.style.cssText = 'display:flex;flex-direction:column;height:100%;min-height:0;padding:16px 16px 0 16px;box-sizing:border-box;';

            c.innerHTML = sectionBar + `
                <div id="req-fixed" style="flex-shrink:0;max-width:680px;margin:0 auto;width:100%;"></div>
                <div id="req-module" style="flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-gutter:stable;padding-bottom:16px;"></div>`;

            document.getElementById('req-fixed').innerHTML = App.ui._reqBuildFixed();
            const mod = document.getElementById('req-module');
            if (App.uiState.reqView === 'calendar') {
                App.ui._reqShowCalendar(mod);
            } else {
                App.ui._reqShowList(mod);
            }
        },

        _reqShowList: function(mod) {
            if (!mod) return;
            const showArchived = App.uiState.reqShowArchived;
            const sk  = App.uiState.reqSortKey  || 'start';
            const sd  = App.uiState.reqSortDir === 'asc' ? 1 : -1;
            const activeFilter = App.uiState.reqTypeFilter || ['VAC','LIB','HRL','AP','BAJ'];
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
            const filtered = [...list].sort(sortFns[sk] || sortFns.start).filter(r => activeFilter.includes(r.type));

            if (filtered.length === 0) {
                mod.innerHTML = `<div style="max-width:580px;margin:20px auto;text-align:center;padding:50px 20px;border:2px dashed #e2e8f0;border-radius:10px;color:#94a3b8;">
                    <div style="font-size:0.9rem;">${showArchived ? 'No hay solicitudes archivadas.' : activeFilter.length < 5 ? 'No hay solicitudes con los filtros seleccionados.' : 'No hay solicitudes activas.'}</div>
                </div>`;
                return;
            }

            const th = (key, label) => {
                const isActive = sk === key;
                const arrow = isActive ? (App.uiState.reqSortDir === 'asc' ? ' ↑' : ' ↓') : '';
                return `<th style="cursor:pointer;user-select:none;white-space:nowrap;padding:8px 12px;font-size:0.72rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.04em;" onclick="App.logic.reqSort('${key}')">${label}${arrow}</th>`;
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
                const recurDot = r.recurringId ? `<span title="Recurrente" style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#8b5cf6;margin-left:4px;vertical-align:middle;"></span>` : '';
                const archIco = r.archived
                    ? ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><polyline points="10 12 12 10 14 12"/><line x1="12" y1="10" x2="12" y2="17"/>', 14)
                    : ico('<polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/>', 14);

                html += `<tr style="background:${rowBg};border-left:${rowBL};cursor:pointer;"
                    onclick="App.logic.reqSelect('${r.id}')"
                    onmouseover="if(!${isSel})this.style.background='#f0f9ff'"
                    onmouseout="if(!${isSel})this.style.background='${rowBg}'">
                    <td style="padding:10px 12px;font-size:0.88rem;font-weight:500;color:#1e293b;">${name}${recurDot}</td>
                    <td style="padding:10px 12px;">
                        <div style="display:flex;align-items:center;gap:6px;color:#475569;">${icoT}<span style="font-size:0.82rem;font-weight:600;">${r.type}</span></div>
                    </td>
                    <td style="padding:10px 12px;">
                        <div style="font-size:0.83rem;color:#1e293b;">${dateStr}</div>
                        <div style="font-size:0.68rem;color:#94a3b8;margin-top:1px;">${wk}</div>
                    </td>
                    <td style="padding:10px 12px;">
                        <span style="display:inline-block;padding:3px 9px;border-radius:20px;font-size:0.72rem;font-weight:600;background:${stBg};color:${stColor};">${stText}</span>
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

        // ── Vista calendario ─────────────────────────────────────────────
        _reqShowCalendar: function(mod) {
            if (!mod) return;
            let cursoY = App.uiState.reqCalCursoY;
            if (cursoY === undefined) {
                const t = new Date();
                cursoY = t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1;
                App.uiState.reqCalCursoY = cursoY;
            }
            const showArchived  = App.uiState.reqShowArchived;
            const activeFilter  = App.uiState.reqTypeFilter || ['VAC','LIB','HRL','AP','BAJ'];

            const rangeStart = `${cursoY}-03-01`;
            const rangeEnd   = `${cursoY+1}-02-${new Date(cursoY+1, 2, 0).getDate()}`;
            const days = [];
            let cur = new Date(rangeStart + 'T00:00:00');
            const end = new Date(rangeEnd + 'T00:00:00');
            while(cur <= end) { days.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }

            const allReqs = App.data.requests.filter(r =>
                (showArchived ? r.archived : !r.archived) && activeFilter.includes(r.type)
            );

            const DAY_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const empFirst = id => { const e = App.data.empleados.find(e=>e.id===id); return e ? e.nombre.split(' ')[0] : '?'; };
            const empFull  = id => { const e = App.data.empleados.find(e=>e.id===id); return e ? e.nombre : '?'; };

            // Leyenda
            let html = `<div style="max-width:fit-content;margin:0 auto;">
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:0.67rem;color:var(--text-muted);">
                <span><span style="display:inline-block;width:8px;height:8px;background:#fef9c3;border:1px solid #fde047;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>VAC pendiente</span>
                <span><span style="display:inline-block;width:8px;height:8px;background:#dcfce7;border:1px solid #86efac;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>VAC aprobada</span>
                <span><span style="display:inline-block;width:8px;height:8px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>LIB/AP/BAJ/HRL</span>
                <span><span style="display:inline-block;width:8px;height:8px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:2px;vertical-align:middle;margin-right:2px;opacity:0.5;"></span>Archivada</span>
            </div>
            <div style="overflow-x:auto;">
            <table style="border-collapse:collapse;font-size:0.75rem;table-layout:fixed;">
                <thead>
                    <tr style="background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                        <th style="padding:4px 3px;text-align:center;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:28px;border-right:1px solid #e2e8f0;">WK</th>
                        <th style="padding:4px 4px;text-align:left;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:36px;">Fecha</th>
                        <th style="padding:4px 3px;text-align:center;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:22px;border-right:2px solid #cbd5e1;">Día</th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:115px;">VAC 1 <span style="font-weight:400;opacity:0.6;font-size:0.6rem;">☐</span></th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:115px;">VAC 2 <span style="font-weight:400;opacity:0.6;font-size:0.6rem;">☐</span></th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:115px;border-right:2px solid #cbd5e1;">VAC 3 <span style="font-weight:400;opacity:0.6;font-size:0.6rem;">☐</span></th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:150px;">Libre 1</th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:150px;">Libre 2</th>
                        <th style="padding:4px 5px;font-size:0.64rem;color:var(--text-muted);font-weight:600;width:150px;">Libre 3</th>
                    </tr>
                </thead>
                <tbody>`;

            const today = new Date().toISOString().slice(0,10);
            let lastWk = null, wkParity = 0, todayRowId = null;

            days.forEach(date => {
                const d   = new Date(date + 'T00:00:00');
                const dow = d.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isMon     = dow === 1;
                const wk        = Utils.getWeekCode(date);
                const isHoliday = (App.data.storeConfig.holidays || []).some(h => h.date === date);
                const isToday   = date === today;

                if (wk !== lastWk) { lastWk = wk; wkParity = 1 - wkParity; }

                const dayReqs   = allReqs.filter(r => date >= r.start && date <= r.end);
                const vacReqs   = dayReqs.filter(r => r.type === 'VAC');
                const otherReqs = dayReqs.filter(r => r.type !== 'VAC');

                const weekSep  = isMon ? 'border-top:2px solid #94a3b8;' : '';
                const weekBg   = wkParity === 0 ? '#ffffff' : '#f8fafc';
                const rowBg    = isHoliday ? '#fef3c7' : isWeekend ? '#f0f4f8' : weekBg;
                const todayHL  = isToday ? 'outline:2px solid #2563eb;outline-offset:-2px;' : '';
                const dayColor = isWeekend ? '#94a3b8' : '#1e293b';
                const dayW     = isWeekend ? '700' : '400';
                const wkDisplay   = wk.replace(/^\d{4}/, '').replace('WK','W');
                const dateDisplay = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                const bdBot    = `border-bottom:1px solid #f1f5f9;`;
                const cellBase = `padding:2px 5px;${bdBot}${weekSep}`;
                const rowId    = isToday ? 'id="req-today"' : '';

                const vacCell = (req, isLast=false) => {
                    const lastBdr = isLast ? 'border-right:2px solid #cbd5e1;' : '';
                    if (!req) return `<td style="${cellBase}${lastBdr}" onclick="App.logic.reqNewForDate('${date}','VAC')" style="cursor:pointer;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=''"></td>`;
                    const isApproved = req.status==='approved', isArchived = req.archived;
                    const bg  = isApproved ? '#dcfce7' : '#fef9c3';
                    const bdr = isApproved ? '#86efac' : '#fde047';
                    const name = empFirst(req.empId), full = empFull(req.empId);
                    const chk  = req.factorialDone ? 'checked' : '';
                    const opacity = isArchived ? 'opacity:0.45;' : '';
                    if (req.status==='rejected') return `<td style="${cellBase}${lastBdr}">
                        <div style="display:flex;align-items:center;gap:3px;background:#fff5f5;border:1px solid #fca5a5;border-radius:4px;padding:2px 4px;min-height:20px;cursor:pointer;"
                             onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55px;" title="${full}">${name}</span>
                            <span style="font-size:0.58rem;color:#ef4444;font-weight:700;flex-shrink:0;">DENEGADA</span>
                        </div></td>`;
                    return `<td style="${cellBase}${lastBdr}">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:3px;background:${bg};border:1px solid ${bdr};border-radius:4px;padding:2px 4px;min-height:20px;${opacity}cursor:pointer;"
                             onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:78px;" title="${full}">${name}${isArchived?' 📦':''}</span>
                            <input type="checkbox" ${chk} title="Pedido en Factorial"
                                onclick="event.stopPropagation(); App.logic.reqToggleFactorial('${req.id}')"
                                style="cursor:pointer;accent-color:#16a34a;flex-shrink:0;width:12px;height:12px;">
                        </div></td>`;
                };

                const otherCell = (req) => {
                    if (!req) return `<td style="${cellBase}"></td>`;
                    const name = empFirst(req.empId), full = empFull(req.empId);
                    const opacity = req.archived ? 'opacity:0.45;' : '';
                    const TYPE_BG = { LIB:'#dbeafe', HRL:'#cffafe', AP:'#ede9fe', BAJ:'#fee2e2' };
                    const TYPE_BD = { LIB:'#93c5fd', HRL:'#67e8f9', AP:'#c4b5fd', BAJ:'#fca5a5' };
                    const bg  = TYPE_BG[req.type] || '#f1f5f9';
                    const bdr = TYPE_BD[req.type] || '#e2e8f0';
                    const extra = req.type==='HRL' ? `<span style="font-size:0.58rem;color:#0891b2;flex-shrink:0;">${req.hrlFrom}–${req.hrlTo}</span>` : `<span style="font-size:0.62rem;color:#64748b;flex-shrink:0;">${req.type}</span>`;
                    return `<td style="${cellBase}">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:3px;background:${bg};border:1px solid ${bdr};border-radius:4px;padding:2px 4px;min-height:20px;${opacity}cursor:pointer;"
                             onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70px;" title="${full}">${name}</span>
                            ${extra}
                        </div></td>`;
                };

                html += `<tr ${rowId} style="background:${rowBg};${weekSep}${todayHL}">
                    <td style="padding:2px 3px;text-align:center;color:#94a3b8;font-size:0.62rem;font-weight:700;border-right:1px solid #e2e8f0;${bdBot}${weekSep}">${isMon?wkDisplay:''}</td>
                    <td style="padding:2px 6px;font-size:0.71rem;color:${dayColor};${bdBot}${weekSep}">${dateDisplay}</td>
                    <td style="padding:2px 4px;text-align:center;color:${dayColor};font-size:0.67rem;font-weight:${dayW};border-right:2px solid #cbd5e1;${bdBot}${weekSep}">${DAY_ES[dow]}</td>
                    ${vacCell(vacReqs[0]||null)}
                    ${vacCell(vacReqs[1]||null)}
                    ${vacCell(vacReqs[2]||null, true)}
                    ${otherCell(otherReqs[0]||null)}
                    ${otherCell(otherReqs[1]||null)}
                    ${otherCell(otherReqs[2]||null)}
                </tr>`;
            });

            html += `</tbody></table></div></div>`;
            mod.innerHTML = html;

            // Scroll al día actual
            const todayRow = document.getElementById('req-today');
            if (todayRow) {
                setTimeout(() => todayRow.scrollIntoView({ block: 'center', behavior: 'instant' }), 50);
            }
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
                        <option value="VAC" ${r.type==='VAC'?'selected':''}>🏖️ Vacaciones (VAC)</option>
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
                                    ▶ Generar
                                </button>
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
                    ▶ Generar peticiones ahora
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

        showRecurringConflictModal: function(conflictDates, empName, onSkip, onOverwrite) {
            const existing = document.getElementById('rr-conflict-overlay');
            if (existing) existing.remove();

            const overlay = document.createElement('div');
            overlay.id = 'rr-conflict-overlay';
            overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:9999;display:flex;align-items:center;justify-content:center;';

            const shown = conflictDates.slice(0, 6).join(', ') + (conflictDates.length > 6 ? ` ... (+${conflictDates.length - 6} más)` : '');

            overlay.innerHTML = `
                <div style="background:white;border-radius:10px;padding:28px 30px;max-width:460px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,0.25);">
                    <h3 style="margin:0 0 10px 0;font-size:1.1rem;">⚠️ Conflictos detectados</h3>
                    <p style="color:#64748b;margin-bottom:14px;font-size:0.9rem;">
                        Hay <strong>${conflictDates.length} petición${conflictDates.length>1?'es':''} existente${conflictDates.length>1?'s':''}</strong>
                        para <strong>${empName}</strong> en las fechas seleccionadas:
                    </p>
                    <div style="background:#fef3c7;border:1px solid #fde047;border-radius:6px;padding:10px 14px;
                                font-size:0.82rem;margin-bottom:20px;color:#92400e;line-height:1.6;">
                        ${shown}
                    </div>
                    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
                        <button onclick="document.getElementById('rr-conflict-overlay').remove()"
                            style="padding:9px 16px;border:1px solid #e2e8f0;border-radius:6px;background:white;cursor:pointer;font-size:0.88rem;">
                            Cancelar
                        </button>
                        <button id="rco-skip"
                            style="padding:9px 16px;border:2px solid #3b82f6;border-radius:6px;background:white;
                                   color:#2563eb;cursor:pointer;font-size:0.88rem;font-weight:600;">
                            Saltar existentes
                        </button>
                        <button id="rco-overwrite"
                            style="padding:9px 16px;border-radius:6px;background:#ef4444;color:white;
                                   border:none;cursor:pointer;font-size:0.88rem;font-weight:600;">
                            Sobreescribir todas
                        </button>
                    </div>
                </div>`;

            document.body.appendChild(overlay);
            document.getElementById('rco-skip').onclick = () => { overlay.remove(); onSkip(); };
            document.getElementById('rco-overwrite').onclick = () => { overlay.remove(); onOverwrite(); };
        }
});
