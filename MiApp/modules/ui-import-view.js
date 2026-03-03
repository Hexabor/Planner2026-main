// ============================================================
// UI: Vistas de importación desde Excel
// ============================================================

Object.assign(App.ui, {
        renderImport: function(c) {
            const state = App.uiState.importState || {step: 'paste'};
            
            if (state.step === 'paste') {
                c.innerHTML = `
                    <div style="max-width:900px; margin:0 auto; background:white; padding:30px; border-radius:8px; border:1px solid #e2e8f0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                            <h2 style="margin:0;">📥 Importar Planificación desde Excel</h2>
                            <button class="btn" style="background:#f0f9ff; color:#1e40af; border:1px solid #bfdbfe; padding:8px 16px; display:flex; align-items:center; gap:6px;" onclick="document.getElementById('import-help-modal').style.display='flex'">
                                ❓ ¿Cómo copiar desde Excel?
                            </button>
                        </div>
                        
                        <p style="color:#64748b; margin-bottom:25px;">
                            Copia todo el contenido de tu Excel y pégalo aquí. El sistema detectará automáticamente los turnos.
                        </p>
                        
                        <div class="form-group">
                            <label style="font-weight:600; margin-bottom:8px; display:block;">Datos de Excel (TSV):</label>
                            <textarea id="import-text" style="width:100%; height:300px; font-family:monospace; font-size:0.85rem; padding:12px; border-radius:6px; border:2px solid #e2e8f0;" placeholder="Pega aquí todo el contenido de tu Excel (Ctrl+V)..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label style="font-weight:600; margin-bottom:8px; display:block;">Semana destino:</label>
                            <select id="import-week" style="padding:10px; width:100%; border-radius:6px; border:1px solid #e2e8f0;">
                                ${App.logic.getWeekOptions(Utils.getMonday(new Date()))}
                            </select>
                            <p style="color:#64748b; font-size:0.9em; margin-top:6px;">
                                💡 Si tu Excel tiene la semana en el encabezado, se detectará automáticamente
                            </p>
                        </div>
                        
                        <div style="margin-bottom:25px; padding:15px; background:#f8fafc; border-radius:6px;">
                            <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                <input type="checkbox" id="import-mark-free" checked style="width:18px; height:18px;">
                                <span><strong>Marcar días sin turno como "L" (Libre)</strong></span>
                            </label>
                            <p style="color:#64748b; font-size:0.9em; margin:8px 0 0 26px;">
                                Recomendado para semanas pasadas. Los empleados sin turno se marcarán como libres.
                            </p>
                        </div>
                        
                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                            <button class="btn" style="background:white; color:#64748b; padding:12px 24px;" onclick="App.router.go('calendar')">
                                ❌ Cancelar
                            </button>
                            <button class="btn btn-primary" style="padding:12px 30px;" onclick="App.logic.importAnalyze()">
                                🔍 Analizar datos
                            </button>
                        </div>
                    </div>
                    
                    <!-- MODAL DE AYUDA -->
                    <div id="import-help-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.5); z-index:10000; align-items:center; justify-content:center;">
                        <div style="background:white; padding:30px; border-radius:12px; max-width:700px; max-height:90vh; overflow-y:auto; margin:20px;" onclick="event.stopPropagation()">
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                                <h3 style="margin:0; color:#1e40af;">📋 Cómo copiar desde Excel</h3>
                                <button class="btn" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#64748b;" onclick="document.getElementById('import-help-modal').style.display='none'">✕</button>
                            </div>
                            
                            <ol style="margin:10px 0; padding-left:20px; line-height:1.8;">
                                <li><strong>Abre tu Excel</strong> de planificación semanal</li>
                                <li><strong>Haz clic en el cuadro entre la columna A y la fila 1</strong> (esquina superior izquierda donde se cruzan los encabezados)
                                    <div style="margin:10px 0; padding:15px; background:#f8fafc; border-radius:4px; font-family:monospace; font-size:0.85em;">
                                        <pre style="margin:0;">    ┌─────┬─────┬─────┬─────┐
    │  ☑️ │  A  │  B  │  C  │
    └─────┴─────┴─────┴─────┘
      ↑
 Haz clic aquí</pre>
                                    </div>
                                    <em style="color:#64748b;">Esto selecciona toda la hoja de cálculo</em>
                                </li>
                                <li><strong>Copia todo</strong> con Ctrl+C (Cmd+C en Mac)</li>
                                <li><strong>Pega en el campo</strong> con Ctrl+V</li>
                            </ol>
                            
                            <div style="background:#fefce8; padding:12px; border-radius:4px; margin-top:15px; border-left:3px solid #eab308;">
                                <strong>💡 No te preocupes por el formato</strong><br>
                                El sistema automáticamente:
                                <ul style="margin:8px 0; padding-left:20px;">
                                    <li>Encuentra las franjas horarias (09:30, 10:00, etc.)</li>
                                    <li>Lee las marcas "X" para detectar turnos</li>
                                    <li>Ignora maquetación, resúmenes y datos extra</li>
                                    <li>Reconoce: <code>b</code> (baja), <code>v</code> (vacaciones), <code>r</code> (recuperación)</li>
                                </ul>
                            </div>
                            
                            <button class="btn btn-primary" style="width:100%; margin-top:20px; padding:12px;" onclick="document.getElementById('import-help-modal').style.display='none'">
                                Entendido
                            </button>
                        </div>
                    </div>
                `;
                
                // Cerrar modal al hacer clic fuera
                document.getElementById('import-help-modal').onclick = function(e) {
                    if (e.target === this) this.style.display = 'none';
                };
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
                    
                    <!-- Selector de semana con detección automática -->
                    <div style="background:#f0f9ff; padding:15px; border-radius:6px; margin-bottom:20px; border-left:3px solid #3b82f6;">
            `;
            
            if (detectedInfo) {
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
                        <div class="form-group" style="margin:0;">
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
                
                html += `
                    <div style="background:#f8fafc; padding:20px; border-radius:6px; border:1px solid #e2e8f0;">
                        <div style="font-weight:600; margin-bottom:12px; font-size:1rem;">
                            ${safeEmpName}
                        </div>
                        
                        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:8px 12px; background:white; border-radius:4px; border:2px solid ${mapping.action === 'create' ? '#2563eb' : '#e2e8f0'};">
                                <input type="radio" name="mapping_${empNameId}" value="create" 
                                    ${mapping.action === 'create' ? 'checked' : ''}
                                    onchange="App.logic.importSetMapping(\`${safeEmpName}\`, 'create', null)">
                                <span>✨ Crear nuevo empleado</span>
                            </label>
                            
                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:8px 12px; background:white; border-radius:4px; border:2px solid ${mapping.action === 'map' ? '#2563eb' : '#e2e8f0'};">
                                <input type="radio" name="mapping_${empNameId}" value="map"
                                    ${mapping.action === 'map' ? 'checked' : ''}
                                    onchange="App.logic.importSetMapping(\`${safeEmpName}\`, 'map', null)">
                                <span>🔗 Mapear a existente</span>
                            </label>
                            
                            <label style="display:flex; align-items:center; gap:6px; cursor:pointer; padding:8px 12px; background:white; border-radius:4px; border:2px solid ${mapping.action === 'ignore' ? '#2563eb' : '#e2e8f0'};">
                                <input type="radio" name="mapping_${empNameId}" value="ignore"
                                    ${mapping.action === 'ignore' ? 'checked' : ''}
                                    onchange="App.logic.importSetMapping(\`${safeEmpName}\`, 'ignore', null)">
                                <span>⏭️ Ignorar</span>
                            </label>
                        </div>
                        
                        ${mapping.action === 'map' ? `
                            <div style="margin-top:12px;">
                                <select id="target_${empNameId}" style="width:100%; padding:10px; border-radius:6px; border:1px solid #e2e8f0;"
                                    onchange="App.logic.importSetMapping(\`${safeEmpName}\`, 'map', this.value)">
                                    <option value="">Selecciona empleado...</option>
                                    ${App.data.empleados.filter(e => e.active !== false).map(e => 
                                        `<option value="${e.id}" ${mapping.targetId === e.id ? 'selected' : ''}>${escapeHtml(e.nombre)} (${e.rol})</option>`
                                    ).join('')}
                                </select>
                            </div>
                        ` : ''}
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
