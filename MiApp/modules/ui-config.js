// ============================================================
// UI: Configuración y Calendario
// ============================================================

Object.assign(App.ui, {
        renderConfig: function(c) {
            const configOnChange = "App.data.config.weekStart=this.dataset.isoValue; Safe.save('v40_db',App.data); App.router.go('config');";
            
            // 1. FUNCIONES PARA LA FACTURACIÓN
            window.mostrarEditorFacturacion = function() {
                document.getElementById('vista-facturacion').style.display = 'none';
                document.getElementById('editor-facturacion').style.display = 'block';
            };

            window.cancelarEditorFacturacion = function() {
                document.getElementById('editor-facturacion').style.display = 'none';
                document.getElementById('vista-facturacion').style.display = 'block';
            };

            window.guardarFacturacion = function() {
                let texto = document.getElementById('input-facturacion').value;
                let arrayNumeros = texto.split('\n')
                    .map(linea => linea.trim())
                    .filter(linea => linea !== '')
                    .map(linea => {
                        let sinPuntos = linea.replace(/\./g, '');
                        let formatoJS = sinPuntos.replace(/,/g, '.');
                        let numLimpio = formatoJS.replace(/[^\d.-]/g, '');
                        return parseFloat(numLimpio);
                    })
                    .filter(num => !isNaN(num));
                
                App.data.config.facturacion = arrayNumeros;
                Safe.save('v40_db', App.data);
                App.router.go('config');
            };

            // 2. GENERAR GRÁFICA, EJE X Y LISTA SÓLIDA
            let listaHtml = '<div style="color:#64748b; font-size:0.9rem; padding: 20px 0;">No hay datos de facturación cargados.</div>';
            let chartHtml = '';
            let textoParaEditor = "";

            if (App.data.config.facturacion && App.data.config.facturacion.length > 0) {
                textoParaEditor = App.data.config.facturacion.join('\n');
                
                listaHtml = '<div style="max-height: 250px; overflow-y: auto; background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px;">';
                
                let maxFacturacion = Math.max(...App.data.config.facturacion);
                let barrasGrafica = '';
                let etiquetasMeses = '';
                
                // Lógica para fechas reales y cálculo de meses
                let startDateStr = App.data.config.weekStart || "2025-12-29";
                let parts = startDateStr.split('-');
                let baseDate = new Date(parts[0], parts[1] - 1, parts[2]);
                let previousMonth = -1;
                let usePaleColor = false;
                const nombresMeses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

                App.data.config.facturacion.forEach((num, index) => {
                    let currentWeek = 9 + index;
                    let currentYear = 2026;
                    if (currentWeek > 52) { currentWeek -= 52; currentYear++; }
                    let labelSemana = `${currentYear}WK${currentWeek.toString().padStart(2, '0')}`;
                    let numBonito = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);
                    
                    let diasOffset = ((8 + index) * 7) + 3;
                    let thursday = new Date(baseDate.getTime());
                    thursday.setDate(thursday.getDate() + diasOffset);
                    let currentMonth = thursday.getMonth();
                    
                    let monthLabel = "";
                    if (currentMonth !== previousMonth) {
                        monthLabel = nombresMeses[currentMonth];
                        previousMonth = currentMonth;
                        if (index > 0) usePaleColor = !usePaleColor;
                    }

                    const baseColor = usePaleColor ? '#93c5fd' : '#3b82f6';
                    const hoverColor = usePaleColor ? '#60a5fa' : '#1e3a8a';

                    listaHtml += `
                        <div style="background: #f8fafc; padding: 8px 12px; border-radius: 4px; border: 1px solid #e2e8f0; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; gap: 15px;">
                            <strong style="color: #3b82f6; white-space: nowrap;">${labelSemana}</strong> 
                            <span style="font-weight: 600; color: #334155; white-space: nowrap;">${numBonito}</span>
                        </div>`;

                    let alturaBarra = maxFacturacion > 0 ? (num / maxFacturacion) * 100 : 0;
                    barrasGrafica += `
                        <div title="${labelSemana} \n ${numBonito}" 
                             style="flex: 1; background-color: ${baseColor}; height: ${alturaBarra}%; min-width: 4px; border-radius: 2px 2px 0 0; cursor: crosshair; transition: background 0.2s;" 
                             onmouseover="this.style.backgroundColor='${hoverColor}'" 
                             onmouseout="this.style.backgroundColor='${baseColor}'">
                        </div>`;

                    etiquetasMeses += `
                        <div style="flex: 1; text-align: center; position: relative; min-width: 4px;">
                            ${monthLabel ? `<span style="font-size: 0.6rem; color: #475569; font-weight: 700; position: absolute; left: 50%; transform: translateX(-50%); top: 4px;">${monthLabel}</span>` : ''}
                        </div>`;
                });
                listaHtml += '</div>';

                chartHtml = `
                    <div style="margin-bottom: 25px;">
                        <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 5px;">Evolución de ventas (Eje Y: Euros, Eje X: Meses)</div>
                        <div style="height: 150px; display: flex; align-items: flex-end; gap: 2px; border-bottom: 2px solid #94a3b8; border-left: 2px solid #94a3b8; padding-bottom: 1px; padding-left: 4px; background: repeating-linear-gradient(0deg, transparent, transparent 24px, #f1f5f9 25px);">
                            ${barrasGrafica}
                        </div>
                        <div style="height: 20px; display: flex; align-items: flex-start; gap: 2px; padding-left: 6px; border-left: 2px solid transparent;">
                            ${etiquetasMeses}
                        </div>
                    </div>`;
            }

            // 3. PINTAR EL HTML
            c.innerHTML = `
            <div style="max-width:1200px; margin:0 auto; padding: 20px;">
                <div style="margin-bottom: 25px;">
                    <h2 style="margin:0; font-size: 1.8rem; color: #0f172a;">Configuración Global</h2>
                    <p style="color:#64748b; margin-top: 5px;">Ajustes del sistema, calendario y motor financiero.</p>
                </div>

                <div style="display: flex; flex-wrap: wrap; gap: 30px; align-items: flex-start;">
                    
                    <div style="flex: 1 1 350px; display: flex; flex-direction: column; gap: 25px;">
                        <div style="background:white; padding:25px; border-radius:8px; border:1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div class="form-group">
                                <label style="font-weight: 600; color: #1e293b;">Fecha Inicio del Año Fiscal (WK01)</label>
                                <div style="margin-top: 8px;">
                                    ${Utils.getDateInputHTML('config-week-start', App.data.config.weekStart, configOnChange)}
                                </div>
                                <div class="hint" style="margin-top:8px; font-size:0.8rem; color:#64748b; line-height: 1.4;">
                                    Este lunes marca el inicio de la Semana 1 del año fiscal siguiente.<br>
                                    <strong>Ejemplo:</strong> 29/12/2025 será el inicio de <strong>2026WK01</strong>.
                                </div>
                            </div>
                            
                            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
                            
                            <div class="form-group">
                                <label style="font-weight: 600; color: #1e293b;">Horas Convenio (Anuales/Periodo)</label>
                                <input type="number" style="margin-top: 8px; width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;" value="${App.data.config.stdHours}" onchange="App.data.config.stdHours=this.value; Safe.save('v40_db',App.data)">
                                <div class="hint" style="margin-top:8px; font-size:0.8rem; color:#64748b;">Referencia para cálculos de productividad (Ej: 1792h).</div>
                            </div>

                            <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
                            
                            <div class="form-group">
                                <label style="font-weight: 600; color: #1e293b;">Opciones de Contratos (Horas/Semana)</label>
                                <input type="text" 
                                       style="margin-top: 8px; width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px;" 
                                       value="${App.data.config.opcionesContrato ? App.data.config.opcionesContrato.join(', ') : '40, 35, 30, 25, 20, 15'}" 
                                       onchange="App.data.config.opcionesContrato = this.value.split(',').map(s=>parseFloat(s.trim())).filter(n=>!isNaN(n)); Safe.save('v40_db',App.data)"
                                       placeholder="Ej: 40, 30, 20">
                                <div class="hint" style="margin-top:8px; font-size:0.8rem; color:#64748b;">
                                    Valores separados por comas. Saldrán en el desplegable al crear/editar el contrato de un empleado.
                                </div>
                            </div>
                            </div>

                        <div style="background:white; padding:25px; border-radius:8px; border:1px solid #e2e8f0; box-shadow:0 1px 3px rgba(0,0,0,0.05);">
                            <h3 style="margin:0 0 4px 0; font-size:0.95rem; font-weight:700; color:#1e293b;">🕐 Tramo Valle</h3>
                            <p style="margin:0 0 16px 0; font-size:0.8rem; color:#64748b;">Franja horaria de baja actividad. El planificador muestra las horas consumidas frente a la bolsa semanal configurada.</p>
                            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Hora inicio</label>
                                    <input type="time" value="${App.data.config.valleStart || '14:00'}"
                                           onchange="App.data.config.valleStart=this.value; Safe.save('v40_db',App.data);"
                                           style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Hora fin</label>
                                    <input type="time" value="${App.data.config.valleEnd || '17:00'}"
                                           onchange="App.data.config.valleEnd=this.value; Safe.save('v40_db',App.data);"
                                           style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; box-sizing:border-box;">
                                </div>
                                <div>
                                    <label style="display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; margin-bottom:5px;">Bolsa semanal (h)</label>
                                    <input type="number" min="0" step="0.5" value="${App.data.config.valleBolsa || 0}"
                                           onchange="App.data.config.valleBolsa=parseFloat(this.value)||0; Safe.save('v40_db',App.data);"
                                           style="width:100%; padding:8px; border:1px solid #cbd5e1; border-radius:6px; font-size:13px; font-weight:600; box-sizing:border-box;">
                                </div>
                            </div>
                        </div>

                        <div style="background:#fef2f2; border:2px solid #fca5a5; border-radius:8px; padding:25px;">
                            <h3 style="margin:0 0 10px 0; color:#991b1b; display:flex; align-items:center; gap:8px;">
                                <span style="font-size:1.5rem;">⚠️</span> ZONA DE PELIGRO
                            </h3>
                            <p style="color:#7f1d1d; font-size:0.9rem; margin-bottom:20px;">Acciones destructivas e irreversibles.</p>
                            
                            <div style="display:flex; flex-direction:column; gap:12px;">
                                <button class="btn" style="width:100%; background:#7f1d1d; color:#fef2f2; border:2px solid #991b1b; font-weight:700; padding:12px; cursor: pointer; border-radius: 4px;" 
                                        onclick="App.logic.massClearAll()" title="Borrar solo las semanas planificadas">
                                    🧹 VACIAR SOLO EL PLANIFICADOR
                                </button>
                                <button class="btn" style="width:100%; background:black; color:white; border:2px solid #ef4444; font-weight:700; padding:12px; cursor: pointer; border-radius: 4px;" 
                                        onclick="App.logic.factoryReset()" title="PELIGRO EXTREMO: Borrado total de fábrica">
                                    💣 RESTABLECIMIENTO DE FÁBRICA
                                </button>
                            </div>
                        </div>
                    </div>

                    <div style="flex: 2 1 500px; background:white; padding:25px; border-radius:8px; border:1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                        
                        <div id="vista-facturacion">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                                <div>
                                    <h3 style="margin: 0; color: #0f172a; display: flex; align-items: center; gap: 8px;">📊 Previsión de Facturación Anual</h3>
                                    <div style="font-size:0.85rem; color:#64748b; margin-top: 4px;">Base para calcular la plantilla ideal semanal.</div>
                                </div>
                                <button class="btn" style="padding: 8px 16px; font-size: 0.9rem; background: #f8fafc; color: #3b82f6; border: 1px solid #3b82f6; border-radius: 6px; cursor: pointer; font-weight: 600;" onclick="window.mostrarEditorFacturacion()">✎ Modificar Datos</button>
                            </div>
                            
                            ${chartHtml}
                            ${listaHtml}
                        </div>

                        <div id="editor-facturacion" style="display: none;">
                            <h3 style="margin: 0 0 15px 0; color: #0f172a;">Editar Datos de Facturación</h3>
                            <label style="display: block; margin-bottom: 10px; color: #475569;"><strong>Pega la columna del Excel (Z2:Z54)</strong></label>
                            <textarea 
                                id="input-facturacion"
                                rows="12" 
                                style="width: 100%; resize: vertical; padding: 12px; font-family: monospace; font-size: 0.95rem; border: 2px solid #3b82f6; border-radius: 6px; background: #f8fafc;" 
                                placeholder="Ejemplo:\n1.500.000,50\n45.000\n..."
                            >${textoParaEditor}</textarea>
                            
                            <div style="display: flex; gap: 15px; margin-top: 20px;">
                                <button class="btn" style="flex: 2; background: #10b981; color: white; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 1rem;" onclick="window.guardarFacturacion()">💾 Guardar y Generar Gráfica</button>
                                <button class="btn" style="flex: 1; background: #e2e8f0; color: #475569; padding: 12px; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;" onclick="window.cancelarEditorFacturacion()">Cancelar</button>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- ── Backup local (emergencia) ── -->
                <div style="margin-top:24px;background:white;padding:20px 24px;border-radius:8px;border:1px solid #e2e8f0;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                        <span style="font-size:1rem;">💾</span>
                        <span style="font-weight:700;font-size:0.95rem;color:#1e293b;">Backup local</span>
                        <span style="background:#fef3c7;color:#92400e;padding:1px 8px;border-radius:8px;font-size:0.68rem;font-weight:700;">Emergencia</span>
                    </div>
                    <p style="font-size:0.78rem;color:#94a3b8;margin:0 0 14px 0;">Usa Drive para el guardado habitual. Estos controles son un respaldo por si Drive no está disponible.</p>
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="btn" onclick="document.getElementById('export-modal').classList.add('open')"
                            style="padding:8px 18px;font-size:0.82rem;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;">
                            📤 Exportar backup local
                        </button>
                        <button class="btn" onclick="document.getElementById('file-input').click()"
                            style="padding:8px 18px;font-size:0.82rem;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;">
                            📥 Importar backup local
                        </button>
                    </div>
                </div>

            </div>`;
        },

        // --- CALENDARIO ---
        renderCalendario: function(c) {
            const locked = App.data.lockedDays || {};
            if(!App.uiState.calendarioUi) App.uiState.calendarioUi = { rangeStart: '', rangeEnd: '', dowFilter: [], action: 'lock', courseYear: 2026, tab: 'bloqueos' };
            const calUiState = App.uiState.calendarioUi;
            if(!calUiState.courseYear) calUiState.courseYear = 2026;
            if(!calUiState.tab) calUiState.tab = 'bloqueos';

            const tab = calUiState.tab;
            const setTab = t => 'App.uiState.calendarioUi.tab=&quot;' + t + '&quot;; App.ui.renderCalendario(document.querySelector(\'.main-scroll\'))';

            // Tabs header
            const tabs = [
                { id: 'bloqueos', label: '🔒 Bloqueos' },
                { id: 'festivos', label: '🎉 Festivos' },
                { id: 'tienda',   label: '🏪 Horarios de tienda' },
            ];
            let html = `<div style="padding:24px; max-width:1100px; margin:0 auto;">
                <div style="display:flex; gap:0; border:1px solid #e2e8f0; border-radius:8px; overflow:hidden; width:fit-content; margin-bottom:20px;">
                    ${tabs.map(t => `<button type="button" onclick="${setTab(t.id)}"
                        style="padding:8px 18px; font-size:0.82rem; font-weight:600; border:none; border-right:1px solid #e2e8f0; cursor:pointer;
                        background:${tab===t.id?'#1e293b':'white'}; color:${tab===t.id?'white':'#64748b'};">${t.label}</button>`).join('')}
                </div>`;

            if(tab === 'festivos') { html += App.ui._calRenderFestivos(); html += '</div>'; c.innerHTML = html; return; }
            if(tab === 'tienda')   { html += App.ui._calRenderTienda();   html += '</div>'; c.innerHTML = html; return; }

            // ── TAB BLOQUEOS ────────────────────────────────────────────────
            const cy = calUiState.courseYear;
            const months = [];
            for(let m = 2; m <= 11; m++) months.push({y: cy, m});
            for(let m = 0; m <= 1;  m++) months.push({y: cy+1, m});
            const monthName = i => ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][i];
            const totalLocked = Object.keys(locked).length;
            const canPrev = cy > 2025, canNext = cy < 2027;

            html += `<div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:20px;">
                <div style="position: relative;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <h2 style="margin:0; font-size:1.2rem; font-weight:700; color:#1e293b; line-height:1.1;">
                            🔒 Bloqueo de días
                        </h2>
                        <button
                            type="button"
                            aria-label="Información sobre bloqueos"
                            style="width:18px; height:18px; border-radius:999px; border:1px solid #e2e8f0; background:#fff; padding:0; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:#64748b;"
                            onclick="App.toggleLockInfo(event)"
                        >i</button>
                    </div>

                    <div id="lockInfoTooltip"
                        style="display:none; position:absolute; top:100%; left:0; margin-top:8px; padding:12px; width:280px; background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.15); font-size:0.75rem; color:#475569; line-height:1.4; z-index:100;"
                    >
                        Los días bloqueados no se pueden editar desde la vista individual.<br>
                        Para modificarlos, usa la vista global.
                        
                        <div style="display:flex; flex-direction:column; gap:8px; margin-top:10px; padding-top:10px; border-top:1px solid #e2e8f0; color:#1e293b;">
                            <span style="display:inline-flex; align-items:center; gap:8px;">
                                <span style="width:16px; height:16px; border-radius:4px; border:2px solid #1e293b; box-sizing:border-box; flex-shrink:0;"></span>
                                <strong>Día bloqueado</strong>
                            </span>
                            <span style="display:inline-flex; align-items:center; gap:8px;">
                                <span style="width:16px; height:16px; border-radius:4px; border:1px solid #e2e8f0; box-sizing:border-box; flex-shrink:0;"></span>
                                <strong>Día desbloqueado</strong>
                            </span>
                        </div>
                    </div>
                </div>

                <div style="display:flex; align-items:center; gap:10px;">
    <button type="button" onclick="App.uiState.calendarioUi.courseYear=${cy-1}; App.ui.renderCalendario(document.querySelector('.main-scroll'))"
        ${canPrev?'':'disabled'}
        style="width:32px;height:32px;border:1px solid #e2e8f0;border-radius:6px;background:${canPrev?'white':'#f8fafc'};color:${canPrev?'#374151':'#d1d5db'};cursor:${canPrev?'pointer':'default'};font-size:16px;">
        ◀
    </button>

    <span style="font-size:0.95rem;font-weight:700;color:#1e293b;white-space:nowrap;">
        Mar ${cy} – Feb ${cy+1}
    </span>

    <button type="button" onclick="App.uiState.calendarioUi.courseYear=${cy+1}; App.ui.renderCalendario(document.querySelector('.main-scroll'))"
        ${canNext?'':'disabled'}
        style="width:32px;height:32px;border:1px solid #e2e8f0;border-radius:6px;background:${canNext?'white':'#f8fafc'};color:${canNext?'#374151':'#d1d5db'};cursor:${canNext?'pointer':'default'};font-size:16px;">
        ▶
    </button>

    <div style="font-size:0.8rem; color:#64748b; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:8px 14px;">
        ${totalLocked} día${totalLocked !== 1 ? 's' : ''} bloqueado${totalLocked !== 1 ? 's' : ''}
    </div>
</div>
                </div>

                <!-- Panel de acciones por rango -->
                <div style="background:white; border:1px solid #e2e8f0; border-radius:10px; padding:16px; margin-bottom:20px; display:flex; gap:16px; align-items:flex-end; flex-wrap:wrap;">
                    <div>
                        <label style="font-size:0.72rem; font-weight:600; color:#64748b; display:block; margin-bottom:4px;">DESDE</label>
                        ${Utils.getDateInputHTML('cal-range-start', calUiState.rangeStart || '2026-03-01', "App.uiState.calendarioUi.rangeStart=this.dataset.isoValue")}
                    </div>
                    <div>
                        <label style="font-size:0.72rem; font-weight:600; color:#64748b; display:block; margin-bottom:4px;">HASTA</label>
                        ${Utils.getDateInputHTML('cal-range-end', calUiState.rangeEnd || '2026-03-31', "App.uiState.calendarioUi.rangeEnd=this.dataset.isoValue")}
                    </div>
                    <div>
                        <label style="font-size:0.72rem; font-weight:600; color:#64748b; display:block; margin-bottom:4px;">DÍAS DE SEMANA</label>
                        <div style="display:flex; gap:4px;">
                            ${['L','M','X','J','V','S','D'].map((d,i) => {
                                const sel = calUiState.dowFilter.includes(i);
                                return `<button type="button"
                                    style="width:28px; height:28px; border-radius:6px; border:1px solid ${sel?'#3b82f6':'#e2e8f0'}; background:${sel?'#eff6ff':'white'}; color:${sel?'#3b82f6':'#64748b'}; font-size:0.72rem; font-weight:700; cursor:pointer;"
                                    onclick="App.ui._calToggleDow(${i})">${d}</button>`;
                            }).join('')}
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; margin-left:auto;">
                        <button type="button" onclick="App.ui._calApplyRange('lock')"
                            style="padding:7px 14px; background:#1e293b; color:white; border:none; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                            🔒 Bloquear rango
                        </button>
                        <button type="button" onclick="App.ui._calApplyRange('unlock')"
                            style="padding:7px 14px; background:white; color:#64748b; border:1px solid #e2e8f0; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                            🔓 Desbloquear rango
                        </button>
                        <button type="button" onclick="App.ui._calClearAll()"
                            style="padding:7px 14px; background:#fef2f2; color:#ef4444; border:1px solid #fecaca; border-radius:6px; font-size:0.8rem; font-weight:600; cursor:pointer;">
                            Desbloquear todo
                        </button>
                    </div>
                </div>

                <!-- Grid de meses -->
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(220px,1fr)); gap:16px;">`;

            months.forEach(({y, m}) => {
                const firstDay = new Date(y, m, 1);
                const lastDay  = new Date(y, m+1, 0);
                // Offset: Monday=0
                let startOffset = firstDay.getDay() - 1;
                if(startOffset < 0) startOffset = 6;

                html += `<div style="background:white; border:1px solid #e2e8f0; border-radius:10px; padding:12px;">
                    <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px;">
                        <span style="font-size:0.8rem; font-weight:700; color:#1e293b;">${monthName(m)} ${y}</span>
                        <div style="display:flex; gap:4px;">
                            <button type="button" onclick="App.ui._calLockMonth(${y},${m},true)"
                                style="font-size:10px; padding:2px 6px; border:1px solid #e2e8f0; border-radius:4px; background:white; cursor:pointer; color:#64748b;" title="Bloquear mes">🔒</button>
                            <button type="button" onclick="App.ui._calLockMonth(${y},${m},false)"
                                style="font-size:10px; padding:2px 6px; border:1px solid #e2e8f0; border-radius:4px; background:white; cursor:pointer; color:#64748b;" title="Desbloquear mes">🔓</button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:repeat(7,1fr); gap:2px; text-align:center;">
                        ${['L','M','X','J','V','S','D'].map(d=>`<div style="font-size:9px; font-weight:700; color:#94a3b8; padding-bottom:3px;">${d}</div>`).join('')}
                        ${Array(startOffset).fill('<div></div>').join('')}`;

                for(let day = 1; day <= lastDay.getDate(); day++) {
                    const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const isLocked = locked[dateStr];
                    const dow = new Date(y, m, day).getDay(); // 0=Sun
                    const isWeekend = dow === 0 || dow === 6;
                    const isHoliday = App.data.storeConfig.holidays.some(h => h.date === dateStr);

                    // Base styles
                    let bg = 'transparent';
                    let color = isWeekend ? '#94a3b8' : '#374151';
                    let border = '1px solid transparent';
                    let fontWeight = '500';
                    let extraStyle = '';

                    if(isLocked && isHoliday) {
                        // Locked + festivo: festivo bg + lock border
                        bg = '#fef3c7'; color = '#d97706';
                        border = '2px solid #1e293b'; fontWeight = '700';
                    } else if(isLocked) {
                        // Locked: borde oscuro + número en color oscuro
                        bg = 'transparent'; color = '#1e293b';
                        border = '2px solid #1e293b'; fontWeight = '700';
                    } else if(isHoliday) {
                        bg = '#fef3c7'; color = '#d97706';
                        border = '1px solid transparent';
                    }

                    html += `<button type="button"
                        onclick="App.ui._calToggleDay('${dateStr}')"
                        title="${dateStr}${isLocked?' — Bloqueado':''}"
                        style="aspect-ratio:1; border-radius:4px; border:${border}; background:${bg}; color:${color}; font-size:10px; font-weight:${fontWeight}; cursor:pointer; padding:0; line-height:1; transition:all 0.1s; box-sizing:border-box;"
                        onmouseover="this.style.background='${isLocked ? '#f1f5f9' : '#f1f5f9'}'"
                        onmouseout="this.style.background='${bg}'"
                        >${day}</button>`;
                }
                html += `</div></div>`;
            });

            html += `</div></div>`;
            c.innerHTML = html;
        },

        _calToggleDay: function(dateStr) {
            if(!App.data.lockedDays) App.data.lockedDays = {};
            if(App.data.lockedDays[dateStr]) delete App.data.lockedDays[dateStr];
            else App.data.lockedDays[dateStr] = true;
            Safe.save('v40_db', App.data);
            App.ui.renderCalendario(document.querySelector('.main-scroll'));
        },

        _calToggleDow: function(idx) {
            const ui = App.uiState.calendarioUi;
            const i = ui.dowFilter.indexOf(idx);
            if(i >= 0) ui.dowFilter.splice(i, 1);
            else ui.dowFilter.push(idx);
            App.ui.renderCalendario(document.querySelector('.main-scroll'));
        },

        _calLockMonth: function(y, m, lock) {
            if(!App.data.lockedDays) App.data.lockedDays = {};
            const last = new Date(y, m+1, 0).getDate();
            for(let d = 1; d <= last; d++) {
                const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                if(lock) App.data.lockedDays[dateStr] = true;
                else delete App.data.lockedDays[dateStr];
            }
            Safe.save('v40_db', App.data);
            App.ui.renderCalendario(document.querySelector('.main-scroll'));
        },

        _calApplyRange: function(action) {
            const ui = App.uiState.calendarioUi;
            if(!ui.rangeStart || !ui.rangeEnd) { alert('Selecciona un rango de fechas (Desde y Hasta)'); return; }
            if(!App.data.lockedDays) App.data.lockedDays = {};
            const start = new Date(ui.rangeStart);
            const end   = new Date(ui.rangeEnd);
            if(start > end) { alert('La fecha de inicio debe ser anterior a la fecha final'); return; }
            const dowFilter = ui.dowFilter; // empty = all days
            for(let d = new Date(start); d <= end; d.setDate(d.getDate()+1)) {
                const dow = (d.getDay() + 6) % 7; // 0=Mon
                if(dowFilter.length > 0 && !dowFilter.includes(dow)) continue;
                const dateStr = d.toISOString().slice(0,10);
                if(action === 'lock') App.data.lockedDays[dateStr] = true;
                else delete App.data.lockedDays[dateStr];
            }
            Safe.save('v40_db', App.data);
            App.ui.renderCalendario(document.querySelector('.main-scroll'));
        },

        _calClearAll: function() {
            if(!confirm('¿Desbloquear todos los días? Esta acción no se puede deshacer.')) return;
            App.data.lockedDays = {};
            Safe.save('v40_db', App.data);
            App.ui.renderCalendario(document.querySelector('.main-scroll'));
        },

        // --- ANÁLISIS ---
        // --- ANÁLISIS ---
});
