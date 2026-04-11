// ============================================================
// UI: Grid del planificador
// ============================================================

Object.assign(App.ui, {
        renderPlanner: function(c) {
            const date = App.uiState.currentDate; 
            const monday = Utils.getMonday(date);
            const weekDays = Utils.getWeekDays(monday);
            const _monParts = monday.split('-');
            const _MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
            const _sunDate = new Date(monday + 'T12:00:00');
            _sunDate.setDate(_sunDate.getDate() + 6);
            const _sunMonth = _sunDate.getMonth() + 1;
            const _sunYear  = _sunDate.getFullYear();
            const _monMonth = parseInt(_monParts[1]);
            const _monYear  = parseInt(_monParts[0]);
            const _monthLabel = (_monMonth === _sunMonth)
                ? _MESES[_monMonth - 1] + ' ' + _monYear
                : (_monYear !== _sunYear)
                    ? _MESES[_monMonth - 1] + ' ' + _monYear + ' – ' + _MESES[_sunMonth - 1] + ' ' + _sunYear
                    : _MESES[_monMonth - 1] + ' – ' + _MESES[_sunMonth - 1] + ' ' + _monYear;
            const dayAssignments = App.data.schedule[date] || {};
            const dayKey = Utils.getDayKey(date);
            const holiday = App.data.storeConfig.holidays.find(h => h.date === date);
            const dayConfig = holiday ? App.data.storeConfig.base["Festivo"] : (App.data.storeConfig.base[dayKey] || {open:"10:00", close:"22:00", closed:false});
            const exception = App.data.storeConfig.special.find(s => s.date === date);
            const finalConfig = exception || dayConfig;

            // Calcular scale ANTES de generar HTML para aplicarlo inline
            const availableWidth = c.clientWidth;
            const rightColWidth = 87; // 75px + 12px gap — columna VISTA (+VALLE)
            const controlsScale = Math.min(1, (availableWidth - 40) / (985 + rightColWidth));
            const gridScale = Math.min(1, (availableWidth - 40) / 1465);

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

            // Módulo VALLE — número grande + barra fina
            let _valleCircle = '';
            if(valleBolsa > 0) {
                const _res  = Math.round((valleBolsa - valleConsumed) * 10) / 10;
                const _pct  = Math.min(valleConsumed / valleBolsa, 1);
                const _rc       = _res > 0 ? '#10b981' : _res < 0 ? '#ef4444' : '#94a3b8';
                const _rs       = _res > 0 ? '+' : '';
                const _barScale = 10;
                const _barGreen = _res >= 0 ? Math.round(Math.min(_res / _barScale, 1) * 100) : 0;
                const _barRed   = _res <  0 ? Math.round(Math.min(-_res / _barScale, 1) * 100) : 0;
                _valleCircle = `
                    <div style="display:flex; flex-direction:column; align-items:center; gap:3px; width:100%; padding:2px 6px; box-sizing:border-box; cursor:default;"
                         onmouseenter="const t=document.getElementById('valle-tip');const r=this.getBoundingClientRect();t.style.left=(r.left+r.width/2)+'px';t.style.top=(r.top-8)+'px';t.style.display='block';"
                         onmouseleave="document.getElementById('valle-tip').style.display='none';">
                        <div style="line-height:1; margin-top:2px;">
                            <span style="font-size:1.09rem; font-weight:800; color:${_rc}; font-family:monospace; letter-spacing:-0.03em;">${_rs}${_res}h</span>
                        </div>
                        <div style="width:100%; height:5px; background:#e2e8f0; border-radius:3px; overflow:hidden; margin-top:1px;">
                            <div style="width:${_barGreen > 0 ? _barGreen : _barRed}%; height:100%; background:${_res >= 0 ? '#10b981' : '#ef4444'}; border-radius:3px;"></div>
                        </div>
                    </div>
                    <div id="valle-tip" style="display:none; position:fixed; transform:translate(-50%,-100%); background:#1e293b; color:white; border-radius:8px; padding:8px 10px; font-size:0.68rem; line-height:1.5; white-space:nowrap; z-index:9999; pointer-events:none; box-shadow:0 4px 12px rgba(0,0,0,0.2);">
                        <div style="font-weight:700; margin-bottom:4px; color:#94a3b8; font-size:0.6rem; text-transform:uppercase; letter-spacing:0.05em;">Tramo valle</div>
                        <div>${valleStart}–${valleEnd} &nbsp;·&nbsp; ${valleConsumed}h consumidas de ${valleBolsa}h</div>
                        <div style="margin-top:4px; color:#94a3b8; font-size:0.65rem;">Horas de baja actividad. En verde mientras<br>queda bolsa; en rojo si se supera.</div>
                    </div>`;
            }
            const valleModuleHtml = valleBolsa > 0 ? `<div class="planner-module" style="flex:1 1 auto; width:100%;">
                <div class="planner-module-title" style="padding:2px 8px; font-size:0.48rem; letter-spacing:0.1em;">VALLE</div>
                <div class="planner-module-content" style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; padding:4px 6px;">
                    ${_valleCircle}
                </div>
            </div>` : '';

            // Módulo CONTROLES — VISTA + DRAG fusionados
            const _isMoono = !!App.uiState.gridMonocromo;
            const _isDivid = !!App.uiState.gridDividido;
            const _bS = (active) => 'flex:1; padding:3px 5px; border:none; outline:none; border-radius:8px; font-size:0.62rem; font-weight:700; cursor:pointer; transition:background 0.15s, color 0.15s; white-space:nowrap; background:' + (active?'#2563eb':'transparent') + '; color:' + (active?'white':'#64748b') + ';';
            const _row = (labelA, titleA, onA, activeA, labelB, titleB, onB, activeB, disabled) => {
                const disStyle = disabled ? 'opacity:0.35; filter:grayscale(1); pointer-events:none;' : '';
                return '<div style="display:flex; width:100%; background:#f1f5f9; border-radius:8px; padding:2px; gap:1px; overflow:hidden; ' + disStyle + '">'  +
                '<button tabindex="-1" onclick="' + onA + '" title="' + titleA + '" style="' + _bS(activeA) + '">' + labelA + '</button>' +
                '<button tabindex="-1" onclick="' + onB + '" title="' + titleB + '" style="' + _bS(activeB) + '">' + labelB + '</button>' +
                '</div>';
            };
            const _dragSwitch = () => { return ''; }; // Eliminado: el intercambio se hace por click-select
            const _labeledRow = (title, labelA, titleA, onA, activeA, labelB, titleB, onB, activeB, disabled) => {
                return '<div style="display:flex; flex-direction:column; gap:1px;' + (disabled ? ' opacity:0.35; filter:grayscale(1); pointer-events:none;' : '') + '">'
                    + '<span style="font-size:0.45rem; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.05em; text-align:center;">' + title + '</span>'
                    + '<div style="display:flex; width:100%; background:#f1f5f9; border-radius:8px; padding:2px; gap:1px; overflow:hidden;">'
                    + '<button tabindex="-1" onclick="' + onA + '" title="' + titleA + '" style="' + _bS(activeA) + '">' + labelA + '</button>'
                    + '<button tabindex="-1" onclick="' + onB + '" title="' + titleB + '" style="' + _bS(activeB) + '">' + labelB + '</button>'
                    + '</div></div>';
            };
            const vistaModuleHtml = `<div class="planner-module" style="width:100%;">
                <div class="planner-module-title" style="padding:2px 8px; font-size:0.48rem; letter-spacing:0.1em;">VISTA</div>
                <div class="planner-module-content" style="display:flex; flex-direction:column; gap:3px; padding:4px 5px; justify-content:center;">
                        ${_labeledRow('Equipo','<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>','Grupo',"App.uiState.plannerViewMode='group'; App.ui.renderPlanner(document.getElementById('main-view'));",!isIndividual,'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>','Individual',"if(!App.uiState.individualEmpId){const first=App.data.empleados.filter(e=>e.active!==false).sort((a,b)=>a.customOrder-b.customOrder)[0]; if(first)App.uiState.individualEmpId=first.id;} App.uiState.plannerViewMode='individual'; App.ui.renderPlanner(document.getElementById('main-view'));",isIndividual,false)}
                        ${_labeledRow('Grid','<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="7" rx="1"/><rect x="3" y="14" width="18" height="7" rx="1"/></svg>','Junto',"App.uiState.gridDividido=false; App.ui.renderPlanner(document.getElementById('main-view'));",!_isDivid,'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1"/><rect x="14" y="3" width="7" height="18" rx="1"/></svg>','Separado',"App.uiState.gridDividido=true; App.ui.renderPlanner(document.getElementById('main-view'));",_isDivid,isIndividual)}
                        ${_labeledRow('Color','<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/></svg>','Color',"App.uiState.gridMonocromo=false; App.ui.renderPlanner(document.getElementById('main-view'));",!_isMoono,'<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18V3z" fill="currentColor" stroke="none"/></svg>','Monocromo',"App.uiState.gridMonocromo=true; App.ui.renderPlanner(document.getElementById('main-view'));",_isMoono,isIndividual)}
                </div>
            </div>`;

            let html = `<div class="planner-controls-super-wrapper">
                <div class="planner-controls-super" id="planner-controls-super" style="transform: scale(${controlsScale}); transform-origin: top left; width:${985 + rightColWidth}px; min-width:${985 + rightColWidth}px;">
                <div class="planner-controls">
                <!-- MÓDULO 1: NAVEGADOR -->
                <div class="planner-module planner-navigator">
                    <div class="planner-module-title" style="padding:2px 8px; font-size:0.48rem; letter-spacing:0.1em;">NAVEGADOR</div>
                    <div class="planner-module-content">
                        <div class="week-selector" style="display:flex; align-items:center; justify-content:center; gap:10px;">
                            <div style="display:flex; flex-direction:column; align-items:center; gap:3px; border:1px solid #e2e8f0; border-radius:8px; background:white; padding:5px 8px;">
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
                                <span style="font-size:0.58rem; color:#94a3b8; font-weight:500; pointer-events:none; white-space:nowrap;">${_monthLabel}</span>
                            </div>
                            <div style="display:flex; align-items:center;">
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
                    <div class="planner-module-title" style="padding:2px 8px; font-size:0.48rem; letter-spacing:0.1em;">PALETA DE TURNOS</div>
                    <div class="planner-module-content">
                        <div style="display:flex; height:100%; gap:0;">
                            <!-- Fijos: columna izquierda -->`;
            html += `<div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0;">`;
            App.data.fixedShifts.filter(s => s.code !== 'DH').forEach(s => {
                const isSel = App.uiState.paintShiftId === s.id ? 'selected' : '';
                html += `<div class="palette-item palette-item-fixed ${isSel}" title="${s.desc}" style="border: 2px solid ${s.color}; background:transparent; border-color:${isSel?s.color:s.color}40; min-width:19px;" onclick="App.logic.setPaint('${s.id}')"><span style="color:${s.color}; font-weight:700;">${s.code}</span></div>`;
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
                <div style="display:flex; flex-direction:column; gap:8px; align-self:flex-start; width:fit-content;">
                <div class="planner-module planner-tools-box" style="flex:0 0 auto; height:auto; width:fit-content;">
                    <!-- SUBMÓDULO 70%: BOTONES AUTOMÁTICOS -->
                    <div class="tools-submodule-auto" style="height:auto; display:flex; flex-direction:column;">
                        <div class="planner-module-title" style="padding:2px 8px; font-size:0.48rem; letter-spacing:0.1em;">BOTONES AUTOMÁTICOS</div>
                        <div class="planner-module-content" style="padding:6px; height:auto; flex:0 0 auto;">
                            <div class="tools-grid" style="font-size:0.8em; gap:3px; display:flex; width:fit-content;">
                                <div class="tools-column" style="position:relative; flex:0 0 60px; width:60px;">
                                    <div class="tools-column-title" style="cursor:help; font-size:0.44rem; letter-spacing:0.06em;">Magic</div>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:2px 3px; border-radius:4px; font-weight:600; font-size:0.42rem; border:1px solid #e2e8f0; display:flex; gap:2px; align-items:center; justify-content:center; white-space:nowrap; min-height:18px; background:white; opacity:0.35; filter:grayscale(1); cursor:help; width:100%; box-sizing:border-box; overflow:hidden;"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Turno</span>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:2px 3px; border-radius:4px; font-weight:600; font-size:0.42rem; border:1px solid #e2e8f0; display:flex; gap:2px; align-items:center; justify-content:center; white-space:nowrap; min-height:18px; background:white; opacity:0.35; filter:grayscale(1); cursor:help; width:100%; box-sizing:border-box; overflow:hidden;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="7.05" y2="7.05"/><line x1="16.95" y1="16.95" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="7.05" y2="16.95"/><line x1="16.95" y1="7.05" x2="19.78" y2="4.22"/></svg> Día</span>
                                    <span onmousedown="document.getElementById('algo-capi').style.display='block'" onmouseup="document.getElementById('algo-capi').style.display='none'" onmouseleave="document.getElementById('algo-capi').style.display='none'" style="padding:2px 3px; border-radius:4px; font-weight:600; font-size:0.42rem; border:1px solid #e2e8f0; display:flex; gap:2px; align-items:center; justify-content:center; white-space:nowrap; min-height:18px; background:white; opacity:0.35; filter:grayscale(1); cursor:help; width:100%; box-sizing:border-box; overflow:hidden;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg> Semana</span>
                                    <img id="algo-capi" src="data:image/webp;base64,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" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-36%);width:73px;height:73px;object-fit:contain;pointer-events:none;display:none;border-radius:10px;border:1.5px solid #cbd5e1;padding:3px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
                                </div>
                                <div class="tools-column" style="flex:0 0 60px; width:60px;">
                                    <div class="tools-column-title" style="font-size:0.44rem; letter-spacing:0.06em;">Borrar</div>
                                    <button class="tool-btn-unified tool-eraser ${App.uiState.paintShiftId === 'eraser' ? 'selected' : ''}" onclick="App.logic.setPaint('eraser')" title="Goma de borrar" style="padding:2px 3px; font-size:0.42rem; min-height:18px; line-height:1; display:flex; align-items:center; gap:2px; box-sizing:border-box; width:100%;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20H7L3 16l13-13 6 6-3.5 3.5"/><path d="M6.5 17.5l3-3"/></svg> Turno</button>
                                    <button class="tool-btn-unified tool-clear-day" title="Borrar todos los turnos del día" onclick="App.logic.massClearDay()" style="padding:2px 3px; font-size:0.42rem; min-height:18px; line-height:1; display:flex; align-items:center; gap:2px; box-sizing:border-box; width:100%;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg> Día</button>
                                    <button class="tool-btn-unified tool-clear-week" title="Vaciar toda la semana" onclick="App.logic.massClearWeek()" style="padding:2px 3px; font-size:0.42rem; min-height:18px; line-height:1; display:flex; align-items:center; gap:2px; box-sizing:border-box; width:100%;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg> Semana</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ${valleBolsa > 0 ? valleModuleHtml : ''}
                </div>
                <div style="display:flex; flex-direction:column; gap:8px; flex:0 0 auto; width:auto;">
                    ${vistaModuleHtml}
                </div>
            </div>
            </div>
            </div>`;


            if(App.uiState.plannerViewMode === 'individual') {
                html += App.ui._renderIndividualGrid(weekDays, monday, finalConfig, gridScale);
            } else {
            // REJILLA DE TURNOS (con sistema de escala)
            const _weekClosed = App.logic.getWeekState(monday) === 'closed';
            html += `<div class="planner-grid-wrapper-scale">
                <div class="planner-grid-module-scalable" id="planner-grid-scalable" style="transform: scale(${gridScale}); transform-origin: top left;${_weekClosed ? ' border-color:#22c55e;' : ''}">
                <div class="time-header">
                    <div class="th-left">NOMBRE</div>
                    <div class="th-llave">🔑</div>
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

                // Iconos de llave — columna separada
                let llaveContent = '';
                if(App.data.config.llavesActivo && App.data.traspasoLlaves) {
                    const KEY_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><circle cx="8" cy="15" r="4"/><line x1="11.5" y1="11.5" x2="22" y2="1"/><line x1="18" y1="5" x2="21" y2="2"/><line x1="15" y1="8" x2="18" y2="5"/></svg>';
                    const ARW_OUT = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#ef4444" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="2" y1="8" x2="13" y2="8"/><polyline points="9 4 13 8 9 12"/></svg>';
                    const ARW_IN  = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#22c55e" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><line x1="14" y1="8" x2="3" y2="8"/><polyline points="7 4 3 8 7 12"/></svg>';
                    // dadorId:null = ancla de inicio (sin flecha); excluirla de recibe/entrega
                    const recibe      = App.data.traspasoLlaves.some(t => t.receptorId === e.id && t.dadorId != null && t.fecha === date);
                    const entrega     = App.data.traspasoLlaves.some(t => t.dadorId    === e.id && t.fecha === date);
                    const dejaTienda  = App.data.traspasoLlaves.some(t => t.dadorId === e.id && t.receptorId === '__TIENDA__' && t.fecha === date);
                    const cogeTienda  = App.data.traspasoLlaves.some(t => t.receptorId === e.id && t.dadorId === '__TIENDA__' && t.fecha === date);
                    const tieneLlave  = (App.data.config.llaves || []).some(l => App.logic.getTitularLlave(l.id, date) === e.id);
                    const STORE = '<svg width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><path d="M2 6h12v8H2z"/><path d="M1 6l2-4h10l2 4"/><line x1="6" y1="10" x2="10" y2="10"/></svg>';
                    if(dejaTienda)      llaveContent = KEY_SVG + ARW_OUT + STORE;
                    else if(cogeTienda) llaveContent = KEY_SVG + ARW_IN  + STORE;
                    else if(entrega)    llaveContent = KEY_SVG + ARW_OUT;
                    else if(recibe)     llaveContent = ARW_IN  + KEY_SVG;
                    else if(tieneLlave) llaveContent = KEY_SVG;
                }

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
                    <div class="pg-llave ${tag3Class}" style="${disabledBg}">${llaveContent}</div>
                    <div class="pg-rol ${tag3Class}" style="${disabledBg}">${rolContent}</div>
                    <div class="pg-tag ${tag3Class}" style="${disabledBg}">${tagContent}</div>
                    <div class="pg-hours" style="${disabledBg}">${hoursContent}</div>
                    <div class="pg-schedule" ${scheduleClick} style="${finalScheduleStyle}" id="schedule-${e.id}">${scheduleContent}</div>
                    <div class="pg-req ${reqClass}" style="${disabledBg}">${reqIcon}</div>
                    <div class="pg-right ${absenceClass}" style="${disabledBg};position:relative;" onclick="if(event.target===event.currentTarget||event.target.classList.contains('pt-slot')||event.target.classList.contains('pt-bg-grid')){event.stopPropagation();if(App.uiState._gridSwap&&App.uiState._gridSwap.a){App.logic._gridSwapSelect('${e.id}','${date}');}else{App.logic.paint('${e.id}');}}">${Utils.renderPlannerTimeline(shiftForTimeline, finalConfig, e.id, date)}${Utils.renderEventosOverlay(e.id, date, finalConfig)}</div>
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
            
            // ── Barra de intercambio (debajo del grid, no desplaza nada) ──
            const _gsw = App.uiState._gridSwap || {};
            if (_gsw.a && _gsw.b && _gsw.a.date === _gsw.b.date) {
                const _empA = App.data.empleados.find(e => e.id === _gsw.a.empId);
                const _empB = App.data.empleados.find(e => e.id === _gsw.b.empId);
                const _dayLabel = Utils.getDayName(_gsw.a.date) + ' ' + _gsw.a.date.split('-')[2];
                html += `<div style="padding:6px 12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;margin:4px 0;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:0.8rem;color:#92400e;font-weight:600;">
                        ${_empA ? _empA.nombre : '?'} ⇄ ${_empB ? _empB.nombre : '?'} · ${_dayLabel}
                    </span>
                    <div style="display:flex;gap:4px;">
                        <button onclick="App.logic._gridSwapExec()" style="padding:4px 12px;border:none;border-radius:5px;background:#2563eb;color:white;font-size:0.78rem;font-weight:700;cursor:pointer;">Intercambiar</button>
                        <button onclick="App.uiState._gridSwap={};App.ui.renderPlanner(document.getElementById('main-view'));" style="padding:4px 12px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.78rem;font-weight:600;cursor:pointer;">Cancelar</button>
                    </div>
                </div>`;
            } else if (_gsw.a && !_gsw.b) {
                const _empSel = App.data.empleados.find(e => e.id === _gsw.a.empId);
                const _shSel = Utils.getShift((App.data.schedule[_gsw.a.date] || {})[_gsw.a.empId]);
                const _dayL = Utils.getDayName(_gsw.a.date) + ' ' + _gsw.a.date.split('-')[2];
                html += `<div style="padding:5px 12px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;margin:4px 0;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                    <span style="font-size:0.78rem;color:#1e40af;font-weight:500;">
                        ${_empSel ? _empSel.nombre : '?'} · ${_shSel ? (_shSel.code || _shSel.start+'-'+_shSel.end) : 'vacío'} · ${_dayL} — selecciona otro empleado del mismo día
                    </span>
                    <button onclick="App.uiState._gridSwap={};App.ui.renderPlanner(document.getElementById('main-view'));" style="padding:3px 10px;border:1px solid #e2e8f0;border-radius:5px;background:white;color:#64748b;font-size:0.72rem;font-weight:600;cursor:pointer;">Cancelar</button>
                </div>`;
            }

            c.innerHTML = html;

            // Ajustar alturas de wrappers (el scale ya está inline, solo falta la altura)
            adjustWrapperHeights();

        // Escape = cancelar selección de intercambio
        if(!window._ctrlDragHandler) {
            window._ctrlDragHandler = true;
            document.addEventListener('keydown', e => {
                if(e.key === 'Escape' && App.uiState._gridSwap && App.uiState._gridSwap.a) {
                    App.uiState._gridSwap = {};
                    App.ui.renderPlanner(document.getElementById('main-view'));
                }
            });
        }
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
                    <td style="padding:4px 8px;position:relative;">${timeline}${Utils.renderEventosOverlay(empId, d, rowConfig)}</td>
                    <td style="text-align:center; font-weight:700;">${hours > 0 ? hours + 'h' : ''}</td>
                </tr>`;
            });

            // Fila total — incluir horas justificadas (V, R, B, P, F) igual que el balance semanal
            const { justifiedH } = Utils.calcEsperadas(emp, weekDays, empId);
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