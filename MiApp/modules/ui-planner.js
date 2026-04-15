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
                { id: 'charts',    label: 'Reparto horas',  icon: _ic('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>') },
                { id: 'balance',   label: 'Balance',   icon: _ic('<line x1="3" y1="12" x2="21" y2="12"/><path d="M3 6h18M3 18h18"/>') },
                { id: 'findes',    label: 'Fines',     icon: _ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M8 18h.01M12 18h.01"/>') },
                { id: 'eventos',   label: 'Eventos',   icon: _ic('<rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01"/>') },
                { id: 'festdom',   label: 'Festivos',  icon: _ic('<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>') },
                { id: 'equilibrio',label: 'Equilibrio',icon: _ic('<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>') },
                { id: 'libranzas', label: 'Libranzas', icon: _ic('<path d="M3 12h4l3-9 4 18 3-9h4"/>') },
                { id: 'semanas',   label: 'Semanas',   icon: _ic('<path d="M3 3h18v18H3z"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/>') },
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
            } else if(App.uiState.monitorTab === 'semanas') {
                html += App.ui.renderMonitorSemanas();
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
            } else if(App.uiState.monitorTab === 'libranzas') {
                html += App.ui.renderMonitorLibranzas();
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
                <h3 style="margin-top: 0; font-size: 0.95rem; color: #0f172a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px;">Rotación de Fines de Semana (13W)</h3>
                
                <table style="width: 100%; border-collapse: collapse; font-size: 0.7rem; text-align: center; table-layout: auto;">
                    <thead>
                        <tr style="border-bottom: 2px solid #cbd5e1; color: #64748b;">
                            <th style="text-align: left; padding: 4px 2px; font-weight: 600;">Nombre</th>`;
            
            // Bucle: 00 = semana actual, -01 a -12 = semanas anteriores
            for (let w = 0; w <= 12; w++) {
                const label = w === 0 ? `<span style="color:#2563eb;font-weight:700;">↓</span>` : `-${String(w).padStart(2, '0')}`;
                const titleAttr = w === 0 ? 'Semana actual' : `Hace ${w} semana(s)`;
                html += `<th style="padding: 4px 0; width: 22px;" title="${titleAttr}">${label}</th>`;
            }
            
            html += `   <th style="padding: 4px 2px; width: 28px; font-size:0.6rem;" title="Sábados / Domingos trabajados (13 semanas)">Σ</th>
                        <th style="padding: 4px 2px; width: 28px; font-size:0.55rem; border-left: 2px solid #cbd5e1;" title="Total sábados / domingos en todas las semanas cerradas">🔒</th>
                        <th style="padding: 4px 2px; width: 28px; font-size:0.55rem;" title="Porcentaje sobre semanas cerradas">%</th>
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
                for (let w = 0; w <= 12; w++) {
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
                // Columna resumen S/D — umbrales sobre 13 semanas
                const getCountColor = (n) => n >= 12 ? '#ef4444' : n >= 10 ? '#f59e0b' : n >= 7 ? '#22c55e' : '#64748b';
                const sabColor = getCountColor(countSab);
                const domColor = getCountColor(countDom);
                html += `<td style="padding: 4px 2px; text-align: center; border-left: 1px solid #e2e8f0;">
                            <div style="display:flex; flex-direction:column; gap:1px; align-items:center; font-size:0.6rem; font-weight:700; line-height:1.3;">
                                <span style="color:${sabColor};" title="${countSab} sábados trabajados de 13">S:${countSab}</span>
                                <span style="color:${domColor};" title="${countDom} domingos trabajados de 13">D:${countDom}</span>
                            </div>
                         </td>`;
                // Columna global: conteo sobre TODAS las semanas cerradas
                const allLocked = App.ui._getLockedWeeks(e);
                let gSab = 0, gDom = 0;
                allLocked.forEach(monday => {
                    const sab = addDays(monday, 5);
                    const dom = addDays(monday, 6);
                    if(isWorked(sab, e.id)) gSab++;
                    if(isWorked(dom, e.id)) gDom++;
                });
                // Umbrales proporcionales al total de semanas cerradas (independientes de Σ)
                const total = allLocked.length;
                const getGlobalColor = (n) => {
                    if(total === 0) return '#64748b';
                    const ratio = n / total;
                    return ratio >= 0.9 ? '#ef4444' : ratio >= 0.75 ? '#f59e0b' : ratio >= 0.55 ? '#22c55e' : '#64748b';
                };
                const gSabColor = getGlobalColor(gSab);
                const gDomColor = getGlobalColor(gDom);
                html += `<td style="padding: 4px 2px; text-align: center; border-left: 2px solid #cbd5e1;">
                            <div style="display:flex; flex-direction:column; gap:1px; align-items:center; font-size:0.6rem; font-weight:700; line-height:1.3;">
                                <span style="color:${gSabColor};" title="${gSab} sábados trabajados de ${total} semanas cerradas (${total > 0 ? Math.round(gSab/total*100) : 0}%)">S:${gSab}</span>
                                <span style="color:${gDomColor};" title="${gDom} domingos trabajados de ${total} semanas cerradas (${total > 0 ? Math.round(gDom/total*100) : 0}%)">D:${gDom}</span>
                            </div>
                         </td>`;
                // Columna %: porcentaje sobre semanas cerradas
                const pSab = total > 0 ? Math.round(gSab / total * 100) : 0;
                const pDom = total > 0 ? Math.round(gDom / total * 100) : 0;
                html += `<td style="padding: 4px 2px; text-align: center;">
                            <div style="display:flex; flex-direction:column; gap:1px; align-items:center; font-size:0.55rem; font-weight:700; line-height:1.3; color:#64748b;">
                                <span style="color:${gSabColor};" title="Sábados: ${pSab}% de ${total} cerradas">${pSab}</span>
                                <span style="color:${gDomColor};" title="Domingos: ${pDom}% de ${total} cerradas">${pDom}</span>
                            </div>
                         </td>`;
                html += `</tr>`;
            });

            if (empList.length === 0) {
                html += `<tr><td colspan="17" style="padding: 15px; color: #94a3b8;">No hay empleados activos.</td></tr>`;
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

        // Cálculo de estadísticas del balance semanal — compartido entre inspector y vista cuadrados
        _calcBalanceStats: function() {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let stats = [];
            App.data.empleados.filter(e => {
                return e.active && Utils.empleadoVigenteEnFecha(e, monday);
            }).sort((a,b)=>a.customOrder-b.customOrder).forEach(e => {
                let planned = 0;
                let asig = 0;
                let dayStatuses = [];

                days.forEach(d => {
                    let status = { color: 'transparent', type: 'empty', label: Utils.getDayName(d), code: null };
                    const req = Utils.getRequest(e.id, d);
                    const sid = App.data.schedule[d] ? App.data.schedule[d][e.id] : null;
                    const shift = sid ? Utils.getShift(sid) : null;

                    if(shift) {
                        if(shift.fixed) {
                            status = { color: shift.color, type: 'hollow', label: shift.desc, code: shift.code };
                        } else if(shift.start && shift.end) {
                            const shiftColor = Utils.isCustomShift(shift) ? '#9ca3af' : shift.color;
                            const h = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                            status = { color: shiftColor, type: 'solid', label: `${shift.code || 'CUSTOM'} (${shift.start}-${shift.end})${shift.external ? ' · Externo' : ''}`, code: shift.code || 'CUSTOM', hours: h };
                            asig += h;
                            if(!shift.external) planned += h;
                        }
                    } else if(req && req.status === 'approved') {
                        if(req.type === 'VAC') status = { color: '#a855f7', type: 'hollow', label: 'Vacaciones', code: 'V' };
                        else if(req.type === 'BAJ') status = { color: '#ef4444', type: 'hollow', label: 'Baja', code: 'B' };
                        else if(req.type === 'AP') status = { color: '#ec4899', type: 'hollow', label: 'Asuntos Propios', code: 'P' };
                        else status = { color: '#e5e7eb', type: 'hollow', label: req.type, code: req.type };
                    }
                    dayStatuses.push(status);
                });

                const consecutiveDays = App.logic.calcConsecutiveWorkDays(e.id, monday);
                const { justifiedH, totalContrato, countL, countF } = Utils.calcEsperadas(e, days, e.id);
                const DIAS_SEM = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
                const contratosPorDia = days.map((d, i) => ({ dia: DIAS_SEM[i], h: Utils.getContrato(e, d) }));
                const esMixto = [...new Set(contratosPorDia.map(c => c.h))].length > 1;

                const prevSunday = new Date(monday);
                prevSunday.setDate(prevSunday.getDate() - 1);
                const prevSundayStr = prevSunday.toISOString().split('T')[0];
                const prevSundaySid = App.data.schedule[prevSundayStr] ? App.data.schedule[prevSundayStr][e.id] : null;
                const prevSundayShift = prevSundaySid ? Utils.getShift(prevSundaySid) : null;
                let prevSundayColor = null, prevSundayLabel = null;
                if(prevSundayShift) {
                    if(prevSundayShift.fixed) {
                        prevSundayColor = '#22c55e';
                        prevSundayLabel = `Dom. anterior: ${prevSundayShift.code} (libre)`;
                    } else if(prevSundayShift.start) {
                        prevSundayColor = prevSundayShift.color;
                        prevSundayLabel = `Dom. anterior: ${prevSundayShift.code || 'CUSTOM'} (${prevSundayShift.start}-${prevSundayShift.end})`;
                    }
                }

                stats.push({
                    name: e.nombre, empId: e.id, contract: totalContrato, planned, asig, justifiedH,
                    dayStatuses, consecutiveDays, countL, countF, esMixto, contratosPorDia,
                    prevSundayColor, prevSundayLabel
                });
            });

            const totalContrato   = stats.reduce((s, st) => s + st.contract, 0);
            const totalPlanned    = stats.reduce((s, st) => s + st.planned, 0);
            const totalJustified  = stats.reduce((s, st) => s + st.justifiedH, 0);
            const totalDisponible = totalContrato - totalJustified;
            const totalFaltan     = Math.max(0, totalDisponible - totalPlanned);

            return { stats, days, monday, totalContrato, totalPlanned, totalJustified, totalDisponible, totalFaltan };
        },

        // Vista Cuadrados — balance semanal en el panel principal (reemplaza el grid de barras)
        _renderCuadradosGrid: function(gridScale) {
            const { stats, days, monday } = App.ui._calcBalanceStats();
            const f1 = n => (Math.round(n * 10) / 10);
            const _weekClosed = App.logic.getWeekState(monday) === 'closed';
            const DIAS_HDR = ['L','M','X','J','V','S','D'];
            const eqLimits = App.data.config.equilibrioLimits || { M:0, T:0, I:0, P:0 };
            const eqTypes = ['M','I','T','P'];
            const eqBg = { M:'#eff6ff', I:'#fefce8', T:'#fff7ed', P:'#fdf2f8' };
            const eqHdrFg = { M:'#1e40af', I:'#854d0e', T:'#9a3412', P:'#be185d' };

            const dotSize = 30;
            const dotFontSize = '1rem';
            const dotHollowFont = '0.75rem';
            const fontSize = '0.88rem';

            // Cursor con puntito de color cuando hay turno seleccionado en paleta
            const _paintId = App.uiState.paintShiftId;
            const _paintShift = _paintId ? App.data.shiftDefs.find(s => s.id === _paintId) : null;
            const _cursorCss = _paintShift ? (() => {
                const c = _paintShift.color || '#2563eb';
                const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='6' cy='6' r='5' fill='${c}' stroke='white' stroke-width='1.5'/></svg>`;
                const encoded = btoa(svg);
                return `<style>.cuadrados-table td div[onclick] { cursor: url("data:image/svg+xml;base64,${encoded}") 6 6, crosshair !important; }</style>`;
            })() : '';

            let html = _cursorCss;
            html += `<div class="planner-grid-wrapper-scale">
                <div class="planner-grid-module-scalable" id="planner-grid-scalable" style="transform:scale(${gridScale});transform-origin:top left;${_weekClosed ? 'border-color:#22c55e;' : ''}">
                <table class="balance-table cuadrados-table" style="font-size:${fontSize};">
                    <thead><tr>
                        <th class="cq-name" style="min-width:90px;">Emp</th>
                        <th>Rol</th>
                        <th>Tag</th>
                        <th>Cntr</th>
                        <th>Asig</th>
                        <th>Dif</th>
                        <th style="border-left:2px solid #cbd5e1;">Des</th>
                        <th>Fes</th>
                        <th style="border-left:2px solid #cbd5e1;">SEG</th>
                        <th>LIB</th>
                        <th style="border-left:2px solid #cbd5e1;min-width:${dotSize - 4}px;background:#f8fafc;"><span class="diff-tooltip-wrap" style="cursor:help;">DA<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Domingo Anterior — turno del domingo de la semana previa. Útil para evitar encadenar partidos u otros turnos pesados entre semanas.</div></span></th>
                        ${DIAS_HDR.map((d, i) => `<th style="${i === 0 ? 'border-left:1px solid #e2e8f0;' : ''}min-width:${dotSize + 4}px;">${d}</th>`).join('')}
                        ${eqTypes.map((t, ti) => `<th style="${ti === 0 ? 'border-left:2px solid #cbd5e1;' : ''}background:${eqBg[t]};border-bottom:2px solid ${eqHdrFg[t]}30;"><span class="diff-tooltip-wrap" style="cursor:help;">${t}<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Equilibrio: turnos de tipo <b>${t}</b> en la semana actual.<br><br><a href="#" onclick="event.preventDefault();event.stopPropagation();App.ui._openEquilibrioConfig();" style="color:#60a5fa;text-decoration:underline;">⚙ Configurar límites</a></div></span></th>`).join('')}
                    </tr></thead>
                    <tbody>`;

            stats.forEach(st => {
                const _emp = App.data.empleados.find(e => e.id === st.empId);
                const rolEnFecha = _emp ? Utils.getRolEnFecha(_emp, monday) : 'STF';
                const computedTag = ['MNG','AM','SPV'].includes(rolEnFecha) ? 3 : 1;
                const tag3Class = computedTag >= 3 ? 'tag3-highlight' : '';
                const tagClass = computedTag === 3 ? 'badge-tag-3' : 'badge-tag-1';

                // Diff
                const coveredDiff = Math.round((st.asig + st.justifiedH - st.contract) * 10) / 10;
                const hasJustified = st.justifiedH > 0;
                const _threshold = st.contract > 0 ? st.contract * 0.1 : 0.5;
                const isFullyCovered = Math.abs(coveredDiff) <= _threshold;
                let diffClass = isFullyCovered ? 'val-good' : (coveredDiff < 0 ? 'val-warn' : 'val-good');
                let diffDisplay = coveredDiff > 0 ? `+${coveredDiff}` : `${coveredDiff}`;

                const _desglose = (extraFooter) => `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desglose de horas</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Trabajo</span><span style="font-weight:600;">${f1(st.asig)}h</span></div>${hasJustified ? `<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">✦ Ausencias</span><span style="color:#a78bfa;font-weight:600;">+${f1(st.justifiedH)}h</span></div>` : ''}<div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">📋 Contrato</span><span style="font-weight:600;">${f1(st.contract)}h</span></div>${extraFooter}`;
                let diffTitle;
                if(isFullyCovered) {
                    diffTitle = hasJustified ? _desglose(`<div style="margin-top:6px;padding:4px 6px;background:rgba(16,185,129,0.15);border-radius:4px;color:#6ee7b7;font-size:10px;">✓ Semana cubierta</div>`) : null;
                } else {
                    diffTitle = _desglose(`<div style="margin-top:6px;padding:4px 6px;background:rgba(245,158,11,0.2);border-radius:4px;color:#fbbf24;font-size:10px;">${coveredDiff < 0 ? `⚠️ Faltan ${f1(Math.abs(coveredDiff))}h por cubrir` : `⬆ ${f1(coveredDiff)}h de más`}</div>`);
                }

                // SEG
                let consColor = '#22c55e';
                if(st.consecutiveDays >= 6) consColor = '#ef4444';
                else if(st.consecutiveDays >= 4) consColor = '#f59e0b';
                let consHtml = `<div style="width:22px;height:22px;border-radius:4px;background-color:${consColor};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.8rem;box-shadow:0 1px 2px rgba(0,0,0,0.1);cursor:help;margin:0 auto;" title="Lleva ${st.consecutiveDays} día${st.consecutiveDays !== 1 ? 's' : ''} consecutivo${st.consecutiveDays !== 1 ? 's' : ''}">${st.consecutiveDays}</div>`;

                // Celda DA (Domingo Anterior) — cuadrado más pequeño y translúcido
                const daSize = dotSize - 6;
                let daCell = '';
                if(st.prevSundayColor && st.prevSundayColor !== '#22c55e') {
                    // Turno de trabajo el domingo anterior
                    // Obtener horas del domingo anterior
                    const _prevSun = new Date(monday); _prevSun.setDate(_prevSun.getDate() - 1);
                    const _prevSunStr = _prevSun.toISOString().split('T')[0];
                    const _prevSid = App.data.schedule[_prevSunStr] ? App.data.schedule[_prevSunStr][st.empId] : null;
                    const _prevSh = _prevSid ? Utils.getShift(_prevSid) : null;
                    const _prevH = _prevSh && _prevSh.start && _prevSh.end ? Utils.calcHours(_prevSh.start, _prevSh.end, _prevSh.breakStart, _prevSh.breakEnd, _prevSh.break) : null;
                    const _prevLabel = _prevH != null ? (_prevH % 1 === 0 ? String(_prevH) : String(Math.round(_prevH * 10) / 10)) : '';
                    const _phex = st.prevSundayColor.replace('#',''); const _pr=parseInt(_phex.substring(0,2),16),_pg=parseInt(_phex.substring(2,4),16),_pb=parseInt(_phex.substring(4,6),16);
                    const _phColor = ((_pr*0.299+_pg*0.587+_pb*0.114)/255) > 0.55 ? '#1e293b' : '#ffffff';
                    daCell = `<td style="border-left:2px solid #cbd5e1;padding:3px 2px;background:#f8fafc;"><div style="width:${daSize}px;height:${daSize}px;border-radius:3px;background-color:${st.prevSundayColor};opacity:0.45;display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:700;color:${_phColor};line-height:1;margin:0 auto;cursor:help;" title="${st.prevSundayLabel}">${_prevLabel}</div></td>`;
                } else if(st.prevSundayColor === '#22c55e') {
                    daCell = `<td style="border-left:2px solid #cbd5e1;padding:3px 2px;background:#f8fafc;"><div style="width:${daSize}px;height:${daSize}px;border-radius:3px;border:2px solid #22c55e;opacity:0.45;margin:0 auto;box-sizing:border-box;cursor:help;" title="${st.prevSundayLabel}"></div></td>`;
                } else {
                    daCell = `<td style="border-left:2px solid #cbd5e1;padding:3px 2px;background:#f8fafc;"><div style="width:${daSize}px;height:${daSize}px;border-radius:3px;border:1px dashed #e2e8f0;opacity:0.35;margin:0 auto;box-sizing:border-box;" title="Sin turno asignado el domingo anterior"></div></td>`;
                }

                // Dots — cada día como celda <td> separada
                let dotsCells = '';
                let eqCount = { M:0, T:0, I:0, P:0 };

                st.dayStatuses.forEach((s, di) => {
                    const _sel = App.uiState._balSwap || {};
                    const _isSelected = (_sel.a && _sel.a.empId === st.empId && _sel.a.di === di) || (_sel.b && _sel.b.empId === st.empId && _sel.b.di === di);
                    const _selRing = _isSelected ? 'outline:2.5px solid #f59e0b;outline-offset:1px;' : '';
                    const _click = `onclick="if(event.altKey){event.stopPropagation();App.ui._balanceErase('${st.empId}',${di});return;}App.ui._balanceSwapSelect('${st.empId}',${di})"`;

                    // Contar tipo de turno para equilibrio
                    if(s.type === 'solid') {
                        const dateStr = days[di];
                        const sid = App.data.schedule[dateStr] ? App.data.schedule[dateStr][st.empId] : null;
                        const shift = sid ? Utils.getShift(sid) : null;
                        if(shift) {
                            const type = Utils.classifyShift(shift);
                            if(eqCount[type] !== undefined) eqCount[type]++;
                        }
                    }

                    let dotHtml = '';
                    if(s.type === 'solid') {
                        const hLabel = s.hours != null ? (s.hours % 1 === 0 ? String(s.hours) : String(Math.round(s.hours * 10) / 10)) : '';
                        const _hex = s.color.replace('#',''); const _r=parseInt(_hex.substring(0,2),16),_g=parseInt(_hex.substring(2,4),16),_b=parseInt(_hex.substring(4,6),16);
                        const hColor = ((_r*0.299+_g*0.587+_b*0.114)/255) > 0.55 ? '#1e293b' : '#ffffff';
                        dotHtml = `<div ${_click} style="width:${dotSize}px;height:${dotSize}px;border-radius:4px;background-color:${s.color};display:flex;align-items:center;justify-content:center;font-size:${dotFontSize};font-weight:800;color:${hColor};line-height:1;cursor:pointer;margin:0 auto;${_selRing}" title="${s.label}">${hLabel}</div>`;
                    } else if(s.type === 'hollow') {
                        const showLetter = (s.code !== 'L' && s.code !== 'V');
                        dotHtml = `<div ${_click} style="width:${dotSize}px;height:${dotSize}px;border-radius:4px;border:2.5px solid ${s.color};display:flex;align-items:center;justify-content:center;font-size:${dotHollowFont};font-weight:700;color:${s.color};cursor:pointer;margin:0 auto;box-sizing:border-box;${_selRing}" title="${s.label}">${showLetter ? s.code : ''}</div>`;
                    } else {
                        dotHtml = `<div ${_click} style="width:${dotSize}px;height:${dotSize}px;border-radius:4px;border:1.5px dashed #cbd5e1;cursor:pointer;margin:0 auto;box-sizing:border-box;${_selRing}" title="${s.label}"></div>`;
                    }
                    dotsCells += `<td style="padding:3px 2px;${di === 0 ? 'border-left:1px solid #e2e8f0;' : ''}">${dotHtml}</td>`;
                });

                // Equilibrio cells
                let eqCells = '';
                eqTypes.forEach((t, ti) => {
                    const v = eqCount[t];
                    const limit = eqLimits[t] || 0;
                    const overLimit = limit > 0 && v > limit;
                    const color = overLimit ? '#ef4444' : (v > 0 ? '#1e293b' : '#cbd5e1');
                    eqCells += `<td style="${ti === 0 ? 'border-left:2px solid #cbd5e1;' : ''}font-weight:700;font-size:0.85rem;color:${color};background:${eqBg[t]};">${v || '—'}</td>`;
                });

                // LIB chivato
                let chivatoHtml = '';
                if(st.countL >= 2) {
                    chivatoHtml = `<div style="width:16px;height:16px;background:#22c55e;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;cursor:help;box-shadow:0 1px 2px rgba(0,0,0,0.2);margin:0 auto;" title="✓ Tiene ${st.countL} libranzas L">✓</div>`;
                } else if((st.countL >= 1 && st.countF >= 1) || st.countF >= 2) {
                    chivatoHtml = `<div style="width:16px;height:16px;background:#f59e0b;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.65rem;font-weight:700;cursor:help;box-shadow:0 1px 2px rgba(0,0,0,0.2);margin:0 auto;" title="⚠ Descansos cubiertos con festivos">⚠</div>`;
                }

                // DES y FES
                let _acum = 0, _acumColor = '#10b981', _acumSign = '', _autoRec = 0;
                if(_emp) {
                    const _lw = App.ui._getLockedWeeks(_emp);
                    _acum = _emp.saldoInicial || 0;
                    _lw.forEach(isoWeek => {
                        const wdays = Utils.getWeekDays(isoWeek);
                        let worked = 0;
                        wdays.forEach(d => { const sid = App.data.schedule[d]?.[_emp.id]; const sh = sid ? Utils.getShift(sid) : null; if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break); });
                        const { esperadas } = Utils.calcEsperadas(_emp, wdays, _emp.id);
                        _acum += worked - esperadas;
                    });
                    _acum = Math.round((_acum + (_emp.ajustes||[]).reduce((s,a)=>s+a.signo*a.horas,0)) * 10) / 10;
                    _acumColor = _acum > 0.5 ? '#f59e0b' : _acum < -0.5 ? '#3b82f6' : '#10b981';
                    _acumSign  = _acum > 0 ? '+' : '';
                    _autoRec   = App.ui._calcFestivosPend(_emp);
                }
                const _desCell = `<span style="font-family:monospace;font-weight:700;color:${_acumColor};">${_acumSign}${f1(_acum)}</span>`;
                let _fesCell = _autoRec > 0
                    ? `<span style="font-weight:700;color:#ef4444;">${_autoRec}</span>`
                    : `<span style="font-weight:700;color:#10b981;">✓</span>`;

                let cntrHtml = `${f1(st.contract)}`;
                if(st.esMixto) cntrHtml = `${f1(st.contract)}<sup style="font-size:0.55rem;color:#f59e0b;">⚡</sup>`;

                const _difTipContent = diffTitle || '';
                const _difCell = _difTipContent
                    ? `<span class="diff-tooltip-wrap" style="cursor:help;">${diffDisplay}<div class="diff-tooltip" style="min-width:220px;white-space:normal;line-height:1.6;">${_difTipContent}</div></span>`
                    : diffDisplay;

                html += `<tr class="b-row ${tag3Class}" style="height:${dotSize + 10}px;">
                    <td class="cq-name" title="${st.name}" style="cursor:pointer;" onclick="App.uiState.individualEmpId='${st.empId}'; App.uiState.plannerViewMode='individual'; App.ui.renderPlanner(document.getElementById('main-view'));">${st.name}</td>
                    <td><span class="badge-role">${rolEnFecha}</span></td>
                    <td><span class="${tagClass}">T${computedTag}</span></td>
                    <td>${cntrHtml}</td>
                    <td>${f1(st.asig)}</td>
                    <td class="${diffClass}" style="position:relative;">${_difCell}</td>
                    <td style="border-left:2px solid #cbd5e1;">${_desCell}</td>
                    <td>${_fesCell}</td>
                    <td style="border-left:2px solid #cbd5e1;">${consHtml}</td>
                    <td>${chivatoHtml || '—'}</td>
                    ${daCell}
                    ${dotsCells}
                    ${eqCells}
                </tr>`;
            });

            html += `</tbody></table>`;

            // Barra de intercambio
            const _sw = App.uiState._balSwap || {};
            if (_sw.a && _sw.b && _sw.a.di === _sw.b.di) {
                const _empA = App.data.empleados.find(e => e.id === _sw.a.empId);
                const _empB = App.data.empleados.find(e => e.id === _sw.b.empId);
                const _dayLabel = DIAS_HDR[_sw.a.di];
                html += `<div style="padding:8px 12px;background:#fffbeb;border-top:1px solid #fde68a;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:0.85rem;color:#92400e;font-weight:600;">
                        ${_empA ? _empA.nombre : '?'} ⇄ ${_empB ? _empB.nombre : '?'} · ${['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'][_sw.a.di]}
                    </span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.ui._balanceSwapExec()" style="padding:4px 12px;border:none;border-radius:5px;background:#2563eb;color:white;font-size:0.8rem;font-weight:700;cursor:pointer;">Intercambiar</button>
                        <button onclick="App.uiState._balSwap={};App.ui.renderPlanner(document.getElementById('main-view'));" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.8rem;font-weight:600;cursor:pointer;">Cancelar</button>
                    </div>
                </div>`;
            }

            html += `</div></div>`;
            return html;
        },

        renderMonitorBalance: function() {
            const { stats, days, monday, totalContrato, totalPlanned, totalJustified, totalDisponible, totalFaltan } = App.ui._calcBalanceStats();
            const f1 = n => (Math.round(n * 10) / 10);

            // Cursor con puntito si hay turno en paleta
            const _pId = App.uiState.paintShiftId;
            const _pSh = _pId ? App.data.shiftDefs.find(s => s.id === _pId) : null;
            const _balCursor = _pSh ? (() => {
                const c = _pSh.color || '#2563eb';
                const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24'><circle cx='6' cy='6' r='5' fill='${c}' stroke='white' stroke-width='1.5'/></svg>`;
                return `<style>.week-dots .dot { cursor: url("data:image/svg+xml;base64,${btoa(svg)}") 6 6, crosshair !important; }</style>`;
            })() : '';

            let html = _balCursor + `
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
            <table class="balance-table">
                <thead><tr>
                    <th style="text-align:left;"><span class="diff-tooltip-wrap" style="cursor:help;">Emp<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Nombre del empleado.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">Cntr<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Horas de contrato semanales del empleado.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">Asig<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Horas de trabajo asignadas esta semana (turnos con horario real). No incluye L ni festivos.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">Dif<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Diferencia entre horas asignadas (+ ausencias justificadas) y horas de contrato. Verde = cubierto, azul = falta trabajo, naranja = exceso.</div></span></th>
                    <th style="border-left:2px solid #cbd5e1;"><span class="diff-tooltip-wrap" style="cursor:help;">Des<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Desvío acumulado sobre semanas cerradas 🔒. Positivo = trabajó de más · Negativo = debe horas.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">Fes<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Festivos trabajados pendientes de compensar 🔒 (solo semanas cerradas).</div></span></th>
                    <th style="border-left:2px solid #cbd5e1;"><span class="diff-tooltip-wrap" style="cursor:help;">SEG<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Días consecutivos trabajando incluyendo esta semana. Verde ≤3 · Naranja 4–5 · Rojo ≥6.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">LIB<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Libranzas completas esta semana. Verde ✓ = 2 libranzas L. Naranja ⚠ = 1L+1F.</div></span></th>
                    <th style=""><span class="diff-tooltip-wrap" style="cursor:help;">Semana (L-D)<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;font-weight:400;text-transform:none;">Turnos de la semana: sólido = turno trabajado (con sus horas), borde = ausencia con código.</div></span></th>
                </tr></thead>
                <tbody>`;
            
            stats.forEach(st => {
                // Diff neto: trabajo (incl. externos) + ausencias justificadas - contrato
                const coveredDiff = Math.round((st.asig + st.justifiedH - st.contract) * 10) / 10;
                const rawDiff = Math.round((st.asig - st.contract) * 10) / 10;
                const hasJustified = st.justifiedH > 0;
                const _threshold = st.contract > 0 ? st.contract * 0.1 : 0.5;
                const isFullyCovered = Math.abs(coveredDiff) <= _threshold;

                let diffClass, diffDisplay, diffTitle = null;

                const _desglose = (extraFooter) => `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desglose de horas</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Trabajo</span><span style="font-weight:600;">${f1(st.asig)}h</span></div>${hasJustified ? `<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">✦ Ausencias</span><span style="color:#a78bfa;font-weight:600;">+${f1(st.justifiedH)}h</span></div>` : ''}<div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">📋 Contrato</span><span style="font-weight:600;">${f1(st.contract)}h</span></div>${extraFooter}`;

                diffDisplay = coveredDiff > 0 ? `+${coveredDiff}` : `${coveredDiff}`;

                if(isFullyCovered) {
                    diffClass = 'val-good';
                    diffTitle = hasJustified ? _desglose(`<div style="margin-top:6px;padding:4px 6px;background:rgba(16,185,129,0.15);border-radius:4px;color:#6ee7b7;font-size:10px;">✓ Semana cubierta</div>`) : null;
                } else {
                    diffClass = coveredDiff < 0 ? 'val-warn' : 'val-good';
                    diffTitle = _desglose(`<div style="margin-top:6px;padding:4px 6px;background:rgba(245,158,11,0.2);border-radius:4px;color:#fbbf24;font-size:10px;">${coveredDiff < 0 ? `⚠️ Faltan ${f1(Math.abs(coveredDiff))}h por cubrir` : `⬆ ${f1(coveredDiff)}h de más`}</div>`);
                }
                
                // Días consecutivos - color según cantidad
                let consColor = '#22c55e'; // Verde por defecto (0-3)
                if(st.consecutiveDays >= 6) consColor = '#ef4444'; // Rojo si 6+
                else if(st.consecutiveDays >= 4) consColor = '#f59e0b'; // Naranja si 4-5
                
                let consHtml = `<div style="width:16px;height:16px;border-radius:3px;background-color:${consColor};color:white;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:0.65rem;box-shadow:0 1px 2px rgba(0,0,0,0.1);cursor:help;margin:0 auto;" title="Lleva ${st.consecutiveDays} día${st.consecutiveDays !== 1 ? 's' : ''} consecutivo${st.consecutiveDays !== 1 ? 's' : ''} trabajando (incluye días de esta semana con turno asignado)">${st.consecutiveDays}</div>`;
                
                // Renderizar dots de la semana (clickables para intercambio)
                let dotsHtml = `<div class="week-dots" style="position: relative;">`;
                // Espacio reservado para destello fantasmal del domingo anterior
                const _glowBg = st.prevSundayColor
                    ? `background:linear-gradient(to left, transparent, ${st.prevSundayColor}90);filter:blur(0.5px);`
                    : '';
                dotsHtml += `<div style="width:3px;min-height:100%;border-radius:1px;margin-right:-1px;${_glowBg}" title="${st.prevSundayLabel || ''}"></div>`;
                st.dayStatuses.forEach((s, di) => {
                    const _titleSuffix = (di === 0 && st.prevSundayLabel) ? `\n${st.prevSundayLabel}` : '';
                    const _sel = App.uiState._balSwap || {};
                    const _isSelected = (_sel.a && _sel.a.empId === st.empId && _sel.a.di === di)
                                     || (_sel.b && _sel.b.empId === st.empId && _sel.b.di === di);
                    const _selRing = _isSelected ? 'outline:2.5px solid #f59e0b;outline-offset:1px;' : '';
                    const _click = `onclick="if(event.altKey){event.stopPropagation();App.ui._balanceErase('${st.empId}',${di});return;}App.ui._balanceSwapSelect('${st.empId}',${di})"`;
                    if(s.type === 'solid') {
                        const hLabel = s.hours != null ? (s.hours % 1 === 0 ? String(s.hours) : String(Math.round(s.hours * 10) / 10)) : '';
                        const _hex = s.color.replace('#',''); const _r=parseInt(_hex.substring(0,2),16),_g=parseInt(_hex.substring(2,4),16),_b=parseInt(_hex.substring(4,6),16);
                        const hColor = ((_r*0.299+_g*0.587+_b*0.114)/255) > 0.55 ? '#1e293b' : '#ffffff';
                        dotsHtml += `<div class="dot" ${_click} style="background-color:${s.color};display:flex;align-items:center;justify-content:center;font-size:0.8rem;font-weight:800;color:${hColor};line-height:1;cursor:pointer;${_selRing}" title="${s.label}${_titleSuffix}">${hLabel}</div>`;
                    } else if(s.type === 'hollow') {
                        const showLetter = (s.code !== 'L' && s.code !== 'V');
                        dotsHtml += `<div class="dot" ${_click} style="
                            border: 2px solid ${s.color};
                            display: flex; align-items: center; justify-content: center;
                            font-size: 0.6rem; font-weight: 700; color: ${s.color};
                            cursor:pointer;${_selRing}
                        " title="${s.label}${_titleSuffix}">${showLetter ? s.code : ''}</div>`;
                    } else {
                        dotsHtml += `<div class="dot" ${_click} style="border:1px dashed #e2e8f0;cursor:pointer;${_selRing}" title="${s.label}${_titleSuffix}"></div>`;
                    }
                });
                
                // Chivato de descansos completos
                let chivatoHtml = '';
                if(st.countL >= 2) {
                    // 2 o más L → Verde
                    chivatoHtml = `<div style="width:12px;height:12px;background:#22c55e;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;cursor:help;box-shadow:0 1px 2px rgba(0,0,0,0.2);margin:0 auto;" title="✓ Tiene ${st.countL} libranzas L - Puede asignar turnos extra sin comprometer descanso">✓</div>`;
                } else if((st.countL >= 1 && st.countF >= 1) || st.countF >= 2) {
                    // 1L+1F o 2F → Naranja: cubierto pero sin L+L
                    const _lFaltan = 2 - st.countL;
                    const _tip = st.countF >= 2
                        ? `⚠ ${st.countF} festivos como libranza, sin L real. Añadir ${_lFaltan} L para tener descanso garantizado`
                        : '⚠ Tiene 1 L + 1 F - Descansos cubiertos. Considera añadir una L adicional para evitar compensar festivo';
                    chivatoHtml = `<div style="width:12px;height:12px;background:#f59e0b;color:white;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.55rem;font-weight:700;cursor:help;box-shadow:0 1px 2px rgba(0,0,0,0.2);margin:0 auto;" title="${_tip}">⚠</div>`;
                }
                
                dotsHtml += `</div>`;
                
                // --- Calcular desvío y festivos para este empleado ---
                const _emp = App.data.empleados.find(e => e.id === st.empId);
                let _acum = 0, _acumColor = '#10b981', _acumSign = '', _autoRec = 0;
                let _rangeStart = Utils.getMonday(App.uiState.currentDate), _rangeEnd = _rangeStart;
                if(_emp) {
                    const _lw = App.ui._getLockedWeeks(_emp);
                    _rangeStart = _lw.length > 0 ? _lw[0] : _rangeStart;
                    _rangeEnd   = _lw.length > 0 ? _lw[_lw.length-1] : _rangeEnd;
                    _acum = _emp.saldoInicial || 0;
                    _lw.forEach(isoWeek => {
                        const wdays = Utils.getWeekDays(isoWeek);
                        let worked = 0;
                        wdays.forEach(d => {
                            const sid = App.data.schedule[d]?.[_emp.id];
                            const sh = sid ? Utils.getShift(sid) : null;
                            if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                        });
                        const { esperadas } = Utils.calcEsperadas(_emp, wdays, _emp.id);
                        _acum += worked - esperadas;
                    });
                    _acum = Math.round((_acum + (_emp.ajustes||[]).reduce((s,a)=>s+a.signo*a.horas,0)) * 10) / 10;
                    _acumColor = _acum > 0.5 ? '#f59e0b' : _acum < -0.5 ? '#3b82f6' : '#10b981';
                    _acumSign  = _acum > 0 ? '+' : '';
                    _autoRec   = App.ui._calcFestivosPend(_emp);
                }
                // Lista de festivos pendientes para tooltip — misma lógica que _calcFestivosPend
                const _fesPendList = (() => {
                    if(!_emp || _autoRec === 0) return [];
                    const locked = App.data.lockedDays || {};
                    const tracking = _emp.festivoTracking || {};
                    const realRs = new Set();
                    Object.keys(App.data.schedule || {}).forEach(iso => {
                        const sid = App.data.schedule[iso]?.[_emp.id];
                        const sh = sid ? Utils.getShift(sid) : null;
                        if(sh && sh.fixed && sh.code === 'R') realRs.add(iso);
                    });
                    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                    const result = [];
                    (App.data.storeConfig.holidays || [])
                        .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(_emp, h.date))
                        .forEach(h => {
                            const tr = tracking[h.date] || {};
                            if(tr.rDate && realRs.has(tr.rDate)) return;
                            const sid = App.data.schedule[h.date]?.[_emp.id];
                            const shift = sid ? Utils.getShift(sid) : null;
                            if(!shift) return;
                            let counts = false;
                            if(shift.fixed && shift.code === 'V') {
                                counts = true; // Vacaciones NO absorben festivos
                            } else if(shift.fixed && shift.code === 'F') {
                                const wdays = Utils.getWeekDays(Utils.getMonday(h.date));
                                let countL = 0;
                                wdays.forEach(d => { const s2 = App.data.schedule[d]?.[_emp.id]; const sh2 = s2 ? Utils.getShift(s2) : null; if(sh2 && sh2.fixed && sh2.code === 'L') countL++; });
                                if(countL < 2) counts = true;
                            } else if(shift.start && shift.end) {
                                counts = true;
                            }
                            if(counts) {
                                const d = new Date(h.date);
                                result.push(`${d.getDate()} ${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)}`);
                            }
                        });
                    return result;
                })();

                const _recPend = _emp?.recPendientes || 0;
                const _vacPend = _emp?.vacPendientes || 0;
                const _pendHTML = (_recPend > 0 || _vacPend > 0 || _autoRec > 0) ? `
                    <div style="border-top:1px solid rgba(255,255,255,0.1);margin-top:7px;padding-top:7px;">
                        <div style="font-weight:700;color:#e2e8f0;margin-bottom:5px;font-size:10px;text-transform:uppercase;">Pendiente de dar</div>
                        ${_autoRec > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;">🔴 Recup. festivos (auto)</span><span style="color:#f87171;font-weight:700;">${_autoRec} día${_autoRec!==1?'s':''}</span></div>` : ''}
                        ${_recPend > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:3px;"><span style="color:#94a3b8;">🔴 Recup. arrastre</span><span style="color:#f87171;font-weight:700;">${_recPend} día${_recPend!==1?'s':''}</span></div>` : ''}
                        ${_vacPend > 0 ? `<div style="display:flex;justify-content:space-between;gap:12px;margin-top:3px;"><span style="color:#94a3b8;">🟣 Vacaciones</span><span style="color:#c084fc;font-weight:700;">${_vacPend} día${_vacPend!==1?'s':''}</span></div>` : ''}
                    </div>` : '';
                // Tooltip contrato: solo si es mixto
                let _cntrTooltip = '';
                if (st.esMixto) {
                    const _rows = st.contratosPorDia.map(c =>
                        `<div style="display:flex;justify-content:space-between;gap:8px;"><span style="color:#94a3b8;">${c.dia}</span><span style="font-weight:600;">${c.h}h</span></div>`
                    ).join('');
                    _cntrTooltip = `<div style="font-weight:700;color:#e2e8f0;margin-bottom:5px;">⚡ Contrato mixto</div>${_rows}<div style="display:flex;justify-content:space-between;gap:8px;border-top:1px solid rgba(255,255,255,0.1);margin-top:4px;padding-top:4px;"><span style="color:#94a3b8;">Total</span><span style="font-weight:700;">${f1(st.contract)}h</span></div>`;
                }

                const _shortName = st.name.length > 10 ? st.name.slice(0, 10) + '…' : st.name;
                const _desCell = `<span style="font-family:monospace;font-weight:700;font-size:0.75rem;color:${_acumColor};">${_acumSign}${f1(_acum)}</span>`;
                const _fesTooltip = _autoRec > 0 && _fesPendList.length > 0
                    ? `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:4px;">Festivos sin recuperar</div>${_fesPendList.map(f=>`<div style="color:#fca5a5;font-size:0.72rem;line-height:1.7;">${f}</div>`).join('')}`
                    : null;
                // Rs sobrantes: recuperaciones atribuidas sin festivo que las necesite
                const _rsSobrantes = _emp ? App.ui._calcRsDisponibles(_emp) : 0;
                const _rsSobranteList = (() => {
                    if (!_emp || _rsSobrantes === 0) return [];
                    const locked = App.data.lockedDays || {};
                    const tracking = _emp.festivoTracking || {};
                    const assignedRDates = new Set(Object.values(tracking).map(t => t.rDate).filter(Boolean));
                    const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                    const result = [];
                    Object.keys(App.data.schedule || {}).sort().forEach(iso => {
                        if (!locked[iso]) return;
                        const sid = App.data.schedule[iso]?.[_emp.id];
                        const sh = sid ? Utils.getShift(sid) : null;
                        if (sh && sh.fixed && sh.code === 'R' && !assignedRDates.has(iso)) {
                            const d = new Date(iso);
                            const mon = Utils.getMonday(iso);
                            const mD = new Date(mon);
                            const monEnd = new Date(mD); monEnd.setDate(mD.getDate() + 6);
                            const semLabel = `${mD.getDate()} ${monthNames[mD.getMonth()]}–${monEnd.getDate()} ${monthNames[monEnd.getMonth()]}`;
                            result.push(`${d.getDate()} ${monthNames[d.getMonth()]} '${String(d.getFullYear()).slice(2)} <span style="color:#64748b;font-size:0.6rem;">(sem. ${semLabel})</span>`);
                        }
                    });
                    return result;
                })();
                const _rsSobranteTooltip = _rsSobrantes > 0
                    ? `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:4px;">Recuperaciones sobrantes</div>${_rsSobranteList.map(f => `<div style="color:#93c5fd;font-size:0.72rem;line-height:1.7;">${f}</div>`).join('')}`
                    : null;
                let _fesCell;
                if (_autoRec > 0) {
                    // Rojo: festivos pendientes de recuperar
                    const _tip = _fesTooltip || '';
                    _fesCell = `<span class="diff-tooltip-wrap" style="cursor:help;font-weight:700;font-size:0.75rem;color:#ef4444;">${_autoRec}<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;">${_tip}</div></span>`;
                } else if (_rsSobrantes > 0) {
                    // Azul: recuperaciones de más
                    _fesCell = `<span class="diff-tooltip-wrap" style="cursor:help;font-weight:700;font-size:0.75rem;color:#3b82f6;">${_rsSobrantes}<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;">${_rsSobranteTooltip}</div></span>`;
                } else {
                    // Verde: todo cuadrado
                    _fesCell = `<span style="font-weight:700;font-size:0.75rem;color:#10b981;">✓</span>`;
                }

                // ASIG tooltip
                const _asigTooltip = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Horas asignadas</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Trabajo</span><span style="font-weight:600;">${f1(st.asig)}h</span></div>${st.justifiedH > 0 ? `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">✦ Ausencias just.</span><span style="color:#a78bfa;font-weight:600;">+${f1(st.justifiedH)}h</span></div>` : ''}<div style="margin-top:5px;font-size:10px;color:#64748b;">Solo turnos con horario real. L y festivos no cuentan.</div>`;

                // DIF tooltip — siempre presente
                const _difThreshold = st.contract * 0.1;
                const _difAbsDev = Math.abs(coveredDiff);
                const _difFooter = _difAbsDev <= _difThreshold
                    ? `<div style="margin-top:6px;padding:4px 6px;background:rgba(16,185,129,0.15);border-radius:4px;color:#6ee7b7;font-size:10px;">✓ Semana cubierta</div>`
                    : `<div style="margin-top:6px;padding:4px 6px;background:rgba(245,158,11,0.15);border-radius:4px;color:#fbbf24;font-size:10px;">${coveredDiff > 0 ? `⬆ ${f1(coveredDiff)}h de más` : `⬇ Faltan ${f1(_difAbsDev)}h`}</div>`;
                const _difTooltipContent = diffTitle || `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Diferencia semanal</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">🔵 Asignado</span><span style="font-weight:600;">${f1(st.asig)}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;border-top:1px solid rgba(255,255,255,0.1);margin-top:5px;padding-top:5px;"><span style="color:#94a3b8;">📋 Contrato</span><span style="font-weight:600;">${f1(st.contract)}h</span></div>${_difFooter}`;

                // SEG tooltip
                const _segColor = st.consecutiveDays >= 6 ? '#ef4444' : st.consecutiveDays >= 4 ? '#f59e0b' : '#22c55e';
                const _segLabel = st.consecutiveDays >= 6 ? 'Riesgo de fatiga — revisar descansos' : st.consecutiveDays >= 4 ? 'Tramo largo — vigilar' : 'Dentro de lo normal';
                const _segTooltip = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Días consecutivos trabajando</div><div style="display:flex;justify-content:space-between;gap:12px;"><span style="color:#94a3b8;">Días seguidos</span><span style="color:${_segColor};font-weight:700;">${st.consecutiveDays}</span></div><div style="margin-top:6px;padding:4px 6px;background:rgba(255,255,255,0.05);border-radius:4px;font-size:10px;color:${_segColor};">${_segLabel}</div><div style="margin-top:6px;font-size:10px;color:#64748b;">Incluye días de esta semana con turno asignado</div>`;

                // Wrap consHtml in tooltip
                const _consWithTip = `<span class="diff-tooltip-wrap" style="cursor:help;">${consHtml}<div class="diff-tooltip" style="min-width:220px;white-space:normal;line-height:1.6;">${_segTooltip}</div></span>`;

                html += `<tr class="b-row">
                    <td class="b-name" title="${st.name}">${_shortName}</td>
                    <td class="b-hrs" style="white-space:nowrap;">${st.esMixto
                        ? `<span class="diff-tooltip-wrap" style="cursor:help;">${f1(st.contract)}<sup style="font-size:0.5rem;color:#f59e0b;">⚡</sup><div class="diff-tooltip" style="min-width:150px;white-space:normal;line-height:1.7;top:auto;bottom:120%;left:0;transform:none;">${_cntrTooltip}</div></span>`
                        : `${f1(st.contract)}`
                    }</td>
                    <td class="b-hrs" style="white-space:nowrap;"><span class="diff-tooltip-wrap" style="cursor:help;">${f1(st.asig)}<div class="diff-tooltip" style="min-width:220px;white-space:normal;line-height:1.6;">${_asigTooltip}</div></span></td>
                    <td class="b-hrs ${diffClass}" style="position:relative;"><span class="diff-tooltip-wrap" style="cursor:help;">${diffDisplay}<div class="diff-tooltip" style="min-width:220px;white-space:normal;line-height:1.6;">${_difTooltipContent}</div></span></td>
                    <td style="text-align:center;padding:3px;border-left:2px solid #cbd5e1;">${_desCell}</td>
                    <td style="text-align:center;padding:3px;">${_fesCell}</td>
                    <td style="text-align:center;padding:3px;border-left:2px solid #cbd5e1;">${_consWithTip}</td>
                    <td style="text-align:center;padding:3px;">${chivatoHtml || '—'}</td>
                    <td style="position:relative;">${dotsHtml}</td>
                </tr>`;
            });
            html += `</tbody></table>`;

            // ── Barra de intercambio (visible cuando hay 2 casillas del mismo día seleccionadas) ──
            const _sw = App.uiState._balSwap || {};
            if (_sw.a && _sw.b && _sw.a.di === _sw.b.di) {
                const _empA = App.data.empleados.find(e => e.id === _sw.a.empId);
                const _empB = App.data.empleados.find(e => e.id === _sw.b.empId);
                const _dayLabel = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'][_sw.a.di];
                html += `<div style="padding:6px 12px;background:#fffbeb;border-top:1px solid #fde68a;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:0.75rem;color:#92400e;font-weight:600;">
                        ${_empA ? _empA.nombre : '?'} ⇄ ${_empB ? _empB.nombre : '?'} · ${_dayLabel}
                    </span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.ui._balanceSwapExec()" style="padding:3px 10px;border:none;border-radius:5px;background:#2563eb;color:white;font-size:0.72rem;font-weight:700;cursor:pointer;">Intercambiar</button>
                        <button onclick="App.uiState._balSwap={};App.ui.renderPlannerInspector(document.getElementById('inspector-content'))" style="padding:3px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Cancelar</button>
                    </div>
                </div>`;
            }

            // ── Resumen diario: personas disponibles y horas potenciales ──
            const DIAS_HDR = ['L','M','X','J','V','S','D'];
            const dailySummary = days.map((d, i) => {
                let count = 0, potH = 0;
                stats.forEach(st => {
                    const ds = st.dayStatuses[i];
                    // Disponible = turno de trabajo (solid) o sin asignar (empty)
                    const ausente = ds.type === 'hollow'; // L, F, V, B, P, R…
                    if (!ausente) {
                        count++;
                        const contratoSemanal = st.contratosPorDia[i].h;
                        potH += contratoSemanal / 5;
                    }
                });
                return { count, potH: Math.round(potH * 10) / 10 };
            });

            html += `<div style="padding:8px 12px; background:#f8fafc; border-top:1px solid var(--border);">
                <div style="font-size:0.65rem; font-weight:700; color:#475569; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.3px; display:flex; align-items:center; gap:4px;">Disponibilidad diaria<span class="diff-tooltip-wrap" style="cursor:help; display:inline-flex; align-items:center; justify-content:center; width:13px; height:13px; border-radius:50%; background:#cbd5e1; color:#fff; font-size:0.5rem; font-weight:800; line-height:1;">i<div class="diff-tooltip" style="min-width:220px; white-space:normal; line-height:1.6; font-weight:400; text-transform:none;">Estimación de horas potenciales en función de los empleados a los que no se ha atribuido libranza ni ausencia, calculando siempre a 1/5 de sus horas semanales de contrato.</div></span></div>
                <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:4px; text-align:center;">
                    ${DIAS_HDR.map((lbl, i) => {
                        const s = dailySummary[i];
                        return `<div style="background:#fff; border:1px solid #e2e8f0; border-radius:6px; padding:4px 2px;">
                            <div style="font-size:0.55rem; color:#94a3b8; font-weight:600;">${lbl}</div>
                            <div style="font-size:0.85rem; font-weight:800; color:#1e293b; line-height:1.2;">${s.count}</div>
                            <div style="font-size:0.55rem; color:#64748b;">pers.</div>
                            <div style="font-size:0.75rem; font-weight:700; color:#2563eb; margin-top:2px; line-height:1;">${f1(s.potH)}h</div>
                            <div style="font-size:0.5rem; color:#94a3b8;">potencial</div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;

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

        // ── Intercambio rápido desde el balance ──
        _balanceSwapSelect: function(empId, di) {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            if (App.logic.isDayLocked(days[di])) return;

            // Si hay turno seleccionado en la paleta → pintar directamente
            if (App.uiState.paintShiftId) {
                const prevDate = App.uiState.currentDate;
                App.uiState.currentDate = days[di];
                App.logic.paint(empId);
                App.uiState.currentDate = prevDate;
                return;
            }

            // Sin turno en paleta → lógica de selección para intercambio
            if (!App.uiState._balSwap) App.uiState._balSwap = {};
            const sw = App.uiState._balSwap;

            if (sw.a && sw.a.empId === empId && sw.a.di === di) { sw.a = sw.b; sw.b = null; }
            else if (sw.b && sw.b.empId === empId && sw.b.di === di) { sw.b = null; }
            else if (!sw.a) { sw.a = { empId, di }; }
            else if (!sw.b) {
                if (di !== sw.a.di) {
                    sw.a = { empId, di }; sw.b = null;
                } else if (empId === sw.a.empId) {
                    sw.a = null;
                } else {
                    sw.b = { empId, di };
                }
            }
            else { sw.a = { empId, di }; sw.b = null; }

            // Refrescar: en modo cuadrados el grid principal también muestra los dots
            if (App.uiState.gridCuadrados && App.uiState.plannerViewMode !== 'individual') {
                App.ui.renderPlanner(document.getElementById('main-view'));
            }
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },

        // ── Workspace Presets ──
        _renderWorkspacePresetsModule: function() {
            const presets = App.data.config.workspacePresets || [];
            if(presets.length === 0) {
                return `<div class="planner-module" style="min-width:100px;">
                    <div class="planner-module-title" style="padding:2px 8px;font-size:0.48rem;letter-spacing:0.1em;">FLUJOS</div>
                    <div class="planner-module-content" style="padding:4px 5px;display:flex;align-items:center;justify-content:center;">
                        <button onclick="App.ui._openWorkspacePresetsConfig()" style="border:1px dashed #cbd5e1;background:transparent;border-radius:6px;padding:4px 8px;font-size:0.55rem;color:#94a3b8;cursor:pointer;width:100%;">+ Configurar</button>
                    </div>
                </div>`;
            }
            const _bStyle = (active) => `width:100%;padding:3px 6px 3px 15%;border:none;outline:none;border-radius:6px;font-size:0.58rem;font-weight:700;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:background 0.15s,color 0.15s;background:${active?'#2563eb':'#f1f5f9'};color:${active?'white':'#64748b'};text-align:left;`;
            // Determine which preset is currently active
            const _curMode = App.uiState.gridCuadrados ? 'cuadrados' : (App.uiState.plannerViewMode === 'individual' ? 'individual' : 'barras');
            const _curTab = App.uiState.monitorTab || 'balance';
            let btns = '';
            presets.forEach((p, i) => {
                const isActive = p.gridMode === _curMode && p.inspectorTab === _curTab;
                btns += `<button tabindex="-1" onclick="App.ui._activateWorkspacePreset(${i})" title="${p.name}" style="${_bStyle(isActive)}">${p.name}</button>`;
            });
            return `<div class="planner-module" style="min-width:100px;">
                <div class="planner-module-title" style="padding:2px 8px;font-size:0.48rem;letter-spacing:0.1em;display:flex;justify-content:space-between;align-items:center;">
                    <span>FLUJOS</span>
                    <span onclick="App.ui._openWorkspacePresetsConfig()" style="cursor:pointer;font-size:0.6rem;color:#94a3b8;" title="Configurar flujos">⚙</span>
                </div>
                <div class="planner-module-content" style="display:flex;flex-direction:column;gap:2px;padding:4px 5px;">
                    ${btns}
                </div>
            </div>`;
        },

        _activateWorkspacePreset: function(idx) {
            const presets = App.data.config.workspacePresets || [];
            const p = presets[idx];
            if(!p) return;
            // Set grid mode
            if(p.gridMode === 'cuadrados') {
                App.uiState.plannerViewMode = 'group';
                App.uiState.gridCuadrados = true;
            } else if(p.gridMode === 'individual') {
                if(!App.uiState.individualEmpId) {
                    const first = App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder)[0];
                    if(first) App.uiState.individualEmpId = first.id;
                }
                App.uiState.plannerViewMode = 'individual';
                App.uiState.gridCuadrados = false;
            } else {
                App.uiState.plannerViewMode = 'group';
                App.uiState.gridCuadrados = false;
            }
            // Set inspector tab
            App.uiState.monitorTab = p.inspectorTab || 'balance';
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },

        _openWorkspacePresetsConfig: function() {
            const presets = JSON.parse(JSON.stringify(App.data.config.workspacePresets || []));
            const gridModes = [
                { id:'barras', label:'Barras' },
                { id:'cuadrados', label:'Cuadrados' },
                { id:'individual', label:'Individual' }
            ];
            const inspTabs = [
                { id:'charts', label:'Reparto horas' },
                { id:'balance', label:'Balance' },
                { id:'findes', label:'Fines' },
                { id:'eventos', label:'Eventos' },
                { id:'festdom', label:'Festivos' },
                { id:'equilibrio', label:'Equilibrio' },
                { id:'libranzas', label:'Libranzas' },
                { id:'semanas', label:'Semanas' }
            ];

            const _renderList = () => {
                const list = modal.querySelector('#wp-list');
                let h = '';
                presets.forEach((p, i) => {
                    h += `<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:#f8fafc;border-radius:6px;border:1px solid #e2e8f0;">
                        <span style="font-weight:700;font-size:0.8rem;color:#2563eb;width:16px;text-align:center;">${i+1}</span>
                        <input type="text" value="${p.name}" data-idx="${i}" data-field="name" style="flex:1;padding:3px 6px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.78rem;font-weight:600;min-width:60px;" maxlength="16">
                        <select data-idx="${i}" data-field="gridMode" style="padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.72rem;">
                            ${gridModes.map(m => `<option value="${m.id}" ${p.gridMode===m.id?'selected':''}>${m.label}</option>`).join('')}
                        </select>
                        <select data-idx="${i}" data-field="inspectorTab" style="padding:3px 4px;border:1px solid #e2e8f0;border-radius:4px;font-size:0.72rem;">
                            ${inspTabs.map(t => `<option value="${t.id}" ${p.inspectorTab===t.id?'selected':''}>${t.label}</option>`).join('')}
                        </select>
                        <button data-delidx="${i}" style="border:none;background:none;color:#ef4444;cursor:pointer;font-size:1rem;padding:0 2px;" title="Eliminar">×</button>
                    </div>`;
                });
                if(presets.length === 0) {
                    h = `<div style="text-align:center;padding:16px;color:#94a3b8;font-size:0.78rem;">Sin flujos configurados.</div>`;
                }
                list.innerHTML = h;

                // Bind events
                list.querySelectorAll('input[data-field],select[data-field]').forEach(el => {
                    const idx = parseInt(el.dataset.idx);
                    const field = el.dataset.field;
                    el.onchange = () => { presets[idx][field] = el.value; };
                    if(el.tagName === 'INPUT') el.oninput = () => { presets[idx][field] = el.value; };
                });
                list.querySelectorAll('button[data-delidx]').forEach(el => {
                    el.onclick = () => { presets.splice(parseInt(el.dataset.delidx), 1); _renderList(); };
                });
            };

            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';
            modal.innerHTML = `<div style="background:white;border-radius:12px;padding:20px 24px;max-width:480px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size:1rem;font-weight:700;margin-bottom:6px;">⚙ Flujos de vista</div>
                <div style="font-size:0.78rem;color:#64748b;margin-bottom:14px;">Cada atajo activa una combinación de vista principal + pestaña del inspector. Máximo 6.</div>
                <div id="wp-list" style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;max-height:300px;overflow-y:auto;"></div>
                <div style="display:flex;gap:8px;justify-content:space-between;">
                    <button id="wp-add" style="padding:5px 12px;border:1px dashed #cbd5e1;border-radius:6px;background:transparent;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;">+ Añadir flujo</button>
                    <div style="display:flex;gap:8px;">
                        <button id="wp-cancel" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:white;color:#64748b;font-weight:600;cursor:pointer;">Cancelar</button>
                        <button id="wp-save" style="padding:6px 14px;border:none;border-radius:6px;background:#2563eb;color:white;font-weight:700;cursor:pointer;">Guardar</button>
                    </div>
                </div>
            </div>`;
            document.body.appendChild(modal);
            _renderList();

            modal.querySelector('#wp-add').onclick = () => {
                if(presets.length >= 6) { alert('Máximo 6 flujos.'); return; }
                presets.push({ name: 'Atajo ' + (presets.length + 1), gridMode: 'barras', inspectorTab: 'balance' });
                _renderList();
            };
            modal.querySelector('#wp-cancel').onclick = () => modal.remove();
            modal.querySelector('#wp-save').onclick = () => {
                App.data.config.workspacePresets = presets;
                Safe.save('v40_db', App.data);
                modal.remove();
                App.ui.renderPlanner(document.getElementById('main-view'));
            };
        },

        _balanceErase: function(empId, di) {
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            if (App.logic.isDayLocked(days[di])) return;
            const prevDate = App.uiState.currentDate;
            App.uiState.currentDate = days[di];
            App.logic.erase(empId);
            App.uiState.currentDate = prevDate;
        },

        _openEquilibrioConfig: function() {
            const lim = App.data.config.equilibrioLimits || { M:0, T:0, I:0, P:0 };
            const types = [
                { key:'M', label:'Mañanas' },
                { key:'T', label:'Tardes' },
                { key:'I', label:'Intermedios' },
                { key:'P', label:'Partidos' }
            ];
            const rows = types.map(t =>
                `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 0;">
                    <span style="font-weight:600;min-width:90px;">${t.label} (${t.key})</span>
                    <input type="number" min="0" max="7" value="${lim[t.key] || 0}" id="eq-lim-${t.key}" style="width:50px;padding:4px 6px;border:1px solid #e2e8f0;border-radius:4px;text-align:center;font-size:0.85rem;">
                    <span style="font-size:0.7rem;color:#94a3b8;">0 = sin límite</span>
                </div>`
            ).join('');

            const modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:9999;';
            modal.innerHTML = `<div style="background:white;border-radius:12px;padding:20px 24px;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="font-size:1rem;font-weight:700;margin-bottom:12px;">⚙ Límites de Equilibrio</div>
                <div style="font-size:0.78rem;color:#64748b;margin-bottom:12px;">Máximo de turnos de cada tipo por semana y persona. Si se supera, la celda se marca en rojo.</div>
                ${rows}
                <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
                    <button id="eq-cancel" style="padding:6px 14px;border:1px solid #e2e8f0;border-radius:6px;background:white;color:#64748b;font-weight:600;cursor:pointer;">Cancelar</button>
                    <button id="eq-save" style="padding:6px 14px;border:none;border-radius:6px;background:#2563eb;color:white;font-weight:700;cursor:pointer;">Guardar</button>
                </div>
            </div>`;
            document.body.appendChild(modal);

            modal.querySelector('#eq-cancel').onclick = () => modal.remove();
            modal.querySelector('#eq-save').onclick = () => {
                types.forEach(t => {
                    App.data.config.equilibrioLimits[t.key] = parseInt(document.getElementById('eq-lim-' + t.key).value) || 0;
                });
                Safe.save('v40_db', App.data);
                modal.remove();
                App.ui.renderPlanner(document.getElementById('main-view'));
            };
            modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
        },

        _balanceSwapExec: function() {
            const sw = App.uiState._balSwap;
            if (!sw || !sw.a || !sw.b || sw.a.di !== sw.b.di) return;

            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            const date = days[sw.a.di];

            if (App.logic.isDayLocked(date)) {
                alert('🔒 Esta semana está cerrada.');
                return;
            }

            const empA = sw.a.empId, empB = sw.b.empId;
            const shA = (App.data.schedule[date] || {})[empA] || null;
            const shB = (App.data.schedule[date] || {})[empB] || null;

            if (!shA && !shB) { App.uiState._balSwap = {}; return; }

            if (!App.data.schedule[date]) App.data.schedule[date] = {};
            if (shA && shB) {
                App.data.schedule[date][empA] = shB;
                App.data.schedule[date][empB] = shA;
            } else if (shA) {
                App.data.schedule[date][empB] = shA;
                delete App.data.schedule[date][empA];
            } else {
                App.data.schedule[date][empA] = shB;
                delete App.data.schedule[date][empB];
            }

            App.logic.saveSnapshot('Intercambiar turnos (balance)');
            Safe.save('v40_db', App.data);
            App.uiState._balSwap = {};
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
        },

        renderMonitorSemanas: function() {
            const NUM_WEEKS = 20;
            if (!App.uiState.semanasEmpId) {
                const first = App.data.empleados.find(e => e.active !== false);
                App.uiState.semanasEmpId = first ? first.id : null;
            }
            if (!App.uiState.semanasStart) App.uiState.semanasStart = Utils.getMonday(App.uiState.currentDate);

            const emp = App.data.empleados.find(e => e.id === App.uiState.semanasEmpId);
            if (!emp) return '<div style="padding:20px;color:#94a3b8;text-align:center;">No hay empleados</div>';

            const startMonday = App.uiState.semanasStart;
            const f1 = n => Math.round(n * 10) / 10;

            // Selector de empleado
            const empOpts = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder)
                .map(e => `<option value="${e.id}" ${e.id === emp.id ? 'selected' : ''}>${e.nombre}</option>`).join('');

            // Navegación
            const _rerender = `App.ui.renderPlannerInspector(document.getElementById('inspector-content'))`;
            const nav = `<div style="display:flex;align-items:center;gap:4px;">
                <button onclick="App.uiState.semanasStart=Utils.addWeeks(App.uiState.semanasStart,-4);${_rerender}" style="padding:2px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.72rem;color:#475569;">◀◀</button>
                <button onclick="App.uiState.semanasStart=Utils.addWeeks(App.uiState.semanasStart,-1);${_rerender}" style="padding:2px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.72rem;color:#475569;">◀</button>
                <button onclick="App.uiState.semanasStart=Utils.addWeeks(App.uiState.semanasStart,1);${_rerender}" style="padding:2px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.72rem;color:#475569;">▶</button>
                <button onclick="App.uiState.semanasStart=Utils.addWeeks(App.uiState.semanasStart,4);${_rerender}" style="padding:2px 6px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.72rem;color:#475569;">▶▶</button>
            </div>`;

            let html = `<div style="padding:8px 10px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <select onchange="App.uiState.semanasEmpId=this.value;${_rerender}"
                        style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.78rem;color:#1e293b;max-width:130px;">${empOpts}</select>
                    ${nav}
                </div>
                <table class="balance-table" style="font-size:0.68rem;">
                    <thead><tr>
                        <th style="text-align:left;padding:3px 4px;">Semana</th>
                        <th style="padding:3px 2px;">Cntr</th>
                        <th style="padding:3px 2px;">Asig</th>
                        <th style="padding:3px 2px;">Dif</th>
                        <th style="padding:3px 2px;border-left:2px solid #cbd5e1;">Acum</th>
                        <th style="padding:3px 2px;">LIB</th>
                        <th style="padding:3px 2px;">L–D</th>
                    </tr></thead><tbody>`;

            // Calcular desvío acumulado hasta la semana anterior al rango visible
            let acum = emp.saldoInicial || 0;
            const lockedWeeks = App.ui._getLockedWeeks(emp);
            lockedWeeks.forEach(lw => {
                if (lw >= startMonday) return;
                const wdays = Utils.getWeekDays(lw);
                let worked = 0;
                wdays.forEach(d => { const sid = App.data.schedule[d]?.[emp.id]; const sh = sid ? Utils.getShift(sid) : null; if (sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break); });
                const { esperadas } = Utils.calcEsperadas(emp, wdays, emp.id);
                acum += worked - esperadas;
            });
            acum += (emp.ajustes || []).reduce((s, a) => s + a.signo * a.horas, 0);

            const todayMonday = Utils.getMonday(new Date().toISOString().slice(0,10));

            for (let w = 0; w < NUM_WEEKS; w++) {
                const mon = Utils.addWeeks(startMonday, w);
                const days = Utils.getWeekDays(mon);
                const wkCode = Utils.getWeekCode(mon);
                const isLocked = days.every(d => App.data.lockedDays && App.data.lockedDays[d]);
                const isCurrent = mon === todayMonday;

                // Horas trabajadas
                let asig = 0;
                const dayStatuses = [];
                let countL = 0, countF = 0;
                days.forEach(d => {
                    const sid = App.data.schedule[d] ? App.data.schedule[d][emp.id] : null;
                    const shift = sid ? Utils.getShift(sid) : null;
                    if (shift) {
                        if (shift.fixed) {
                            if (shift.code === 'L') countL++;
                            if (shift.code === 'F') countF++;
                            dayStatuses.push({ type: 'hollow', color: shift.color, code: shift.code });
                        } else if (shift.start && shift.end) {
                            const h = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                            asig += h;
                            dayStatuses.push({ type: 'solid', color: shift.color || '#6b7280' });
                        } else { dayStatuses.push({ type: 'empty' }); }
                    } else { dayStatuses.push({ type: 'empty' }); }
                });

                const { justifiedH, totalContrato: contrato } = Utils.calcEsperadas(emp, days, emp.id);
                const dif = f1(asig + justifiedH - contrato);

                // Acumular desvío si semana cerrada
                if (isLocked) acum += asig + justifiedH - contrato;
                const acumR = f1(acum);
                const acumColor = acumR > 0.5 ? '#f59e0b' : acumR < -0.5 ? '#3b82f6' : '#10b981';

                // Chivato lib
                let libHtml = '';
                if (countL >= 2) libHtml = `<div style="width:12px;height:12px;background:#22c55e;color:white;border-radius:50%;font-size:0.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto;">✓</div>`;
                else if (countL >= 1 && countF >= 1) libHtml = `<div style="width:12px;height:12px;background:#f59e0b;color:white;border-radius:50%;font-size:0.5rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto;">⚠</div>`;

                // Dots L-D
                let dotsHtml = `<div style="display:flex;gap:1px;justify-content:center;">`;
                dayStatuses.forEach(s => {
                    if (s.type === 'solid') dotsHtml += `<div style="width:10px;height:10px;border-radius:2px;background:${s.color};"></div>`;
                    else if (s.type === 'hollow') dotsHtml += `<div style="width:10px;height:10px;border-radius:2px;border:1.5px solid ${s.color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:0.4rem;font-weight:700;color:${s.color};">${s.code || ''}</div>`;
                    else dotsHtml += `<div style="width:10px;height:10px;border-radius:2px;border:1px dashed #e2e8f0;"></div>`;
                });
                dotsHtml += `</div>`;

                const difClass = dif >= -0.5 && dif <= 0.5 ? 'val-good' : dif < 0 ? 'val-warn' : 'val-good';
                const rowBg = isCurrent ? 'background:#eff6ff;' : (isLocked ? '' : 'opacity:0.6;');
                const lockIcon = isLocked ? '🔒' : '';

                // Short date range
                const d0 = new Date(days[0] + 'T12:00:00'), d6 = new Date(days[6] + 'T12:00:00');
                const shortRange = `${d0.getDate()}/${d0.getMonth()+1}–${d6.getDate()}/${d6.getMonth()+1}`;

                html += `<tr class="b-row" style="${rowBg}" onclick="App.uiState.currentDate='${mon}';App.ui.renderPlanner(document.getElementById('main-view'));App.uiState.monitorTab='balance';App.ui.renderPlannerInspector(document.getElementById('inspector-content'));" title="Ir a ${wkCode}">
                    <td style="text-align:left;padding:3px 4px;white-space:nowrap;cursor:pointer;">${lockIcon} <strong>${wkCode.slice(-4)}</strong> <span style="color:#94a3b8;font-size:0.6rem;">${shortRange}</span></td>
                    <td style="text-align:center;padding:3px 2px;">${f1(contrato)}</td>
                    <td style="text-align:center;padding:3px 2px;">${f1(asig)}</td>
                    <td class="b-hrs ${difClass}" style="text-align:center;padding:3px 2px;">${dif > 0 ? '+' : ''}${dif}</td>
                    <td style="text-align:center;padding:3px 2px;border-left:2px solid #cbd5e1;color:${acumColor};font-weight:700;">${acumR > 0 ? '+' : ''}${acumR}</td>
                    <td style="text-align:center;padding:3px 2px;">${libHtml}</td>
                    <td style="padding:3px 2px;">${dotsHtml}</td>
                </tr>`;
            }

            html += `</tbody></table></div>`;
            return html;
        },

        renderMonitorLibranzas: function() {
            const mode = App.uiState.equilibrioMode || 'locked';
            const DIAS = ['L','M','X','J','V','S','D'];
            const FREE_CODES = new Set(['L','F','R']);
            const typeColors = {
                L: { bg:'#dcfce7', fg:'#166534', label:'Libre' },
                F: { bg:'#fef9c3', fg:'#854d0e', label:'Festivo' },
                R: { bg:'#dbeafe', fg:'#1e40af', label:'Recuperación' }
            };

            let validDates = null;
            let startDate, endDate, lockedWeekCount = 0;

            if(mode === 'locked') {
                const locked = App.data.lockedDays || {};
                const mondaySet = new Set(Object.keys(locked).map(d => Utils.getMonday(d)));
                const lockedMondays = [...mondaySet].sort().filter(monday => Utils.getWeekDays(monday).every(d => locked[d]));
                lockedWeekCount = lockedMondays.length;
                if(lockedMondays.length === 0) {
                    return `<div style="padding:12px 15px;background:#f8fafc;border-bottom:1px solid var(--border);">
                        <div style="display:flex;gap:4px;margin-bottom:10px;">
                            ${['locked','range'].map(m=>`<button onclick="App.uiState.equilibrioMode='${m}';App.ui.renderPlannerInspector(document.getElementById('inspector-content'))" style="padding:4px 12px;border-radius:20px;border:1px solid ${mode===m?'#2563eb':'#e2e8f0'};background:${mode===m?'#eff6ff':'white'};color:${mode===m?'#2563eb':'#94a3b8'};font-size:0.68rem;font-weight:700;cursor:pointer;">${m==='locked'?'🔒 Cerradas':'📅 Rango'}</button>`).join('')}
                        </div>
                        <div style="padding:24px;text-align:center;color:#94a3b8;font-size:0.78rem;">Sin semanas cerradas todavía.</div>
                    </div>`;
                }
                validDates = new Set();
                lockedMondays.forEach(monday => Utils.getWeekDays(monday).forEach(d => validDates.add(d)));
                const sortedValid = [...validDates].sort();
                startDate = sortedValid[0];
                endDate = sortedValid[sortedValid.length - 1];
            } else {
                startDate = App.uiState.balanceStartDate;
                endDate = App.uiState.balanceEndDate;
                if(!startDate || !endDate) {
                    const allDates = Object.keys(App.data.schedule).sort();
                    if(allDates.length === 0) return `<div style="padding:40px;text-align:center;color:var(--text-muted);">No hay datos.</div>`;
                    startDate = allDates[0];
                    endDate = allDates[allDates.length - 1];
                }
            }

            const stats = [];
            const teamTotals = { byDay: [0,0,0,0,0,0,0], byType: {}, total: 0 };

            App.data.empleados.filter(e => e.active !== false && Utils.empleadoVigenteEnRango(e, startDate, endDate)).sort((a,b) => a.customOrder - b.customOrder).forEach(emp => {
                const byDay = [0,0,0,0,0,0,0];
                const byType = {};
                let total = 0;

                Object.keys(App.data.schedule).forEach(date => {
                    const inScope = mode === 'locked' ? validDates.has(date) : (date >= startDate && date <= endDate);
                    if(!inScope) return;
                    const shiftId = App.data.schedule[date][emp.id];
                    if(!shiftId) return;
                    const shift = Utils.getShift(shiftId);
                    if(!shift || !shift.fixed || !FREE_CODES.has(shift.code)) return;

                    const dow = new Date(date + 'T12:00:00').getDay();
                    const di = dow === 0 ? 6 : dow - 1;
                    byDay[di]++;
                    byType[shift.code] = (byType[shift.code] || 0) + 1;
                    total++;
                    teamTotals.byDay[di]++;
                    teamTotals.byType[shift.code] = (teamTotals.byType[shift.code] || 0) + 1;
                    teamTotals.total++;
                });

                stats.push({ emp, byDay, byType, total });
            });

            // Ordenar
            const sortKey = App.uiState.libranzasSortKey || null;
            const sortDir = App.uiState.libranzasSortDir || 'desc';
            if(sortKey) {
                const dir = sortDir === 'asc' ? 1 : -1;
                stats.sort((a, b) => {
                    if(sortKey === 'nombre') return a.emp.nombre.localeCompare(b.emp.nombre) * dir;
                    if(sortKey === 'total') return (a.total - b.total) * dir;
                    if(sortKey.startsWith('day_')) return (a.byDay[parseInt(sortKey.split('_')[1])] - b.byDay[parseInt(sortKey.split('_')[1])]) * dir;
                    return 0;
                });
            }

            const _modeBtn = (m, label) =>
                `<button onclick="App.uiState.equilibrioMode='${m}';App.ui.renderPlannerInspector(document.getElementById('inspector-content'))"
                    style="padding:4px 12px;border-radius:20px;border:1px solid ${mode===m?'#2563eb':'#e2e8f0'};background:${mode===m?'#eff6ff':'white'};color:${mode===m?'#2563eb':'#94a3b8'};font-size:0.68rem;font-weight:700;cursor:pointer;">${label}</button>`;

            const _sortHdr = (key, label, align) => {
                const arrow = App.uiState.libranzasSortKey === key ? (App.uiState.libranzasSortDir === 'asc' ? ' ↑' : ' ↓') : '';
                return `<th style="padding:4px 5px;cursor:pointer;user-select:none;text-align:${align || 'center'};" onclick="if(App.uiState.libranzasSortKey==='${key}'){App.uiState.libranzasSortDir=App.uiState.libranzasSortDir==='asc'?'desc':'asc';}else{App.uiState.libranzasSortKey='${key}';App.uiState.libranzasSortDir='desc';}App.ui.renderPlannerInspector(document.getElementById('inspector-content'));">${label}${arrow}</th>`;
            };

            let html = `
            <div style="padding:12px 15px;background:#f8fafc;border-bottom:1px solid var(--border);">
                <div style="display:flex;gap:4px;margin-bottom:10px;">
                    ${_modeBtn('locked','🔒 Semanas cerradas')}
                    ${_modeBtn('range','📅 Rango')}
                </div>
                ${mode === 'locked'
                    ? `<div style="font-size:0.65rem;color:#64748b;">${lockedWeekCount} semana${lockedWeekCount!==1?'s':''} cerrada${lockedWeekCount!==1?'s':''} · ${Utils.formatDateES(startDate)} → ${Utils.formatDateES(endDate)}</div>`
                    : `<div style="display:flex;gap:6px;align-items:flex-end;font-size:0.7rem;flex-wrap:wrap;">
                        <div style="flex:1;min-width:90px;"><label style="display:block;margin-bottom:2px;font-weight:600;font-size:0.65rem;">Desde:</label>${Utils.getDateInputHTML('lib-start', startDate, 'App.logic.storeEquilibrioDate(this,"start")')}</div>
                        <div style="flex:1;min-width:90px;"><label style="display:block;margin-bottom:2px;font-weight:600;font-size:0.65rem;">Hasta:</label>${Utils.getDateInputHTML('lib-end', endDate, 'App.logic.storeEquilibrioDate(this,"end")')}</div>
                        <button onclick="App.logic.updateEquilibrioRange()" style="padding:4px 10px;background:var(--primary);color:white;border:none;border-radius:3px;cursor:pointer;font-size:0.65rem;font-weight:600;">Aplicar</button>
                    </div>
                    <div style="font-size:0.65rem;color:var(--text-muted);margin-top:6px;">📅 ${Utils.formatDateES(startDate)} → ${Utils.formatDateES(endDate)}</div>`
                }
            </div>

            <div style="overflow-y:auto;">
                <table class="balance-table" style="font-size:0.7rem;">
                    <thead><tr>
                        ${_sortHdr('nombre', 'Emp', 'left')}
                        ${DIAS.map((d, i) => _sortHdr('day_' + i, d)).join('')}
                        <th style="padding:4px 5px;text-align:center;">Desglose</th>
                    </tr></thead>
                    <tbody>`;

            // Max global de todas las celdas de día para gradiente uniforme
            let globalMax = 0;
            stats.forEach(st => { st.byDay.forEach(v => { if(v > globalMax) globalMax = v; }); });

            const _greenGrad = (count) => {
                if(count === 0 || globalMax === 0) return { bg:'', fg:'#cbd5e1' };
                const t = count / globalMax;
                if(t >= 0.85) return { bg:'background:#166534;', fg:'#ffffff' };
                if(t >= 0.65) return { bg:'background:#22c55e;', fg:'#ffffff' };
                if(t >= 0.45) return { bg:'background:#4ade80;', fg:'#14532d' };
                if(t >= 0.25) return { bg:'background:#86efac;', fg:'#166534' };
                return { bg:'background:#dcfce7;', fg:'#15803d' };
            };

            stats.forEach(st => {
                let dayCells = '';
                st.byDay.forEach((count, di) => {
                    const g = _greenGrad(count);
                    dayCells += `<td style="text-align:center;padding:4px 5px;${g.bg}color:${g.fg};font-weight:700;" title="${DIAS[di]}: ${count} día${count!==1?'s':''} libre${count!==1?'s':''}">${count || '—'}</td>`;
                });

                // Desglose por tipo
                const typeKeys = Object.keys(st.byType).sort();
                let desgloseHtml = '';
                if(typeKeys.length > 0) {
                    desgloseHtml = typeKeys.map(code => {
                        const tc = typeColors[code] || { bg:'#f1f5f9', fg:'#64748b', label:code };
                        return `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 4px;border-radius:3px;background:${tc.bg};color:${tc.fg};font-size:0.6rem;font-weight:600;" title="${tc.label}: ${st.byType[code]}">${code}${st.byType[code]}</span>`;
                    }).join(' ');
                } else {
                    desgloseHtml = '<span style="color:#cbd5e1;">—</span>';
                }

                html += `<tr>
                    <td style="font-weight:600;padding:4px 6px;font-size:0.75rem;text-align:left;">${st.emp.nombre}</td>
                    ${dayCells}
                    <td style="padding:4px 6px;text-align:center;white-space:nowrap;">${desgloseHtml}</td>
                </tr>`;
            });

            // Fila EQUIPO — azul, sin gradiente relativo
            const teamMax = Math.max(...teamTotals.byDay, 1);
            let teamDayCells = '';
            teamTotals.byDay.forEach((count) => {
                const t = count / teamMax;
                let bg = '', fg = '#cbd5e1';
                if(count > 0) {
                    if(t >= 0.75) { bg = 'background:#1e40af;'; fg = '#ffffff'; }
                    else if(t >= 0.5) { bg = 'background:#3b82f6;'; fg = '#ffffff'; }
                    else if(t >= 0.25) { bg = 'background:#93c5fd;'; fg = '#1e3a8a'; }
                    else { bg = 'background:#dbeafe;'; fg = '#1e40af'; }
                }
                teamDayCells += `<td style="text-align:center;padding:4px 5px;${bg}color:${fg};font-weight:800;">${count || '—'}</td>`;
            });

            html += `</tbody>
                <tfoot><tr style="border-top:2px solid #cbd5e1;">
                    <td style="font-weight:700;padding:4px 6px;font-size:0.7rem;text-align:left;color:#64748b;">EQUIPO</td>
                    ${teamDayCells}
                    <td style="padding:4px 6px;text-align:center;white-space:nowrap;">${Object.keys(teamTotals.byType).sort().map(code => {
                        const tc = typeColors[code] || { bg:'#f1f5f9', fg:'#64748b' };
                        return `<span style="display:inline-flex;align-items:center;gap:2px;padding:1px 4px;border-radius:3px;background:${tc.bg};color:${tc.fg};font-size:0.6rem;font-weight:600;">${code}${teamTotals.byType[code]}</span>`;
                    }).join(' ')}</td>
                </tr></tfoot>
            </table></div>`;
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
            // Modo: 'locked' = solo semanas cerradas, 'range' = rango libre
            const mode = App.uiState.equilibrioMode || 'locked';

            // Calcular set de fechas válidas según modo
            let validDates = null; // null = sin restricción adicional
            let startDate, endDate, lockedWeekCount = 0;

            if(mode === 'locked') {
                // Replicar lógica de _getLockedWeeks sin filtrar por empleado
                const locked = App.data.lockedDays || {};
                const mondaySet = new Set(Object.keys(locked).map(d => Utils.getMonday(d)));
                const lockedMondays = [...mondaySet].sort().filter(monday => {
                    const days = Utils.getWeekDays(monday);
                    return days.every(d => locked[d]);
                });
                lockedWeekCount = lockedMondays.length;
                if(lockedMondays.length === 0) {
                    return `<div style="padding:12px 15px;background:#f8fafc;border-bottom:1px solid var(--border);">
                        <div style="display:flex;gap:4px;margin-bottom:10px;">
                            ${['locked','range'].map(m=>`<button onclick="App.uiState.equilibrioMode='${m}';App.ui.renderPlannerInspector(document.getElementById('inspector-content'))" style="padding:4px 12px;border-radius:20px;border:1px solid ${mode===m?'#2563eb':'#e2e8f0'};background:${mode===m?'#eff6ff':'white'};color:${mode===m?'#2563eb':'#94a3b8'};font-size:0.68rem;font-weight:700;cursor:pointer;">${m==='locked'?'🔒 Cerradas':'📅 Rango'}</button>`).join('')}
                        </div>
                        <div style="padding:24px;text-align:center;color:#94a3b8;font-size:0.78rem;">Sin semanas cerradas todavía.</div>
                    </div>`;
                }
                validDates = new Set();
                lockedMondays.forEach(monday => {
                    Utils.getWeekDays(monday).forEach(d => validDates.add(d));
                });
                const sortedValid = [...validDates].sort();
                startDate = sortedValid[0];
                endDate = sortedValid[sortedValid.length - 1];
            } else {
                startDate = App.uiState.balanceStartDate;
                endDate = App.uiState.balanceEndDate;
                if(!startDate || !endDate) {
                    const allDates = Object.keys(App.data.schedule).sort();
                    if(allDates.length === 0) {
                        return `<div style="padding:40px;text-align:center;color:var(--text-muted);"><p>No hay datos disponibles.</p></div>`;
                    }
                    startDate = allDates[0];
                    endDate = allDates[allDates.length - 1];
                }
            }

            const stats = [];
            let totalM = 0, totalT = 0, totalP = 0, totalI = 0, totalAll = 0;
            
            App.data.empleados.filter(e => {
                return e.active !== false && Utils.empleadoVigenteEnRango(e, startDate, endDate);
            }).forEach(emp => {
                let countM = 0, countT = 0, countP = 0, countI = 0, total = 0;
                
                Object.keys(App.data.schedule).forEach(date => {
                    const inRange = date >= startDate && date <= endDate;
                    const inScope = mode === 'locked' ? validDates.has(date) : inRange;
                    if(inScope) {
                        const shiftId = App.data.schedule[date][emp.id];
                        if(shiftId) {
                            const shift = Utils.getShift(shiftId);
                            if(shift && shift.start && shift.end) {
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
            
            const _modeBtn = (m, label) =>
                `<button onclick="App.uiState.equilibrioMode='${m}';App.ui.renderPlannerInspector(document.getElementById('inspector-content'))"
                    style="padding:4px 12px;border-radius:20px;border:1px solid ${mode===m?'#2563eb':'#e2e8f0'};background:${mode===m?'#eff6ff':'white'};color:${mode===m?'#2563eb':'#94a3b8'};font-size:0.68rem;font-weight:700;cursor:pointer;">${label}</button>`;

            let html = `
            <div style="padding:12px 15px; background:#f8fafc; border-bottom:1px solid var(--border);">
                <div style="display:flex;gap:4px;margin-bottom:10px;">
                    ${_modeBtn('locked','🔒 Semanas cerradas')}
                    ${_modeBtn('range','📅 Rango')}
                </div>
                ${mode === 'locked'
                    ? `<div style="font-size:0.65rem;color:#64748b;">${lockedWeekCount} semana${lockedWeekCount!==1?'s':''} cerrada${lockedWeekCount!==1?'s':''} · ${Utils.formatDateES(startDate)} → ${Utils.formatDateES(endDate)}</div>`
                    : `<div style="display:flex;gap:6px;align-items:flex-end;font-size:0.7rem;flex-wrap:wrap;">
                        <div style="flex:1;min-width:90px;">
                            <label style="display:block;margin-bottom:2px;font-weight:600;font-size:0.65rem;">Desde:</label>
                            ${Utils.getDateInputHTML('eq-start', startDate, 'App.logic.storeEquilibrioDate(this,"start")')}
                        </div>
                        <div style="flex:1;min-width:90px;">
                            <label style="display:block;margin-bottom:2px;font-weight:600;font-size:0.65rem;">Hasta:</label>
                            ${Utils.getDateInputHTML('eq-end', endDate, 'App.logic.storeEquilibrioDate(this,"end")')}
                        </div>
                        <button onclick="App.logic.updateEquilibrioRange()"
                                style="padding:4px 10px;background:var(--primary);color:white;border:none;border-radius:3px;cursor:pointer;font-size:0.65rem;font-weight:600;">Aplicar</button>
                        <button onclick="App.logic.resetEquilibrioRange()"
                                style="padding:4px 10px;background:#e2e8f0;color:var(--text-main);border:none;border-radius:3px;cursor:pointer;font-size:0.65rem;">Todo</button>
                    </div>
                    <div style="font-size:0.65rem;color:var(--text-muted);margin-top:6px;">📅 ${Utils.formatDateES(startDate)} → ${Utils.formatDateES(endDate)}</div>`
                }
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

        _refreshEventos: function() {
            const ms = document.querySelector('.main-scroll');
            const insp = document.getElementById('inspector-content');
            if(ms && document.getElementById('req-section-bar') !== null) {
                App.ui.renderRequests(ms);
            } else {
                if(insp) App.ui.renderPlannerInspector(insp);
            }
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
                    : `${fmtDate(ev.fechaInicio)}→${fmtDate(ev.fechaFin)}`;
                const isHoy = ev.fechaInicio <= today && ev.fechaFin >= today;
                const rowBg = isHoy ? '#fffbeb' : 'transparent';
                return `<tr style="border-bottom:1px solid #f1f5f9;background:${rowBg};">
                    <td style="padding:5px 6px;font-size:0.72rem;font-weight:700;color:#1e293b;white-space:nowrap;">${empName(ev.empId).split(' ')[0]}</td>
                    <td style="padding:5px 4px;white-space:nowrap;">
                        <span style="background:${color}18;color:${color};border:1px solid ${color}40;border-radius:4px;padding:1px 5px;font-size:0.62rem;font-weight:700;">${label}</span>
                        ${isHoy ? `<span style="margin-left:2px;background:#fef3c7;color:#92400e;border-radius:4px;padding:1px 4px;font-size:0.6rem;font-weight:700;">HOY</span>` : ''}
                    </td>
                    <td style="padding:5px 4px;font-size:0.68rem;color:#475569;white-space:nowrap;">${fechaStr}</td>
                    <td style="padding:5px 4px;font-size:0.68rem;color:#475569;white-space:nowrap;">${ev.horaInicio}–${ev.horaFin}</td>
                    <td style="padding:5px 4px;font-size:0.67rem;color:#94a3b8;font-style:italic;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${ev.desc||''}">${ev.desc || ''}</td>
                    <td style="padding:5px 2px;white-space:nowrap;">
                        <button onclick="App.uiState.inspEvEditId='${ev.id}'; App.uiState.inspEvFormOpen=false; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));" title="Editar" style="background:none;border:none;cursor:pointer;color:#64748b;font-size:12px;padding:1px 3px;">✏️</button>
                        <button onclick="App.logic.eventoDel('${ev.id}')" title="Borrar" style="background:none;border:none;cursor:pointer;color:#ef4444;font-size:12px;padding:1px 3px;">🗑</button>
                    </td>
                </tr>`;
            }).join('');

            const inspEditId = App.uiState.inspEvEditId || null;
            const inspEditEv = inspEditId ? (App.data.eventos||[]).find(e => e.id === inspEditId) : null;
            const showInspForm = App.uiState.inspEvFormOpen || !!inspEditEv;

            const inspFormHtml = showInspForm ? `
                <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-bottom:10px;">
                    <div style="font-size:0.62rem;font-weight:800;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">${inspEditEv ? 'Editar evento' : 'Nuevo evento'}</div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Empleado</label>
                            <select id="insp-ev-empId" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">
                                ${App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder).map(e=>`<option value="${e.id}" ${inspEditEv?.empId===e.id?'selected':''}>${e.nombre.split(' ')[0]}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Tipo</label>
                            <select id="insp-ev-tipo" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">
                                ${['curso','mentoria','visita','otro'].map(t=>`<option value="${t}" ${inspEditEv?.tipo===t?'selected':''}>${{curso:'Curso',mentoria:'Mentoría',visita:'Visita',otro:'Otro'}[t]}</option>`).join('')}
                            </select>
                        </div>
                    </div>
                    <div style="margin-bottom:6px;">
                        <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Fecha inicio</label>
                        <input type="date" id="insp-ev-fecha" value="${inspEditEv?.fechaInicio||''}" style="display:none;">
                        ${Utils.getDateInputHTML('insp-ev-fecha-picker', inspEditEv?.fechaInicio||'', "document.getElementById('insp-ev-fecha').value=this.dataset.isoValue;")}
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:6px;">
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Hora inicio</label>
                            <select id="insp-ev-hi" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">${Utils.getTimeOptions(inspEditEv?.horaInicio||'09:00', false, 9)}</select>
                        </div>
                        <div>
                            <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Hora fin</label>
                            <select id="insp-ev-hf" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;">${Utils.getTimeOptions(inspEditEv?.horaFin||'10:00', false, 9)}</select>
                        </div>
                    </div>
                    <div style="margin-bottom:8px;">
                        <label style="display:block;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:3px;">Descripción</label>
                        <input type="text" id="insp-ev-desc" value="${inspEditEv?.desc||''}" placeholder="Opcional" style="width:100%;padding:5px 6px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.75rem;box-sizing:border-box;">
                    </div>
                    <div style="display:flex;gap:6px;">
                        <button onclick="const f=document.getElementById('insp-ev-fecha').value; App.logic.eventoSave({id:'${inspEditId||''}',empId:document.getElementById('insp-ev-empId').value,tipo:document.getElementById('insp-ev-tipo').value,desc:document.getElementById('insp-ev-desc').value,fechaInicio:f,fechaFin:f,horaInicio:document.getElementById('insp-ev-hi').value,horaFin:document.getElementById('insp-ev-hf').value}); App.uiState.inspEvFormOpen=false; App.uiState.inspEvEditId=null;"
                            style="flex:1;padding:7px;background:#2563eb;color:white;border:none;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;">💾 Guardar</button>
                        <button onclick="App.uiState.inspEvFormOpen=false; App.uiState.inspEvEditId=null; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));"
                            style="padding:7px 12px;background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:6px;font-size:0.75rem;cursor:pointer;">✕</button>
                    </div>
                </div>` : `
                <button onclick="App.uiState.inspEvFormOpen=true; App.uiState.inspEvEditId=null; App.ui.renderPlannerInspector(document.getElementById('inspector-content'));"
                    style="width:100%;padding:7px;background:white;color:#2563eb;border:1px dashed #93c5fd;border-radius:6px;font-size:0.75rem;font-weight:700;cursor:pointer;margin-bottom:10px;">
                    + Añadir evento
                </button>`;

            return `<div style="padding:12px;overflow-y:auto;">
                ${filterBar}
                <div style="margin-bottom:4px;padding-bottom:12px;border-bottom:1px solid #e2e8f0;">
                    ${inspFormHtml}
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <thead>
                        <tr style="border-bottom:2px solid #e2e8f0;">
                            <th style="padding:4px 6px;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;text-align:left;">Emp</th>
                            <th style="padding:4px 4px;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;text-align:left;">Tipo</th>
                            <th style="padding:4px 4px;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;text-align:left;">Fecha</th>
                            <th style="padding:4px 4px;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;text-align:left;">Hora</th>
                            <th style="padding:4px 4px;font-size:0.62rem;font-weight:700;color:#94a3b8;text-transform:uppercase;text-align:left;">Descripción</th>
                            <th style="padding:4px 2px;width:40px;"></th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;
        },

        // --- PRESENTACIÓN / PDF ---
});
