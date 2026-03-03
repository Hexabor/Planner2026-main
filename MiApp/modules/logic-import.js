// ============================================================
// LÓGICA: Importar desde Excel: parseo, mapeo, aplicar
// ============================================================

Object.assign(App.logic, {
        importAnalyze: function() {
            const text = document.getElementById('import-text').value;
            const weekEl = document.getElementById('import-week');
            let week = weekEl ? weekEl.value : Utils.getMonday(new Date());
            const markFree = document.getElementById('import-mark-free').checked;
            
            if (!text.trim()) {
                alert('Por favor pega los datos de Excel.');
                return;
            }
            
            try {
                // AUTO-DETECT: ROTA si hay celdas con patrón "NN/mmm" (ej: 01/mar)
                const format = this.importAutoDetect(text);
                console.log('Formato detectado:', format);

                if (format === 'rota') {
                    const analyzed = this.importParseRota(text);
                    if (analyzed.days.length === 0) {
                        alert('⚠️ No se detectaron días en el formato ROTA.\n\nAsegúrate de que el texto incluye la fila de fechas (ej: "01/mar", "02/mar"...).\n\nAbre la consola del navegador (F12) para ver el log del parser.');
                        return;
                    }
                    App.uiState.importState = {
                        step: 'preview',
                        rawText: text,
                        parsed: null,
                        weekInfo: null,
                        detectedWeekInfo: { isRota: true, totalDays: analyzed.days.length },
                        analyzed: analyzed,
                        selectedWeek: week,
                        previewDay: 0,
                        markFree: markFree,
                        isRota: true
                    };
                    App.router.go('import');
                    return;
                }

                // FORMATO SEMANAL (comportamiento original)
                const parsed = this.importParse(text);
                
                let detectedWeekInfo = null; // Info de la semana detectada para mostrar en UI
                
                // Si detectamos info de semana, intentar calcular el lunes
                if (parsed.weekInfo) {
                    const startDateStr = parsed.weekInfo.startDate; // "29/dic"
                    const match = startDateStr.match(/(\d+)\/(\w+)/);
                    if (match) {
                        const day = parseInt(match[1]);
                        const monthMap = {
                            'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5,
                            'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11
                        };
                        const month = monthMap[match[2]];
                        
                        // Asumir año actual o siguiente si es diciembre/enero
                        const now = new Date();
                        let year = now.getFullYear();
                        if (month === 11 && now.getMonth() < 6) year--; // Dic del año anterior
                        if (month === 0 && now.getMonth() > 6) year++; // Ene del año siguiente
                        
                        const date = new Date(year, month, day);
                        
                        // Ajustar al lunes de esa semana
                        const dayOfWeek = date.getDay();
                        const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Domingo = 0, necesitamos ir al lunes
                        const monday = new Date(date);
                        monday.setDate(date.getDate() + diff);
                        
                        const isoDate = monday.toISOString().slice(0, 10);
                        week = isoDate;
                        
                        // Calcular ISO week para mostrar
                        const isoWeek = Utils.isoWeekNumber(monday);
                        const weekYear = monday.getFullYear();
                        
                        detectedWeekInfo = {
                            number: parsed.weekInfo.number,
                            startDate: parsed.weekInfo.startDate,
                            endDate: parsed.weekInfo.endDate,
                            calculatedMonday: isoDate,
                            isoWeek: `${weekYear}-W${String(isoWeek).padStart(2, '0')}`
                        };
                        
                        console.log(`📅 Semana detectada automáticamente:`, detectedWeekInfo);
                    }
                }
                
                const analyzed = this.importAnalyzeData(parsed.bloques, week);
                
                App.uiState.importState = {
                    step: 'preview',
                    rawText: text,
                    parsed: parsed.bloques,
                    weekInfo: parsed.weekInfo,
                    detectedWeekInfo: detectedWeekInfo, // Info procesada para UI
                    analyzed: analyzed,
                    selectedWeek: week,
                    previewDay: 0,
                    markFree: markFree
                };
                
                App.router.go('import');
            } catch (error) {
                alert('Error al analizar datos: ' + error.message + '\n\nDetalles: ' + error.stack);
                console.error('Error completo:', error);
            }
        },
        
        importParse: function(text) {
            const lines = text.split('\n');
            let bloques = [];
            let currentBlock = null;
            let weekInfo = null;
            
            console.log('=== INICIANDO PARSER ===');
            console.log('Total líneas:', lines.length);
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split('\t');
                const firstCol = parts[0] ? parts[0].trim() : '';
                
                // Detectar información de semana: "SEMANA NUMERO 1 DEL 29/dic AL 04/ene"
                if (firstCol.match(/SEMANA NUMERO/i)) {
                    const semanaMatch = line.match(/SEMANA NUMERO\s+(\d+)\s+DEL\s+(\d+\/\w+)\s+AL\s+(\d+\/\w+)/i);
                    if (semanaMatch) {
                        weekInfo = {
                            number: semanaMatch[1],
                            startDate: semanaMatch[2],
                            endDate: semanaMatch[3]
                        };
                        console.log('Semana detectada:', weekInfo);
                    }
                }
                
                // Detectar inicio de bloque de día (primera columna = nombre del día)
                if (firstCol.match(/^(LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)$/i)) {
                    if (currentBlock && currentBlock.employees.length > 0) {
                        console.log(`Guardando bloque ${currentBlock.day} con ${currentBlock.employees.length} empleados`);
                        bloques.push(currentBlock);
                    }
                    currentBlock = {
                        day: firstCol,
                        timeSlots: [],
                        timeSlotsStartCol: -1,
                        employees: []
                    };
                    console.log('Nuevo bloque:', currentBlock.day);
                    
                    // LAS FRANJAS ESTÁN EN ESTA MISMA LÍNEA
                    console.log(`  DEBUG: Franjas en MISMA línea (primeras 35 cols):`);
                    for (let j = 0; j < Math.min(35, parts.length); j++) {
                        const cell = parts[j].trim();
                        if (cell || j < 5 || cell.match(/^\d{1,2}:\d{2}$/)) {
                            console.log(`    Col ${j}: "${cell}"`);
                        }
                    }
                    
                    // Buscar franjas en ESTA línea
                    for (let j = 2; j < parts.length; j++) {
                        const cell = parts[j].trim();
                        if (cell.match(/^\d{1,2}:\d{2}$/)) {
                            currentBlock.timeSlotsStartCol = j;
                            break;
                        }
                    }
                    
                    // Leer todas las franjas consecutivas
                    if (currentBlock.timeSlotsStartCol !== -1) {
                        let consecutiveGaps = 0;
                        for (let j = currentBlock.timeSlotsStartCol; j < parts.length && currentBlock.timeSlots.length < 50; j++) {
                            const cell = parts[j].trim();
                            if (cell.match(/^\d{1,2}:\d{2}$/)) {
                                currentBlock.timeSlots.push(cell);
                                consecutiveGaps = 0;
                                if (cell >= '22:00' && currentBlock.timeSlots.length >= 20) {
                                    break;
                                }
                            } else {
                                consecutiveGaps++;
                                if (consecutiveGaps >= 3) break;
                            }
                        }
                    }
                    
                    console.log(`  ${currentBlock.timeSlots.length} franjas desde col ${currentBlock.timeSlotsStartCol}`);
                    if (currentBlock.timeSlots.length > 0) {
                        console.log(`  ${currentBlock.timeSlots.slice(0, 3).join(', ')} ... ${currentBlock.timeSlots.slice(-3).join(', ')}`);
                    }
                }
                // Líneas de empleados
                else if (currentBlock && currentBlock.timeSlots.length > 0 && currentBlock.timeSlotsStartCol !== -1) {
                    // Ignorar líneas especiales
                    if (firstCol.match(/^(AÑADIR|TOTAL|$)/i) || !firstCol || firstCol === '') continue;
                    
                    const empName = firstCol;
                    
                    // Extraer marcas desde la columna donde empiezan las franjas
                    const marks = [];
                    for (let j = 0; j < currentBlock.timeSlots.length; j++) {
                        const colIndex = currentBlock.timeSlotsStartCol + j;
                        const mark = parts[colIndex] ? parts[colIndex].trim().toLowerCase() : '';
                        marks.push(mark);
                    }
                    
                    currentBlock.employees.push({
                        name: empName,
                        marks: marks
                    });
                    
                    const xCount = marks.filter(m => m === 'x').length;
                    console.log(`  Empleado: ${empName}, X encontradas: ${xCount}/${marks.length}`);
                    if (xCount > 0) {
                        const xIndices = marks.map((m, i) => m === 'x' ? i : null).filter(x => x !== null);
                        const xTimes = xIndices.map(i => currentBlock.timeSlots[i]);
                        console.log(`    Índices con X: [${xIndices.join(', ')}]`);
                        console.log(`    Franjas con X: [${xTimes.join(', ')}]`);
                    }
                }
            }
            
            // Guardar último bloque
            if (currentBlock && currentBlock.employees.length > 0) {
                console.log(`Guardando último bloque ${currentBlock.day} con ${currentBlock.employees.length} empleados`);
                bloques.push(currentBlock);
            }
            
            console.log('=== PARSER COMPLETADO ===');
            console.log(`Total bloques: ${bloques.length}`);
            bloques.forEach(b => console.log(`  ${b.day}: ${b.employees.length} empleados, ${b.timeSlots.length} slots`));
            
            return { bloques: bloques, weekInfo: weekInfo };
        },
        
        importAnalyzeData: function(bloques, weekStr) {
            const monday = new Date(weekStr);
            const days = [];
            const stats = {
                totalShifts: 0,
                exactMatches: 0,
                customNeeded: 0,
                unknownEmps: 0,
                unknownEmpNames: []
            };
            
            console.log('=== ANÁLISIS DE DATOS ===');
            console.log('Semana:', weekStr);
            
            bloques.forEach((bloque, dayIdx) => {
                const date = new Date(monday);
                date.setDate(date.getDate() + dayIdx);
                const dateStr = date.toISOString().slice(0, 10);
                
                console.log(`\nAnalizando ${bloque.day} (${dateStr})`);
                
                const dayData = {
                    dayName: bloque.day,
                    date: dateStr,
                    assignments: [],
                    warnings: []
                };
                
                bloque.employees.forEach(emp => {
                    console.log(`  Empleado: ${emp.name}`);
                    // Detectar bloques continuos de 'x'
                    const blocks = this.detectWorkBlocks(emp.marks, bloque.timeSlots);
                    console.log(`    Tipo detectado: ${blocks.type}`);
                    
                    if (blocks.type === 'baja') {
                        dayData.assignments.push({
                            empName: emp.name,
                            shiftCode: 'B',
                            timeRange: '-',
                            matchType: 'baja',
                            shiftId: 'fixed_B'
                        });
                        stats.totalShifts++;
                        console.log('    -> Baja médica');
                    } else if (blocks.type === 'vacaciones') {
                        dayData.assignments.push({
                            empName: emp.name,
                            shiftCode: 'V',
                            timeRange: '-',
                            matchType: 'vacaciones',
                            shiftId: 'fixed_V'
                        });
                        stats.totalShifts++;
                        console.log('    -> Vacaciones');
                    } else if (blocks.type === 'recuperacion') {
                        dayData.assignments.push({
                            empName: emp.name,
                            shiftCode: 'R',
                            timeRange: '-',
                            matchType: 'recuperacion',
                            shiftId: 'fixed_R'
                        });
                        stats.totalShifts++;
                        console.log('    -> Recuperación');
                    } else if (blocks.type === 'festivo') {
                        dayData.assignments.push({
                            empName: emp.name,
                            shiftCode: 'F',
                            timeRange: '-',
                            matchType: 'festivo',
                            shiftId: 'fixed_F'
                        });
                        stats.totalShifts++;
                        console.log('    -> Festivo');
                    } else if (blocks.type === 'libre') {
                        console.log('    -> Libre (no se añade)');
                        // No hacer nada para turnos libres
                    } else if (blocks.type === 'continuo') {
                        const assignment = this.findMatchingShift(blocks.blocks[0].start, blocks.blocks[0].end, '', '', emp.name);
                        console.log(`    -> Continuo ${blocks.blocks[0].start}-${blocks.blocks[0].end}, match: ${assignment.matchType}`);
                        dayData.assignments.push(assignment);
                        stats.totalShifts++;
                        if (assignment.matchType === 'exact') stats.exactMatches++;
                        if (assignment.matchType === 'custom') stats.customNeeded++;
                    } else if (blocks.type === 'partido') {
                        const b1 = blocks.blocks[0];
                        const b2 = blocks.blocks[1];
                        // Para turno partido: start, end, breakStart, breakEnd
                        // start = inicio primer bloque
                        // end = fin segundo bloque
                        // breakStart = fin primer bloque (inicio descanso)
                        // breakEnd = inicio segundo bloque (fin descanso)
                        const assignment = this.findMatchingShift(b1.start, b2.end, b1.end, b2.start, emp.name);
                        console.log(`    -> Partido ${b1.start}-${b1.end} | ${b2.start}-${b2.end}, match: ${assignment.matchType}`);
                        dayData.assignments.push(assignment);
                        stats.totalShifts++;
                        if (assignment.matchType === 'exact') stats.exactMatches++;
                        if (assignment.matchType === 'custom') stats.customNeeded++;
                        
                        if (Math.abs(this.timeToMinutes(b2.start) - this.timeToMinutes(b1.end)) > 4 * 60) {
                            dayData.warnings.push(`${emp.name}: Break muy largo (>4h)`);
                        }
                    }
                    
                    // Verificar si el empleado existe
                    const empExists = App.data.empleados.find(e => e.nombre.toLowerCase() === emp.name.toLowerCase());
                    if (!empExists && !stats.unknownEmpNames.includes(emp.name)) {
                        stats.unknownEmpNames.push(emp.name);
                        stats.unknownEmps++;
                        console.log(`    ⚠️ Empleado desconocido`);
                    }
                });
                
                days.push(dayData);
                console.log(`  Total asignaciones: ${dayData.assignments.length}`);
            });
            
            console.log('\n=== RESUMEN ===');
            console.log('Total turnos:', stats.totalShifts);
            console.log('Exactos:', stats.exactMatches);
            console.log('CUSTOM necesarios:', stats.customNeeded);
            console.log('Empleados desconocidos:', stats.unknownEmps, stats.unknownEmpNames);
            
            return {
                days: days,
                stats: stats
            };
        },
        
        detectWorkBlocks: function(marks, timeSlots) {
            // Detectar marcas especiales
            if (marks.some(m => m === 'b')) {
                return { type: 'baja' };
            }
            if (marks.some(m => m === 'v')) {
                return { type: 'vacaciones' };
            }
            if (marks.some(m => m === 'r')) {
                return { type: 'recuperacion' };
            }
            if (marks.some(m => m === 'f')) {
                return { type: 'festivo' };
            }
            
            // Detectar bloques continuos de 'x'
            const blocks = [];
            let inBlock = false;
            let blockStart = null;
            
            for (let i = 0; i < marks.length; i++) {
                if (marks[i] === 'x') {
                    if (!inBlock) {
                        inBlock = true;
                        blockStart = i;
                    }
                } else {
                    if (inBlock) {
                        // Termina el bloque
                        if (blockStart !== null && i > blockStart) {
                            const endTime = this.addMinutes(timeSlots[i - 1], 30);
                            blocks.push({
                                start: timeSlots[blockStart],
                                end: endTime
                            });
                        }
                        inBlock = false;
                        blockStart = null;
                    }
                }
            }
            
            // Cerrar último bloque si termina en x
            if (inBlock && blockStart !== null) {
                const lastIdx = marks.length - 1;
                // Buscar el último 'x' real
                let lastX = lastIdx;
                for (let i = lastIdx; i >= 0; i--) {
                    if (marks[i] === 'x') {
                        lastX = i;
                        break;
                    }
                }
                const endTime = this.addMinutes(timeSlots[lastX], 30);
                blocks.push({
                    start: timeSlots[blockStart],
                    end: endTime
                });
            }
            
            if (blocks.length === 0) {
                return { type: 'libre' };
            } else if (blocks.length === 1) {
                return { type: 'continuo', blocks: blocks };
            } else if (blocks.length === 2) {
                return { type: 'partido', blocks: blocks };
            } else {
                // Más de 2 bloques - tratarlo como partido usando los 2 primeros
                console.log(`    ⚠️ Más de 2 bloques (${blocks.length}), usando solo los 2 primeros`);
                return { type: 'partido', blocks: blocks.slice(0, 2) };
            }
        },
        
        findMatchingShift: function(start, end, breakStart, breakEnd, empName) {
            // Un turno es partido SOLO si tiene breakStart Y breakEnd con valores NO VACÍOS
            const isPartido = !!(breakStart && breakEnd && 
                                 breakStart.trim() !== '' && 
                                 breakEnd.trim() !== '');
            const startMin = this.timeToMinutes(start);
            const endMin = this.timeToMinutes(end);
            
            console.log(`    Buscando match para: ${start}-${end}${isPartido ? ` | break ${breakStart}-${breakEnd}` : ''}`);
            console.log(`    Turnos en paleta: ${App.data.shiftDefs.length}`);
            
            // Buscar SOLO matches EXACTOS en catálogo
            let exactMatch = null;
            
            App.data.shiftDefs.forEach(shift => {
                if (shift.fixed) {
                    console.log(`      Saltando fixed: ${shift.id}`);
                    return;
                }
                
                console.log(`      Comparando con ${shift.code} (${shift.start}-${shift.end}${shift.breakStart ? ` | ${shift.breakStart}-${shift.breakEnd}` : ''})`);
                
                const shiftStartMin = this.timeToMinutes(shift.start);
                const shiftEndMin = this.timeToMinutes(shift.end);
                
                // Un turno es partido SOLO si tiene breakStart Y breakEnd con valores NO VACÍOS
                const shiftIsPartido = !!(shift.breakStart && shift.breakEnd && 
                                          shift.breakStart.trim() !== '' && 
                                          shift.breakEnd.trim() !== '');
                
                // Deben coincidir en tipo (partido o continuo)
                if (isPartido !== shiftIsPartido) {
                    console.log(`        ✗ Tipo diferente (importado es ${isPartido ? 'partido' : 'continuo'}, paleta es ${shiftIsPartido ? 'partido' : 'continuo'})`);
                    return;
                }
                
                const startDiff = Math.abs(startMin - shiftStartMin);
                const endDiff = Math.abs(endMin - shiftEndMin);
                
                if (isPartido) {
                    const breakStartMin = this.timeToMinutes(breakStart);
                    const breakEndMin = this.timeToMinutes(breakEnd);
                    const shiftBreakStartMin = this.timeToMinutes(shift.breakStart);
                    const shiftBreakEndMin = this.timeToMinutes(shift.breakEnd);
                    
                    const breakStartDiff = Math.abs(breakStartMin - shiftBreakStartMin);
                    const breakEndDiff = Math.abs(breakEndMin - shiftBreakEndMin);
                    
                    const totalDiff = startDiff + endDiff + breakStartDiff + breakEndDiff;
                    
                    console.log(`        Diffs: start=${startDiff}, end=${endDiff}, breakStart=${breakStartDiff}, breakEnd=${breakEndDiff}, total=${totalDiff}`);
                    
                    // SOLO match exacto (0 diferencia)
                    if (totalDiff === 0) {
                        exactMatch = shift;
                        console.log(`        ✓ MATCH EXACTO!`);
                    }
                } else {
                    const totalDiff = startDiff + endDiff;
                    
                    console.log(`        Diffs: start=${startDiff}, end=${endDiff}, total=${totalDiff}`);
                    
                    // SOLO match exacto (0 diferencia)
                    if (totalDiff === 0) {
                        exactMatch = shift;
                        console.log(`        ✓ MATCH EXACTO!`);
                    }
                }
            });
            
            // Si hay match exacto, usarlo
            if (exactMatch) {
                console.log(`      → Usando turno de paleta: ${exactMatch.code}`);
                return {
                    empName: empName,
                    shiftCode: exactMatch.code,
                    timeRange: isPartido 
                        ? `${start}-${breakStart} | ${breakEnd}-${end}` 
                        : `${start}-${end}`,
                    matchType: 'exact',
                    shiftId: exactMatch.id
                };
            }
            
            // Si no hay match exacto, crear CUSTOM (objeto, no en paleta)
            console.log('      → No match exacto, crear CUSTOM');
            return {
                empName: empName,
                shiftCode: 'CUSTOM',
                timeRange: isPartido 
                    ? `${start}-${breakStart} | ${breakEnd}-${end}` 
                    : `${start}-${end}`,
                matchType: 'custom',
                customShift: {
                    start: start,
                    end: end,
                    breakStart: breakStart || '',
                    breakEnd: breakEnd || ''
                }
            };
        },
        
        timeToMinutes: function(timeStr) {
            const [h, m] = timeStr.split(':').map(Number);
            return h * 60 + m;
        },
        
        addMinutes: function(timeStr, mins) {
            const totalMin = this.timeToMinutes(timeStr) + mins;
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        },
        
        importPreviewDay: function(dayIdx) {
            App.uiState.importState.previewDay = dayIdx;
            App.router.go('import');
        },
        
        importChangeWeek: function(newWeek) {
            const state = App.uiState.importState;
            state.selectedWeek = newWeek;
            
            // Recalcular el análisis con la nueva semana
            const analyzed = this.importAnalyzeData(state.parsed, newWeek);
            state.analyzed = analyzed;
            
            console.log(`📅 Semana cambiada manualmente a: ${newWeek}`);
            
            App.router.go('import');
        },
        
        importCancel: function() {
            App.uiState.importState = { step: 'paste' };
            App.router.go('import');
        },
        
        
        showImportShiftsDialog: function(shifts) {
            // Guardar temporalmente los turnos a importar
            App.uiState.pendingShiftsImport = shifts;
            
            // Mostrar cantidad en el modal
            document.getElementById('import-shifts-count').textContent = shifts.length;
            
            // Abrir modal
            document.getElementById('import-shifts-modal').classList.add('open');
        },
        
        closeImportShiftsDialog: function() {
            document.getElementById('import-shifts-modal').classList.remove('open');
            App.uiState.pendingShiftsImport = null;
        },
        
        importShiftsAction: function(action) {
            const shifts = App.uiState.pendingShiftsImport;
            if (!shifts) return;
            
            if (action === 'add') {
                // Añadir turnos (evitar duplicados por ID)
                const existingIds = new Set(App.data.shiftDefs.map(s => s.id));
                let added = 0;
                shifts.forEach(shift => {
                    if (!existingIds.has(shift.id)) {
                        App.data.shiftDefs.push(shift);
                        added++;
                    }
                });
                Safe.save('v40_db', App.data);
                alert(`✅ Añadidos ${added} turnos nuevos (${shifts.length - added} ya existían)`);
            } else if (action === 'overwrite') {
                // Sobreescribir todos
                App.data.shiftDefs = shifts;
                Safe.save('v40_db', App.data);
                alert(`✅ Sobreescritos todos los turnos (${shifts.length} turnos)`);
            }
            
            this.closeImportShiftsDialog();
            App.router.go('shifts');
        },
        
        importReset: function() {
            App.uiState.importState = { step: 'paste' };
            App.router.go('import');
        },
        
        importGoToMapping: function() {
            App.uiState.importState.step = 'mapping';
            App.router.go('import');
        },
        
        importSetMapping: function(empName, action, targetId, newName) {
            if (!App.uiState.importState.empMappings) {
                App.uiState.importState.empMappings = {};
            }
            App.uiState.importState.empMappings[empName] = {
                action: action,
                targetId: targetId,
                newName: newName || null
            };
            // NO re-render — the mapping screen manages its own DOM
        },
        
        importBackToPreview: function() {
            App.uiState.importState.step = 'preview';
            App.router.go('import');
        },
        
        // ============================================================
        // PARSER ROTA (Google Sheets / formato mensual)
        // Estrategia: en la fila de cabecera, nombres de día y fechas están
        // en columnas distintas. Se hace un mapeo POSICIONAL:
        //   1ª col con nombre de día  →  1ª col con fecha
        //   2ª col con nombre de día  →  2ª col con fecha   … etc.
        // Esto cubre tanto el caso "misma fila" como "filas separadas".
        // ============================================================

        importAutoDetect: function(text) {
            // ROTA: hay celdas con patrón "NN/mmm" (01/mar, 15/feb...)
            if (/(?:^|\t)(\d{1,2}\/[a-z\u00e0-\u00fc]{3,4})(?:\t|$|\r)/im.test(text)) return 'rota';
            if (/SEMANA NUMERO/i.test(text)) return 'weekly';
            if (/^(LUNES|MARTES|MIERCOLES|MIÉRCOLES|JUEVES|VIERNES|SABADO|SÁBADO|DOMINGO)(\t|$)/im.test(text)) return 'weekly';
            return 'weekly';
        },

        importParseRota: function(text) {
            const monthAbbrMap = {
                'ene':0,'feb':1,'mar':2,'abr':3,'may':4,'jun':5,
                'jul':6,'ago':7,'sep':8,'oct':9,'nov':10,'dic':11,
                'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
                'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11
            };
            const monthNameMap = {
                'enero':0,'febrero':1,'marzo':2,'abril':3,'mayo':4,'junio':5,
                'julio':6,'agosto':7,'septiembre':8,'octubre':9,'noviembre':10,'diciembre':11
            };
            const normalize = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
            const dayNameSet = new Set(['domingo','lunes','martes','miercoles','jueves','viernes','sabado']);

            const lines = text.split('\n');
            const days = {};
            const stats = { totalShifts:0, exactMatches:0, customNeeded:0, unknownEmps:0, unknownEmpNames:[] };

            let currentYear = new Date().getFullYear();
            let lastMonthSeen = -1;

            // dateColumns: colIndex → { date:'YYYY-MM-DD', dayLabel:'01 Mar' }
            // Populated by detectHeaderRow() each time we find a valid header.
            let dateColumns = {};

            // Pending day-name columns: when we see a row with only day names (no dates yet),
            // we store them and try to combine with the next dates row.
            let pendingDayNameCols = null;

            const buildDateColumns = (dayNameCols, dateCells, year) => {
                // Build ISO date string directly to avoid UTC timezone shift
                // (new Date(y,m,d).toISOString() shifts date by -1 in UTC+N timezones)
                const toISO = (y, m, d) =>
                    `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                const result = {};
                dayNameCols.forEach((col, i) => {
                    const d = dateCells[i];
                    if (!d) return;
                    const iso = toISO(year, d.month, d.day);
                    const lbl = `${String(d.day).padStart(2,'0')}/${String(d.month+1).padStart(2,'0')}`;
                    result[col] = { date: iso, dayLabel: lbl };
                });
                return result;
            };

            console.log('=== PARSER ROTA v3 ===');

            for (let li = 0; li < lines.length; li++) {
                const raw = lines[li];
                if (!raw.trim()) continue;
                // strip trailing \r
                const line = raw.replace(/\r$/, '');
                const parts = line.split('\t');
                const firstNorm = normalize(parts[0] || '');

                // --- Fila de mes (MARZO, ABRIL...) ---
                if (monthNameMap.hasOwnProperty(firstNorm)) {
                    const mIdx = monthNameMap[firstNorm];
                    if (lastMonthSeen !== -1 && mIdx < lastMonthSeen) currentYear++;
                    lastMonthSeen = mIdx;
                    dateColumns = {};
                    pendingDayNameCols = null;
                    console.log(`Mes: ${(parts[0]||'').trim()} → ${mIdx+1}/${currentYear}`);
                    continue;
                }

                // --- Escanear fila buscando nombres de día y fechas ---
                const dayNameCols = [];
                const dateCells = [];   // { j, day, month }

                for (let j = 0; j < parts.length; j++) {
                    const cell = (parts[j] || '').trim();
                    if (dayNameSet.has(normalize(cell))) {
                        dayNameCols.push(j);
                    }
                    const mDate = cell.match(/^(\d{1,2})\/([a-z\u00e0-\u00fc]{3,})$/i);
                    if (mDate) {
                        const month = monthAbbrMap[normalize(mDate[2])];
                        const day = parseInt(mDate[1]);
                        if (month !== undefined && day >= 1 && day <= 31) {
                            dateCells.push({ j, day, month });
                        }
                    }
                }

                // --- Caso A: misma fila tiene nombres de día Y fechas ---
                if (dayNameCols.length >= 2 && dateCells.length >= 2) {
                    dayNameCols.sort((a,b) => a-b);
                    dateCells.sort((a,b) => a.j - b.j);
                    dateColumns = buildDateColumns(dayNameCols, dateCells, currentYear);
                    pendingDayNameCols = null;
                    const keys = Object.keys(dateColumns).map(Number).sort((a,b)=>a-b);
                    console.log(`Cabecera (misma fila, línea ${li}): ${keys.length} días → cols [${keys.join(',')}]`);
                    console.log(`  Fechas: ${keys.map(k=>dateColumns[k].date).join(', ')}`);
                    continue;
                }

                // --- Caso B1: fila solo con nombres de día → guardar y esperar fechas ---
                if (dayNameCols.length >= 2 && dateCells.length === 0) {
                    dayNameCols.sort((a,b) => a-b);
                    pendingDayNameCols = dayNameCols;
                    console.log(`Nombres de día (línea ${li}): cols [${dayNameCols.join(',')}] → esperando fila de fechas`);
                    continue;
                }

                // --- Caso B2: fila solo con fechas → combinar con nombres de día pendientes ---
                if (dateCells.length >= 2 && dayNameCols.length === 0) {
                    dateCells.sort((a,b) => a.j - b.j);
                    if (pendingDayNameCols && pendingDayNameCols.length >= 2) {
                        // Nombres de día en fila anterior, fechas en esta fila → same column positions
                        dateColumns = buildDateColumns(pendingDayNameCols, dateCells, currentYear);
                    } else {
                        // Sin nombres de día previos → usar directamente las cols de fecha
                        dateCells.forEach(d => {
                            const iso = `${currentYear}-${String(d.month+1).padStart(2,'0')}-${String(d.day).padStart(2,'0')}`;
                            const lbl = `${String(d.day).padStart(2,'0')}/${String(d.month+1).padStart(2,'0')}`;
                            dateColumns[d.j] = { date: iso, dayLabel: lbl };
                        });
                    }
                    pendingDayNameCols = null;
                    const keys = Object.keys(dateColumns).map(Number).sort((a,b)=>a-b);
                    console.log(`Fechas (línea ${li}): ${keys.length} días → cols [${keys.join(',')}]`);
                    console.log(`  Fechas: ${keys.map(k=>dateColumns[k].date).join(', ')}`);
                    continue;
                }

                // --- Sin columnas de fecha: saltar filas de sistema ---
                if (Object.keys(dateColumns).length === 0) continue;

                const firstTrim = (parts[0] || '').trim();
                if (!firstTrim) continue;
                if (normalize(firstTrim).startsWith('anadir')) continue; // AÑADIR STAFF
                if (/^Emp\.?$/i.test(firstTrim)) continue;
                if (/^Horas?$/i.test(firstTrim)) continue;
                if (/^Total(es)?$/i.test(firstTrim)) continue;
                if (/^\d+$/.test(firstTrim)) continue;

                // --- Fila de empleado ---
                const empName = firstTrim.replace(/\s*\([^)]*\)\s*$/, '').trim();
                if (!empName) continue;

                let empHasAnyShift = false;
                const colKeys = Object.keys(dateColumns).map(Number).sort((a,b)=>a-b);

                colKeys.forEach(colIdx => {
                    const colInfo = dateColumns[colIdx];
                    const cell = (parts[colIdx] || '').trim();
                    if (!cell) return;
                    const assignment = this.parseRotaCell(cell, empName);
                    if (!assignment) return;
                    if (!days[colInfo.date]) {
                        days[colInfo.date] = { date: colInfo.date, dayName: colInfo.dayLabel, assignments: [], warnings: [] };
                    }
                    days[colInfo.date].assignments.push(assignment);
                    stats.totalShifts++;
                    if (assignment.matchType === 'exact') stats.exactMatches++;
                    if (assignment.matchType === 'custom') stats.customNeeded++;
                    empHasAnyShift = true;
                });

                if (empHasAnyShift) {
                    const found = App.data.empleados.find(e =>
                        e.nombre.toLowerCase() === empName.toLowerCase()
                    );
                    if (!found && !stats.unknownEmpNames.includes(empName)) {
                        stats.unknownEmpNames.push(empName);
                        stats.unknownEmps++;
                        console.log(`Empleado no encontrado: "${empName}"`);
                    }
                }
            }

            const sortedDays = Object.values(days).sort((a,b) => a.date.localeCompare(b.date));
            console.log(`=== ROTA COMPLETADO: ${sortedDays.length} días, ${stats.totalShifts} asignaciones ===`);
            return { days: sortedDays, stats };
        },

        parseRotaCell: function(value, empName) {
            const v = (value || '').trim();
            if (!v) return null;
            const vUp = v.toUpperCase();

            if (vUp === 'LIBRE') return null;
            if (vUp === 'VACACIONES') return { empName, shiftCode:'V', timeRange:'-', matchType:'vacaciones', shiftId:'fixed_V' };
            if (/^REC[\.\s]?FESTIVO/i.test(vUp) || /^RECUPERACI/i.test(vUp)) {
                return { empName, shiftCode:'R', timeRange:'-', matchType:'recuperacion', shiftId:'fixed_R' };
            }
            if (vUp === 'FESTIVO') return { empName, shiftCode:'F', timeRange:'-', matchType:'festivo', shiftId:'fixed_F' };
            if (/^BAJA/i.test(vUp)) return { empName, shiftCode:'B', timeRange:'-', matchType:'baja', shiftId:'fixed_B' };

            // Turno partido: "10:00 A 14:00 Y 18:00 A 22:00"
            const splitMatch = v.match(/(\d{1,2}:\d{2})\s+[Aa]\s+(\d{1,2}:\d{2})\s+[Yy]\s+(\d{1,2}:\d{2})\s+[Aa]\s+(\d{1,2}:\d{2})/);
            if (splitMatch) {
                const [, start, breakStart, breakEnd, end] = splitMatch;
                return this.findMatchingShift(start, end, breakStart, breakEnd, empName);
            }

            // Turno simple: "10:00 A 18:00"
            const simpleMatch = v.match(/(\d{1,2}:\d{2})\s+[Aa]\s+(\d{1,2}:\d{2})/);
            if (simpleMatch) {
                const [, start, end] = simpleMatch;
                return this.findMatchingShift(start, end, '', '', empName);
            }

            console.log(`  ROTA: valor no reconocido "${v}" (${empName})`);
            return null;
        },

        importApply: function() {
            // GUARDAR SNAPSHOT ANTES DE IMPORTAR
            this.saveSnapshot('Importar planificación Excel');
            
            const state = App.uiState.importState;
            const analyzed = state.analyzed;
            const markFree = state.markFree || false;
            let shiftsCreated = 0;
            let customCreated = 0;
            let empsCreated = 0;
            let freesMarked = 0;
            
            // Mapear o crear empleados
            const empMap = {}; // nombre -> id
            
            // Primero mapear empleados existentes
            App.data.empleados.forEach(emp => {
                empMap[emp.nombre.toLowerCase()] = emp.id;
            });
            
            // Procesar mappings de empleados nuevos
            if (state.empMappings) {
                Object.keys(state.empMappings).forEach(empName => {
                    const mapping = state.empMappings[empName];
                    
                    if (mapping.action === 'create') {
                        // Crear nuevo empleado con el nombre original
                        const displayName = mapping.newName || empName;
                        const newEmp = {
                            id: 'e' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            nombre: displayName,
                            rol: 'STF',
                            contrato: 40,
                            tag: 1,
                            active: true,
                            customOrder: App.data.empleados.length,
                            prefs: { sunday: 'indif', off1: 'any', off2: 'any', shift: 'any', split: 'ok' }
                        };
                        App.data.empleados.push(newEmp);
                        empMap[empName.toLowerCase()] = newEmp.id;
                        empsCreated++;
                    } else if (mapping.action === 'rename' && mapping.newName && mapping.newName.trim()) {
                        // Crear nuevo empleado con nombre personalizado
                        // La clave en empMap sigue siendo el nombre ORIGINAL del ROTA
                        const newEmp = {
                            id: 'e' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                            nombre: mapping.newName.trim(),
                            rol: 'STF',
                            contrato: 40,
                            tag: 1,
                            active: true,
                            customOrder: App.data.empleados.length,
                            prefs: { sunday: 'indif', off1: 'any', off2: 'any', shift: 'any', split: 'ok' }
                        };
                        App.data.empleados.push(newEmp);
                        empMap[empName.toLowerCase()] = newEmp.id; // clave = nombre ROTA original
                        empsCreated++;
                    } else if (mapping.action === 'map' && mapping.targetId) {
                        // Mapear a existente
                        empMap[empName.toLowerCase()] = mapping.targetId;
                    }
                    // Si es 'ignore', no hacer nada
                });
            }
            
            // Contar custom shifts creados
            analyzed.days.forEach(day => {
                day.assignments.forEach(assignment => {
                    if (assignment.matchType === 'custom') {
                        customCreated++;
                    }
                });
            });
            
            // Aplicar turnos al schedule
            analyzed.days.forEach(day => {
                if (!App.data.schedule[day.date]) {
                    App.data.schedule[day.date] = {};
                }
                
                // Lista de empleados que tienen asignación este día
                const assignedEmps = new Set();
                
                day.assignments.forEach(assignment => {
                    const empId = empMap[assignment.empName.toLowerCase()];
                    if (!empId) return;
                    
                    // Para custom shifts, guardar el objeto completo
                    if (assignment.matchType === 'custom' && assignment.customShift) {
                        App.data.schedule[day.date][empId] = assignment.customShift;
                        assignedEmps.add(empId);
                        shiftsCreated++;
                    } 
                    // Para otros turnos, guardar el shiftId
                    else if (assignment.shiftId) {
                        App.data.schedule[day.date][empId] = assignment.shiftId;
                        assignedEmps.add(empId);
                        shiftsCreated++;
                    }
                });
                
                // Si markFree está activo, marcar como L a los que no tienen turno
                if (markFree) {
                    Object.values(empMap).forEach(empId => {
                        if (!assignedEmps.has(empId)) {
                            const emp = App.data.empleados.find(e => e.id === empId);
                            // Solo marcar si activo Y vigente en esa fecha
                            if (emp && emp.active !== false && Utils.empleadoVigenteEnFecha(emp, day.date)) {
                                App.data.schedule[day.date][empId] = 'fixed_L';
                                freesMarked++;
                            }
                        }
                    });
                }
            });
            
            Safe.save('v40_db', App.data);
            
            App.uiState.importState = {
                step: 'result',
                result: {
                    shiftsCreated: shiftsCreated,
                    customCreated: customCreated,
                    empsCreated: empsCreated,
                    freesMarked: freesMarked
                }
            };
            
            App.router.go('import');
        }
});
