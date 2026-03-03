// ============================================================
// UI: Empleados: lista, inspector, desvío, festivos
// ============================================================

Object.assign(App.ui, {
        // Helper: semanas donde los 7 días están bloqueados y el empleado tiene contrato
        _getLockedWeeks: function(emp) {
            const locked = App.data.lockedDays || {};
            const mondaySet = new Set(Object.keys(locked).map(d => Utils.getMonday(d)));
            return [...mondaySet].sort().filter(monday => {
                const days = Utils.getWeekDays(monday);
                return days.every(d => locked[d]) && (!emp || Utils.empleadoVigenteEnFecha(emp, monday));
            });
        },

        // Helper: desvío acumulado sobre semanas cerradas
        _calcDesvioAcum: function(emp) {
            if(!emp) return 0;
            const weeks = App.ui._getLockedWeeks(emp);
            let acum = emp.saldoInicial || 0;
            weeks.forEach(monday => {
                const wdays = Utils.getWeekDays(monday);
                let worked = 0;
                wdays.forEach(d => {
                    const sid = App.data.schedule[d]?.[emp.id];
                    const sh = sid ? Utils.getShift(sid) : null;
                    if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                });
                const contrato = Utils.getContrato(emp, monday);
                const { esperadas } = Utils.calcEsperadas(contrato, wdays, emp.id);
                acum = Math.round((acum + worked - esperadas) * 10) / 10;
            });
            return acum;
        },

        // Helper: festivos pendientes en semanas cerradas
        _calcFestivosPend: function(emp) {
            if(!emp) return 0;
            const locked = App.data.lockedDays || {};
            const tracking = emp.festivoTracking || {};
            const holidays = (App.data.storeConfig.holidays || [])
                .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(emp, h.date));
            let pendientes = 0;
            holidays.forEach(h => {
                const tr = tracking[h.date] || {};
                if(tr.rDate) return;
                const sid = App.data.schedule[h.date]?.[emp.id];
                const shift = sid ? Utils.getShift(sid) : null;
                if(!shift) return;
                if(shift.fixed && shift.code === 'F') {
                    const wdays = Utils.getWeekDays(Utils.getMonday(h.date));
                    let countL = 0;
                    wdays.forEach(d => { const s2 = App.data.schedule[d]?.[emp.id]; const sh2 = s2 ? Utils.getShift(s2) : null; if(sh2 && sh2.fixed && sh2.code === 'L') countL++; });
                    if(countL < 2) pendientes++;
                } else if(shift.start && shift.end) {
                    pendientes++;
                }
            });
            return pendientes;
        },

        renderEmp: function(c) {
            const isPrefs = App.uiState.empViewMode === 'prefs';
            const _svgTable = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/></svg>`;
            const _svgSliders = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`;
            const _svgEye = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
            const _nInact = App.data.empleados.filter(e=>e.active===false).length;
            let html=`<div style="display:grid; grid-template-columns:1fr auto 1fr; align-items:center; margin-bottom:15px; gap:10px;">
                <h2 style="margin:0; font-size:1.1rem; font-weight:700;">Gestión de Equipo</h2>
                <div style="display:flex; background:#e2e8f0; border-radius:20px; padding:3px; gap:0;">
                    <button onclick="App.uiState.empViewMode='data'; App.ui.renderEmp(document.querySelector('.main-scroll'));"
                        style="display:flex; align-items:center; gap:5px; padding:5px 14px; border:none; border-radius:16px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s;
                               background:${!isPrefs ? '#2563eb' : 'transparent'};
                               color:${!isPrefs ? 'white' : '#64748b'};">${_svgTable} Datos</button>
                    <button onclick="App.uiState.empViewMode='prefs'; App.ui.renderEmp(document.querySelector('.main-scroll'));"
                        style="display:flex; align-items:center; gap:5px; padding:5px 14px; border:none; border-radius:16px; font-size:0.75rem; font-weight:700; cursor:pointer; transition:all 0.15s;
                               background:${isPrefs ? '#2563eb' : 'transparent'};
                               color:${isPrefs ? 'white' : '#64748b'};">${_svgSliders} Preferencias</button>
                </div>
                <div style="display:flex; gap:8px; align-items:center; justify-content:flex-end;">
                    ${_nInact > 0 ? `<button onclick="App.uiState.showInactive=!App.uiState.showInactive; App.ui.renderEmp(document.querySelector('.main-scroll'));" title="${App.uiState.showInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'}" style="display:flex; align-items:center; gap:4px; padding:3px 9px; border:1px solid ${App.uiState.showInactive ? '#2563eb' : '#e2e8f0'}; border-radius:20px; font-size:0.7rem; font-weight:600; cursor:pointer; background:${App.uiState.showInactive ? '#eff6ff' : 'white'}; color:${App.uiState.showInactive ? '#2563eb' : '#94a3b8'};">${_svgEye} ${_nInact}</button>` : ''}
                    <button class="btn btn-primary" style="width:auto;margin:0" onclick="App.logic.empSelect(null)">+ Nuevo</button>
                </div>
            </div>`;
            if(App.data.empleados.length===0) html+=`<div style="text-align:center;padding:40px;color:#94a3b8">Sin empleados.</div>`;
            else {
                const getSortHeader = (key, label, width) => {
                    let arrow = ''; if(App.uiState.sortKey === key) arrow = App.uiState.sortDir === 'asc' ? 'sorted-asc' : 'sorted-desc';
                    return `<th class="${arrow}" style="width:${width}" onclick="App.logic.sortEmp('${key}')">${label}</th>`;
                };
                html+=`<table class="data-table" style="table-layout:fixed; width:100%;"><thead><tr><th style="width:30px" onclick="App.logic.sortEmp('custom')">☰</th>`;
                html+= getSortHeader('nombre', 'Nombre', '80px');
                if(!isPrefs) { html+= getSortHeader('rol', 'Puesto', '80px') + getSortHeader('tag', 'Tag', '80px') + getSortHeader('contrato', 'Horas', '80px') + `<th style="width:80px; text-align:center; white-space:nowrap;" title="Desvío acumulado en semanas cerradas">Desvío 🔒</th><th style="width:80px; text-align:center; white-space:nowrap;" title="Festivos pendientes en semanas cerradas">Festivos 🔒</th>`; } 
                else { html+=`<th>Domingos</th><th>Libranza 1</th><th>Libranza 2</th><th>Turno</th><th>Partidos</th>`; }
                html+=`</tr></thead><tbody>`;
                const showInactive = App.uiState.showInactive || false;
                let list = [...App.data.empleados].filter(e => e.active !== false || showInactive).sort((a,b)=>{ 
                    if(a.active!==b.active) return a.active?-1:1; 
                    const sk=App.uiState.sortKey; const sd=App.uiState.sortDir==='asc'?1:-1;
                    if(sk==='custom') return (a.customOrder-b.customOrder)*sd;
                    if(sk==='contrato') return (a.contrato-b.contrato)*sd;
                    if(sk==='tag') return ((a.tag||1)-(b.tag||1))*sd;
                    if(sk==='rol') { 
                        const w = {"MNG":5,"AM":4,"SPV":3,"STF":2}; 
                        return ((w[b.rol]||0) - (w[a.rol]||0))*sd; 
                    }
                    return (a[sk]||'').localeCompare(b[sk]||'')*sd; 
                });
                list.forEach((e, idx) => {
                    const isSel = App.uiState.selectedId===e.id?'selected':'';
                    const inactiveClass = !e.active ? 'row-inactive' : '';
                    const dragAttrs = (App.uiState.sortKey === 'custom' && e.active) ? `draggable="true" ondragstart="App.logic.dragStart(event, ${idx}, 'emp')" ondragover="App.logic.dragOver(event)" ondrop="App.logic.drop(event, ${idx}, 'emp')"` : '';
                    html+=`<tr class="${isSel} ${inactiveClass}" onclick="App.logic.empSelect('${e.id}')" ${dragAttrs}><td class="drag-handle">${e.active?'☰':''}</td><td style="font-weight:500">${!e.active?'🚫 ':''} ${e.nombre}</td>`;
                    if(!isPrefs) {
                        const tag = e.tag || (['MNG','AM','SPV'].includes(e.rol) ? 3 : 1);
                        const contratoActual = Utils.getContrato(e, new Date().toISOString().slice(0,10));
                        const pct = Math.min(100, (contratoActual / 40) * 100); const color = contratoActual>=40?'#22c55e':'#f97316'; const bg=`conic-gradient(${color} ${pct}%, #f1f5f9 0)`;
                        const tieneHistorial = e.contratos && e.contratos.length > 0;
                        const desvioAcum = App.ui._calcDesvioAcum(e);
                        const dColor = desvioAcum > 0.5 ? '#f59e0b' : desvioAcum < -0.5 ? '#3b82f6' : '#10b981';
                        const dSign = desvioAcum > 0 ? '+' : '';
                        const festivosPend = App.ui._calcFestivosPend(e);
                        const fColor = festivosPend > 0 ? '#ef4444' : '#10b981';
                        html+=`<td style="text-align:center;"><span class="badge badge-role">${e.rol}</span></td><td style="text-align:center;"><span class="badge badge-tag">T${tag}</span></td><td style="text-align:center;"><div class="contract-chart" style="background:${bg}; display:inline-block;"></div>${contratoActual}h${tieneHistorial?'<sup style="font-size:0.55rem;color:#94a3b8;margin-left:2px;">📋</sup>':''}</td><td style="text-align:center; font-family:monospace; font-weight:700; color:${dColor};">${dSign}${desvioAcum}h</td><td style="text-align:center; font-weight:700; color:${fColor};">${festivosPend > 0 ? festivosPend + ' ⚠' : '✓'}</td>`;
                    } else { html+=`<td>${App.ui.getPrefSelect(e.id, 'sunday', e.prefs?.sunday, {'indif':'Indif.','like':'Sí','hate':'No'})}</td><td>${App.ui.getPrefSelect(e.id, 'off1', e.prefs?.off1, {'any':'Indif.','L':'Lun','M':'Mar','X':'Mié','J':'Jue','V':'Vie','S':'Sáb'})}</td><td>${App.ui.getPrefSelect(e.id, 'off2', e.prefs?.off2, {'any':'Indif.','L':'Lun','M':'Mar','X':'Mié','J':'Jue','V':'Vie','S':'Sáb'})}</td><td>${App.ui.getPrefShiftSelect(e.id, e.prefs?.shift)}</td><td>${App.ui.getPrefSelect(e.id, 'split', e.prefs?.split, {'ok':'OK','no':'No','help':'Ayuda'})}</td>`; }
                    html+=`</tr>`;
                });
                html+=`</tbody></table>`;
                if(isPrefs) {
                    html+=`<div style="display:flex; align-items:flex-start; gap:8px; margin-top:12px; padding:10px 14px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; color:#64748b; font-size:0.72rem; line-height:1.5;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; margin-top:1px;"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>Estas preferencias son solo anotaciones informativas. Actualmente no influyen en ningún algoritmo ni automatización. Su aplicación automática al planificador está prevista para una fase posterior del desarrollo.</span>
                    </div>`;
                }
            }
            c.innerHTML=html;
        },
        getPrefSelect: function(empId, field, val, options) {
            let optsHtml = ''; 
            for (const [k, v] of Object.entries(options)) { 
                optsHtml += `<option value="${k}" ${val===k?'selected':''}>${v}</option>`; 
            }
            const bg = Utils.getPrefColor(val || 'indif');
            // FIX: Inline style for background color
            return `<select class="table-select" style="background-color:${bg}" onclick="event.stopPropagation()" onchange="event.stopPropagation(); App.logic.empPref('${empId}','${field}',this.value)">${optsHtml}</select>`;
        },
        getPrefShiftSelect: function(empId, val) {
            let optsHtml = '<option value="any" ' + (val === 'any' || !val ? 'selected' : '') + '>Indif.</option>';
            
            // Añadir todos los turnos de trabajo de la paleta (shiftDefs)
            App.data.shiftDefs.sort((a,b) => a.customOrder - b.customOrder).forEach(s => {
                if(s.start && s.end) { // Solo turnos con horario definido
                    const selected = val === s.id ? 'selected' : '';
                    optsHtml += `<option value="${s.id}" ${selected}>${s.code}</option>`;
                }
            });
            
            // Color de fondo basado en el turno seleccionado
            let bg = '#f1f5f9'; // Por defecto (any)
            if(val && val !== 'any') {
                const shift = App.data.shiftDefs.find(s => s.id === val);
                if(shift) bg = shift.color;
            }
            
            return `<select class="table-select" style="background-color:${bg}" onclick="event.stopPropagation()" onchange="event.stopPropagation(); App.logic.empPref('${empId}','shift',this.value)">${optsHtml}</select>`;
        },
        renderEmpInspector: function(id) {
    // 1. DATOS E IDENTIFICACIÓN
    const e = id ? App.data.empleados.find(x => x.id === id) : { 
        nombre: '', rol: 'STF', active: true, contratos: [], recPendientes: 0 
    };
    if (!e.contratos) e.contratos = [];
    
    const isActive = e.active !== false;
    const tab = id ? (App.uiState.empInspTab || 'overview') : 'overview';
    const toDec = (n) => parseFloat(n || 0).toFixed(2);

    // 2. BARRA DE NAVEGACIÓN
    const tabBar = id ? `
        <div style="display:flex; gap:2px; margin-bottom:15px; background:#f1f5f9; padding:3px; border-radius:8px; overflow-x:auto;">
            <button type="button" onclick="App.uiState.empInspTab='overview'; App.ui.renderEmpInspector('${id}')" 
                style="flex:1; white-space:nowrap; padding:8px 12px; border:none; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; background:${tab==='overview'?'white':'transparent'}; box-shadow:${tab==='overview'?'0 1px 3px rgba(0,0,0,0.1)':'none'}">DATOS</button>
            <button type="button" onclick="App.uiState.empInspTab='desvio'; App.ui.renderEmpInspector('${id}')" 
                style="flex:1; white-space:nowrap; padding:8px 12px; border:none; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; background:${tab==='desvio'?'white':'transparent'}; box-shadow:${tab==='desvio'?'0 1px 3px rgba(0,0,0,0.1)':'none'}">DESVÍO</button>
            <button type="button" onclick="App.uiState.empInspTab='festivos'; App.ui.renderEmpInspector('${id}')" 
                style="flex:1; white-space:nowrap; padding:8px 12px; border:none; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; background:${tab==='festivos'?'white':'transparent'}; box-shadow:${tab==='festivos'?'0 1px 3px rgba(0,0,0,0.1)':'none'}">FESTIVOS</button>
        </div>` : '';

    let content = '';

    if (tab === 'overview' || !id) {
        const hoy = new Date().toISOString().slice(0, 10);
        const horasHoy = e && e.id ? toDec(Utils.getContrato(e, hoy)) : toDec(0);

        content = `
            <div style="margin-bottom:15px;">
                <label style="display:block; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Nombre del Empleado</label>
                <input id="ie-nom" type="text" value="${e.nombre || ''}" oninput="App.ui.markDirty()" style="width:100%; padding:10px; border:1px solid #e2e8f0; border-radius:6px; font-size:14px; font-weight:600;">
            </div>
            
            <div style="display:grid; grid-template-columns: 1fr 100px; gap:12px; margin-bottom:20px;">
                <div>
                    <label style="display:block; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Puesto / Rol</label>
                    <select id="ie-rol" onchange="App.ui.markDirty()" style="width:100%; padding:9px; border:1px solid #e2e8f0; border-radius:6px; height:42px; font-weight:600;">
                        <option value="MNG" ${e.rol==='MNG'?'selected':''}>Manager</option>
                        <option value="AM" ${e.rol==='AM'?'selected':''}>Asst. Manager</option>
                        <option value="SPV" ${e.rol==='SPV'?'selected':''}>Supervisor</option>
                        <option value="STF" ${e.rol==='STF'?'selected':''}>Staff</option>
                    </select>
                </div>
                <div>
                    <label style="display:block; font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Jornada Hoy</label>
                    <div style="background:#eff6ff; color:#2563eb; font-family:monospace; font-weight:800; font-size:16px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:6px; border:1px solid #dbeafe;">${horasHoy}h</div>
                </div>
            </div>

            <div style="background:#fff; border:1px solid #2563eb; border-radius:10px; padding:12px; margin-bottom:20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <span style="font-weight:800; font-size:11px; color:#2563eb; text-transform:uppercase;">📜 Historial Contratos</span>
                    <button type="button" onclick="App.logic.addContrato('${id||''}'); App.ui.renderEmpInspector('${id||''}'); App.ui.markDirty();" style="background:#2563eb; color:white; border:none; padding:5px 10px; border-radius:4px; font-size:10px; font-weight:800; cursor:pointer;">+ AÑADIR</button>
                </div>
                <div id="contratos-container">
                    ${e.contratos.map((t, i) => `
                        <div style="background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:6px;">
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px; margin-bottom:5px;">
                                <div>${Utils.getDateInputHTML('contrato-desde-' + i, t.desde, 'App.logic.updateContrato(\'' + id + '\', ' + i + ', \'desde\', this.dataset.isoValue); App.ui.markDirty();')}</div>
                                <div>${Utils.getDateInputHTML('contrato-hasta-' + i, t.hasta || '', 'App.logic.updateContrato(\'' + id + '\', ' + i + ', \'hasta\', this.dataset.isoValue); App.ui.markDirty();')}</div>
                            </div>
                            <div style="display:flex; align-items:center; justify-content:flex-end; gap:6px;">
                                <span style="font-size:11px; color:#64748b;">Horas semanales:</span>
                                <input type="number" step="0.01" value="${toDec(t.horas)}" onchange="App.logic.updateContrato('${id}', ${i}, 'horas', this.value); App.ui.markDirty();" style="width:108px; text-align:right; font-weight:800; font-size:12px; color:#2563eb; border:1px solid #2563eb; border-radius:4px; padding:3px 4px;">
                                <button type="button" onclick="App.logic.removeContrato('${id}', ${i}); App.ui.markDirty();" style="border:none; background:none; color:#ef4444; font-size:16px; cursor:pointer; line-height:1; padding:0;">&times;</button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <input type="hidden" id="ie-hrs" value="${e.contrato || 0}">

            <details style="margin-bottom:12px; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden;">
                <summary style="padding:10px 12px; cursor:pointer; font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase; background:#f8fafc; list-style:none; display:flex; justify-content:space-between; align-items:center; user-select:none;">
                    <span>⏮ Arrastres de etapas anteriores</span>
                    <span style="font-size:10px; color:#94a3b8;">▼</span>
                </summary>
                <div style="padding:12px; display:flex; flex-direction:column; gap:10px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <label style="font-size:11px; font-weight:700; color:#64748b; white-space:nowrap;">Saldo horas arrastre</label>
                        <input type="number" step="0.1" id="ie-saldo" value="${e.saldoInicial || 0}" onchange="App.ui.markDirty();"
                               style="width:90px; text-align:right; font-weight:700; font-size:12px; color:#f59e0b; border:1px solid #fde68a; border-radius:4px; padding:4px 6px; background:#fefce8;">
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <label style="font-size:11px; font-weight:700; color:#64748b; white-space:nowrap;">Recuperaciones pendientes</label>
                        <input type="number" step="1" min="0" id="ie-rec" value="${e.recPendientes || 0}" onchange="App.ui.markDirty();"
                               style="width:90px; text-align:right; font-weight:700; font-size:12px; color:#6366f1; border:1px solid #c7d2fe; border-radius:4px; padding:4px 6px; background:#eef2ff;">
                    </div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:10px;">
                        <label style="font-size:11px; font-weight:700; color:#64748b; white-space:nowrap;">Vacaciones pendientes</label>
                        <input type="number" step="1" min="0" id="ie-vac" value="${e.vacPendientes || 0}" onchange="App.ui.markDirty();"
                               style="width:90px; text-align:right; font-weight:700; font-size:12px; color:#10b981; border:1px solid #a7f3d0; border-radius:4px; padding:4px 6px; background:#ecfdf5;">
                    </div>
                    <div style="font-size:10px; color:#94a3b8; margin-top:2px;">Valores heredados de periodos anteriores al inicio del sistema.</div>
                </div>
            </details>
            
            <div style="background:#fefce8; border:1px solid #fef08a; padding:12px; border-radius:10px; margin-bottom:15px; display:flex; gap:10px; align-items:center;">
                <label style="flex:1; cursor:pointer; display:flex; align-items:center; gap:10px; background:white; padding:10px; border-radius:8px; border:2px solid ${isActive?'#10b981':'#cbd5e1'};">
                    <input type="checkbox" id="ie-active" ${isActive?'checked':''} onchange="App.ui.markDirty();" style="width:18px; height:18px; cursor:pointer;">
                    <span style="font-size:11px; font-weight:800; color:${isActive?'#059669':'#64748b'}; text-transform:uppercase;">${isActive?'HABILITADO':'DESHABILITADO'}</span>
                </label>
                <button type="button" onclick="App.logic.empClearOutsideVigencia('${id}')" style="padding:10px; background:#fff; border:2px solid #ef4444; border-radius:8px; cursor:pointer; color:#ef4444; font-weight:800; font-size:10px; flex:1;">🧹 LIMPIAR TURNOS</button>
            </div>
            
            <button type="button" id="btn-save-emp" onclick="App.logic.empSave('${id||''}')" style="width:100%; background:#2563eb; color:white; border:none; padding:14px; border-radius:8px; font-weight:800; cursor:pointer; margin-top:10px;">
                <span id="save-text">💾 GUARDAR CAMBIOS</span>
            </button>
            ${id ? `
            <details style="margin-top:8px; border:1px solid #fecaca; border-radius:8px; overflow:hidden;">
                <summary style="padding:8px 12px; cursor:pointer; font-size:11px; font-weight:800; color:#ef4444; text-transform:uppercase; background:#fff5f5; list-style:none; display:flex; justify-content:space-between; align-items:center; user-select:none;">
                    <span>⚠️ Zona de peligro</span>
                    <span style="font-size:10px; color:#fca5a5;">▼</span>
                </summary>
                <div style="padding:10px 12px; background:#fff;">
                    <div style="font-size:10px; color:#94a3b8; margin-bottom:8px;">Elimina permanentemente al empleado y todos sus turnos del planificador.</div>
                    <button type="button" onclick="App.logic.empDel('${id}')" style="width:100%; background:#ef4444; color:white; border:none; padding:10px; border-radius:6px; font-weight:800; cursor:pointer; font-size:11px;">🗑 BORRAR EMPLEADO</button>
                </div>
            </details>` : ''}
        `;
    } 
    
    else if (tab === 'desvio') {
        content = (typeof App.ui.renderEmpDesvioInspector === 'function') ? App.ui.renderEmpDesvioInspector(e) : `<div>Error Desvío</div>`;
    } 
    else if (tab === 'festivos') {
        content = (typeof App.ui.renderEmpFestivosInspector === 'function') ? App.ui.renderEmpFestivosInspector(e) : `<div>Error Festivos</div>`;
    }

    const container = document.getElementById('inspector-content');
    if (container) {
        container.innerHTML = `<div style="padding:20px;"><h2 style="margin:0 0 20px 0; font-size:18px; font-weight:800;">${id ? (e.nombre || 'Sin nombre') : 'Nuevo Empleado'}</h2>${tabBar}${content}</div>`;
    }
},

// FUNCIÓN PARA DETECTAR CAMBIOS
markDirty: function() {
    const btn = document.getElementById('btn-save-emp');
    const txt = document.getElementById('save-text');
    if (btn && !btn.classList.contains('is-dirty')) {
        btn.classList.add('is-dirty');
        btn.style.background = '#f59e0b'; // Naranja
        if (txt) txt.innerText = '⚠️ GUARDAR CAMBIOS *';
    }
},

// Esta función debe estar al mismo nivel que renderEmpInspector
markDirty: function() {
    const btn = document.getElementById('btn-save-emp');
    const txt = document.getElementById('save-text');
    if (btn && !btn.classList.contains('is-dirty')) {
        btn.classList.add('is-dirty');
        btn.style.background = '#f59e0b'; // Naranja
        if (txt) txt.innerText = '⚠️ GUARDAR CAMBIOS *';
    }
},

// --- FUNCIONALIDAD EXTRA PARA EL BOTÓN DE GUARDADO ---
markDirty: function() {
    const btn = document.getElementById('btn-save-emp');
    const txt = document.getElementById('save-text');
    if(btn && !btn.classList.contains('is-dirty')) {
        btn.classList.add('is-dirty');
        btn.style.background = '#f59e0b'; // Naranja aviso
        btn.style.borderColor = '#d97706';
        txt.innerText = '⚠️ GUARDAR CAMBIOS *';
    }
},

        renderEmpDesvioInspector: function(emp) {
            if(!emp || !emp.id) return `<p style="color:var(--text-muted); font-size:0.85rem;">Guarda el empleado primero.</p>`;

            const shortDate = iso => { const [y,m,d] = iso.split('-'); return `${d}.${m}.${y.slice(2)}`; };

            // Semanas cerradas donde el empleado tiene contrato vigente
            const weeks = App.ui._getLockedWeeks(emp);

            // Calcular filas
            let acum = emp.saldoInicial || 0;
            let maxAbs = Math.abs(acum);
            const rows = weeks.map(monday => {
                const wdays = Utils.getWeekDays(monday);
                let worked = 0;
                wdays.forEach(d => {
                    const sid = App.data.schedule[d]?.[emp.id];
                    const sh = sid ? Utils.getShift(sid) : null;
                    if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                });
                const contratoSemana = Utils.getContrato(emp, monday);
                const { esperadas, justifiedH } = Utils.calcEsperadas(contratoSemana, wdays, emp.id);
                const desvio = Math.round((worked - esperadas) * 10) / 10;
                acum = Math.round((acum + desvio) * 10) / 10;
                if(Math.abs(desvio) > maxAbs) maxAbs = Math.abs(desvio);
                if(Math.abs(acum)   > maxAbs) maxAbs = Math.abs(acum);
                return { monday, worked, esperadas, justifiedH, desvio, acum };
            });

            const totalFinal = rows.length ? rows[rows.length-1].acum : (emp.saldoInicial||0);
            const totalColor = totalFinal > 0.5 ? '#f59e0b' : totalFinal < -0.5 ? '#3b82f6' : '#10b981';
            const barScale = maxAbs > 0 ? maxAbs : 1;

            const rangeLabel = weeks.length > 0
                ? `${Utils.getWeekCode(weeks[0])} → ${Utils.getWeekCode(weeks[weeks.length-1])}`
                : '—';

            let html = `<div style="display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:#f8fafc; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;">
                <div>
                    <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:2px;">🔒 Semanas cerradas</div>
                    <div style="font-size:0.72rem; color:var(--text-main); font-family:monospace;">${rangeLabel} · ${weeks.length} sem.</div>
                </div>
                <div style="font-size:1.2rem; font-weight:800; color:${totalColor};">${totalFinal>0?'+':''}${totalFinal}h</div>
            </div>`;

            if(rows.length === 0) {
                return html + `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.8rem;">Sin semanas cerradas con contrato vigente.</div>`;
            }

            // Tabla compacta
            html += `<div style="overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                <thead><tr style="border-bottom:2px solid var(--border);">
                    <th style="text-align:left; padding:5px 4px; color:var(--text-muted); font-size:0.65rem; text-transform:uppercase;">Semana</th>
                    <th style="text-align:right; padding:5px 4px; color:var(--text-muted); font-size:0.65rem; text-transform:uppercase;">Esp.</th>
                    <th style="text-align:right; padding:5px 4px; color:var(--text-muted); font-size:0.65rem; text-transform:uppercase;">Trab.</th>
                    <th style="text-align:right; padding:5px 4px; color:var(--text-muted); font-size:0.65rem; text-transform:uppercase;">Desv.</th>
                    <th style="text-align:right; padding:5px 4px; color:var(--text-muted); font-size:0.65rem; text-transform:uppercase;">Acum.</th>
                </tr></thead>
                <tbody>`;

            // Fila saldo arrastre
            const saldo = emp.saldoInicial || 0;
            if(saldo !== 0) {
                const sc = saldo > 0 ? '#f59e0b' : '#3b82f6';
                html += `<tr style="background:#fefce8; border-bottom:1px solid #fef08a;">
                    <td colspan="3" style="padding:5px 4px; font-size:0.72rem; color:#92400e; font-weight:600; font-style:italic;">⟵ Saldo arrastre</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${sc};">${saldo>0?'+':''}${saldo}h</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${sc};">${saldo>0?'+':''}${saldo}h</td>
                </tr>`;
            }

            rows.forEach(r => {
                const dColor = r.desvio > 0.5 ? '#f59e0b' : r.desvio < -0.5 ? '#3b82f6' : '#10b981';
                const aColor = r.acum   > 0.5 ? '#f59e0b' : r.acum   < -0.5 ? '#3b82f6' : '#10b981';
                const dSign  = r.desvio > 0 ? '+' : '';
                const aSign  = r.acum   > 0 ? '+' : '';
                const wkCode = Utils.getWeekCode(r.monday);
                const wdays  = Utils.getWeekDays(r.monday);
                const justNote = r.justifiedH > 0 ? `<span style="color:#a78bfa; font-size:0.65rem; margin-left:2px;" title="${r.justifiedH}h ausencias justificadas">✦</span>` : '';
                html += `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:5px 4px; white-space:nowrap;">
                        <span style="font-weight:700; font-size:0.73rem;">${wkCode}</span>
                        <span style="color:#94a3b8; font-size:0.65rem; display:block;">${shortDate(wdays[0])}–${shortDate(wdays[6])}</span>
                    </td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace;">${r.esperadas}h${justNote}</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace;">${r.worked}h</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${dColor};">${dSign}${r.desvio}h</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${aColor};">${aSign}${r.acum}h</td>
                </tr>`;
            });

            html += `<tr style="background:#f8fafc; border-top:2px solid var(--border); font-weight:700;">
                <td colspan="3" style="padding:6px 4px; font-size:0.72rem;">TOTAL</td>
                <td style="text-align:right; padding:6px 4px; font-family:monospace; color:${totalColor};">${totalFinal>0?'+':''}${totalFinal}h</td>
                <td style="text-align:right; padding:6px 4px; font-family:monospace; color:${totalColor};">${totalFinal>0?'+':''}${totalFinal}h</td>
            </tr>`;

            html += `</tbody></table></div>
            <div style="margin-top:8px; font-size:0.65rem; color:var(--text-muted);">🟡 Más · 🔵 Menos · ✦ Ausencia justificada</div>`;

            return html;
        },

        renderEmpFestivosInspector: function(emp) {
    if(!emp || !emp.id) return `<p style="color:var(--text-muted);font-size:0.85rem;">Guarda el empleado primero.</p>`;

    const tracking = emp.festivoTracking || {};
    
    // 1. Festivos en semanas cerradas donde el empleado tiene contrato
    const locked = App.data.lockedDays || {};
    const holidays = (App.data.storeConfig.holidays || [])
        .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(emp, h.date));

    // --- Helper: calcular estado ---
    const getEstado = (hDate) => {
        const sid = App.data.schedule[hDate]?.[emp.id];
        const shift = sid ? Utils.getShift(sid) : null;
        if(!shift) return 'sin_definir';
        if(shift.fixed && shift.code === 'F') {
            const monday = Utils.getMonday(hDate);
            const wdays  = Utils.getWeekDays(monday);
            let countL = 0;
            wdays.forEach(d => {
                const s2 = App.data.schedule[d]?.[emp.id];
                const sh2 = s2 ? Utils.getShift(s2) : null;
                if(sh2 && sh2.fixed && sh2.code === 'L') countL++;
            });
            return countL >= 2 ? 'disfrutado' : 'coincide';
        }
        if(shift.start && shift.end) return 'trabaja';
        return 'sin_definir';
    };

    // --- Obtener Rs disponibles (Historial completo de la App) ---
    const allRs = [];
    Object.keys(App.data.schedule).forEach(iso => {
        const sid = App.data.schedule[iso]?.[emp.id];
        const sh = sid ? Utils.getShift(sid) : null;
        if(sh && sh.fixed && sh.code === 'R') allRs.push(iso);
    });
    allRs.sort((a,b) => b.localeCompare(a)); // Rs más recientes primero en el desplegable

    const assignedRDates = new Set(Object.values(tracking).map(t => t.rDate).filter(Boolean));

    // --- Clasificación y Procesamiento ---
    let adeudadas = 0, dadas = 0;
    let pendientesData = [];
    let cerradosData = [];

    holidays.forEach(h => {
        const estado = getEstado(h.date);
        const tr = tracking[h.date] || {};
        const isCerrado = !!tr.rDate;

        if(estado === 'coincide' || estado === 'trabaja') adeudadas++;
        if(isCerrado) dadas++;

        const itemHtml = this.renderFestivoItemRow(emp, h, estado, tr, allRs, assignedRDates);
        
        if (isCerrado) {
            cerradosData.push({ date: h.date, html: itemHtml });
        } else {
            pendientesData.push({ date: h.date, html: itemHtml });
        }
    });

    // --- ORDENACIÓN CRÍTICA ---
    // Pendientes: De más antiguo (2024) a más futuro (2026) -> ASCENDENTE
    pendientesData.sort((a, b) => a.date.localeCompare(b.date));
    
    // Cerrados: De más reciente a más antiguo -> DESCENDENTE
    cerradosData.sort((a, b) => b.date.localeCompare(a.date));

    const balancePendiente = adeudadas - dadas;

    // --- CONSTRUCCIÓN DEL HTML ---
    let html = `
    <div style="background:white; border-bottom:1px solid var(--border); margin:-12px -12px 12px -12px; padding:12px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#fffbeb; border:1px solid #fef3c7; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:800; color:#b45309;">${adeudadas}</div>
                <div style="font-size:0.6rem; color:#92400e; text-transform:uppercase; font-weight:600;">Adeudadas</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #dcfce7; border-radius:8px; padding:8px; text-align:center;">
                <div style="font-size:1.2rem; font-weight:800; color:#15803d;">${balancePendiente}</div>
                <div style="font-size:0.6rem; color:#166534; text-transform:uppercase; font-weight:600;">Pendientes</div>
            </div>
        </div>
    </div>`;

    // Sección Pendientes (Orden Cronológico)
    html += `<div style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px; display:flex; align-items:center; gap:5px;">
        <span style="color:#f59e0b;">●</span> Deuda acumulada (${pendientesData.length})
    </div>`;
    
    if (pendientesData.length > 0) {
        html += pendientesData.map(d => d.html).join('');
    } else {
        html += `<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.75rem; border:1px dashed var(--border); border-radius:8px; margin-bottom:15px;">No hay festivos pendientes de asignar.</div>`;
    }

    // Sección Cerrados (Historial)
    if (cerradosData.length > 0) {
        html += `
        <details style="margin-top:15px;">
            <summary style="font-size:0.7rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; cursor:pointer; padding:5px 0;">
                Ver historial compensados (${cerradosData.length})
            </summary>
            <div style="margin-top:8px; opacity:0.8;">
                ${cerradosData.map(d => d.html).join('')}
            </div>
        </details>`;
    }

    html += `<button type="button" onclick="App.logic.empSave('${emp.id}')" style="width:100%; background:#2563eb; color:white; border:none; padding:14px; border-radius:8px; font-weight:800; cursor:pointer; margin-top:14px;">💾 GUARDAR CAMBIOS</button>`;

    return html;
},

renderFestivoItemRow: function(emp, h, estado, tr, allRs, assignedRDates) {
    const needsTracking = estado === 'coincide' || estado === 'trabaja';
    const isTrabajado = estado === 'trabaja';
    const d = new Date(h.date);
    const label = `${d.getDate()} ${['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][d.getMonth()]}`;
    const yearShort = h.date.split('-')[0].slice(2);

    const badge = {
        disfrutado: ['#dcfce7','#15803d','✅ OK'],
        coincide: ['#fef9c3','#854d0e','⚠️ Coincide'],
        trabaja: ['#fee2e2','#991b1b','🔴 Trabaja'],
        sin_definir: ['#f1f5f9','#94a3b8','⬜ ?']
    }[estado];

    let rOpts = `<option value="">— Sin asignar —</option>`;
    allRs.forEach(rIso => {
        if(!assignedRDates.has(rIso) || rIso === tr.rDate) {
            const sel = tr.rDate === rIso ? 'selected' : '';
            rOpts += `<option value="${rIso}" ${sel}>${Utils.getWeekCode(rIso)} · ${rIso.split('-').reverse().join('/')}</option>`;
        }
    });

    return `
    <div style="border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px; background:white;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
                <div style="font-weight:700; font-size:0.85rem;">${label} <span style="font-weight:400; color:#94a3b8;">'${yearShort}</span></div>
                <div style="font-size:0.65rem; color:var(--text-muted);">${h.note || 'Festivo'}</div>
            </div>
            <span style="background:${badge[0]}; color:${badge[1]}; padding:2px 6px; border-radius:6px; font-size:0.6rem; font-weight:800; white-space:nowrap;">${badge[2]}</span>
        </div>
        
        ${needsTracking ? `
            <div style="display:flex; flex-direction:column; gap:6px; padding-top:6px; border-top:1px dashed var(--border);">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.65rem; color:var(--text-muted); width:50px;">R dada:</span>
                    <select style="flex:1; padding:3px; border:1px solid var(--border); border-radius:4px; font-size:0.7rem;"
                        onchange="App.logic.festivoTrackUpd('${emp.id}','${h.date}','rDate',this.value);">
                        ${rOpts}
                    </select>
                </div>
                ${isTrabajado ? `
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.65rem; color:var(--text-muted); width:50px;">Fact.:</span>
                    <div style="flex:1;">${Utils.getDateInputHTML(`fact-${h.date}`, tr.factorialDate || '', `App.logic.festivoTrackUpd('${emp.id}','${h.date}','factorialDate',this.dataset.isoValue)`)}</div>
                </div>` : ''}
            </div>
        ` : ''}
    </div>`;
},

// Función auxiliar para renderizar cada tarjeta (para evitar duplicar código)
renderFestivoItemRow: function(emp, h, estado, tr, allRs, assignedRDates) {
    const needsTracking = estado === 'coincide' || estado === 'trabaja';
    const isTrabajado = estado === 'trabaja';
    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    const d = new Date(h.date);
    const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
    const yearShort = h.date.split('-')[0].slice(2);

    const badge = {
        disfrutado: ['#dcfce7','#15803d','✅ OK'],
        coincide: ['#fef9c3','#854d0e','⚠️ Coincide'],
        trabaja: ['#fee2e2','#991b1b','🔴 Trabaja'],
        sin_definir: ['#f1f5f9','#94a3b8','⬜ ?']
    }[estado];

    let rOpts = `<option value="">— Sin asignar —</option>`;
    allRs.forEach(rIso => {
        if(!assignedRDates.has(rIso) || rIso === tr.rDate) {
            const sel = tr.rDate === rIso ? 'selected' : '';
            rOpts += `<option value="${rIso}" ${sel}>${Utils.getWeekCode(rIso)} · ${rIso.split('-').reverse().join('/')}</option>`;
        }
    });

    return `
    <div style="border:1px solid var(--border); border-radius:8px; padding:10px; margin-bottom:8px; background:white;">
        <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:8px;">
            <div>
                <div style="font-weight:700; font-size:0.85rem;">${label} <span style="font-weight:400; color:#94a3b8;">'${yearShort}</span></div>
                <div style="font-size:0.65rem; color:var(--text-muted);">${h.note || 'Festivo'}</div>
            </div>
            <span style="background:${badge[0]}; color:${badge[1]}; padding:2px 6px; border-radius:6px; font-size:0.6rem; font-weight:800; white-space:nowrap;">${badge[2]}</span>
        </div>
        
        ${needsTracking ? `
            <div style="display:flex; flex-direction:column; gap:6px; padding-top:6px; border-top:1px dashed var(--border);">
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.65rem; color:var(--text-muted); width:50px;">R dada:</span>
                    <select style="flex:1; padding:3px; border:1px solid var(--border); border-radius:4px; font-size:0.7rem;"
                        onchange="App.logic.festivoTrackUpd('${emp.id}','${h.date}','rDate',this.value);">
                        ${rOpts}
                    </select>
                </div>
                ${isTrabajado ? `
                <div style="display:flex; align-items:center; gap:6px;">
                    <span style="font-size:0.65rem; color:var(--text-muted); width:50px;">Fact.:</span>
                    <div style="flex:1;">${Utils.getDateInputHTML(`fact-${h.date}`, tr.factorialDate || '', `App.logic.festivoTrackUpd('${emp.id}','${h.date}','factorialDate',this.dataset.isoValue)`)}</div>
                </div>` : ''}
            </div>
        ` : ''}
    </div>`;
},

        // --- REQUESTS ---
        renderRequests: function(c) {
            if(App.uiState.reqView === 'calendar') { App.ui.renderRequestsCalendar(c); return; }

            const showArchived = App.uiState.reqShowArchived;
            const sk = App.uiState.reqSortKey;
            const sd = App.uiState.reqSortDir === 'asc' ? 1 : -1;

            const active   = App.data.requests.filter(r => !r.archived);
            const archived = App.data.requests.filter(r =>  r.archived);
            const list     = showArchived ? archived : active;

            // Helpers de ordenación
            const empName  = r => { const e = App.data.empleados.find(e => e.id === r.empId); return e ? e.nombre : ''; };
            const sortFns  = {
                emp:    (a,b) => empName(a).localeCompare(empName(b)) * sd,
                type:   (a,b) => a.type.localeCompare(b.type) * sd,
                start:  (a,b) => a.start.localeCompare(b.start) * sd,
                status: (a,b) => a.status.localeCompare(b.status) * sd,
            };
            const sorted = [...list].sort(sortFns[sk] || sortFns.start);

            // Header con toggle archivadas
            const archivedBtn = archived.length > 0 || showArchived
                ? `<button class="btn" style="width:auto;margin:0;font-size:0.78rem;background:${showArchived?'#e2e8f0':'#f8fafc'};border:1px solid var(--border);color:var(--text-muted);" onclick="App.uiState.reqShowArchived=!App.uiState.reqShowArchived; App.ui.renderRequests(document.querySelector('.main-scroll'))">
                    ${showArchived ? '← Activas' : `📦 Archivadas (${archived.length})`}
                   </button>`
                : '';

            let html = `<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; gap:8px; flex-wrap:wrap;">
                <h2 style="margin:0; font-size:1.2rem;">${showArchived ? '📦 Archivadas' : 'Vacaciones y Ausencias'}</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    ${archivedBtn}
                    <button class="btn" style="width:auto;margin:0;font-size:0.78rem;background:#f8fafc;border:1px solid var(--border);color:var(--text-muted);" onclick="App.uiState.reqView='calendar'; App.ui.renderRequests(document.querySelector('.main-scroll'))">📅 Vista Calendario</button>
                    ${!showArchived ? `<button class="btn btn-primary" style="width:auto;margin:0" onclick="App.logic.reqSelect(null)">+ Nueva Solicitud</button>` : ''}
                </div>
            </div>`;

            if(sorted.length === 0) {
                html += `<div style="text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:8px; color:#94a3b8">${showArchived ? 'No hay solicitudes archivadas.' : 'No hay solicitudes activas.'}</div>`;
            } else {
                // Cabeceras ordenables
                const th = (key, label) => {
                    const isActive = sk === key;
                    const arrow = isActive ? (App.uiState.reqSortDir === 'asc' ? ' ↑' : ' ↓') : '';
                    return `<th style="cursor:pointer;user-select:none;white-space:nowrap;" onclick="App.logic.reqSort('${key}')">${label}${arrow}</th>`;
                };

                html += `<table class="data-table"><thead><tr>
                    ${th('emp','Empleado')}
                    ${th('type','Tipo')}
                    ${th('start','Fecha / WK')}
                    ${th('status','Estado')}
                    <th style="width:32px;"></th>
                </tr></thead><tbody>`;

                sorted.forEach(r => {
                    const name = empName(r);
                    let stClass = 'st-pending'; let stText = 'Pendiente';
                    if(r.status === 'approved') { stClass = 'st-approved'; stText = 'Aprobada'; }
                    if(r.status === 'rejected') { stClass = 'st-rejected'; stText = 'Denegada'; }

                    const wk = Utils.getWeekCode(r.start);
                    const dateStr = r.type === 'HRL'
                        ? `${Utils.formatDateES(r.start)} · ${r.hrlFrom}–${r.hrlTo}`
                        : (r.start === r.end)
                            ? Utils.formatDateES(r.start)
                            : `${Utils.formatDateES(r.start)} ➝ ${Utils.formatDateES(r.end)}`;

                    const isSel = App.uiState.selectedId === r.id ? 'selected' : '';
                    const archiveTitle = r.archived ? 'Restaurar' : 'Archivar';
                    const archiveIcon  = r.archived ? '↩' : '📦';

                    html += `<tr class="${isSel}" onclick="App.logic.reqSelect('${r.id}')">
                        <td style="font-weight:500">${name}</td>
                        <td><span class="badge" style="background:#f1f5f9;color:#475569">${r.type}</span></td>
                        <td>
                            <div style="font-size:0.82rem;">${dateStr}</div>
                            <div style="font-size:0.68rem;color:var(--text-muted);margin-top:1px;">${wk}</div>
                        </td>
                        <td><span class="badge ${stClass}">${stText}</span></td>
                        <td>
                            <button title="${archiveTitle}" onclick="event.stopPropagation(); App.logic.reqToggleArchive('${r.id}')"
                                style="background:none;border:none;cursor:pointer;font-size:0.85rem;padding:2px 4px;opacity:0.6;border-radius:3px;"
                                onmouseover="this.style.opacity='1';this.style.background='#f1f5f9'"
                                onmouseout="this.style.opacity='0.6';this.style.background='none'">
                                ${archiveIcon}
                            </button>
                        </td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
            c.innerHTML = html;
        },

        renderRequestsCalendar: function(c) {
            // Curso navegable
            if(App.uiState.reqCalCursoY === undefined) {
                const t = new Date();
                App.uiState.reqCalCursoY = t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1;
            }
            const cursoY    = App.uiState.reqCalCursoY;
            const rangeStart = `${cursoY}-03-01`;
            const rangeEnd   = `${cursoY + 1}-02-${new Date(cursoY + 1, 2, 0).getDate()}`;

            const days = [];
            let cur = new Date(rangeStart + 'T00:00:00');
            const end = new Date(rangeEnd + 'T00:00:00');
            while(cur <= end) { days.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+1); }

            const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            // Todas las peticiones no rechazadas, incluyendo archivadas (con indicador visual)
            const allReqs = App.data.requests;
            const empFirst = id => { const e = App.data.empleados.find(e=>e.id===id); return e ? e.nombre.split(' ')[0] : '?'; };
            const empFull  = id => { const e = App.data.empleados.find(e=>e.id===id); return e ? e.nombre : '?'; };

            let html = `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
                <div style="display:flex;align-items:center;gap:10px;">
                    <h2 style="margin:0;font-size:1.2rem;">📅 Calendario de Peticiones</h2>
                    <div style="display:flex;align-items:center;gap:4px;">
                        <button onclick="App.uiState.reqCalCursoY=${cursoY-1}; App.ui.renderRequestsCalendar(document.querySelector(\'.main-scroll\'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 8px;font-size:0.85rem;color:var(--text-muted);">◀</button>
                        <span style="font-size:0.85rem;font-weight:600;color:var(--text-muted);min-width:70px;text-align:center;">${cursoY}/${cursoY+1}</span>
                        <button onclick="App.uiState.reqCalCursoY=${cursoY+1}; App.ui.renderRequestsCalendar(document.querySelector(\'.main-scroll\'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:2px 8px;font-size:0.85rem;color:var(--text-muted);">▶</button>
                    </div>
                </div>
                <div style="display:flex;gap:8px;align-items:center;">
                    <button class="btn" style="width:auto;margin:0;font-size:0.78rem;background:#f8fafc;border:1px solid var(--border);color:var(--text-muted);" onclick="App.uiState.reqView='table'; App.ui.renderRequests(document.querySelector(\'.main-scroll\'))">☰ Vista Lista</button>
                    <button class="btn btn-primary" style="width:auto;margin:0" onclick="App.logic.reqSelect(null)">+ Nueva Solicitud</button>
                </div>
            </div>
            <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:0.69rem;color:var(--text-muted);">
                <span><span style="display:inline-block;width:9px;height:9px;background:#fef9c3;border:1px solid #fde047;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>VAC pendiente</span>
                <span><span style="display:inline-block;width:9px;height:9px;background:#dcfce7;border:1px solid #86efac;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>VAC aprobada</span>
                <span><span style="display:inline-block;width:9px;height:9px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:2px;vertical-align:middle;margin-right:2px;"></span>LIB/AP/BAJ/HRL</span>
                <span><input type="checkbox" checked disabled style="width:10px;height:10px;vertical-align:middle;margin-right:2px;">Pedido en Factorial</span>
                <span><span style="display:inline-block;width:9px;height:9px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:2px;vertical-align:middle;margin-right:2px;opacity:0.5;"></span>Archivada</span>
            </div>
            <div style="overflow-x:auto;">
            <table style="border-collapse:collapse;width:100%;font-size:0.77rem;min-width:660px;">
                <thead>
                    <tr style="position:sticky;top:0;z-index:2;background:#f1f5f9;border-bottom:2px solid #cbd5e1;">
                        <th style="padding:5px 6px;text-align:center;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:44px;border-right:1px solid #e2e8f0;">WK</th>
                        <th style="padding:5px 8px;text-align:left;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:58px;">Fecha</th>
                        <th style="padding:5px 5px;text-align:center;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:28px;border-right:2px solid #cbd5e1;">Día</th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);">VAC 1 &thinsp;<span style="font-weight:400;opacity:0.6;font-size:0.62rem;">☐ Factorial</span></th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);">VAC 2 &thinsp;<span style="font-weight:400;opacity:0.6;font-size:0.62rem;">☐ Factorial</span></th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);border-right:2px solid #cbd5e1;">VAC 3 &thinsp;<span style="font-weight:400;opacity:0.6;font-size:0.62rem;">☐ Factorial</span></th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);">Petición 1</th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);">Petición 2</th>
                        <th style="padding:5px 8px;font-size:0.67rem;color:var(--text-muted);font-weight:600;width:calc((100% - 130px)/6);">Petición 3</th>
                    </tr>
                </thead>
                <tbody>`;

            let lastWk = null;
            let wkParity = 0;

            days.forEach(date => {
                const d   = new Date(date + 'T00:00:00');
                const dow = d.getDay(); // 0=Dom, 6=Sáb
                const isWeekend = dow === 0 || dow === 6;
                const isMon     = dow === 1;
                const isSun     = dow === 0;
                const wk        = Utils.getWeekCode(date);
                const isHoliday = (App.data.storeConfig.holidays || []).some(h => h.date === date);

                if(wk !== lastWk) { lastWk = wk; wkParity = 1 - wkParity; }

                const dayReqs   = allReqs.filter(r => date >= r.start && date <= r.end);
                const vacReqs   = dayReqs.filter(r => r.type === 'VAC');
                const otherReqs = dayReqs.filter(r => r.type !== 'VAC');

                // Mostrar todos los días del rango

                // Separador fuerte entre domingo y lunes (cambio de semana)
                const weekSep = isMon ? 'border-top:2px solid #94a3b8;' : '';

                const weekBg   = wkParity === 0 ? '#ffffff' : '#f8fafc';
                const rowBg    = isHoliday ? '#fef3c7' : isWeekend ? '#f0f4f8' : weekBg;
                const dayColor = isWeekend ? '#94a3b8' : '#1e293b';
                const dayW     = isWeekend ? '700' : '400';
                const wkDisplay = wk.replace(/^\d{4}/, '').replace('WK','W');
                const dateDisplay = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;

                const bdBot = `border-bottom:1px solid #f1f5f9;`;
                const cellBase = `padding:2px 5px;${bdBot}${weekSep}`;

                const vacCell = (req, isLast=false) => {
                    if(!req) return `<td style="${cellBase}${isLast?'border-right:2px solid #cbd5e1;':''}" onclick="App.logic.reqNewForDate('${date}','VAC')" style="cursor:pointer;" onmouseover="this.style.background='#f0fdf4'" onmouseout="this.style.background=''"></td>`;
                    const isApproved = req.status === 'approved';
                    const isArchived = req.archived;
                    const bg     = isApproved ? '#dcfce7' : '#fef9c3';
                    const bdr    = isApproved ? '#86efac' : '#fde047';
                    const name   = empFirst(req.empId);
                    const full   = empFull(req.empId);
                    const chk    = req.factorialDone ? 'checked' : '';
                    const opacity = isArchived ? 'opacity:0.45;' : '';
                    const isDenied = req.status === 'rejected';
                    const lastBorder = isLast ? 'border-right:2px solid #cbd5e1;' : '';
                    if(isDenied) {
                        return `<td style="${cellBase}${lastBorder}">
                            <div style="display:flex;align-items:center;gap:3px;background:#fff5f5;border:1px solid #fca5a5;border-radius:4px;padding:2px 4px;min-height:20px;cursor:pointer;"
                                 onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                                <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55px;" title="${full}">${name}</span>
                                <span style="font-size:0.58rem;color:#ef4444;font-weight:700;flex-shrink:0;white-space:nowrap;">DENEGADA</span>
                            </div>
                        </td>`;
                    }
                    return `<td style="${cellBase}${lastBorder}">
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:3px;background:${bg};border:1px solid ${bdr};border-radius:4px;padding:2px 4px;min-height:20px;${opacity}cursor:pointer;"
                             onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:78px;" title="${full}">${name}${isArchived?' 📦':''}</span>
                            <input type="checkbox" ${chk} title="Pedido en Factorial"
                                onclick="event.stopPropagation(); App.logic.reqToggleFactorial('${req.id}')"
                                style="cursor:pointer;accent-color:#16a34a;flex-shrink:0;width:12px;height:12px;">
                        </div>
                    </td>`;
                };

                const otherStyles = { LIB:['#ede9fe','#c4b5fd'], AP:['#fce7f3','#f9a8d4'], BAJ:['#fee2e2','#fca5a5'], HRL:['#e0f2fe','#7dd3fc'] };
                const otherCell = (req) => {
                    if(!req) return `<td style="${cellBase}border-left:1px solid #e2e8f0;cursor:pointer;" onmouseover="this.style.background='#eff6ff'" onmouseout="this.style.background=''}" onclick="App.logic.reqNewForDate('${date}','LIB')"></td>`;
                    const [bg, bdr] = otherStyles[req.type] || ['#f1f5f9','#e2e8f0'];
                    const name  = empFirst(req.empId);
                    const full  = empFull(req.empId);
                    const label = req.type === 'HRL' ? `${req.hrlFrom}–${req.hrlTo}` : req.type;
                    const opacity = req.archived ? 'opacity:0.45;' : '';
                    if(req.status === 'rejected') {
                        return `<td style="${cellBase}border-left:1px solid #e2e8f0;">
                            <div style="display:flex;align-items:center;gap:3px;background:#fff5f5;border:1px solid #fca5a5;border-radius:4px;padding:2px 4px;min-height:20px;cursor:pointer;"
                                 onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                                <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:55px;" title="${full}">${name}</span>
                                <span style="font-size:0.58rem;color:#ef4444;font-weight:700;flex-shrink:0;white-space:nowrap;">DENEGADA</span>
                            </div>
                        </td>`;
                    }
                    return `<td style="${cellBase}border-left:1px solid #e2e8f0;">
                        <div style="display:flex;align-items:center;gap:3px;background:${bg};border:1px solid ${bdr};border-radius:4px;padding:2px 4px;min-height:20px;${opacity}cursor:pointer;"
                             onclick="event.stopPropagation(); App.logic.reqSelect('${req.id}')">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:72px;" title="${full}">${name}${req.archived?' 📦':''}</span>
                            <span style="font-size:0.59rem;color:#64748b;flex-shrink:0;font-weight:500;">${label}</span>
                        </div>
                    </td>`;
                };

                html += `<tr style="background:${rowBg};">
                    <td style="padding:2px 5px;text-align:center;font-size:0.63rem;font-weight:700;color:#64748b;border-right:1px solid #e2e8f0;${bdBot}${weekSep}white-space:nowrap;">${wkDisplay}</td>
                    <td style="padding:2px 7px;color:${dayColor};font-weight:${dayW};${bdBot}${weekSep}white-space:nowrap;">${dateDisplay}</td>
                    <td style="padding:2px 4px;text-align:center;color:${dayColor};font-size:0.67rem;font-weight:${dayW};border-right:2px solid #cbd5e1;${bdBot}${weekSep}">${DAY_ES[dow]}</td>
                    ${vacCell(vacReqs[0]||null)}
                    ${vacCell(vacReqs[1]||null)}
                    ${vacCell(vacReqs[2]||null, true)}
                    ${otherCell(otherReqs[0]||null)}
                    ${otherCell(otherReqs[1]||null)}
                    ${otherCell(otherReqs[2]||null)}
                </tr>`;
            });

            html += `</tbody></table></div>`;
            c.innerHTML = html;
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
                            💡 <strong>Tip:</strong> Usa "Crear turnos" para asignar automáticamente. Puedes cambiar manualmente después (${r.type === 'LIB' ? 'L, F, R o V permitidos' : 'solo ' + shiftCode + ' permitido'}).
                        </div>
                    </div>
                    `;
                })() : ''}
                
                <button class="btn btn-primary" onclick="App.logic.reqSave('${id||''}')">💾 Guardar Solicitud</button>
                ${id ? `<button class="btn btn-danger" onclick="App.logic.reqDel('${id}')">🗑️ Eliminar</button>` : ''}`;
        },
});
