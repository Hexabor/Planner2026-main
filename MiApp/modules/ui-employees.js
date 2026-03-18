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
            // Ajustes manuales: cuentan siempre independientemente de semana cerrada
            const ajusteTotal = (emp.ajustes || []).reduce((sum, a) => sum + a.signo * a.horas, 0);
            return Math.round((acum + ajusteTotal) * 10) / 10;
        },

        // Helper: festivos pendientes en semanas cerradas
        _calcFestivosPend: function(emp) {
            if(!emp) return 0;
            const locked = App.data.lockedDays || {};
            const tracking = emp.festivoTracking || {};
            // Recopilar Rs reales del empleado en el schedule
            const realRs = new Set();
            Object.keys(App.data.schedule || {}).forEach(iso => {
                const sid = App.data.schedule[iso]?.[emp.id];
                const sh = sid ? Utils.getShift(sid) : null;
                if(sh && sh.fixed && sh.code === 'R') realRs.add(iso);
            });
            const holidays = (App.data.storeConfig.holidays || [])
                .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(emp, h.date));
            let pendientes = 0;
            holidays.forEach(h => {
                const tr = tracking[h.date] || {};
                // R válida solo si aún existe en el schedule
                if(tr.rDate && realRs.has(tr.rDate)) return;
                const sid = App.data.schedule[h.date]?.[emp.id];
                const shift = sid ? Utils.getShift(sid) : null;
                if(!shift) return;
                if(shift.fixed && shift.code === 'V') return; // Vacaciones = festivo disfrutado
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
                        const w = {"MNG":5,"AM":4,"SPV":3,"STF":2}; const _h = new Date().toISOString().slice(0,10);
                        return ((w[Utils.getRolEnFecha(b, _h)]||0) - (w[Utils.getRolEnFecha(a, _h)]||0))*sd; 
                    }
                    return (a[sk]||'').localeCompare(b[sk]||'')*sd; 
                });
                const _hoy = new Date().toISOString().slice(0,10);
                list.forEach((e, idx) => {
                    const isSel = App.uiState.selectedId===e.id?'selected':'';
                    const inactiveClass = !e.active ? 'row-inactive' : '';
                    const dragAttrs = (App.uiState.sortKey === 'custom' && e.active) ? `draggable="true" ondragstart="App.logic.dragStart(event, ${idx}, 'emp')" ondragover="App.logic.dragOver(event)" ondrop="App.logic.drop(event, ${idx}, 'emp')"` : '';
                    html+=`<tr class="${isSel} ${inactiveClass}" onclick="App.logic.empSelect('${e.id}')" ${dragAttrs}><td class="drag-handle">${e.active?'☰':''}</td><td style="font-weight:500">${!e.active?'🚫 ':''} ${e.nombre}</td>`;
                    if(!isPrefs) {
                        const rolHoy = Utils.getRolEnFecha(e, _hoy);
                        const tag = e.tag || (['MNG','AM','SPV'].includes(rolHoy) ? 3 : 1);
                        const contratoActual = Utils.getContrato(e, _hoy);
                        const pct = Math.min(100, (contratoActual / 40) * 100); const color = contratoActual>=40?'#22c55e':'#f97316'; const bg=`conic-gradient(${color} ${pct}%, #f1f5f9 0)`;
                        const tieneHistorial = e.contratos && e.contratos.length > 0;
                        const desvioAcum = App.ui._calcDesvioAcum(e);
                        const dColor = desvioAcum > 0.5 ? '#f59e0b' : desvioAcum < -0.5 ? '#3b82f6' : '#10b981';
                        const dSign = desvioAcum > 0 ? '+' : '';
                        const festivosPend = App.ui._calcFestivosPend(e);
                        const fColor = festivosPend > 0 ? '#ef4444' : '#10b981';
                        html+=`<td style="text-align:center;"><span class="badge badge-role">${rolHoy}</span></td><td style="text-align:center;"><span class="badge badge-tag">T${tag}</span></td><td style="text-align:center;"><div class="contract-chart" style="background:${bg}; display:inline-block;"></div>${contratoActual}h${tieneHistorial?'<sup style="font-size:0.55rem;color:#94a3b8;margin-left:2px;">📋</sup>':''}</td><td style="text-align:center; font-family:monospace; font-weight:700; color:${dColor};">${dSign}${desvioAcum}h</td><td style="text-align:center; font-weight:700; color:${fColor};">${festivosPend > 0 ? festivosPend + ' ⚠' : '✓'}</td>`;
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
            <button type="button" onclick="App.uiState.empInspTab='ajustes'; App.ui.renderEmpInspector('${id}')" 
                style="flex:1; white-space:nowrap; padding:8px 12px; border:none; border-radius:6px; font-size:10px; font-weight:700; cursor:pointer; background:${tab==='ajustes'?'white':'transparent'}; box-shadow:${tab==='ajustes'?'0 1px 3px rgba(0,0,0,0.1)':'none'}">AJUSTES</button>
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
                    <div style="background:#f8fafc; color:#334155; font-weight:700; font-size:13px; height:42px; display:flex; align-items:center; padding:0 12px; border-radius:6px; border:1px solid #e2e8f0;">${({'MNG':'Manager','AM':'Asst. Manager','SPV':'Supervisor','STF':'Staff'})[Utils.getRolEnFecha(e, hoy)] || 'Staff'}</div>
                    <input type="hidden" id="ie-rol" value="${Utils.getRolEnFecha(e, hoy)}">
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
                    ${(function(){
                        // Normalizar: asegurar que cada tramo tiene su propio rol
                        e.contratos.forEach(t => { if(!t.rol) { t.rol = e.rol || 'STF'; } });
                        return e.contratos.map((t, i) => {
                        const tRol = t.rol || 'STF';
                        return `
                        <div style="background:#f8fafc; padding:6px 8px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:6px;">
                            <div style="display:grid; grid-template-columns: 1fr 1fr auto; gap:6px; align-items:start; margin-bottom:5px;">
                                <div>${Utils.getDateInputHTML('contrato-desde-' + i, t.desde, 'App.logic.updateContrato(\'' + id + '\', ' + i + ', \'desde\', this.dataset.isoValue); App.ui.markDirty();')}</div>
                                <div>${Utils.getDateInputHTML('contrato-hasta-' + i, t.hasta || '', 'App.logic.updateContrato(\'' + id + '\', ' + i + ', \'hasta\', this.dataset.isoValue); App.ui.markDirty();')}</div>
                                <button type="button" onclick="App.logic.removeContrato('${id}', ${i}); App.ui.markDirty();" style="border:none; background:none; color:#ef4444; font-size:16px; cursor:pointer; line-height:1; padding:4px 2px; margin-top:1px;" title="Eliminar tramo">&times;</button>
                            </div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:6px;">
                                <select onchange="App.logic.updateContrato('${id}', ${i}, 'rol', this.value); App.ui.markDirty();" style="width:100%; font-size:11px; font-weight:700; color:#334155; border:1px solid #cbd5e1; border-radius:4px; padding:4px 6px; background:white;">
                                    <option value="MNG" ${tRol==='MNG'?'selected':''}>Manager</option>
                                    <option value="AM" ${tRol==='AM'?'selected':''}>Asst. Manager</option>
                                    <option value="SPV" ${tRol==='SPV'?'selected':''}>Supervisor</option>
                                    <option value="STF" ${tRol==='STF'?'selected':''}>Staff</option>
                                </select>
                                <div style="display:flex; align-items:center; gap:4px;">
                                    <input type="number" step="0.01" value="${toDec(t.horas)}" onchange="App.logic.updateContrato('${id}', ${i}, 'horas', this.value); App.ui.markDirty();" style="width:100%; text-align:right; font-weight:800; font-size:12px; color:#2563eb; border:1px solid #2563eb; border-radius:4px; padding:4px 6px;">
                                    <span style="font-size:10px; color:#94a3b8; white-space:nowrap;">h/sem</span>
                                </div>
                            </div>
                        </div>`;
                    }).join(''); })()}
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
    else if (tab === 'ajustes') {
        content = (typeof App.ui.renderEmpAjustesInspector === 'function') ? App.ui.renderEmpAjustesInspector(e) : `<div>Error Ajustes</div>`;
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

            const desvioBase  = rows.length ? rows[rows.length-1].acum : (emp.saldoInicial||0);
            const ajusteTotal = Math.round(((emp.ajustes||[]).reduce((s,a) => s + a.signo * a.horas, 0)) * 10) / 10;
            const totalFinal  = Math.round((desvioBase + ajusteTotal) * 10) / 10;
            const totalColor  = totalFinal > 0.5 ? '#f59e0b' : totalFinal < -0.5 ? '#3b82f6' : '#10b981';
            const baseColor   = desvioBase > 0.5 ? '#f59e0b' : desvioBase < -0.5 ? '#3b82f6' : '#10b981';
            const ajColor     = ajusteTotal > 0 ? '#f59e0b' : ajusteTotal < 0 ? '#3b82f6' : '#94a3b8';
            const barScale    = maxAbs > 0 ? maxAbs : 1;
            const sg = n => (n > 0 ? '+' : '') + n + 'h';

            const rangeLabel = weeks.length > 0
                ? `${Utils.getWeekCode(weeks[0])} → ${Utils.getWeekCode(weeks[weeks.length-1])}`
                : '—';

            let html = `<div style="padding:10px 12px; background:#f8fafc; border:1px solid var(--border); border-radius:8px; margin-bottom:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${ajusteTotal !== 0 ? '8px' : '0'};">
                    <div>
                        <div style="font-size:0.65rem; color:var(--text-muted); font-weight:700; text-transform:uppercase; margin-bottom:2px;">🔒 Semanas cerradas</div>
                        <div style="font-size:0.72rem; color:var(--text-main); font-family:monospace;">${rangeLabel} · ${weeks.length} sem.</div>
                    </div>
                    <div style="font-size:1.2rem; font-weight:800; color:${totalColor};">${sg(totalFinal)}</div>
                </div>
                ${ajusteTotal !== 0 ? `
                <div style="display:flex; gap:6px; padding-top:7px; border-top:1px solid #e2e8f0;">
                    <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; text-align:center;">
                        <div style="font-size:0.6rem; color:#94a3b8; text-transform:uppercase; font-weight:700; margin-bottom:2px;">Desvío semanas</div>
                        <div style="font-family:monospace; font-weight:800; font-size:0.85rem; color:${baseColor};">${sg(desvioBase)}</div>
                    </div>
                    <div style="display:flex; align-items:center; color:#cbd5e1; font-size:0.8rem;">+</div>
                    <div style="flex:1; background:white; border:1px solid #e2e8f0; border-radius:6px; padding:5px 8px; text-align:center;">
                        <div style="font-size:0.6rem; color:#94a3b8; text-transform:uppercase; font-weight:700; margin-bottom:2px;">Ajustes</div>
                        <div style="font-family:monospace; font-weight:800; font-size:0.85rem; color:${ajColor};">${sg(ajusteTotal)}</div>
                    </div>
                </div>` : ''}
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

            // Fila saldo arrastre — ahora se pinta al final (ver más abajo)
            

            rows.slice().reverse().forEach(r => {
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

            // Saldo arrastre al final (es el punto de partida cronológico)
            const saldo = emp.saldoInicial || 0;
            if(saldo !== 0) {
                const sc = saldo > 0 ? '#f59e0b' : '#3b82f6';
                html += `<tr style="background:#fefce8; border-top:1px solid #fef08a;">
                    <td colspan="3" style="padding:5px 4px; font-size:0.72rem; color:#92400e; font-weight:600; font-style:italic;">⟵ Saldo arrastre</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${sc};">${saldo>0?'+':''}${saldo}h</td>
                    <td style="text-align:right; padding:5px 4px; font-family:monospace; font-weight:700; color:${sc};">${saldo>0?'+':''}${saldo}h</td>
                </tr>`;
            }

            html += `<tr style="background:#f8fafc; border-top:2px solid var(--border); font-weight:700;">
                <td colspan="3" style="padding:6px 4px; font-size:0.72rem;">TOTAL SEMANAS</td>
                <td style="text-align:right; padding:6px 4px; font-family:monospace; color:${baseColor};">${sg(desvioBase)}</td>
                <td style="text-align:right; padding:6px 4px; font-family:monospace; color:${baseColor};">${sg(desvioBase)}</td>
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
        if(shift.fixed && shift.code === 'V') return 'disfrutado';
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
    const allRsSet = new Set(allRs);

    // --- Clasificación y Procesamiento ---
    let adeudadas = 0, dadas = 0;
    let pendientesData = [];
    let cerradosData = [];

    holidays.forEach(h => {
        const estado = getEstado(h.date);
        const tr = tracking[h.date] || {};
        // rDate válida solo si la R aún existe en el schedule
        const rDateValida = tr.rDate && allRsSet.has(tr.rDate);
        const isResuelto = (estado === 'disfrutado') || rDateValida;

        if(estado === 'coincide' || estado === 'trabaja') adeudadas++;
        if(rDateValida) dadas++;

        const itemHtml = this.renderFestivoItemRow(emp, h, estado, tr, allRs, assignedRDates);
        
        if (isResuelto) {
            cerradosData.push({ date: h.date, html: itemHtml });
        } else {
            pendientesData.push({ date: h.date, html: itemHtml });
        }
    });

    // --- ORDENACIÓN: ambas secciones de más antiguo a más reciente ---
    pendientesData.sort((a, b) => a.date.localeCompare(b.date));
    cerradosData.sort((a, b) => a.date.localeCompare(b.date));

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

// Función auxiliar para renderizar cada tarjeta de festivo
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
});

// RENDER AJUSTES INSPECTOR
Object.assign(App.ui, {
    renderEmpAjustesInspector: function(emp) {
        const ajustes = (emp.ajustes || []).slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
        const f = (n) => (n > 0 ? '+' : '') + n.toFixed(2).replace('.00','');

        // Totales
        const sumaPos = ajustes.filter(a => a.signo === 1).reduce((s, a) => s + a.horas, 0);
        const sumaNeg = ajustes.filter(a => a.signo === -1).reduce((s, a) => s + a.horas, 0);
        const neto    = Math.round((sumaPos - sumaNeg) * 100) / 100;
        const netoColor = neto > 0 ? '#f59e0b' : neto < 0 ? '#3b82f6' : '#10b981';

        // Recoge todos los motivos usados para el datalist
        const motivosUsados = [...new Set(ajustes.map(a => a.motivo).filter(Boolean))];
        const datalistId = 'ajuste-motivos-dl';

        // Lista de ajustes
        let listaHtml = '';
        if(ajustes.length === 0) {
            listaHtml = `<div style="padding:16px; text-align:center; color:#94a3b8; font-size:0.75rem; border:1px dashed #e2e8f0; border-radius:8px; margin-bottom:12px;">No hay ajustes registrados.</div>`;
        } else {
            listaHtml = `
            <table style="width:100%; border-collapse:collapse; font-size:0.72rem; margin-bottom:12px;">
                <thead>
                    <tr style="background:#f8fafc; border-bottom:2px solid #e2e8f0;">
                        <th style="padding:6px 8px; text-align:left; font-weight:800; color:#64748b; text-transform:uppercase; font-size:0.62rem;">Fecha</th>
                        <th style="padding:6px 8px; text-align:left; font-weight:800; color:#64748b; text-transform:uppercase; font-size:0.62rem;">Motivo</th>
                        <th style="padding:6px 4px; text-align:right; font-weight:800; color:#64748b; text-transform:uppercase; font-size:0.62rem;">Horas</th>
                        <th style="padding:6px 4px; text-align:center; font-weight:800; color:#64748b; text-transform:uppercase; font-size:0.62rem; width:50px;"></th>
                    </tr>
                </thead>
                <tbody>
                    ${ajustes.map(a => {
                        const color = a.signo === 1 ? '#f59e0b' : '#3b82f6';
                        const signoIcon = a.signo === 1 ? '▲' : '▼';
                        const horaStr = (a.horaInicio && a.horaFin) ? `<br><span style="color:#94a3b8; font-size:0.62rem;">${a.horaInicio}–${a.horaFin}</span>` : '';
                        const fechaFmt = a.fecha ? a.fecha.slice(8,10)+'/'+a.fecha.slice(5,7)+'/'+a.fecha.slice(2,4) : '—';
                        return `
                        <tr style="border-bottom:1px solid #f1f5f9;">
                            <td style="padding:6px 8px; white-space:nowrap;">${fechaFmt}${horaStr}</td>
                            <td style="padding:6px 8px; color:#334155; max-width:110px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${a.motivo||''}">${a.motivo || '<span style="color:#cbd5e1;">—</span>'}</td>
                            <td style="padding:6px 4px; text-align:right; font-family:monospace; font-weight:800; color:${color}; white-space:nowrap;">${signoIcon} ${a.horas}h</td>
                            <td style="padding:4px; text-align:center; white-space:nowrap;">
                                <button onclick="App.logic.ajusteEditLoad('${emp.id}','${a.id}')" title="Editar" style="border:none; background:none; cursor:pointer; color:#64748b; font-size:13px; padding:2px 3px;">✏️</button>
                                <button onclick="App.logic.ajusteDel('${emp.id}','${a.id}')" title="Borrar" style="border:none; background:none; cursor:pointer; color:#ef4444; font-size:13px; padding:2px 3px;">🗑</button>
                            </td>
                        </tr>`;
                    }).join('')}
                </tbody>
            </table>
            <div style="display:flex; gap:8px; font-size:0.7rem; font-weight:700; padding:6px 8px; background:#f8fafc; border-radius:6px; margin-bottom:12px; border:1px solid #e2e8f0;">
                <span style="color:#10b981;">▲ +${sumaPos.toFixed(2).replace('.00','')}h</span>
                <span style="color:#94a3b8;">·</span>
                <span style="color:#3b82f6;">▼ −${sumaNeg.toFixed(2).replace('.00','')}h</span>
                <span style="color:#94a3b8; margin-left:auto;">Neto:</span>
                <span style="color:${netoColor}; font-family:monospace;">${f(neto)}h</span>
            </div>`;
        }

        // Formulario
        const formHtml = `
        <div id="ajuste-form" style="display:none; background:#f8fafc; border:1px solid #e2e8f0; border-radius:10px; padding:14px; margin-bottom:12px;">
            <div style="font-size:10px; font-weight:800; color:#64748b; text-transform:uppercase; margin-bottom:12px;">Nuevo ajuste</div>
            <input type="hidden" id="ajuste-edit-id">
            <datalist id="${datalistId}">
                ${motivosUsados.map(m => `<option value="${m}">`).join('')}
            </datalist>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <div>
                    <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:3px;">Fecha *</label>
                    <input type="date" id="ajuste-fecha" style="width:100%; padding:7px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:3px;">Horas *</label>
                    <input type="number" id="ajuste-horas" min="0.25" step="0.25" placeholder="ej: 1.5"
                           style="width:100%; padding:7px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; box-sizing:border-box; font-weight:700;">
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:8px;">
                <div>
                    <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:3px;">Hora inicio <span style="color:#cbd5e1;">(opc.)</span></label>
                    <input type="time" id="ajuste-inicio" oninput="App.logic._ajusteCalcHoras()"
                           style="width:100%; padding:7px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; box-sizing:border-box;">
                </div>
                <div>
                    <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:3px;">Hora fin <span style="color:#cbd5e1;">(opc.)</span></label>
                    <input type="time" id="ajuste-fin" oninput="App.logic._ajusteCalcHoras()"
                           style="width:100%; padding:7px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; box-sizing:border-box;">
                </div>
            </div>

            <div style="margin-bottom:8px;">
                <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:3px;">Motivo <span style="color:#cbd5e1;">(opc.)</span></label>
                <input type="text" id="ajuste-motivo" list="${datalistId}" placeholder="ej: Curso Teams, Ausencia no justificada..."
                       style="width:100%; padding:7px 8px; border:1px solid #e2e8f0; border-radius:6px; font-size:12px; box-sizing:border-box;">
            </div>

            <div style="margin-bottom:12px;">
                <label style="display:block; font-size:10px; font-weight:700; color:#64748b; margin-bottom:6px;">Efecto en el desvío</label>
                <div style="display:flex; gap:8px;">
                    <label style="flex:1; display:flex; align-items:center; gap:6px; padding:8px 10px; border:2px solid #fde68a; border-radius:6px; cursor:pointer; background:#fefce8;">
                        <input type="radio" name="ajuste-signo" value="1" checked style="accent-color:#f59e0b;">
                        <span style="font-size:11px; font-weight:700; color:#92400e;">▲ Suma horas</span>
                    </label>
                    <label style="flex:1; display:flex; align-items:center; gap:6px; padding:8px 10px; border:2px solid #bfdbfe; border-radius:6px; cursor:pointer; background:#eff6ff;">
                        <input type="radio" name="ajuste-signo" value="-1" style="accent-color:#3b82f6;">
                        <span style="font-size:11px; font-weight:700; color:#1e40af;">▼ Resta horas</span>
                    </label>
                </div>
            </div>

            <div style="display:flex; gap:8px;">
                <button onclick="document.getElementById('ajuste-form').style.display='none'; document.getElementById('ajuste-edit-id').value='';"
                        style="flex:1; padding:9px; border:1px solid #e2e8f0; border-radius:6px; background:white; cursor:pointer; font-size:11px; font-weight:700; color:#64748b;">
                    Cancelar
                </button>
                <button onclick="App.logic.ajusteSave('${emp.id}')"
                        style="flex:2; padding:9px; border:none; border-radius:6px; background:#2563eb; color:white; cursor:pointer; font-size:11px; font-weight:800;">
                    💾 Guardar ajuste
                </button>
            </div>
        </div>`;

        return `
        <div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:11px; font-weight:800; color:#64748b; text-transform:uppercase;">⚙️ Ajustes de horas</span>
                <button onclick="
                    const f=document.getElementById('ajuste-form');
                    const isOpen=f.style.display!=='none';
                    f.style.display=isOpen?'none':'block';
                    document.getElementById('ajuste-edit-id').value='';
                    document.getElementById('ajuste-fecha').value='';
                    document.getElementById('ajuste-inicio').value='';
                    document.getElementById('ajuste-fin').value='';
                    document.getElementById('ajuste-horas').value='';
                    document.getElementById('ajuste-horas').readOnly=false;
                    document.getElementById('ajuste-horas').style.background='white';
                    document.getElementById('ajuste-motivo').value='';
                    document.querySelector('input[name=ajuste-signo][value=\\'1\\']').checked=true;
                " style="background:#2563eb; color:white; border:none; padding:6px 12px; border-radius:6px; font-size:11px; font-weight:800; cursor:pointer;">+ Nuevo</button>
            </div>
            ${formHtml}
            ${listaHtml}
        </div>`;
    }
});
