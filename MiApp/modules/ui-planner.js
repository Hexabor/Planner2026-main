// ============================================================
// UI: Planificador: inspector, monitor (balance, findes, hourly, equilibrio)
// ============================================================

Object.assign(App.ui, {
        inspectorEmpty: function() { 
            document.getElementById('inspector-content').innerHTML = `<div style="text-align:center;margin-top:100px;color:#cbd5e1;"><p>Selecciona un elemento.</p></div>`; 
        },

        // --- PLANNER INSPECTOR ---
        // EXTENSIBLE MODULE SYSTEM:
        // To add new modules, simply add them to the tabs array below.
        // Each module should have its own render function (e.g., renderModuleX)
        // Example future modules:
        //   - {id: 'coverage', icon: '👥', title: 'Cobertura'} → renderModuleCoverage()
        //   - {id: 'costs', icon: '💰', title: 'Costes'} → renderModuleCosts()
        //   - {id: 'alerts', icon: '⚠️', title: 'Alertas'} → renderModuleAlerts()
        //   - {id: 'stats', icon: '📈', title: 'Estadísticas'} → renderModuleStats()
        
        renderPlannerInspector: function(c) {
            const _ic = (path, vb) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb||'0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
            const tabs = [
                { id: 'charts',    label: 'Gráficos',  icon: _ic('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>') },
                { id: 'balance',   label: 'Balance',   icon: _ic('<line x1="3" y1="12" x2="21" y2="12"/><path d="M3 6h18M3 18h18"/>') },
                { id: 'eventos',   label: 'Eventos',   icon: _ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>') },
                { id: 'findes',    label: 'Fines',     icon: _ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>') },
                { id: 'festdom',   label: 'Festivos',  icon: _ic('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>') },
                { id: 'equilibrio',label: 'Equilibrio',icon: _ic('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>') },
            ];
            
            let html = `<div class="monitor-tabs">`;
            tabs.forEach(t => {
                const active = App.uiState.monitorTab === t.id ? 'active' : '';
                html += `<div class="monitor-tab ${active}" title="${t.label}" onclick="App.uiState.monitorTab='${t.id}'; App.ui.renderPlannerInspector(document.getElementById('inspector-content'))">${t.icon}<span class="monitor-tab-label">${t.label}</span></div>`;
            });
            html += `</div><div style="padding:0">`;

            // NUEVO CONDICIONAL PARA LOS FINDES
            if(App.uiState.monitorTab === 'findes') {
                html += App.ui.renderMonitorFindes();
            } else if(App.uiState.monitorTab === 'festdom') {
                html += App.ui.renderMonitorFestDom();
            } else if(App.uiState.monitorTab === 'balance') {
                html += App.ui.renderMonitorBalance();
            } else if(App.uiState.monitorTab === 'charts') {
                // Charts tab: Daily + Hourly together
                html += `<div style="display:flex; flex-direction:column; height:100%; overflow-y:auto;">`;
                html += App.ui.renderMonitorDaily();
                html += `<div style="height:1px; background:var(--border); margin:15px 0;"></div>`;
                html += App.ui.renderMonitorHourly();
                html += `</div>`;
            } else if(App.uiState.monitorTab === 'equilibrio') {
                html += App.ui.renderMonitorEquilibrio();
            } else if(App.uiState.monitorTab === 'eventos') {
                html += App.ui.renderMonitorEventos();
            }
            // Add more module renderers here as they're created
            
            html += `</div>`;
            c.innerHTML = html;
            
            // Aplicar escalado inmediatamente (con try-catch para evitar bloqueos)
            try {
                if(typeof scaleInspector === 'function') {
                    scaleInspector();
                }
            } catch(e) {
                console.warn('Error scaling inspector:', e);
            }
        },

        renderMonitorFindes: function() {
            // 1. OBTENER FECHAS Y EMPLEADOS
            const currentDate = App.uiState.currentDate;
            const currentMondayStr = Utils.getMonday(currentDate);
            
            // Helper para sumar/restar días matemáticamente
            const addDays = (dateStr, days) => {
                const d = new Date(dateStr);
                d.setDate(d.getDate() + days);
                const year = d.getFullYear();
                const month = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            // Filtrar y ordenar empleados
            let empList = App.data.empleados.filter(e => e.active !== false).sort((a,b) => {
                const sk = App.uiState.sortKey || 'custom';
                if(sk === 'custom') return a.customOrder - b.customOrder;
                if(sk === 'contrato') return b.contrato - a.contrato;
                if(sk === 'rol') { 
                    const w = {"MNG":5,"AM":4,"SPV":3,"STF":2}; 
                    return (w[b.rol]||0) - (w[a.rol]||0); 
                }
                return (a[sk]||'').localeCompare(b[sk]||'');
            });

            // 2. GENERAR CABECERAS DINÁMICAS (Ahora con padding 0 y doble dígito)
            let html = `
            <div style="padding: 15px; overflow-x: auto;">
                <h3 style="margin-top: 0; font-size: 0.95rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Rotación de Fines de Semana (12W)</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 0.7rem; text-align: center; table-layout: auto;">
                    <thead>
                        <tr style="border-bottom: 2px solid #cbd5e1; color: #64748b;">
                            <th style="text-align: left; padding: 4px 2px; font-weight: 600;">Nombre</th>`;
            
            // Bucle: 00 = semana actual, -01 a -11 = semanas anteriores
            for (let w = 0; w <= 11; w++) {
                const label = w === 0 ? `<span style="color:#2563eb;font-weight:700;">↓</span>` : `-${String(w).padStart(2, '0')}`;
                const titleAttr = w === 0 ? 'Semana actual' : `Hace ${w} semana(s)`;
                html += `<th style="padding: 4px 0; min-width: 24px; width: 24px;" title="${titleAttr}">${label}</th>`;
            }
            
            html += `   <th style="padding: 4px 2px; min-width: 32px; width: 32px; font-size:0.6rem;" title="Sábados / Domingos trabajados (12 semanas)">Σ</th>
                        </tr>
                    </thead>
                    <tbody>`;

            // Helper para pintar el dadito (Huecos, Sólidos y grises para Custom)
            const getSquare = (dateStr, empId, dayName) => {
                const shiftId = App.data.schedule[dateStr] ? App.data.schedule[dateStr][empId] : null;
                
                let bg = '#f1f5f9'; 
                let border = '#e2e8f0';
                let borderThickness = '1px';
                let title = `${dayName}: Sin datos`;

                if (shiftId) {
                    const shift = Utils.getShift(shiftId);
                    if (shift) {
                        const isCustom = typeof Utils.isCustomShift === 'function' ? Utils.isCustomShift(shift) : (!shift.fixed && !shift.color && shift.start);

                        if (isCustom) {
                            bg = '#cbd5e1'; 
                            border = '#94a3b8'; 
                            borderThickness = '1px';
                            const hoursStr = (shift.start && shift.end) ? ` (${shift.start.substring(0,5)}-${shift.end.substring(0,5)})` : '';
                            title = `${dayName}: Custom${hoursStr}`;
                        } else {
                            bg = shift.color || '#3b82f6';
                            border = shift.color || '#2563eb';
                            borderThickness = '1px';
                            title = `${dayName}: ${shift.code || 'Turno'}`;
                        }
                        
                        // Huecos para ausencias
                        if (['L', 'F', 'R'].includes(shift.code)) {
                            bg = 'transparent'; 
                            border = '#22c55e'; // Verde
                            borderThickness = '2px';
                            title = `${dayName}: ${shift.code}`;
                        } else if (shift.code === 'V') {
                            bg = 'transparent'; 
                            border = '#a855f7'; // Violeta
                            borderThickness = '2px';
                            title = `${dayName}: Vacaciones`;
                        } else if (['B', 'P'].includes(shift.code)) {
                            bg = 'transparent'; 
                            border = '#ef4444'; // Rojo
                            borderThickness = '2px';
                            title = `${dayName}: ${shift.code === 'B' ? 'Baja' : 'Permiso'}`;
                        }
                    }
                }
                
                return `<div style="width:12px;height:12px;background:${bg};border:${borderThickness} solid ${border};border-radius:2px;box-sizing:border-box;margin:0 auto;" title="${title}"></div>`;
            };

            // Helper para detectar si un día fue "trabajado" (turno con horas, no ausencia)
            const isWorked = (dateStr, empId) => {
                const shiftId = App.data.schedule[dateStr] ? App.data.schedule[dateStr][empId] : null;
                if(!shiftId) return false;
                const shift = Utils.getShift(shiftId);
                if(!shift) return false;
                if(shift.fixed && ['L','F','R','V','B','P','DH'].includes(shift.code)) return false;
                return true;
            };

            // 3. RELLENAR FILAS DE EMPLEADOS VIAJANDO EN EL TIEMPO
            empList.forEach(e => {
                html += `<tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="text-align: left; padding: 7px 2px; color: #334155; font-weight: 600; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.nombre}">${e.nombre}</td>`;
                
                let countSab = 0, countDom = 0;
                for (let w = 0; w <= 11; w++) {
                    const targetMonday = addDays(currentMondayStr, -(w * 7));
                    const sabadoStr = addDays(targetMonday, 5);
                    const domingoStr = addDays(targetMonday, 6);
                    
                    if(isWorked(sabadoStr, e.id)) countSab++;
                    if(isWorked(domingoStr, e.id)) countDom++;

                    const sqSab = getSquare(sabadoStr, e.id, 'Sáb');
                    const sqDom = getSquare(domingoStr, e.id, 'Dom');
                    
                    const isCurrentWeek = w === 0;
                    html += `<td style="padding: 7px 0; text-align: center;${isCurrentWeek ? ' background:#eff6ff; border-radius:3px;' : ''}">
                                <div style="display:flex;flex-direction:column;gap:1px;align-items:center;justify-content:center;">
                                    ${sqSab}
                                    ${sqDom}
                                </div>
                             </td>`;
                }
                // Columna resumen S/D — umbrales: ≤6 gris, 7-8 verde, 9-10 naranja, 11-12 rojo
                const getCountColor = (n) => n >= 11 ? '#ef4444' : n >= 9 ? '#f59e0b' : n >= 7 ? '#22c55e' : '#64748b';
                const sabColor = getCountColor(countSab);
                const domColor = getCountColor(countDom);
                html += `<td style="padding: 4px 2px; text-align: center; border-left: 1px solid #e2e8f0;">
                            <div style="display:flex; flex-direction:column; gap:1px; align-items:center; font-size:0.6rem; font-weight:700; line-height:1.3;">
                                <span style="color:${sabColor};" title="${countSab} sábados trabajados de 12">S:${countSab}</span>
                                <span style="color:${domColor};" title="${countDom} domingos trabajados de 12">D:${countDom}</span>
                            </div>
                         </td>`;
                html += `</tr>`;
            });

            if (empList.length === 0) {
                html += `<tr><td colspan="14" style="padding: 15px; color: #94a3b8;">No hay empleados activos.</td></tr>`;
            }

            html += `   </tbody>
                </table>
                <div style="margin-top: 15px; margin-bottom: 15px; font-size: 0.7rem; color: #64748b; text-align: center; font-weight: bold;">
                    Cuadrado superior = Sábado | Cuadrado inferior = Domingo
                </div>
            </div>`;

            // 4. LEYENDA
            html += `<div style="padding:10px 12px; background:#f8fafc; border-top:1px solid var(--border); font-size:0.65rem; color:var(--text-muted); line-height:1.6; margin: 0 15px 15px 15px; border-radius: 4px;">
                <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.leyenda-arrow').textContent = this.nextElementSibling.style.display === 'none' ? '▸' : '▾';"
                    style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; padding:2px 0 6px 0; color:#475569; font-weight:700; font-size:0.7rem;">
                    <span>LEYENDA DE FINES DE SEMANA</span>
                    <span class="leyenda-arrow" style="font-size:0.65rem; color:#94a3b8;">▸</span>
                </div>
                <div style="display:none;">
                    <div style="margin-bottom:4px; margin-top: 6px;">
                        <div style="display:grid; grid-template-columns: 20px 1fr; gap:6px 8px; align-items:center;">
                            <div style="display:flex;flex-direction:column;gap:1px;align-items:center;"><div style="width:10px;height:10px;background:transparent;border:2px solid #22c55e;border-radius:2px;box-sizing:border-box;"></div><div style="width:10px;height:10px;background:transparent;border:2px solid #22c55e;border-radius:2px;box-sizing:border-box;"></div></div>
                            <span>Finde libre (Huecos)</span>
                            
                            <div style="display:flex;flex-direction:column;gap:1px;align-items:center;"><div style="width:10px;height:10px;background:#3b82f6;border:1px solid #2563eb;border-radius:2px;box-sizing:border-box;"></div><div style="width:10px;height:10px;background:#3b82f6;border:1px solid #2563eb;border-radius:2px;box-sizing:border-box;"></div></div>
                            <span>Trabajó los dos días (Sólidos)</span>
                            
                            <div style="display:flex;flex-direction:column;gap:1px;align-items:center;"><div style="width:10px;height:10px;background:#cbd5e1;border:1px solid #94a3b8;border-radius:2px;box-sizing:border-box;"></div><div style="width:10px;height:10px;background:transparent;border:2px solid #22c55e;border-radius:2px;box-sizing:border-box;"></div></div>
                            <span>Trabajó sábado pero libró el domingo</span>
                        </div>
                    </div>
                </div>
            </div>`;

            return html;
        },

        renderMonitorFestDom: function() {
            const currentDate = App.uiState.currentDate;
            
            // Recopilar todos los domingos y festivos hasta la fecha actual (incluida)
            // y quedarnos con los últimos 6
            const allDates = [];
            
            // Límite: hasta el domingo de la semana en estudio (puede ser futuro)
            const currentMonday = Utils.getMonday(currentDate);
            const addDays = (dateStr, days) => {
                const d = new Date(dateStr);
                d.setDate(d.getDate() + days);
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const dd = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${dd}`;
            };
            const currentSunday = addDays(currentMonday, 6);
            
            // 1. Recoger festivos del calendario que estén <= domingo de la semana actual
            (App.data.storeConfig.holidays || []).forEach(h => {
                if(h.date <= currentSunday) {
                    allDates.push({ date: h.date, type: 'festivo', label: h.name || 'Festivo' });
                }
            });
            
            // 2. Recoger domingos: desde el de la semana actual hacia atrás (máx ~26 semanas)
            for(let i = 0; i < 26; i++) {
                const sun = addDays(currentSunday, -(i * 7));
                // Solo añadir si no es ya un festivo (evitar duplicados)
                if(!allDates.find(d => d.date === sun)) {
                    allDates.push({ date: sun, type: 'domingo', label: 'Domingo' });
                }
            }
            
            // Ordenar por fecha descendente (reciente primero) y coger los 6 más recientes
            allDates.sort((a, b) => b.date.localeCompare(a.date));
            const last6 = allDates.slice(0, 8); // reciente a la izquierda, antiguo a la derecha
            
            // Empleados activos
            let empList = App.data.empleados.filter(e => e.active !== false).sort((a,b) => {
                const sk = App.uiState.sortKey || 'custom';
                if(sk === 'custom') return a.customOrder - b.customOrder;
                if(sk === 'contrato') return b.contrato - a.contrato;
                if(sk === 'rol') { 
                    const w = {"MNG":5,"AM":4,"SPV":3,"STF":2}; 
                    return (w[b.rol]||0) - (w[a.rol]||0); 
                }
                return (a[sk]||'').localeCompare(b[sk]||'');
            });
            
            // Helper para detectar trabajado
            const isWorked = (dateStr, empId) => {
                const shiftId = App.data.schedule[dateStr] ? App.data.schedule[dateStr][empId] : null;
                if(!shiftId) return false;
                const shift = Utils.getShift(shiftId);
                if(!shift) return false;
                if(shift.fixed && ['L','F','R','V','B','P','DH'].includes(shift.code)) return false;
                return true;
            };
            
            // Helper cuadrado
            const getSquare = (dateStr, empId, info) => {
                const shiftId = App.data.schedule[dateStr] ? App.data.schedule[dateStr][empId] : null;
                let bg = '#f1f5f9'; 
                let border = '#e2e8f0';
                let borderThickness = '1px';
                let title = `${info.label} (${Utils.formatDateES(dateStr)}): Sin datos`;
                
                if(shiftId) {
                    const shift = Utils.getShift(shiftId);
                    if(shift) {
                        const isCustom = typeof Utils.isCustomShift === 'function' ? Utils.isCustomShift(shift) : (!shift.fixed && !shift.color && shift.start);
                        if(isCustom) {
                            bg = '#cbd5e1'; border = '#94a3b8';
                            title = `${info.label} (${Utils.formatDateES(dateStr)}): Custom`;
                        } else {
                            bg = shift.color || '#3b82f6'; border = shift.color || '#2563eb';
                            title = `${info.label} (${Utils.formatDateES(dateStr)}): ${shift.code || 'Turno'}`;
                        }
                        if(['L','F','R'].includes(shift.code)) { bg = 'transparent'; border = '#22c55e'; borderThickness = '2px'; title = `${info.label} (${Utils.formatDateES(dateStr)}): ${shift.code}`; }
                        else if(shift.code === 'V') { bg = 'transparent'; border = '#a855f7'; borderThickness = '2px'; title = `${info.label} (${Utils.formatDateES(dateStr)}): Vacaciones`; }
                        else if(['B','P'].includes(shift.code)) { bg = 'transparent'; border = '#ef4444'; borderThickness = '2px'; title = `${info.label} (${Utils.formatDateES(dateStr)}): ${shift.code === 'B' ? 'Baja' : 'Permiso'}`; }
                    }
                }
                return `<div style="width:16px;height:16px;background:${bg};border:${borderThickness} solid ${border};border-radius:3px;box-sizing:border-box;margin:0 auto;" title="${title}"></div>`;
            };
            
            // Header
            let html = `<div style="padding: 15px;">
                <h3 style="margin-top: 0; font-size: 0.95rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">🐷 Domingos y Festivos (últimos 8)</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 0.75rem; text-align: center; table-layout: auto;">
                    <thead><tr style="border-bottom: 2px solid #cbd5e1; color: #64748b;">
                        <th style="text-align: left; padding: 6px 2px; font-weight: 600;">Nombre</th>`;
            
            last6.forEach(info => {
                const dayNum = info.date.split('-')[2];
                const month = info.date.split('-')[1];
                const icon = info.type === 'festivo' ? '🎉' : 'D';
                const colTitle = `${info.label} — ${dayNum}/${month}`;
                html += `<th style="padding: 6px 0; min-width: 32px; width: 32px;" title="${colTitle}">
                    <div style="font-size:0.65rem; line-height:1.2;">${icon}</div>
                    <div style="font-size:0.6rem; color:#94a3b8;">${dayNum}/${month}</div>
                </th>`;
            });
            
            html += `<th style="padding: 6px 2px; min-width: 32px; width: 32px; font-size:0.65rem;" title="Total trabajados de ${last6.length}">Σ</th>`;
            html += `</tr></thead><tbody>`;
            
            // Filas
            empList.forEach(e => {
                html += `<tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="text-align: left; padding: 10px 2px; color: #334155; font-weight: 600; max-width: 60px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${e.nombre}">${e.nombre}</td>`;
                
                let count = 0;
                last6.forEach(info => {
                    if(isWorked(info.date, e.id)) count++;
                    html += `<td style="padding: 10px 0; text-align: center;">
                        ${getSquare(info.date, e.id, info)}
                    </td>`;
                });
                
                // Σ con umbrales: 0–3 gris, 4–5 verde, 6–7 naranja, 8 rojo
                const countColor = count >= 8 ? '#ef4444' : count >= 6 ? '#f59e0b' : count >= 4 ? '#22c55e' : '#64748b';
                html += `<td style="padding: 10px 2px; text-align: center; border-left: 1px solid #e2e8f0;">
                    <span style="font-size:0.95rem; font-weight:700; color:${countColor};" title="${count} de ${last6.length} trabajados">${count}</span>
                </td>`;
                html += `</tr>`;
            });
            
            if(empList.length === 0) {
                html += `<tr><td colspan="${last6.length + 2}" style="padding: 15px; color: #94a3b8;">No hay empleados activos.</td></tr>`;
            }
            
            html += `</tbody></table>`;
            
            // Mini-leyenda
            html += `<div style="margin-top:10px; font-size:0.65rem; color:#64748b; text-align:center;">
                Un cuadrado por cada domingo o festivo · Sólido = trabajó · Hueco = libró
            </div></div>`;
            
            return html;
        },

        renderMonitorBalance: function() {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let stats = [];
            App.data.empleados.filter(e => {
                // Filtrar por activo Y vigente en esta semana
                return e.active && Utils.empleadoVigenteEnFecha(e, monday);
            }).sort((a,b)=>a.customOrder-b.customOrder).forEach(e => {
                let planned = 0;  // horas para cobertura de tienda (sin externos)
                let asig = 0;     // horas totales del empleado (con externos)
                let dayStatuses = [];
                
                days.forEach(d => {
                    let status = { color: 'transparent', type: 'empty', label: Utils.getDayName(d), code: null };
                    const req = Utils.getRequest(e.id, d);
                    
                    // SIEMPRE verificar qué turno real está asignado
                    const sid = App.data.schedule[d] ? App.data.schedule[d][e.id] : null;
                    const shift = sid ? Utils.getShift(sid) : null;
                    
                    if(shift) {
                        if(shift.fixed) {
                            // Fixed shifts - usar color y código reales
                            status = { 
                                color: shift.color, 
                                type: 'hollow', 
                                label: shift.desc,
                                code: shift.code
                            };
                        } else if(shift.start && shift.end) {
                            // Working shifts - solid background (externos no suman a cobertura pero sí aparecen visualmente)
                            const shiftColor = Utils.isCustomShift(shift) ? '#9ca3af' : shift.color;
                            status = { 
                                color: shiftColor, 
                                type: 'solid', 
                                label: `${shift.code || 'CUSTOM'} (${shift.start}-${shift.end})${shift.external ? ' · Externo' : ''}`,
                                code: shift.code || 'CUSTOM'
                            };
                            // Externos no suman a cobertura de tienda, pero SÍ cuentan para el empleado
                            const h = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                            asig += h;
                            if(!shift.external) {
                                planned += h;
                            }
                        }
                    } else if(req && req.status === 'approved') {
                        // Request aprobada SIN turno asignado (raro, pero manejarlo)
                        if(req.type === 'VAC') status = { color: '#a855f7', type: 'hollow', label: 'Vacaciones', code: 'V' };
                        else if(req.type === 'BAJ') status = { color: '#ef4444', type: 'hollow', label: 'Baja', code: 'B' };
                        else if(req.type === 'AP') status = { color: '#ec4899', type: 'hollow', label: 'Asuntos Propios', code: 'P' };
                        else status = { color: '#e5e7eb', type: 'hollow', label: req.type, code: req.type };
                    }
                    
                    dayStatuses.push(status);
                });
                
                // Calcular días consecutivos trabajados ANTES de esta semana
                const consecutiveDays = App.logic.calcConsecutiveWorkDays(e.id, monday);
                // Aplicar regla F/L para horas justificadas y esperadas
                const { justifiedH, countL, countF } = Utils.calcEsperadas(Utils.getContrato(e, monday), days, e.id);
                
                stats.push({ 
                    name: e.nombre, 
                    contract: Utils.getContrato(e, monday), 
                    planned,
                    asig,
                    justifiedH,
                    dayStatuses,
                    consecutiveDays,
                    countL,
                    countF
                });
            });

            // Totales del equipo (calculados antes de renderizar el header)
            const totalContrato   = stats.reduce((s, st) => s + st.contract,   0);
            const totalPlanned    = stats.reduce((s, st) => s + st.planned,     0);
            const totalJustified  = stats.reduce((s, st) => s + st.justifiedH,  0);
            const totalDisponible = totalContrato - totalJustified;
            const totalFaltan     = Math.max(0, totalDisponible - totalPlanned);
            const f1 = n => (Math.round(n * 10) / 10); // máx 1 decimal para display

            let html = `
            <div class="balance-header" style="flex-direction:column; align-items:stretch; gap:8px; padding:10px 12px;">
                <span style="font-size:0.8rem;">Balance Semanal</span>
                <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
                    <div style="background:#eff6ff; border:1px solid #bfdbfe; border-radius:6px; padding:6px 8px; text-align:center;">
                        <div style="font-size:1rem; font-weight:800; color:#2563eb; line-height:1;">${f1(totalPlanned)}h</div>
                        <div style="font-size:0.6rem; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.3px;">Asignadas</div>
                    </div>
                    <div style="background:${totalFaltan > 0 ? '#fffbeb' : '#f0fdf4'}; border:1px solid ${totalFaltan > 0 ? '#fde68a' : '#bbf7d0'}; border-radius:6px; padding:6px 8px; text-align:center;">
                        <div style="font-size:1rem; font-weight:800; color:${totalFaltan > 0 ? '#d97706' : '#16a34a'}; line-height:1;">${f1(totalFaltan)}h</div>
                        <div style="font-size:0.6rem; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.3px;">Por asignar</div>
                    </div>
                    <div class="diff-tooltip-wrap" style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 8px; text-align:center; cursor:${totalJustified > 0 ? 'help' : 'default'};">
                        <div style="font-size:1rem; font-weight:800; color:#475569; line-height:1;">${f1(totalDisponible)}h</div>
                        <div style="font-size:0.6rem; color:#64748b; margin-top:2px; text-transform:uppercase; letter-spacing:0.3px;">Disponibles</div>
                        ${totalJustified > 0 ? `<div class="diff-tooltip" style="min-width:200px;">
                            <div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Horas disponibles</div>
                            <div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">📋 Contrato total</span><span style="font-weight:600;">${f1(totalContrato)}h</span></div>
                            <div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">✦ Ausencias</span><span style="color:#a78bfa;font-weight:600;">−${f1(totalJustified)}h</span></div>
                            <div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">= Disponibles</span><span style="font-weight:600;">${f1(totalDisponible)}h</span></div>
                        </div>` : ''}
                    </div>
                </div>
            </div>
            <div style="padding:0 12px 8px; display:flex; gap:10px; justify-content:flex-end;">
                <span style="font-size:0.65rem; color:#94a3b8; cursor:pointer;" onclick="Utils.showInfoTip(event, Utils.Tips.columnaCntr)">ⓘ Cntr</span>
                <span style="font-size:0.65rem; color:#94a3b8; cursor:pointer;" onclick="Utils.showInfoTip(event, Utils.Tips.columnaDif)">ⓘ Dif</span>
            </div>
            <table class="balance-table">
                <thead><tr>
                    <th style="text-align:left">Emp</th>
                    <th style="white-space:nowrap;">Cntr<span class="diff-tooltip-wrap" style="cursor:help;font-size:9px;vertical-align:super;margin-left:1px;">ℹ️<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Desvío acumulado sobre semanas cerradas 🔒.<br>Solo se incluyen las semanas bloqueadas con el switch del planificador.</div></span></th>
                    <th>Asig</th>
                    <th>Dif</th>
                    <th>SEG</th>
                    <th title="Libranzas completas">LIB</th>
                    <th>Semana (L-D)</th>
                </tr></thead>
                <tbody>`;
            
            stats.forEach(st => {
                // Diff neto: trabajo (incl. externos) + ausencias justificadas - contrato
                const coveredDiff = Math.round((st.asig + st.justifiedH - st.contract) * 10) / 10;
                const rawDiff = Math.round((st.asig - st.contract) * 10) / 10;
                const hasJustified = st.justifiedH > 0;
                const isFullyCovered = coveredDiff >= -0.5;

                let diffClass, diffDisplay, diffTitle = null;

                if(isFullyCovered) {
                    // Todo cubierto
                    if(hasJustified) {
                        // Cubierto gracias a ausencias → gris con ✦
                        diffClass = 'val-justified';
                        diffDisplay = `0<span style="font-size:0.6rem;vertical-align:super;">✦</span>`;
                        diffTitle = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desglose de horas</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Trabajo</span><span style="font-weight:600;">${f1(st.asig)}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">✦ Ausencias</span><span style="color:#a78bfa;font-weight:600;">+${f1(st.justifiedH)}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">📋 Contrato</span><span style="font-weight:600;">${f1(st.contract)}h</span></div><div style="margin-top:6px;font-size:10px;color:#64748b;">L (libranzas) no justifican horas</div>`;
                    } else {
                        // Cubierto solo con trabajo → verde normal
                        diffClass = 'val-good';
                        diffDisplay = rawDiff > 0 ? `+${rawDiff}` : `${rawDiff}`;
                        diffTitle = null;
                    }
                } else {
                    // Faltan horas reales
                    diffClass = 'val-warn';
                    diffDisplay = coveredDiff > 0 ? `+${coveredDiff}` : `${coveredDiff}`;
                    diffTitle = hasJustified
                        ? `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desglose de horas</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Trabajo</span><span style="font-weight:600;">${st.asig}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">✦ Ausencias</span><span style="color:#a78bfa;font-weight:600;">+${st.justifiedH}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">📋 Contrato</span><span style="font-weight:600;">${st.contract}h</span></div><div style="margin-top:6px;padding:4px 6px;background:rgba(245,158,11,0.2);border-radius:4px;color:#fbbf24;font-size:10px;">⚠️ Faltan ${Math.abs(coveredDiff)}h por cubrir</div>`
                        : null;
                }
                
                // Días consecutivos - color según cantidad
                let consColor = '#22c55e'; // Verde por defecto (0-3)
                if(st.consecutiveDays >= 6) consColor = '#ef4444'; // Rojo si 6+
                else if(st.consecutiveDays >= 4) consColor = '#f59e0b'; // Naranja si 4-5
                
                let consHtml = `<div style="
                    width: 22px; 
                    height: 22px; 
                    border-radius: 3px; 
                    background-color: ${consColor}; 
                    color: white; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-weight: 700; 
                    font-size: 0.75rem;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                    cursor: help;
                " title="Lleva ${st.consecutiveDays} día${st.consecutiveDays !== 1 ? 's' : ''} consecutivo${st.consecutiveDays !== 1 ? 's' : ''} trabajando (incluye días de esta semana con turno asignado)">${st.consecutiveDays}</div>`;
                
                // Renderizar dots de la semana
                let dotsHtml = `<div class="week-dots" style="position: relative;">`;
                st.dayStatuses.forEach(s => {
                    if(s.type === 'solid') {
                        // Turno de trabajo - fondo sólido
                        dotsHtml += `<div class="dot" style="background-color:${s.color}" title="${s.label}"></div>`;
                    } else if(s.type === 'hollow') {
                        // Libranza/ausencia - borde + posible letra
                        // L y V van vacíos, el resto lleva letra
                        const showLetter = (s.code !== 'L' && s.code !== 'V');
                        
                        dotsHtml += `<div class="dot" style="
                            border: 2px solid ${s.color};
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 0.6rem;
                            font-weight: 700;
                            color: ${s.color};
                        " title="${s.label}">${showLetter ? s.code : ''}</div>`;
                    } else {
                        // Vacío
                        dotsHtml += `<div class="dot" style="border:1px dashed #e2e8f0" title="${s.label}"></div>`;
                    }
                });
                
                // Chivato de descansos completos
                let chivatoHtml = '';
                if(st.countL >= 2) {
                    // 2 o más L → Verde, puede cebarlo
                    chivatoHtml = `<div style="
                        width: 16px; 
                        height: 16px; 
                        background: #22c55e;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        font-weight: 700;
                        cursor: help;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                        margin: 0 auto;
                    " title="✓ Tiene ${st.countL} libranzas L - Puede asignar turnos extra sin comprometer descanso">✓</div>`;
                } else if(st.countL >= 1 && st.countF >= 1) {
                    // 1 L + 1 F → Naranja, cubierto pero podría tener otro L
                    chivatoHtml = `<div style="
                        width: 16px; 
                        height: 16px; 
                        background: #f59e0b;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 0.7rem;
                        font-weight: 700;
                        cursor: help;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                        margin: 0 auto;
                    " title="⚠ Tiene 1 L + 1 F - Descansos cubiertos. Considera L adicional para evitar compensar festivo">⚠</div>`;
                }
                
                dotsHtml += `</div>`;
                
                html += `<tr class="b-row">
                    <td class="b-name" title="${st.name}">${st.name}</td>
                    <td class="b-hrs" style="white-space:nowrap;">${(() => {
                        // Calcular desvío acumulado para este empleado (rango configurado o año fiscal)
                        const emp = App.data.empleados.find(e => e.nombre === st.name);
                        if(!emp) return st.contract;
                        // Usar semanas cerradas + vigentes como el inspector de empleados
                        const empLockedWeeks = App.ui._getLockedWeeks(emp);
                        const rangeStart = empLockedWeeks.length > 0 ? empLockedWeeks[0] : Utils.getMonday(App.uiState.currentDate);
                        const rangeEnd = empLockedWeeks.length > 0 ? empLockedWeeks[empLockedWeeks.length - 1] : rangeStart;
                        let acum = emp.saldoInicial || 0;
                        empLockedWeeks.forEach(isoWeek => {
                                const wdays = Utils.getWeekDays(isoWeek);
                                let worked = 0;
                                wdays.forEach(d => {
                                    const sid = App.data.schedule[d] ? App.data.schedule[d][emp.id] : null;
                                    const sh = sid ? Utils.getShift(sid) : null;
                                    if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                                });
                                const { esperadas } = Utils.calcEsperadas(Utils.getContrato(emp, isoWeek), wdays, emp.id);
                                acum += worked - esperadas;
                        });
                        acum = Math.round(acum * 10) / 10;
                        // Ajustes manuales de horas
                        const ajusteTotal = ((emp.ajustes || []).reduce((s, a) => s + a.signo * a.horas, 0));
                        acum = Math.round((acum + ajusteTotal) * 10) / 10;
                        const sign = acum > 0 ? '+' : '';
                        const color = acum > 0.5 ? '#f59e0b' : acum < -0.5 ? '#3b82f6' : '#10b981';
                        const label = acum > 0.5 ? 'horas de más' : acum < -0.5 ? 'horas de menos' : 'sin desvío';
                        const recPend = emp.recPendientes || 0;
                        const vacPend = emp.vacPendientes || 0;                        // Auto-calculado del módulo de festivos (curso actual)
                        const todayY = new Date().getFullYear();
                        const cursoY = new Date().getMonth() >= 2 ? todayY : todayY - 1;
                        const fRangeStart = `${cursoY}-03-01`;
                        const fRangeEnd   = `${cursoY+1}-02-${new Date(cursoY+1,2,0).getDate()}`;
                        let autoRec = 0;
                        (App.data.storeConfig.holidays||[]).filter(h=>h.date>=fRangeStart&&h.date<=fRangeEnd&&Utils.empleadoVigenteEnFecha(emp,h.date)).forEach(h=>{
                            const sid2 = App.data.schedule[h.date]?.[emp.id];
                            const sh2  = sid2 ? Utils.getShift(sid2) : null;
                            let estado2 = 'sin_definir';
                            if(sh2) {
                                if(sh2.fixed && sh2.code==='F') {
                                    const wdays2 = Utils.getWeekDays(Utils.getMonday(h.date));
                                    let cL2=0; wdays2.forEach(d2=>{const s3=App.data.schedule[d2]?.[emp.id];const sh3=s3?Utils.getShift(s3):null;if(sh3&&sh3.fixed&&sh3.code==='L')cL2++;});
                                    estado2 = cL2>=2?'disfrutado':'coincide';
                                } else if(sh2.start&&sh2.end) estado2='trabaja';
                            }
                            if(estado2==='coincide'||estado2==='trabaja') {
                                if(!(emp.festivoTracking||{})[h.date]?.rDate) autoRec++;
                            }
                        });
                        const pendHTML = (recPend > 0 || vacPend > 0 || autoRec > 0) ? `
                            <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:7px;padding-top:7px;">
                                <div style="font-weight:700;color:#e2e8f0;margin-bottom:5px;font-size:10px;text-transform:uppercase;">Pendiente de dar</div>
                                ${autoRec > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;">🔴 Recup. festivos (auto)</span><span style="color:#f87171;font-weight:700;">${autoRec} día${autoRec!==1?'s':''}</span></div>` : ''}
                                ${recPend > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:3px;"><span style="color:#94a3b8;">🔴 Recup. arrastre</span><span style="color:#f87171;font-weight:700;">${recPend} día${recPend!==1?'s':''}</span></div>` : ''}
                                ${vacPend > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:3px;"><span style="color:#94a3b8;">🟣 Vacaciones</span><span style="color:#c084fc;font-weight:700;">${vacPend} día${vacPend!==1?'s':''}</span></div>` : ''}
                            </div>` : '';
                        const tooltip = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desvío acumulado</div><div style="display:flex;justify-content:space-between;gap:12px;margin-bottom:4px;"><span style="color:#94a3b8;">Periodo</span><span style="font-weight:600;font-size:10px;text-align:right;">${Utils.getWeekCode(rangeStart)} → ${Utils.getWeekCode(rangeEnd)}</span></div><div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;">Desvío total</span><span style="color:${color};font-weight:700;">${sign}${f1(acum)}h ${label}</span></div>${pendHTML}<div style="margin-top:8px;font-size:10px;color:#64748b;border-top:1px solid rgba(255,255,255,0.1);padding-top:6px;">Configura en 📈 Análisis · ficha del empleado</div>`;
                        return `<span class="diff-tooltip-wrap" style="cursor:help;">${f1(st.contract)}<sup style="font-size:0.5rem;opacity:0.6;">⏱</sup><div class="diff-tooltip" style="min-width:260px; white-space:normal; line-height:1.7;">${tooltip}</div></span>`;
                    })()}</td>
                    <td class="b-hrs" style="white-space:nowrap;">${f1(st.asig)}</td>
                    <td class="b-hrs ${diffClass}" style="position:relative;">${diffTitle ? `<span class="diff-tooltip-wrap">${diffDisplay}<div class="diff-tooltip">${diffTitle}</div></span>` : diffDisplay}</td>
                    <td style="text-align: center; padding: 4px;">${consHtml}</td>
                    <td style="text-align: center; padding: 4px;">${chivatoHtml || '—'}</td>
                    <td style="position: relative;">${dotsHtml}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            html += `<div style="padding:10px 12px; background:#f8fafc; border-top:1px solid var(--border); font-size:0.65rem; color:var(--text-muted); line-height:1.6;">
                <div onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.leyenda-arrow').textContent = this.nextElementSibling.style.display === 'none' ? '▸' : '▾';"
                    style="display:flex; align-items:center; justify-content:space-between; cursor:pointer; user-select:none; padding:2px 0 6px 0; color:#475569; font-weight:700; font-size:0.7rem;">
                    <span>LEYENDA</span>
                    <span class="leyenda-arrow" style="font-size:0.65rem; color:#94a3b8;">▸</span>
                </div>
                <div style="display:none;">
                    <!-- TIPOS DE DÍA -->
                    <div style="margin-bottom:10px;">
                        <div style="font-weight:700; color:#475569; margin-bottom:6px; font-size:0.7rem;">TIPOS DE DÍA:</div>
                        <div style="display:grid; grid-template-columns: 20px 1fr; gap:6px 8px; align-items:center;">
                            <div style="width:14px; height:14px; border:2px solid #22c55e; border-radius:2px;"></div>
                            <span>L - Libre</span>
                            <div style="width:14px; height:14px; border:2px solid #22c55e; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:0.5rem; font-weight:700; color:#22c55e;">F</div>
                            <span>F - Festivo</span>
                            <div style="width:14px; height:14px; border:2px solid #22c55e; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:0.5rem; font-weight:700; color:#22c55e;">R</div>
                            <span>R - Recuperación</span>
                            <div style="width:14px; height:14px; border:2px solid #a855f7; border-radius:2px;"></div>
                            <span>V - Vacaciones</span>
                            <div style="width:14px; height:14px; border:2px solid #ec4899; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:0.5rem; font-weight:700; color:#ec4899;">P</div>
                            <span>P - Permiso</span>
                            <div style="width:14px; height:14px; border:2px solid #ef4444; border-radius:2px; display:flex; align-items:center; justify-content:center; font-size:0.5rem; font-weight:700; color:#ef4444;">B</div>
                            <span>B - Baja médica</span>
                            <div style="width:14px; height:14px; background:#3b82f6; border-radius:2px;"></div>
                            <span>Turno de trabajo</span>
                        </div>
                    </div>
                    <!-- SEG -->
                    <div style="margin-bottom:10px; padding-top:8px; border-top:1px solid #e2e8f0;">
                        <div style="font-weight:700; color:#475569; margin-bottom:6px; font-size:0.7rem;">SEG (Días consecutivos):</div>
                        <div style="display:grid; grid-template-columns: 20px 1fr; gap:6px 8px; align-items:center;">
                            <div style="width:14px; height:14px; background:#22c55e; border-radius:2px;"></div>
                            <span>0-3 días (descansado)</span>
                            <div style="width:14px; height:14px; background:#f59e0b; border-radius:2px;"></div>
                            <span>4-5 días (alerta)</span>
                            <div style="width:14px; height:14px; background:#ef4444; border-radius:2px;"></div>
                            <span>6+ días (crítico)</span>
                        </div>
                    </div>
                    <!-- CHIVATOS LIB -->
                    <div style="padding-top:8px; border-top:1px solid #e2e8f0;">
                        <div style="font-weight:700; color:#475569; margin-bottom:6px; font-size:0.7rem;">LIB (Libranzas):</div>
                        <div style="display:grid; grid-template-columns: 20px 1fr; gap:6px 8px; align-items:center;">
                            <div style="width:14px; height:14px; background:#22c55e; color:white; border-radius:50%; text-align:center; line-height:14px; font-size:0.6rem; font-weight:700;">✓</div>
                            <span>Atribuidos dos días de libranza normal</span>
                            <div style="width:14px; height:14px; background:#f59e0b; color:white; border-radius:50%; text-align:center; line-height:14px; font-size:0.6rem; font-weight:700;">⚠</div>
                            <span>1 libranza + 1 festivo. Cabe una libranza más</span>
                        </div>
                    </div>
                    <!-- DIF -->
                    <div style="padding-top:8px; border-top:1px solid #e2e8f0; margin-top:8px;">
                        <div style="font-weight:700; color:#475569; margin-bottom:6px; font-size:0.7rem;">DIF (Diferencia de horas):</div>
                        <div style="display:grid; grid-template-columns: 28px 1fr; gap:6px 8px; align-items:center;">
                            <span style="color:#10b981; font-weight:700; font-family:monospace; font-size:0.75rem;">0</span>
                            <span>Contrato cubierto con trabajo</span>
                            <span style="color:#94a3b8; font-weight:700; font-family:monospace; font-size:0.75rem;">0✦</span>
                            <span>Cubierto con ausencias (V/F/R/B/P)</span>
                            <span style="color:#f59e0b; font-weight:700; font-family:monospace; font-size:0.75rem;">-8</span>
                            <span>Horas pendientes (L no justifica)</span>
                        </div>
                    </div>
                </div>
            </div>`;
            
            return html;
        },

        renderMonitorDaily: function() {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let totals = [];
            let max = 0;
            days.forEach(d => {
                let sum = 0;
                Object.keys(App.data.schedule[d]||{}).forEach(eid => {
                    const sid = App.data.schedule[d][eid];
                    const s = Utils.getShift(sid);
                    if(s && !s.external) sum += Utils.calcHours(s.start, s.end, s.breakStart, s.breakEnd, s.break);
                });
                totals.push({ day: Utils.getDayName(d), val: sum });
                if(sum > max) max = sum;
            });
            
            // Escala más representativa: usar max + 20% o mínimo 60h
            const scale = Math.max(max * 1.2, 60);
            
            let html = `<div style="padding:15px 15px 5px 15px; font-size:0.8rem; font-weight:700; color:var(--text-muted); text-align:center;">📊 HORAS POR DÍA</div><div class="chart-container" style="height:234px;">`;
            totals.forEach(t => {
                const h = scale > 0 ? (t.val / scale) * 100 : 0;
                html += `<div class="chart-col">
                    <div class="chart-val" style="font-size:0.9rem;">${t.val.toFixed(1)}h</div>
                    <div class="chart-bar" style="height:${h}%" title="${t.val.toFixed(1)}h"></div>
                    <div class="chart-label" style="font-size:0.7rem;">${t.day}</div>
                </div>`;
            });
            html += `</div>`;
            return html;
        },

        renderMonitorHourly: function() {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let slots = new Array(12).fill(0); // 10:00 to 21:00 (12 hours)
            
            // Logic: Loop 10 to 21. For each hour, check staffing across all days.
            // Staffing = People working at H:00 + People working at H:30 / 2.
            
            days.forEach(d => {
                Object.keys(App.data.schedule[d]||{}).forEach(eid => {
                    const sid = App.data.schedule[d][eid];
                    const s = Utils.getShift(sid);
                    if(s && s.start && s.end && !s.external) {
                        const startMin = (Number(s.start.split(':')[0])*60) + Number(s.start.split(':')[1]);
                        const endMin = (Number(s.end.split(':')[0])*60) + Number(s.end.split(':')[1]);
                        
                        let bStart = 0, bEnd = 0;
                        if(s.breakStart && s.breakEnd) {
                            bStart = (Number(s.breakStart.split(':')[0])*60) + Number(s.breakStart.split(':')[1]);
                            bEnd = (Number(s.breakEnd.split(':')[0])*60) + Number(s.breakEnd.split(':')[1]);
                        }

                        // Check each hour slot (10, 11... 21)
                        for(let h=0; h<12; h++) {
                            const hourStart = (10 + h) * 60; // 10:00 in mins
                            const hourHalf = hourStart + 30; // 10:30 in mins
                            
                            let load = 0;
                            // Check H:00
                            if(hourStart >= startMin && hourStart < endMin) {
                                if(!(hourStart >= bStart && hourStart < bEnd)) load += 0.5;
                            }
                            // Check H:30
                            if(hourHalf >= startMin && hourHalf < endMin) {
                                if(!(hourHalf >= bStart && hourHalf < bEnd)) load += 0.5;
                            }
                            slots[h] += load;
                        }
                    }
                });
            });

            let max = Math.max(...slots, 1);
            let html = `<div style="padding:15px 15px 5px 15px; font-size:0.8rem; font-weight:700; color:var(--text-muted); text-align:center;">📈 CURVA HORARIA (SEMANAL)</div><div class="chart-container" style="gap:4px; height:234px;">`;
            for(let i=0; i<12; i++) {
                const hVal = (slots[i] / max) * 100;
                const hour = 10 + i;
                html += `<div class="chart-col">
                    <div class="chart-bar" style="height:${hVal}%" title="${slots[i].toFixed(1)} FTE acumulado"></div>
                    <div class="chart-label" style="font-size:0.7rem;">${hour}</div>
                </div>`;
            }
            html += `</div>`;
            return html;
        },

        renderMonitorEquilibrio: function() {
            let startDate = App.uiState.balanceStartDate;
            let endDate = App.uiState.balanceEndDate;
            
            if(!startDate || !endDate) {
                const allDates = Object.keys(App.data.schedule).sort();
                if(allDates.length === 0) {
                    return `<div style="padding:40px; text-align:center; color:var(--text-muted);"><p>No hay datos disponibles.</p></div>`;
                }
                startDate = allDates[0];
                endDate = allDates[allDates.length - 1];
            }
            
            const stats = [];
            let totalM = 0, totalT = 0, totalP = 0, totalI = 0, totalAll = 0;
            
            App.data.empleados.filter(e => {
                // Filtrar por activo Y vigente en algún momento del rango
                return e.active !== false && Utils.empleadoVigenteEnRango(e, startDate, endDate);
            }).forEach(emp => {
                let countM = 0, countT = 0, countP = 0, countI = 0, total = 0;
                
                Object.keys(App.data.schedule).forEach(date => {
                    if(date >= startDate && date <= endDate) {
                        const shiftId = App.data.schedule[date][emp.id];
                        if(shiftId) {
                            const shift = Utils.getShift(shiftId);
                            if(shift && shift.start && shift.end) {
                                // Clasificar automáticamente (funciona para paleta y CUSTOM)
                                const type = Utils.classifyShift(shift);
                                if(type === 'M') countM++;
                                else if(type === 'T') countT++;
                                else if(type === 'P') countP++;
                                else if(type === 'I') countI++;
                                total++;
                            }
                        }
                    }
                });
                
                totalM += countM;
                totalT += countT;
                totalP += countP;
                totalI += countI;
                totalAll += total;
                
                const percM = total > 0 ? (countM / total * 100) : 0;
                const percT = total > 0 ? (countT / total * 100) : 0;
                const percP = total > 0 ? (countP / total * 100) : 0;
                const percI = total > 0 ? (countI / total * 100) : 0;
                const pref = emp.prefs?.shift || 'any';
                
                stats.push({ emp, countM, countT, countP, countI, total, percM, percT, percP, percI, pref });
            });
            
            // ORDENAR stats según columna seleccionada
            if(App.uiState.equilibrioSortKey) {
                const key = App.uiState.equilibrioSortKey;
                const dir = App.uiState.equilibrioSortDir === 'asc' ? 1 : -1;
                
                stats.sort((a, b) => {
                    let valA, valB;
                    
                    if(key === 'nombre') {
                        valA = a.emp.nombre.toLowerCase();
                        valB = b.emp.nombre.toLowerCase();
                        return valA.localeCompare(valB) * dir;
                    } else if(key === 'M') {
                        valA = a.percM;  // Ordenar por PORCENTAJE, no por count
                        valB = b.percM;
                    } else if(key === 'T') {
                        valA = a.percT;  // Ordenar por PORCENTAJE, no por count
                        valB = b.percT;
                    } else if(key === 'I') {
                        valA = a.percI;  // Ordenar por PORCENTAJE, no por count
                        valB = b.percI;
                    } else if(key === 'P') {
                        valA = a.percP;  // Ordenar por PORCENTAJE, no por count
                        valB = b.percP;
                    } else if(key === 'total') {
                        valA = a.total;
                        valB = b.total;
                    } else if(key === 'pref') {
                        valA = a.pref || 'zzz'; // 'any' va al final
                        valB = b.pref || 'zzz';
                        return valA.localeCompare(valB) * dir;
                    }
                    
                    return (valA - valB) * dir;
                });
            }
            
            // Calculate averages
            const avgPercM = totalAll > 0 ? (totalM / totalAll * 100) : 0;
            const avgPercT = totalAll > 0 ? (totalT / totalAll * 100) : 0;
            const avgPercP = totalAll > 0 ? (totalP / totalAll * 100) : 0;
            const avgPercI = totalAll > 0 ? (totalI / totalAll * 100) : 0;
            
            let html = `
            <div style="padding:12px 15px; background:#f8fafc; border-bottom:1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                    <h3 style="margin:0; font-size:0.85rem; font-weight:700;">⚖️ EQUILIBRIO DE TURNOS</h3>
                </div>
                <div style="display:flex; gap:6px; align-items:flex-end; font-size:0.7rem; flex-wrap:wrap;">
                    <div style="flex:1; min-width:90px;">
                        <label style="display:block; margin-bottom:2px; font-weight:600; font-size:0.65rem;">Desde:</label>
                        ${Utils.getDateInputHTML('eq-start', startDate, 'App.logic.storeEquilibrioDate(this, "start")')}
                    </div>
                    <div style="flex:1; min-width:90px;">
                        <label style="display:block; margin-bottom:2px; font-weight:600; font-size:0.65rem;">Hasta:</label>
                        ${Utils.getDateInputHTML('eq-end', endDate, 'App.logic.storeEquilibrioDate(this, "end")')}
                    </div>
                    <button onclick="App.logic.updateEquilibrioRange()" 
                            style="padding:4px 10px; background:var(--primary); color:white; border:none; border-radius:3px; cursor:pointer; font-size:0.65rem; font-weight:600;">
                        Aplicar
                    </button>
                    <button onclick="App.logic.resetEquilibrioRange()" 
                            style="padding:4px 10px; background:#e2e8f0; color:var(--text-main); border:none; border-radius:3px; cursor:pointer; font-size:0.65rem;">
                        Todo
                    </button>
                </div>
                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:6px;">
                    📅 ${Utils.formatDateES(startDate)} → ${Utils.formatDateES(endDate)}
                </div>
            </div>
            
            <div style="overflow-y:auto;">
                <table class="balance-table" style="font-size:0.7rem;">
                    <thead>
                        <tr>
                            <th style="text-align:left; padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('nombre')" title="Ordenar por nombre">
                                Emp ${App.uiState.equilibrioSortKey === 'nombre' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('M')" title="Ordenar por mañanas">
                                M ${App.uiState.equilibrioSortKey === 'M' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('T')" title="Ordenar por tardes">
                                T ${App.uiState.equilibrioSortKey === 'T' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('I')" title="Ordenar por intermedios">
                                I ${App.uiState.equilibrioSortKey === 'I' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('P')" title="Ordenar por partidos">
                                P ${App.uiState.equilibrioSortKey === 'P' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('total')" title="Ordenar por total">
                                Tot ${App.uiState.equilibrioSortKey === 'total' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                            <th style="padding:4px 6px; cursor:pointer; user-select:none;" onclick="App.logic.sortEquilibrio('pref')" title="Ordenar por preferencia">
                                Pref ${App.uiState.equilibrioSortKey === 'pref' ? (App.uiState.equilibrioSortDir === 'asc' ? '↑' : '↓') : ''}
                            </th>
                        </tr>
                    </thead>
                    <tbody>`;
            
            stats.forEach(st => {
                const getCellStyle = (type) => {
                    const perc = type === 'M' ? st.percM : type === 'T' ? st.percT : type === 'I' ? st.percI : st.percP;
                    
                    // Color base by type
                    let baseColor, textColor;
                    if(type === 'M') {
                        // Blue gradient
                        if(perc >= 60) return `background:#1e40af; color:white; font-weight:700;`;
                        if(perc >= 50) return `background:#3b82f6; color:white; font-weight:700;`;
                        if(perc >= 40) return `background:#60a5fa; color:white; font-weight:600;`;
                        if(perc >= 30) return `background:#93c5fd; color:#1e3a8a; font-weight:600;`;
                        if(perc >= 20) return `background:#bfdbfe; color:#1e40af;`;
                        if(perc >= 10) return `background:#dbeafe; color:#1e40af;`;
                        return `background:#eff6ff; color:#64748b;`;
                    } else if(type === 'T') {
                        // Orange gradient
                        if(perc >= 60) return `background:#c2410c; color:white; font-weight:700;`;
                        if(perc >= 50) return `background:#ea580c; color:white; font-weight:700;`;
                        if(perc >= 40) return `background:#f97316; color:white; font-weight:600;`;
                        if(perc >= 30) return `background:#fb923c; color:#7c2d12; font-weight:600;`;
                        if(perc >= 20) return `background:#fdba74; color:#9a3412;`;
                        if(perc >= 10) return `background:#fed7aa; color:#9a3412;`;
                        return `background:#ffedd5; color:#64748b;`;
                    } else if(type === 'I') {
                        // Yellow gradient
                        if(perc >= 60) return `background:#a16207; color:white; font-weight:700;`;
                        if(perc >= 50) return `background:#ca8a04; color:white; font-weight:700;`;
                        if(perc >= 40) return `background:#eab308; color:white; font-weight:600;`;
                        if(perc >= 30) return `background:#facc15; color:#713f12; font-weight:600;`;
                        if(perc >= 20) return `background:#fde047; color:#854d0e;`;
                        if(perc >= 10) return `background:#fef08a; color:#92400e;`;
                        return `background:#fef9c3; color:#64748b;`;
                    } else { // P
                        // Red gradient
                        if(perc >= 60) return `background:#991b1b; color:white; font-weight:700;`;
                        if(perc >= 50) return `background:#dc2626; color:white; font-weight:700;`;
                        if(perc >= 40) return `background:#ef4444; color:white; font-weight:600;`;
                        if(perc >= 30) return `background:#f87171; color:#7f1d1d; font-weight:600;`;
                        if(perc >= 20) return `background:#fca5a5; color:#991b1b;`;
                        if(perc >= 10) return `background:#fecaca; color:#991b1b;`;
                        return `background:#fee2e2; color:#64748b;`;
                    }
                };
                
                // Obtener la etiqueta de preferencia
                let prefLabel = '-';
                if(st.pref && st.pref !== 'any') {
                    const prefShift = App.data.shiftDefs.find(s => s.id === st.pref);
                    if(prefShift && prefShift.code) {
                        prefLabel = prefShift.code.charAt(0).toUpperCase();
                    }
                }
                
                // Calcular ratios /5
                const ratioM = st.total > 0 ? ((st.countM / st.total) * 5).toFixed(1) : '0.0';
                const ratioT = st.total > 0 ? ((st.countT / st.total) * 5).toFixed(1) : '0.0';
                const ratioI = st.total > 0 ? ((st.countI / st.total) * 5).toFixed(1) : '0.0';
                const ratioP = st.total > 0 ? ((st.countP / st.total) * 5).toFixed(1) : '0.0';
                
                html += `<tr>
                    <td style="font-weight:600; padding:4px 6px; font-size:0.75rem;">${st.emp.nombre}</td>
                    <td style="text-align:center; padding:4px 6px; ${getCellStyle('M')}" title="Mañanas: ${st.countM} turnos = ${st.percM.toFixed(1)}%">
                        <div style="font-size:0.85rem; font-weight:700; line-height:1.3;">${st.percM.toFixed(0)}%</div>
                        <div style="font-size:0.75rem; font-weight:600; line-height:1.3; opacity:0.9;">${ratioM}/5</div>
                    </td>
                    <td style="text-align:center; padding:4px 6px; ${getCellStyle('T')}" title="Tardes: ${st.countT} turnos = ${st.percT.toFixed(1)}%">
                        <div style="font-size:0.85rem; font-weight:700; line-height:1.3;">${st.percT.toFixed(0)}%</div>
                        <div style="font-size:0.75rem; font-weight:600; line-height:1.3; opacity:0.9;">${ratioT}/5</div>
                    </td>
                    <td style="text-align:center; padding:4px 6px; ${getCellStyle('I')}" title="Intermedios: ${st.countI} turnos = ${st.percI.toFixed(1)}%">
                        <div style="font-size:0.85rem; font-weight:700; line-height:1.3;">${st.percI.toFixed(0)}%</div>
                        <div style="font-size:0.75rem; font-weight:600; line-height:1.3; opacity:0.9;">${ratioI}/5</div>
                    </td>
                    <td style="text-align:center; padding:4px 6px; ${getCellStyle('P')}" title="Partidos: ${st.countP} turnos = ${st.percP.toFixed(1)}%">
                        <div style="font-size:0.85rem; font-weight:700; line-height:1.3;">${st.percP.toFixed(0)}%</div>
                        <div style="font-size:0.75rem; font-weight:600; line-height:1.3; opacity:0.9;">${ratioP}/5</div>
                    </td>
                    <td style="text-align:center; font-weight:600; padding:4px 6px; font-size:0.8rem;">${st.total}</td>
                    <td style="text-align:center; font-weight:700; color:var(--primary); padding:4px 6px; font-size:0.8rem;">${prefLabel}</td>
                </tr>`;
            });
            
            // Add MEDIA row with same gradient logic
            const getMediaCellStyle = (type, perc) => {
                if(type === 'M') {
                    if(perc >= 60) return `background:#1e40af; color:white; font-weight:700;`;
                    if(perc >= 50) return `background:#3b82f6; color:white; font-weight:700;`;
                    if(perc >= 40) return `background:#60a5fa; color:white; font-weight:600;`;
                    if(perc >= 30) return `background:#93c5fd; color:#1e3a8a; font-weight:600;`;
                    if(perc >= 20) return `background:#bfdbfe; color:#1e40af;`;
                    if(perc >= 10) return `background:#dbeafe; color:#1e40af;`;
                    return `background:#eff6ff; color:#64748b;`;
                } else if(type === 'T') {
                    if(perc >= 60) return `background:#c2410c; color:white; font-weight:700;`;
                    if(perc >= 50) return `background:#ea580c; color:white; font-weight:700;`;
                    if(perc >= 40) return `background:#f97316; color:white; font-weight:600;`;
                    if(perc >= 30) return `background:#fb923c; color:#7c2d12; font-weight:600;`;
                    if(perc >= 20) return `background:#fdba74; color:#9a3412;`;
                    if(perc >= 10) return `background:#fed7aa; color:#9a3412;`;
                    return `background:#ffedd5; color:#64748b;`;
                } else if(type === 'I') {
                    if(perc >= 60) return `background:#a16207; color:white; font-weight:700;`;
                    if(perc >= 50) return `background:#ca8a04; color:white; font-weight:700;`;
                    if(perc >= 40) return `background:#eab308; color:white; font-weight:600;`;
                    if(perc >= 30) return `background:#facc15; color:#713f12; font-weight:600;`;
                    if(perc >= 20) return `background:#fde047; color:#854d0e;`;
                    if(perc >= 10) return `background:#fef08a; color:#92400e;`;
                    return `background:#fef9c3; color:#64748b;`;
                } else { // P
                    if(perc >= 60) return `background:#991b1b; color:white; font-weight:700;`;
                    if(perc >= 50) return `background:#dc2626; color:white; font-weight:700;`;
                    if(perc >= 40) return `background:#ef4444; color:white; font-weight:600;`;
                    if(perc >= 30) return `background:#f87171; color:#7f1d1d; font-weight:600;`;
                    if(perc >= 20) return `background:#fca5a5; color:#991b1b;`;
                    if(perc >= 10) return `background:#fecaca; color:#991b1b;`;
                    return `background:#fee2e2; color:#64748b;`;
                }
            };
            
            // Calcular ratios /5 para MEDIA
            const avgRatioM = totalAll > 0 ? ((totalM / totalAll) * 5).toFixed(1) : '0.0';
            const avgRatioT = totalAll > 0 ? ((totalT / totalAll) * 5).toFixed(1) : '0.0';
            const avgRatioI = totalAll > 0 ? ((totalI / totalAll) * 5).toFixed(1) : '0.0';
            const avgRatioP = totalAll > 0 ? ((totalP / totalAll) * 5).toFixed(1) : '0.0';
            
            // Separador visual antes de MEDIA
            html += `<tr style="height:8px; background:#e2e8f0;"><td colspan="7"></td></tr>`;
            
            html += `<tr style="border-top:3px solid var(--border); border-bottom:3px solid var(--border);">
                <td style="font-weight:800; padding:6px; color:var(--text-main); background:#f1f5f9; font-size:0.8rem;">MEDIA</td>
                <td style="text-align:center; padding:6px; ${getMediaCellStyle('M', avgPercM)}" title="Media Mañanas: ${totalM} turnos = ${avgPercM.toFixed(1)}%">
                    <div style="font-size:0.9rem; font-weight:700; line-height:1.3;">${avgPercM.toFixed(0)}%</div>
                    <div style="font-size:0.8rem; font-weight:600; line-height:1.3; opacity:0.9;">${avgRatioM}/5</div>
                </td>
                <td style="text-align:center; padding:6px; ${getMediaCellStyle('T', avgPercT)}" title="Media Tardes: ${totalT} turnos = ${avgPercT.toFixed(1)}%">
                    <div style="font-size:0.9rem; font-weight:700; line-height:1.3;">${avgPercT.toFixed(0)}%</div>
                    <div style="font-size:0.8rem; font-weight:600; line-height:1.3; opacity:0.9;">${avgRatioT}/5</div>
                </td>
                <td style="text-align:center; padding:6px; ${getMediaCellStyle('I', avgPercI)}" title="Media Intermedios: ${totalI} turnos = ${avgPercI.toFixed(1)}%">
                    <div style="font-size:0.9rem; font-weight:700; line-height:1.3;">${avgPercI.toFixed(0)}%</div>
                    <div style="font-size:0.8rem; font-weight:600; line-height:1.3; opacity:0.9;">${avgRatioI}/5</div>
                </td>
                <td style="text-align:center; padding:6px; ${getMediaCellStyle('P', avgPercP)}" title="Media Partidos: ${totalP} turnos = ${avgPercP.toFixed(1)}%">
                    <div style="font-size:0.9rem; font-weight:700; line-height:1.3;">${avgPercP.toFixed(0)}%</div>
                    <div style="font-size:0.8rem; font-weight:600; line-height:1.3; opacity:0.9;">${avgRatioP}/5</div>
                </td>
                <td style="text-align:center; font-weight:800; padding:6px; background:#f1f5f9; font-size:1rem; color:#1e293b;">${totalAll}</td>
                <td style="text-align:center; padding:6px; color:var(--text-muted); font-size:0.7rem; background:#f1f5f9;">—</td>
            </tr>`;
            
            html += `</tbody></table></div>`;
            
            return html;
        },

        renderMonitorEventos: function() {
            const today = new Date().toISOString().slice(0, 10);
            const tipoFilter = App.uiState.eventoTipoFilter || 'todos';
            const empFilter  = App.uiState.eventoEmpFilter  || 'todos';
            const TIPOS = [
                { id: 'todos',    label: 'Todos' },
                { id: 'curso',    label: 'Cursos' },
                { id: 'mentoria', label: 'Mentorías' },
                { id: 'visita',   label: 'Visitas' },
                { id: 'otro',     label: 'Otros' },
            ];
            const TIPO_LABEL = { curso:'Curso', mentoria:'Mentoría', visita:'Visita', otro:'Otro' };
            const TIPO_COLOR = { curso:'#2563eb', mentoria:'#7c3aed', visita:'#0891b2', otro:'#64748b' };

            const pill = (value, label, stateKey, current) => {
                const active = current === value;
                return `<button onclick="App.uiState.${stateKey}='${value}'; App.ui.renderPlannerInspector(document.getElementById('inspector-content'))"
                    style="padding:3px 10px;border-radius:10px;border:1px solid ${active?'#2563eb':'#e2e8f0'};
                           background:${active?'#2563eb':'white'};color:${active?'white':'#64748b'};
                           font-size:0.7rem;font-weight:700;cursor:pointer;white-space:nowrap;">${label}</button>`;
            };

            // Empleados que tienen al menos un evento futuro
            const empsConEventos = [...new Set((App.data.eventos||[]).filter(ev => ev.fechaFin >= today).map(ev => ev.empId))];
            const empsOrdenados = App.data.empleados.filter(e => empsConEventos.includes(e.id)).sort((a,b) => a.customOrder - b.customOrder);

            const filterBar = `
                <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
                    ${TIPOS.map(t => pill(t.id, t.label, 'eventoTipoFilter', tipoFilter)).join('')}
                </div>
                ${empsOrdenados.length > 1 ? `<div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:12px;">
                    ${pill('todos', 'Todos', 'eventoEmpFilter', empFilter)}
                    ${empsOrdenados.map(e => pill(e.id, e.nombre.split(' ')[0], 'eventoEmpFilter', empFilter)).join('')}
                </div>` : '<div style="margin-bottom:12px;"></div>'}`;

            // Filtrar y ordenar eventos futuros (desde hoy)
            const eventos = (App.data.eventos || [])
                .filter(ev => ev.fechaFin >= today)
                .filter(ev => tipoFilter === 'todos' || ev.tipo === tipoFilter)
                .filter(ev => empFilter  === 'todos' || ev.empId === empFilter)
                .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));

            const empName = id => {
                const e = App.data.empleados.find(e => e.id === id);
                return e ? e.nombre : '—';
            };
            const fmtDate = d => {
                if(!d) return '';
                const [y,m,dd] = d.split('-');
                return `${dd}/${m}/${y}`;
            };

            if(!eventos.length) {
                return `<div style="padding:12px;">
                    ${filterBar}
                    <div style="text-align:center;padding:24px 8px;color:#94a3b8;font-size:0.78rem;">
                        Sin eventos próximos${tipoFilter !== 'todos' || empFilter !== 'todos' ? ' con esos filtros' : ''}.
                    </div>
                </div>`;
            }

            const rows = eventos.map(ev => {
                const color = TIPO_COLOR[ev.tipo] || '#64748b';
                const label = TIPO_LABEL[ev.tipo] || 'Otro';
                const esMismaFecha = ev.fechaFin === ev.fechaInicio;
                const fechaStr = esMismaFecha
                    ? fmtDate(ev.fechaInicio)
                    : `${fmtDate(ev.fechaInicio)} → ${fmtDate(ev.fechaFin)}`;
                const isHoy = ev.fechaInicio <= today && ev.fechaFin >= today;
                return `<div style="padding:8px 0;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:3px;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-weight:700;font-size:0.8rem;color:#1e293b;">${empName(ev.empId)}</span>
                        <span style="background:${color}18;color:${color};border:1px solid ${color}40;border-radius:4px;padding:1px 6px;font-size:0.65rem;font-weight:700;">${label}</span>
                        ${isHoy ? `<span style="background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 6px;font-size:0.65rem;font-weight:700;">HOY</span>` : ''}
                    </div>
                    <div style="font-size:0.73rem;color:#475569;">${fechaStr} · ${ev.horaInicio}–${ev.horaFin}</div>
                    ${ev.desc ? `<div style="font-size:0.7rem;color:#94a3b8;font-style:italic;">${ev.desc}</div>` : ''}
                </div>`;
            }).join('');

            return `<div style="padding:12px;overflow-y:auto;">
                ${filterBar}
                <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                    ${App.uiState.inspEvFormOpen ? `
                    <div style="font-size:0.65rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Nuevo evento</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Empleado</label>
                            <select id="insp-ev-empId" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">
                                ${App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder).map(e=>`<option value="${e.id}">${e.nombre.split(' ')[0]}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Tipo</label>
                            <select id="insp-ev-tipo" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">
                                <option value="curso">Curso</option>
                                <option value="mentoria">Mentoría</option>
                                <option value="visita">Visita</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom:6px;">
                        <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Fecha</label>
                        <input type="date" id="insp-ev-fecha" style="display:none;">
                        ${Utils.getDateInputHTML('insp-ev-fecha-picker', '', "document.getElementById('insp-ev-fecha').value=this.dataset.isoValue;")}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Hora inicio</label>
                            <select id="insp-ev-hi" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">${Utils.getTimeOptions('09:00', false, 9)}</select>
                        </div>
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Hora fin</label>
                            <select id="insp-ev-hf" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">${Utils.getTimeOptions('10:00', false, 9)}</select>
                        </div>
                    </div>
                    <div style="margin-bottom:8px;">
                        <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Descripción</label>
                        <input type="text" id="insp-ev-desc" placeholder="Opcional" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;box-sizing:border-box;">
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="const f=document.getElementById('insp-ev-fecha').value; App.logic.eventoSave({empId:document.getElementById('insp-ev-empId').value,tipo:document.getElementById('insp-ev-tipo').value,desc:document.getElementById('insp-ev-desc').value,fechaInicio:f,fechaFin:f,horaInicio:document.getElementById('insp-ev-hi').value,horaFin:document.getElementById('insp-ev-hf').value}); App.uiState.inspEvFormOpen=false; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));"
                            style="flex:1;padding:7px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">💾 Guardar</button>
                        <button onclick="App.uiState.inspEvFormOpen=false; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));"
                            style="padding:7px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:0.75rem;cursor:pointer;">✕</button>
                    </div>` : `
                    <button onclick="App.uiState.inspEvFormOpen=true; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));"
                        style="width:100%;padding:7px;background:white;color:#2563eb;border:1px dashed #93c5fd;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">
                        + Añadir evento
                    </button>`}
                </div>
                ${rows}
            </div>`;
        },

        // --- PRESENTACIÓN / PDF ---
});
