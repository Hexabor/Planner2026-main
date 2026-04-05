// ============================================================
// LÓGICA: Semana, planificación, turnos custom, drag&drop, alertas, masivos
// ============================================================

Object.assign(App.logic, {
        // ─────────────────────────────────────────────────────────────────────

        changeWeek: function(offset) {
            // Helper para formato local
            const formatDate = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            const weekStartStr = App.data.config?.weekStart || "2025-12-29";
            
            // Usar siempre las 12:00 para cálculos matemáticos
            const weekStart = new Date(weekStartStr);
            weekStart.setHours(12, 0, 0, 0);
            
            const week44_2025 = new Date(weekStart);
            week44_2025.setDate(week44_2025.getDate() - ((52 - 44) * 7));
            
            const week10_2027 = new Date(weekStart);
            week10_2027.setDate(week10_2027.getDate() + ((52 + 9) * 7));
            
            const MIN_DATE = week44_2025;
            const MAX_DATE = week10_2027;
            
            // Obtener el lunes actual (forzado a las 12:00) y sumarle semanas
            const currentMondayStr = App.uiState.currentDate;
            const currentMonday = new Date(currentMondayStr);
            currentMonday.setHours(12, 0, 0, 0);
            currentMonday.setDate(currentMonday.getDate() + (offset * 7));
            
            const newMondayStr = formatDate(currentMonday);
            
            // Validar límites
            if(currentMonday < MIN_DATE) {
                alert('📅 Has alcanzado el límite inferior.\n\nEl calendario comienza en 2025WK44.');
                return;
            }
            if(currentMonday > MAX_DATE) {
                alert('📅 Has alcanzado el límite superior.\n\nEl calendario termina en 2027WK10.');
                return;
            }
            
            App.uiState.currentDate = newMondayStr;
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        getWeekOptions: function(currentMonday) {
            // Helper local para evitar ISOString
            const formatDate = (date) => {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, '0');
                const d = String(date.getDate()).padStart(2, '0');
                return `${y}-${m}-${d}`;
            };

            const weekStartStr = App.data.config?.weekStart || "2025-12-29";
            
            // Fijar inicio a las 12:00
            const weekStart = new Date(weekStartStr);
            weekStart.setHours(12, 0, 0, 0);
            
            const startWeek = new Date(weekStart);
            startWeek.setDate(startWeek.getDate() - ((52 - 44) * 7));
            
            const endWeek = new Date(weekStart);
            endWeek.setDate(endWeek.getDate() + ((52 + 9) * 7));
            
            let weekOptions = '';
            let current = new Date(startWeek);
            
            while (current <= endWeek) {
                const monday = formatDate(current);
                const weekDays = Utils.getWeekDays(monday);
                
                const activeEmployees = App.data.empleados.filter(e => {
                    return e.active !== false && Utils.empleadoVigenteEnFecha(e, monday);
                });
                const totalActiveEmps = activeEmployees.length;
                
                let isComplete = true;
                let hasAnyData = false;
                
                for(let i = 0; i < weekDays.length; i++) {
                    const day = weekDays[i];
                    
                    if(!App.data.schedule[day]) {
                        isComplete = false;
                        continue;
                    }
                    
                    const daySchedule = App.data.schedule[day];
                    const assignedCount = Object.keys(daySchedule).length;
                    
                    if(assignedCount > 0) hasAnyData = true;
                    
                    let allEmployeesAssigned = true;
                    for(let j = 0; j < activeEmployees.length; j++) {
                        const empId = activeEmployees[j].id;
                        if(!daySchedule[empId]) {
                            allEmployeesAssigned = false;
                            break;
                        }
                    }
                    
                    if(!allEmployeesAssigned) isComplete = false;
                }
                
                let indicator = '⚪';
                if(hasAnyData) {
                    if(isComplete && totalActiveEmps > 0) {
                        indicator = '🟢';
                    } else {
                        indicator = '🟡';
                    }
                }
                
                const weekCode = Utils.getWeekCode(monday);
                const sunday = weekDays[6];
                
                const formatShortDate = (dateStr) => {
                    const [year, month, day] = dateStr.split('-');
                    return `${day}.${month}.${year.slice(2)}`;
                };
                
                const weekLabel = `${weekCode} - De ${formatShortDate(monday)} a ${formatShortDate(sunday)}`;
                const selected = monday === currentMonday ? 'selected' : '';
                const wsDot = App.logic.getWeekState(monday);
                const dotChar = wsDot === 'closed' ? '🟢' : wsDot === 'partial' ? '🟡' : '⚪';
                
                weekOptions += `<option value="${monday}" ${selected}>${dotChar} ${weekLabel}</option>`;
                
                // Avanzar a la siguiente semana
                current.setDate(current.getDate() + 7);
            }
            
            return weekOptions;
        },
        goToWeek: function(monday) {
            App.uiState.currentDate = monday;
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        setDate: function(d) { 
            App.uiState.currentDate = d; 
            App.ui.renderPlanner(document.getElementById('main-view')); 
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        setPaint: function(sid) { App.uiState.paintShiftId = (App.uiState.paintShiftId === sid) ? null : sid; App.ui.renderPlanner(document.getElementById('main-view')); },
        // Helper: ¿este día+empleado pertenece a un plan de libranzas aplicado?
        _isLibranzaPlan: function(empId, date) {
            if (!App.data.libranzaPlans) return null;
            return App.data.libranzaPlans.find(p => p.applied && p.empId === empId && p.dates.includes(date)) || null;
        },

        paint: function(empId) {
            const sid = App.uiState.paintShiftId;
            const date = App.uiState.currentDate;

            if(sid === null) return;

            // Semana cerrada — no permitir edición
            if(App.logic.isDayLocked(date)) {
                alert('🔒 Esta semana está cerrada.\n\nPara editar los turnos, ábrela primero con el switch del planificador.');
                return;
            }

            if(!App.data.schedule[date]) App.data.schedule[date] = {};

            // Plan de libranzas/vacaciones — avisar si se va a modificar un día solicitado
            const currentShift = App.data.schedule[date] ? App.data.schedule[date][empId] : null;
            if (currentShift) {
                const cs = Utils.getShift(currentShift);
                if (cs && cs.fixed) {
                    let planMsg = null;
                    if ((cs.code === 'L' || cs.code === 'F') && this._isLibranzaPlan(empId, date)) {
                        planMsg = '📋 Libranza solicitada';
                    } else if (cs.code === 'V' && App.ui._isPlanDay && App.ui._isPlanDay('vacaciones', empId, date)) {
                        planMsg = '🏖️ Vacaciones solicitadas';
                    }
                    if (planMsg) {
                        const emp = App.data.empleados.find(e => e.id === empId);
                        const empName = emp ? emp.nombre : 'Este empleado';
                        if (!confirm(`${planMsg}\n\n${empName} solicitó este día como parte de un plan.\n\n¿Estás seguro de que quieres modificar esta asignación?\nAsegúrate de haber comunicado al empleado la revocación.`)) return;
                    }
                }
            }
            
            const req = Utils.getRequest(empId, date);
            const shiftToPaint = Utils.getShift(sid);
            
            // Mapeo de tipos de solicitud a turnos permitidos
            const allowedShifts = {
                'VAC': ['V'],              // Solo Vacaciones
                'LIB': ['L', 'F', 'R', 'V'], // Libre, Festivo, Recuperación o Vacaciones
                'BAJ': ['B'],              // Solo Baja médica
                'AP': ['P']                // Solo Permiso
            };
            
            // Check if employee has ANY approved request
            const hasApprovedRequest = req && req.status === 'approved';
            
            // If employee has approved request, validate allowed shifts
            // HRL no bloquea el pintado — el sistema de alertas detecta solapamientos a posteriori
            if(hasApprovedRequest && req.type !== 'HRL') {
                const allowed = allowedShifts[req.type] || [];
                
                // SIEMPRE permitir borrador
                if(sid === 'eraser') {
                    delete App.data.schedule[date][empId];
                    this.saveSnapshot('Borrar turno');
                    Safe.save('v40_db', App.data);
                    App.ui.renderPlanner(document.getElementById('main-view'));
                    App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
                    App.logic.checkAlerts();
                    return;
                }
                
                // Validar que el turno existe
                if(!shiftToPaint) {
                    alert('⚠️ Error: Turno no válido');
                    return;
                }
                
                // Verificar si está en lista de permitidos
                if(!allowed.includes(shiftToPaint.code)) {
                    const typeNames = {
                        'VAC': 'VACACIONES',
                        'LIB': 'DÍA LIBRE / LIBRANZA',
                        'BAJ': 'BAJA MÉDICA',
                        'AP': 'ASUNTOS PROPIOS',
                        'HRL': 'HORAS LIBRES'
                    };
                    const typeName = typeNames[req.type] || req.type;
                    const allowedList = allowed.join(', ');
                    
                    alert(`🔒 ${typeName} APROBADA\n\nEste empleado tiene una solicitud de ${typeName.toLowerCase()} aprobada.\n\nTurnos permitidos: ${allowedList}\n\nPara asignar otros turnos, cambia primero el estado de la solicitud en la pestaña Solicitudes.`);
                    return;
                }
                // Si llegamos aquí, el turno está permitido → continuar
            }
            
            const dayKey = Utils.getDayKey(date);
            const holiday = App.data.storeConfig.holidays.find(h => h.date === date);
            const dayConfig = holiday ? App.data.storeConfig.base["Festivo"] : (App.data.storeConfig.base[dayKey] || {open:"10:00", close:"22:00", closed:false});
            const exception = App.data.storeConfig.special.find(s => s.date === date);
            const finalConfig = exception || dayConfig;
            
            // PRIMERO: Determinar qué acción vamos a hacer
            let action = 'Asignar turno';
            if(sid === 'eraser') {
                action = 'Borrar turno';
            } else if (sid === 'magic') {
                action = 'Auto-asignar turno';
            }
            
            // SEGUNDO: Ejecutar la acción
            const emp = App.data.empleados.find(e => e.id === empId);
            const empName = emp ? emp.nombre : empId;
            if(sid === 'eraser') {
                delete App.data.schedule[date][empId];
            } else if (sid === 'magic') {
                const empMagic = App.data.empleados.find(e => e.id === empId);
                const best = App.logic.getSmartShift(empMagic, finalConfig);
                if(best) App.data.schedule[date][empId] = best.id;
            } else { 
                const shift = Utils.getShift(sid);
                // Only confirm if it's a WORKING shift (has hours) on a closed day
                if(shift && shift.start && shift.end && !Utils.isShiftValidForDay(shift, finalConfig)) {
                    if(!confirm("El turno está fuera del horario de apertura. ¿Asignar igual?")) return;
                }
                App.data.schedule[date][empId] = sid; 
            }
            // TERCERO: Snapshot DESPUÉS del cambio (para que redo pueda restaurar el estado con el turno)
            this.saveSnapshot(`${action} de ${empName}`);
            Safe.save('v40_db', App.data); 
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
        },
        
        // Normalizar CUSTOM shifts - convertir a paleta si coinciden exactamente
        normalizeCustomShifts: function() {
            Object.keys(App.data.schedule).forEach(date => {
                Object.keys(App.data.schedule[date]).forEach(empId => {
                    const shift = App.data.schedule[date][empId];
                    
                    // Si es CUSTOM, intentar convertir a paleta
                    if(Utils.isCustomShift(shift)) {
                        const paletteId = Utils.matchesPaletteShift(shift);
                        if(paletteId) {
                            // Coincide exactamente con un turno de paleta - reemplazar
                            App.data.schedule[date][empId] = paletteId;
                        }
                    }
                });
            });
        },
        
        // Analizar CUSTOM shifts - agrupar por características
        getCustomStats: function() {
            const groups = {};
            
            // Escanear todo el schedule
            Object.keys(App.data.schedule).forEach(date => {
                Object.keys(App.data.schedule[date]).forEach(empId => {
                    const shift = App.data.schedule[date][empId];
                    
                    // Solo CUSTOM (objetos, no IDs)
                    if(Utils.isCustomShift(shift)) {
                        // Crear clave única por características
                        const key = `${shift.start}|${shift.end}|${shift.breakStart||''}|${shift.breakEnd||''}`;
                        
                        if(!groups[key]) {
                            groups[key] = {
                                start: shift.start,
                                end: shift.end,
                                breakStart: shift.breakStart || '',
                                breakEnd: shift.breakEnd || '',
                                count: 0
                            };
                        }
                        
                        groups[key].count++;
                    }
                });
            });
            
            // Ordenar por uso descendente
            return Object.values(groups).sort((a, b) => b.count - a.count);
        },
        
        // EDICIÓN INLINE DE HORARIOS
        editSchedule: function(empId, date) {
            // Semana cerrada — no permitir edición
            if(App.logic.isDayLocked(date)) {
                alert('🔒 Esta semana está cerrada.\n\nPara editar los turnos, ábrela primero con el switch del planificador.');
                return;
            }

            const shiftData = App.data.schedule[date] ? App.data.schedule[date][empId] : null;
            if(!shiftData) return;
            
            const shift = Utils.getShift(shiftData);
            if(!shift || shift.fixed || !shift.start || !shift.end) return;
            
            // Guardar estado original para poder restaurar al cancelar
            const originalShift = JSON.parse(JSON.stringify(shift));
            
            // Función para actualizar el modal y la vista
            const updateEditor = () => {
                const currentShift = Utils.getShift(App.data.schedule[date][empId]);
                if(!currentShift) return;
                
                const hasBreak = currentShift.breakStart && currentShift.breakEnd;
                
                // Actualizar selects
                const selectStart = document.getElementById('edit-start');
                const selectEnd = document.getElementById('edit-end');
                const selectBreakStart = document.getElementById('edit-break-start');
                const selectBreakEnd = document.getElementById('edit-break-end');
                
                if(selectStart) {
                    selectStart.value = currentShift.start;
                    App.logic.scrollSelectToCenter(selectStart);
                }
                if(selectEnd) {
                    selectEnd.value = currentShift.end;
                    App.logic.scrollSelectToCenter(selectEnd);
                }
                if(selectBreakStart && hasBreak) {
                    selectBreakStart.value = currentShift.breakStart;
                    App.logic.scrollSelectToCenter(selectBreakStart);
                }
                if(selectBreakEnd && hasBreak) {
                    selectBreakEnd.value = currentShift.breakEnd;
                    App.logic.scrollSelectToCenter(selectBreakEnd);
                }
                
                // Re-renderizar solo el planificador (mantener modal)
                App.ui.renderPlanner(document.getElementById('main-view'));
                App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            };
            
            // Determinar si tiene descanso
            const hasBreak = shift.breakStart && shift.breakEnd;
            
            // Crear backdrop modal
            const backdrop = document.createElement('div');
            backdrop.id = 'schedule-editor-backdrop';
            backdrop.style.cssText = 'position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.15); z-index:999; display:flex; align-items:flex-start; justify-content:center; padding-top:20px;';
            backdrop.onclick = (e) => {
                if(e.target === backdrop) {
                    // Restaurar estado original
                    const paletteId = Utils.matchesPaletteShift(originalShift);
                    App.data.schedule[date][empId] = paletteId || originalShift;
                    Safe.save('v40_db', App.data);
                    backdrop.remove();
                    App.ui.renderPlanner(document.getElementById('main-view'));
                    App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
                }
            };
            
            // Construir HTML del editor
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'padding:10px; background:white; border:2px solid #3b82f6; border-radius:6px; width:280px; box-shadow:0 10px 30px rgba(0,0,0,0.25);';
            
            // Título con info del empleado
            const emp = App.data.empleados.find(e => e.id === empId);
            const empName = emp ? emp.nombre : 'Empleado';
            const titleBar = document.createElement('div');
            titleBar.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid #e2e8f0;';
            titleBar.innerHTML = `<div style="font-weight:700; font-size:0.8rem; color:#1e293b;">✏️ ${empName}</div>`;
            
            // Controles rápidos
            const quickControls = document.createElement('div');
            quickControls.style.cssText = 'display:flex; gap:3px; margin-bottom:6px;';
            
            const btnPrev = document.createElement('button');
            btnPrev.innerHTML = '◀ -30';
            btnPrev.title = 'Mover todo el turno 30 min antes';
            btnPrev.style.cssText = 'flex:1; padding:4px; background:white; border:1px solid #cbd5e1; border-radius:3px; cursor:pointer; font-size:0.65rem; font-weight:600;';
            btnPrev.onclick = () => {
                App.logic.shiftTimePreview(empId, date, -30);
                updateEditor();
            };
            
            const btnNext = document.createElement('button');
            btnNext.innerHTML = '+30 ▶';
            btnNext.title = 'Mover todo el turno 30 min después';
            btnNext.style.cssText = 'flex:1; padding:4px; background:white; border:1px solid #cbd5e1; border-radius:3px; cursor:pointer; font-size:0.65rem; font-weight:600;';
            btnNext.onclick = () => {
                App.logic.shiftTimePreview(empId, date, 30);
                updateEditor();
            };
            
            const btnBreak = document.createElement('button');
            btnBreak.innerHTML = (hasBreak ? '➖' : '➕') + ' Break';
            btnBreak.title = hasBreak ? 'Quitar descanso' : 'Añadir descanso';
            btnBreak.style.cssText = `flex:1; padding:4px; background:${hasBreak?'#fef3c7':'#dcfce7'}; border:1px solid ${hasBreak?'#fde047':'#86efac'}; border-radius:3px; cursor:pointer; font-size:0.65rem; font-weight:600;`;
            btnBreak.onclick = () => {
                // Restaurar estado original primero
                const paletteId = Utils.matchesPaletteShift(originalShift);
                App.data.schedule[date][empId] = paletteId || originalShift;
                Safe.save('v40_db', App.data);
                backdrop.remove();
                App.logic.toggleBreak(empId, date);
            };
            
            quickControls.appendChild(btnPrev);
            quickControls.appendChild(btnNext);
            quickControls.appendChild(btnBreak);
            
            // Separador
            const separator = document.createElement('div');
            separator.style.cssText = 'height:1px; background:#e2e8f0; margin:6px 0;';
            
            // Título de edición manual
            const title = document.createElement('div');
            title.style.cssText = 'font-size:0.6rem; color:#64748b; font-weight:700; margin-bottom:5px; text-align:center; text-transform:uppercase;';
            title.textContent = 'Edición manual:';
            
            // Primera fila de selects
            const row1 = document.createElement('div');
            row1.style.cssText = 'display:flex; gap:4px; align-items:center; margin-bottom:5px;';
            
            const labelStart = document.createElement('div');
            labelStart.style.cssText = 'font-size:0.65rem; font-weight:600; color:#64748b; min-width:45px;';
            labelStart.textContent = 'Entrada:';
            
            const selectStart = document.createElement('select');
            selectStart.id = 'edit-start';
            selectStart.style.cssText = 'flex:1; padding:3px; font-size:0.7rem; font-family:monospace; border:1px solid #cbd5e1; border-radius:3px;';
            selectStart.innerHTML = Utils.getTimeOptions(shift.start);
            selectStart.onchange = () => {
                App.logic.applyManualEdit(empId, date, hasBreak);
                updateEditor();
            };
            
            row1.appendChild(labelStart);
            row1.appendChild(selectStart);
            
            // Segunda fila
            const row2 = document.createElement('div');
            row2.style.cssText = 'display:flex; gap:4px; align-items:center; margin-bottom:5px;';
            
            if(hasBreak) {
                const labelBreakStart = document.createElement('div');
                labelBreakStart.style.cssText = 'font-size:0.65rem; font-weight:600; color:#64748b; min-width:45px;';
                labelBreakStart.textContent = 'Break In:';
                
                const selectBreakStart = document.createElement('select');
                selectBreakStart.id = 'edit-break-start';
                selectBreakStart.style.cssText = 'flex:1; padding:3px; font-size:0.7rem; font-family:monospace; border:1px solid #cbd5e1; border-radius:3px;';
                selectBreakStart.innerHTML = Utils.getTimeOptions(shift.breakStart);
                selectBreakStart.onchange = () => {
                    App.logic.applyManualEdit(empId, date, hasBreak);
                    updateEditor();
                };
                
                row2.appendChild(labelBreakStart);
                row2.appendChild(selectBreakStart);
            } else {
                const labelEnd = document.createElement('div');
                labelEnd.style.cssText = 'font-size:0.65rem; font-weight:600; color:#64748b; min-width:45px;';
                labelEnd.textContent = 'Salida:';
                
                const selectEnd = document.createElement('select');
                selectEnd.id = 'edit-end';
                selectEnd.style.cssText = 'flex:1; padding:3px; font-size:0.7rem; font-family:monospace; border:1px solid #cbd5e1; border-radius:3px;';
                selectEnd.innerHTML = Utils.getTimeOptions(shift.end);
                selectEnd.onchange = () => {
                    App.logic.applyManualEdit(empId, date, hasBreak);
                    updateEditor();
                };
                
                row2.appendChild(labelEnd);
                row2.appendChild(selectEnd);
            }
            
            // Tercera y cuarta fila (solo si hay break)
            const row3 = hasBreak ? document.createElement('div') : null;
            const row4 = hasBreak ? document.createElement('div') : null;
            
            if(row3 && row4) {
                row3.style.cssText = 'display:flex; gap:4px; align-items:center; margin-bottom:5px;';
                
                const labelBreakEnd = document.createElement('div');
                labelBreakEnd.style.cssText = 'font-size:0.65rem; font-weight:600; color:#64748b; min-width:45px;';
                labelBreakEnd.textContent = 'Break Out:';
                
                const selectBreakEnd = document.createElement('select');
                selectBreakEnd.id = 'edit-break-end';
                selectBreakEnd.style.cssText = 'flex:1; padding:3px; font-size:0.7rem; font-family:monospace; border:1px solid #cbd5e1; border-radius:3px;';
                selectBreakEnd.innerHTML = Utils.getTimeOptions(shift.breakEnd);
                selectBreakEnd.onchange = () => {
                    App.logic.applyManualEdit(empId, date, hasBreak);
                    updateEditor();
                };
                
                row3.appendChild(labelBreakEnd);
                row3.appendChild(selectBreakEnd);
                
                // Row 4: Salida
                row4.style.cssText = 'display:flex; gap:4px; align-items:center; margin-bottom:8px;';
                
                const labelEnd2 = document.createElement('div');
                labelEnd2.style.cssText = 'font-size:0.65rem; font-weight:600; color:#64748b; min-width:45px;';
                labelEnd2.textContent = 'Salida:';
                
                const selectEnd2 = document.createElement('select');
                selectEnd2.id = 'edit-end';
                selectEnd2.style.cssText = 'flex:1; padding:3px; font-size:0.7rem; font-family:monospace; border:1px solid #cbd5e1; border-radius:3px;';
                selectEnd2.innerHTML = Utils.getTimeOptions(shift.end);
                selectEnd2.onchange = () => {
                    App.logic.applyManualEdit(empId, date, hasBreak);
                    updateEditor();
                };
                
                row4.appendChild(labelEnd2);
                row4.appendChild(selectEnd2);
            }
            
            // Botones de acción
            const actions = document.createElement('div');
            actions.style.cssText = 'display:flex; gap:4px; margin-top:8px;';
            
            const btnApply = document.createElement('button');
            btnApply.innerHTML = '✓ Aplicar';
            btnApply.style.cssText = 'flex:1; padding:5px; background:#10b981; color:white; border:none; border-radius:3px; cursor:pointer; font-size:0.7rem; font-weight:700;';
            btnApply.onclick = () => {
                backdrop.remove();
                App.logic.applyScheduleEdit(empId, date, hasBreak);
            };
            
            const btnCancel = document.createElement('button');
            btnCancel.innerHTML = '✕ Cancelar';
            btnCancel.style.cssText = 'flex:1; padding:5px; background:#ef4444; color:white; border:none; border-radius:3px; cursor:pointer; font-size:0.7rem; font-weight:700;';
            btnCancel.onclick = () => {
                // Restaurar estado original
                const paletteId = Utils.matchesPaletteShift(originalShift);
                App.data.schedule[date][empId] = paletteId || originalShift;
                Safe.save('v40_db', App.data);
                backdrop.remove();
                App.ui.renderPlanner(document.getElementById('main-view'));
                App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            };
            
            actions.appendChild(btnApply);
            actions.appendChild(btnCancel);
            
            // Ensamblar todo
            wrapper.appendChild(titleBar);
            wrapper.appendChild(quickControls);
            wrapper.appendChild(separator);
            wrapper.appendChild(title);
            wrapper.appendChild(row1);
            wrapper.appendChild(row2);
            if(row3) wrapper.appendChild(row3);
            if(row4) wrapper.appendChild(row4);
            wrapper.appendChild(actions);
            
            backdrop.appendChild(wrapper);
            document.body.appendChild(backdrop);
            
            // Scroll automático a opciones seleccionadas (después de agregar al DOM)
            setTimeout(() => {
                App.logic.scrollSelectToCenter(selectStart);
                if(hasBreak) {
                    const selBreakStart = document.getElementById('edit-break-start');
                    const selBreakEnd = document.getElementById('edit-break-end');
                    const selEnd = document.getElementById('edit-end');
                    if(selBreakStart) App.logic.scrollSelectToCenter(selBreakStart);
                    if(selBreakEnd) App.logic.scrollSelectToCenter(selBreakEnd);
                    if(selEnd) App.logic.scrollSelectToCenter(selEnd);
                } else {
                    const selEnd = document.getElementById('edit-end');
                    if(selEnd) App.logic.scrollSelectToCenter(selEnd);
                }
            }, 50);
        },
        
        // Desplazar horario lateralmente (mantener duración)
        shiftTime: function(empId, date, minutes) {
            const shiftData = App.data.schedule[date] ? App.data.schedule[date][empId] : null;
            if(!shiftData) return;
            
            const shift = Utils.getShift(shiftData);
            if(!shift || shift.fixed || !shift.start || !shift.end) return;
            
            // Función para ajustar tiempo
            const adjustTime = (timeStr, offsetMin) => {
                const [h, m] = timeStr.split(':').map(Number);
                let totalMin = h * 60 + m + offsetMin;
                
                // Limitar a rango válido (0:00 - 23:30)
                if(totalMin < 0) totalMin = 0;
                if(totalMin >= 24 * 60) totalMin = 23 * 60 + 30;
                
                const newH = Math.floor(totalMin / 60);
                const newM = totalMin % 60;
                return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
            };
            
            // Crear nuevo turno con horarios desplazados
            const newShift = {
                start: adjustTime(shift.start, minutes),
                end: adjustTime(shift.end, minutes),
                breakStart: shift.breakStart ? adjustTime(shift.breakStart, minutes) : '',
                breakEnd: shift.breakEnd ? adjustTime(shift.breakEnd, minutes) : '',
                color: '#6b7280',
                custom: true
            };
            
            // Verificar coincidencia con paleta
            const paletteId = Utils.matchesPaletteShift(newShift);
            
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = paletteId || newShift;
            
            Safe.save('v40_db', App.data);
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        
        // Añadir o quitar descanso
        toggleBreak: function(empId, date) {
            const shiftData = App.data.schedule[date] ? App.data.schedule[date][empId] : null;
            if(!shiftData) return;
            
            const shift = Utils.getShift(shiftData);
            if(!shift || shift.fixed || !shift.start || !shift.end) return;
            
            const hasBreak = shift.breakStart && shift.breakEnd;
            
            let newShift;
            if(hasBreak) {
                // Quitar descanso - convertir a turno continuo
                newShift = {
                    start: shift.start,
                    end: shift.end,
                    breakStart: '',
                    breakEnd: '',
                    color: '#6b7280',
                    custom: true
                };
            } else {
                // Añadir descanso - calcular punto medio aproximado
                const [h1, m1] = shift.start.split(':').map(Number);
                const [h2, m2] = shift.end.split(':').map(Number);
                const startMin = h1 * 60 + m1;
                const endMin = h2 * 60 + m2;
                const duration = endMin - startMin;
                
                // Descanso de 2h en el punto medio
                const midPoint = startMin + Math.floor(duration / 2);
                const breakStartMin = midPoint - 60; // 1h antes del medio
                const breakEndMin = midPoint + 60; // 1h después del medio
                
                const toTime = (min) => {
                    const h = Math.floor(min / 60);
                    const m = min % 60;
                    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                };
                
                newShift = {
                    start: shift.start,
                    end: shift.end,
                    breakStart: toTime(breakStartMin),
                    breakEnd: toTime(breakEndMin),
                    color: '#6b7280',
                    custom: true
                };
            }
            
            // Verificar coincidencia con paleta
            const paletteId = Utils.matchesPaletteShift(newShift);
            
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = paletteId || newShift;
            
            Safe.save('v40_db', App.data);
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        
        // Versión preview de shiftTime (no cierra modal ni re-renderiza)
        shiftTimePreview: function(empId, date, minutes) {
            const shiftData = App.data.schedule[date] ? App.data.schedule[date][empId] : null;
            if(!shiftData) return;
            
            const shift = Utils.getShift(shiftData);
            if(!shift || shift.fixed || !shift.start || !shift.end) return;
            
            // Función para ajustar tiempo
            const adjustTime = (timeStr, offsetMin) => {
                const [h, m] = timeStr.split(':').map(Number);
                let totalMin = h * 60 + m + offsetMin;
                
                // Limitar a rango válido (0:00 - 23:30)
                if(totalMin < 0) totalMin = 0;
                if(totalMin >= 24 * 60) totalMin = 23 * 60 + 30;
                
                const newH = Math.floor(totalMin / 60);
                const newM = totalMin % 60;
                return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
            };
            
            // Crear nuevo turno con horarios desplazados
            const newShift = {
                start: adjustTime(shift.start, minutes),
                end: adjustTime(shift.end, minutes),
                breakStart: shift.breakStart ? adjustTime(shift.breakStart, minutes) : '',
                breakEnd: shift.breakEnd ? adjustTime(shift.breakEnd, minutes) : '',
                color: '#6b7280',
                custom: true
            };
            
            // Verificar coincidencia con paleta
            const paletteId = Utils.matchesPaletteShift(newShift);
            
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = paletteId || newShift;
            
            // NO guardamos ni re-renderizamos - el modal se encarga
        },
        
        // Hacer scroll en un select para centrar la opción seleccionada
        scrollSelectToCenter: function(selectElement) {
            if(!selectElement) return;
            
            const selectedOption = selectElement.options[selectElement.selectedIndex];
            if(!selectedOption) return;
            
            // Calcular la posición para centrar
            const optionHeight = selectedOption.offsetHeight || 30; // altura estimada de cada opción
            const selectHeight = selectElement.clientHeight;
            const visibleOptions = Math.floor(selectHeight / optionHeight);
            
            // Intentar centrar la opción seleccionada
            const targetScroll = (selectElement.selectedIndex - Math.floor(visibleOptions / 2)) * optionHeight;
            selectElement.scrollTop = Math.max(0, targetScroll);
        },
        
        // Aplicar edición manual en tiempo real (preview, no guarda)
        applyManualEdit: function(empId, date, hasBreak) {
            const start = document.getElementById('edit-start')?.value;
            const end = document.getElementById('edit-end')?.value;
            const breakStart = hasBreak ? (document.getElementById('edit-break-start')?.value || '') : '';
            const breakEnd = hasBreak ? (document.getElementById('edit-break-end')?.value || '') : '';
            
            if(!start || !end) return; // Validación silenciosa
            
            // Crear objeto CUSTOM con valores actuales
            const customShift = Utils.createCustomShift(start, end, breakStart, breakEnd);
            
            // Verificar si coincide con algún turno de paleta
            const paletteId = Utils.matchesPaletteShift(customShift);
            
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = paletteId || customShift;
            
            // NO guardamos - solo preview temporal
        },
        
        applyScheduleEdit: function(empId, date, hasBreak) {
            const start = document.getElementById('edit-start').value;
            const end = document.getElementById('edit-end').value;
            const breakStart = hasBreak ? document.getElementById('edit-break-start').value : '';
            const breakEnd = hasBreak ? document.getElementById('edit-break-end').value : '';
            
            // Validaciones básicas
            if(!start || !end) {
                alert('Las horas de entrada y salida son obligatorias.');
                return;
            }
            
            // Crear objeto CUSTOM
            const customShift = Utils.createCustomShift(start, end, breakStart, breakEnd);
            
            // Verificar si coincide con algún turno de paleta
            const paletteId = Utils.matchesPaletteShift(customShift);
            
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            
            if(paletteId) {
                // Coincide con paleta - usar ID
                App.data.schedule[date][empId] = paletteId;
            } else {
                // No coincide - guardar como CUSTOM
                App.data.schedule[date][empId] = customShift;
            }
            
            Safe.save('v40_db', App.data);
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            
            // Mensaje informativo
            if(paletteId) {
                const paletteShift = Utils.getShift(paletteId);
                console.log(`✅ Horario actualizado y convertido a turno "${paletteShift.code}" del catálogo`);
            } else {
                console.log('✅ Horario actualizado como turno personalizado (·)');
            }
        },
        
        // ═══════════════════════════════════════════════════════════
        // EDICIÓN VISUAL DE BARRAS (DRAG HORARIOS)
        // ═══════════════════════════════════════════════════════════
        
        
        barDragStart: function(event, empId, date, barType) {
            // Bloquear si el día está cerrado
            if(App.logic.isDayLocked(date)) return;

            // VERIFICAR MODO DE DRAG
            const currentMode = App.logic.getCurrentDragMode();
            if(currentMode === 'swap') return; // En modo SWAP, el drag HTML5 se maneja con shiftDragStart

            const bar = event.currentTarget;
            const rect = bar.getBoundingClientRect();
            const clickX = event.clientX - rect.left;
            const barWidth = rect.width;

            const EDGE_ZONE = 12;
            let dragMode = 'move';

            if(clickX <= EDGE_ZONE) dragMode = 'resize-left';
            else if(clickX >= barWidth - EDGE_ZONE) dragMode = 'resize-right';

            if(barType === 'gap') {
                if(clickX <= EDGE_ZONE) dragMode = 'resize-gap-left';
                else if(clickX >= barWidth - EDGE_ZONE) dragMode = 'resize-gap-right';
                else return; // centro del gap: no hace nada
            }

            const container = bar.closest('.planner-timeline-wrapper');
            if(!container) return;

            const shift = Utils.getShift(App.data.schedule[date] ? App.data.schedule[date][empId] : null);
            if(!shift) return;

            // Estado inicial del drag
            const dragState = {
                empId,
                date,
                barType,
                dragMode,
                containerEl: container,
                startX: event.clientX,
                originalShift: JSON.parse(JSON.stringify(shift)), // clon profundo una vez
                previewShift: null,
                _pendingDelta: 0,
                _rafId: null
            };

            const applyPreview = () => {
                dragState._rafId = null;
                App.logic.applyBarDrag(dragState, dragState._pendingDelta); // SOLO preview + DOM
            };

            const onMouseMove = (e) => {
                e.preventDefault();

                const containerWidth = dragState.containerEl.getBoundingClientRect().width || 1;
                const deltaX = e.clientX - dragState.startX;

                // Convertir delta de píxeles a minutos (misma escala que renderPlannerTimeline)
                const rangeTotal = 780; // 9:30 a 22:30
                const deltaMinutes = (deltaX / containerWidth) * rangeTotal;

                // Snap a 30 min
                const snappedDelta = Math.round(deltaMinutes / 30) * 30;

                dragState._pendingDelta = snappedDelta;

                // Throttle: máximo 1 update por frame
                if(dragState._rafId == null) {
                    dragState._rafId = requestAnimationFrame(applyPreview);
                }
            };

            const onMouseUp = (e) => {
                e.preventDefault();
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                document.body.style.cursor = '';
                document.body.style.userSelect = '';

                if(dragState._rafId != null) {
                    cancelAnimationFrame(dragState._rafId);
                    dragState._rafId = null;
                }

                // Si no hubo movimiento real → fue un click, delegar a paint()
                if(!dragState.previewShift) {
                    App.logic.paint(empId);
                    return;
                }

                // Commit final: actualizar modelo + render una vez
                const finalShift = dragState.previewShift;

                if(!App.data.schedule[date]) App.data.schedule[date] = {};
                const paletteId = Utils.matchesPaletteShift(finalShift);
                App.data.schedule[date][empId] = paletteId || finalShift;

                App.logic.saveSnapshot('Ajuste de turno');
                Safe.save('v40_db', App.data);
                App.logic.checkAlerts();

                App.ui.renderPlanner(document.getElementById('main-view'));
                App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            };

            // Cursor según modo
            document.body.style.cursor = dragMode.startsWith('resize') ? 'ew-resize' : 'grabbing';
            document.body.style.userSelect = 'none';

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);

            event.preventDefault();
        },

        // Preview-only: calcula el shift y actualiza SOLO el DOM de las barras (sin tocar App.data.schedule ni re-render global)
        applyBarDrag: function(dragState, deltaMinutes) {
            const { empId, date, dragMode, originalShift } = dragState;

            const RANGE_START = 570; // 9:30
            const RANGE_END = 1350;  // 22:30
            const getMin = (t) => { if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
            const toTime = (mins) => `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
            const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

            // Función auxiliar: agregar minutos a una hora "HH:MM" con clamp al rango visual
            const addMinutes = (timeStr, mins) => {
                if(!timeStr) return '';
                const total = clamp(getMin(timeStr) + mins, RANGE_START, RANGE_END);
                return toTime(total);
            };

            // Si el turno original es de PALETA (tiene .id pero no .custom), crear CUSTOM
            const isPaletteShift = originalShift.id && !originalShift.custom;
            let newShift;

            if(isPaletteShift) {
                newShift = {
                    start: originalShift.start,
                    end: originalShift.end,
                    breakStart: originalShift.breakStart || '',
                    breakEnd: originalShift.breakEnd || '',
                    color: '#6b7280',
                    custom: true,
                    external: originalShift.external || false
                };
            } else {
                newShift = { ...originalShift };
            }

            // Validaciones: convertir "HH:MM" a entero comparable por minutos (no por HHMM)
            const minOr0 = (t)=> getMin(t||'00:00');

            switch(dragMode) {
                case 'resize-left':
                    if(dragState.barType === 'end') {
                        newShift.breakEnd = addMinutes(originalShift.breakEnd, deltaMinutes);
                        const bEnd = minOr0(newShift.breakEnd);
                        const bStart = minOr0(newShift.breakStart);
                        const end = minOr0(newShift.end);
                        if(bEnd <= bStart || bEnd >= end) return;
                    } else {
                        newShift.start = addMinutes(originalShift.start, deltaMinutes);
                        const start = minOr0(newShift.start);
                        const limit = originalShift.breakStart ? minOr0(newShift.breakStart) : minOr0(newShift.end);
                        if(start >= limit) return;
                    }
                    break;

                case 'resize-right':
                    if(dragState.barType === 'start') {
                        newShift.breakStart = addMinutes(originalShift.breakStart, deltaMinutes);
                        const bStart = minOr0(newShift.breakStart);
                        const start = minOr0(newShift.start);
                        const bEnd = minOr0(newShift.breakEnd);
                        if(bStart <= start || bStart >= bEnd) return;
                    } else {
                        newShift.end = addMinutes(originalShift.end, deltaMinutes);
                        const end = minOr0(newShift.end);
                        const limit = originalShift.breakEnd ? minOr0(newShift.breakEnd) : minOr0(newShift.start);
                        if(end <= limit) return;
                    }
                    break;

                case 'move':
                    newShift.start = addMinutes(originalShift.start, deltaMinutes);
                    newShift.end = addMinutes(originalShift.end, deltaMinutes);
                    if(originalShift.breakStart) newShift.breakStart = addMinutes(originalShift.breakStart, deltaMinutes);
                    if(originalShift.breakEnd) newShift.breakEnd = addMinutes(originalShift.breakEnd, deltaMinutes);
                    break;

                case 'resize-gap-left':
                    newShift.breakStart = addMinutes(originalShift.breakStart, deltaMinutes);
                    {
                        const bStart = minOr0(newShift.breakStart);
                        const start = minOr0(newShift.start);
                        const bEnd = minOr0(newShift.breakEnd);
                        if(bStart <= start || bStart >= bEnd) return;
                    }
                    break;

                case 'resize-gap-right':
                    newShift.breakEnd = addMinutes(originalShift.breakEnd, deltaMinutes);
                    {
                        const bEnd = minOr0(newShift.breakEnd);
                        const bStart = minOr0(newShift.breakStart);
                        const end = minOr0(newShift.end);
                        if(bEnd <= bStart || bEnd >= end) return;
                    }
                    break;
            }

            // Guardar preview en el estado (NO en App.data)
            dragState.previewShift = newShift;

            // Actualización DOM ultra-local
            const container = dragState.containerEl;
            const bars = container.querySelectorAll(`.pt-bar[data-emp="${empId}"][data-date="${date}"]`);
            const gap = container.querySelector(`.pt-gap[data-emp="${empId}"][data-date="${date}"]`);

            const getPct = (mins) => {
                const rel = mins - RANGE_START;
                const pct = (rel / (RANGE_END - RANGE_START)) * 100;
                return Math.max(0, Math.min(100, pct));
            };

            // Si el DOM no coincide con el tipo (p.ej. faltan elementos), no forzar: el commit re-renderizará al soltar
            if(newShift.breakStart && newShift.breakEnd) {
                if(bars.length >= 2 && gap) {
                    const tStart = getMin(newShift.start);
                    const bStart = getMin(newShift.breakStart);
                    const bEnd = getMin(newShift.breakEnd);
                    const tEnd = getMin(newShift.end);

                    const bar1Left = getPct(tStart);
                    const bar1Width = Math.max(0, getPct(bStart) - bar1Left);
                    const gapLeft = getPct(bStart);
                    const gapWidth = Math.max(0, getPct(bEnd) - gapLeft);
                    const bar2Left = getPct(bEnd);
                    const bar2Width = Math.max(0, getPct(tEnd) - bar2Left);

                    // Orden asumido: primera barra, luego segunda barra (como en renderPlannerTimeline)
                    bars[0].style.left = `${bar1Left}%`;
                    bars[0].style.width = `${bar1Width}%`;
                    gap.style.left = `${gapLeft}%`;
                    gap.style.width = `${gapWidth}%`;
                    bars[1].style.left = `${bar2Left}%`;
                    bars[1].style.width = `${bar2Width}%`;
                }
            } else {
                if(bars.length >= 1) {
                    const tStart = getMin(newShift.start);
                    const tEnd = getMin(newShift.end);
                    const barLeft = getPct(tStart);
                    const barWidth = Math.max(0, getPct(tEnd) - barLeft);
                    bars[0].style.left = `${barLeft}%`;
                    bars[0].style.width = `${barWidth}%`;
                }
            }
        },


        // DRAG & DROP para intercambio de turnos
        shiftDragStart: function(event, empId, date) {
            // VERIFICAR MODO - solo funcionar en modo SWAP
            const currentMode = App.logic.getCurrentDragMode();
            if(currentMode !== 'swap') {
                // En modo EDIT, cancelar el drag HTML5
                event.preventDefault();
                return;
            }
            
            // MODO SWAP: Continuar con intercambio
            event.stopPropagation();
            event.dataTransfer.setData('text/plain', JSON.stringify({ empId, date }));
            event.dataTransfer.effectAllowed = 'move';
            event.currentTarget.style.opacity = '0.5';
        },
        
        shiftDragOver: function(event) {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'move';
            const target = event.currentTarget;
            if(!target.classList.contains('drag-over-active')) {
                target.classList.add('drag-over-active');
            }
        },
        
        shiftDrop: function(event, targetEmpId, targetDate) {
            event.preventDefault();
            event.stopPropagation();
            event.currentTarget.classList.remove('drag-over-active');
            
            const data = JSON.parse(event.dataTransfer.getData('text/plain'));
            const sourceEmpId = data.empId;
            const sourceDate = data.date;
            
            // No hacer nada si soltamos en el mismo empleado
            if(sourceEmpId === targetEmpId && sourceDate === targetDate) {
                return;
            }
            
            // Solo permitir intercambio en el mismo día
            if(sourceDate !== targetDate) {
                alert('⚠️ Solo puedes intercambiar turnos dentro del mismo día');
                return;
            }

            // Semana cerrada — no permitir edición
            if(App.logic.isDayLocked(targetDate)) {
                alert('🔒 Esta semana está cerrada.\n\nPara editar los turnos, ábrela primero con el switch del planificador.');
                return;
            }
            
            // Plan de libranzas — avisar si se va a mover una libranza solicitada
            const _checkSwapPlan = (eId, d) => {
                const sv = (App.data.schedule[d] || {})[eId];
                if (!sv) return true;
                const sh = Utils.getShift(sv);
                if (!sh || !sh.fixed) return true;
                let msg = null;
                if ((sh.code === 'L' || sh.code === 'F') && App.logic._isLibranzaPlan(eId, d)) msg = '📋 Libranza solicitada';
                else if (sh.code === 'V' && App.ui._isPlanDay && App.ui._isPlanDay('vacaciones', eId, d)) msg = '🏖️ Vacaciones solicitadas';
                if (msg) {
                    const emp = App.data.empleados.find(e => e.id === eId);
                    return confirm(`${msg}\n\n${emp ? emp.nombre : 'Este empleado'} solicitó este día como parte de un plan.\n\n¿Quieres modificar esta asignación?`);
                }
                return true;
            };
            if (!_checkSwapPlan(sourceEmpId, sourceDate)) return;
            if (!_checkSwapPlan(targetEmpId, targetDate)) return;

            // Obtener turnos actuales
            const sourceShiftId = App.data.schedule[sourceDate] ? App.data.schedule[sourceDate][sourceEmpId] : null;
            const targetShiftId = App.data.schedule[targetDate] ? App.data.schedule[targetDate][targetEmpId] : null;
            
            // Verificar que el origen tiene turno
            if(!sourceShiftId) {
                return;
            }
            
            // Realizar intercambio
            if(!App.data.schedule[targetDate]) App.data.schedule[targetDate] = {};
            if(!App.data.schedule[sourceDate]) App.data.schedule[sourceDate] = {};
            
            // Intercambiar
            if(targetShiftId) {
                // Ambos tienen turno: intercambiar
                App.data.schedule[targetDate][targetEmpId] = sourceShiftId;
                App.data.schedule[sourceDate][sourceEmpId] = targetShiftId;
            } else {
                // Target no tiene turno: mover
                App.data.schedule[targetDate][targetEmpId] = sourceShiftId;
                delete App.data.schedule[sourceDate][sourceEmpId];
            }
            
            // Guardar y actualizar
            App.logic.saveSnapshot(targetShiftId ? 'Intercambiar turnos' : 'Mover turno');
            Safe.save('v40_db', App.data);
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
        },
        
        // ... (Smart Shift, Alerts, Coverage, Mass Actions - same as v40.36)
        getSmartShift: function(emp, dayConfig) {
            if(!emp || !emp.prefs) return null;
            const pref = emp.prefs.shift; 
            
            // Get all valid working shifts for this day
            let candidates = App.data.shiftDefs.filter(s => s.start && s.end && Utils.isShiftValidForDay(s, dayConfig));
            
            if(candidates.length === 0) return null;

            // If preference is a specific shift ID, try to find it
            if(pref && pref !== 'any') {
                const preferredShift = candidates.find(s => s.id === pref);
                if(preferredShift) return preferredShift;
                
                // Legacy support for old M/T/P preferences
                if(pref === 'M') {
                    const morning = candidates.find(s => s.start && s.start < '12:00');
                    if(morning) return morning;
                }
                if(pref === 'T') {
                    const afternoon = candidates.find(s => s.start && s.start > '13:00');
                    if(afternoon) return afternoon;
                }
                if(pref === 'P') {
                    const split = candidates.find(s => s.breakStart && s.breakEnd);
                    if(split) return split;
                }
            }
            
            // Default: return first valid candidate
            return candidates[0];
        },

        // ── HELPERS GESTIÓN DE LLAVES ─────────────────────────────────────────
        getTitularLlave: function(llaveId, dateStr, excludeId) {
            // Devuelve el empId titular de la llave en esa fecha, o null
            // excludeId: excluir un traspaso concreto (para edición)
            const traspasos = (App.data.traspasoLlaves || [])
                .filter(t => t.llaveId === llaveId && t.fecha <= dateStr && (!excludeId || t.id !== excludeId))
                .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
            return traspasos.length > 0 ? traspasos[0].receptorId : null;
        },

        getTitularLlaveInicio: function(llaveId, dateStr) {
            // Titular AL INICIO del día — excluye traspasos del propio día (fecha < dateStr)
            // Útil para apertura: el dador llega con la llave aunque ese día la entregue
            const traspasos = (App.data.traspasoLlaves || [])
                .filter(t => t.llaveId === llaveId && t.fecha < dateStr)
                .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
            return traspasos.length > 0 ? traspasos[0].receptorId : null;
        },

        _getKeyHoldersOnDate: function(dateStr) {
            return App.data.empleados.filter(emp =>
                (App.data.config.llaves || []).some(l => this.getTitularLlave(l.id, dateStr) === emp.id)
            );
        },

        _getHorarioDelDia: function(dateStr) {
            // 1. Días especiales con fecha concreta (máxima prioridad)
            const special = (App.data.storeConfig.special || []).find(s => s.date === dateStr);
            if(special) return special;
            // 2. Festivo de tienda
            const isHoliday = (App.data.storeConfig.holidays || []).some(h => h.date === dateStr);
            if(isHoliday) return App.data.storeConfig.base['Festivo'] || { closed: true };
            // 3. Día de la semana base
            const dayNames = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
            const dayName = dayNames[new Date(dateStr + 'T12:00:00').getDay()];
            return App.data.storeConfig.base[dayName] || { closed: true };
        },

        _checkKeysCoverageDay: function(dateStr) {
            // Devuelve { hasApertura: bool, hasCierre: bool, horario: obj }
            const horario = this._getHorarioDelDia(dateStr);
            if(!horario || horario.closed) return null;
            const daySched = App.data.schedule[dateStr] || {};
            // Apertura: quien tenía la llave AL INICIO del día (antes de traspasos del mismo día)
            const keyHoldersInicio = App.data.empleados.filter(emp =>
                (App.data.config.llaves || []).some(l => this.getTitularLlaveInicio(l.id, dateStr) === emp.id)
            );
            // Cierre: quien tiene la llave AL FINAL del día (después de traspasos del mismo día)
            const keyHoldersFin = App.data.empleados.filter(emp =>
                (App.data.config.llaves || []).some(l => this.getTitularLlave(l.id, dateStr) === emp.id)
            );
            // Sin ningún portador humano → todas las llaves en tienda, sin alerta de cobertura
            if (keyHoldersInicio.length === 0 && keyHoldersFin.length === 0) {
                return { hasApertura: true, hasCierre: true, horario };
            }
            const hasApertura = keyHoldersInicio.some(emp => {
                const shiftId = daySched[emp.id];
                if(!shiftId) return false;
                const shift = Utils.getShift(shiftId);
                return shift && !shift.fixed && shift.start === horario.open;
            });
            const hasCierre = keyHoldersFin.some(emp => {
                const shiftId = daySched[emp.id];
                if(!shiftId) return false;
                const shift = Utils.getShift(shiftId);
                return shift && !shift.fixed && shift.end === horario.close;
            });
            return { hasApertura, hasCierre, horario };
        },

        getAlerts: function() {
            let alerts = [];
            
            // Mapeo de turnos permitidos por tipo (mismo que en paint)
            const allowedShifts = {
                'VAC': ['V'],
                'LIB': ['L', 'F', 'R', 'V'],
                'BAJ': ['B'],
                'AP': ['P']
            };
            
            // PARTE 1: Revisar días con turnos asignados
            Object.keys(App.data.schedule).forEach(date => {
                const daySched = App.data.schedule[date];
                Object.keys(daySched).forEach(empId => {
                    const shiftId = daySched[empId];
                    const shift = Utils.getShift(shiftId);
                    const req = Utils.getRequest(empId, date);
                    const emp = App.data.empleados.find(e=>e.id===empId);
                    
                    if(!req || !emp) return; // Sin solicitud o empleado no encontrado
                    
                    // CASO 1: Solicitud PENDIENTE con turno asignado
                    // → Alertar solo para tipos que requieren día completo (no HRL)
                    if(req.status === 'pending' && req.type !== 'HRL') {
                        alerts.push({
                            title: `⏳ Petición pendiente con turno asignado`,
                            desc: `${emp.nombre} ha solicitado ${req.type} para ${Utils.formatDateES(date)} pero tiene turno "${shift?.code || '?'}". Necesita aprobación/rechazo.`,
                            date: date,
                            empName: emp ? emp.nombre : ""
                        });
                        return;
                    }
                    
                    // CASO 2: Solicitud APROBADA con turno NO permitido
                    // → Alertar solo si el turno no está en la lista de permitidos
                    if(req.status === 'approved') {
                        if(!shift || !shift.code) return;

                        // HRL: alerta si el turno se solapa con el tramo pedido libre
                        if(req.type === 'HRL') {
                            if(shift.fixed) return; // L, F, V, R, B → libre → OK
                            if(!shift.start || !shift.end) return;
                            // Solapamiento: turno empieza antes de que acaben las horas libres
                            // Y turno acaba después de que empiecen las horas libres
                            const getMin = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
                            const tS = getMin(shift.start), tE = getMin(shift.end);
                            const fS = getMin(req.hrlFrom),  fE = getMin(req.hrlTo);
                            const solapa = tS < fE && tE > fS;
                            if(solapa) {
                                alerts.push({
                                    title: `⏰ Turno solapa con horas libres aprobadas`,
                                    desc: `${emp.nombre} tiene horas libres aprobadas de ${req.hrlFrom}–${req.hrlTo} el ${Utils.formatDateES(date)}, pero su turno (${shift.start}–${shift.end}) se solapa con ese tramo.`,
                                    date: date
                                });
                            }
                            return;
                        }

                        const allowed = allowedShifts[req.type] || [];
                        if(!allowed.includes(shift.code)) {
                            const allowedList = allowed.join(', ');
                            alerts.push({
                                title: `🔒 Turno incompatible con ${req.type} aprobada`,
                                desc: `${emp.nombre} tiene ${req.type} aprobada el ${Utils.formatDateES(date)} pero su turno es "${shift.code}". Turnos permitidos: ${allowedList}.`,
                                date: date,
                                empName: emp ? emp.nombre : ""
                            });
                        }
                    }
                    
                    // CASO 3: Solicitud RECHAZADA → No alertar
                    // (Si está rechazada, cualquier turno asignado es válido)
                });
            });
            
            // PARTE 2: Revisar solicitudes pendientes SIN turno asignado
            // (Necesitan respuesta del manager)
            App.data.requests.filter(r => r.status === 'pending').forEach(req => {
                const emp = App.data.empleados.find(e => e.id === req.empId);
                if(!emp) return;
                
                // Verificar si hay al menos un día en el rango sin turno
                let currentDate = new Date(req.start);
                const endDate = new Date(req.end);
                let hasAtLeastOneDayWithoutShift = false;
                
                while(currentDate <= endDate) {
                    const dateStr = currentDate.toISOString().split('T')[0];
                    
                    if(!App.data.schedule[dateStr] || !App.data.schedule[dateStr][req.empId]) {
                        hasAtLeastOneDayWithoutShift = true;
                        break; // Ya encontramos uno, no necesitamos seguir
                    }
                    
                    currentDate.setDate(currentDate.getDate() + 1);
                }
                
                // Si hay días sin turno, alertar sobre la petición pendiente
                // (Los días CON turno ya generaron alerta arriba)
                if(hasAtLeastOneDayWithoutShift) {
                    const numDays = Math.floor((new Date(req.end) - new Date(req.start)) / (1000 * 60 * 60 * 24)) + 1;
                    const hrlInfo = req.type === 'HRL' ? ` (horas libres ${req.hrlFrom}–${req.hrlTo})` : ` (${numDays} día${numDays !== 1 ? 's' : ''}: ${Utils.formatDateES(req.start)} → ${Utils.formatDateES(req.end)})`;
                    alerts.push({
                        title: `📋 Petición pendiente de responder`,
                        desc: `${emp.nombre} ha solicitado ${req.type}${hrlInfo} el ${req.type === 'HRL' ? Utils.formatDateES(req.start) : ''}. Estado: Pendiente de aprobación.`,
                        date: req.start,
                        empName: emp ? emp.nombre : ""
                    });
                }
            });
            
            // PARTE 3: L asignada en día festivo de tienda
            // → El empleado libra ese día pero como libranza, no como festivo. Hay que cambiarlo a F.
            const holidayDates = new Set((App.data.storeConfig.holidays || []).map(h => h.date));
            Object.keys(App.data.schedule).forEach(date => {
                if(!holidayDates.has(date)) return;
                const holiday = App.data.storeConfig.holidays.find(h => h.date === date);
                const daySched = App.data.schedule[date];
                Object.keys(daySched).forEach(empId => {
                    const shift = Utils.getShift(daySched[empId]);
                    const emp   = App.data.empleados.find(e => e.id === empId);
                    if(!emp || !shift) return;
                    if(shift.fixed && shift.code === 'L') {
                        alerts.push({
                            title: `📅 L en día festivo — debería ser F`,
                            desc: `${emp.nombre} tiene L el ${Utils.formatDateES(date)} (${holiday?.note || 'festivo'}). Cámbialo por F para registrar correctamente el festivo y evitar errores en el módulo de recuperaciones.`,
                            date: date
                        });
                    }
                });
            });

            // PARTE 4: Cobertura de llaves en días cerrados
            const hasLlaves = App.data.config.llavesActivo && App.data.config.llaves && App.data.config.llaves.length > 0;
            const hasKeyHolders = App.data.config.llavesActivo && App.data.empleados.some(e => e.llaveId);
            if(hasLlaves || hasKeyHolders) {
                const _hoy = new Date(); _hoy.setHours(0,0,0,0);
                const _limite = new Date(_hoy); _limite.setDate(_limite.getDate() + 21);
                const lockedDays = App.data.lockedDays || {};
                Object.keys(lockedDays).filter(d => {
                    if(!lockedDays[d]) return false;
                    const t = new Date(d + 'T12:00:00');
                    return t >= _hoy && t <= _limite;
                }).sort().forEach(date => {
                    const cov = App.logic._checkKeysCoverageDay(date);
                    if(!cov) return; // día cerrado de tienda
                    if(!cov.hasApertura) {
                        alerts.push({
                            title: `🔑 Apertura sin llave — ${Utils.formatDateES(date)}`,
                            desc: `Ningún portador de llave empieza a las ${cov.horario.open} (apertura de tienda). Asigna un turno compatible a alguien con llave o reasigna una llave.`,
                            date: date
                        });
                    }
                    if(!cov.hasCierre) {
                        alerts.push({
                            title: `🔑 Cierre sin llave — ${Utils.formatDateES(date)}`,
                            desc: `Ningún portador de llave termina a las ${cov.horario.close} (cierre de tienda). Asigna un turno compatible a alguien con llave o reasigna una llave.`,
                            date: date
                        });
                    }
                });
            }

            // PARTE 5: Detección de traspasos de llaves necesarios — DESACTIVADA
            // El usuario gestiona traspasos manualmente desde el inspector de llaves.
            // Las alertas de cobertura apertura/cierre (PARTE 4) ya cubren lo necesario.

            // PARTE 6: Alertas de cobertura y jornada en días CERRADOS (lockedDays)
            try {
                const locked6 = App.data.lockedDays || {};
                const todayStr6 = new Date().toISOString().slice(0, 10);
                const lockedDates6 = Object.keys(locked6).filter(d => locked6[d] && d >= todayStr6).sort();
                const toMin = t => { if (!t) return 0; const p = t.split(':'); return Number(p[0]) * 60 + Number(p[1]); };

                const getWorkShift6 = (empId, date) => {
                    const sv = (App.data.schedule[date] || {})[empId];
                    if (!sv) return null;
                    const sh = Utils.getShift(sv);
                    if (!sh || sh.fixed || !sh.start || !sh.end) return null;
                    return sh;
                };

                for (let di = 0; di < lockedDates6.length; di++) {
                    const date = lockedDates6[di];
                    const horario = App.logic._getHorarioDelDia(date);
                    if (!horario || horario.closed) continue;

                    const activeEmps = App.data.empleados.filter(e => e.active !== false);

                    // Recopilar turnos de trabajo de este día
                    const working = [];
                    for (let ei = 0; ei < activeEmps.length; ei++) {
                        const emp = activeEmps[ei];
                        const sh = getWorkShift6(emp.id, date);
                        if (!sh) continue;
                        const brkS = sh.breakStart ? toMin(sh.breakStart) : -1;
                        const brkE = sh.breakEnd ? toMin(sh.breakEnd) : -1;
                        working.push({ empId: emp.id, emp, shift: sh, startMin: toMin(sh.start), endMin: toMin(sh.end), brkS, brkE });
                    }

                    const storeOpen = toMin(horario.open);
                    const storeClose = toMin(horario.close);

                    // Checker: cuántos de una lista cubren minuto m (excluyendo descansos)
                    const countAt = (list, m) => {
                        let n = 0;
                        for (let i = 0; i < list.length; i++) {
                            let wEnd = list[i].endMin;
                            if (wEnd <= list[i].startMin) wEnd += 24 * 60;
                            if (list[i].startMin <= m && wEnd > m) {
                                // Excluir si está en descanso
                                if (list[i].brkS >= 0 && list[i].brkE >= 0 && m >= list[i].brkS && m < list[i].brkE) continue;
                                n++;
                            }
                        }
                        return n;
                    };

                    // 6A: Tramo sin TAG3
                    const tag3Working = working.filter(w => ['MNG', 'AM', 'SPV'].includes(Utils.getRolEnFecha(w.emp, date)));
                    if (tag3Working.length === 0 && working.length > 0) {
                        alerts.push({
                            title: `👔 Sin TAG3 en todo el día — ${Utils.formatDateES(date)}`,
                            desc: `Ningún responsable (MNG/AM/SPV) trabaja el ${Utils.formatDateES(date)}. La tienda no tiene cobertura de mando.`,
                            date
                        });
                    } else if (tag3Working.length > 0) {
                        for (let m = storeOpen; m < storeClose; m += 30) {
                            if (countAt(tag3Working, m) === 0) {
                                const hh = String(Math.floor(m / 60)).padStart(2, '0');
                                const mm = String(m % 60).padStart(2, '0');
                                alerts.push({
                                    title: `👔 Tramo sin TAG3 — ${Utils.formatDateES(date)}`,
                                    desc: `A las ${hh}:${mm} no hay ningún responsable (MNG/AM/SPV) en tienda. Revisa los turnos del equipo TAG3.`,
                                    date
                                });
                                break;
                            }
                        }
                    }

                    // 6B: Solo 1 persona en algún tramo
                    for (let m = storeOpen; m < storeClose; m += 30) {
                        const c = countAt(working, m);
                        if (c === 1) {
                            const hh = String(Math.floor(m / 60)).padStart(2, '0');
                            const mm = String(m % 60).padStart(2, '0');
                            alerts.push({
                                title: `👤 Solo 1 persona en tienda — ${Utils.formatDateES(date)}`,
                                desc: `A las ${hh}:${mm} solo hay 1 empleado trabajando. Mínimo recomendado: 2 personas en tienda.`,
                                date
                            });
                            break;
                        }
                    }

                    // 6C: Jornada superior a 10 horas
                    for (let wi = 0; wi < working.length; wi++) {
                        const w = working[wi];
                        const hours = Utils.calcHours(w.shift.start, w.shift.end, w.shift.breakStart, w.shift.breakEnd, w.shift.break);
                        if (hours > 10) {
                            alerts.push({
                                title: `⚠️ Jornada excesiva — ${w.emp.nombre}`,
                                desc: `${w.emp.nombre} tiene ${hours.toFixed(1)}h asignadas el ${Utils.formatDateES(date)} (máximo recomendado: 10h).`,
                                date, empName: w.emp.nombre
                            });
                        }
                    }

                    // 6D: Descanso mínimo 12h respecto al día anterior
                    const prevDate6 = new Date(date + 'T12:00:00');
                    prevDate6.setDate(prevDate6.getDate() - 1);
                    const prevStr6 = prevDate6.toISOString().slice(0, 10);

                    for (let wi = 0; wi < working.length; wi++) {
                        const w = working[wi];
                        const prevShift = getWorkShift6(w.empId, prevStr6);
                        if (!prevShift) continue;
                        const prevEnd = toMin(prevShift.end);
                        const todayStart = toMin(w.shift.start);
                        const rest = todayStart + 24 * 60 - prevEnd;
                        if (rest < 12 * 60) {
                            const restH = (rest / 60).toFixed(1);
                            alerts.push({
                                title: `🛌 Descanso insuficiente — ${w.emp.nombre}`,
                                desc: `${w.emp.nombre} solo descansa ${restH}h entre el ${Utils.formatDateES(prevStr6)} (fin ${prevShift.end}) y el ${Utils.formatDateES(date)} (inicio ${w.shift.start}). Mínimo: 12h.`,
                                date, empName: w.emp.nombre
                            });
                        }
                    }
                }
            } catch(err6) {
                console.error('[Alertas P6] Error en alertas de cobertura/jornada:', err6);
            }

            return alerts;
        },
        checkAlerts: function() {
            const allAlerts = this.getAlerts();
            const dismissed = App.data.dismissedAlerts || [];
            // Auto-limpiar claves descartadas cuya alerta ya no existe
            const activeKeys = new Set(allAlerts.map(a => a.title + '||' + (a.date || '')));
            App.data.dismissedAlerts = dismissed.filter(k => activeKeys.has(k));
            const al = allAlerts.filter(a => !App.data.dismissedAlerts.includes(a.title + '||' + (a.date || '')));
            const btn = document.getElementById('nav-alerts');
            if(btn) { if(al.length > 0) btn.classList.add('has-alerts'); else btn.classList.remove('has-alerts'); }
        },

        dismissAlert: function(key) {
            if(!App.data.dismissedAlerts) App.data.dismissedAlerts = [];
            if(!App.data.dismissedAlerts.includes(key)) App.data.dismissedAlerts.push(key);
            Safe.save('v40_db', App.data);
            this.checkAlerts();
            const c = document.querySelector('.main-scroll');
            if(c) App.ui.renderAlerts(c);
        },
        massClearDay: function() {
            if(!confirm("⚠️ VACIAR DÍA\n\n¿Seguro que quieres BORRAR TODOS los turnos del día actual?\n\nEsta acción no se puede deshacer.")) return;
            const date = App.uiState.currentDate;
            if(App.data.schedule[date]) { 
                delete App.data.schedule[date]; 
            }
            Safe.save('v40_db', App.data); 
            App.ui.renderPlanner(document.getElementById('main-view')); 
            App.ui.renderPlannerInspector(document.getElementById('inspector-content')); 
            App.logic.checkAlerts();
            alert("✅ Día vaciado correctamente.");
        },
        massFillDay: function(targetDate) {
            const date = targetDate || App.uiState.currentDate;
            const dayKey = Utils.getDayKey(date);
            const holiday = App.data.storeConfig.holidays.find(h => h.date === date);
            const dayConfig = holiday ? App.data.storeConfig.base["Festivo"] : (App.data.storeConfig.base[dayKey] || {open:"10:00", close:"22:00", closed:false});
            const exception = App.data.storeConfig.special.find(s => s.date === date);
            const finalConfig = exception || dayConfig;
            if(finalConfig.closed) {
                if(!targetDate) alert("⚠️ La tienda está cerrada este día.");
                return 0; 
            }
            if(!App.data.schedule[date]) App.data.schedule[date] = {};
            let count = 0;
            App.data.empleados.forEach(e => {
                if(!e.active) return;
                if(App.data.schedule[date][e.id]) return;
                const req = Utils.getRequest(e.id, date);
                if(req && req.status === 'approved') return;
                const best = App.logic.getSmartShift(e, finalConfig);
                if(best) { App.data.schedule[date][e.id] = best.id; count++; }
            });
            if(!targetDate) {
                Safe.save('v40_db', App.data); 
                App.ui.renderPlanner(document.getElementById('main-view')); 
                App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
                App.logic.checkAlerts();
                alert(`✅ Día rellenado.\n\nSe han asignado ${count} turnos según las preferencias de cada empleado.`);
            }
            return count;
        },
        massFillWeek: function() {
            if(!confirm("🪄 RELLENAR SEMANA\n\nEsto rellenará los huecos vacíos de toda la semana actual usando las preferencias de cada empleado.\n\n¿Continuar?")) return;
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let total = 0;
            days.forEach(d => { total += this.massFillDay(d); });
            Safe.save('v40_db', App.data); 
            App.ui.renderPlanner(document.getElementById('main-view')); 
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
            alert(`✅ Semana completada.\n\nSe han asignado ${total} turnos en total según las preferencias de cada empleado.`);
        },
        massClearWeek: function() {
            // PRIMERA CONFIRMACIÓN
            if(!confirm("⚠️ VACIAR SEMANA COMPLETA\n\n¡ATENCIÓN! Vas a borrar TODOS los turnos de los 7 días de la semana actual.\n\nEsta acción es IRREVERSIBLE.\n\n¿Estás seguro de que quieres continuar?")) return;
            
            // SEGUNDA CONFIRMACIÓN
            if(!confirm("🛑 ÚLTIMA ADVERTENCIA\n\nEstás a punto de ELIMINAR TODOS los turnos de la semana.\n\nTodos los empleados quedarán sin asignaciones para esta semana.\n\n¿Confirmas que quieres VACIAR LA SEMANA COMPLETA?")) return;
            
            const monday = Utils.getMonday(App.uiState.currentDate);
            const days = Utils.getWeekDays(monday);
            let deletedDays = 0;
            
            days.forEach(d => {
                if(App.data.schedule[d]) {
                    delete App.data.schedule[d];
                    deletedDays++;
                }
            });
            
            Safe.save('v40_db', App.data); 
            App.ui.renderPlanner(document.getElementById('main-view')); 
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
            
            alert(`✅ Semana vaciada.\n\nSe han eliminado los turnos de ${deletedDays} día(s).`);
        },
        massClearAll: function() {
            
            // PRIMERA CONFIRMACIÓN
            if(!confirm("🚨 BORRAR TODO EL PLANIFICADOR 🚨\n\n¡PELIGRO EXTREMO!\n\nEstás a punto de ELIMINAR TODAS LAS PLANIFICACIONES de TODAS las semanas, TODOS los días, TODOS los empleados.\n\nSE PERDERÁ TODO EL TRABAJO REALIZADO.\n\nEsta acción NO SE PUEDE DESHACER.\n\n¿Realmente quieres continuar?")) return;
            
            // SEGUNDA CONFIRMACIÓN (más dramática)
            if(!confirm("🛑 CONFIRMACIÓN FINAL 🛑\n\nÚLTIMA OPORTUNIDAD PARA CANCELAR.\n\nSi continúas, SE BORRARÁ PERMANENTEMENTE:\n- Todas las semanas planificadas\n- Todos los turnos asignados\n- Todo el historial de planificaciones\n\nEsto NO AFECTARÁ a:\n✓ Empleados\n✓ Catálogo de turnos\n✓ Solicitudes\n✓ Configuración de tienda\n\n¿CONFIRMAS QUE QUIERES BORRAR TODO EL PLANIFICADOR?")) return;
            
            const totalDays = Object.keys(App.data.schedule).length;
            
            // Backup preventivo
            if (App.data.config?.backups?.preventivo?.vaciarPlanner !== false) App.drive.savePreventivo('VACIAR');

            // Borrar todo el schedule
            App.data.schedule = {};
            
            Safe.save('v40_db', App.data); 
            App.ui.renderPlanner(document.getElementById('main-view')); 
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
            
            alert(`✅ Planificador completamente vaciado.\n\nSe han eliminado ${totalDays} día(s) de planificaciones.\n\nPuedes empezar de cero.`);
        },
        factoryReset: function() {
            if(!confirm("⚠️ RESTABLECIMIENTO DE FÁBRICA ⚠️\n\nEsto borrará ABSOLUTAMENTE TODO:\n- Empleados\n- Turnos\n- Configuración y Festivos\n- Solicitudes\n- Cuadrante de turnos\n\nLa app quedará como recién instalada. ¿Estás completamente seguro?")) return;
            
            if(!confirm("🛑 ÚLTIMA CONFIRMACIÓN\n\nSi no has exportado un backup, perderás todos los datos para siempre.\n\n¿Proceder con el borrado total?")) return;

            // Backup preventivo (síncrono en lo posible — se lanza antes del borrado)
            if (App.data.config?.backups?.preventivo?.reset !== false) App.drive.savePreventivo('RESET');
            
            // Limpiar el caché en memoria de Safe ANTES de borrar localStorage,
            // para que el listener de beforeunload no restaure los datos al hacer flush.
            if(Safe._timers['v40_db']) {
                clearTimeout(Safe._timers['v40_db']);
                Safe._timers['v40_db'] = null;
            }
            delete Safe._latest['v40_db'];
            
            localStorage.removeItem('v40_db');
            alert("✅ Datos borrados. La aplicación se reiniciará ahora.");
            location.reload();
        },
        calcCoverage: function(date, minute) {
            let total = 0; let tag3 = 0;
            const assignments = App.data.schedule[date] || {};
            Object.keys(assignments).forEach(empId => {
                const shiftId = assignments[empId];
                const shift = Utils.getShift(shiftId);
                const emp = App.data.empleados.find(e => e.id === empId);
                if(shift && shift.start && shift.end && !shift.external) {
                    const [h1, m1] = shift.start.split(':').map(Number); const [h2, m2] = shift.end.split(':').map(Number);
                    const startMin = h1*60 + m1; const endMin = h2*60 + m2;
                    let isWorking = (minute >= startMin && minute < endMin);
                    if(isWorking && shift.breakStart && shift.breakEnd) {
                        const [bh1, bm1] = shift.breakStart.split(':').map(Number); const [bh2, bm2] = shift.breakEnd.split(':').map(Number);
                        if(minute >= (bh1*60+bm1) && minute < (bh2*60+bm2)) isWorking = false;
                    }
                    if(isWorking) { total++; if(emp && (['MNG','AM','SPV'].includes(Utils.getRolEnFecha(emp, date)) )) tag3++; }
                }
            });
            return { total, tag3 };
        },
        
        calcConsecutiveWorkDays: function(empId, mondayStr) {
            // Calcula cuántos días consecutivos ha trabajado el empleado
            // INCLUYENDO días de la semana actual que ya tienen turno
            
            let consecutiveDays = 0;
            
            // PARTE 1: Contar hacia atrás ANTES del lunes
            const monday = new Date(mondayStr);
            let currentDate = new Date(monday);
            currentDate.setDate(currentDate.getDate() - 1); // Domingo previo
            
            const maxDaysToCheck = 30; // Límite de seguridad
            let daysChecked = 0;
            
            // Ir hacia atrás contando días trabajados consecutivos
            while(daysChecked < maxDaysToCheck) {
                const dateStr = currentDate.toISOString().split('T')[0];
                
                // Si no hay schedule para esta fecha, parar
                if(!App.data.schedule[dateStr]) {
                    break;
                }
                
                const shiftId = App.data.schedule[dateStr][empId];
                
                // Si no tiene turno asignado, parar
                if(!shiftId) {
                    break;
                }
                
                const shift = Utils.getShift(shiftId);
                
                // Si no existe el turno, parar
                if(!shift) {
                    break;
                }
                
                // Si es turno fijo (L, F, R, V, B, P) → día libre, parar
                if(shift.fixed) {
                    break;
                }
                
                // Si es turno de trabajo (con horas) → contar
                if(shift.start && shift.end) {
                    consecutiveDays++;
                } else {
                    // Turno sin horas (raro) → parar
                    break;
                }
                
                // Retroceder un día
                currentDate.setDate(currentDate.getDate() - 1);
                daysChecked++;
            }
            
            // PARTE 2: Contar hacia adelante EN la semana actual
            const weekDays = Utils.getWeekDays(mondayStr);
            
            for(let i = 0; i < weekDays.length; i++) {
                const dateStr = weekDays[i];
                
                // Si no hay schedule para este día, parar
                if(!App.data.schedule[dateStr]) {
                    break;
                }
                
                const shiftId = App.data.schedule[dateStr][empId];
                
                // Si no tiene turno asignado, parar
                if(!shiftId) {
                    break;
                }
                
                const shift = Utils.getShift(shiftId);
                
                // Si no existe el turno, parar
                if(!shift) {
                    break;
                }
                
                // Si es turno fijo (L, F, R, V, B, P) → día libre, parar
                if(shift.fixed) {
                    break;
                }
                
                // Si es turno de trabajo (con horas) → contar
                if(shift.start && shift.end) {
                    consecutiveDays++;
                } else {
                    // Turno sin horas → parar
                    break;
                }
            }
            
            return consecutiveDays;
        },
        
        // SHIFTS LOGIC

        // ═══════════════════════════════════════════════════════════
        // REPLICADOR DE SEMANAS
        // ═══════════════════════════════════════════════════════════

        openReplicator: function() {
            const empId = App.uiState.individualEmpId;
            const emp = App.data.empleados.find(e => e.id === empId);
            if(!emp) return;

            const monday = Utils.getMonday(App.uiState.currentDate);
            const weekDays = Utils.getWeekDays(monday);
            const weekCode = Utils.getWeekCode(monday);

            // Resumen compacto del origen
            const dayLabels = ['L','M','X','J','V','S','D'];
            const originSummary = weekDays.map((d, i) => {
                const sid = (App.data.schedule[d] || {})[empId];
                const sh = sid ? Utils.getShift(sid) : null;
                const code = sh ? (sh.code || (sh.start ? sh.start.substring(0,5) : '—')) : '—';
                return `${dayLabels[i]}:${code}`;
            }).join(' · ');

            // Rango por defecto: siguiente semana + 4
            const saved = App.uiState.replicatorRange;
            const _localISO = (d) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
            const _addWeeks = (mon, n) => { const d = new Date(mon); d.setDate(d.getDate() + n * 7); return _localISO(d); };
            const defaultStart = saved?.startWeek || _addWeeks(monday, 1);
            const defaultEnd = saved?.endWeek || _addWeeks(monday, 4);

            // Week options para dropdowns
            const weekOpts = App.logic.getWeekOptions(monday);

            // Build modal
            // Mini tabla del origen
            const dayNamesShort = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];
            let originTableRows = '';
            weekDays.forEach((d, i) => {
                const sid = (App.data.schedule[d] || {})[empId];
                const sh = sid ? Utils.getShift(sid) : null;
                const dayNum = d.split('-')[2];
                let horario = '<span style="color:#cbd5e1;">—</span>';
                let horarioColor = '';
                if(sh) {
                    if(sh.fixed) {
                        horario = `<span style="color:${sh.color}; font-weight:700;">${sh.code}</span>`;
                    } else if(sh.start && sh.end) {
                        horarioColor = `color:${sh.color || '#6b7280'}; font-weight:600;`;
                        horario = `${sh.start.substring(0,5)}-${sh.end.substring(0,5)}`;
                    }
                }
                // Tinte de ausencia
                let rowBg = '';
                if(sh && sh.fixed) {
                    if(sh.code === 'V') rowBg = 'background:#f3e8ff;';
                    else if(['L','F','R','DH'].includes(sh.code)) rowBg = 'background:#dcfce7;';
                    else if(['B','P'].includes(sh.code)) rowBg = 'background:#fee2e2;';
                }
                originTableRows += `<tr style="${rowBg}">
                    <td style="padding:3px 8px; font-weight:700; font-size:0.72rem;">${dayNamesShort[i]} <span style="font-weight:400; color:var(--text-muted);">${dayNum}</span></td>
                    <td style="padding:3px 8px; text-align:center; font-size:0.72rem; ${horarioColor}">${horario}</td>
                </tr>`;
            });

            let overlay = document.getElementById('replicator-overlay');
            if(!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'replicator-overlay';
                overlay.className = 'modal-overlay';
                document.body.appendChild(overlay);
            }

            overlay.innerHTML = `
            <div class="modal" style="width:750px; max-width:95%; max-height:90vh; overflow-y:auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                    <h3 style="margin:0;">🔁 Replicar Semana</h3>
                    <button onclick="document.getElementById('replicator-overlay').classList.remove('open')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✕</button>
                </div>

                <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-bottom:15px;">
                    <!-- COLUMNA IZQUIERDA: Origen + Preview -->
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div style="padding:10px; background:#f0f9ff; border-radius:6px; border-left:3px solid #3b82f6;">
                            <div style="font-weight:700; font-size:0.78rem; margin-bottom:6px;">ORIGEN: ${weekCode} · ${emp.nombre}</div>
                            <table style="width:100%; border-collapse:collapse; font-size:0.75rem;">
                                ${originTableRows}
                            </table>
                        </div>

                        <div>
                            <div style="font-weight:700; font-size:0.8rem; margin-bottom:6px; color:#334155;">Vista previa</div>
                            <div id="rep-preview" style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; background:white;">
                                <div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.75rem;">Calculando...</div>
                            </div>
                            <div id="rep-summary" style="padding:6px 10px; background:#f8fafc; border-radius:0 0 6px 6px; font-size:0.73rem; font-weight:600; text-align:center; color:#475569; border:1px solid var(--border); border-top:none;"></div>
                        </div>
                    </div>

                    <!-- COLUMNA DERECHA: Destino + Opciones -->
                    <div style="display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <div style="font-weight:700; font-size:0.8rem; margin-bottom:6px; color:#334155;">Destino</div>
                            <div style="display:flex; flex-direction:column; gap:10px; padding:12px; background:#f8fafc; border-radius:6px; border:1px solid var(--border);">
                                <label style="display:flex; align-items:flex-start; gap:8px; font-size:0.78rem; cursor:pointer;">
                                    <input type="radio" name="rep-mode" value="range" checked onchange="App.logic._repModeChanged()" style="margin-top:3px;">
                                    <div style="flex:1;">
                                        <div style="font-weight:600; margin-bottom:6px;">Rango de semanas</div>
                                        <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                            <span style="font-size:0.7rem; color:var(--text-muted); min-width:38px;">Desde</span>
                                            <select id="rep-start" onchange="App.logic._repPreviewUpdate()" style="flex:1; padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-size:0.72rem;">${weekOpts}</select>
                                        </div>
                                        <div style="display:flex; align-items:center; gap:6px;">
                                            <span style="font-size:0.7rem; color:var(--text-muted); min-width:38px;">Hasta</span>
                                            <select id="rep-end" onchange="App.logic._repPreviewUpdate()" style="flex:1; padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-size:0.72rem;">${weekOpts}</select>
                                        </div>
                                    </div>
                                </label>
                                <div style="height:1px; background:var(--border);"></div>
                                <label style="display:flex; align-items:center; gap:8px; font-size:0.78rem; cursor:pointer;">
                                    <input type="radio" name="rep-mode" value="count" onchange="App.logic._repModeChanged()">
                                    <span style="font-weight:600;">Nº semanas:</span>
                                    <input type="number" id="rep-count" min="1" max="52" value="4" onchange="App.logic._repPreviewUpdate()" style="width:55px; padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-size:0.75rem;" disabled>
                                </label>
                            </div>
                        </div>

                        <div>
                            <div style="font-weight:700; font-size:0.8rem; margin-bottom:6px; color:#334155;">Opciones</div>
                            <div style="display:flex; flex-direction:column; gap:8px; padding:12px; background:#f8fafc; border-radius:6px; border:1px solid var(--border); font-size:0.75rem;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                    <input type="checkbox" id="rep-opt-locked" checked> Respetar días bloqueados (🔒)
                                </label>
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                    <input type="checkbox" id="rep-opt-vac" checked> No sobreescribir vacaciones (V)
                                </label>
                                <div style="margin-top:2px; padding-top:8px; border-top:1px solid var(--border);">
                                    <div style="font-weight:600; margin-bottom:6px;">En días festivos:</div>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:4px;">
                                        <input type="radio" name="rep-festivo" value="keep" checked> Respetar turnos
                                    </label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer; margin-bottom:4px;">
                                        <input type="radio" name="rep-festivo" value="setF"> Poner F en festivos
                                    </label>
                                    <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                        <input type="radio" name="rep-festivo" value="skip"> No tocar festivos
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div style="display:flex; gap:10px;">
                    <button class="btn" style="flex:1; background:#f1f5f9; color:#64748b;" onclick="document.getElementById('replicator-overlay').classList.remove('open')">Cancelar</button>
                    <button class="btn btn-primary" id="rep-execute-btn" style="flex:2;" onclick="App.logic.executeReplicate()">🔁 Replicar</button>
                </div>
            </div>`;

            // Set correct selected values in dropdowns
            overlay.classList.add('open');
            const startSel = document.getElementById('rep-start');
            const endSel = document.getElementById('rep-end');
            if(startSel) startSel.value = defaultStart;
            if(endSel) endSel.value = defaultEnd;

            // Initial preview
            setTimeout(() => App.logic._repPreviewUpdate(), 50);
        },

        _repModeChanged: function() {
            const mode = document.querySelector('input[name="rep-mode"]:checked')?.value;
            document.getElementById('rep-start').disabled = (mode !== 'range');
            document.getElementById('rep-end').disabled = (mode !== 'range');
            document.getElementById('rep-count').disabled = (mode !== 'count');
            App.logic._repPreviewUpdate();
        },

        _repGetDestWeeks: function() {
            const mode = document.querySelector('input[name="rep-mode"]:checked')?.value;
            const monday = Utils.getMonday(App.uiState.currentDate);
            const _localISO = (d) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };
            let weeks = [];

            if(mode === 'range') {
                const start = document.getElementById('rep-start')?.value;
                const end = document.getElementById('rep-end')?.value;
                if(!start || !end || start > end) return [];
                let cur = new Date(start);
                const endD = new Date(end);
                while(cur <= endD) {
                    const iso = _localISO(cur);
                    if(iso !== monday) weeks.push(iso); // excluir semana origen
                    cur.setDate(cur.getDate() + 7);
                }
            } else {
                const count = parseInt(document.getElementById('rep-count')?.value) || 0;
                for(let i = 1; i <= count; i++) {
                    const d = new Date(monday);
                    d.setDate(d.getDate() + i * 7);
                    weeks.push(_localISO(d));
                }
            }

            // Guardar rango para re-abrir
            if(weeks.length > 0) {
                App.uiState.replicatorRange = { startWeek: weeks[0], endWeek: weeks[weeks.length - 1] };
            }
            return weeks;
        },

        _repScanWeek: function(destMonday, empId) {
            const days = Utils.getWeekDays(destMonday);
            let hasTurnos = 0, hasReqs = 0, hasLocked = 0, hasFestivos = 0;
            let reqDetails = [], turnoDetails = [], festivoDetails = [];

            days.forEach(d => {
                const sid = (App.data.schedule[d] || {})[empId];
                if(sid) { hasTurnos++; const sh = Utils.getShift(sid); turnoDetails.push(sh ? (sh.code || sh.start?.substring(0,5)) : '?'); }
                const req = Utils.getRequest(empId, d);
                if(req && req.status !== 'rejected') { hasReqs++; reqDetails.push(`${req.type} ${Utils.getDayName(d)}`); }
                if(App.data.lockedDays && App.data.lockedDays[d]) hasLocked++;
                const hol = App.data.storeConfig.holidays.find(h => h.date === d);
                if(hol) { hasFestivos++; festivoDetails.push(hol.name || 'Festivo'); }
            });

            const allLocked = hasLocked === 7;
            return { destMonday, hasTurnos, hasReqs, hasLocked, allLocked, hasFestivos, reqDetails, turnoDetails, festivoDetails };
        },

        _repPreviewUpdate: function() {
            const empId = App.uiState.individualEmpId;
            const weeks = App.logic._repGetDestWeeks();
            const container = document.getElementById('rep-preview');
            const summary = document.getElementById('rep-summary');
            const btn = document.getElementById('rep-execute-btn');
            if(!container) return;

            if(weeks.length === 0) {
                container.innerHTML = `<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.75rem;">Selecciona un rango válido</div>`;
                if(summary) summary.textContent = '';
                if(btn) btn.textContent = '🔁 Replicar';
                return;
            }

            const scans = weeks.map(w => App.logic._repScanWeek(w, empId));
            let libre = 0, conflictos = 0, bloqueadas = 0;

            let html = '';
            scans.forEach(s => {
                const wc = Utils.getWeekCode(s.destMonday);
                if(s.allLocked) {
                    bloqueadas++;
                    html += `<div style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f1f5f9; font-size:0.73rem; color:#94a3b8;">
                        <span>🔒</span> <span style="font-weight:600;">${wc}</span> <span>Semana bloqueada — se salta</span>
                    </div>`;
                } else if(s.hasTurnos === 0 && s.hasReqs === 0) {
                    libre++;
                    html += `<div style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f1f5f9; font-size:0.73rem; color:#10b981;">
                        <span>✅</span> <span style="font-weight:600;">${wc}</span> <span>Libre</span>
                        ${s.hasFestivos ? `<span style="margin-left:auto; font-size:0.65rem; background:#ec4899; color:white; padding:1px 5px; border-radius:3px;">${s.hasFestivos} festivo${s.hasFestivos>1?'s':''}</span>` : ''}
                    </div>`;
                } else {
                    conflictos++;
                    let details = [];
                    if(s.hasTurnos) details.push(`${s.hasTurnos} turno${s.hasTurnos>1?'s':''}`);
                    if(s.hasReqs) details.push(`${s.hasReqs} petición: ${s.reqDetails.join(', ')}`);
                    html += `<div onclick="App.logic._repGoToWeek('${s.destMonday}')" style="display:flex; align-items:center; gap:8px; padding:6px 10px; border-bottom:1px solid #f1f5f9; font-size:0.73rem; color:#f59e0b; cursor:pointer; transition:background 0.1s;" onmouseover="this.style.background='#fef3c7'" onmouseout="this.style.background=''">
                        <span>⚠️</span> <span style="font-weight:600;">${wc}</span> <span>${details.join(' · ')}</span>
                        ${s.hasFestivos ? `<span style="margin-left:auto; font-size:0.65rem; background:#ec4899; color:white; padding:1px 5px; border-radius:3px;">${s.hasFestivos}F</span>` : ''}
                        <span style="margin-left:auto; font-size:0.65rem; color:#3b82f6;">→ ir</span>
                    </div>`;
                }
            });

            container.innerHTML = html || `<div style="padding:15px; text-align:center; color:var(--text-muted);">Sin semanas</div>`;

            const total = weeks.length;
            if(summary) summary.innerHTML = `${total} semana${total>1?'s':''} · <span style="color:#10b981;">${libre} libre${libre>1?'s':''}</span>${conflictos ? ` · <span style="color:#f59e0b;">${conflictos} con conflictos</span>` : ''}${bloqueadas ? ` · <span style="color:#94a3b8;">${bloqueadas} bloqueada${bloqueadas>1?'s':''}</span>` : ''}`;
            if(btn) btn.textContent = `🔁 Replicar ${total - bloqueadas} semana${(total-bloqueadas)>1?'s':''}`;
        },

        _repGoToWeek: function(monday) {
            document.getElementById('replicator-overlay')?.classList.remove('open');
            App.uiState.currentDate = monday;
            App.ui.renderPlanner(document.getElementById('main-view'));
        },

        executeReplicate: function() {
            const empId = App.uiState.individualEmpId;
            const emp = App.data.empleados.find(e => e.id === empId);
            if(!emp) return;

            const monday = Utils.getMonday(App.uiState.currentDate);
            const weekDays = Utils.getWeekDays(monday);
            const weeks = App.logic._repGetDestWeeks();
            const scans = weeks.map(w => App.logic._repScanWeek(w, empId));

            // Opciones
            const optLocked = document.getElementById('rep-opt-locked')?.checked;
            const optVac = document.getElementById('rep-opt-vac')?.checked;
            const festivoMode = document.querySelector('input[name="rep-festivo"]:checked')?.value || 'keep';

            const conflicts = scans.filter(s => !s.allLocked && (s.hasTurnos > 0 || s.hasReqs > 0));
            const effectiveWeeks = scans.filter(s => !s.allLocked);

            if(effectiveWeeks.length === 0) {
                alert('No hay semanas disponibles para replicar.');
                return;
            }

            // Primera confirmación si hay conflictos
            if(conflicts.length > 0) {
                const conReqs = conflicts.filter(s => s.hasReqs > 0).length;
                let msg = `⚠️ ATENCIÓN\n\nSe van a sobreescribir turnos en ${conflicts.length} semana${conflicts.length>1?'s':''} que ya tenían datos.`;
                if(conReqs > 0) msg += `\n\nAdemás, ${conReqs} semana${conReqs>1?'s':''} tiene${conReqs>1?'n':''} peticiones activas.`;
                msg += `\n\n¿Deseas continuar?`;
                if(!confirm(msg)) return;
            }

            // Segunda confirmación (escribir REPLICAR)
            const weekCode = Utils.getWeekCode(monday);
            const input = prompt(
                `⚠️ CONFIRMACIÓN FINAL\n\n` +
                `Vas a replicar ${weekCode} de ${emp.nombre} sobre ${effectiveWeeks.length} semanas.\n\n` +
                `Esta acción NO se puede deshacer fácilmente.\n\n` +
                `Escribe REPLICAR para confirmar:`
            );
            if(input !== 'REPLICAR') {
                if(input !== null) alert('Operación cancelada. Debes escribir REPLICAR exactamente.');
                return;
            }

            // Backup preventivo
            if (App.data.config?.backups?.preventivo?.replica !== false) App.drive.savePreventivo('REPLICA');

            // Origen: turnos de la semana actual
            const originShifts = weekDays.map(d => (App.data.schedule[d] || {})[empId] || null);

            // Ejecutar
            let applied = 0, skipped = 0;
            scans.forEach(scan => {
                if(scan.allLocked) { skipped += 7; return; }

                const destDays = Utils.getWeekDays(scan.destMonday);
                destDays.forEach((d, i) => {
                    // Bloqueado
                    if(optLocked && App.data.lockedDays && App.data.lockedDays[d]) { skipped++; return; }

                    // Vacaciones
                    const existingSid = (App.data.schedule[d] || {})[empId];
                    const existingShift = existingSid ? Utils.getShift(existingSid) : null;
                    if(optVac && existingShift && existingShift.fixed && existingShift.code === 'V') { skipped++; return; }

                    // Festivos
                    const isFestivo = App.data.storeConfig.holidays.some(h => h.date === d);
                    if(isFestivo) {
                        if(festivoMode === 'skip') { skipped++; return; }
                        if(festivoMode === 'setF') {
                            if(!App.data.schedule[d]) App.data.schedule[d] = {};
                            App.data.schedule[d][empId] = 'fixed_F';
                            applied++;
                            return;
                        }
                        // 'keep' → cae al flujo normal
                    }

                    // Aplicar turno del origen
                    if(!App.data.schedule[d]) App.data.schedule[d] = {};
                    if(originShifts[i]) {
                        App.data.schedule[d][empId] = originShifts[i];
                    } else {
                        delete App.data.schedule[d][empId];
                    }
                    applied++;
                });
            });

            App.logic.saveSnapshot(`Replicar ${weekCode} × ${effectiveWeeks.length} semanas`);
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();

            document.getElementById('replicator-overlay')?.classList.remove('open');

            alert(`✅ Replicado: ${applied} turnos aplicados en ${effectiveWeeks.length} semanas.\n${skipped > 0 ? `⏭️ ${skipped} día(s) saltados por opciones de protección.` : ''}`);

            // Navegar a la primera semana destino
            if(weeks.length > 0) {
                App.uiState.currentDate = weeks[0];
            }
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
});
