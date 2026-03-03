// ============================================================
// UI: Vista de exportación
// ============================================================

Object.assign(App.ui, {
        renderExport: function(c) {
            // Inicializar exportEmps si está vacío con todos los empleados activos
            if(App.uiState.exportEmps.length === 0) {
                App.uiState.exportEmps = App.data.empleados
                    .filter(e => e.active !== false)
                    .sort((a,b) => a.customOrder - b.customOrder)
                    .map(e => e.id);
            }
            
            // Fechas por defecto: semana actual
            if(!App.uiState.exportStartDate) {
                const monday = Utils.getMonday(new Date());
                App.uiState.exportStartDate = monday;
                const endDate = new Date(monday);
                endDate.setDate(endDate.getDate() + 6);
                App.uiState.exportEndDate = endDate.toISOString().slice(0,10);
            }
            
            let html = `
            <div style="max-width:1300px; margin:20px auto; display:flex; flex-direction:column; gap:15px;">

                <!-- FILA 1: Fechas compartidas -->
                <div style="background:white; padding:14px 18px; border-radius:8px; border:1px solid var(--border); display:flex; gap:20px; align-items:flex-end; flex-wrap:wrap;">
                    <div style="font-size:0.75rem; font-weight:700; color:var(--text-main); margin-right:4px; padding-bottom:2px;">📅 Rango de fechas</div>
                    <div style="display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                        <div>
                            <label style="font-size:0.65rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:4px;">Desde</label>
                            ${Utils.getDateInputHTML('exp-start', App.uiState.exportStartDate, 'App.uiState.exportStartDate=this.dataset.isoValue; App.ui.updateExportPreview();')}
                        </div>
                        <div>
                            <label style="font-size:0.65rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:4px;">Hasta</label>
                            ${Utils.getDateInputHTML('exp-end', App.uiState.exportEndDate, 'App.uiState.exportEndDate=this.dataset.isoValue; App.ui.updateExportPreview();')}
                        </div>
                    </div>
                    <div style="font-size:0.7rem; color:#94a3b8; padding-bottom:4px;">Este rango se aplica a todas las exportaciones</div>
                </div>

                <!-- FILA 2: Dos tarjetas -->
                <div style="display:grid; grid-template-columns:260px 1fr; gap:15px; align-items:stretch;">

                    <!-- TARJETA A: Google Calendar -->
                    <div style="background:white; padding:16px; border-radius:8px; border:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid var(--border);">
                            <span style="font-size:1.2rem;">📆</span>
                            <div>
                                <div style="font-size:0.82rem; font-weight:700; color:#1e293b;">Google Calendar</div>
                                <div style="font-size:0.65rem; color:#64748b;">Exporta los turnos de un empleado como .ics</div>
                            </div>
                        </div>
                        <div style="font-size:0.7rem; color:#64748b; background:#f8fafc; border-radius:6px; padding:8px 10px; margin-bottom:12px; line-height:1.5;">
                            Genera un fichero <strong>.ics</strong> importable en Google Calendar, Apple Calendar u Outlook.<br>
                            Los turnos de trabajo aparecen con hora exacta. Las libranzas, vacaciones y festivos aparecen como eventos de todo el día.
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.65rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:4px;">Empleado</label>
                            <select id="ics-emp-select" style="width:100%;padding:7px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;background:white;">
                                ${App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder).map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.65rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:4px;">Nombre de los bloques</label>
                            <select id="ics-label-mode" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;background:white;"
                                onchange="App.uiState.icsLabelMode=this.value; document.getElementById('ics-label-custom-wrap').style.display=this.value==='custom'?'block':'none';">
                                <option value="code" ${App.uiState.icsLabelMode==='code'?'selected':''}>Código del turno (M9, T6…)</option>
                                <option value="custom" ${App.uiState.icsLabelMode==='custom'?'selected':''}>Nombre personalizado</option>
                            </select>
                            <div id="ics-label-custom-wrap" style="display:${App.uiState.icsLabelMode==='custom'?'block':'none'};margin-top:6px;">
                                <input type="text" value="${App.uiState.icsLabelCustom}"
                                    oninput="App.uiState.icsLabelCustom=this.value"
                                    placeholder="Ej: Turno"
                                    style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:6px;">
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'work')"
                                    style="width:100%;font-size:0.78rem;padding:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:600;background:#3b82f6;color:white;border-color:#2563eb;border-radius:6px;">
                                🕐 Solo turnos de trabajo
                            </button>
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'fixed')"
                                    style="width:100%;font-size:0.78rem;padding:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:600;background:#8b5cf6;color:white;border-color:#7c3aed;border-radius:6px;">
                                📅 Solo libranzas y ausencias
                            </button>
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'all')"
                                    style="width:100%;font-size:0.78rem;padding:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:600;background:#10b981;color:white;border-color:#059669;border-radius:6px;">
                                ⬇️ Todo junto
                            </button>
                        </div>
                    </div>

                    <!-- TARJETA B: Horario Eficiente + Master Data -->
                    <div style="background:white; padding:16px; border-radius:8px; border:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:10px; border-bottom:2px solid var(--border);">
                            <span style="font-size:1.2rem;">📊</span>
                            <div>
                                <div style="font-size:0.82rem; font-weight:700; color:#1e293b;">Horario Eficiente &amp; Master Data</div>
                                <div style="font-size:0.65rem; color:#64748b;">Exporta el cuadrante para usar en otras herramientas</div>
                            </div>
                        </div>

                        <div style="display:grid; grid-template-columns:222px 1fr; gap:14px;">

                            <!-- Sub-col izq: empleados + botón master data -->
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <div style="background:white; border:1px solid var(--border); border-radius:6px; padding:10px;">
                                    <div style="margin-bottom:6px;">
                                        <span style="font-size:0.7rem; font-weight:700; color:#1e293b;">👥 Empleados (${App.uiState.exportEmps.filter(i => typeof i === 'string').length})</span>
                                        <div style="display:flex; gap:3px; margin-top:5px;">
                                            <button class="btn-header" onclick="App.logic.exportSelectAll()" style="padding:2px 5px; font-size:0.6rem; border-radius:3px;">Todos</button>
                                            <button class="btn-header" onclick="App.logic.exportSelectNone()" style="padding:2px 5px; font-size:0.6rem; border-radius:3px;">Ninguno</button>
                                            <button class="btn-header" onclick="document.getElementById('gap-modal').classList.add('open')" style="padding:2px 5px; font-size:0.6rem; border-radius:3px; background:#f0fdf4; border-color:#86efac;">+Hueco</button>
                                        </div>
                                    </div>
                                    <div style="font-size:0.6rem; color:var(--text-muted); margin-bottom:6px; padding:3px 5px; background:#f8fafc; border-radius:3px;">💡 Arrastra ☰ para reordenar</div>
                                    <div style="display:flex; flex-direction:column; gap:2px; max-height:480px; overflow-y:auto;">
            `;

            // EMPLEADOS SELECCIONADOS
            if(App.uiState.exportEmps.length > 0) {
                App.uiState.exportEmps.forEach((item, idx) => {
                    const isGap = typeof item === 'object' && item.type === 'gap';
                    if(isGap) {
                        const gapName = item.name || '───────';
                        html += `
                            <div class="export-emp-item" draggable="true"
                                 ondragstart="App.logic.exportDragStart(event, ${idx})" ondragend="App.logic.exportDragEnd(event)"
                                 ondragover="App.logic.exportDragOver(event)" ondragleave="App.logic.exportDragLeave(event)" ondrop="App.logic.exportDrop(event, ${idx})"
                                 style="display:grid; grid-template-columns:14px 18px 1fr 20px; gap:4px; align-items:center;
                                        padding:3px 5px; border:1px solid #d1d5db; background:#f9fafb; border-radius:3px; cursor:pointer; font-size:0.7rem;">
                                <span style="color:#94a3b8; cursor:grab; font-size:0.8rem; text-align:center;">☰</span>
                                <span style="color:#9ca3af; font-size:0.9rem; text-align:center;">➖</span>
                                <span style="font-weight:500; color:#6b7280; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${gapName}</span>
                                <button onclick="event.stopPropagation(); App.logic.removeGap(${idx}); App.ui.updateExportPreview();"
                                        style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.9rem; padding:0; width:20px; height:20px; display:flex; align-items:center; justify-content:center;">✕</button>
                            </div>`;
                    } else {
                        const e = App.data.empleados.find(emp => emp.id === item);
                        if(!e) return;
                        html += `
                            <div class="export-emp-item" draggable="true"
                                 ondragstart="App.logic.exportDragStart(event, ${idx})" ondragend="App.logic.exportDragEnd(event)"
                                 ondragover="App.logic.exportDragOver(event)" ondragleave="App.logic.exportDragLeave(event)" ondrop="App.logic.exportDrop(event, ${idx})"
                                 style="display:grid; grid-template-columns:14px 18px 1fr 20px; gap:4px; align-items:center;
                                        padding:3px 5px; border:1px solid var(--primary); background:#eff6ff; border-radius:3px; cursor:pointer; font-size:0.7rem;">
                                <span style="color:#94a3b8; cursor:grab; font-size:0.8rem; text-align:center;">☰</span>
                                <input type="checkbox" checked onclick="event.stopPropagation(); App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();" style="margin:0; cursor:pointer;">
                                <span style="font-weight:500; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                                      onclick="App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();">${e.nombre}</span>
                                <span style="font-size:0.55rem; color:var(--text-muted); font-family:monospace; text-align:right;">#${idx+1}</span>
                            </div>`;
                    }
                });
                html += `<div style="height:1px; background:var(--border); margin:4px 0;"></div>`;
            }

            // EMPLEADOS NO SELECCIONADOS
            const unselectedEmps = App.data.empleados
                .filter(e => e.active !== false && !App.uiState.exportEmps.includes(e.id))
                .sort((a,b) => a.customOrder - b.customOrder);
            if(unselectedEmps.length > 0) {
                unselectedEmps.forEach(e => {
                    html += `
                        <div onclick="App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();"
                             style="display:grid; grid-template-columns:14px 18px 1fr; gap:4px; align-items:center;
                                    padding:3px 5px; border:1px solid #e2e8f0; background:#fafafa; border-radius:3px; cursor:pointer; font-size:0.7rem; opacity:0.6;">
                            <span></span>
                            <input type="checkbox" onclick="event.stopPropagation(); App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();" style="margin:0; cursor:pointer;">
                            <span style="color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.nombre}</span>
                        </div>`;
                });
            } else if(App.uiState.exportEmps.length === 0) {
                html += `<div style="text-align:center; padding:15px; color:var(--text-muted); font-size:0.7rem;">⚠️ Ningún empleado<br>seleccionado</div>`;
            }

            html += `
                                    </div>
                                </div>

                                <!-- Botón Master Data -->
                                <button class="btn btn-primary" onclick="App.logic.exportMasterData()"
                                        style="width:100%; font-size:0.78rem; padding:10px; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:700; border-radius:6px;">
                                    <span style="font-size:1rem;">📥</span> Master Data (.xlsx)
                                </button>
                            </div>

                            <!-- Sub-col dcha: preview -->
                            <div>
                                <div style="font-size:0.7rem; font-weight:700; color:#1e293b; margin-bottom:8px; padding-bottom:6px; border-bottom:1px solid var(--border);">
                                    👁️ Vista Previa — Horario Eficiente
                                </div>
                                <div style="background:#f0fdf4; padding:5px 8px; margin-bottom:8px; border-left:3px solid #10b981; border-radius:3px; font-size:0.62rem; color:#166534;">
                                    ✓ Listo para pegar en la primera casilla del mismo día en el horario eficiente
                                </div>
                                <div id="export-preview" style="overflow:auto; max-height:560px; font-size:0.65rem;"></div>
                            </div>

                        </div><!-- /grid interno -->
                    </div><!-- /tarjeta B -->

                </div><!-- /grid tarjetas -->
            </div><!-- /wrapper -->
            `;

            c.innerHTML = html;
            App.ui.updateExportPreview();
        },
        
        updateExportPreview: function() {
            const container = document.getElementById('export-preview');
            if(!container) return;
            
            const start = App.uiState.exportStartDate;
            const end = App.uiState.exportEndDate;
            const empIds = App.uiState.exportEmps;
            
            if(!start || !end || empIds.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">
                    <div style="font-size:2rem; margin-bottom:10px;">📋</div>
                    <div style="font-size:0.75rem;">Selecciona empleados y fechas<br>para ver la preview</div>
                </div>`;
                return;
            }
            
            // Calcular días a mostrar (hasta 7 días)
            const startDate = new Date(start);
            const endDate = new Date(end);
            const days = [];
            let current = new Date(startDate);
            let count = 0;
            while(current <= endDate && count < 7) { // Max 7 días en preview
                days.push(current.toISOString().slice(0,10));
                current.setDate(current.getDate() + 1);
                count++;
            }
            
            const totalDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            const realEmps = empIds.filter(i => typeof i === 'string').length;
            
            let html = `<div style="font-size:0.65rem; color:var(--text-muted); margin-bottom:8px; padding:6px; background:#f8fafc; border-radius:3px; text-align:center;">
                📅 ${totalDays} día(s) | 👥 ${realEmps} empleado(s) | Mostrando ${days.length} día(s)
            </div>`;
            
            days.forEach(date => {
                const dayName = Utils.getDayName(date);
                const [year, month, day] = date.split('-');
                const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const monthName = monthNames[parseInt(month) - 1];
                
                html += `<div style="margin-bottom:15px; border:1px solid var(--border); border-radius:4px; overflow:hidden;">
                    <div style="background:#0f172a; color:white; padding:6px 10px; font-weight:700; font-size:0.7rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>${dayName} ${day} - ${monthName} ${year}</span>
                        <button onclick="App.logic.copyDayGrid('${date}')" 
                                id="copy-btn-${date}"
                                style="background:#10b981; color:white; border:none; padding:4px 10px; border-radius:3px; cursor:pointer; font-size:0.65rem; font-weight:700; transition:0.2s;">
                            📋 Copiar
                        </button>
                    </div>
                    <div style="overflow-x:auto;">
                        <table style="width:100%; border-collapse:collapse; font-size:0.55rem;">
                            <thead>
                                <tr style="background:#f1f5f9;">
                                    <th style="padding:2px 3px; text-align:left; border:1px solid var(--border); min-width:50px; position:sticky; left:0; background:#f1f5f9; z-index:2;">Emp</th>`;
                
                // Horas de 9:30 a 22:00 (26 slots de 30 min)
                for(let i=0; i<26; i++) {
                    const h = 9 + Math.floor((30 + i*30) / 60);
                    const m = (30 + i*30) % 60;
                    const label = `${h}:${m.toString().padStart(2,'0')}`;
                    html += `<th style="padding:2px 1px; text-align:center; border:1px solid var(--border); font-family:monospace; font-size:0.5rem; writing-mode:vertical-lr; transform:rotate(180deg);">${label}</th>`;
                }
                
                html += `</tr></thead><tbody>`;
                
                // Filas de empleados y gaps
                empIds.forEach(item => {
                    // Detectar si es un gap
                    const isGap = typeof item === 'object' && item.type === 'gap';
                    
                    if(isGap) {
                        // Renderizar GAP como fila vacía
                        const gapName = item.name || '';
                        html += `<tr style="border-bottom:1px solid var(--border); background:#fafafa;">
                            <td style="padding:2px 3px; border:1px solid var(--border); font-weight:500; font-style:italic; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px; position:sticky; left:0; background:#fafafa; z-index:1;">${gapName}</td>`;
                        
                        // Todas las celdas vacías
                        for(let i=0; i<26; i++) {
                            html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:#fafafa;"></td>`;
                        }
                        html += `</tr>`;
                        return;
                    }
                    
                    // Renderizar EMPLEADO normal
                    const emp = App.data.empleados.find(e => e.id === item);
                    if(!emp) return;
                    
                    const shiftId = App.data.schedule[date] ? App.data.schedule[date][item] : null;
                    const shift = shiftId ? Utils.getShift(shiftId) : null;
                    
                    html += `<tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:2px 3px; border:1px solid var(--border); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px; position:sticky; left:0; background:white; z-index:1;">${emp.nombre}</td>`;
                    
                    // Si es turno fijo, poner letra en primera celda
                    if(shift && shift.fixed) {
                        html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:${shift.color}20; font-weight:700; font-size:0.7rem; color:${shift.color};">${shift.code}</td>`;
                        // Resto de celdas vacías
                        for(let i=1; i<26; i++) {
                            html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:white;"></td>`;
                        }
                    } else {
                        // Celdas por cada slot de 30 min (turno normal)
                        for(let i=0; i<26; i++) {
                            const slotMin = 9*60 + 30 + (i*30); // Minutos desde medianoche
                            let mark = '';
                            
                            if(shift && shift.start && shift.end) {
                                const [sh, sm] = shift.start.split(':').map(Number);
                                const [eh, em] = shift.end.split(':').map(Number);
                                const startMin = sh * 60 + sm;
                                const endMin = eh * 60 + em;
                                
                                // Check if working at this slot
                                let isWorking = slotMin >= startMin && slotMin < endMin;
                                
                                // Check break
                                if(isWorking && shift.breakStart && shift.breakEnd) {
                                    const [bsh, bsm] = shift.breakStart.split(':').map(Number);
                                    const [beh, bem] = shift.breakEnd.split(':').map(Number);
                                    const breakStartMin = bsh * 60 + bsm;
                                    const breakEndMin = beh * 60 + bem;
                                    if(slotMin >= breakStartMin && slotMin < breakEndMin) {
                                        isWorking = false;
                                    }
                                }
                                
                                if(isWorking) mark = 'X';
                            }
                            
                            const bgColor = mark ? '#dbeafe' : 'white';
                            html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:${bgColor}; font-weight:700; font-size:0.6rem;">${mark}</td>`;
                        }
                    }
                    
                    html += `</tr>`;
                });
                
                html += `</tbody></table></div></div>`;
            });
            
            container.innerHTML = html;
        },

        // --- PLANNER ---
});
