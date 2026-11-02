// ============================================================
// LÓGICA: Equilibrio, eventos y llaves
// ============================================================

Object.assign(App.logic, {
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
            if (App.ui && App.ui.renderTraspasoInspector) App.ui.renderTraspasoInspector(null, fecha);
            return true;
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
            if (App.ui && App.ui.renderTraspasoInspector) App.ui.renderTraspasoInspector(null, fecha);
            return true;
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
