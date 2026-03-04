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
            const controlsScale = Math.min(1, (availableWidth - 40) / 985);
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

            let html = `<div class="planner-controls-super-wrapper">
                <div class="planner-controls-super" id="planner-controls-super" style="transform: scale(${controlsScale}); transform-origin: top left;">
                <div class="planner-controls">
                <!-- MÓDULO 1: NAVEGADOR -->
                <div class="planner-module planner-navigator">
                    <div class="planner-module-title">📅 NAVEGADOR</div>
                    <div class="planner-module-content">
                        <div class="week-selector">
                            <button class="week-btn" onclick="App.logic.changeWeek(-1)">◀</button>
                            <select id="week-dropdown" onchange="App.logic.goToWeek(this.value)" style="padding:4px 6px; border:1px solid var(--border); border-radius:4px; font-weight:600; cursor:pointer; background:white; font-size:0.75rem; text-align:center;">
                                ${App.logic.getWeekOptions(monday)}
                            </select>
                            <button class="week-btn" onclick="App.logic.changeWeek(1)">▶</button>
                        </div>
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
            
            html += `                        <div style="margin-top:6px; display:flex; align-items:center; justify-content:space-between; font-size:0.65rem; color:var(--text-muted); padding:0 4px;">
                            <div style="display:flex; gap:8px; flex-wrap:wrap;">
                                <div style="display:flex; align-items:center; gap:3px;">
                                    <div class="day-indicator-dot festivo"></div>
                                    <span>Festivo</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:3px;">
                                    <div class="day-indicator-dot cerrado"></div>
                                    <span>Cerrado</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:3px;">
                                    <div class="day-indicator-dot especial"></div>
                                    <span>Especial</span>
                                </div>
                                <div style="display:flex; align-items:center; gap:3px;">
                                    <div class="day-indicator-dot domingo"></div>
                                    <span>Domingo</span>
                                </div>
                            </div>
                            <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
                                ${App.logic._weekStateRowHTML(monday)}
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- MÓDULO 2: PALETA DE TURNOS (en el centro) -->
                <div class="planner-module planner-palette-inline">
                    <div class="planner-module-title">🎨 PALETA DE TURNOS</div>
                    <div class="planner-module-content">
                        <div style="display:flex; height:100%; gap:0;">
                            <!-- Fijos: columna izquierda -->`;
            html += `<div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0;">`;
            App.data.fixedShifts.forEach(s => {
                const isSel = App.uiState.paintShiftId === s.id ? 'selected' : '';
                html += `<div class="palette-item palette-item-fixed ${isSel}" style="border: 2px solid ${s.color}; background:transparent; border-color:${isSel?s.color:s.color}40; min-width:22px;" onclick="App.logic.setPaint('${s.id}')"><span style="color:${s.color}; font-weight:700;">${s.code}</span></div>`;
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
                                <div class="tools-column" onmouseenter="(function(el){var t=document.getElementById('algo-tooltip');if(!t){t=document.createElement('div');t.id='algo-tooltip';t.style.cssText='position:fixed;display:flex;flex-direction:column;align-items:center;background:white;border:2px solid #2563eb;border-radius:12px;padding:12px 14px;box-shadow:0 8px 24px rgba(0,0,0,0.18);z-index:99999;width:170px;pointer-events:none;';t.innerHTML='<img src=\\'data:image/webp;base64,UklGRjYLAABXRUJQVlA4ICoLAADwKwCdASp4AHgAPm0wk0akIyGhLBiqaIANiWgA1bXA/oHXwaD9N5uVXfvH485Q02HZ1OX8wTnSeYD7ZvdL9Gfmif3TrDvQA8ub2aP3c9LvVgWVd7vjp9yyZu9PUd7T/3nlp3q8AJ1HaBd8+I/xAP1I8aLw5vOfYF/KP/a/tXsE/9X+o8/X0R/4f8v8A383/sn/c9bX2Lfur7Jf7Rns2jkFdRmahPWmwTz8gsroBtuGj+39Xn84exdN1DWepB9sZS2Abucb2zLvudBfBb2M9hQpXtTs+IW2pD3zVAfgdRAAZ9XNxe2Qi1oJTdB8FVWFfYmeXlQx6Ji30xbR/Zlqaj2K8H3XQ6BO89RnN1IqV4DDfx1T3l5rPDxj+7a3MZ5CfxwIoTY8UdpJ+g+B9wiP5B/PVTluJNijNdsHEdCm1ywuiwqXXWPP3C9KV54cPyFRVMgLGfIC0F6Oe+bt3JhDLMdOk66933JuOBAA/vZV3D1E5OR3+Pc72e9f1DWKaIIgx+0/M/e+uSrTzH+z/yyLhHG5h/NxkZQ2SkN0DUznjnuolC7y6bBi5deNvIfdmtlDbv7e8wskkSJhvvKsjB0f/WZuGs6RQN5j89is/fRwUL9WW6Jmdrbo79sH732uVZfA2Y2SSDIY7+Pud20BeBPJFsnON/NrdzR/sG0h9QkPcP9lc9kL91Ea8nMMoAtQHdbXGIou/3LxLU6E40Wmw4HgD/qfNHrJZWl8x10LwYK9rYc/lN+uM3bA1MuwT47aKkX7ejQcsVWVwyUtqxQ9CgAPsqzVaJhd0ET3FbFfSwVwaWzFVQOgZj+YqHiMgAi/nIbeO8PpANhtJb4F3fRkwoXoV+yTrSs6LrLGj2L0qcNRq/sBolgUdCATgyBhgfpJ7ab/dgTieQr+ogZzjXn5HqtWo/6IVVkmMvU9MmS21oMLNh6x0te6jEqhoDy7RwIrCrQyapA4iyJK2IH2HtSnGvKJyE7EzaeYmquZuEV9XECugdzgWz3LBrXQo2KVBYiTi30fL3w17T/YI5AYAbcTLhNhmRECBIZ9E6PcH5IAhpHKpGqfP+L7iRT9eMLx+F0I3TtarrUERj96irS+0qYmXgSwk7rzfCMTsaSKXnRL95wGNOECCT9tUCr7JwMwElL19L/NJm2CVnzCYG+A6vhmvpS5CvS65ksVV5sriekCMbqHzYPuJUwn4MZqBhtPMgJAEP3NkKm9epsDib+KWQRBpKxJ2FhkJFH/nGtAu/6lcQdKi+4hQWQ9iqAWNu9Zk2XGGjb+/TrwGr/PgqE70qDi5/ejOAjSitf3EZ2Y2hMVo6ik4PpoeULr/th4cI9sU+BYDC2oTeg/cVS0G+Dmjzw2jUb4Z9LG3i3R5dAHBFbEJafNaDc7RFhhPYjoKQKrkkcOF8TS3PliQCq/mIELkLLRGebdtNiCL1OomMPTkvmhaqTYwgvcwT8Y5+XLdUSnIIID0f+zv9YMbrDXGX7k1uS8uOwFq8eC1NtM3poHEoJtps4aNgGKycZgSYLb1qETiYwLrz1HHiUYFwTSAl81oe8xcoOO+I7RnNZaohh7mOfj2pa7Zq52zk8us0OSG5DMY0bc9cWU9nswtt0h6XhE4ICSnMe565tVKQSnNTe4463luySKnzfHNKo9zbN348k20HP7HJwO67QpzVIUnH0/u/nCHn28mkbbXJ51nH7z8e38QOH3X3wkZCqvhjdyQ7DG3AINjDFCjqXnPhUHtUOL9tPucQQFbhz4Z/piCASHoQ9y0y6tqL0+bjbmiiyNaNSjkHp6TDXZBIzzGR3yf3jYtcb8MpZOTfPFY2OLTSKiPeoAJR8Px1PmZRNPL1SwdxvAcYsCBwbn4iZs79ei9kE0jLPRvVvdF5og//eKXh38tY+3vMWKXU7jOx+QiV0PgnU17jiX6KE2EJCFdlTnuJAIjyRE/VW0DNHRW4HbTmoN5efQSiWSucQwwrgcJF98rfZpgMUUt1SjGkMrUvp79wM35t+CA00ySvDYv3T01D5aq3IZP9D7Gcbd920OeLaFB4KndlbnYXW2O4327lxRN6TFXD3ngP3Xi6A5fAJ85I7IvpCyVM+YfWBfqD65/rxhsG3gNo4ar76tvWtbivSxNDaieNvnfn+2SfTEaIfu1I4XTn0jmN2Dg9BFdZ3vaom707qt6dY29MXEUsYEy1CIHo/iUd0wfbpetpFeI5i0UJYezcVJ7cvCGrZWPmWB0u8QGinNIflulepM3Hab4UDwlkiYJJmVmBGvbL1vf/GFpVJ/QkF9W0KDSUWucg2xU/mvKC2qWjVZ4wte8Bg4jepmDIH5j4pkaezLVLx16lXb4hikNP6kNdP6gAy0ecmSu0WqZLsQOx74WNqBemxWsY34tmavGMrYwbmM/wYYqx6rPRAcfhKnywQrj+2mpxr3V9wwN8cd0iSQn81D4RuhboLhWFqLdEtg4r6FRsiwhXp8HijjuYwX8AC15zwQ3vsoLfxomfvZfWv/R5OK+/b3Rp45ESHS6179lLPvl3spnuQZBjJ33QCTaN93ehNgZUIe9/xWlzHLXVPQrH96kv69jNLc6LEflAdJryBLPll8xXOquo6cthSfM/58+CUKcPjYjeSPnqAr1KZtkbfq0tYlsRR2xNnsEaWerg+kpwFveCreT/j85t0rxNniqh/cmBwCMLaHQN+xRJCg5bJ9OjMsjgBtqgwmFyz4TOy4/eWGg7zmNpkn2QSSlPNejgukjiA2sDIe51jqOVhCE4L1ENcdYq3NWdPHa1Ct78g+j8jO7U9E3tZAoPfquRMPHYQTD2VFC8euY/mO0vxItaZZrJENJ9snQoKfEBb9HnnEPYtcoe0ntkl4DKk2zOkIyX/bldMmEfvEoAzbzNM+xv++gAyctIp5I1aPoCSQtBXjP7f6s/7qBkuTmlaDvEiPrsMMxsSk8Ls4U+DDUBQnbg7YsghFoSScZC4/EeX2EtTDCVfDK+Mb+fQNOBRGHmWWRP9zoimoIdCzAM8krYU3ZNeUEylbinF8k9xJxzP93RsoOj/A2oWukdgQsPkynEgoEMnYH0/ecNLfIHXCBTUka0F874k5BTXck0y3juAjzT/ChyjjEMJLZUyAcexXxHOs7as+Nv3ctD+Lvdnm7EOWk6e4RKxp1RIUcBC38SB0s6r4HFqDG3Ftsrktn/6x0JKyL7RF51iFqFbfADjebwaoP2xQAI+8fSlzDJL0A2hQ1nQA0Lypi6dlhyeNZcKpL5URMQxCd1SCa8eSxc1soBBHOJBwYAtubJGX+jootJeQJwUtGs8FTPjFfJC1I6fENWfNyZU8bRjMn5MfeBydhVVn7ce1L10iC5cpM30GWpC2rGsG2Z1RuvYPnh/ApdhMHGCYDgkgftNz9Brbu/Qy+nvrNawwPLNcS+YaIs/Xflkfmiy4pvpii4APNk6j9J1IvSD+bgo+dP16c3XJ2zJcg7ikwUy/qZ13Do+fAVs5Y9jjgm0oeqgsfgxRMzVypIHVtw3uJh/Er3LiUh/UPBhiT+1Wu4AUXTyS+G6yArSONmK39tVQzyeHwp/BNrF0EawbqtQv+zOG/KTLTrIFLhfEjDVUrFIuEKn7uE7JRgwHxhvEFUbUxAR+iCpYD0dOWtFi6PVulfAYftJGwFTpSnCznJvo/Z3T7lNzvqDISKsHOcMvYjiJNM61L9Ff3zNyNeCo+qj2J25aYb0x3Ix8SELVCG5bb34MZhnSeFNabe2z/HnvEDl7XBMXXG+xoWDLHqkJEjvCJ7AvdXJhersQ2U6qfxrR0XUXO4OvBXDp1gRcluATkMX7rj9fgKhE1EiSAAAAAA==\\' style=\\'width:110px;height:110px;object-fit:contain;border-radius:8px;margin-bottom:8px;\\'><div style=\\'font-size:0.65rem;font-weight:700;color:#2563eb;text-align:center;line-height:1.3;\\'>En próximas fases<br>de desarrollo</div>';document.body.appendChild(t);}var r=el.getBoundingClientRect();t.style.top=(r.bottom+8)+'px';t.style.left=(r.left+r.width/2-85)+'px';t.style.display='flex';})(this)" onmouseleave="var t=document.getElementById('algo-tooltip');if(t)t.style.display='none'">
                                    <div class="tools-column-title" style="cursor:help;">Algoritmo</div>
                                    <span style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">🪄 Turno</span>
                                    <span style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">✨ Día</span>
                                    <span style="padding:4px 6px; border-radius:4px; font-weight:600; font-size:0.56rem; border:1px solid #e2e8f0; display:flex; gap:3px; align-items:center; justify-content:center; white-space:nowrap; min-height:22px; background:white; opacity:0.35; filter:grayscale(1); cursor:help;">📅 Semana</span>
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
                    
                    <!-- SUBMÓDULO 30%: SWITCH DE MODOS -->
                    <div class="tools-submodule-mode">
                        <div class="planner-module-title">🎯 MODO DE DRAG</div>
                        <div class="mode-switch-container">
                            <button class="mode-btn ${App.uiState.dragMode === 'edit' ? 'active' : ''}" id="mode-edit-btn" onclick="App.logic.setDragMode('edit')" title="Modo edición: Ajustar horarios (defecto)">
                                <span class="mode-icon">✏️</span>
                                <span>Editar</span>
                            </button>
                            <button class="mode-btn ${App.uiState.dragMode === 'swap' ? 'active' : ''}" id="mode-swap-btn" onclick="App.logic.setDragMode('swap')" title="Modo intercambio: Mover turnos entre empleados (o mantén Ctrl)">
                                <span class="mode-icon">🔄</span>
                                <span>Cambiar</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            </div>
            </div>`;

            
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
            // Primera fila: HORAS
            for(let i=0;i<26;i++){ 
                const totalMin = 570 + (i * 30); // 9:30 = 570 minutos
                const h = Math.floor(totalMin / 60); 
                html+=`<div class="th-cell" style="font-size:0.85rem; font-weight:700; color:#475569;">${String(h).padStart(2,'0')}</div>`; 
            }
            // Segunda fila: MINUTOS
            for(let i=0;i<26;i++){ 
                const totalMin = 570 + (i * 30);
                const m = totalMin % 60; 
                html+=`<div class="th-cell" style="font-size:0.7rem; color:#94a3b8;">${m===0?'00':'30'}</div>`; 
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
            
            empList.forEach(e => {
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
                const computedTag = e.tag || (['MNG','AM','SPV'].includes(e.rol) ? 3 : 1);
                const tag3Class = (computedTag >= 3) ? 'tag3-highlight' : '';
                const disabledBg = isDisabled ? 'background:#f1f5f9 !important;' : '';
                
                let nameContent = e.nombre + weekendIcon;
                if (isDisabled) nameContent += ' <span style="color:#94a3b8; font-size:0.75em;">(des)</span>';

                const tagClass = computedTag === 3 ? 'badge-tag-3' : 'badge-tag-1';
                const tagContent = `<span class="${tagClass}">T${computedTag}</span>`;
                const rolContent = `<span class="badge-role">${e.rol}</span>`;

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
                    else if(code === 'L' || code === 'F' || code === 'R') absenceClass = 'absence-green';
                }

                const isEditable = shift && !shift.fixed && shift.start && shift.end;
                const scheduleClick = isEditable ? `onclick="event.stopPropagation(); App.logic.editSchedule('${e.id}', '${date}')"` : '';
                const finalScheduleStyle = isDisabled ? disabledBg : `cursor:${isEditable?'pointer':'default'};${scheduleColor}`;

                // --- 4. SALIDA HTML ---
                html += `<div class="pg-row" onclick="App.logic.paint('${e.id}')">
                    <div class="pg-name ${tag3Class}" style="${disabledBg}; cursor:help;" title="${txtTooltip}">${nameContent}</div>
                    <div class="pg-rol ${tag3Class}" style="${disabledBg}">${rolContent}</div>
                    <div class="pg-tag ${tag3Class}" style="${disabledBg}">${tagContent}</div>
                    <div class="pg-hours" style="${disabledBg}">${hoursContent}</div>
                    <div class="pg-schedule" ${scheduleClick} style="${finalScheduleStyle}" id="schedule-${e.id}">${scheduleContent}</div>
                    <div class="pg-req ${reqClass}" style="${disabledBg}">${reqIcon}</div>
                    <div class="pg-right ${absenceClass}" style="${disabledBg}" ondragover="App.logic.shiftDragOver(event)" ondrop="App.logic.shiftDrop(event, '${e.id}', '${date}')" ondragleave="event.currentTarget.classList.remove('drag-over-active')">${Utils.renderPlannerTimeline(shift, finalConfig, e.id, date)}</div>
                </div>`;
            });;;;;
            
            // Cerrar planner-grid
            html += `</div>`;
            
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
            
            c.innerHTML = html;
            
            // Ajustar alturas de wrappers (el scale ya está inline, solo falta la altura)
            adjustWrapperHeights();
        },

        // --- SHIFTS ---
});