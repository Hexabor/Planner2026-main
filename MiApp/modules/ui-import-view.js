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
                                Lo importante es que la selección incluya la cabecera del mes, la fila de días, la fila de fechas y la columna con los nombres del staff que quieres traer.<br>
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
            const analyzed  = state.analyzed;
            const currentDay = state.previewDay || 0;
            const dayData   = analyzed.days[currentDay];
            const detectedInfo = state.detectedWeekInfo;

            const STATUS_INFO = {
                empty:   { icon: '🟢', label: 'Vacío',     disabled: false },
                partial: { icon: '🟡', label: 'Parcial',   disabled: false },
                full:    { icon: '🔴', label: 'Completo',  disabled: true  },
                locked:  { icon: '🔒', label: 'Bloqueado', disabled: true  }
            };
            const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const totalSelected = Object.values(state.selectedDays || {}).filter(Boolean).length;

            // ── Badge de formato para el header ─────────────────────────
            let formatBadge = '';
            if (state.isRota) {
                formatBadge = `<span style="background:#dbeafe;color:#1e40af;padding:4px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">📊 ROTA · ${state.detectedWeekInfo.totalDays} días</span>`;
            } else if (detectedInfo) {
                formatBadge = `<span style="background:#f0fdf4;color:#166534;padding:4px 10px;border-radius:12px;font-size:0.75rem;font-weight:600;">📅 ${detectedInfo.isoWeek}</span>`;
            }

            // ── Select de semana (solo formato semanal) ──────────────────
            let weekSelect = '';
            if (!state.isRota) {
                weekSelect = `<div style="margin-bottom:12px;">
                    <label style="font-size:0.78rem;font-weight:600;color:#64748b;margin-right:8px;">Semana destino:</label>
                    <select id="import-week-preview" style="padding:5px 8px;border-radius:6px;border:1px solid #cbd5e1;font-size:0.85rem;" onchange="App.logic.importChangeWeek(this.value)">
                        ${App.logic.getWeekOptions(state.selectedWeek)}
                    </select>
                </div>`;
            }

            // ── COLUMNA IZQUIERDA: lista de días ─────────────────────────
            const weekGroups = {};
            analyzed.days.forEach(day => {
                const wk = Utils.getWeekCode(day.date);
                if (!weekGroups[wk]) weekGroups[wk] = [];
                weekGroups[wk].push(day);
            });

            let leftCol = `<div style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 370px);position:sticky;top:0;">
                <div style="background:#f8fafc;padding:8px 12px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;flex-shrink:0;">
                    <span style="font-weight:700;font-size:0.82rem;color:#1e293b;">📅 Días a importar</span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.logic.importSelectAll('all')" style="padding:2px 8px;border-radius:4px;font-size:0.7rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;">Todos</button>
                        <button onclick="App.logic.importSelectAll('none')" style="padding:2px 8px;border-radius:4px;font-size:0.7rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;">Ninguno</button>
                    </div>
                </div>
                <div style="overflow-y:auto;flex:1;padding:8px 10px;">`;

            Object.entries(weekGroups).forEach(([wk, days]) => {
                const weekDatesStr = days.map(d => d.date).join(',');
                leftCol += `<div style="margin-bottom:10px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                        <span style="font-size:0.72rem;font-weight:700;color:#64748b;letter-spacing:0.04em;">${wk}</span>
                        <div style="display:flex;gap:3px;">
                            <button onclick="App.logic.importSelectWeek('${weekDatesStr}','all')" style="padding:1px 6px;border-radius:3px;font-size:0.65rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;">Todos</button>
                            <button onclick="App.logic.importSelectWeek('${weekDatesStr}','empty')" style="padding:1px 6px;border-radius:3px;font-size:0.65rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;">Vacíos</button>
                            <button onclick="App.logic.importSelectWeek('${weekDatesStr}','none')" style="padding:1px 6px;border-radius:3px;font-size:0.65rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;">Ninguno</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-direction:column;gap:3px;">`;

                days.forEach(day => {
                    const globalIdx = analyzed.days.findIndex(d => d.date === day.date);
                    const isActive  = globalIdx === currentDay;
                    const status    = App.logic.importGetDayStatus(day.date);
                    const info      = STATUS_INFO[status] || STATUS_INFO.empty;
                    const isUnlocked = (state.unlockedDays || {})[day.date];
                    const isDisabled = info.disabled && !isUnlocked;
                    const isChecked  = (state.selectedDays || {})[day.date];
                    const d = new Date(day.date + 'T00:00:00');
                    const dayName = DAY_ES[d.getDay()];
                    const rowBg     = isActive ? '#dbeafe' : (isChecked ? '#eff6ff' : '#fafafa');
                    const rowBorder = isActive ? '#93c5fd' : (isChecked ? '#bfdbfe' : '#f1f5f9');

                    leftCol += `<div onclick="App.logic.importPreviewDay(${globalIdx})"
                        style="display:flex;align-items:center;gap:7px;padding:4px 6px;border-radius:4px;background:${rowBg};border:1px solid ${rowBorder};cursor:pointer;"
                        onmouseover="if(!${isActive})this.style.background='#e0f2fe'"
                        onmouseout="this.style.background='${rowBg}'">
                        <input type="checkbox" ${isChecked?'checked':''} ${isDisabled?'disabled':''}
                            onclick="event.stopPropagation()"
                            onchange="App.logic.importToggleDay('${day.date}')"
                            style="width:13px;height:13px;accent-color:#2563eb;cursor:${isDisabled?'not-allowed':'pointer'};flex-shrink:0;">
                        <span style="font-size:0.78rem;font-weight:600;min-width:24px;color:${isActive?'#1d4ed8':isDisabled?'#94a3b8':'#1e293b'};">${dayName}</span>
                        <span style="font-size:0.75rem;color:${isActive?'#1d4ed8':'#64748b'};flex:1;">${Utils.formatDateES(day.date)}</span>
                        <span style="font-size:0.7rem;">${info.icon}</span>
                        ${isActive ? '<span style="font-size:0.6rem;font-weight:700;color:#2563eb;">▶</span>' : ''}
                        ${isDisabled ? `<span onclick="event.stopPropagation();App.logic.importUnlockDay('${day.date}')"
                            title="Día protegido — clic para habilitar importación"
                            style="font-size:0.82rem;cursor:pointer;flex-shrink:0;opacity:0.5;">🔒</span>` : ''}
                    </div>`;
                });
                leftCol += `</div></div>`;
            });
            leftCol += `</div></div>`;

            // ── COLUMNA DERECHA: detalle del día ─────────────────────────
            const statusIcons  = { exact:'✓', similar:'≈', custom:'⚠️', baja:'B', vacaciones:'V', recuperacion:'R', festivo:'F', libre:'-' };
            const statusColors = { exact:'#10b981', similar:'#3b82f6', custom:'#f59e0b', baja:'#ef4444', vacaciones:'#a855f7', recuperacion:'#22c55e', festivo:'#22c55e', libre:'#64748b' };
            const statusLabels = { exact:'Turno existente', similar:'Similar (±30min)', custom:'Crear CUSTOM', baja:'Baja médica', vacaciones:'Vacaciones', recuperacion:'Recuperación', festivo:'Festivo', libre:'Libre' };

            let rightCol = `<div style="background:#f8fafc;padding:11px 14px;border-radius:6px;margin-bottom:12px;border:1px solid #e2e8f0;">
                <div style="font-weight:700;font-size:0.95rem;color:#1e293b;margin-bottom:2px;">${dayData.dayName} · ${Utils.formatDateES(dayData.date)}</div>
                <div style="font-size:0.8rem;color:#64748b;">
                    ${dayData.assignments.length} turno${dayData.assignments.length!==1?'s':''} detectado${dayData.assignments.length!==1?'s':''}
                    ${dayData.warnings.length > 0 ? `<span style="color:#f59e0b;margin-left:8px;">⚠️ ${dayData.warnings.length} advertencia${dayData.warnings.length!==1?'s':''}</span>` : ''}
                </div>
            </div>`;

            if (dayData.assignments.length > 0) {
                rightCol += `<div style="overflow-x:auto;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f1f5f9;border-bottom:2px solid #e2e8f0;">
                            <th style="padding:8px 10px;text-align:left;font-size:0.78rem;color:#64748b;">Empleado</th>
                            <th style="padding:8px 10px;text-align:left;font-size:0.78rem;color:#64748b;">Turno</th>
                            <th style="padding:8px 10px;text-align:left;font-size:0.78rem;color:#64748b;">Horario</th>
                            <th style="padding:8px 10px;text-align:center;font-size:0.78rem;color:#64748b;">Estado</th>
                        </tr></thead><tbody>`;
                dayData.assignments.forEach(a => {
                    const icon  = statusIcons[a.matchType]  || '?';
                    const color = statusColors[a.matchType] || '#64748b';
                    const label = statusLabels[a.matchType] || 'Desconocido';
                    rightCol += `<tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="padding:8px 10px;font-weight:600;font-size:0.86rem;">${state.firstNameOnly ? a.empName.split(" ")[0] : a.empName}</td>
                        <td style="padding:8px 10px;font-family:monospace;font-size:0.86rem;">${a.shiftCode || '-'}</td>
                        <td style="padding:8px 10px;font-family:monospace;font-size:0.8rem;color:#64748b;">${a.timeRange || '-'}</td>
                        <td style="padding:8px 10px;text-align:center;">
                            <span style="background:${color}20;color:${color};padding:3px 8px;border-radius:4px;font-size:0.7rem;font-weight:600;">${icon} ${label}</span>
                        </td>
                    </tr>`;
                });
                rightCol += `</tbody></table></div>`;
            } else {
                rightCol += `<div style="text-align:center;padding:30px;color:#94a3b8;font-size:0.86rem;">Sin turnos para este día</div>`;
            }

            if (dayData.warnings.length > 0) {
                rightCol += `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;padding:11px 14px;margin-top:10px;">
                    <div style="font-weight:600;margin-bottom:5px;color:#92400e;font-size:0.85rem;">⚠️ Advertencias</div>
                    <ul style="margin:0;padding-left:17px;color:#78350f;font-size:0.81rem;">`;
                dayData.warnings.forEach(w => { rightCol += `<li style="margin-bottom:2px;">${w}</li>`; });
                rightCol += `</ul></div>`;
            }

            // ── MONTAJE FINAL ─────────────────────────────────────────────
            let html = `<div style="max-width:1200px;margin:0 auto;background:white;padding:20px 24px;border-radius:8px;border:1px solid #e2e8f0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;gap:12px;">
                    <h2 style="margin:0;font-size:1.15rem;">📋 Vista Previa de Importación</h2>
                    <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
                        ${formatBadge}
                        <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;font-size:0.78rem;color:#475569;white-space:nowrap;">
                            <input type="checkbox" ${state.firstNameOnly ? 'checked' : ''}
                                onchange="App.uiState.importState.firstNameOnly=this.checked; App.router.go('import');"
                                style="width:13px;height:13px;accent-color:#2563eb;">
                            Solo primer nombre
                        </label>
                    </div>
                </div>
                ${weekSelect}
                <div style="display:grid;grid-template-columns:260px 1fr;gap:16px;align-items:start;margin-bottom:16px;">
                    ${leftCol}
                    <div style="position:sticky;top:0;">${rightCol}</div>
                </div>
                <div style="background:#f1f5f9;padding:12px 16px;border-radius:6px;margin-bottom:14px;">
                    <div style="font-weight:600;font-size:0.85rem;margin-bottom:7px;">Resumen</div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:6px;font-size:0.83rem;">
                        <div><strong>${analyzed.stats.totalShifts}</strong> turnos totales</div>
                        <div><strong>${analyzed.stats.exactMatches}</strong> coincidencias exactas</div>
                        <div><strong>${analyzed.stats.customNeeded}</strong> CUSTOM a crear</div>
                        <div><strong>${analyzed.stats.unknownEmps}</strong> empleados desconocidos</div>
                    </div>
                </div>
                <div style="display:flex;gap:10px;justify-content:flex-end;">
                    <button class="btn" style="background:white;color:#64748b;padding:10px 22px;" onclick="App.logic.importCancel()">❌ Cancelar</button>`;

            if (analyzed.stats.unknownEmps > 0) {
                html += `<button class="btn btn-primary" style="padding:10px 22px;" onclick="App.logic.importGoToMapping()">➡️ Mapear empleados</button>`;
            } else {
                html += `<button class="btn btn-primary" style="padding:10px 22px;" onclick="App.logic.importApply()">✅ Importar seleccionados (${totalSelected})</button>`;
            }

            html += `</div></div>`;

            c.innerHTML = html;
        },

                renderImportMapping: function(c, state) {
            const analyzed    = state.analyzed;
            const unknownEmps = analyzed.stats.unknownEmpNames;

            const esc = (str) => str.replace(/[&<>"']/g, m =>
                ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[m]);

            if (!state.empMappings) {
                state.empMappings = {};
                unknownEmps.forEach(name => {
                    // newName propuesto para rename: si firstNameOnly, primer nombre; si no, nombre completo
                    // Para 'create', siempre se usará el nombre completo original a menos que se edite
                    const proposed = state.firstNameOnly ? name.split(' ')[0] : name;
                    state.empMappings[name] = { action: 'create', targetId: null, newName: name, _proposed: proposed };
                });
            }

            // Opciones de acción: pill-buttons en fila
            const ACTIONS = [
                { value: 'create', label: 'Crear nuevo',       color: '#2563eb' },
                { value: 'rename', label: 'Renombrar',         color: '#7c3aed' },
                { value: 'map',    label: 'Mapear existente',  color: '#0891b2' },
                { value: 'ignore', label: 'Ignorar',           color: '#94a3b8' },
            ];

            let rows = '';
            unknownEmps.forEach(empName => {
                const mapping   = state.empMappings[empName];
                const safeEmp   = esc(empName);
                const uid       = empName.replace(/[^a-zA-Z0-9]/g, '_');
                const act       = mapping.action;

                const pills = ACTIONS.map(a => {
                    const active = act === a.value;
                    return `<button type="button"
                        onclick="App.logic.importSetMapping(\`${safeEmp}\`,'${a.value}',null,null);
                                 document.getElementById('rename_${uid}').style.display=('${a.value}'==='rename'?'flex':'none');
                                 document.getElementById('map_${uid}').style.display=('${a.value}'==='map'?'block':'none');
                                 this.closest('.map-row').querySelectorAll('.action-pill').forEach(b=>{
                                     const v=b.dataset.v;
                                     b.style.background=v==='${a.value}'?'${a.color}':'white';
                                     b.style.color=v==='${a.value}'?'white':'#64748b';
                                     b.style.borderColor=v==='${a.value}'?'${a.color}':'#e2e8f0';
                                 });"
                        data-v="${a.value}" class="action-pill"
                        style="padding:5px 14px;border-radius:20px;font-size:0.78rem;font-weight:600;
                               border:1.5px solid ${active ? a.color : '#e2e8f0'};
                               background:${active ? a.color : 'white'};
                               color:${active ? 'white' : '#64748b'};
                               cursor:pointer;white-space:nowrap;transition:all 0.12s;">
                        ${a.label}
                    </button>`;
                }).join('');

                // Panel renombrar
                const firstOnly  = esc(empName.split(' ')[0]);
                const parts      = empName.split(' ');
                const firstInit  = esc(parts[0] + (parts[1] ? ' ' + parts[1][0] + '.' : ''));
                const renameVal  = esc(mapping.newName || (state.firstNameOnly ? empName.split(' ')[0] : empName));

                rows += `
                <div class="map-row" style="display:grid;grid-template-columns:240px 1fr;gap:0;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;background:white;">
                    <div style="padding:14px 16px;background:#f8fafc;border-right:1px solid #e2e8f0;display:flex;align-items:flex-start;">
                        <div>
                            <div style="font-weight:700;font-size:0.88rem;color:#1e293b;line-height:1.3;">${safeEmp}</div>
                        </div>
                    </div>
                    <div style="padding:12px 16px;">
                        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:0;">
                            ${pills}
                        </div>

                        <div id="rename_${uid}" style="margin-top:10px;display:${act==='rename'?'flex':'none'};gap:8px;align-items:center;flex-wrap:wrap;">
                            <input type="text" id="newname_${uid}"
                                value="${esc(mapping._proposed || mapping.newName || (state.firstNameOnly ? empName.split(' ')[0] : empName))}"
                                placeholder="Nombre definitivo"
                                style="flex:1;min-width:160px;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;"
                                oninput="App.logic.importSetMapping(\`${safeEmp}\`,'rename',null,this.value)">
                            <button type="button"
                                style="padding:5px 10px;border-radius:6px;font-size:0.72rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;white-space:nowrap;"
                                onclick="(function(){var v='${firstOnly}';document.getElementById('newname_${uid}').value=v;App.logic.importSetMapping(\`${safeEmp}\`,'rename',null,v);})()">
                                Solo nombre
                            </button>
                            <button type="button"
                                style="padding:5px 10px;border-radius:6px;font-size:0.72rem;border:1px solid #e2e8f0;background:white;cursor:pointer;color:#475569;white-space:nowrap;"
                                onclick="(function(){var v='${firstInit}';document.getElementById('newname_${uid}').value=v;App.logic.importSetMapping(\`${safeEmp}\`,'rename',null,v);})()">
                                Nombre + inicial
                            </button>
                        </div>

                        <div id="map_${uid}" style="margin-top:10px;display:${act==='map'?'block':'none'};">
                            <select style="width:100%;padding:6px 10px;border:1px solid #cbd5e1;border-radius:6px;font-size:0.85rem;"
                                onchange="App.logic.importSetMapping(\`${safeEmp}\`,'map',this.value,null)">
                                <option value="">— Selecciona empleado existente —</option>
                                ${App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.nombre.localeCompare(b.nombre)).map(e=>
                                    `<option value="${e.id}" ${mapping.targetId===e.id?'selected':''}>${esc(e.nombre)} (${e.rol})</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                </div>`;
            });

            c.innerHTML = `
                <div style="max-width:860px;margin:0 auto;background:white;padding:24px 28px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:baseline;gap:10px;margin-bottom:6px;">
                        <h2 style="margin:0;font-size:1.15rem;">👤 Mapear Empleados</h2>
                        <span style="background:#fef3c7;color:#92400e;padding:2px 10px;border-radius:10px;font-size:0.75rem;font-weight:600;">${unknownEmps.length} sin identificar</span>
                    </div>
                    <p style="color:#64748b;margin:0 0 18px 0;font-size:0.84rem;">Elige qué hacer con cada nombre del archivo que no coincide con ningún empleado.</p>
                    <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:24px;">
                        ${rows}
                    </div>
                    <div style="display:flex;gap:10px;justify-content:flex-end;padding-top:16px;border-top:1px solid #e2e8f0;">
                        <button class="btn" style="background:white;color:#64748b;padding:10px 20px;" onclick="App.logic.importCancel()">❌ Cancelar</button>
                        <button class="btn" style="background:#f1f5f9;color:#475569;padding:10px 20px;" onclick="App.logic.importBackToPreview()">← Volver</button>
                        <button class="btn btn-primary" style="padding:10px 20px;" onclick="App.logic.importApply()">✅ Importar con mapeo</button>
                    </div>
                </div>`;
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
                            📥 Importar otro tramo
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
