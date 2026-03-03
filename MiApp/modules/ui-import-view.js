// ============================================================
// UI: Vistas de importación desde Excel
// ============================================================

Object.assign(App.ui, {
        renderImport: function(c) {
            const state = App.uiState.importState || {step: 'paste'};
            
            if (state.step === 'paste') {
                c.innerHTML = `
                    <div style="max-width:900px; margin:0 auto; background:white; padding:30px; border-radius:8px; border:1px solid #e2e8f0;">
                        <h2 style="margin:0 0 8px 0;">📥 Importar desde ROTA</h2>
                        
                        <div style="margin-bottom:20px;">
                            <button onclick="const d=document.getElementById('import-hint');const btn=this;if(d.style.display==='none'){d.style.display='block';btn.textContent='▲ Ocultar instrucciones'}else{d.style.display='none';btn.textContent='❓ ¿Cómo funciona?'}"
                                style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:0.85rem; font-weight:600; padding:0;">
                                ❓ ¿Cómo funciona?
                            </button>
                            <div id="import-hint" style="display:none; margin-top:10px; background:#fefce8; border:1px solid #fde047; border-radius:6px; padding:12px 16px; font-size:0.88rem; color:#713f12; line-height:1.7;">
                                Selecciona en el ROTA el área que quieras importar — un día, una semana, varios meses, lo que necesites. No tiene que ser el documento completo.<br>
                                Lo importante es que la selección incluya la cabecera del mes, la fila de días, la fila de fechas y las filas de los empleados que quieres traer.<br>
                                <span style="font-size:0.82rem; color:#92400e;">💡 Las columnas Emp., Horas y cualquier otra extra se ignoran solas.</span>
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <textarea id="import-text" style="width:100%; height:320px; font-family:monospace; font-size:0.85rem; padding:12px; border-radius:6px; border:2px solid #e2e8f0;" placeholder="Pega aquí el contenido copiado del ROTA (Ctrl+V)..."></textarea>
                        </div>
                        
                        <div style="margin-bottom:20px; padding:12px 15px; background:#f8fafc; border-radius:6px; border:1px solid #e2e8f0;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" id="import-mark-free" checked style="width:16px; height:16px;">
                                <span style="font-size:0.9rem;"><strong>Marcar días sin turno como "L" (Libre)</strong></span>
                            </label>
                            <p style="color:#64748b; font-size:0.82em; margin:5px 0 0 24px;">
                                Recomendado para semanas ya cerradas.
                            </p>
                        </div>
                        
                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                            <button class="btn" style="background:white; color:#64748b; padding:10px 20px;" onclick="App.router.go('planificador')">
                                Cancelar
                            </button>
                            <button class="btn btn-primary" style="padding:10px 24px;" onclick="App.logic.importAnalyze()">
                                🔍 Analizar
                            </button>
                        </div>
                    </div>
                `;
            } else if (state.step === 'preview') {
                this.renderImportPreview(c, state);
            } else if (state.step === 'mapping') {
                this.renderImportMapping(c, state);
            } else if (state.step === 'result') {
                this.renderImportResult(c, state);
            }
        },
        
        renderImportPreview: function(c, state) {
            const analyzed = state.analyzed;
            const currentDay = state.previewDay || 0;
            const dayData = analyzed.days[currentDay];
            const detectedInfo = state.detectedWeekInfo;
            
            let html = `
                <div style="max-width:1200px; margin:0 auto; background:white; padding:30px; border-radius:8px; border:1px solid #e2e8f0;">
                    <h2 style="margin-top:0">📋 Vista Previa de Importación</h2>
                    <p style="color:#64748b; margin-bottom:20px;">Revisa los turnos detectados antes de importar.</p>
                    
                    <!-- Semana / banner formato ROTA -->
                    <div style="background:#f0f9ff; padding:15px; border-radius:6px; margin-bottom:20px; border-left:3px solid #3b82f6;">
            `;

            if (state.isRota) {
                html += `
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span style="font-size:1.4rem;">📊</span>
                            <div>
                                <strong style="color:#1e40af;">Formato ROTA (mensual) — fechas del propio documento</strong>
                                <div style="color:#64748b; font-size:0.85em; margin-top:3px;">
                                    ${state.detectedWeekInfo.totalDays} días importados con sus fechas reales
                                </div>
                            </div>
                        </div>
                `;
            } else if (detectedInfo) {
                html += `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                            <span style="font-size:1.2rem;">📅</span>
                            <div>
                                <strong style="color:#1e40af;">Semana detectada automáticamente:</strong>
                                <div style="color:#64748b; font-size:0.9em; margin-top:2px;">
                                    Semana ${detectedInfo.number} (${detectedInfo.startDate} - ${detectedInfo.endDate}) → ${detectedInfo.isoWeek}
                                </div>
                            </div>
                        </div>
                `;
            } else {
                html += `
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
                            <span style="font-size:1.2rem;">⚠️</span>
                            <strong style="color:#64748b;">No se pudo detectar la semana automáticamente</strong>
                        </div>
                `;
            }
            
            html += `
                        <div class="form-group" style="margin:0;${state.isRota ? ' display:none;' : ''}">
                            <label style="font-weight:600; margin-bottom:8px; display:block; font-size:0.9em;">Semana destino:</label>
                            <select id="import-week-preview" style="padding:10px; width:100%; border-radius:6px; border:1px solid #cbd5e1;" onchange="App.logic.importChangeWeek(this.value)">
                                ${App.logic.getWeekOptions(state.selectedWeek)}
                            </select>
                            <p style="color:#64748b; font-size:0.85em; margin:6px 0 0 0;">
                                Puedes cambiar la semana destino si es necesario
                            </p>
                        </div>
                    </div>
                    
                    <!-- Navegación de días -->
                    <div style="display:flex; gap:8px; margin-bottom:20px; flex-wrap:wrap;">
            `;
            
            analyzed.days.forEach((day, idx) => {
                const isActive = idx === currentDay;
                const statusColor = day.warnings.length > 0 ? '#f59e0b' : '#10b981';
                html += `
                    <button class="btn" style="
                        background:${isActive ? '#2563eb' : 'white'}; 
                        color:${isActive ? 'white' : '#1e293b'}; 
                        border:2px solid ${isActive ? '#2563eb' : '#e2e8f0'};
                        padding:8px 16px;
                        cursor:pointer;
                        position:relative;
                    " onclick="App.logic.importPreviewDay(${idx})">
                        ${day.dayName}
                        <span style="
                            position:absolute; 
                            top:4px; 
                            right:4px; 
                            width:8px; 
                            height:8px; 
                            background:${statusColor}; 
                            border-radius:50%;
                        "></span>
                    </button>
                `;
            });
            
            html += `
                    </div>
                    
                    <!-- Información del día -->
                    <div style="background:#f8fafc; padding:15px; border-radius:6px; margin-bottom:20px;">
                        <h3 style="margin:0 0 10px 0; font-size:1.1rem;">${dayData.dayName} - ${dayData.date}</h3>
                        <div style="font-size:0.85rem; color:#64748b;">
                            ${dayData.assignments.length} turnos detectados
                            ${dayData.warnings.length > 0 ? `<span style="color:#f59e0b; margin-left:10px;">⚠️ ${dayData.warnings.length} advertencias</span>` : ''}
                        </div>
                    </div>
                    
                    <!-- Tabla de asignaciones -->
                    <div style="overflow-x:auto; margin-bottom:20px;">
                        <table style="width:100%; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f1f5f9; border-bottom:2px solid #e2e8f0;">
                                    <th style="padding:10px; text-align:left; font-size:0.85rem; color:#64748b;">Empleado</th>
                                    <th style="padding:10px; text-align:left; font-size:0.85rem; color:#64748b;">Turno Detectado</th>
                                    <th style="padding:10px; text-align:left; font-size:0.85rem; color:#64748b;">Horario</th>
                                    <th style="padding:10px; text-align:center; font-size:0.85rem; color:#64748b;">Estado</th>
                                </tr>
                            </thead>
                            <tbody>
            `;
            
            dayData.assignments.forEach(assignment => {
                const statusIcons = {
                    'exact': '✓',
                    'similar': '≈',
                    'custom': '⚠️',
                    'baja': 'B',
                    'vacaciones': 'V',
                    'recuperacion': 'R',
                    'festivo': 'F',
                    'libre': '-'
                };
                const statusColors = {
                    'exact': '#10b981',
                    'similar': '#3b82f6',
                    'custom': '#f59e0b',
                    'baja': '#ef4444',
                    'vacaciones': '#a855f7',
                    'recuperacion': '#22c55e',
                    'festivo': '#22c55e',
                    'libre': '#64748b'
                };
                const statusLabels = {
                    'exact': 'Turno existente',
                    'similar': 'Similar (±30min)',
                    'custom': 'Crear CUSTOM',
                    'baja': 'Baja médica',
                    'vacaciones': 'Vacaciones',
                    'recuperacion': 'Recuperación',
                    'festivo': 'Festivo',
                    'libre': 'Libre'
                };
                
                const icon = statusIcons[assignment.matchType] || '?';
                const color = statusColors[assignment.matchType] || '#64748b';
                const label = statusLabels[assignment.matchType] || 'Desconocido';
                
                html += `
                    <tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:10px; font-weight:600;">${assignment.empName}</td>
                        <td style="padding:10px; font-family:monospace; font-size:0.9rem;">${assignment.shiftCode || '-'}</td>
                        <td style="padding:10px; font-family:monospace; font-size:0.85rem; color:#64748b;">${assignment.timeRange || '-'}</td>
                        <td style="padding:10px; text-align:center;">
                            <span style="
                                background:${color}20; 
                                color:${color}; 
                                padding:4px 10px; 
                                border-radius:4px; 
                                font-size:0.75rem; 
                                font-weight:600;
                            ">${icon} ${label}</span>
                        </td>
                    </tr>
                `;
            });
            
            html += `
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Advertencias -->
            `;
            
            if (dayData.warnings.length > 0) {
                html += `
                    <div style="background:#fef3c7; border:1px solid #f59e0b; border-radius:6px; padding:15px; margin-bottom:20px;">
                        <div style="font-weight:600; margin-bottom:8px; color:#92400e;">⚠️ Advertencias:</div>
                        <ul style="margin:0; padding-left:20px; color:#78350f;">
                `;
                dayData.warnings.forEach(w => {
                    html += `<li style="margin-bottom:4px;">${w}</li>`;
                });
                html += `
                        </ul>
                    </div>
                `;
            }
            
            // Resumen general
            html += `
                    <div style="background:#f1f5f9; padding:15px; border-radius:6px; margin-bottom:20px;">
                        <h4 style="margin:0 0 10px 0;">Resumen de la importación:</h4>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px; font-size:0.85rem;">
                            <div><strong>${analyzed.stats.totalShifts}</strong> turnos totales</div>
                            <div><strong>${analyzed.stats.exactMatches}</strong> coincidencias exactas</div>
                            <div><strong>${analyzed.stats.customNeeded}</strong> turnos CUSTOM a crear</div>
                            <div><strong>${analyzed.stats.unknownEmps}</strong> empleados desconocidos</div>
                        </div>
                    </div>
                    
                    <!-- Botones de acción -->
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button class="btn" style="background:white; color:#64748b; padding:12px 24px;" onclick="App.logic.importCancel()">
                            ❌ Cancelar
                        </button>
            `;
            
            if (analyzed.stats.unknownEmps > 0) {
                html += `
                        <button class="btn btn-primary" style="padding:12px 24px;" onclick="App.logic.importGoToMapping()">
                            ➡️ Mapear empleados
                        </button>
                `;
            } else {
                html += `
                        <button class="btn btn-primary" style="padding:12px 24px;" onclick="App.logic.importApply()">
                            ✅ Importar todo
                        </button>
                `;
            }
            
            html += `
                    </div>
                </div>
            `;
            
            c.innerHTML = html;
        },
        
        renderImportMapping: function(c, state) {
            const analyzed = state.analyzed;
            const unknownEmps = analyzed.stats.unknownEmpNames;
            
            // Función helper para escapar HTML
            const escapeHtml = (str) => {
                return str.replace(/[&<>"']/g, (m) => ({
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                })[m]);
            };
            
            // Inicializar mappings si no existe
            if (!state.empMappings) {
                state.empMappings = {};
                unknownEmps.forEach(name => {
                    state.empMappings[name] = { action: 'create', targetId: null };
                });
            }
            
            let html = `
                <div style="max-width:900px; margin:0 auto; background:white; padding:30px; border-radius:8px; border:1px solid #e2e8f0;">
                    <h2 style="margin-top:0">👤 Mapear Empleados</h2>
                    <p style="color:#64748b; margin-bottom:25px;">
                        Se detectaron ${unknownEmps.length} empleados que no existen en el sistema. 
                        Elige qué hacer con cada uno:
                    </p>
                    
                    <div style="display:flex; flex-direction:column; gap:15px;">
            `;
            
            unknownEmps.forEach(empName => {
                const mapping = state.empMappings[empName];
                const safeEmpName = escapeHtml(empName);
                const empNameId = empName.replace(/[^a-zA-Z0-9]/g, '_');

                const radioBtn = (value, label, checked) => `
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:7px 12px; background:white; border-radius:4px; border:2px solid ${checked ? '#2563eb' : '#e2e8f0'}; transition:border-color 0.15s;" id="lbl_${empNameId}_${value}">
                        <input type="radio" name="mapping_${empNameId}" value="${value}" ${checked ? 'checked' : ''}
                            onchange="
                                App.logic.importSetMapping(\`${safeEmpName}\`, '${value}', null, null);
                                ['create','rename','map','ignore'].forEach(v => {
                                    const l = document.getElementById('lbl_${empNameId}_' + v);
                                    if(l) l.style.borderColor = (v === '${value}') ? '#2563eb' : '#e2e8f0';
                                });
                                document.getElementById('rename_${empNameId}').style.display = ('${value}' === 'rename') ? 'block' : 'none';
                                document.getElementById('map_${empNameId}').style.display = ('${value}' === 'map') ? 'block' : 'none';
                            ">
                        <span>${label}</span>
                    </label>`;

                html += `
                    <div style="background:#f8fafc; padding:16px 20px; border-radius:6px; border:1px solid #e2e8f0;">
                        <div style="font-weight:600; margin-bottom:10px; font-size:0.95rem; color:#1e293b;">${safeEmpName}</div>
                        <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:0;">
                            ${radioBtn('create', '✨ Crear', mapping.action === 'create')}
                            ${radioBtn('rename', '✏️ Renombrar', mapping.action === 'rename')}
                            ${radioBtn('map',    '🔗 Mapear a existente', mapping.action === 'map')}
                            ${radioBtn('ignore', '⏭️ Ignorar', mapping.action === 'ignore')}
                        </div>

                        <div id="rename_${empNameId}" style="margin-top:10px; display:${mapping.action === 'rename' ? 'block' : 'none'};">
                            <label style="display:block; font-size:0.78rem; font-weight:600; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Nombre definitivo</label>
                            <input type="text" id="newname_${empNameId}"
                                value="${escapeHtml(mapping.newName || empName)}"
                                style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9rem;"
                                oninput="App.logic.importSetMapping(\`${safeEmpName}\`, 'rename', null, this.value)">
                        </div>

                        <div id="map_${empNameId}" style="margin-top:10px; display:${mapping.action === 'map' ? 'block' : 'none'};">
                            <label style="display:block; font-size:0.78rem; font-weight:600; color:#64748b; margin-bottom:4px; text-transform:uppercase;">Empleado existente</label>
                            <select style="width:100%; padding:8px 10px; border:1px solid #cbd5e1; border-radius:4px; font-size:0.9rem;"
                                onchange="App.logic.importSetMapping(\`${safeEmpName}\`, 'map', this.value, null)">
                                <option value="">— Selecciona —</option>
                                ${App.data.empleados.filter(e => e.active !== false).sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(e =>
                                    `<option value="${e.id}" ${mapping.targetId === e.id ? 'selected' : ''}>${escapeHtml(e.nombre)} (${e.rol})</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                    
                    <div style="display:flex; gap:10px; justify-content:flex-end; margin-top:30px; padding-top:20px; border-top:2px solid #e2e8f0;">
                        <button class="btn" style="background:white; color:#64748b; padding:12px 24px;" onclick="App.logic.importCancel()">
                            ❌ Cancelar
                        </button>
                        <button class="btn" style="background:#64748b; color:white; padding:12px 24px;" onclick="App.logic.importBackToPreview()">
                            ← Volver a preview
                        </button>
                        <button class="btn btn-primary" style="padding:12px 24px;" onclick="App.logic.importApply()">
                            ✅ Importar con mapeo
                        </button>
                    </div>
                </div>
            `;
            
            c.innerHTML = html;
        },
        
        renderImportResult: function(c, state) {
            const result = state.result;
            
            c.innerHTML = `
                <div style="max-width:700px; margin:50px auto; background:white; padding:40px; border-radius:8px; border:1px solid #e2e8f0; text-align:center;">
                    <div style="font-size:4rem; margin-bottom:20px;">✅</div>
                    <h2 style="margin:0 0 10px 0; color:#10b981;">Importación Completada</h2>
                    <p style="color:#64748b; margin-bottom:30px;">Los turnos se han importado correctamente al planificador.</p>
                    
                    <div style="background:#f1f5f9; padding:20px; border-radius:6px; margin-bottom:30px; text-align:left;">
                        <h4 style="margin:0 0 15px 0;">Resumen:</h4>
                        <div style="display:grid; gap:8px; font-size:0.9rem;">
                            <div>• <strong>${result.shiftsCreated}</strong> turnos asignados</div>
                            <div>• <strong>${result.customCreated}</strong> turnos CUSTOM detectados</div>
                            ${result.empsCreated > 0 ? `<div>• <strong>${result.empsCreated}</strong> empleados nuevos creados</div>` : ''}
                            ${result.freesMarked > 0 ? `<div>• <strong>${result.freesMarked}</strong> días libres marcados</div>` : ''}
                        </div>
                    </div>
                    
                    <div style="display:flex; gap:10px; justify-content:center;">
                        <button class="btn" style="background:white; color:#3b82f6; border:2px solid #3b82f6; padding:12px 30px;" onclick="App.logic.importReset()">
                            📥 Importar otra semana
                        </button>
                        <button class="btn btn-primary" style="padding:12px 30px;" onclick="App.router.go('planificador')">
                            📅 Ver Planificador
                        </button>
                    </div>
                </div>
            `;
        },

        // --- CONFIG ---
        // --- CONFIG ---
});
