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
        reqSort: function(key) {
            if(App.uiState.reqSortKey === key) {
                App.uiState.reqSortDir = App.uiState.reqSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                App.uiState.reqSortKey = key;
                App.uiState.reqSortDir = 'asc';
            }
            App.ui.renderRequests(document.querySelector('.main-scroll'));
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
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },
        reqSelect: function(id) { App.uiState.selectedId=id; App.ui.renderRequests(document.querySelector('.main-scroll')); App.ui.renderReqInspector(id); },
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

            const r = {
                id: id || 'r'+Date.now(),
                empId:  document.getElementById('rq-emp').value,
                type,
                start,
                end,
                hrlFrom,
                hrlTo,
                status: document.getElementById('rq-status').value,
                note:   document.getElementById('rq-note').value
            };

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
        // STORE LOGIC
});
