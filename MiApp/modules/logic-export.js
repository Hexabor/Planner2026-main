// ============================================================
// LÓGICA: Exportar: Excel, master data, ICS/calendario
// ============================================================

if(typeof _localISO === 'undefined') var _localISO = (d) => { const y=d.getFullYear(); const m=String(d.getMonth()+1).padStart(2,'0'); const dd=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${dd}`; };

Object.assign(App.logic, {
        exportToggle: function(empId) {
            const idx = App.uiState.exportEmps.indexOf(empId);
            if(idx >= 0) {
                App.uiState.exportEmps.splice(idx, 1);
            } else {
                App.uiState.exportEmps.push(empId);
            }
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        exportSelectAll: function() {
            // Extraer gaps existentes
            const currentGaps = App.uiState.exportEmps.filter(item => 
                typeof item === 'object' && item.type === 'gap'
            );
            
            // Obtener todos los empleados activos ordenados
            const allEmps = App.data.empleados
                .filter(e => e.active !== false)
                .sort((a,b) => a.customOrder - b.customOrder)
                .map(e => e.id);
            
            // Combinar: empleados + gaps al final
            App.uiState.exportEmps = [...allEmps, ...currentGaps];
            
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        exportSelectNone: function() {
            // Si no hay gaps, crear uno automáticamente
            const hasGaps = App.uiState.exportEmps.some(item => 
                typeof item === 'object' && item.type === 'gap'
            );
            
            if(!hasGaps) {
                // Crear gap automático
                const gap = {
                    id: 'gap_' + Date.now(),
                    type: 'gap',
                    name: 'hueco'
                };
                App.uiState.exportEmps.push(gap);
            }
            
            // Mantener solo los gaps, eliminar empleados
            App.uiState.exportEmps = App.uiState.exportEmps.filter(item => 
                typeof item === 'object' && item.type === 'gap'
            );
            
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        exportDragStart: function(e, idx) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', idx.toString());
            e.currentTarget.style.opacity = '0.5';
        },
        exportDragEnd: function(e) {
            e.currentTarget.style.opacity = '1';
            // Limpiar todos los indicadores visuales
            document.querySelectorAll('.export-emp-item').forEach(el => {
                el.style.borderTop = '';
            });
        },
        exportDragOver: function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            e.currentTarget.style.borderTop = '2px solid var(--primary)';
        },
        exportDragLeave: function(e) {
            e.currentTarget.style.borderTop = '';
        },
        exportDrop: function(e, targetIdx) {
            e.preventDefault();
            e.currentTarget.style.borderTop = '';
            
            // Limpiar todos los bordes
            document.querySelectorAll('.export-emp-item').forEach(el => {
                el.style.opacity = '1';
                el.style.borderTop = '';
            });
            
            const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
            if(fromIdx === targetIdx) return;
            
            const movedId = App.uiState.exportEmps[fromIdx];
            App.uiState.exportEmps.splice(fromIdx, 1);
            App.uiState.exportEmps.splice(targetIdx, 0, movedId);
            
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        exportMove: function(empId, direction) {
            const idx = App.uiState.exportEmps.indexOf(empId);
            if(idx < 0) return;
            const newIdx = idx + direction;
            if(newIdx < 0 || newIdx >= App.uiState.exportEmps.length) return;
            
            App.uiState.exportEmps.splice(idx, 1);
            App.uiState.exportEmps.splice(newIdx, 0, empId);
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        
        addGap: function() {
            const nameInput = document.getElementById('gap-name-input');
            const name = nameInput.value.trim();
            
            // Crear objeto gap
            const gap = {
                id: 'gap_' + Date.now(),
                type: 'gap',
                name: name
            };
            
            // Añadir al final de exportEmps
            App.uiState.exportEmps.push(gap);
            
            // Cerrar modal y limpiar input
            document.getElementById('gap-modal').classList.remove('open');
            nameInput.value = '';
            
            // Re-renderizar
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        
        removeGap: function(idx) {
            App.uiState.exportEmps.splice(idx, 1);
            App.ui.renderExport(document.querySelector('.main-scroll'));
        },
        
        copyDayGrid: async function(date) {
            const empIds = App.uiState.exportEmps;
            const rows = [];
            
            // Generar grid (solo celdas, sin nombres)
            empIds.forEach(item => {
                const isGap = typeof item === 'object' && item.type === 'gap';
                const row = [];
                
                if(isGap) {
                    // Gap: 26 celdas vacías
                    for(let i=0; i<26; i++) row.push('');
                } else {
                    const shiftId = App.data.schedule[date] ? App.data.schedule[date][item] : null;
                    const shift = shiftId ? Utils.getShift(shiftId) : null;
                    
                    if(shift && shift.fixed) {
                        // Turno fijo: letra en primera celda, resto vacío
                        row.push(shift.code);
                        for(let i=1; i<26; i++) row.push('');
                    } else if(shift && shift.start && shift.end) {
                        // Turno normal: X donde trabaja
                        const getMin = (t) => {
                            const [h, m] = t.split(':').map(Number);
                            return h * 60 + m;
                        };
                        
                        const startMin = getMin(shift.start);
                        const endMin = getMin(shift.end);
                        let breakStartMin = 0, breakEndMin = 0;
                        if(shift.breakStart && shift.breakEnd) {
                            breakStartMin = getMin(shift.breakStart);
                            breakEndMin = getMin(shift.breakEnd);
                        }
                        
                        for(let i=0; i<26; i++) {
                            const slotMin = 9*60 + 30 + (i*30);
                            let isWorking = slotMin >= startMin && slotMin < endMin;
                            if(isWorking && breakStartMin > 0 && slotMin >= breakStartMin && slotMin < breakEndMin) {
                                isWorking = false;
                            }
                            row.push(isWorking ? 'X' : '');
                        }
                    } else {
                        // Sin turno: 26 celdas vacías
                        for(let i=0; i<26; i++) row.push('');
                    }
                }
                
                rows.push(row);
            });
            
            // Convertir a TSV (tabs)
            const tsv = rows.map(row => row.join('\t')).join('\n');
            
            // Copiar al clipboard
            try {
                await navigator.clipboard.writeText(tsv);
                
                // Feedback visual
                const btn = document.getElementById(`copy-btn-${date}`);
                const originalText = btn.innerHTML;
                btn.innerHTML = '✓ Copiado!';
                btn.style.background = '#059669';
                
                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '#10b981';
                }, 2000);
            } catch(err) {
                alert('⚠️ Error al copiar. Asegúrate de usar un navegador moderno.');
                console.error('Clipboard error:', err);
            }
        },
        copyWeekGrid: async function(mondayDate) {
            const empIds = App.uiState.exportEmps;
            const ROWS_PER_DAY = 15;
            const COLS = 26;
            const allRows = [];

            // Cabecera de franjas horarias (09:30 a 22:00) — siempre igual
            const timeHeader = [];
            for(let i=0; i<COLS; i++) {
                const totalMin = 9*60 + 30 + (i*30);
                const h = Math.floor(totalMin / 60);
                const m = totalMin % 60;
                timeHeader.push(`${h}:${m.toString().padStart(2,'0')}`);
            }

            // Helper: generar las 15 filas de un día
            const buildDayRows = (date) => {
                const dayRows = [];
                empIds.forEach(item => {
                    const isGap = typeof item === 'object' && item.type === 'gap';
                    const row = [];

                    if(isGap) {
                        for(let i=0; i<COLS; i++) row.push('');
                    } else {
                        const shiftId = App.data.schedule[date] ? App.data.schedule[date][item] : null;
                        const shift = shiftId ? Utils.getShift(shiftId) : null;

                        if(shift && shift.fixed) {
                            row.push(shift.code);
                            for(let i=1; i<COLS; i++) row.push('');
                        } else if(shift && shift.start && shift.end) {
                            const getMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
                            const startMin = getMin(shift.start);
                            const endMin = getMin(shift.end);
                            let breakStartMin = 0, breakEndMin = 0;
                            if(shift.breakStart && shift.breakEnd) {
                                breakStartMin = getMin(shift.breakStart);
                                breakEndMin = getMin(shift.breakEnd);
                            }
                            for(let i=0; i<COLS; i++) {
                                const slotMin = 9*60 + 30 + (i*30);
                                let isWorking = slotMin >= startMin && slotMin < endMin;
                                if(isWorking && breakStartMin > 0 && slotMin >= breakStartMin && slotMin < breakEndMin) {
                                    isWorking = false;
                                }
                                row.push(isWorking ? 'X' : '');
                            }
                        } else {
                            for(let i=0; i<COLS; i++) row.push('');
                        }
                    }
                    dayRows.push(row);
                });
                // Rellenar hasta ROWS_PER_DAY con filas vacías
                while(dayRows.length < ROWS_PER_DAY) {
                    const empty = [];
                    for(let i=0; i<COLS; i++) empty.push('');
                    dayRows.push(empty);
                }
                return dayRows;
            };

            // Helper: calcular fila TOTAL (COUNTIF de X por columna)
            const buildTotalRow = (dayRows) => {
                const totals = [];
                for(let col=0; col<COLS; col++) {
                    let count = 0;
                    for(let r=0; r<dayRows.length; r++) {
                        if(dayRows[r][col] === 'X') count++;
                    }
                    totals.push(count > 0 ? count : 0);
                }
                return totals;
            };

            // Generar 7 días (lunes a domingo)
            const days = Utils.getWeekDays(mondayDate);
            let prevDayRows = null;

            days.forEach((date, dayIdx) => {
                const dayRows = buildDayRows(date);

                // Antes de cada día (excepto el primero), insertar gap de 3 filas
                if(dayIdx > 0 && prevDayRows) {
                    // Fila 1: TOTAL HORAS (cuenta de X del día anterior)
                    allRows.push(buildTotalRow(prevDayRows));
                    // Fila 2: vacía
                    const emptyRow = [];
                    for(let i=0; i<COLS; i++) emptyRow.push('');
                    allRows.push(emptyRow);
                    // Fila 3: cabecera de franjas horarias del día actual
                    allRows.push([...timeHeader]);
                }

                // Filas de datos del día
                dayRows.forEach(r => allRows.push(r));
                prevDayRows = dayRows;
            });

            // Convertir a TSV
            const tsv = allRows.map(row => row.join('\t')).join('\n');

            try {
                await navigator.clipboard.writeText(tsv);

                const btn = document.getElementById(`copy-week-btn-${mondayDate}`);
                if(btn) {
                    const originalText = btn.innerHTML;
                    btn.innerHTML = '✓ Semana copiada!';
                    btn.style.background = '#059669';
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '#2563eb';
                    }, 2000);
                }
            } catch(err) {
                alert('⚠️ Error al copiar. Asegúrate de usar un navegador moderno.');
                console.error('Clipboard error:', err);
            }
        },
        exportGenerate: function() {
            const monday = App.uiState.exportWeek;
            if(!monday) { alert('⚠️ Selecciona una semana'); return; }
            const sundayD = new Date(monday); sundayD.setDate(sundayD.getDate() + 6);
            const start = monday;
            const end = _localISO(sundayD);
            const empIds = App.uiState.exportEmps;
            const realEmps = empIds.filter(i => typeof i === 'string').length;
            
            if(!start || !end) {
                alert('⚠️ Debes seleccionar un rango de fechas');
                return;
            }
            if(realEmps === 0) {
                alert('⚠️ Debes seleccionar al menos un empleado');
                return;
            }
            if(start > end) {
                alert('⚠️ La fecha de inicio debe ser anterior a la fecha de fin');
                return;
            }
            
            // Generar el Excel
            const wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "Planificación de Turnos",
                Author: "Planificador T001",
                CreatedDate: new Date()
            };
            wb.Workbook = {
                Views: [{RTL: false}]
            };
            
            // Agrupar días por semana
            const weekMap = new Map();
            let currentDate = new Date(start);
            const endDate = new Date(end);
            
            while(currentDate <= endDate) {
                const dateStr = _localISO(currentDate);
                const monday = Utils.getMonday(dateStr);
                
                if(!weekMap.has(monday)) {
                    weekMap.set(monday, []);
                }
                weekMap.get(monday).push(dateStr);
                
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Crear una hoja por semana
            weekMap.forEach((days, monday) => {
                const weekData = [];
                
                // Procesar cada día de esta semana
                days.forEach((dateStr, dayIdx) => {
                    const dayName = Utils.getDayName(dateStr);
                    const [y, m, d] = dateStr.split('-');
                    
                    // Si no es el primer día, añadir 2 filas vacías de separación
                    if(dayIdx > 0) {
                        weekData.push([]);
                        weekData.push([]);
                    }
                    
                    // Encabezado con día y fecha
                    weekData.push([`${dayName} ${d}/${m}/${y}`]);
                    weekData.push([]); // Línea vacía
                    
                    // Cabecera de horas (9:30 a 22:00 = 26 columnas)
                    const timeHeader = [''];
                    for(let h = 9; h < 22; h++) {
                        timeHeader.push(`${h}:30`);
                        if(h < 21) timeHeader.push(`${h+1}:00`);
                    }
                    timeHeader.push('22:00');
                    weekData.push(timeHeader);
                    
                    // Fila por cada empleado o gap
                    empIds.forEach(item => {
                        // Detectar si es un gap
                        const isGap = typeof item === 'object' && item.type === 'gap';
                        
                        if(isGap) {
                            // Renderizar GAP como fila vacía con nombre
                            const row = [item.name || ''];
                            for(let i = 0; i < 26; i++) row.push('');
                            weekData.push(row);
                            return;
                        }
                        
                        // Renderizar EMPLEADO normal
                        const emp = App.data.empleados.find(e => e.id === item);
                        if(!emp) return;
                        
                        const row = [emp.nombre];
                        const shiftId = App.data.schedule[dateStr] ? App.data.schedule[dateStr][item] : null;
                        const shift = shiftId ? Utils.getShift(shiftId) : null;
                        
                        // Si es turno fijo, poner la letra en la primera columna
                        if(shift && shift.fixed) {
                            row[0] = emp.nombre;
                            row[1] = shift.code; // 9:30
                            for(let i = 2; i < 27; i++) row.push('');
                        } else if(shift && shift.start && shift.end) {
                            // Calcular qué celdas tienen X
                            const getMinutes = (t) => {
                                const [h, m] = t.split(':').map(Number);
                                return h * 60 + m;
                            };
                            
                            const startMin = getMinutes(shift.start);
                            const endMin = getMinutes(shift.end);
                            let breakStartMin = 0, breakEndMin = 0;
                            if(shift.breakStart && shift.breakEnd) {
                                breakStartMin = getMinutes(shift.breakStart);
                                breakEndMin = getMinutes(shift.breakEnd);
                            }
                            
                            // 9:30, 10:00, 10:30... 22:00 (26 slots)
                            for(let i = 0; i < 26; i++) {
                                const slotMin = 570 + (i * 30); // 570 = 9:30
                                let isWorking = slotMin >= startMin && slotMin < endMin;
                                if(isWorking && breakStartMin > 0 && slotMin >= breakStartMin && slotMin < breakEndMin) {
                                    isWorking = false;
                                }
                                row.push(isWorking ? 'X' : '');
                            }
                        } else {
                            // Sin turno
                            for(let i = 0; i < 26; i++) row.push('');
                        }
                        
                        weekData.push(row);
                    });
                });
                
                // Crear hoja para esta semana
                const ws = XLSX.utils.aoa_to_sheet(weekData);
                
                // Ajustar anchos de columna
                const colWidths = [{wch: 15}]; // Nombre
                for(let i = 0; i < 26; i++) colWidths.push({wch: 5});
                ws['!cols'] = colWidths;
                
                // Aplicar estilos a las celdas
                const range = XLSX.utils.decode_range(ws['!ref']);
                
                // Iterar por todas las celdas
                for(let R = range.s.r; R <= range.e.r; R++) {
                    for(let C = range.s.c; C <= range.e.c; C++) {
                        const cellAddress = XLSX.utils.encode_cell({r: R, c: C});
                        const cell = ws[cellAddress];
                        
                        if(!cell) continue;
                        
                        // Columnas de franjas horarias (B en adelante = C >= 1)
                        if(C >= 1) {
                            // Inicializar objeto de estilo si no existe
                            if(!cell.s) cell.s = {};
                            
                            // Alineación centrada
                            cell.s.alignment = { horizontal: 'center', vertical: 'center' };
                            
                            // Si contiene 'X', aplicar fondo azul tenue
                            if(cell.v === 'X') {
                                cell.s.fill = {
                                    patternType: 'solid',
                                    fgColor: { rgb: 'DBEAFE' }
                                };
                            }
                        }
                    }
                }
                
                // Nombre de la hoja: "2026WK07 (DD-MM)"
                const weekCode = Utils.getWeekCode(monday);
                const [y, m, d] = monday.split('-');
                const sheetName = `${weekCode} (${d}-${m})`;
                
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
            
            // Generar nombre del archivo
            const formatDate = (d) => {
                const date = new Date(d);
                const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                return `${date.getDate()}${monthNames[date.getMonth()]}${date.getFullYear().toString().slice(-2)}`;
            };
            const filename = `Planificacion_${formatDate(start)}-${formatDate(end)}.xlsx`;
            
            // Descargar con opciones para incluir estilos
            XLSX.writeFile(wb, filename, { 
                bookType: 'xlsx',
                cellStyles: true,
                type: 'binary'
            });
            
            alert(`✅ Excel generado correctamente!\n\nArchivo: ${filename}`);
        },
        
        exportMasterData: function() {
            const start = App.uiState.masterStart;
            const end = App.uiState.masterEnd;
            
            if(!start || !end) {
                alert('⚠️ Debes seleccionar un rango de fechas');
                return;
            }
            if(start > end) {
                alert('⚠️ La fecha de inicio debe ser anterior a la fecha de fin');
                return;
            }
            
            // Recopilar todos los turnos en formato plano
            const rows = [];
            
            // Añadir encabezados
            rows.push([
                'Empleado',
                'Semana',
                'Fecha',
                'Día',
                'Inicio',
                'Fin',
                'Inicio Descanso',
                'Fin Descanso',
                'Horas'
            ]);
            
            // Iterar fechas
            let currentDate = new Date(start);
            const endDate = new Date(end);
            
            while(currentDate <= endDate) {
                const dateStr = _localISO(currentDate);
                const daySchedule = App.data.schedule[dateStr] || {};
                
                // Calcular código de semana
                const weekCode = Utils.getWeekCode(dateStr);
                
                // Obtener nombre del día
                const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][currentDate.getDay()];
                
                // Formatear fecha DD/MM/AAAA
                const [y, m, d] = dateStr.split('-');
                const dateFormatted = `${d}/${m}/${y}`;
                
                // Recopilar turnos de este día (ordenados por empleado alfabético)
                const dayRows = [];
                
                Object.keys(daySchedule).forEach(empId => {
                    const emp = App.data.empleados.find(e => e.id === empId);
                    if(!emp) return; // Skip si empleado no existe
                    
                    const shiftId = daySchedule[empId];
                    const shift = Utils.getShift(shiftId);
                    
                    if(!shift) return; // Skip si turno no existe
                    
                    // Determinar valores de la fila
                    let inicio = '';
                    let fin = '';
                    let breakIn = '';
                    let breakOut = '';
                    let horas = '';
                    
                    if(shift.fixed) {
                        // Turno fijo (L, V, F, B, P, R)
                        inicio = shift.code;
                        // resto vacío
                    } else if(shift.start && shift.end) {
                        // Turno con horario
                        inicio = shift.start;
                        fin = shift.end;
                        
                        if(shift.breakStart && shift.breakEnd) {
                            breakIn = shift.breakStart;
                            breakOut = shift.breakEnd;
                        }
                        
                        // Calcular horas con coma europea
                        const horasNum = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                        horas = horasNum.toFixed(2).replace('.', ',');
                    }
                    
                    dayRows.push({
                        nombre: emp.nombre,
                        row: [
                            emp.nombre,
                            weekCode,
                            dateFormatted,
                            dayName,
                            inicio,
                            fin,
                            breakIn,
                            breakOut,
                            horas
                        ]
                    });
                });
                
                // Ordenar por nombre de empleado
                dayRows.sort((a, b) => a.nombre.localeCompare(b.nombre));
                
                // Añadir filas al resultado
                dayRows.forEach(item => rows.push(item.row));
                
                // Siguiente día
                currentDate.setDate(currentDate.getDate() + 1);
            }
            
            // Verificar que hay datos
            if(rows.length === 1) {
                alert('⚠️ No hay turnos asignados en el rango seleccionado');
                return;
            }
            
            // Crear workbook
            const wb = XLSX.utils.book_new();
            wb.Props = {
                Title: "Master Data - Turnos",
                Author: "Planificador T001",
                CreatedDate: new Date()
            };
            
            // Crear worksheet desde array
            const ws = XLSX.utils.aoa_to_sheet(rows);
            
            // Ajustar anchos de columna
            ws['!cols'] = [
                { wch: 15 },  // Empleado
                { wch: 10 },  // Semana
                { wch: 12 },  // Fecha
                { wch: 12 },  // Día
                { wch: 8 },   // Inicio
                { wch: 8 },   // Fin
                { wch: 14 },  // Inicio Descanso
                { wch: 14 },  // Fin Descanso
                { wch: 8 }    // Horas
            ];
            
            // Aplicar formato a encabezado (fila 1)
            const range = XLSX.utils.decode_range(ws['!ref']);
            for(let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({r: 0, c: C});
                if(!ws[cellAddress]) continue;
                
                ws[cellAddress].s = {
                    font: { bold: true },
                    fill: { patternType: 'solid', fgColor: { rgb: '4472C4' } },
                    alignment: { horizontal: 'center', vertical: 'center' }
                };
            }
            
            XLSX.utils.book_append_sheet(wb, ws, 'Master Data');
            
            // Generar nombre del archivo
            const formatDate = (d) => {
                const [y, m, day] = d.split('-');
                return `${day}-${m}-${y}`;
            };
            const filename = `MasterData_${formatDate(start)}_${formatDate(end)}.xlsx`;
            
            // Descargar
            XLSX.writeFile(wb, filename, { 
                bookType: 'xlsx',
                cellStyles: true
            });
            
            alert(`✅ Master Data exportado correctamente!\n\nArchivo: ${filename}\nFilas: ${rows.length - 1} turnos`);
        },

        exportICS: function(empId, mode = 'all') {
            const emp = App.data.empleados.find(e => e.id === empId);
            if(!emp) { alert('⚠️ Selecciona un empleado'); return; }

            const start = App.uiState.icsStart;
            const end   = App.uiState.icsEnd;
            if(!start || !end) { alert('⚠️ Selecciona un rango de fechas'); return; }

            const labelMode   = App.uiState.icsLabelMode   || 'code';
            const labelCustom = App.uiState.icsLabelCustom || 'Turno';

            const getLabel = (shift) => {
                if(labelMode === 'custom') return labelCustom;
                return shift.code || 'Turno';
            };

            // Calname según modo
            const calName = mode === 'fixed' ? `Libranzas ${emp.nombre}` : `Turnos ${emp.nombre}`;
            const toICSdt = (dateISO, timeStr) => {
                const [y,mo,d] = dateISO.split('-');
                const [h,mi]   = timeStr.split(':');
                return `${y}${mo}${d}T${h}${mi}00`;
            };
            // UID estable por evento (empleado + fecha + turno)
            const uid = (dateISO, suffix) =>
                `planificador-${empId}-${dateISO}-${suffix}@islazul`;

            const lines = [
                'BEGIN:VCALENDAR',
                'VERSION:2.0',
                'PRODID:-//Planificador Turnos//ES',
                'CALSCALE:GREGORIAN',
                'METHOD:PUBLISH',
                `X-WR-CALNAME:${calName}`,
                'X-WR-TIMEZONE:Europe/Madrid',
            ];

            let count = 0;
            let cur = new Date(start + 'T00:00:00');
            const endD = new Date(end + 'T00:00:00');

            while(cur <= endD) {
                const dateISO = _localISO(cur);
                const sid   = App.data.schedule[dateISO]?.[empId];
                const shift = sid ? Utils.getShift(sid) : null;

                if(shift && !shift.fixed && shift.start && shift.end && mode !== 'fixed') {
                    const code     = getLabel(shift);
                    const hasBreak = shift.breakStart && shift.breakEnd;

                    if(hasBreak) {
                        lines.push(
                            'BEGIN:VEVENT',
                            `UID:${uid(dateISO,'m')}`,
                            `DTSTART:${toICSdt(dateISO, shift.start)}`,
                            `DTEND:${toICSdt(dateISO, shift.breakStart)}`,
                            `SUMMARY:${code}`,
                            `DESCRIPTION:${code} – ${emp.nombre}`,
                            'END:VEVENT'
                        );
                        lines.push(
                            'BEGIN:VEVENT',
                            `UID:${uid(dateISO,'t')}`,
                            `DTSTART:${toICSdt(dateISO, shift.breakEnd)}`,
                            `DTEND:${toICSdt(dateISO, shift.end)}`,
                            `SUMMARY:${code}`,
                            `DESCRIPTION:${code} – ${emp.nombre}`,
                            'END:VEVENT'
                        );
                    } else {
                        lines.push(
                            'BEGIN:VEVENT',
                            `UID:${uid(dateISO,'w')}`,
                            `DTSTART:${toICSdt(dateISO, shift.start)}`,
                            `DTEND:${toICSdt(dateISO, shift.end)}`,
                            `SUMMARY:${code}`,
                            `DESCRIPTION:${code} – ${emp.nombre}`,
                            'END:VEVENT'
                        );
                    }
                    count++;

                } else if(shift && shift.fixed && mode !== 'work') {
                    // Turno fijo (libranza, vacaciones, festivo, baja...) → evento de todo el día
                    const [y,mo,d] = dateISO.split('-');
                    const dateVal = `${y}${mo}${d}`;
                    // DTEND de todo el día = día siguiente
                    const nextDay = new Date(dateISO + 'T00:00:00');
                    nextDay.setDate(nextDay.getDate() + 1);
                    const [ny,nmo,nd] = _localISO(nextDay).split('-');
                    const nextVal = `${ny}${nmo}${nd}`;
                    const label = shift.desc || shift.code || 'Libre';
                    lines.push(
                        'BEGIN:VEVENT',
                        `UID:${uid(dateISO,'f')}`,
                        `DTSTART;VALUE=DATE:${dateVal}`,
                        `DTEND;VALUE=DATE:${nextVal}`,
                        `SUMMARY:${label}`,
                        `DESCRIPTION:${label} – ${emp.nombre}`,
                        'END:VEVENT'
                    );
                    count++;
                }
                cur.setDate(cur.getDate() + 1);
            }

            if(count === 0) { alert('⚠️ No hay turnos de trabajo asignados a este empleado en el rango seleccionado'); return; }

            lines.push('END:VCALENDAR');

            const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            const [y,mo,d] = start.split('-');
            const [y2,mo2,d2] = end.split('-');
            const prefix = mode === 'fixed' ? 'Libranzas' : 'Turnos';
            a.download = `${prefix}_${emp.nombre.replace(/\s+/g,'_')}_${d}-${mo}-${y}_${d2}-${mo2}-${y2}.ics`;
            a.click();
            URL.revokeObjectURL(a.href);

            alert(`✅ Fichero .ics generado con ${count} evento(s).\n\nImportalo en Google Calendar: Ajustes → Importar y exportar → Importar`);
        },
});
