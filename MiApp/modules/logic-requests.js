// ============================================================
// LÓGICA: Solicitudes, días especiales, equilibrio
// ============================================================

Object.assign(App.logic, {
        reqNewForDate: function(date, type) {
            // Abrir inspector de nueva solicitud pre-rellenada con fecha y tipo
            App.uiState.selectedId = null;
            App.ui.renderReqInspector(null);
            // Pre-rellenar fecha y tipo tras render
            setTimeout(() => {
                const typeEl  = document.getElementById('rq-type');
                const startEl = document.getElementById('rq-start');
                if(typeEl) { typeEl.value = type; App.ui.reqTypeToggle(type); }
                if(startEl) {
                    // Formatear fecha como DD/MM/AAAA para el input personalizado
                    const [y,m,d] = date.split('-');
                    startEl.value = `${d}/${m}/${y}`;
                    startEl.dataset.isoValue = date;
                    startEl.style.borderColor = '';
                    // Si no es HRL, rellenar también fecha fin igual
                    const endEl = document.getElementById('rq-end');
                    if(endEl) { endEl.value = `${d}/${m}/${y}`; endEl.dataset.isoValue = date; }
                }
            }, 0);
        },
        reqToggleFactorial: function(id) {
            const i = App.data.requests.findIndex(r => r.id === id);
            if(i < 0) return;
            App.data.requests[i].factorialDone = !App.data.requests[i].factorialDone;
            Safe.save('v40_db', App.data);
        },
        reqToggleType: function(t) {
            const ALL = ['VAC','LIB','HRL','AP','BAJ'];
            const cur = App.uiState.reqTypeFilter || ALL;
            // Exclusive select: click type → show only that type; click again if already sole → reset to all
            if(cur.length === 1 && cur[0] === t) {
                App.uiState.reqTypeFilter = ALL;
            } else {
                App.uiState.reqTypeFilter = [t];
            }
            App.ui._reqRefresh();
        },
        reqResetTypeFilter: function() {
            App.uiState.reqTypeFilter = ['VAC','LIB','HRL','AP','BAJ'];
            App.ui._reqRefresh();
        },
        reqSetEmpFilter: function(empId) {
            const cur = App.uiState.reqEmpFilter || 'todos';
            App.uiState.reqEmpFilter = (cur === empId) ? 'todos' : empId;
            App.ui._reqRefresh();
        },
        reqSort: function(key) {
            if(App.uiState.reqSortKey === key) {
                App.uiState.reqSortDir = App.uiState.reqSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                App.uiState.reqSortKey = key;
                App.uiState.reqSortDir = 'asc';
            }
            App.ui._reqRefresh();
        },
        reqToggleArchive: function(id) {
            const i = App.data.requests.findIndex(r => r.id === id);
            if(i < 0) return;
            App.data.requests[i].archived = !App.data.requests[i].archived;
            Safe.save('v40_db', App.data);
            // Si se archiva la seleccionada, deseleccionar
            if(App.data.requests[i].archived && App.uiState.selectedId === id) {
                App.uiState.selectedId = null;
                document.getElementById('inspector-content').innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem;">Selecciona una solicitud o crea una nueva.</p>';
            }
            App.ui._reqRefresh();
        },
        reqSelect: function(id) { App.uiState.selectedId=id; App.ui._reqRefresh(); App.ui.renderReqInspector(id); },

        reqSetStatus: function(id, status) {
            const idx = (App.data.requests || []).findIndex(r => r.id === id);
            if (idx === -1) return;
            this.saveSnapshot('Cambiar estado petición');
            App.data.requests[idx].status = status;
            Safe.save('v40_db', App.data);
            App.ui._reqRefresh();
            App.ui.renderReqInspector(App.uiState.selectedId);
        },
        reqSave: function(id) {
            const startInput = document.getElementById('rq-start');
            const type = document.getElementById('rq-type').value;
            const isHRL = type === 'HRL';

            Utils.handleDateInput(startInput);
            const start = startInput.dataset.isoValue;
            if(!start) { alert('Por favor introduce la fecha en formato DD/MM/AAAA'); return; }

            let end = start; // HRL siempre es un día
            if(!isHRL) {
                const endInput = document.getElementById('rq-end');
                Utils.handleDateInput(endInput);
                end = endInput.dataset.isoValue;
                if(!end) { alert('Por favor introduce las fechas en formato DD/MM/AAAA'); return; }
            }

            const hrlFrom = isHRL ? (document.getElementById('rq-hrl-from')?.value || '') : '';
            const hrlTo   = isHRL ? (document.getElementById('rq-hrl-to')?.value   || '') : '';
            if(isHRL && (!hrlFrom || !hrlTo)) { alert('Indica el tramo de horas a respetar.'); return; }
            if(isHRL && hrlFrom >= hrlTo) { alert('La hora de inicio del tramo debe ser anterior a la hora de fin.'); return; }

            const existing = id ? App.data.requests.find(x => x.id === id) : null;
            const r = {
                id: id || 'r'+Date.now(),
                empId:  document.getElementById('rq-emp').value,
                type,
                start,
                end,
                hrlFrom,
                hrlTo,
                status: document.getElementById('rq-status').value,
                note:   document.getElementById('rq-note').value,
                // Preservar campos que el inspector no gestiona
                archived:    existing ? (existing.archived || false) : false,
                recurringId: existing ? (existing.recurringId || null) : null
            };
            // Limpiar recurringId si es null para no contaminar objetos nuevos
            if (!r.recurringId) delete r.recurringId;

            if(id) {
                const i = App.data.requests.findIndex(x => x.id === id);
                App.data.requests[i] = r;
            } else {
                App.data.requests.push(r);
            }

            Safe.save('v40_db', App.data);
            App.logic.reqSelect(r.id);
        },
        reqCreateShifts: function(id) {
            const req = App.data.requests.find(r => r.id === id);
            if(!req || req.status !== 'approved') {
                alert('⚠️ La solicitud debe estar aprobada para crear turnos');
                return;
            }
            
            // Mapeo de tipos a turnos por defecto
            const typeToShiftCode = {
                'VAC': 'V',   // Vacaciones
                'LIB': 'L',   // Libre (por defecto, usuario puede cambiar a F, R, V)
                'BAJ': 'B',   // Baja médica
                'AP': 'P'     // Asuntos Propios → Permiso
            };
            
            const shiftCode = typeToShiftCode[req.type];
            if(!shiftCode) {
                alert('⚠️ Tipo de solicitud no reconocido');
                return;
            }
            
            const fixedShift = App.data.fixedShifts.find(s => s.code === shiftCode);
            if(!fixedShift) {
                alert(`⚠️ No se encontró el turno "${shiftCode}"`);
                return;
            }
            
            let currentDate = new Date(req.start);
            const endDate = new Date(req.end);
            let assignedDays = 0;
            let skippedDays = 0;
            
            while(currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                if(!App.data.schedule[dateStr]) App.data.schedule[dateStr] = {};
                
                // Solo crear si no hay turno ya asignado
                if(!App.data.schedule[dateStr][req.empId]) {
                    App.data.schedule[dateStr][req.empId] = fixedShift.id;
                    assignedDays++;
                } else {
                    skippedDays++;
                }
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            Safe.save('v40_db', App.data);
            
            const empName = App.data.empleados.find(e=>e.id===req.empId)?.nombre || 'el empleado';
            let msg = `✅ ${assignedDays} turno${assignedDays !== 1 ? 's' : ''} "${shiftCode}" creado${assignedDays !== 1 ? 's' : ''} para ${empName}`;
            if(skippedDays > 0) {
                msg += `\n\nℹ️ ${skippedDays} día${skippedDays !== 1 ? 's' : ''} ya tenía${skippedDays !== 1 ? 'n' : ''} turno asignado (no modificado${skippedDays !== 1 ? 's' : ''})`;
            }
            
            alert(msg);
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
        },
        reqRemoveShifts: function(id) {
            const req = App.data.requests.find(r => r.id === id);
            if(!req) {
                alert('⚠️ Solicitud no encontrada');
                return;
            }
            
            if(!confirm(`¿Eliminar turnos del planificador para esta solicitud?\n\nRango: ${Utils.formatDateES(req.start)} → ${Utils.formatDateES(req.end)}\n\nEsto NO eliminará la solicitud, solo los turnos asignados.`)) {
                return;
            }
            
            // Mapeo de tipos a turnos
            const typeToShiftCode = {
                'VAC': 'V',
                'LIB': 'L',
                'BAJ': 'B',
                'AP': 'P'
            };
            
            const shiftCode = typeToShiftCode[req.type];
            if(!shiftCode) return;
            
            const fixedShift = App.data.fixedShifts.find(s => s.code === shiftCode);
            if(!fixedShift) return;
            
            let currentDate = new Date(req.start);
            const endDate = new Date(req.end);
            let removedDays = 0;
            
            while(currentDate <= endDate) {
                const dateStr = currentDate.toISOString().split('T')[0];
                if(App.data.schedule[dateStr] && App.data.schedule[dateStr][req.empId] === fixedShift.id) {
                    delete App.data.schedule[dateStr][req.empId];
                    removedDays++;
                }
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            Safe.save('v40_db', App.data);
            
            if(removedDays > 0) {
                alert(`✅ ${removedDays} turno${removedDays !== 1 ? 's' : ''} "${shiftCode}" eliminado${removedDays !== 1 ? 's' : ''} del planificador`);
            } else {
                alert(`ℹ️ No se encontraron turnos "${shiftCode}" para eliminar en el rango especificado`);
            }
            
            App.ui.renderPlanner(document.getElementById('main-view'));
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
            App.logic.checkAlerts();
        },
        reqDel: function(id) { if(confirm("Borrar?")){ App.data.requests=App.data.requests.filter(x=>x.id!==id); Safe.save('v40_db',App.data); App.uiState.selectedId=null; App.router.go('requests'); }},
        
        // EQUILIBRIO FUNCTIONS
        storeEquilibrioDate: function(input, type) {
            // Función que se llama cuando cambia el input de fecha
            Utils.handleDateInput(input);
        },
        updateEquilibrioRange: function() {
            const startInput = document.getElementById('eq-start');
            const endInput = document.getElementById('eq-end');
            
            // Validar inputs primero
            Utils.handleDateInput(startInput);
            Utils.handleDateInput(endInput);
            
            const start = startInput.dataset.isoValue;
            const end = endInput.dataset.isoValue;
            
            if(!start || !end) {
                alert('Por favor introduce ambas fechas en formato DD/MM/AAAA.');
                return;
            }
            if(start > end) {
                alert('La fecha de inicio debe ser anterior a la fecha de fin.');
                return;
            }
            App.uiState.balanceStartDate = start;
            App.uiState.balanceEndDate = end;
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        resetEquilibrioRange: function() {
            App.uiState.balanceStartDate = null;
            App.uiState.balanceEndDate = null;
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        sortEquilibrio: function(key) {
            // Si clickeas la misma columna, alterna dirección
            if(App.uiState.equilibrioSortKey === key) {
                App.uiState.equilibrioSortDir = App.uiState.equilibrioSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                // Nueva columna, empezar en ascendente
                App.uiState.equilibrioSortKey = key;
                App.uiState.equilibrioSortDir = 'asc';
            }
            App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
        },
        // ============================================================
        // PETICIONES RECURRENTES
        // ============================================================

        recurringSelect: function(id) {
            App.uiState.recurringSelectedId = id;
            App.ui.renderRecurringInspector(id);
            document.querySelectorAll('.rr-row').forEach(el => {
                el.classList.toggle('selected', el.dataset.id === id);
            });
        },

        recurringSave: function(id) {
            const empId = document.getElementById('rr-emp').value;
            if (!empId) { alert('Selecciona un empleado.'); return; }

            const typeBtn  = document.querySelector('.rr-type-btn.active');
            const type     = typeBtn ? typeBtn.dataset.type : 'libre';
            const franjaBtn = document.querySelector('.rr-franja-btn.active');
            const franja   = (type === 'franja' && franjaBtn) ? franjaBtn.dataset.franja : null;
            if (type === 'franja' && !franja) { alert('Selecciona Mañana o Tarde.'); return; }

            const days = Array.from(document.querySelectorAll('.rr-day-btn.active')).map(b => parseInt(b.dataset.day));
            if (days.length === 0) { alert('Selecciona al menos un día de la semana.'); return; }

            const fromInput = document.getElementById('rr-from');
            const toInput   = document.getElementById('rr-to');
            Utils.handleDateInput(fromInput);
            Utils.handleDateInput(toInput);
            const dateFrom = fromInput.dataset.isoValue;
            const dateTo   = toInput.dataset.isoValue;
            if (!dateFrom || !dateTo) { alert('Introduce las fechas en formato DD/MM/AAAA.'); return; }
            if (dateFrom > dateTo)    { alert('La fecha de inicio debe ser anterior a la de fin.'); return; }

            const skipHolidays = document.getElementById('rr-skip-holidays').checked;
            const note = document.getElementById('rr-note').value.trim();

            // Franja personalizada: leer los selects
            let hrlFrom = '', hrlTo = '';
            if (type === 'franja') {
                if (franja === 'manana')       { hrlFrom = '10:00'; hrlTo = '16:00'; }
                else if (franja === 'tarde')   { hrlFrom = '16:00'; hrlTo = '22:00'; }
                else if (franja === 'custom')  {
                    hrlFrom = document.getElementById('rr-custom-from')?.value || '10:00';
                    hrlTo   = document.getElementById('rr-custom-to')?.value   || '14:00';
                    if (hrlFrom >= hrlTo) { alert('La hora de inicio debe ser anterior a la de fin.'); return; }
                }
            }

            const pattern = {
                id: id || ('rr_' + Date.now()),
                empId, type, franja, days, dateFrom, dateTo, skipHolidays, note,
                hrlFrom, hrlTo,
                createdAt: id
                    ? (App.data.recurringRequests.find(r => r.id === id)?.createdAt || new Date().toISOString())
                    : new Date().toISOString()
            };

            if (id) {
                const i = App.data.recurringRequests.findIndex(r => r.id === id);
                App.data.recurringRequests[i] = pattern;
            } else {
                App.data.recurringRequests.push(pattern);
            }

            Safe.save('v40_db', App.data);
            App.uiState.recurringSelectedId = pattern.id;
            App.router.go('requests');
        },

        recurringDel: function(id) {
            const pattern = App.data.recurringRequests.find(r => r.id === id);
            if (!pattern) return;
            if (!confirm('¿Eliminar este patrón recurrente?')) return;

            const linked = App.data.requests.filter(r => r.recurringId === id);
            if (linked.length > 0) {
                const deleteLinked = confirm(
                    `Este patrón tiene ${linked.length} petición${linked.length !== 1 ? 'es' : ''} generada${linked.length !== 1 ? 's' : ''}.\n\n` +
                    `¿Eliminar también las peticiones generadas?\n\nAcepta: Eliminar todo · Cancela: Solo el patrón`
                );
                if (deleteLinked) {
                    App.data.requests = App.data.requests.filter(r => r.recurringId !== id);
                }
            }

            App.data.recurringRequests = App.data.recurringRequests.filter(r => r.id !== id);
            Safe.save('v40_db', App.data);
            App.uiState.recurringSelectedId = null;
            App.router.go('requests');
        },

        recurringGenerate: function(id) {
            const pattern = App.data.recurringRequests.find(r => r.id === id);
            if (!pattern) return;

            const emp = App.data.empleados.find(e => e.id === pattern.empId);
            if (!emp) { alert('Empleado no encontrado.'); return; }

            // Calcular fechas objetivo
            const dates = [];
            const holidays = new Set((App.data.storeConfig.holidays || []).map(h => h.date));
            let cur = new Date(pattern.dateFrom + 'T00:00:00');
            const endDate = new Date(pattern.dateTo + 'T00:00:00');

            while (cur <= endDate) {
                const dateStr = `${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`;
                const isoDay  = cur.getDay() === 0 ? 7 : cur.getDay(); // 1=Lun…7=Dom
                if (pattern.days.includes(isoDay)) {
                    if (!pattern.skipHolidays || !holidays.has(dateStr)) {
                        dates.push(dateStr);
                    }
                }
                cur.setDate(cur.getDate() + 1);
            }

            if (dates.length === 0) {
                alert('No se encontraron fechas que coincidan con el patrón en el rango seleccionado.');
                return;
            }

            // Detectar conflictos — recoger objetos para mostrar descripción en modal
            const TYPE_LABEL = { VAC:'Vacaciones', LIB:'Día libre', HRL:'Horas libres', AP:'Asuntos propios', BAJ:'Baja médica' };
            const conflictItems = []; // { date, req }
            dates.forEach(date => {
                const blocking = App.data.requests.find(r =>
                    r.empId === pattern.empId && !r.archived &&
                    date >= r.start && date <= r.end
                );
                if (blocking) conflictItems.push({ date, req: blocking });
            });
            const conflicts = conflictItems.map(ci => ci.date);

            // decisions: Map { date -> 'skip'|'overwrite' } o null (sin conflictos)
            const doGenerate = (decisions) => {
                this.saveSnapshot('Generar peticiones recurrentes');
                let created = 0, skipped = 0;

                dates.forEach(date => {
                    const hasConflict = App.data.requests.some(r =>
                        r.empId === pattern.empId && !r.archived &&
                        date >= r.start && date <= r.end
                    );
                    if (hasConflict) {
                        const decision = decisions ? decisions[date] : null;
                        if (!decision || decision === 'skip') { skipped++; return; }
                        // overwrite: eliminar la petición existente
                        App.data.requests = App.data.requests.filter(r =>
                            !(r.empId === pattern.empId && !r.archived &&
                              date >= r.start && date <= r.end)
                        );
                    }
                    const isHRL  = pattern.type === 'franja';
                    const hrlFrom = isHRL ? (pattern.hrlFrom || '10:00') : '';
                    const hrlTo   = isHRL ? (pattern.hrlTo   || '22:00') : '';
                    App.data.requests.push({
                        id: 'r' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                        empId: pattern.empId,
                        type: isHRL ? 'HRL' : 'LIB',
                        start: date, end: date,
                        hrlFrom, hrlTo,
                        status: 'pending',
                        note: pattern.note ? `[🔁] ${pattern.note}` : '[🔁 Recurrente]',
                        recurringId: pattern.id,
                        archived: false
                    });
                    created++;
                });

                Safe.save('v40_db', App.data);
                alert(
                    `✅ ${created} petición${created !== 1 ? 'es' : ''} generada${created !== 1 ? 's' : ''}` +
                    (skipped > 0 ? `\nℹ️ ${skipped} omitida${skipped !== 1 ? 's' : ''} (ya existían)` : '')
                );
                App.uiState.reqSection = 'individual';
                App.router.go('requests');
            };

            if (conflicts.length > 0) {
                App.ui.showRecurringConflictModal(
                    conflictItems,
                    emp.nombre,
                    TYPE_LABEL,
                    (decisions) => doGenerate(decisions)
                );
            } else {
                doGenerate(false);
            }
        },

        // STORE LOGIC

        // ── EVENTOS EXTRA ────────────────────────────────────────────────
        eventoSave: function(formData) {
            if(!App.data.eventos) App.data.eventos = [];
            const { id, empId, tipo, desc, fechaInicio, fechaFin, horaInicio, horaFin } = formData;
            if(!empId || !fechaInicio || !horaInicio || !horaFin) return alert('Faltan datos obligatorios.');
            if(id) {
                const i = App.data.eventos.findIndex(e => e.id === id);
                if(i >= 0) App.data.eventos[i] = { id, empId, tipo, desc, fechaInicio, fechaFin: fechaFin||fechaInicio, horaInicio, horaFin, creadoEn: App.data.eventos[i].creadoEn };
            } else {
                App.data.eventos.push({ id: 'ev_' + Date.now(), empId, tipo: tipo||'otro', desc: desc||'', fechaInicio, fechaFin: fechaFin||fechaInicio, horaInicio, horaFin, creadoEn: new Date().toISOString() });
            }
            Safe.save('v40_db', App.data);
            App.ui._refreshEventos();
        },

        eventoDel: function(id) {
            if(!confirm('¿Borrar este evento?')) return;
            App.data.eventos = (App.data.eventos || []).filter(e => e.id !== id);
            Safe.save('v40_db', App.data);
            App.ui._refreshEventos();
        },

        // ── TRASPASOS DE LLAVE ───────────────────────────────────────────────

        _refreshLlaves: function() {
            const c = document.querySelector('.main-scroll');
            if(App.uiState.reqSection === 'llaves' && c) App.ui.renderRequests(c);
        },

        traspasoSave: function(llaveId, fecha, receptorId) {
            if(!llaveId || !fecha || !receptorId) return alert('Faltan datos obligatorios.');
            const dadorId = App.logic.getTitularLlave(llaveId, fecha) || '__TIENDA__';
            if(dadorId === receptorId) return alert('El receptor ya tiene esta llave en esa fecha.');
            // Verificar llave duplicada solo si el receptor es una persona (no tienda)
            if(receptorId !== '__TIENDA__') {
                const otraLlave = (App.data.config.llaves || []).find(l =>
                    l.id !== llaveId && App.logic.getTitularLlave(l.id, fecha) === receptorId
                );
                if(otraLlave) {
                    const otraIdx = (App.data.config.llaves || []).findIndex(l => l.id === otraLlave.id);
                    return alert(`⚠️ ${App.data.empleados.find(e=>e.id===receptorId)?.nombre} ya tiene la Llave ${otraIdx+1} en esa fecha. No se puede asignar dos llaves a la misma persona.`);
                }
            }
            if(!App.data.traspasoLlaves) App.data.traspasoLlaves = [];
            App.data.traspasoLlaves.push({
                id: 'tr_' + Date.now(),
                llaveId, dadorId, receptorId, fecha,
                creadoEn: new Date().toISOString()
            });
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.logic._refreshLlaves();
            App.ui.renderTraspasoInspector(null, fecha);
        },

        traspasoUpdate: function(id, llaveId, fecha, receptorId) {
            if(!llaveId || !fecha || !receptorId) return alert('Faltan datos obligatorios.');
            const idx = (App.data.traspasoLlaves || []).findIndex(t => t.id === id);
            if(idx < 0) return alert('Traspaso no encontrado.');
            const dadorId = App.logic.getTitularLlave(llaveId, fecha, id) || '__TIENDA__';
            if(dadorId === receptorId) return alert('El receptor ya tiene esta llave en esa fecha.');
            if(receptorId !== '__TIENDA__') {
                const otraLlave = (App.data.config.llaves || []).find(l =>
                    l.id !== llaveId && App.logic.getTitularLlave(l.id, fecha) === receptorId
                );
                if(otraLlave) {
                    const otraIdx = (App.data.config.llaves || []).findIndex(l => l.id === otraLlave.id);
                    return alert(`⚠️ ${App.data.empleados.find(e=>e.id===receptorId)?.nombre} ya tiene la Llave ${otraIdx+1} en esa fecha. No se puede asignar dos llaves a la misma persona.`);
                }
            }
            App.data.traspasoLlaves[idx] = { ...App.data.traspasoLlaves[idx], llaveId, fecha, dadorId, receptorId };
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.logic._refreshLlaves();
            App.ui.renderTraspasoInspector(null, fecha);
        },

        traspasoDel: function(id, isBroken) {
            const traspasos = App.data.traspasoLlaves || [];
            const target = traspasos.find(t => t.id === id);
            if (!target) return;

            if (isBroken) {
                // Todos los traspasos de la misma llave desde este punto en adelante
                const mismaLlave = traspasos
                    .filter(t => t.llaveId === target.llaveId && t.fecha >= target.fecha)
                    .sort((a, b) => a.fecha.localeCompare(b.fecha));
                const idsToDelete = [];
                let found = false;
                for (const t of mismaLlave) {
                    if (t.id === id) found = true;
                    if (found) idsToDelete.push(t.id);
                }
                if (idsToDelete.length > 1) {
                    if (!confirm(`Este traspaso y los ${idsToDelete.length - 1} siguientes de la misma llave están rotos.\n¿Borrar los ${idsToDelete.length} traspasos de golpe?`)) return;
                    const delSet = new Set(idsToDelete);
                    App.data.traspasoLlaves = traspasos.filter(t => !delSet.has(t.id));
                } else {
                    if (!confirm('¿Borrar este traspaso?')) return;
                    App.data.traspasoLlaves = traspasos.filter(t => t.id !== id);
                }
            } else {
                if (!confirm('¿Borrar este traspaso?')) return;
                App.data.traspasoLlaves = traspasos.filter(t => t.id !== id);
            }

            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.logic._refreshLlaves();
        },
});
