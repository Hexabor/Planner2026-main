// ============================================================
// LÓGICA: Empleados: datos, contratos, preferencias, festivos
// ============================================================

Object.assign(App.logic, {
        toggleEmpView: function() { App.uiState.empViewMode = (App.uiState.empViewMode==='data')?'prefs':'data'; App.ui.renderEmp(document.querySelector('.main-scroll')); },
        empSelect: function(id) { App.uiState.selectedId=id; if(!App.uiState.empInspTab) App.uiState.empInspTab='overview'; App.ui.renderEmp(document.querySelector('.main-scroll')); App.ui.renderEmpInspector(id); },
        empSave: function(id) { 
            const existing = id ? App.data.empleados.find(x=>x.id===id) : null;
            const inOverview = !!document.getElementById('ie-nom');

            // Si no estamos en overview, preservar todos los campos que no están en el DOM
            const nom = document.getElementById('ie-nom')?.value || existing?.nombre;
            if(!nom) { alert('No se puede guardar: falta el nombre del empleado.'); return; }
            const rol = document.getElementById('ie-rol')?.value || existing?.rol || 'STF';
            
            // MAGIA AUTOMÁTICA: El Tag se calcula estrictamente por el Rol.
            const tag = ['MNG','AM','SPV'].includes(rol) ? 3 : 1;
            
            const hrsVal = parseFloat(document.getElementById('ie-hrs')?.value) || existing?.contrato || 0;
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
                active: inOverview ? document.getElementById('ie-active').checked : (existing?.active ?? true),
                tag: tag,
                saldoInicial: Number(document.getElementById('ie-saldo')?.value ?? existing?.saldoInicial ?? 0),
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
            // Sincronizar campos legacy
            App.data.empleados[i].fechaInicio = contratosFinales[0].desde;
            const ulti = contratosFinales[contratosFinales.length - 1];
            App.data.empleados[i].fechaFin = ulti.hasta || null;
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
                App.data.empleados[i].fechaInicio = null;
                App.data.empleados[i].fechaFin = null;
            } else {
                // Sincronizar campos legacy con contratos restantes
                App.data.empleados[i].fechaInicio = contratos[0].desde;
                const ultimo = contratos[contratos.length - 1];
                App.data.empleados[i].fechaFin = ultimo.hasta || null;
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

        festivoResetRecuperaciones: function(empId) {
            const confirmed = confirm(
                '⚠️ ACCIÓN DESTRUCTIVA\n\n' +
                'Esto desasignará TODAS las recuperaciones de festivos registradas para este empleado.\n\n' +
                'Tendrás que volver a asignarlas manualmente desde el panel de festivos.\n\n' +
                'Está pensado para reordenar durante la elaboración de horarios.\n\n' +
                'Piénsalo bien antes de pulsarlo.\n\n' +
                '¿Deseas continuar?'
            );
            if(!confirmed) return;
            const i = App.data.empleados.findIndex(e => e.id === empId);
            if(i < 0) return;
            const tracking = App.data.empleados[i].festivoTracking || {};
            Object.keys(tracking).forEach(hDate => {
                if(tracking[hDate].rDate) delete tracking[hDate].rDate;
                if(tracking[hDate].factorialDate) delete tracking[hDate].factorialDate;
                // Si el registro quedó vacío, eliminarlo
                if(!tracking[hDate].rDate && !tracking[hDate].factorialDate) {
                    delete tracking[hDate];
                }
            });
            App.data.empleados[i].festivoTracking = tracking;
            Safe.save('v40_db', App.data);
            App.ui.renderEmpInspector(empId);
            App.ui.renderEmp(document.querySelector('.main-scroll'));
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
            App.ui.renderEmp(document.querySelector('.main-scroll'));
            // Preservar estado abierto de <details> antes de re-renderizar
            const inspector = document.getElementById('inspector-content');
            const openDetails = inspector ? Array.from(inspector.querySelectorAll('details[open]')).map(d => d.querySelector('summary')?.textContent?.trim()) : [];
            App.ui.renderEmpInspector(empId);
            // Restaurar los <details> que estaban abiertos
            if(openDetails.length && inspector) {
                inspector.querySelectorAll('details').forEach(d => {
                    const sumText = d.querySelector('summary')?.textContent?.trim();
                    if(openDetails.includes(sumText)) d.open = true;
                });
            }
        },
        empDel: function(id) { 
            if(confirm("Estás a punto de borrar definitivamente este empleado. Esta acción eliminará también sus asignaciones del planificador y no se puede deshacer.\n\nSi la persona ha dejado tu equipo pero quieres conservar los datos de sus turnos en el historial, deshabilítalo, no la borres.\n\n¿Deseas continuar?")) { 
                
                // Backup preventivo
                if (App.data.config?.backups?.preventivo?.borrarEmpleado !== false) App.drive.savePreventivo('DEL-EMP');

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

// AJUSTES DE HORAS — añadido como extensión del namespace App.logic
Object.assign(App.logic, {

    ajusteSave: function(empId) {
        const idInput    = document.getElementById('ajuste-edit-id');
        const fechaInput = document.getElementById('ajuste-fecha');
        const inicioInput= document.getElementById('ajuste-inicio');
        const finInput   = document.getElementById('ajuste-fin');
        const horasInput = document.getElementById('ajuste-horas');
        const signoInput = document.querySelector('input[name="ajuste-signo"]:checked');
        const motivoInput= document.getElementById('ajuste-motivo');

        if(!fechaInput || !fechaInput.value) { alert('La fecha es obligatoria.'); return; }
        const horasVal = parseFloat(horasInput?.value);
        if(!horasVal || horasVal <= 0) { alert('Indica las horas del ajuste (debe ser mayor que 0).'); return; }
        if(!signoInput) { alert('Indica si las horas se suman o se restan.'); return; }

        const i = App.data.empleados.findIndex(e => e.id === empId);
        if(i < 0) return;
        if(!App.data.empleados[i].ajustes) App.data.empleados[i].ajustes = [];

        const ajuste = {
            id:         idInput?.value || ('a' + Date.now() + Math.random().toString(36).slice(2,6)),
            fecha:      fechaInput.value,
            horaInicio: inicioInput?.value || '',
            horaFin:    finInput?.value || '',
            horas:      Math.round(horasVal * 100) / 100,
            signo:      parseInt(signoInput.value),
            motivo:     motivoInput?.value.trim() || '',
            creadoEn:   new Date().toISOString()
        };

        if(idInput?.value) {
            const idx = App.data.empleados[i].ajustes.findIndex(a => a.id === idInput.value);
            if(idx >= 0) App.data.empleados[i].ajustes[idx] = ajuste;
        } else {
            App.data.empleados[i].ajustes.push(ajuste);
        }

        App.data.empleados[i].ajustes.sort((a, b) => b.fecha.localeCompare(a.fecha));
        Safe.save('v40_db', App.data);
        App.ui.renderEmp(document.querySelector('.main-scroll'));
        App.ui.renderEmpInspector(empId);
    },

    ajusteDel: function(empId, ajusteId) {
        if(!confirm('¿Borrar este ajuste?')) return;
        const i = App.data.empleados.findIndex(e => e.id === empId);
        if(i < 0) return;
        App.data.empleados[i].ajustes = (App.data.empleados[i].ajustes || []).filter(a => a.id !== ajusteId);
        Safe.save('v40_db', App.data);
        App.ui.renderEmp(document.querySelector('.main-scroll'));
        App.ui.renderEmpInspector(empId);
    },

    ajusteEditLoad: function(empId, ajusteId) {
        const emp = App.data.empleados.find(e => e.id === empId);
        if(!emp) return;
        const ajuste = (emp.ajustes || []).find(a => a.id === ajusteId);
        if(!ajuste) return;
        const formDiv = document.getElementById('ajuste-form');
        if(formDiv) formDiv.style.display = 'block';
        const set = (id, val) => { const el = document.getElementById(id); if(el) el.value = val || ''; };
        set('ajuste-edit-id', ajuste.id);
        set('ajuste-fecha',   ajuste.fecha);
        set('ajuste-inicio',  ajuste.horaInicio);
        set('ajuste-fin',     ajuste.horaFin);
        set('ajuste-horas',   ajuste.horas);
        set('ajuste-motivo',  ajuste.motivo);
        const radio = document.querySelector('input[name="ajuste-signo"][value="' + ajuste.signo + '"]');
        if(radio) radio.checked = true;
        App.logic._ajusteCalcHoras();
        formDiv?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    },

    _ajusteCalcHoras: function() {
        const ini = document.getElementById('ajuste-inicio')?.value;
        const fin = document.getElementById('ajuste-fin')?.value;
        const horasEl = document.getElementById('ajuste-horas');
        if(!horasEl) return;
        if(ini && fin && ini < fin) {
            const [ih, im] = ini.split(':').map(Number);
            const [fh, fm] = fin.split(':').map(Number);
            const mins = (fh * 60 + fm) - (ih * 60 + im);
            horasEl.value = Math.round(mins / 60 * 100) / 100;
            horasEl.readOnly = true;
            horasEl.style.background = '#f1f5f9';
            horasEl.style.color = '#64748b';
        } else {
            horasEl.readOnly = false;
            horasEl.style.background = 'white';
            horasEl.style.color = '#334155';
        }
    },

    // ── GESTIÓN DE LLAVES ────────────────────────────────────────────────────

    llaveAdd: function() {
        if(!App.data.config.llaves) App.data.config.llaves = [];
        if(!App.data.traspasoLlaves) App.data.traspasoLlaves = [];
        const id = 'llave_' + Date.now();
        App.data.config.llaves.push({ id, alias: '' });
        // Estado inicial: la tienda tiene la llave
        App.data.traspasoLlaves.push({
            id: 'tr_' + Date.now(),
            llaveId: id, dadorId: '__TIENDA__', receptorId: '__TIENDA__',
            fecha: new Date().toISOString().slice(0, 10),
            source: 'manual', creadoEn: new Date().toISOString()
        });
        Safe.save('v40_db', App.data);
        App.router.go('config');
    },

    llaveDel: function(llaveId) {
        const titular = App.logic.getTitularLlave(llaveId, new Date().toISOString().slice(0, 10));
        if(titular && titular !== '__TIENDA__') {
            const emp = App.data.empleados.find(e => e.id === titular);
            alert(`No se puede eliminar: la llave está asignada a ${emp ? emp.nombre : 'alguien'}. Devuélvela a tienda primero.`);
            return;
        }
        App.data.config.llaves = (App.data.config.llaves || []).filter(l => l.id !== llaveId);
        App.data.traspasoLlaves = (App.data.traspasoLlaves || []).filter(t => t.llaveId !== llaveId);
        Safe.save('v40_db', App.data);
        App.router.go('config');
    },

    llaveUpdateAlias: function(llaveId, alias) {
        const llave = (App.data.config.llaves || []).find(l => l.id === llaveId);
        if(!llave) return;
        llave.alias = alias.trim();
        Safe.save('v40_db', App.data);
    },

    llaveAssign: function(empId, llaveId) {
        // Desasignar de quien la tuviera antes (si llaveId no es vacío)
        if(llaveId) {
            App.data.empleados.forEach(e => {
                if(e.id !== empId && e.llaveId === llaveId) e.llaveId = null;
            });
        }
        const emp = App.data.empleados.find(e => e.id === empId);
        if(emp) emp.llaveId = llaveId || null;
        Safe.save('v40_db', App.data);
        App.ui.renderEmpInspector(empId);
        const scroll = document.querySelector('.main-scroll');
        if(scroll) App.ui.renderEmp(scroll);
        App.logic.checkAlerts();
    }

});
