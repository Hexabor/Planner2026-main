// ============================================================
// LÓGICA: Empleados: datos, contratos, preferencias, festivos
// ============================================================

Object.assign(App.logic, {
        toggleEmpView: function() { App.uiState.empViewMode = (App.uiState.empViewMode==='data')?'prefs':'data'; App.ui.renderEmp(document.querySelector('.main-scroll')); },
        empSelect: function(id) { App.uiState.selectedId=id; App.uiState.empInspTab='overview'; App.ui.renderEmp(document.querySelector('.main-scroll')); App.ui.renderEmpInspector(id); },
        empSave: function(id) { 
            const nom = document.getElementById('ie-nom')?.value;
            if(!nom) { alert('Abre la pestaña Overview para guardar los datos del empleado.'); return; }
            const rol = document.getElementById('ie-rol').value;
            
            // MAGIA AUTOMÁTICA: El Tag se calcula estrictamente por el Rol. Adiós al cajetín.
            const tag = ['MNG','AM','SPV'].includes(rol) ? 3 : 1;
            
            const existing = id ? App.data.empleados.find(x=>x.id===id) : null;
            
            const hrsVal = parseFloat(document.getElementById('ie-hrs').value) || 0;
            // contratos: preservar historial intacto
            const existingContratos = existing?.contratos;
            // emp.contrato es la base histórica — solo se actualiza desde ie-hrs si no hay historial
            const contratoBase = existingContratos && existingContratos.length > 0
                ? (existing?.contrato || hrsVal)  // preservar base original
                : hrsVal;                          // sin historial: usar el input directamente

            const e = {
                id: id || 'e'+Date.now(), 
                nombre: nom, 
                rol: rol, 
                contrato: contratoBase,
                contratos: existingContratos || undefined,
                active: document.getElementById('ie-active').checked, 
                tag: tag, // Se guarda el que hemos calculado automáticamente
                // ADIÓS VIGENCIAS RAÍZ: Todo se gestiona ahora en el array de contratos
                saldoInicial: Number(document.getElementById('ie-saldo')?.value || existing?.saldoInicial || 0),
                recPendientes: Number(document.getElementById('ie-rec')?.value ?? existing?.recPendientes ?? 0),
                vacPendientes: Number(document.getElementById('ie-vac')?.value ?? existing?.vacPendientes ?? 0),
                festivoTracking: existing?.festivoTracking || {},
                prefs: existing?.prefs || {}
            };

            if(id) {
                const i = App.data.empleados.findIndex(x=>x.id===id); 
                App.data.empleados[i] = {...App.data.empleados[i], ...e};
            } else {
                App.data.empleados.push(e);
            }
            Safe.save('v40_db',App.data); 
            App.logic.empSelect(e.id); 
        },
        contratoAddTramo: function(id) {
            const desdeInput = document.getElementById('ie-contrato-desde');
            const horasInput = document.getElementById('ie-contrato-horas');
            if(!desdeInput || !horasInput) return;
            const desde = desdeInput.dataset.isoValue;
            const horas = parseFloat(horasInput.value);
            if(!desde) { alert('Indica la fecha desde la que aplica el nuevo contrato.'); return; }
            if(!horas || horas <= 0) { alert('Indica las horas del nuevo contrato.'); return; }
            
            const i = App.data.empleados.findIndex(e => e.id === id);
            if(i < 0) return;
            
            let contratosActuales = App.data.empleados[i].contratos || [];
            
            if(contratosActuales.find(t => t.desde === desde)) {
                alert('Ya existe un tramo que empieza exactamente en esa fecha. Edítalo o bórralo primero.'); return;
            }

            const nuevoContrato = { desde: desde, hasta: null, horas: horas };
            let contratosFinales = [];

            for (let c of contratosActuales) {
                let terminaAntes = c.hasta && c.hasta < nuevoContrato.desde;
                let empiezaDespues = nuevoContrato.hasta && c.desde > nuevoContrato.hasta;
                
                if (terminaAntes || empiezaDespues) {
                    contratosFinales.push(c); 
                    continue; 
                }

                let engullidoInicio = c.desde >= nuevoContrato.desde;
                let engullidoFin = nuevoContrato.hasta === null || (c.hasta && c.hasta <= nuevoContrato.hasta);
                if (engullidoInicio && engullidoFin) {
                    continue; 
                }

                if (c.desde < nuevoContrato.desde && (c.hasta === null || (nuevoContrato.hasta && c.hasta > nuevoContrato.hasta))) {
                    let clon = { ...c };
                    clon.desde = App.logic._sumarUnDia(nuevoContrato.hasta);
                    c.hasta = App.logic._restarUnDia(nuevoContrato.desde);
                    contratosFinales.push(c);
                    contratosFinales.push(clon);
                    continue;
                }

                if (c.desde < nuevoContrato.desde) {
                    c.hasta = App.logic._restarUnDia(nuevoContrato.desde);
                    contratosFinales.push(c);
                    continue;
                }

                if (c.desde >= nuevoContrato.desde) {
                    c.desde = App.logic._sumarUnDia(nuevoContrato.hasta);
                    contratosFinales.push(c);
                    continue;
                }
            }

            contratosFinales.push(nuevoContrato);
            contratosFinales.sort((a,b) => a.desde.localeCompare(b.desde));
            
            App.data.empleados[i].contratos = contratosFinales;
            Safe.save('v40_db', App.data);
            App.ui.renderEmpInspector(id);
        },
        contratoDelTramo: function(id, idx) {
            const i = App.data.empleados.findIndex(e => e.id === id);
            if(i < 0 || !App.data.empleados[i].contratos) return;
            
            let contratos = App.data.empleados[i].contratos;
            const contratoActual = contratos[idx];
            const contratoPrevio = idx > 0 ? contratos[idx - 1] : null;
            const contratoSiguiente = idx < contratos.length - 1 ? contratos[idx + 1] : null;

            let opcion = '1';
            if (contratos.length > 1) {
                opcion = prompt(
                    "Vas a borrar este contrato. ¿Qué hacemos con el hueco que deja?\n\n" +
                    "1: Dejar el hueco (el empleado no estará activo esos días)\n" +
                    (contratoPrevio ? "2: Expandir el contrato anterior para rellenarlo\n" : "") +
                    (contratoSiguiente ? "3: Adelantar el contrato siguiente para rellenarlo" : ""),
                    "1"
                );
                if (opcion === null) return; 
            }

            if (opcion === '2' && contratoPrevio) {
                contratoPrevio.hasta = contratoSiguiente ? App.logic._restarUnDia(contratoSiguiente.desde) : null;
            } else if (opcion === '3' && contratoSiguiente) {
                contratoSiguiente.desde = contratoPrevio ? App.logic._sumarUnDia(contratoPrevio.hasta) : contratoActual.desde;
            }

            contratos.splice(idx, 1);
            if(contratos.length === 0) {
                delete App.data.empleados[i].contratos;
            }
            
            Safe.save('v40_db', App.data);
            App.ui.renderEmpInspector(id);
        },
        empPref: function(id, field, value) { const i = App.data.empleados.findIndex(x=>x.id===id); if(i>=0) { if(!App.data.empleados[i].prefs) App.data.empleados[i].prefs = {}; App.data.empleados[i].prefs[field] = value; Safe.save('v40_db', App.data); App.ui.renderEmp(document.querySelector('.main-scroll')); } },
        
        empClearOutsideVigencia: function(empId) {
    const emp = App.data.empleados.find(e => e.id === empId);
    if (!emp) return;

    // 1. EL WARNING DE SEGURIDAD
    const confirmacion = confirm(
        `⚠️ ADVERTENCIA DE SEGURIDAD\n\n` +
        `Vas a borrar todos los turnos de ${emp.nombre} que no coincidan con las fechas de sus contratos.\n\n` +
        `• ¿Has revisado que el Historial de Contratos es correcto?\n` +
        `• Si falta algún tramo de contrato, borrarás turnos válidos por error.\n\n` +
        `¿Deseas PROCEDER con el borrado masivo?`
    );

    // OPCIÓN 1: El usuario cancela para revisar (No se hace nada)
    if (!confirmacion) {
        console.log("Acción cancelada: El usuario prefiere revisar los contratos.");
        return; 
    }

    // OPCIÓN 2: El usuario procede
    let turnosBorrados = 0;
    const totalAntes = App.data.assignments.length;

    // Filtramos las asignaciones
    App.data.assignments = App.data.assignments.filter(asig => {
        // Si el turno no es de este empleado, lo mantenemos (true)
        if (asig.empId !== empId) return true;

        // Comprobamos si el empleado tiene contrato en la fecha del turno
        const tieneContrato = App.logic.isEmpleadoActivo(emp, asig.date);
        
        if (!tieneContrato) {
            turnosBorrados++;
            return false; // Se elimina de la lista
        }
        return true; // Se mantiene
    });

    // 3. RESULTADO Y GUARDADO
    if (turnosBorrados > 0) {
        Safe.save('v40_db', App.data);
        
        // Refrescamos el planner si estamos en esa vista para ver los huecos
        if (App.uiState.currentView === 'planner') {
            App.ui.renderPlanner();
        }
        
        alert(`✅ Limpieza completada con éxito.\n\nSe han eliminado ${turnosBorrados} turnos que estaban fuera de contrato.`);
    } else {
        alert(`Información: No se ha borrado nada. Todos los turnos de ${emp.nombre} están dentro de sus periodos de contrato.`);
    }
},

        festivoTrackUpd: function(empId, hDate, field, value) {
            const i = App.data.empleados.findIndex(x => x.id === empId);
            if(i < 0) return;
            if(!App.data.empleados[i].festivoTracking) App.data.empleados[i].festivoTracking = {};
            if(!App.data.empleados[i].festivoTracking[hDate]) App.data.empleados[i].festivoTracking[hDate] = {};
            App.data.empleados[i].festivoTracking[hDate][field] = value || null;
            // Limpiar entrada vacía
            const t = App.data.empleados[i].festivoTracking[hDate];
            if(!t.rDate && !t.factorialDate) delete App.data.empleados[i].festivoTracking[hDate];
            Safe.save('v40_db', App.data);
            App.ui.renderEmpInspector(empId);
        },
        empDel: function(id) { 
            if(confirm("Estás a punto de borrar definitivamente este empleado. Esta acción eliminará también sus asignaciones del planificador y no se puede deshacer.\n\nSi la persona ha dejado tu equipo pero quieres conservar los datos de sus turnos en el historial, deshabilítalo, no la borres.\n\n¿Deseas continuar?")) { 
                
                // Limpieza de schedule (hard delete real)
                let assignRemoved = 0;
                let datesTouched = 0;
                if (App.data && App.data.schedule) {
                    for (const fecha in App.data.schedule) {
                        const day = App.data.schedule[fecha];
                        if (day && Object.prototype.hasOwnProperty.call(day, id)) {
                            delete day[id];
                            assignRemoved++;
                            datesTouched++;
                        }
                    }
                }

                App.data.empleados = App.data.empleados.filter(x => x.id !== id);
                this.saveSnapshot('Eliminar empleado');
                Safe.save('v40_db', App.data);
                App.uiState.selectedId = null;
                App.router.go('empleados');

                console.log(`Empleado eliminado definitivamente. ${assignRemoved} asignaciones retiradas en ${datesTouched} días.`);
            } 
        },
        sortEmp: function(key) { if(App.uiState.sortKey === key) { App.uiState.sortDir = (App.uiState.sortDir === 'asc') ? 'desc' : 'asc'; } else { App.uiState.sortKey = key; App.uiState.sortDir = 'asc'; } App.ui.renderEmp(document.querySelector('.main-scroll')); },
        dragStart: function(e, idx, type) { e.dataTransfer.setData('text/plain', JSON.stringify({idx, type})); e.currentTarget.classList.add('dragging'); },
        dragOver: function(e) { e.preventDefault(); e.currentTarget.classList.add('drag-over'); },
        drop: function(e, targetIdx, type) { e.preventDefault(); const data = JSON.parse(e.dataTransfer.getData('text/plain')); const fromIdx = data.idx; const dragType = data.type; document.querySelectorAll('.data-table tr').forEach(tr => { tr.classList.remove('dragging'); tr.classList.remove('drag-over'); }); if (type !== dragType) return; if (type === 'emp' && fromIdx !== targetIdx && App.uiState.sortKey === 'custom') { let all = [...App.data.empleados]; let activeList = all.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder); let inactiveList = all.filter(e => e.active === false); const movedItem = activeList.splice(fromIdx, 1)[0]; activeList.splice(targetIdx, 0, movedItem); activeList.forEach((e, i) => e.customOrder = i); App.data.empleados = [...activeList, ...inactiveList]; Safe.save('v40_db', App.data); App.ui.renderEmp(document.querySelector('.main-scroll')); } else if (type === 'shift' && fromIdx !== targetIdx && App.uiState.shiftSortKey === 'custom') { let list = [...App.data.shiftDefs].sort((a,b) => a.customOrder - b.customOrder); const movedItem = list.splice(fromIdx, 1)[0]; list.splice(targetIdx, 0, movedItem); list.forEach((s, i) => s.customOrder = i); App.data.shiftDefs = list; Safe.save('v40_db', App.data); App.ui.renderShifts(document.querySelector('.main-scroll')); } },
        
        // REQ LOGIC
});
