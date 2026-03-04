// ============================================================
// UI: Turnos: paleta, inspector, galería custom
// ============================================================

Object.assign(App.ui, {
        renderShifts: function(c) {
            const isAdHoc = App.uiState.shiftsViewMode === 'adhoc';
            const adHocCount = App.logic.getCustomStats().length;

            let html = `<div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; margin-bottom:15px; gap:10px;">
                <h2 style="margin:0; font-size:1.1rem; font-weight:700;">Catálogo de Turnos</h2>
                <div style="display:flex; background:#e2e8f0; border-radius:20px; padding:3px; gap:0;">
                    <button onclick="App.uiState.shiftsViewMode='catalog'; App.ui.renderShifts(document.querySelector('.main-scroll'));"
                        style="display:flex; align-items:center; gap:5px; padding:5px 14px; border:none; border-radius:16px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s;
                               background:${!isAdHoc ? '#2563eb' : 'transparent'};
                               color:${!isAdHoc ? 'white' : '#64748b'};">🎨 Catálogo</button>
                    <button onclick="App.uiState.shiftsViewMode='adhoc'; App.uiState.customGalleryPage=0; App.ui.renderShifts(document.querySelector('.main-scroll'));"
                        style="display:flex; align-items:center; gap:5px; padding:5px 14px; border:none; border-radius:16px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s;
                               background:${isAdHoc ? '#2563eb' : 'transparent'};
                               color:${isAdHoc ? 'white' : '#64748b'};">📊 Ad Hoc${adHocCount > 0 ? ' (' + adHocCount + ')' : ''}</button>
                </div>
                <div style="display:flex; gap:10px; justify-content:flex-end;">
                    ${!isAdHoc ? '<button class="btn btn-primary" onclick="App.logic.shiftSelect(null)">+ Nuevo Turno</button>' : ''}
                </div>
            </div>`;

            if (isAdHoc) {
                html += App.ui._renderAdHocContent();
            } else {
                html += App.ui._renderCatalogContent();
            }
            c.innerHTML = html;
        },

        _renderCatalogContent: function() {
            let html = '';
            if(App.data.shiftDefs.length === 0) { 
                html += `<div style="text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:8px; color:#94a3b8">No hay turnos.</div>`; 
                return html;
            }
                const getSortHeader = (key, label, clazz, width) => {
                    let arrow = ''; if(App.uiState.shiftSortKey === key) arrow = App.uiState.shiftSortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
                    const widthStyle = width ? `width:${width};` : '';
                    return `<th class="${clazz} ${arrow}" onclick="App.logic.sortShifts('${key}')" style="padding:8px 6px; ${widthStyle}">${label}</th>`;
                };
                html += `<table class="data-table" style="font-size:0.8rem; width:100%;"><thead><tr>
                    <th class="col-drag" onclick="App.logic.sortShifts('custom')" style="padding:8px 6px; width:35px;">☰</th>
                    ${getSortHeader('code', 'Código', 'col-code', '90px')}
                    <th class="col-desc" onclick="App.logic.sortShifts('desc')" style="padding:8px 6px; min-width:150px; width:20%;">Descripción</th>
                    <th class="col-graphic" style="padding:8px 6px; min-width:300px;">Gráfica (9:30-22:00)</th>
                    ${getSortHeader('start', 'Ent', 'col-time', '50px')}
                    ${getSortHeader('end', 'Sal', 'col-time', '50px')}
                    ${getSortHeader('breakStart', 'In.D', 'col-time', '50px')}
                    ${getSortHeader('breakEnd', 'Fi.D', 'col-time', '50px')}
                    ${getSortHeader('hours', 'H', 'col-hours', '60px')}
                </tr></thead><tbody>`;
                
                let sortedList = [...App.data.shiftDefs];
                sortedList.sort((a,b) => {
                    const sk = App.uiState.shiftSortKey; const sd = App.uiState.shiftSortDir === 'asc' ? 1 : -1;
                    if(sk === 'custom') return (a.customOrder - b.customOrder) * sd;
                    if(sk === 'hours') {
                        const ha = Utils.calcHours(a.start, a.end, a.breakStart, a.breakEnd); const hb = Utils.calcHours(b.start, b.end, b.breakStart, b.breakEnd);
                        return (ha - hb) * sd;
                    }
                    return (a[sk] || '').localeCompare(b[sk] || '') * sd;
                });

                sortedList.forEach((s, idx) => {
                    const hours = Utils.calcHours(s.start, s.end, s.breakStart, s.breakEnd, s.break);
                    const isSel = App.uiState.selectedId === s.id ? 'selected' : '';
                    const dragAttrs = (App.uiState.shiftSortKey === 'custom') ? `draggable="true" ondragstart="App.logic.dragStart(event, ${idx}, 'shift')" ondragover="App.logic.dragOver(event)" ondrop="App.logic.drop(event, ${idx}, 'shift')"` : '';
                    
                    // Gradiente azul para horas
                    let hoursStyle = '';
                    if(hours > 0) {
                        let bgColor = '#fff';
                        let textColor = '#1e293b';
                        if(hours >= 8) { bgColor = '#1e40af'; textColor = '#fff'; } // 8h = azul fuerte
                        else if(hours >= 7) { bgColor = '#3b82f6'; textColor = '#fff'; } // 7h = azul medio-fuerte
                        else if(hours >= 6) { bgColor = '#60a5fa'; textColor = '#fff'; } // 6h = azul medio
                        else if(hours >= 5) { bgColor = '#93c5fd'; textColor = '#1e3a8a'; } // 5h = azul claro
                        else if(hours >= 4) { bgColor = '#dbeafe'; textColor = '#1e40af'; } // 4h = azul muy claro
                        hoursStyle = `background:${bgColor}; color:${textColor}; font-weight:700;`;
                    }
                    
                    html += `<tr class="${isSel}" onclick="App.logic.shiftSelect('${s.id}')" ${dragAttrs} style="height:22px;"><td class="drag-handle" style="padding:3px 6px; font-size:0.85rem;">☰</td><td class="col-code" style="padding:3px 6px;"><span class="shift-pill" style="background:${s.color}; font-size:0.75rem; padding:3px 6px;">${s.code}</span></td><td style="font-weight:500; overflow:hidden; text-overflow:ellipsis; padding:3px 8px; font-size:0.75rem;" title="${s.desc}">${s.desc}</td><td style="vertical-align:middle; padding:3px 30px;">${Utils.renderMiniTimeline(s)}</td><td class="col-time" style="padding:3px 6px; font-size:0.75rem;">${s.start||'-'}</td><td class="col-time" style="padding:3px 6px; font-size:0.75rem;">${s.end||'-'}</td><td class="col-time" style="padding:3px 6px; font-size:0.75rem;">${s.breakStart||'-'}</td><td class="col-time" style="padding:3px 6px; font-size:0.75rem;">${s.breakEnd||'-'}</td><td class="col-hours" style="padding:3px 6px; ${hoursStyle}">${hours>0?hours.toFixed(1).replace('.0',''):''}</td></tr>`;
                });
                html += `</tbody></table>`;
            return html;
        },

        _renderAdHocContent: function() {
            const stats = App.logic.getCustomStats();
            
            if(stats.length === 0) {
                return `
                    <div style="text-align:center; padding:60px 20px; background:#f8fafc; border:2px dashed #e2e8f0; border-radius:8px;">
                        <div style="font-size:3rem; margin-bottom:15px;">✨</div>
                        <h3 style="color:var(--text-muted); margin:0 0 10px 0;">No hay turnos ad hoc</h3>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin:0;">
                            Todos los turnos en uso pertenecen al catálogo.
                        </p>
                    </div>`;
            }

            const perPage = App.uiState.customGalleryPerPage;
            const currentPage = App.uiState.customGalleryPage;
            const totalPages = Math.ceil(stats.length / perPage);
            const startIdx = currentPage * perPage;
            const endIdx = Math.min(startIdx + perPage, stats.length);
            const pageStats = stats.slice(startIdx, endIdx);

            let html = `
                <div style="margin-bottom:15px; padding:12px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                    <div style="font-size:0.85rem; color:#0369a1;">
                        <strong>ℹ️</strong> Turnos pintados a mano que no coinciden con ninguna definición del catálogo.
                    </div>
                    <div style="font-size:0.8rem; color:#475569; font-weight:600;">
                        ${startIdx + 1}–${endIdx} de ${stats.length}
                    </div>
                </div>`;

            if(totalPages > 1) {
                html += App.ui._renderAdHocPagination(currentPage, totalPages);
            }

            html += `
                <table class="data-table" style="font-size:0.85rem;">
                    <thead>
                        <tr>
                            <th style="text-align:center; width:80px;">Entrada</th>
                            <th style="text-align:center; width:80px;">Salida</th>
                            <th style="text-align:center; width:120px;">Descanso</th>
                            <th style="text-align:center; width:70px;">Horas</th>
                            <th style="min-width:250px;">Vista Previa</th>
                            <th style="text-align:center; width:70px;">Usos</th>
                            <th style="text-align:center; width:100px;">Acción</th>
                        </tr>
                    </thead>
                    <tbody>`;

            pageStats.forEach((custom, idx) => {
                const realIdx = startIdx + idx;
                const hours = Utils.calcHours(custom.start, custom.end, custom.breakStart, custom.breakEnd);
                const breakDisplay = (custom.breakStart && custom.breakEnd) 
                    ? `${custom.breakStart.substring(0,5)} - ${custom.breakEnd.substring(0,5)}`
                    : '—';
                const mockShift = { start: custom.start, end: custom.end, breakStart: custom.breakStart, breakEnd: custom.breakEnd, color: '#6b7280' };
                const preview = Utils.renderPlannerTimeline(mockShift, {open:'09:30', close:'22:00', closed:false}, null, null);

                html += `
                    <tr>
                        <td style="text-align:center; font-family:monospace; font-weight:600;">${custom.start.substring(0,5)}</td>
                        <td style="text-align:center; font-family:monospace; font-weight:600;">${custom.end.substring(0,5)}</td>
                        <td style="text-align:center; font-family:monospace; font-size:0.8rem; color:var(--text-muted);">${breakDisplay}</td>
                        <td style="text-align:center; font-weight:700; color:var(--primary);">${hours}h</td>
                        <td style="padding:4px 8px;">${preview}</td>
                        <td style="text-align:center;">
                            <span style="display:inline-block; background:#eff6ff; color:#1e40af; padding:4px 10px; border-radius:4px; font-weight:700; font-size:0.9rem;">
                                ${custom.count}
                            </span>
                        </td>
                        <td style="text-align:center;">
                            <button class="btn btn-primary" style="padding:6px 12px; font-size:0.75rem; width:auto; margin:0;" 
                                    onclick="App.logic.promoteCustomToPalette(${realIdx})" 
                                    title="Convertir a turno de catálogo">
                                🎨 Paleta
                            </button>
                        </td>
                    </tr>`;
            });

            html += `</tbody></table>`;

            if(totalPages > 1) {
                html += App.ui._renderAdHocPagination(currentPage, totalPages);
            }

            html += `
                <div style="margin-top:20px; padding:15px; background:#fef3c7; border:1px solid #fde047; border-radius:6px;">
                    <div style="font-size:0.8rem; color:#92400e;">
                        <strong>💡 Consejo:</strong> Si un turno ad hoc se repite mucho, considera agregarlo al catálogo para facilitar su gestión.
                    </div>
                </div>`;

            return html;
        },

        _renderAdHocPagination: function(currentPage, totalPages) {
            let html = `<div style="display:flex; justify-content:center; gap:8px; margin-bottom:15px; align-items:center;">`;
            html += `<button onclick="App.ui.changeCustomPage(-1)" ${currentPage === 0 ? 'disabled' : ''} 
                        style="padding:6px 12px; border:1px solid #e2e8f0; background:white; border-radius:4px; cursor:${currentPage === 0 ? 'not-allowed' : 'pointer'}; opacity:${currentPage === 0 ? '0.5' : '1'};">◀</button>`;
            for(let i = 0; i < totalPages; i++) {
                const isActive = i === currentPage;
                html += `<button onclick="App.ui.setCustomPage(${i})" 
                            style="padding:6px 12px; border:1px solid ${isActive ? 'var(--primary)' : '#e2e8f0'}; background:${isActive ? 'var(--primary)' : 'white'}; color:${isActive ? 'white' : 'var(--text-main)'}; border-radius:4px; cursor:pointer; font-weight:${isActive ? '700' : '500'}; min-width:36px;">
                            ${i + 1}</button>`;
            }
            html += `<button onclick="App.ui.changeCustomPage(1)" ${currentPage === totalPages - 1 ? 'disabled' : ''} 
                        style="padding:6px 12px; border:1px solid #e2e8f0; background:white; border-radius:4px; cursor:${currentPage === totalPages - 1 ? 'not-allowed' : 'pointer'}; opacity:${currentPage === totalPages - 1 ? '0.5' : '1'};">▶</button>`;
            html += `</div>`;
            return html;
        },

        renderShiftInspector: function(id) {
            const s = id ? App.data.shiftDefs.find(x => x.id === id) : { code: "", desc: "", start: "10:00", end: "14:00", breakStart: "", breakEnd: "", color: "#e2e8f0", external: false };
            document.getElementById('inspector-content').innerHTML = `
                <h3>${id?'✏️ Editar Turno':'➕ Nuevo Turno'}</h3>
                <div style="display:flex;gap:10px; margin-bottom:18px;">
                    <div class="form-group" style="flex:1; margin:0;">
                        <label>Código del Turno</label>
                        <input id="sf-code" type="text" value="${s.code}" maxlength="10" placeholder="Ej: M8">
                    </div>
                    <div class="form-group" style="width:70px; margin:0;">
                        <label>Color</label>
                        <input id="sf-color" type="color" value="${s.color}" style="width:100%; height:42px; padding:4px;">
                    </div>
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <input id="sf-desc" type="text" value="${s.desc}" placeholder="Ej: Mañana 8h">
                </div>
                <div style="display:flex;gap:10px;">
                    <div class="form-group" style="flex:1; margin:0;">
                        <label>Hora Entrada</label>
                        <select id="sf-start">${Utils.getTimeOptions(s.start)}</select>
                    </div>
                    <div class="form-group" style="flex:1; margin:0;">
                        <label>Hora Salida</label>
                        <select id="sf-end">${Utils.getTimeOptions(s.end)}</select>
                    </div>
                </div>
                <div style="display:flex;gap:10px; margin-top:18px;">
                    <div class="form-group" style="flex:1; margin:0;">
                        <label>Inicio Descanso</label>
                        <select id="sf-bstart">${Utils.getTimeOptions(s.breakStart,true)}</select>
                    </div>
                    <div class="form-group" style="flex:1; margin:0;">
                        <label>Fin Descanso</label>
                        <select id="sf-bend">${Utils.getTimeOptions(s.breakEnd,true)}</select>
                    </div>
                </div>
                <div style="margin-top:18px; padding:12px 14px; background:#f8fafc; border:1px solid var(--border); border-radius:8px;">
                    <label style="display:flex; align-items:flex-start; gap:10px; cursor:pointer; margin:0;">
                        <input id="sf-external" type="checkbox" ${s.external ? 'checked' : ''} style="width:16px; height:16px; margin-top:2px; flex-shrink:0; cursor:pointer;">
                        <div>
                            <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">Turno externo ${Utils.infoTip(Utils.Tips.turnoExterno)}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px; line-height:1.4;">Las horas cuentan para el empleado pero <strong>no suman a la cobertura de tienda</strong> (gráficos, HUD, curva horaria). Útil para reuniones de managers, formaciones fuera de tienda, etc.</div>
                        </div>
                    </label>
                </div>
                <div style="display:flex;gap:10px;margin-top:25px;">
                    <button class="btn btn-primary" style="flex:1" onclick="App.logic.shiftSave('${id||''}')">💾 Guardar</button>
                    ${id ? `<button class="btn btn-warning" style="flex:1" onclick="App.logic.shiftDup('${id}')" title="Duplicar">📋 Duplicar</button>` : ''}
                </div>
                ${id?`<button class="btn btn-danger" data-shift-id="${id}" onclick="App.logic.shiftDel(this.getAttribute('data-shift-id'))">🗑️ Eliminar</button>`:''}`;
        },

        // --- CUSTOM GALLERY (now inline via pill switch) ---
        showCustomGallery: function() {
            // Legacy: redirige a la vista inline
            App.uiState.shiftsViewMode = 'adhoc';
            App.uiState.customGalleryPage = 0;
            App.ui.renderShifts(document.querySelector('.main-scroll'));
        },
        
        changeCustomPage: function(delta) {
            const stats = App.logic.getCustomStats();
            const totalPages = Math.ceil(stats.length / App.uiState.customGalleryPerPage);
            App.uiState.customGalleryPage = Math.max(0, Math.min(totalPages - 1, App.uiState.customGalleryPage + delta));
            App.ui.renderShifts(document.querySelector('.main-scroll'));
        },
        
        setCustomPage: function(page) {
            App.uiState.customGalleryPage = page;
            App.ui.renderShifts(document.querySelector('.main-scroll'));
        },

        // --- EMPLEADOS ---
});
