// ============================================================
// UI: Tienda y Gestión diaria (eventos, llaves)
// ============================================================

Object.assign(App.ui, {
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
                // Mostrar de más nuevo a más viejo, preservando el índice original para los handlers
                const holsOrdenados = App.data.storeConfig.holidays
                    .map((hol, i) => ({ hol, i }))
                    .sort((a, b) => (b.hol.date || '').localeCompare(a.hol.date || ''));
                holsOrdenados.forEach(({ hol, i }) => {
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

        renderRequests: function(c) {
            if (!c) return;
            // Las solicitudes se retiraron (v1.12): el blindado de turnos las sustituye
            let section = App.uiState.reqSection || 'eventos';
            if (section !== 'llaves' || !App.data.config.llavesActivo) section = 'eventos';
            App.uiState.reqSection = section;

            const ico = (path, size=16) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const ICO = {
                event:  ico('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>'),
                key:    ico('<circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/>'),
            };

            const mainBtn = (key, icoHtml, label) => {
                const active = section === key;
                return `<button onclick="App.uiState.reqSection='${key}'; App.ui.renderRequests(document.querySelector('.main-scroll'))"
                    style="display:flex;align-items:center;gap:6px;padding:6px 14px;border-radius:7px;border:1.5px solid ${active?'#2563eb':'#e2e8f0'};
                           font-size:0.8rem;font-weight:600;cursor:pointer;
                           background:${active?'#eff6ff':'white'};color:${active?'#2563eb':'#64748b'};
                           transition:all 0.15s;">
                    ${icoHtml} ${label}
                </button>`;
            };
            const llavesBtn = App.data.config.llavesActivo ? mainBtn('llaves', ICO.key, 'Llaves') : '';

            const sectionBar = `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:0;">
                <h2 style="margin:0;font-size:1.15rem;font-weight:700;color:#1e293b;flex-shrink:0;">Gestión diaria</h2>
                <div style="display:flex;gap:6px;">
                    ${mainBtn('eventos', ICO.event, 'Eventos')}
                    ${llavesBtn}
                </div>
            </div>
            <div style="height:1px;background:#e2e8f0;margin:10px 0 12px;"></div>`;

            if (section === 'llaves') {
                this._renderLlaves(c, sectionBar);
                this.renderDayInspector(App.llaves._ui.inspectorDate || new Date().toISOString().slice(0,10));
                return;
            }

            this._renderEventos(c, sectionBar);
            this.renderEventoInspector(null);
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
                .filter(e => e.active !== false && Utils.empleadoVigenteEnFecha(e, hoy) && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, hoy)))
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
                .filter(e => e.active !== false && Utils.empleadoVigenteEnFecha(e, hoy) && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, hoy)))
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

        // Revalida la cadena desde HOY sin borrar nada: coloca un punto de inicio
        // (ancla 'reset') con el portador actual de cada llave. Corta la cascada de
        // "flujo roto" que arrastra el pasado archivado, conservando los traspasos
        // futuros ya planificados, que se reevalúan contra el portador presente.
        _llavesRevalidar: function() {
            const llaves = App.data.config.llaves || [];
            if (llaves.length === 0) { alert('No hay llaves configuradas.'); return; }

            const hoy = new Date().toISOString().slice(0, 10);
            if (!confirm('🔄 Revalidar desde hoy\n\nSe colocará un punto de inicio en la fecha de hoy con el portador actual de cada llave, para que la cadena se evalúe a partir del presente.\n\nNo se borra ningún traspaso: los futuros se conservan y se reevalúan.\n\n¿Continuar?')) return;

            // Portador actual de cada llave (el mismo que muestra "Estado actual")
            const titulares = {};
            llaves.forEach(l => {
                titulares[l.id] = App.logic.getTitularLlave(l.id, hoy) || '__TIENDA__';
            });

            // Quitar anclas de reinicio previas en la fecha de hoy (idempotente: evita duplicados)
            App.data.traspasoLlaves = (App.data.traspasoLlaves || []).filter(t =>
                !(t.source === 'reset' && t.fecha === hoy)
            );

            // Crear nueva ancla de inicio por llave con el portador actual
            const now = new Date().toISOString();
            llaves.forEach(l => {
                App.data.traspasoLlaves.push({
                    id: 'tr_reset_' + Date.now() + '_' + l.id,
                    llaveId: l.id,
                    dadorId: '__TIENDA__',
                    receptorId: titulares[l.id],
                    fecha: hoy,
                    source: 'reset',
                    creadoEn: now
                });
            });

            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();

            const resumen = llaves.map((l, i) => {
                const tid = titulares[l.id];
                const emp = tid !== '__TIENDA__' ? App.data.empleados.find(e => e.id === tid) : null;
                const nombre = emp ? emp.nombre : '🏪 Tienda';
                return `• L${i + 1}${l.alias ? ' ' + l.alias : ''} → ${nombre}`;
            }).join('\n');
            alert(`✅ Cadena revalidada desde ${Utils.formatDateES(hoy)}\n\nPortadores de partida:\n${resumen}\n\nLos traspasos futuros se conservan y se evalúan desde aquí.`);

            App.logic._refreshLlaves();
        },

        // Abre el modal de reasignación manual: fija, para cada llave, un portador inicial
        // elegido libremente entre TODA la plantilla activa (no solo TAG3), y borra los
        // traspasos futuros para arrancar la cadena de cero desde hoy. El histórico pasado
        // no se toca.
        _llavesReasignarAbrir: function() {
            const llaves = App.data.config.llaves || [];
            if (llaves.length === 0) { alert('No hay llaves configuradas.'); return; }

            const hoy = new Date().toISOString().slice(0, 10);
            const plantilla = App.data.empleados
                .filter(e => Utils.empleadoVigenteEnFecha(e, hoy))
                .sort((a, b) => a.customOrder - b.customOrder);

            const rows = llaves.map((l, idx) => {
                const actual = App.logic.getTitularLlave(l.id, hoy) || '__TIENDA__';
                const opts = `<option value="__TIENDA__"${actual === '__TIENDA__' ? ' selected' : ''}>🏪 Tienda</option>` +
                    plantilla.map(e => `<option value="${e.id}"${e.id === actual ? ' selected' : ''}>${e.nombre}</option>`).join('');
                return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                    <span style="flex:0 0 120px;font-size:0.82rem;font-weight:600;color:#334155;">Llave ${idx + 1}${l.alias ? ' · ' + l.alias : ''}</span>
                    <select id="reasignar-llave-${l.id}" style="flex:1;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.82rem;">${opts}</select>
                </div>`;
            }).join('');

            const content = document.getElementById('llaves-reasignar-content');
            content.innerHTML = `
                <p style="color:#475569;font-size:0.82rem;margin:0 0 14px;">
                    Se borrarán todos los traspasos desde hoy en adelante y el reparto que elijas aquí
                    pasará a ser el nuevo punto de partida. El histórico pasado no se toca.
                </p>
                ${rows}
                <div style="display:flex; gap:10px; margin-top:16px;">
                    <button class="btn" style="flex:1; background:#f1f5f9; color:#334155;" onclick="document.getElementById('llaves-reasignar-modal').classList.remove('open')">Cancelar</button>
                    <button class="btn btn-danger" style="flex:2;" onclick="App.ui._llavesReasignarConfirmar()">Reasignar y aplicar</button>
                </div>`;

            document.getElementById('llaves-reasignar-modal').classList.add('open');
        },

        _llavesReasignarConfirmar: function() {
            const llaves = App.data.config.llaves || [];
            const hoy = new Date().toISOString().slice(0, 10);

            const elegido = {};
            for (const l of llaves) {
                const sel = document.getElementById('reasignar-llave-' + l.id);
                elegido[l.id] = sel ? sel.value : '__TIENDA__';
            }

            // No permitir que una misma persona quede como titular inicial de dos llaves
            const usados = new Set();
            for (const l of llaves) {
                const r = elegido[l.id];
                if (r === '__TIENDA__') continue;
                if (usados.has(r)) {
                    const nombre = App.data.empleados.find(e => e.id === r)?.nombre || r;
                    alert(`⚠️ ${nombre} está asignado a más de una llave. Cada llave necesita un titular distinto.`);
                    return;
                }
                usados.add(r);
            }

            const aEliminar = (App.data.traspasoLlaves || []).filter(t => t.fecha >= hoy).length;

            // Borrar traspasos desde hoy en adelante (el histórico pasado se conserva)
            App.data.traspasoLlaves = (App.data.traspasoLlaves || []).filter(t => t.fecha < hoy);

            // Crear la nueva ancla de partida por llave con el portador elegido
            const now = new Date().toISOString();
            llaves.forEach(l => {
                App.data.traspasoLlaves.push({
                    id: 'tr_reset_' + Date.now() + '_' + l.id,
                    llaveId: l.id,
                    dadorId: '__TIENDA__',
                    receptorId: elegido[l.id],
                    fecha: hoy,
                    source: 'reset',
                    creadoEn: now
                });
            });

            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            document.getElementById('llaves-reasignar-modal').classList.remove('open');

            const resumen = llaves.map((l, i) => {
                const tid = elegido[l.id];
                const emp = tid !== '__TIENDA__' ? App.data.empleados.find(e => e.id === tid) : null;
                const nombre = emp ? emp.nombre : '🏪 Tienda';
                return `• L${i + 1}${l.alias ? ' ' + l.alias : ''} → ${nombre}`;
            }).join('\n');
            alert(`✅ Llaves reasignadas desde ${Utils.formatDateES(hoy)}\n\n${aEliminar} traspaso${aEliminar !== 1 ? 's' : ''} futuro${aEliminar !== 1 ? 's' : ''} eliminado${aEliminar !== 1 ? 's' : ''}\n\nNuevos portadores:\n${resumen}`);

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
                            <button onclick="App.ui._llavesRevalidar()" title="Coloca un punto de inicio hoy con el portador actual y evalúa la cadena desde el presente, sin borrar traspasos"
                                style="padding:7px 14px;background:white;color:#2563eb;border:1px solid #bfdbfe;border-radius:6px;font-weight:600;font-size:0.78rem;cursor:pointer;">🔄 Revalidar desde hoy</button>
                            <button onclick="App.ui._llavesReiniciar()" title="Reinicia la cadena desde una fecha y archiva (borra) todo lo posterior"
                                style="padding:7px 14px;background:white;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-weight:600;font-size:0.78rem;cursor:pointer;">🧹 Reiniciar cadena</button>
                            <button onclick="App.ui._llavesReasignarAbrir()" title="Elige libremente el portador inicial de cada llave (cualquier miembro de la plantilla) y borra los traspasos futuros"
                                style="padding:7px 14px;background:white;color:#b45309;border:1px solid #fde68a;border-radius:6px;font-weight:600;font-size:0.78rem;cursor:pointer;">🎯 Reasignar desde el principio</button>
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
                .filter(e => e.active !== false && Utils.empleadoVigenteEnFecha(e, fecha) && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fecha)))
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
            // Externo: tiene horario pero NO cubre apertura/cierre (se trata como ausencia).
            // openerHrs/closerHrs = coincide por horario (para pintar A/C en rosa si es externo).
            const getDayInfo = (empId, date) => {
                const horD = App.logic._getHorarioDelDia(date);
                const storeOpenD = !!(horD && !horD.closed);
                const sv = (App.data.schedule[date] || {})[empId];
                const sh = sv ? Utils.getShift(sv) : null;
                const isFixed = !!(sh && sh.fixed);
                const isExternal = !!(sh && !sh.fixed && sh.external);
                const code = sh ? (sh.code || (typeof sv === 'string' ? '' : (sv.start + '–' + sv.end))) : '';
                const color = sh ? (sh.color || '#94a3b8') : '#94a3b8';
                const openerHrs = storeOpenD && !!(sh && !sh.fixed && sh.start && sh.start <= horD.open);
                const closerHrs = storeOpenD && !!(sh && !sh.fixed && sh.end && sh.end >= horD.close);
                return {
                    sv, isFixed, isExternal, code, color,
                    isLibre: !sv || isFixed,             // libranza real (sin turno o turno fijo)
                    openerHrs, closerHrs,                // coincide por horario (ignora externo)
                    opens:  openerHrs && !isExternal,    // cobertura válida de apertura
                    closes: closerHrs && !isExternal     // cobertura válida de cierre
                };
            };

            // Sección llaves (titular por llave)
            const keysHtml = llaves.map((l, idx) => {
                const tid = App.logic.getTitularLlave(l.id, fecha);
                const emp = tid && tid !== '__TIENDA__' ? App.data.empleados.find(e => e.id === tid) : null;
                const titLabel = tid === '__TIENDA__' ? '🏪 Tienda' : (emp ? emp.nombre : '—');
                // Detectar si el titular está ausente hoy (libra, vacaciones, baja... o turno externo)
                const _giTit = emp ? getDayInfo(emp.id, fecha) : null;
                const isAbsent = emp ? (_giTit.isLibre || _giTit.isExternal) : (tid === '__TIENDA__');
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
            const PINK = '#ec4899';
            const rowsHtml = tag3.map(emp => {
                // Datos de hoy (vía getDayInfo, coherente con los días futuros)
                const info = getDayInfo(emp.id, fecha);
                const isExt = info.isExternal;

                // Col 2: llave (réplica planner grid)
                const keyContent = getKeyContent(emp.id, fecha);
                const keyTitle = !keyContent ? '' :
                    keyContent.includes('__TIENDA__') ? '' :
                    (keyContent.includes('stroke="#ef4444"') && keyContent.includes('store')) ? 'Deja llave en tienda' :
                    (keyContent.includes('stroke="#22c55e"') && keyContent.includes('store')) ? 'Recoge llave de tienda' :
                    keyContent.includes('stroke="#ef4444"') ? 'Entrega llave' :
                    keyContent.includes('stroke="#22c55e"') ? 'Recibe llave' : 'Tiene llave';

                // Col 3: LIBRE — libranza real (fijo/sin turno) o EXTERNO ("E" en rosa, tratado como ausencia)
                let libreCell = '', libreTitle = '';
                if (info.isLibre) {
                    const lbl = info.code || 'L';
                    libreTitle = info.code ? `Libranza (${info.code})` : 'Sin turno asignado';
                    libreCell = `<span style="display:inline-block;padding:2px 6px;background:${info.color}22;color:${info.color};border-radius:4px;font-size:0.72rem;font-weight:700;">${lbl}</span>`;
                } else if (isExt) {
                    libreTitle = 'Turno externo — no cubre apertura/cierre';
                    libreCell = `<span style="display:inline-block;padding:2px 6px;background:${PINK}22;color:${PINK};border-radius:4px;font-size:0.72rem;font-weight:700;" title="${libreTitle}">E</span>`;
                }

                // Col 4: ABRE (externo no cuenta → no muestra A)
                const abreCell = info.opens
                    ? `<span style="display:inline-block;padding:2px 6px;background:#dbeafe;color:#1d4ed8;border-radius:4px;font-size:0.72rem;font-weight:700;">A</span>`
                    : '';

                // Col 5: CIERRA (externo no cuenta → no muestra C)
                const cierraCell = info.closes
                    ? `<span style="display:inline-block;padding:2px 6px;background:#fef9c3;color:#854d0e;border-radius:4px;font-size:0.72rem;font-weight:700;">C</span>`
                    : '';

                // Cols futuros
                const futureCells = futureDates.map(fd => {
                    const info = getDayInfo(emp.id, fd);
                    let content = '', tooltip = '';
                    if (info.isLibre) {
                        const fLabel = info.code || 'L';
                        tooltip = info.code ? `Libranza (${info.code})` : 'Sin turno';
                        content = `<span style="color:#16a34a;font-size:0.72rem;font-weight:600;">${fLabel}</span>`;
                    } else if (info.isExternal) {
                        // Externo: "E" en rosa (no cubre apertura/cierre)
                        tooltip = 'Turno externo — no cubre apertura/cierre';
                        content = `<span style="color:${PINK};font-size:0.72rem;font-weight:700;">E</span>`;
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
                    <td style="${tdS}" title="${info.opens ? 'Abre tienda' : ''}">${abreCell}</td>
                    <td style="${tdS}" title="${info.closes ? 'Cierra tienda' : ''}">${cierraCell}</td>
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
                    return sh && !sh.fixed && sh.start <= horario.open;
                });

                // Llaves que cubren cierre (titular al final del día trabaja y cierra)
                const keysCierre = llaves.filter(l => {
                    const tid = App.logic.getTitularLlave(l.id, fecha);
                    if (!tid || tid === '__TIENDA__') return false;
                    const sv = daySched[tid];
                    if (!sv) return false;
                    const sh = Utils.getShift(sv);
                    return sh && !sh.fixed && sh.end >= horario.close;
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
                .filter(e => e.active !== false && Utils.empleadoVigenteEnFecha(e, fecha) && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fecha)))
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
                .filter(e => e.active !== false && Utils.empleadoVigenteEnFecha(e, fechaRef) && ['MNG','AM','SPV'].includes(Utils.getRolEnFecha(e, fechaRef)))
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
