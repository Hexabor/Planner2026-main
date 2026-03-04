// ============================================================
// LÓGICA: Paleta de turnos: crear, editar, eliminar, duplicar
// ============================================================

Object.assign(App.logic, {
        shiftSelect: function(id) { App.uiState.selectedId=id; App.ui.renderShifts(document.querySelector('.main-scroll')); App.ui.renderShiftInspector(id); },
        shiftSave: function(id) { 
            let code = document.getElementById('sf-code').value.trim(); 
            if(code.length > 10) {
                alert('El código del turno no puede exceder los 10 caracteres.');
                return;
            }
            if(!code) {
                alert('El código del turno es obligatorio.');
                return;
            }
            
            // Check if editing an existing shift that's in use
            if(id) {
                const existingShift = App.data.shiftDefs.find(x => x.id === id);
                if(!existingShift) {
                    alert('Error: Turno no encontrado');
                    return;
                }
                
                // Get new values
                const newStart = document.getElementById('sf-start').value;
                const newEnd = document.getElementById('sf-end').value;
                const newBreakStart = document.getElementById('sf-bstart').value;
                const newBreakEnd = document.getElementById('sf-bend').value;
                
                // Check if HOURS changed (start, end, breakStart, breakEnd)
                const hoursChanged = (
                    newStart !== existingShift.start ||
                    newEnd !== existingShift.end ||
                    newBreakStart !== (existingShift.breakStart || '') ||
                    newBreakEnd !== (existingShift.breakEnd || '')
                );
                
                // Check if shift is used in schedule
                let isInUse = false;
                Object.keys(App.data.schedule).forEach(date => {
                    Object.values(App.data.schedule[date]).forEach(shiftId => {
                        if(shiftId === id) isInUse = true;
                    });
                });
                
                // Only create copy if HOURS changed AND shift is in use
                if(isInUse && hoursChanged) {
                    // Shift is in use AND hours changed - create a copy
                    alert(`⚠️ PROTECCIÓN ACTIVADA\n\nEste turno ya está asignado en el planificador y estás cambiando sus horas.\n\nPara proteger tus planificaciones existentes, se creará una COPIA con los nuevos horarios.\n\nEl turno original "${existingShift.code}" se mantendrá intacto en el planificador.`);
                    
                    // Find next copy number
                    const baseCode = code;
                    let copyNum = 1;
                    let newCode = '';
                    
                    do {
                        const suffix = ` (${copyNum})`;
                        const maxBaseLen = 10 - suffix.length;
                        const truncatedBase = baseCode.substring(0, maxBaseLen);
                        newCode = truncatedBase + suffix;
                        copyNum++;
                    } while (App.data.shiftDefs.some(s => s.code === newCode));
                    
                    // Create new shift (copy)
                    const newShift = {
                        id: 's' + Date.now(),
                        code: newCode,
                        desc: document.getElementById('sf-desc').value,
                        start: newStart,
                        end: newEnd,
                        breakStart: newBreakStart,
                        breakEnd: newBreakEnd,
                        color: document.getElementById('sf-color').value,
                        external: document.getElementById('sf-external').checked,
                        customOrder: App.data.shiftDefs.length
                    };
                    
                    App.data.shiftDefs.push(newShift);
                    Safe.save('v40_db', App.data);
                    App.logic.shiftSelect(newShift.id);
                    
                    alert(`✅ Copia creada: "${newShift.code}"\n\nPuedes usar este nuevo turno en futuras planificaciones.`);
                    return;
                }
                // If hours didn't change OR shift not in use, continue to normal save below
            }
            
            // Shift is not in use or is new - safe to save normally
            const s={
                id:id||'s'+Date.now(), 
                code, 
                desc:document.getElementById('sf-desc').value, 
                start:document.getElementById('sf-start').value, 
                end:document.getElementById('sf-end').value, 
                breakStart:document.getElementById('sf-bstart').value, 
                breakEnd:document.getElementById('sf-bend').value, 
                color:document.getElementById('sf-color').value,
                external:document.getElementById('sf-external').checked,
                customOrder:id?App.data.shiftDefs.find(x=>x.id===id).customOrder:App.data.shiftDefs.length
            }; 
            if(id){
                const i=App.data.shiftDefs.findIndex(x=>x.id===id);
                App.data.shiftDefs[i]=s;
                this.saveSnapshot(`Editar turno ${s.code}`);
            } else {
                App.data.shiftDefs.push(s);
                this.saveSnapshot(`Crear turno ${s.code}`);
            }
            Safe.save('v40_db', App.data); 
            App.logic.shiftSelect(s.id); 
        },
        shiftDel: function(id) {
            console.log('shiftDel called with id:', id);
            if(!id) {
                alert('Error: No se proporcionó ID del turno');
                return;
            }
            const shift = App.data.shiftDefs.find(x => x.id === id);
            console.log('Found shift:', shift);
            if(!shift) {
                alert('Error: No se encontró el turno');
                return;
            }
            
            // Check if shift is used in schedule
            let usageCount = 0;
            let usedDates = [];
            Object.keys(App.data.schedule).forEach(date => {
                Object.keys(App.data.schedule[date]).forEach(empId => {
                    if(App.data.schedule[date][empId] === id) {
                        usageCount++;
                        if(!usedDates.includes(date)) usedDates.push(date);
                    }
                });
            });
            
            console.log('Shift usage count:', usageCount);
            
            let confirmMsg = `¿Eliminar el turno "${shift.code}"?`;
            if(usageCount > 0) {
                confirmMsg += `\n\n⚠️ Este turno está asignado ${usageCount} veces en ${usedDates.length} día(s).\n\nLas asignaciones se convertirán en turnos CUSTOM personalizados con las mismas horas.`;
            }
            
            console.log('About to show confirm dialog...');
            const confirmed = confirm(confirmMsg);
            console.log('User confirmed:', confirmed);
            
            if(confirmed) { 
                console.log('Starting deletion process...');
                
                if(usageCount > 0) {
                    // Convert all assignments to CUSTOM shifts
                    console.log('Converting', usageCount, 'assignments to CUSTOM');
                    
                    Object.keys(App.data.schedule).forEach(date => {
                        Object.keys(App.data.schedule[date]).forEach(empId => {
                            if(App.data.schedule[date][empId] === id) {
                                // Create CUSTOM shift with same properties as deleted shift
                                const customShift = Utils.createCustomShift(
                                    shift.start || '',
                                    shift.end || '',
                                    shift.breakStart || '',
                                    shift.breakEnd || '',
                                    shift.color
                                );
                                
                                // Replace with CUSTOM shift object
                                App.data.schedule[date][empId] = customShift;
                            }
                        });
                    });
                    
                    console.log('Converted', usageCount, 'assignments to CUSTOM');
                }
                
                // Remove shift definition
                const beforeLength = App.data.shiftDefs.length;
                App.data.shiftDefs = App.data.shiftDefs.filter(x => x.id !== id);
                console.log('Shifts before:', beforeLength, 'after:', App.data.shiftDefs.length);
                
                Safe.save('v40_db', App.data);
                console.log('Data saved to localStorage');
                
                App.uiState.selectedId = null; 
                // Deselect if was selected as paint
                if(App.uiState.paintShiftId === id) App.uiState.paintShiftId = null;
                
                console.log('Navigating to shifts view...');
                App.router.go('shifts'); 
                console.log('Shift deleted successfully');
                
                if(usageCount > 0) {
                    alert(`✅ Turno eliminado.\n\nLas ${usageCount} asignaciones existentes se han convertido en turnos CUSTOM personalizados.\n\nPuedes editarlos individualmente en el planificador.`);
                }
            } else {
                console.log('User cancelled deletion');
            }
        },
        shiftDelFromPalette: function(id) { 
            const shift = App.data.shiftDefs.find(x => x.id === id);
            if(!shift) return;
            
            // Check if shift is used in schedule
            let usageCount = 0;
            Object.keys(App.data.schedule).forEach(date => {
                Object.keys(App.data.schedule[date]).forEach(empId => {
                    if(App.data.schedule[date][empId] === id) {
                        usageCount++;
                    }
                });
            });
            
            let confirmMsg = `¿Eliminar el turno "${shift.code}"?`;
            if(usageCount > 0) {
                confirmMsg += `\n\n⚠️ Este turno está asignado ${usageCount} veces.\n\nLas asignaciones se convertirán en turnos CUSTOM personalizados.`;
            }
            
            if(confirm(confirmMsg)) { 
                if(usageCount > 0) {
                    // Convert all assignments to CUSTOM shifts
                    Object.keys(App.data.schedule).forEach(date => {
                        Object.keys(App.data.schedule[date]).forEach(empId => {
                            if(App.data.schedule[date][empId] === id) {
                                // Create CUSTOM shift with same properties
                                const customShift = Utils.createCustomShift(
                                    shift.start || '',
                                    shift.end || '',
                                    shift.breakStart || '',
                                    shift.breakEnd || '',
                                    shift.color
                                );
                                
                                App.data.schedule[date][empId] = customShift;
                            }
                        });
                    });
                }
                
                // Remove shift definition
                App.data.shiftDefs = App.data.shiftDefs.filter(x => x.id !== id); 
                this.saveSnapshot('Eliminar turno de paleta');
                Safe.save('v40_db', App.data); 
                // Deselect if was selected
                if(App.uiState.paintShiftId === id) App.uiState.paintShiftId = null;
                // Re-render planner
                App.ui.renderPlanner(document.getElementById('main-view')); 
                App.ui.renderPlannerInspector(document.getElementById('inspector-content'));
                
                if(usageCount > 0) {
                    alert(`✅ Turno eliminado.\n\nLas ${usageCount} asignaciones se convirtieron en turnos CUSTOM.`);
                }
            } 
        },
        shiftDup: function(id) { 
            const s = App.data.shiftDefs.find(x => x.id === id); 
            if(!s) return; 
            
            // Find next copy number
            const baseCode = s.code.replace(/\s*\(\d+\)$/, ''); // Remove existing (N) suffix
            let copyNum = 1;
            let newCode = '';
            
            do {
                const suffix = ` (${copyNum})`;
                const maxBaseLen = 10 - suffix.length;
                const truncatedBase = baseCode.substring(0, maxBaseLen);
                newCode = truncatedBase + suffix;
                copyNum++;
            } while (App.data.shiftDefs.some(shift => shift.code === newCode));
            
            const newS = { 
                ...s, 
                id: 's'+Date.now(), 
                code: newCode, 
                desc: s.desc + ' (Copia)', 
                customOrder: App.data.shiftDefs.length 
            }; 
            App.data.shiftDefs.push(newS); 
            Safe.save('v40_db', App.data); 
            App.logic.shiftSelect(newS.id); 
        },
        
        promoteCustomToPalette: function(idx) {
            const stats = this.getCustomStats();
            const custom = stats[idx];
            
            if(!custom) return;
            
            // Pedir código al usuario
            const code = prompt('🎨 Convertir a turno de catálogo\n\nEste turno personalizado se usa ' + custom.count + ' veces.\n\nIntroduce un código para el turno (máx 10 caracteres):', 
                custom.start.substring(0,2) + '-' + custom.end.substring(0,2));
            
            if(!code) return; // Usuario canceló
            
            if(code.length > 10) {
                alert('El código no puede exceder 10 caracteres.');
                return;
            }
            
            // Verificar que no exista ya
            if(App.data.shiftDefs.some(s => s.code === code)) {
                alert('Ya existe un turno con ese código. Elige otro.');
                return;
            }
            
            // Pedir descripción
            const desc = prompt('Descripción del turno:', 
                `Turno ${custom.start.substring(0,5)}-${custom.end.substring(0,5)}`);
            
            if(!desc) return;
            
            // Pedir color
            const color = prompt('Color del turno (código hex):', '#3b82f6');
            
            if(!color) return;
            
            // Crear nuevo turno en catálogo
            const newShift = {
                id: 's' + Date.now(),
                code: code.trim(),
                desc: desc.trim(),
                start: custom.start,
                end: custom.end,
                breakStart: custom.breakStart || '',
                breakEnd: custom.breakEnd || '',
                color: color.trim(),
                customOrder: App.data.shiftDefs.length
            };
            
            App.data.shiftDefs.push(newShift);
            
            // Reemplazar todas las instancias CUSTOM con el nuevo ID
            let replaced = 0;
            Object.keys(App.data.schedule).forEach(date => {
                Object.keys(App.data.schedule[date]).forEach(empId => {
                    const shift = App.data.schedule[date][empId];
                    
                    if(Utils.isCustomShift(shift) &&
                       shift.start === custom.start &&
                       shift.end === custom.end &&
                       (shift.breakStart || '') === custom.breakStart &&
                       (shift.breakEnd || '') === custom.breakEnd) {
                        App.data.schedule[date][empId] = newShift.id;
                        replaced++;
                    }
                });
            });
            
            Safe.save('v40_db', App.data);
            
            alert(`✅ Turno agregado al catálogo\n\n"${code}" - ${desc}\n\nSe han convertido ${replaced} asignaciones personalizadas.\n\nAhora puedes usar este turno desde la paleta.`);
            
            // Refrescar vista mostrando el catálogo con el nuevo turno
            App.uiState.shiftsViewMode = 'catalog';
            App.router.go('shifts');
        },
        
        sortShifts: function(key) { if(App.uiState.shiftSortKey === key) { App.uiState.shiftSortDir = (App.uiState.shiftSortDir === 'asc') ? 'desc' : 'asc'; } else { App.uiState.shiftSortKey = key; App.uiState.shiftSortDir = 'asc'; } App.ui.renderShifts(document.querySelector('.main-scroll')); },
        // EMP LOGIC
        // Helpers para manejar los empalmes de fechas en formato YYYY-MM-DD
        _sumarUnDia: function(isoDate) {
            if (!isoDate) return null;
            const d = new Date(isoDate);
            d.setDate(d.getDate() + 1);
            return d.toISOString().split('T')[0];
        },
        _restarUnDia: function(isoDate) {
            if (!isoDate) return null;
            const d = new Date(isoDate);
            d.setDate(d.getDate() - 1);
            return d.toISOString().split('T')[0];
        },
});
