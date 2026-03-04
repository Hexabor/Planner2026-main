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
            
            // Inicializar semana del Horario Eficiente
            if(!App.uiState.exportWeek) {
                App.uiState.exportWeek = Utils.getMonday(new Date());
            }

            // Inicializar fechas Google Calendar
            if(!App.uiState.icsStart) {
                App.uiState.icsStart = App.uiState.exportWeek;
                const e = new Date(App.uiState.exportWeek); e.setDate(e.getDate()+6);
                App.uiState.icsEnd = e.toISOString().slice(0,10);
            }
            // Inicializar fechas Master Data
            if(!App.uiState.masterStart) {
                App.uiState.masterStart = App.uiState.exportWeek;
                const e = new Date(App.uiState.exportWeek); e.setDate(e.getDate()+6);
                App.uiState.masterEnd = e.toISOString().slice(0,10);
            }

            // Valores para el selector de semana
            const monday = App.uiState.exportWeek;
            const weekCode = Utils.getWeekCode(monday);
            const [wy, wm, wd] = monday.split('-');
            const sundayD = new Date(monday); sundayD.setDate(sundayD.getDate()+6);
            const [sy, sm, sd] = sundayD.toISOString().slice(0,10).split('-');
            const monthNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            const wMonthName = monthNames[parseInt(wm)-1];
            const sMonthName = monthNames[parseInt(sm)-1];

            let html = `
            <style>.export-dates .custom-date-input { font-size: 0.65rem; padding: 5px 6px 5px 30px; } .export-dates .custom-date-btn { font-size: 0.85rem; }</style>
            <div style="max-width:1400px; margin:20px auto; display:grid; grid-template-columns:240px 1fr; gap:15px; align-items:start;">

                <!-- ═══ COLUMNA IZQUIERDA: Calendar + Master Data ═══ -->
                <div class="export-dates" style="display:flex; flex-direction:column; gap:15px;">

                    <!-- Google Calendar -->
                    <div style="background:white; padding:14px; border-radius:8px; border:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid var(--border);">
                            <span style="font-size:1.1rem;">📆</span>
                            <div style="flex:1;">
                                <div style="font-size:0.8rem; font-weight:700; color:#1e293b;">Google Calendar</div>
                                <div style="font-size:0.58rem; color:#64748b;">Exporta turnos como .ics</div>
                            </div>
                            <span onclick="alert('ℹ️ Google Calendar\\n\\nGenera un fichero .ics importable en Google Calendar, Apple Calendar u Outlook.\\n\\nLos turnos de trabajo aparecen con hora exacta.\\nLas libranzas, vacaciones y festivos aparecen como eventos de todo el día.')"
                                  style="cursor:pointer; font-size:0.85rem; opacity:0.4; transition:opacity 0.15s;"
                                  onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'"
                                  title="Más info">ℹ️</span>
                        </div>
                        <div class="form-group" style="margin-bottom:8px;">
                            <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Empleado</label>
                            <select id="ics-emp-select" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.76rem;background:white;">
                                ${App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder).map(e=>`<option value="${e.id}">${e.nombre}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group" style="margin-bottom:8px;">
                            <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Nombre de los bloques</label>
                            <select id="ics-label-mode" style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.76rem;background:white;"
                                onchange="App.uiState.icsLabelMode=this.value; document.getElementById('ics-label-custom-wrap').style.display=this.value==='custom'?'block':'none';">
                                <option value="code" ${App.uiState.icsLabelMode==='code'?'selected':''}>Código del turno (M9, T6…)</option>
                                <option value="custom" ${App.uiState.icsLabelMode==='custom'?'selected':''}>Nombre personalizado</option>
                            </select>
                            <div id="ics-label-custom-wrap" style="display:${App.uiState.icsLabelMode==='custom'?'block':'none'};margin-top:5px;">
                                <input type="text" value="${App.uiState.icsLabelCustom || 'Turno'}"
                                    oninput="App.uiState.icsLabelCustom=this.value"
                                    placeholder="Ej: Turno"
                                    style="width:100%;padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.76rem;box-sizing:border-box;">
                            </div>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
                            <div>
                                <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Desde</label>
                                ${Utils.getDateInputHTML('ics-start', App.uiState.icsStart, 'App.uiState.icsStart=this.dataset.isoValue; App.ui.icsDateCheck();')}
                            </div>
                            <div>
                                <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Hasta</label>
                                ${Utils.getDateInputHTML('ics-end', App.uiState.icsEnd, 'App.uiState.icsEnd=this.dataset.isoValue;')}
                            </div>
                        </div>
                        <div style="display:flex;flex-direction:column;gap:5px;">
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'work')"
                                    style="width:100%;font-size:0.7rem;padding:7px;display:flex;align-items:center;justify-content:center;gap:5px;font-weight:600;background:#3b82f6;color:white;border-color:#2563eb;border-radius:6px;">
                                🕐 Solo trabajo
                            </button>
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'fixed')"
                                    style="width:100%;font-size:0.7rem;padding:7px;display:flex;align-items:center;justify-content:center;gap:5px;font-weight:600;background:#8b5cf6;color:white;border-color:#7c3aed;border-radius:6px;">
                                📅 Solo libranzas
                            </button>
                            <button class="btn" onclick="App.logic.exportICS(document.getElementById('ics-emp-select').value,'all')"
                                    style="width:100%;font-size:0.7rem;padding:7px;display:flex;align-items:center;justify-content:center;gap:5px;font-weight:600;background:#10b981;color:white;border-color:#059669;border-radius:6px;">
                                ⬇️ Todo junto
                            </button>
                        </div>
                    </div>

                    <!-- Master Data -->
                    <div style="background:white; padding:14px; border-radius:8px; border:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:8px; margin-bottom:10px; padding-bottom:8px; border-bottom:2px solid var(--border);">
                            <span style="font-size:1.1rem;">📥</span>
                            <div style="flex:1;">
                                <div style="font-size:0.8rem; font-weight:700; color:#1e293b;">Master Data</div>
                                <div style="font-size:0.58rem; color:#64748b;">Datos planos en .xlsx</div>
                            </div>
                            <span onclick="alert('ℹ️ Master Data\\n\\nExporta todos los turnos en formato tabular: empleado, fecha, hora inicio/fin, descanso y horas.\\n\\nGenera un archivo .xlsx listo para análisis en Excel.')"
                                  style="cursor:pointer; font-size:0.85rem; opacity:0.4; transition:opacity 0.15s;"
                                  onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'"
                                  title="Más info">ℹ️</span>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px;">
                            <div>
                                <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Desde</label>
                                ${Utils.getDateInputHTML('master-start', App.uiState.masterStart, 'App.uiState.masterStart=this.dataset.isoValue;')}
                            </div>
                            <div>
                                <label style="font-size:0.6rem; font-weight:600; color:#94a3b8; text-transform:uppercase; display:block; margin-bottom:3px;">Hasta</label>
                                ${Utils.getDateInputHTML('master-end', App.uiState.masterEnd, 'App.uiState.masterEnd=this.dataset.isoValue;')}
                            </div>
                        </div>
                        <button class="btn btn-primary" onclick="App.logic.exportMasterData()"
                                style="width:100%; font-size:0.76rem; padding:9px; display:flex; align-items:center; justify-content:center; gap:6px; font-weight:700; border-radius:6px;">
                            <span style="font-size:0.95rem;">📥</span> Descargar .xlsx
                        </button>
                    </div>

                </div><!-- /columna izquierda -->

                <!-- ═══ COLUMNA DERECHA: Horario Eficiente (config + preview) ═══ -->
                <div style="background:white; padding:14px; border-radius:8px; border:1px solid var(--border);">
                    <!-- Título compartido -->
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px; padding-bottom:8px; border-bottom:2px solid var(--border);">
                        <span style="font-size:1.1rem;">📊</span>
                        <div style="flex:1;">
                            <div style="font-size:0.8rem; font-weight:700; color:#1e293b;">Horario Eficiente</div>
                            <div style="font-size:0.58rem; color:#64748b;">Copia y pega en el documento oficial</div>
                        </div>
                    </div>

                    <!-- Grid interno: config izq + preview dcha -->
                    <div style="display:grid; grid-template-columns:210px 1fr; gap:14px;">

                        <!-- Sub-col izq: semana + empleados -->
                        <div style="display:flex; flex-direction:column; gap:10px;">
                            <!-- Selector de semana -->
                            <div style="display:flex; align-items:center; justify-content:center; gap:4px; padding:8px 4px; background:linear-gradient(135deg,#eff6ff,#dbeafe); border-radius:8px; border:1px solid #bfdbfe;">
                                <button onclick="App.ui.exportNavWeek(-1)" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:2px 5px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='none'">◀</button>
                                <div id="export-week-display" style="font-size:0.72rem; font-weight:700; color:#1e40af; text-align:center; min-width:120px; line-height:1.3;">
                                    <div>${weekCode}</div>
                                    <div style="font-size:0.6rem; font-weight:600; color:#3b82f6;">${wd} ${wMonthName} — ${sd} ${sMonthName}</div>
                                </div>
                                <button onclick="App.ui.exportNavWeek(1)" style="background:none; border:none; cursor:pointer; font-size:1rem; padding:2px 5px; border-radius:4px; transition:background 0.15s;" onmouseover="this.style.background='#bfdbfe'" onmouseout="this.style.background='none'">▶</button>
                            </div>
                            <!-- Botones rápidos -->
                            <div style="display:flex; gap:4px; justify-content:center;">
                                <button onclick="App.ui.exportJumpWeek('today')" class="btn-header" style="padding:2px 7px; font-size:0.56rem; border-radius:3px;">Hoy</button>
                                <button onclick="App.ui.exportNavWeek(-4)" class="btn-header" style="padding:2px 7px; font-size:0.56rem; border-radius:3px;">−4 sem</button>
                                <button onclick="App.ui.exportNavWeek(4)" class="btn-header" style="padding:2px 7px; font-size:0.56rem; border-radius:3px;">+4 sem</button>
                            </div>

                            <!-- Empleados -->
                            <div style="border:1px solid var(--border); border-radius:6px; padding:8px;">
                                <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:5px;">
                                    <span style="font-size:0.68rem; font-weight:700; color:#1e293b;">👥 Empleados (${App.uiState.exportEmps.filter(i => typeof i === 'string').length})</span>
                                    <span onclick="alert('ℹ️ Orden de empleados\\n\\nSi tu intención es pegar los turnos en el Horario Eficiente, es importante que ordenes a los empleados exactamente igual que están en ese documento, respetando también los huecos que haya entre ellos.\\n\\nUsa los huecos (+Hueco) para representar filas vacías o separadores del Excel.')"
                                          style="cursor:pointer; font-size:0.75rem; opacity:0.5; transition:opacity 0.15s;"
                                          onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.5'"
                                          title="Info sobre el orden">ℹ️</span>
                                </div>
                                <div style="display:flex; gap:3px; margin-bottom:6px;">
                                    <button class="btn-header" onclick="App.logic.exportSelectAll()" style="padding:2px 5px; font-size:0.56rem; border-radius:3px;">Todos</button>
                                    <button class="btn-header" onclick="App.logic.exportSelectNone()" style="padding:2px 5px; font-size:0.56rem; border-radius:3px;">Ninguno</button>
                                    <button class="btn-header" onclick="document.getElementById('gap-modal').classList.add('open')" style="padding:2px 5px; font-size:0.56rem; border-radius:3px; background:#f0fdf4; border-color:#86efac;">+Hueco</button>
                                </div>
                                <div style="font-size:0.52rem; color:var(--text-muted); margin-bottom:5px;">☰ Arrastra para reordenar</div>
                                <div style="display:flex; flex-direction:column; gap:2px; max-height:420px; overflow-y:auto;">
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
                                 style="display:grid; grid-template-columns:14px 1fr 18px; gap:3px; align-items:center;
                                        padding:3px 5px; border:1px solid #d1d5db; background:#f9fafb; border-radius:3px; cursor:pointer; font-size:0.65rem;">
                                <span style="color:#94a3b8; cursor:grab; font-size:0.7rem;">☰</span>
                                <span style="font-weight:500; color:#6b7280; font-style:italic; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${gapName}</span>
                                <button onclick="event.stopPropagation(); App.logic.removeGap(${idx}); App.ui.updateExportPreview();"
                                        style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:0.8rem; padding:0; width:18px; height:18px; display:flex; align-items:center; justify-content:center;">✕</button>
                            </div>`;
                    } else {
                        const e = App.data.empleados.find(emp => emp.id === item);
                        if(!e) return;
                        html += `
                            <div class="export-emp-item" draggable="true"
                                 ondragstart="App.logic.exportDragStart(event, ${idx})" ondragend="App.logic.exportDragEnd(event)"
                                 ondragover="App.logic.exportDragOver(event)" ondragleave="App.logic.exportDragLeave(event)" ondrop="App.logic.exportDrop(event, ${idx})"
                                 style="display:grid; grid-template-columns:14px 16px 1fr; gap:3px; align-items:center;
                                        padding:3px 5px; border:1px solid var(--primary); background:#eff6ff; border-radius:3px; cursor:pointer; font-size:0.65rem;">
                                <span style="color:#94a3b8; cursor:grab; font-size:0.7rem;">☰</span>
                                <input type="checkbox" checked onclick="event.stopPropagation(); App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();" style="margin:0; cursor:pointer; width:13px; height:13px;">
                                <span style="font-weight:500; color:#1e293b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                                      onclick="App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();">${e.nombre}</span>
                            </div>`;
                    }
                });
                html += `<div style="height:1px; background:var(--border); margin:3px 0;"></div>`;
            }

            // EMPLEADOS NO SELECCIONADOS
            const unselectedEmps = App.data.empleados
                .filter(e => e.active !== false && !App.uiState.exportEmps.includes(e.id))
                .sort((a,b) => a.customOrder - b.customOrder);
            if(unselectedEmps.length > 0) {
                unselectedEmps.forEach(e => {
                    html += `
                        <div onclick="App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();"
                             style="display:grid; grid-template-columns:14px 16px 1fr; gap:3px; align-items:center;
                                    padding:3px 5px; border:1px solid #e2e8f0; background:#fafafa; border-radius:3px; cursor:pointer; font-size:0.65rem; opacity:0.6;">
                            <span></span>
                            <input type="checkbox" onclick="event.stopPropagation(); App.logic.exportToggle('${e.id}'); App.ui.updateExportPreview();" style="margin:0; cursor:pointer; width:13px; height:13px;">
                            <span style="color:#64748b; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${e.nombre}</span>
                        </div>`;
                });
            } else if(App.uiState.exportEmps.length === 0) {
                html += `<div style="text-align:center; padding:12px; color:var(--text-muted); font-size:0.62rem;">⚠️ Ningún empleado<br>seleccionado</div>`;
            }

            html += `
                        </div>
                    </div><!-- /empleados box -->
                </div><!-- /sub-col izq -->

                        <!-- Sub-col dcha: preview -->
                        <div>
                            <div id="export-preview" style="overflow:auto; max-height:700px; font-size:0.65rem;"></div>
                        </div>

                    </div><!-- /grid interno -->
                </div><!-- /Horario Eficiente master -->

            </div><!-- /grid principal -->
            `;

            c.innerHTML = html;
            App.ui.updateExportPreview();
        },

        // Navegación de semana
        exportNavWeek: function(dir) {
            const d = new Date(App.uiState.exportWeek);
            d.setDate(d.getDate() + (dir * 7));
            App.uiState.exportWeek = d.toISOString().slice(0,10);
            App.ui.exportRefreshWeekDisplay();
            App.ui.updateExportPreview();
        },

        // Salto a semana actual
        exportJumpWeek: function(target) {
            if(target === 'today') {
                App.uiState.exportWeek = Utils.getMonday(new Date());
            }
            App.ui.exportRefreshWeekDisplay();
            App.ui.updateExportPreview();
        },

        // Refrescar display de semana sin re-render completo
        exportRefreshWeekDisplay: function() {
            const display = document.getElementById('export-week-display');
            if(!display) return;
            const mon = App.uiState.exportWeek;
            const wc = Utils.getWeekCode(mon);
            const [y,m,dd] = mon.split('-');
            const sun = new Date(mon); sun.setDate(sun.getDate()+6);
            const [sy,sm,sd] = sun.toISOString().slice(0,10).split('-');
            const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
            display.innerHTML = `<div>${wc}</div><div style="font-size:0.6rem; font-weight:600; color:#3b82f6;">${dd} ${mNames[parseInt(m)-1]} — ${sd} ${mNames[parseInt(sm)-1]}</div>`;
        },

        // Auto-ajuste fecha fin Google Calendar
        icsDateCheck: function() {
            if(App.uiState.icsStart > App.uiState.icsEnd) {
                // Poner hasta = domingo siguiente al desde
                const d = new Date(App.uiState.icsStart);
                const dow = d.getDay(); // 0=dom, 1=lun...
                const daysToSunday = dow === 0 ? 0 : 7 - dow;
                d.setDate(d.getDate() + daysToSunday);
                App.uiState.icsEnd = d.toISOString().slice(0,10);
                App.ui.renderExport(document.querySelector('.main-scroll'));
            }
        },
        
        updateExportPreview: function() {
            const container = document.getElementById('export-preview');
            if(!container) return;
            
            const monday = App.uiState.exportWeek;
            const empIds = App.uiState.exportEmps;
            
            if(!monday || empIds.length === 0) {
                container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">
                    <div style="font-size:2rem; margin-bottom:10px;">📋</div>
                    <div style="font-size:0.75rem;">Selecciona empleados para ver la preview</div>
                </div>`;
                return;
            }
            
            const days = Utils.getWeekDays(monday);
            const weekCode = Utils.getWeekCode(monday);
            const [wy2, wm2, wd2] = monday.split('-');
            const sunD = new Date(monday); sunD.setDate(sunD.getDate()+6);
            const [sy2, sm2, sd2] = sunD.toISOString().slice(0,10).split('-');

            // Mapa de fila Excel por día de la semana (Lun=C9, Mar=C27, ...)
            const excelRowMap = [9, 27, 45, 63, 81, 99, 117]; // Lun a Dom

            let html = '';

            // Cabecera de semana con botón Copiar Semana
            html += `<div style="margin-bottom:6px; padding:7px 10px; background:linear-gradient(135deg,#1e40af,#2563eb); border-radius:6px; display:flex; justify-content:space-between; align-items:center;">
                <span style="font-size:0.7rem; font-weight:700; color:white;">📅 ${weekCode} — ${wd2}/${wm2} al ${sd2}/${sm2}</span>
                <div style="display:flex; align-items:center; gap:6px;">
                    <span onclick="alert('ℹ️ Copiar Semana\\n\\nCopia los 7 días de la semana en un solo bloque.\\nPega el contenido en la celda C9 de la pestaña de semana correspondiente en el Horario Eficiente.\\n\\nLas filas de totales y cabeceras entre días se rellenan automáticamente.')"
                          style="cursor:pointer; font-size:0.8rem; opacity:0.7; transition:opacity 0.15s;"
                          onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"
                          title="Info sobre Copiar Semana">ℹ️</span>
                    <button onclick="App.logic.copyWeekGrid('${monday}')"
                            id="copy-week-btn-${monday}"
                            style="background:#2563eb; color:white; border:2px solid rgba(255,255,255,0.4); padding:5px 12px; border-radius:4px; cursor:pointer; font-size:0.65rem; font-weight:700; transition:0.2s; display:flex; align-items:center; gap:4px;"
                            onmouseover="this.style.background='#1d4ed8'; this.style.borderColor='white';"
                            onmouseout="this.style.background='#2563eb'; this.style.borderColor='rgba(255,255,255,0.4)';">
                        📋 Copiar Semana
                    </button>
                </div>
            </div>`;

            days.forEach((date, dayIdx) => {
                const dayName = Utils.getDayName(date);
                const [year, month, day] = date.split('-');
                const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const monthName = mNames[parseInt(month) - 1];
                
                // Fila Excel para este día
                const excelRow = excelRowMap[dayIdx];
                
                html += `<div style="margin-bottom:12px; border:1px solid var(--border); border-radius:4px; overflow:hidden;">
                    <div style="background:#0f172a; color:white; padding:5px 10px; font-weight:700; font-size:0.68rem; display:flex; justify-content:space-between; align-items:center;">
                        <span>${dayName} ${day} - ${monthName} ${year}</span>
                        <div style="display:flex; align-items:center; gap:6px;">
                            <span onclick="alert('ℹ️ Copiar Día suelto\\n\\nCopia solo las celdas de este día.\\nPega en la celda C${excelRow} de la pestaña de semana correspondiente en el Horario Eficiente.')"
                                  style="cursor:pointer; font-size:0.8rem; opacity:0.7; transition:opacity 0.15s;"
                                  onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'"
                                  title="Info sobre Copiar Día">ℹ️</span>
                            <button onclick="App.logic.copyDayGrid('${date}')" 
                                    id="copy-btn-${date}"
                                    style="background:#10b981; color:white; border:none; padding:4px 10px; border-radius:3px; cursor:pointer; font-size:0.63rem; font-weight:700; transition:0.2s;">
                                📋 Copiar Día suelto
                            </button>
                        </div>
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
                    const isGap = typeof item === 'object' && item.type === 'gap';
                    
                    if(isGap) {
                        const gapName = item.name || '';
                        html += `<tr style="border-bottom:1px solid var(--border); background:#fafafa;">
                            <td style="padding:2px 3px; border:1px solid var(--border); font-weight:500; font-style:italic; color:#9ca3af; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px; position:sticky; left:0; background:#fafafa; z-index:1;">${gapName}</td>`;
                        for(let i=0; i<26; i++) {
                            html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:#fafafa;"></td>`;
                        }
                        html += `</tr>`;
                        return;
                    }
                    
                    const emp = App.data.empleados.find(e => e.id === item);
                    if(!emp) return;
                    
                    const shiftId = App.data.schedule[date] ? App.data.schedule[date][item] : null;
                    const shift = shiftId ? Utils.getShift(shiftId) : null;
                    
                    html += `<tr style="border-bottom:1px solid var(--border);">
                        <td style="padding:2px 3px; border:1px solid var(--border); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:50px; position:sticky; left:0; background:white; z-index:1;">${emp.nombre}</td>`;
                    
                    if(shift && shift.fixed) {
                        html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:${shift.color}20; font-weight:700; font-size:0.7rem; color:${shift.color};">${shift.code}</td>`;
                        for(let i=1; i<26; i++) {
                            html += `<td style="padding:1px; text-align:center; border:1px solid var(--border); background:white;"></td>`;
                        }
                    } else {
                        for(let i=0; i<26; i++) {
                            const slotMin = 9*60 + 30 + (i*30);
                            let mark = '';
                            
                            if(shift && shift.start && shift.end) {
                                const [sh, sm] = shift.start.split(':').map(Number);
                                const [eh, em] = shift.end.split(':').map(Number);
                                const startMin = sh * 60 + sm;
                                const endMin = eh * 60 + em;
                                
                                let isWorking = slotMin >= startMin && slotMin < endMin;
                                
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
