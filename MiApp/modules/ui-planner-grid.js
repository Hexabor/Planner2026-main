// ============================================================
// UI: Grid del planificador
// ============================================================

Object.assign(App.ui, {
        renderPlanner: function(c) {
            const date = App.uiState.currentDate; 
            const monday = Utils.getMonday(date);
            const weekDays = Utils.getWeekDays(monday);
            const dayAssignments = App.data.schedule[date] || {};
            const dayKey = Utils.getDayKey(date);
            const holiday = App.data.storeConfig.holidays.find(h => h.date === date);
            const dayConfig = holiday ? App.data.storeConfig.base["Festivo"] : (App.data.storeConfig.base[dayKey] || {open:"10:00", close:"22:00", closed:false});
            const exception = App.data.storeConfig.special.find(s => s.date === date);
            const finalConfig = exception || dayConfig;

            // Calcular scale ANTES de generar HTML para aplicarlo inline
            const availableWidth = c.clientWidth;
            const valleModuleWidth = (parseFloat(App.data.config.valleBolsa) > 0) ? 112 : 0; // 100px + 12px gap
            const vistaModuleWidth = 102; // 90px + 12px gap — siempre visible
            const dragModuleWidth  = 92;  // 80px + 12px gap — siempre visible
            const controlsScale = Math.min(1, (availableWidth - 40) / (985 + valleModuleWidth + vistaModuleWidth + dragModuleWidth));
            const gridScale = Math.min(1, (availableWidth - 40) / 1435);

            // Calcular scale basado en el ancho disponible

            // Calcular horas por día para la semana
            let dayHours = {};
            let weekTotal = 0;
            weekDays.forEach(d => {
                let dayTotal = 0;
                Object.keys(App.data.schedule[d] || {}).forEach(empId => {
                    const shiftId = App.data.schedule[d][empId];
                    const shift = Utils.getShift(shiftId);
                    if(shift && shift.start && shift.end && !shift.external) {
                        const hours = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                        dayTotal += hours;
                    }
                });
                dayHours[d] = dayTotal;
                weekTotal += dayTotal;
            });

            // Calcular horas consumidas en el tramo valle esta semana
            const valleStart = App.data.config.valleStart || '14:00';
            const valleEnd   = App.data.config.valleEnd   || '17:00';
            const valleBolsa = parseFloat(App.data.config.valleBolsa) || 0;
            const toMin = t => { const [h,m] = t.split(':').map(Number); return h*60+m; };
            const vS = toMin(valleStart), vE = toMin(valleEnd);
            let valleConsumed = 0;
            weekDays.forEach(d => {
                if(new Date(d).getDay() === 0) return; // Domingos excluidos del cómputo valle
                Object.keys(App.data.schedule[d] || {}).forEach(empId => {
                    const shift = Utils.getShift(App.data.schedule[d][empId]);
                    if(shift && shift.start && shift.end && !shift.external) {
                        const sS = toMin(shift.start), sE = toMin(shift.end);
                        const overlapStart = Math.max(sS, vS);
                        const overlapEnd   = Math.min(sE, vE);
                        // Restar pausa si solapa con el tramo valle
                        let pauseMins = 0;
                        if(shift.breakStart && shift.breakEnd) {
                            const bS = toMin(shift.breakStart), bE = toMin(shift.breakEnd);
                            const pStart = Math.max(bS, overlapStart);
                            const pEnd   = Math.min(bE, overlapEnd);
                            if(pEnd > pStart) pauseMins = pEnd - pStart;
                        }
                        if(overlapEnd > overlapStart) valleConsumed += (overlapEnd - overlapStart - pauseMins) / 60;
                    }
                });
            });
            valleConsumed = Math.round(valleConsumed * 10) / 10;

            // Declarar antes de usarlos en los módulos HTML
            const isIndividual = App.uiState.plannerViewMode === 'individual';

            // Módulo VALLE — solo círculo de bolsa (toggles van en módulo VISTA)
            let _valleCircle = '';
            if(valleBolsa > 0) {
                const _res  = Math.round((valleBolsa - valleConsumed) * 10) / 10;
                const _pct  = Math.min(valleConsumed / valleBolsa, 1);
                const _fill = _pct < 0.6 ? '#10b981' : _pct < 0.9 ? '#f59e0b' : '#ef4444';
                const _rc   = _res > 0 ? '#10b981' : _res < 0 ? '#ef4444' : '#94a3b8';
                const _rs   = _res > 0 ? '+' : '';
                const _r = 26, _circ = 2 * Math.PI * _r;
                const _dash = Math.round(_pct * _circ * 10) / 10;
                _valleCircle = `
                    <div style="position:relative; width:68px; height:68px; flex-shrink:0;">
                        <svg width="68" height="68" viewBox="0 0 68 68">
                            <circle cx="34" cy="34" r="${_r}" fill="none" stroke="#e2e8f0" stroke-width="7"/>
                            <circle cx="34" cy="34" r="${_r}" fill="none" stroke="${_fill}" stroke-width="7"
                                stroke-dasharray="${_dash} ${_circ}" stroke-linecap="round" transform="rotate(-90 34 34)"/>
                        </svg>
                        <div style="position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1.2;">
                            <span style="font-size:0.75rem; font-family:monospace; font-weight:800; color:${_rc};">${_rs}${_res}h</span>
                            <span style="font-size:0.52rem; color:#94a3b8; font-weight:600;">restante</span>
                        </div>
                    </div>
                    <div style="text-align:center;">
                        <div style="font-size:0.6rem; color:#64748b; font-weight:700;">${valleStart}–${valleEnd}</div>
                        <div style="font-size:0.58rem; color:#94a3b8; margin-top:1px;">${valleConsumed}h / ${valleBolsa}h</div>
                    </div>`;
            }
            const valleModuleHtml = valleBolsa > 0 ? `<div class="planner-module" style="flex:0 0 100px; width:100px;">
                <div class="planner-module-title">🕐 VALLE</div>
                <div class="planner-module-content" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:6px;">
                    ${_valleCircle}
                </div>
            </div>` : '';

            // Módulo VISTA — tres switches de visualización
            const _isMoono = !!App.uiState.gridMonocromo;
            const _isDivid = !!App.uiState.gridDividido;
            const _bS = (active) => 'padding:4px 8px; border:none; border-radius:10px; font-size:0.65rem; font-weight:700; cursor:pointer; transition:all 0.15s; background:' + (active?'#2563eb':'transparent') + '; color:' + (active?'white':'#64748b') + ';';
            const _row = (labelA, titleA, onA, activeA, labelB, titleB, onB, activeB, disabled) => {
                const disStyle = disabled ? 'opacity:0.35; filter:grayscale(1); pointer-events:none;' : '';
                return '<div style="font-size:0.52rem; font-weight:700; color:#64748b; text-align:center; margin-bottom:1px;">' + (activeA ? titleA : titleB) + '</div>' +
                '<div style="display:flex; justify-content:center; background:#f1f5f9; border-radius:10px; padding:2px; gap:1px; ' + disStyle + '">' +
                '<button onclick="' + onA + '" title="' + titleA + '" style="' + _bS(activeA) + '">' + labelA + '</button>' +
                '<button onclick="' + onB + '" title="' + titleB + '" style="' + _bS(activeB) + '">' + labelB + '</button>' +
                '</div>';
            };
            const vistaModuleHtml = `<div class="planner-module" style="flex:0 0 90px; width:90px;">
                <div class="planner-module-title">👁 VISTA</div>
                <div class="planner-module-content" style="display:flex; flex-direction:column; gap:4px; padding:5px 6px; justify-content:center;">
                    ${_row('👥','Grupo',"App.uiState.plannerViewMode='group'; App.ui.renderPlanner(document.getElementById('main-view'));",!isIndividual,
                           '👤','Individual',"if(!App.uiState.individualEmpId){const first=App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder)[0]; if(first)App.uiState.individualEmpId=first.id;} App.uiState.plannerViewMode='individual'; App.ui.renderPlanner(document.getElementById('main-view'));",isIndividual,false)}
                    ${_row('📋','Junto',"App.uiState.gridDividido=false; App.ui.renderPlanner(document.getElementById('main-view'));",!_isDivid,
                           '➗','Separado',"App.uiState.gridDividido=true; App.ui.renderPlanner(document.getElementById('main-view'));",_isDivid,isIndividual)}
                    ${_row('🎨','Color',"App.uiState.gridMonocromo=false; App.ui.renderPlanner(document.getElementById('main-view'));",!_isMoono,
                           '⬛','Monocromo',"App.uiState.gridMonocromo=true; App.ui.renderPlanner(document.getElementById('main-view'));",_isMoono,isIndividual)}
                </div>
            </div>`;

            // Módulo DRAG — botones Editar/Cambiar apilados
            const _mBtn = (mode, icon, label) => {
                const isActive = App.uiState.dragMode === mode;
                const btnId = mode === 'edit' ? 'mode-edit-btn' : 'mode-swap-btn';
                return '<button id="' + btnId + '" onclick="App.logic.setDragMode(\'' + mode + '\')" title="' + label + '"'
                     + ' style="width:100%; padding:5px 4px; border:none; border-radius:6px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px; transition:all 0.15s;'
                     + ' background:' + (isActive ? '#2563eb' : '#f1f5f9') + '; color:' + (isActive ? 'white' : '#64748b') + ';">'
                     + '<span style="font-size:14px; line-height:1;">' + icon + '</span>'
                     + '<span style="font-size:0.55rem; font-weight:800; text-transform:uppercase; letter-spacing:0.03em;">' + label + '</span>'
                     + '</button>';
            };
            const dragModuleHtml = `<div class="planner-module" style="flex:0 0 80px; width:80px;">
                <div class="planner-module-title">🎯 DRAG</div>
                <div class="planner-module-content" style="display:flex; flex-direction:column; gap:5px; padding:6px; justify-content:center;">
                    ${_mBtn('edit','✏️','Editar')}
                    ${_mBtn('swap','🔄','Cambiar')}
                </div>
            </div>`;

            let html = `<div class="planner-controls-super-wrapper">
                <div class="planner-controls-super" id="planner-controls-super" style="transform: scale(${controlsScale}); transform-origin: top left; width:${985 + valleModuleWidth + vistaModuleWidth + dragModuleWidth}px; min-width:${985 + valleModuleWidth + vistaModuleWidth + dragModuleWidth}px;">
                <div class="planner-controls">
                <!-- MÓDULO 1: NAVEGADOR -->
                <div class="planner-module planner-navigator">
                    <div class="planner-module-title">📅 NAVEGADOR</div>
                    <div class="planner-module-content">
                        <div class="week-selector" style="display:flex; align-items:center; justify-content:center; gap:16px;">
                            <div style="display:flex; align-items:center; gap:4px;">
                                <button class="week-btn week-btn-fast" onclick="App.logic.changeWeek(-4)" title="−4 semanas">◀◀</button>
                                <button class="week-btn" onclick="App.logic.changeWeek(-1)" title="−1 semana">◀</button>
                                <div style="position:relative; display:inline-flex; align-items:center; border:1px solid var(--border); border-radius:4px; background:white; height:28px;">
                                    <span style="pointer-events:none; position:relative; z-index:1; padding:0 8px; font-weight:700; font-size:0.82rem; white-space:nowrap; color:#1e293b;">
                                        ${Utils.getWeekCode(monday)} <span style="font-size:0.65em; color:#94a3b8; margin-left:2px;">▾</span>
                                    </span>
                                    <select id="week-dropdown" onchange="App.logic.goToWeek(this.value)" style="position:absolute; inset:0; width:100%; height:100%; opacity:0; cursor:pointer; border:none; background:none;">
                                        ${App.logic.getWeekOptions(monday)}
                                    </select>
                                </div>
                                <button class="week-btn" onclick="App.logic.changeWeek(1)" title="+1 semana">▶</button>
                                <button class="week-btn week-btn-fast" onclick="App.logic.changeWeek(4)" title="+4 semanas">▶▶</button>
                            </div>
                            <div style="display:flex; align-items:center; font-size:0.65rem; color:var(--text-muted);">
                                ${App.logic._weekStateRowHTML(monday)}
                            </div>
                        </div>
                        <div class="compact-days-wrapper">
                        <div class="compact-day-selector">`;
            
            // Los 7 días en una sola fila
            for(let i = 0; i < 7; i++) {
                const d = weekDays[i];
                const isActive = d === date ? 'active' : '';
                const dayName = Utils.getDayName(d);
                const dayNum = d.split('-')[2];
                const hours = dayHours[d] || 0;
                
                html += `<div class="compact-day-btn ${isActive}" onclick="App.logic.setDate('${d}')">
                    <div class="compact-day-name">${dayName}</div>
                    <div class="compact-day-num">${dayNum}</div>
                    <div class="compact-day-hours">${hours.toFixed(0)}h</div>
                </div>`;
            }
            
            html += `</div>`; // Cierre de compact-day-selector
            
            // NUEVA FILA: Tarjetas de indicadores debajo de cada día
            html += `<div class="compact-indicators-row">`;
            
            for(let i = 0; i < 7; i++) {
                const d = weekDays[i];
                const dayKey = Utils.getDayKey(d);
                const holiday = App.data.storeConfig.holidays.find(h => h.date === d);
                const exception = App.data.storeConfig.special.find(s => s.date === d);
                const baseConfig = App.data.storeConfig.base[dayKey] || {};
                const isDomingo = new Date(d).getDay() === 0;
                
                let dots = [];
                let tooltipParts = [];
                
                // Determinar qué puntos mostrar (pueden ser 2)
                const isFestivo = !!holiday;
                const isCerrado = (exception && exception.closed) || (baseConfig.closed && !exception);
                const isEspecial = exception && !exception.closed;
                
                if(isFestivo) {
                    dots.push({ class: 'festivo', label: 'Festivo' });
                    tooltipParts.push(`Festivo: ${holiday.note || 'Día festivo'}`);
                }
                
                if(isCerrado) {
                    dots.push({ class: 'cerrado', label: 'Cerrado' });
                    tooltipParts.push(exception ? 'Excepción: Cerrado' : 'Cerrado');
                }
                
                // Especial y Domingo solo si NO hay festivo ni cerrado
                if(!isFestivo && !isCerrado) {
                    if(isEspecial) {
                        dots.push({ class: 'especial', label: 'Especial' });
                        tooltipParts.push(`Horario especial: ${exception.open}-${exception.close}`);
                    } else if(isDomingo) {
                        dots.push({ class: 'domingo', label: 'Domingo' });
                        tooltipParts.push('Domingo');
                    }
                }
                
                const tooltip = tooltipParts.join(' • ');
                const dotsHtml = dots.map(d => `<div class="day-indicator-dot ${d.class}"></div>`).join('');
                
                html += `<div class="day-indicator-card" ${tooltip ? `title="${tooltip}"` : ''}>${dotsHtml}</div>`;
            }
            
            html += `</div>`; // Cierre de compact-indicators-row
            html += `</div>`; // Cierre de compact-days-wrapper
            html += `</div></div>

                <!-- MÓDULO 2: PALETA DE TURNOS (en el centro) -->
                <div class="planner-module planner-palette-inline">
                    <div class="planner-module-title">🎨 PALETA DE TURNOS</div>
                    <div class="planner-module-content">
                        <div style="display:flex; height:100%; gap:0;">
                            <!-- Fijos: columna izquierda -->`;
            html += `<div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0;">`;
            App.data.fixedShifts.filter(s => s.code !== 'DH').forEach(s => {
                const isSel = App.uiState.paintShiftId === s.id ? 'selected' : '';
                html += `<div class="palette-item palette-item-fixed ${isSel}" title="${s.desc}" style="border: 2px solid ${s.color}; background:transparent; border-color:${isSel?s.color:s.color}40; min-width:22px;" onclick="App.logic.setPaint('${s.id}')"><span style="color:${s.color}; font-weight:700;">${s.code}</span></div>`;
            });
            html += `</div><div style="width:1px; background:var(--border); margin:0 6px; align-self:stretch; flex-shrink:0;"></div><div style="display:grid; grid-template-columns:repeat(4,1fr); gap:3px; flex:1; align-content:start;">`;
            App.data.shiftDefs.sort((a,b)=>a.customOrder-b.customOrder).forEach(s => {
                const isSel = App.uiState.paintShiftId === s.id ? 'selected' : '';
                const isLight = Utils.isLightColor(s.color);
                const textColor = isLight ? '#000000' : '#ffffff';
                const shadowColor = isLight ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.8)';
                html += `<div class="palette-item ${isSel}" style="background:${s.color}; border-color:${isSel?'var(--text-main)':'transparent'}" onclick="App.logic.setPaint('${s.id}')"><span style="color:${textColor}; font-weight:700;">${s.code}</span></div>`;
            });
            html += `</div>
                        </div>
                    </div>
                </div>
                
                <!-- MÓDULO 3: CONTROLES DERECHOS (subdividido 70/30) -->
                <div class="planner-module planner-tools-box">
                    <!-- SUBMÓDULO 70%: BOTONES AUTOMÁTICOS -->
                    <div class="tools-submodule-auto">
                        <div class="planner-module-title">⚡ BOTONES AUTOMÁTICOS</div>
                        <div class="planner-module-content" style="padding:6px;">
                            <div class="tools-grid">
                                <div class="tools-column" style="position:relative;">
                                    <div class="tools-column-title" style="cursor:help;">Algoritmo</div>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">🪄 Turno</span>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">✨ Día</span>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">📅 Semana</span>
                                    <img id="algo-capi" src="data:image/webp;base64,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" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-36%);width:73px;height:73px;object-fit:contain;pointer-events:none;display:none;border-radius:10px;border:1.5px solid #cbd5e1;padding:3px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                                </div>
                                <div class="tools-column">
                                    <div class="tools-column-title">Borrar</div>
                                    <button class="tool-btn-unified tool-eraser ${App.uiState.paintShiftId === 'eraser' ? 'selected' : ''}" onclick="App.logic.setPaint('eraser')" title="Goma de borrar">🧽 Turno</button>
                                    <button class="tool-btn-unified tool-clear-day" title="Borrar todos los turnos del día" onclick="App.logic.massClearDay()">🗑️ Día</button>
                                    <button class="tool-btn-unified tool-clear-week" title="Vaciar toda la semana" onclick="App.logic.massClearWeek()">🧹 Semana</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${valleModuleHtml}
                ${vistaModuleHtml}
                ${dragModuleHtml}
            </div>
            </div>
            </div>`;

            
            if(App.uiState.plannerViewMode === 'individual') {
                html += App.ui._renderIndividualGrid(weekDays, monday, finalConfig, gridScale);
            } else {
            // REJILLA DE TURNOS (con sistema de escala)
            html += `<div class="planner-grid-wrapper-scale">
                <div class="planner-grid-module-scalable" id="planner-grid-scalable" style="transform: scale(${gridScale}); transform-origin: top left;">
                <div class="time-header">
                    <div class="th-left">NOMBRE</div>
                    <div class="th-rol">ROL</div>
                    <div class="th-tag">TAG</div>
                    <div class="th-hours">HRS</div>
                    <div class="th-schedule">HORARIO</div>
                    <div class="th-req">REQ</div>
                    <div class="th-right">`;
            // Empezar en 9:30 (26 slots de 30min desde 9:30 hasta 22:00 inclusive)
            const vS = toMin(App.data.config.valleStart || '14:00');
            const vE = toMin(App.data.config.valleEnd   || '17:00');
            const headerBg      = App.data.config.headerBgColor      || '#dde3ed';
            const valleHeaderBg = App.data.config.valleHeaderBgColor || '#bfdbfe';
            // Primera fila: HORAS
            for(let i=0;i<26;i++){ 
                const totalMin = 570 + (i * 30); // 9:30 = 570 minutos
                const h = Math.floor(totalMin / 60);
                const isValle = valleBolsa > 0 && totalMin >= vS && totalMin < vE;
                const bg = isValle ? `background:${valleHeaderBg};` : `background:${headerBg};`;
                const col = isValle ? 'color:#1e40af;' : 'color:#475569;';
                html+=`<div class="th-cell" style="font-size:0.85rem; font-weight:700; ${col}${bg}">${String(h).padStart(2,'0')}</div>`; 
            }
            // Segunda fila: MINUTOS
            for(let i=0;i<26;i++){ 
                const totalMin = 570 + (i * 30);
                const m = totalMin % 60;
                const isValle = valleBolsa > 0 && totalMin >= vS && totalMin < vE;
                const bg = isValle ? `background:${valleHeaderBg};` : `background:${headerBg};`;
                const col = isValle ? 'color:#3b82f6;' : 'color:#94a3b8;';
                html+=`<div class="th-cell" style="font-size:0.7rem; ${col}${bg}">${m===0?'00':'30'}</div>`; 
            }
            html += `</div></div><div class="planner-grid">`;
            
            // Filtrar empleados: activos + deshabilitados que tengan turno este día
            let empList = App.data.empleados.filter(e => {
                // Verificar vigencia por fecha
                if(!Utils.empleadoVigenteEnFecha(e, date)) {
                    // No vigente en esta fecha, solo mostrar si tiene turno asignado
                    return dayAssignments[e.id] !== undefined;
                }
                
                if (e.active !== false) return true; // Activos y vigentes siempre
                // Deshabilitados solo si tienen turno este día
                return dayAssignments[e.id] !== undefined;
            }).sort((a,b) => {
                const sk = App.uiState.sortKey || 'custom';
                if(sk === 'custom') return a.customOrder - b.customOrder;
                if(sk === 'contrato') return b.contrato - a.contrato;
                if(sk === 'rol') { 
                    const w = {"MNG":5,"AM":4,"SPV":3,"STF":2}; 
                    return (w[b.rol]||0) - (w[a.rol]||0); 
                }
                return (a[sk]||'').localeCompare(b[sk]||'');
            });

            // Modos de visualización
            const monoColor = App.data.config.gridMonoColor || '#1e3a5f';
            const isMoono   = !!App.uiState.gridMonocromo;
            const isDivid   = !!App.uiState.gridDividido;
            const isWorking = e => { const sid = (App.data.schedule[date]||{})[e.id]; const sh = sid ? Utils.getShift(sid) : null; return sh && sh.start && sh.end; };
            const trabajanHoy = isDivid ? empList.filter(isWorking)  : empList;
            const noTrabajan  = isDivid ? empList.filter(e => !isWorking(e)) : [];

            const renderEmpRow = (e) => {
                // --- 1. CÁLCULO DE DEUDA REAL (HISTORIAL + CURSOS ANTERIORES) ---
                let adeudadosTotal = 0;
                let compensadosTotal = 0;

                try {
                    // A. Contamos festivos del calendario donde el empleado estaba vigente
                    if (App.data.storeConfig.holidays) {
                        App.data.storeConfig.holidays.forEach(h => {
                            if (Utils.empleadoVigenteEnFecha(e, h.date)) {
                                // Calculamos el estado de ese festivo (si trabajó o coincidió con L)
                                const sid = App.data.schedule[h.date]?.[e.id];
                                const shift = sid ? Utils.getShift(sid) : null;
                                
                                if (shift) {
                                    let esDeuda = false;
                                    // Si trabajó (horas) o si es F pero no tiene las 2L de rigor (coincide)
                                    if (shift.start && shift.end) {
                                        esDeuda = true;
                                    } else if (shift.fixed && shift.code === 'F') {
                                        const mon = Utils.getMonday(h.date);
                                        const wdays = Utils.getWeekDays(mon);
                                        let countL = 0;
                                        wdays.forEach(d => {
                                            const s2 = App.data.schedule[d]?.[e.id];
                                            const sh2 = s2 ? Utils.getShift(s2) : null;
                                            if (sh2 && sh2.fixed && sh2.code === 'L') countL++;
                                        });
                                        if (countL < 2) esDeuda = true;
                                    }

                                    if (esDeuda) {
                                        adeudadosTotal++;
                                        // B. Si tiene una R asignada en el tracking, se resta de la deuda
                                        if (e.festivoTracking?.[h.date]?.rDate) {
                                            compensadosTotal++;
                                        }
                                    }
                                }
                            }
                        });
                    }
                } catch (err) { console.error("Error en balance global:", err); }

                // Cálculo final en días (convertido a horas si prefieres, x8)
                const ajusteFicha = parseFloat(e.recPendientes || 0) / 8; // recPendientes suele estar en horas
                const pendientesTotal = (adeudadosTotal - compensadosTotal) + ajusteFicha;
                const horasPendientes = pendientesTotal * 8;

                const txtTooltip = `📊 BALANCE GLOBAL FESTIVOS:\n` +
                                 `• Total Adeudados: ${adeudadosTotal} días\n` +
                                 `• Total Compensados: ${compensadosTotal} días\n` +
                                 (ajusteFicha !== 0 ? `• Ajuste manual: ${ajusteFicha.toFixed(1)} días\n` : '') +
                                 `---------------------------\n` +
                                 `💰 PENDIENTE: ${horasPendientes.toFixed(2)}h (${pendientesTotal.toFixed(1)} días)`;

                // --- 2. LÓGICA DE ROTACIÓN (PUNTO DE COLOR) ---
                let weekendIcon = '';
                try {
                    const monRot = Utils.getMonday(App.uiState.currentDate);
                    const status = App.logic.getLibreWeekendStatus(e, monRot);
                    if (status) {
                        const color = status.isLibre ? '#10b981' : '#ef4444';
                        weekendIcon = `<span style="color:${color}; margin-left:4px; font-size:10px;" title="${status.text}">●</span>`;
                    }
                } catch(err) {}

                // --- 3. VARIABLES DE RENDERIZADO (NO TOCAR) ---
                const date = App.uiState.currentDate;
                const dayAssignments = App.data.schedule[date] || {};
                const shiftId = dayAssignments[e.id];
                const shift = shiftId ? Utils.getShift(shiftId) : null;
                const request = Utils.getRequest(e.id, date);
                const isDisabled = e.active === false;
                const rolEnFecha = Utils.getRolEnFecha(e, date);
                const computedTag = ['MNG','AM','SPV'].includes(rolEnFecha) ? 3 : 1;
                const tag3Class = (computedTag >= 3) ? 'tag3-highlight' : '';
                const disabledBg = isDisabled ? 'background:#f1f5f9 !important;' : '';
                
                let nameContent = e.nombre + weekendIcon;
                if (isDisabled) nameContent += ' <span style="color:#94a3b8; font-size:0.75em;">(des)</span>';

                const tagClass = computedTag === 3 ? 'badge-tag-3' : 'badge-tag-1';
                const tagContent = `<span class="${tagClass}">T${computedTag}</span>`;
                const rolContent = `<span class="badge-role">${rolEnFecha}</span>`;

                let hoursContent = '<span style="color:#cbd5e1;">—</span>';
                let scheduleContent = '<span style="color:#cbd5e1;">—</span>';
                let scheduleColor = ''; 

                if(shift) {
                    if(shift.fixed) {
                        hoursContent = `<span style="color:${shift.color}; font-weight:700; font-size:0.8rem;">${shift.code}</span>`;
                        scheduleContent = `<span style="color:${shift.color}; font-size:0.6rem;">${shift.desc}</span>`;
                    } else if(shift.start && shift.end) {
                        const hours = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                        hoursContent = `${hours}h`;
                        scheduleColor = `color:${shift.color || '#6b7280'};font-weight:600;`;
                        scheduleContent = `${shift.start.substring(0,5)}-${shift.end.substring(0,5)}`;
                    }
                }

                let reqClass = ''; let reqIcon = '';
                if(request && request.status !== 'rejected') { 
                    let icon='⚠️'; if(request.type==='VAC') icon='🏖️'; if(request.type==='BAJ') icon='🏥'; 
                    if(request.type==='LIB') icon='🏠'; if(request.type==='AP') icon='📋'; if(request.type==='HRL') icon='⏰';
                    reqIcon = icon;
                    if(request.status === 'approved') reqClass = 'req-approved-attended';
                    else if(request.status === 'pending') reqClass = 'req-pending';
                }

                let absenceClass = '';
                if(shift && shift.fixed) {
                    const code = shift.code;
                    if(code === 'B' || code === 'P') absenceClass = 'absence-red';
                    else if(code === 'V') absenceClass = 'absence-purple';
                    else if(code === 'L' || code === 'F' || code === 'R' || code === 'DH') absenceClass = 'absence-green';
                }

                const isEditable = shift && !shift.fixed && shift.start && shift.end;
                const scheduleClick = isEditable ? `onclick="event.stopPropagation(); App.logic.editSchedule('${e.id}', '${date}')"` : '';
                const finalScheduleStyle = isDisabled ? disabledBg : `cursor:${isEditable?'pointer':'default'};${scheduleColor}`;

                // Monocromo: sobreescribir color del shift para el timeline (incluye turnos custom sin color propio)
                const shiftForTimeline = (isMoono && shift && shift.start && shift.end)
                    ? { ...shift, color: monoColor, barColor: monoColor }
                    : shift;

                // --- 4. SALIDA HTML ---
                html += `<div class="pg-row" onclick="App.logic.paint('${e.id}')">
                    <div class="pg-name ${tag3Class}" style="${disabledBg}; cursor:pointer;" title="${txtTooltip}" onclick="event.stopPropagation(); App.uiState.individualEmpId='${e.id}'; App.uiState.plannerViewMode='individual'; App.ui.renderPlanner(document.getElementById('main-view'));">${nameContent}</div>
                    <div class="pg-rol ${tag3Class}" style="${disabledBg}">${rolContent}</div>
                    <div class="pg-tag ${tag3Class}" style="${disabledBg}">${tagContent}</div>
                    <div class="pg-hours" style="${disabledBg}">${hoursContent}</div>
                    <div class="pg-schedule" ${scheduleClick} style="${finalScheduleStyle}" id="schedule-${e.id}">${scheduleContent}</div>
                    <div class="pg-req ${reqClass}" style="${disabledBg}">${reqIcon}</div>
                    <div class="pg-right ${absenceClass}" style="${disabledBg};position:relative;" ondragover="App.logic.shiftDragOver(event)" ondrop="App.logic.shiftDrop(event, '${e.id}', '${date}')" ondragleave="event.currentTarget.classList.remove('drag-over-active')">${Utils.renderPlannerTimeline(shiftForTimeline, finalConfig, e.id, date)}${Utils.renderEventosOverlay(e.id, date, finalConfig)}</div>
                </div>`;
            }; // fin renderEmpRow

            // Render trabajanHoy (siempre con contadores)
            trabajanHoy.forEach(e => renderEmpRow(e));

            // Cerrar planner-grid del bloque superior
            html += `</div>`;

            // Divisor y bloque no-trabajan (solo en modo dividido)
            if(isDivid && noTrabajan.length > 0) {
                html += `<div style="display:flex; align-items:center; gap:8px; margin:4px 0 2px; color:#94a3b8; font-size:0.62rem; font-weight:700; text-transform:uppercase; letter-spacing:0.5px;">
                    <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                    <span>🏠 No trabajan hoy (${noTrabajan.length})</span>
                    <div style="flex:1; height:1px; background:#e2e8f0;"></div>
                </div>`;
                // Nuevo grid para el bloque inferior (sin cabecera, mismas columnas)
                html += `<div class="planner-grid">`;
                noTrabajan.forEach(e => renderEmpRow(e));
                html += `</div>`;
            }
            
            // HUD INTEGRADO - Alineado con las columnas de la rejilla
            const rangeStart = 570; // 9:30 en minutos
            
            // Fila 1: Responsables Tag 3 (PRIMERO)
            html += `<div class="hud-integrated-row">
                <div class="hud-int-label">🔑 Responsables (Tag 3)</div>
                <div class="hud-int-cells">`;
            for(let i=0; i<26; i++) {
                const stats = App.logic.calcCoverage(date, rangeStart + (i * 30));
                let bgClass = '';
                if(stats.tag3 === 0) bgClass = 'bg-red'; 
                else if(stats.tag3 === 1) bgClass = 'bg-green-light'; 
                else if(stats.tag3 === 2) bgClass = 'bg-green-strong'; 
                else if(stats.tag3 >= 3) bgClass = 'bg-yellow';
                const slotMin = rangeStart + (i * 30);
                const isOpen = !finalConfig.closed && Utils.isStoreOpen(Math.floor((slotMin - 600) / 30), finalConfig.open, finalConfig.close);
                if(!isOpen) bgClass = 'bg-neutral'; 
                html += `<div class="hud-int-cell ${bgClass}"><span>${stats.tag3}</span></div>`;
            }
            html += `</div></div>`;
            
            // Fila 2: Total Personas (SEGUNDO) - con gradiente azul fijo
            html += `<div class="hud-integrated-row">
                <div class="hud-int-label">👥 Total Personas</div>
                <div class="hud-int-cells">`;
            for(let i=0; i<26; i++) {
                const stats = App.logic.calcCoverage(date, rangeStart + (i * 30));
                const total = stats.total;
                
                // Gradiente azul fijo (0-10 scale)
                let bgColor, textColor;
                if (total <= 1) {
                    // Alert zone: white background with red text
                    bgColor = '#ffffff';
                    textColor = '#ef4444';
                } else {
                    // Cap at 10 for gradient calculation
                    const level = Math.min(total, 10);
                    const intensity = (level - 2) / 8; // 0.0 to 1.0 for levels 2-10
                    
                    // Interpolate RGB from #e0f2fe (224,242,254) to #0369a1 (3,105,161)
                    const r = Math.round(224 - (221 * intensity));
                    const g = Math.round(242 - (137 * intensity));
                    const b = Math.round(254 - (93 * intensity));
                    bgColor = `rgb(${r},${g},${b})`;
                    
                    // Text color: dark for levels 2-5, white for 6-10+
                    textColor = intensity > 0.5 ? '#ffffff' : '#0c4a6e';
                }
                
                html += `<div class="hud-int-cell" style="background:${bgColor}; color:${textColor}; font-weight:700;"><span>${total}</span></div>`;
            }
            html += `</div></div>`;
            
            // Cerrar planner-grid-module-scalable y wrapper
            html += `</div></div>`;
            } // fin de modo grupo
            
            c.innerHTML = html;
            
            // Ajustar alturas de wrappers (el scale ya está inline, solo falta la altura)
            adjustWrapperHeights();
        },

        _renderIndividualGrid: function(weekDays, monday, todayConfig, gridScale) {
            const empId = App.uiState.individualEmpId;
            const emp = empId ? App.data.empleados.find(e => e.id === empId) : null;
            const isMoono   = !!App.uiState.gridMonocromo;
            const monoColor = App.data.config.gridMonoColor || '#1e3a5f';
            
            // Si no hay empleado seleccionado, seleccionar el primero activo
            if(!emp) {
                const first = App.data.empleados.find(e => e.active !== false);
                if(first) {
                    App.uiState.individualEmpId = first.id;
                    return App.ui._renderIndividualGrid(weekDays, monday, todayConfig, gridScale);
                }
                return `<div style="text-align:center; padding:60px; color:var(--text-muted);">No hay empleados activos.</div>`;
            }

            // Dropdown de empleados activos
            const activeEmps = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder);
            let selectHtml = `<select onchange="App.uiState.individualEmpId=this.value; App.ui.renderPlanner(document.getElementById('main-view'));" style="padding:5px 10px; border:1px solid var(--border); border-radius:6px; font-weight:700; font-size:0.85rem; cursor:pointer; background:white; max-width:220px;">`;
            activeEmps.forEach(e => {
                selectHtml += `<option value="${e.id}" ${e.id === empId ? 'selected' : ''}>${e.nombre} (${e.rol})</option>`;
            });
            selectHtml += `</select>`;

            // Botones copiar/pegar
            const hasCopied = !!App.uiState.copiedWeekPattern;
            const copyBtn = `<button class="btn btn-header" onclick="App.logic.copyWeekPattern()" style="padding:4px 10px; font-size:0.75rem;">📋 Copiar</button>`;
            const pasteBtn = `<button class="btn btn-header" onclick="App.logic.pasteWeekPattern()" style="padding:4px 10px; font-size:0.75rem; ${hasCopied ? '' : 'opacity:0.4; pointer-events:none;'}" ${hasCopied ? `title="Pegar patrón de ${App.uiState.copiedWeekPattern.sourceEmpName} (${App.uiState.copiedWeekPattern.sourceWeek})"` : ''}>📌 Pegar</button>`;

            // Horas contrato del empleado en esta semana (misma función que el balance)
            const contratHoras = Utils.getContrato(emp, monday);
            
            // Navegación prev/next entre empleados
            const empIdx = activeEmps.findIndex(e => e.id === empId);
            const prevEmp = empIdx > 0 ? activeEmps[empIdx - 1] : null;
            const nextEmp = empIdx < activeEmps.length - 1 ? activeEmps[empIdx + 1] : null;
            const arrowStyle = `padding:4px 8px; border:1px solid var(--border); border-radius:6px; background:white; font-size:0.85rem; cursor:pointer; font-weight:700; line-height:1;`;
            const prevBtn = prevEmp 
                ? `<button onclick="App.uiState.individualEmpId='${prevEmp.id}'; App.ui.renderPlanner(document.getElementById('main-view'));" style="${arrowStyle}" title="${prevEmp.nombre}">◀</button>`
                : `<button style="${arrowStyle} opacity:0.25; cursor:default;" disabled>◀</button>`;
            const nextBtn = nextEmp
                ? `<button onclick="App.uiState.individualEmpId='${nextEmp.id}'; App.ui.renderPlanner(document.getElementById('main-view'));" style="${arrowStyle}" title="${nextEmp.nombre}">▶</button>`
                : `<button style="${arrowStyle} opacity:0.25; cursor:default;" disabled>▶</button>`;

            let html = `<div style="margin-top:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; padding:10px 14px; background:white; border:1px solid var(--border); border-radius:8px 8px 0 0; border-bottom:2px solid var(--primary);">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="font-size:1.1rem;">👤</span>
                        ${prevBtn}
                        ${selectHtml}
                        ${nextBtn}
                        <span class="badge-role" style="font-size:0.7rem;">${emp.rol}</span>
                    </div>
                    <div style="display:flex; gap:6px; align-items:center;">
                        ${copyBtn} ${pasteBtn}
                        <div style="width:1px; height:20px; background:#e2e8f0;"></div>
                        <button class="btn btn-header" onclick="App.logic.openReplicator()" style="padding:4px 10px; font-size:0.75rem; background:#eff6ff; border-color:#3b82f6; color:#2563eb;">🔁 Replicar</button>
                    </div>
                </div>`;

            // Tabla de 7 días
            html += `<table class="data-table individual-week-table" style="font-size:0.82rem; border-radius:0 0 8px 8px; border-top:none;">
                <thead><tr>
                    <th style="width:65px; text-align:center;">Día</th>
                    <th style="width:55px; text-align:center;"></th>
                    <th style="width:90px; text-align:center;">Horario</th>
                    <th style="width:30px; text-align:center;">Req</th>
                    <th style="min-width:250px;">Gráfica (9:30–22:00)</th>
                    <th style="width:50px; text-align:center;">⏱</th>
                </tr></thead><tbody>`;

            let totalHours = 0;
            const dayNames = ['LUN','MAR','MIÉ','JUE','VIE','SÁB','DOM'];

            weekDays.forEach((d, i) => {
                const dayNum = d.split('-')[2];
                const shiftId = (App.data.schedule[d] || {})[empId];
                const shift = shiftId ? Utils.getShift(shiftId) : null;
                
                // Config del día (festivo, excepción, etc.)
                const dayKey = Utils.getDayKey(d);
                const holiday = App.data.storeConfig.holidays.find(h => h.date === d);
                const dayConfig = holiday ? App.data.storeConfig.base["Festivo"] : (App.data.storeConfig.base[dayKey] || {open:"10:00", close:"22:00", closed:false});
                const exception = App.data.storeConfig.special.find(s => s.date === d);
                const rowConfig = exception || dayConfig;
                
                // Bloqueado?
                const isLocked = App.data.lockedDays && App.data.lockedDays[d];
                
                // Tinte de ausencia (mismo sistema que grupal)
                let absenceClass = '';
                if(shift && shift.fixed) {
                    const code = shift.code;
                    if(code === 'B' || code === 'P') absenceClass = 'absence-red';
                    else if(code === 'V') absenceClass = 'absence-purple';
                    else if(code === 'L' || code === 'F' || code === 'R' || code === 'DH') absenceClass = 'absence-green';
                }

                // Horario — réplica exacta del grupal
                let scheduleContent = '<span style="color:#cbd5e1;">—</span>';
                let scheduleColor = '';
                let hours = 0;
                if(shift) {
                    if(shift.fixed) {
                        scheduleContent = `<span style="color:${shift.color}; font-size:0.65rem;">${shift.desc}</span>`;
                    } else if(shift.start && shift.end) {
                        hours = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                        scheduleColor = `color:${shift.color || '#6b7280'};font-weight:600;`;
                        scheduleContent = `${shift.start.substring(0,5)}-${shift.end.substring(0,5)}`;
                    }
                }
                if(hours > 0 && !(shift && shift.external)) {
                    totalHours += hours;
                }

                // REQ — réplica exacta del grupal
                const request = Utils.getRequest(empId, d);
                let reqClass = ''; let reqIcon = '';
                if(request && request.status !== 'rejected') {
                    let icon='⚠️'; if(request.type==='VAC') icon='🏖️'; if(request.type==='BAJ') icon='🏥';
                    if(request.type==='LIB') icon='🏠'; if(request.type==='AP') icon='📋'; if(request.type==='HRL') icon='⏰';
                    reqIcon = icon;
                    if(request.status === 'approved') reqClass = 'req-approved-attended';
                    else if(request.status === 'pending') reqClass = 'req-pending';
                }

                // Festivo
                const festivoCell = holiday 
                    ? `<span style="display:inline-block; padding:2px 6px; border-radius:4px; background:#ec4899; color:white; font-weight:700; font-size:0.55rem; letter-spacing:-0.02em;" title="${holiday.name || holiday.note || 'Festivo'}">FESTIVO</span>` 
                    : '';

                // Highlight del día activo (currentDate)
                const isActiveDay = d === App.uiState.currentDate;
                const activeDayStyle = isActiveDay ? 'font-weight:800; color:var(--primary);' : '';
                
                // Click handler: pintar turno en este día
                const clickHandler = isLocked ? '' : `onclick="App.uiState.currentDate='${d}'; App.logic.paint('${empId}')"`;
                const rowCursor = isLocked ? 'cursor:not-allowed;' : 'cursor:pointer;';
                const lockIcon = isLocked ? ' 🔒' : '';

                // Timeline
                const shiftForTimelineInd = (isMoono && shift && shift.start && shift.end)
                    ? { ...shift, color: monoColor, barColor: monoColor }
                    : shift;
                const timeline = Utils.renderPlannerTimeline(shiftForTimelineInd, rowConfig, empId, d);

                html += `<tr class="${absenceClass}" ${clickHandler} style="${rowCursor}">
                    <td style="text-align:center; ${activeDayStyle}">
                        <div style="font-weight:700; font-size:0.8rem;">${dayNames[i]}</div>
                        <div style="font-size:0.7rem; color:var(--text-muted);">${dayNum}${lockIcon}</div>
                    </td>
                    <td style="text-align:center; padding:2px;">${festivoCell}</td>
                    <td style="text-align:center; ${scheduleColor}">${scheduleContent}</td>
                    <td class="${reqClass}" style="text-align:center;">${reqIcon}</td>
                    <td style="padding:4px 8px;position:relative;" ondragover="App.logic.shiftDragOver(event)" ondrop="App.logic.shiftDrop(event, '${empId}', '${d}')" ondragleave="event.currentTarget.classList.remove('drag-over-active')">${timeline}${Utils.renderEventosOverlay(empId, d, rowConfig)}</td>
                    <td style="text-align:center; font-weight:700;">${hours > 0 ? hours + 'h' : ''}</td>
                </tr>`;
            });

            // Fila total — incluir horas justificadas (V, R, B, P, F) igual que el balance semanal
            const { justifiedH } = Utils.calcEsperadas(contratHoras, weekDays, empId);
            const effectiveTotal = Math.round((totalHours + justifiedH) * 10) / 10;
            const diff = Math.round((effectiveTotal - contratHoras) * 10) / 10;
            const diffColor = diff > 0 ? '#22c55e' : (diff < 0 ? '#ef4444' : 'var(--text-muted)');
            const diffSign = diff > 0 ? '+' : '';
            const justifiedNote = justifiedH > 0 ? `<div style="font-size:0.65rem; color:#a78bfa;" title="Horas cubiertas por ausencias justificadas (V, R, B, P, F)">✦ ${justifiedH}h justif.</div>` : '';
            html += `</tbody><tfoot><tr style="background:#f8fafc; font-weight:700;">
                <td colspan="5" style="text-align:right; padding-right:15px; font-size:0.8rem;">
                    TOTAL SEMANA
                    <span style="margin-left:10px; font-weight:500; color:var(--text-muted); font-size:0.75rem;">(contrato: ${contratHoras}h)</span>
                </td>
                <td style="text-align:center; font-size:0.9rem;">
                    ${totalHours}h
                    ${justifiedNote}
                    <div style="font-size:0.7rem; color:${diffColor};">${diffSign}${diff}h</div>
                </td>
            </tr></tfoot></table></div>`;

            return html;
        },

        // --- SHIFTS ---
});

// --- LÓGICA COPIAR/PEGAR SEMANA (Vista Individual) ---
App.logic.copyWeekPattern = function() {
    const empId = App.uiState.individualEmpId;
    const emp = App.data.empleados.find(e => e.id === empId);
    if(!emp) return;

    const monday = Utils.getMonday(App.uiState.currentDate);
    const weekDays = Utils.getWeekDays(monday);
    const weekNum = Utils.getWeekCode ? Utils.getWeekCode(monday) : monday;

    const shifts = {};
    weekDays.forEach(d => {
        shifts[d] = (App.data.schedule[d] || {})[empId] || null;
    });

    App.uiState.copiedWeekPattern = {
        sourceEmpId: empId,
        sourceEmpName: emp.nombre,
        sourceWeek: weekNum,
        sourceMonday: monday,
        shifts: shifts
    };

    App.ui.renderPlanner(document.getElementById('main-view'));
};

App.logic.pasteWeekPattern = function() {
    const pattern = App.uiState.copiedWeekPattern;
    if(!pattern) return;

    const empId = App.uiState.individualEmpId;
    const emp = App.data.empleados.find(e => e.id === empId);
    if(!emp) return;

    const monday = Utils.getMonday(App.uiState.currentDate);
    const weekDays = Utils.getWeekDays(monday);
    const sourceWeekDays = Utils.getWeekDays(pattern.sourceMonday);

    if(!confirm(`¿Pegar patrón de ${pattern.sourceEmpName} (${pattern.sourceWeek}) sobre la semana actual de ${emp.nombre}?\n\nEsto sobreescribirá los turnos existentes.`)) return;

    let skipped = 0;
    weekDays.forEach((d, i) => {
        // Respetar días bloqueados
        if(App.data.lockedDays && App.data.lockedDays[d]) { skipped++; return; }

        const sourceDay = sourceWeekDays[i];
        const sourceShift = pattern.shifts[sourceDay];

        if(!App.data.schedule[d]) App.data.schedule[d] = {};

        if(sourceShift) {
            App.data.schedule[d][empId] = sourceShift;
        } else {
            delete App.data.schedule[d][empId];
        }
    });

    App.logic.saveSnapshot('Pegar patrón semanal');
    Safe.save('v40_db', App.data);
    App.logic.checkAlerts();

    let msg = `✅ Patrón aplicado a ${emp.nombre}`;
    if(skipped > 0) msg += `\n\n⚠️ ${skipped} día(s) bloqueado(s) se han saltado.`;
    alert(msg);

    App.ui.renderPlanner(document.getElementById('main-view'));
};