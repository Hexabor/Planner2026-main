// ============================================================
// UI: Presentación y exportar PDF/imprimir
// ============================================================

Object.assign(App.ui, {
        renderPresentacion: function(c) {
            const pv = App.uiState.presView || 'semanal';
            const weekDate = App.uiState.currentDate;

            // Helpers de formato de turno
            const LIBRE_COLORS = { L:'#22c55e', F:'#22c55e', R:'#22c55e', V:'#a855f7', B:'#ef4444', P:'#ec4899' };
            const LIBRE_BG    = { L:'#f0fdf4', F:'#f0fdf4', R:'#f0fdf4', V:'#faf5ff', B:'#fef2f2', P:'#fdf2f8' };
            const LIBRE_LABELS = { L:'LIBRANZA', F:'FESTIVO', V:'VACACIONES', R:'RECUP.', B:'BAJA', P:'PERMISO' };
            const fmtShift = (shift) => {
                if(!shift) return null;
                if(shift.fixed) {
                    return { libre: true, label: LIBRE_LABELS[shift.code] || shift.code,
                             color: LIBRE_COLORS[shift.code] || '#94a3b8',
                             bg: LIBRE_BG[shift.code] || '#f8fafc' };
                }
                const hasBreak = !!(shift.breakStart && shift.breakEnd);
                const t1 = `${shift.start}–${shift.end}`;                            // semanal: rango completo
                const t2 = hasBreak ? `${shift.breakStart}–${shift.breakEnd}` : null; // semanal: pausa (reservado)
                const seg1 = hasBreak ? `${shift.start}–${shift.breakStart}` : null;  // mensual línea 1
                const seg2 = hasBreak ? `${shift.breakEnd}–${shift.end}` : null;      // mensual línea 3
                const mins = (() => {
                    const gm = t => { const [h,m]=t.split(':').map(Number); return h*60+m; };
                    let total = gm(shift.end) - gm(shift.start);
                    if(hasBreak) total -= (gm(shift.breakEnd) - gm(shift.breakStart));
                    return total;
                })();
                const totalStr = `${Math.floor(mins/60)}h${mins%60?String(mins%60).padStart(2,'0'):''}`;
                return { libre: false, t1, t2, seg1, seg2, hasBreak, total: totalStr, color: shift.color || '#2563eb' };
            };

            const empActivos = (() => {
                const sk = App.uiState.sortKey || 'custom';
                const sd = App.uiState.sortDir === 'asc' ? 1 : -1;
                return [...App.data.empleados].filter(e => e.active !== false).sort((a,b) => {
                    if(sk === 'custom')   return (a.customOrder - b.customOrder) * sd;
                    if(sk === 'contrato') return (a.contrato - b.contrato) * sd;
                    if(sk === 'tag')      return ((a.tag||1) - (b.tag||1)) * sd;
                    if(sk === 'rol') { const w={"MNG":5,"AM":4,"SPV":3,"STF":2}; return ((w[b.rol]||0)-(w[a.rol]||0))*sd; }
                    return (a[sk]||'').localeCompare(b[sk]||'') * sd;
                });
            })();

            let html = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:8px;flex-wrap:wrap;" class="no-print">
                <h2 style="margin:0;font-size:1.2rem;">🖨️ Presentación</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    <div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;">
                        <button onclick="App.uiState.presView='semanal'; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:6px 14px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;background:${pv==='semanal'?'var(--primary)':'white'};color:${pv==='semanal'?'white':'var(--text-muted)'};">📅 Semanal</button>
                        <button onclick="App.uiState.presView='mensual'; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:6px 14px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;background:${pv==='mensual'?'var(--primary)':'white'};color:${pv==='mensual'?'white':'var(--text-muted)'};">🗓️ Mensual</button>
                    </div>
                    <button onclick="App.ui.printPresentacion()" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-size:0.82rem;font-weight:700;">🖨️ Imprimir / PDF</button>
                </div>
            </div>
            <div id="print-area">`;

            if(pv === 'semanal') {
                // Navegación de semana
                const prevWk = (() => { const d = new Date(weekDate+'T00:00:00'); d.setDate(d.getDate()-7); return d.toISOString().slice(0,10); })();
                const nextWk = (() => { const d = new Date(weekDate+'T00:00:00'); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); })();
                const days = Utils.getWeekDays(Utils.getMonday(weekDate));
                const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
                const MONTH_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

                html += `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button onclick="App.uiState.currentDate='${prevWk}'; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">◀</button>
                        <span style="font-weight:600;color:var(--text-muted);font-size:0.85rem;">${Utils.getWeekCode(weekDate)}</span>
                        <button onclick="App.uiState.currentDate='${nextWk}'; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">▶</button>
                    </div>
                </div>

                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:0.8rem;">
                    <div style="text-align:center;font-weight:700;font-size:1rem;margin-bottom:8px;color:#1e293b;">
                        ${App.data.storeConfig?.nombre||'Horario Semanal'} · ${Utils.getWeekCode(weekDate)}
                    </div>
                    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
                        <colgroup>
                            <col style="width:130px;">
                            ${days.map(()=>'<col>').join('')}
                        </colgroup>
                        <thead>
                            <tr style="background:#1e293b;color:white;">
                                <th style="padding:8px;text-align:left;border:1px solid #334155;font-size:0.75rem;background:#0f172a;">Empleado</th>
                                ${days.map(d => {
                                    const date = new Date(d+'T00:00:00');
                                    const dow = date.getDay();
                                    const isWeekend = dow===0||dow===6;
                                    const isHoliday = (App.data.storeConfig.holidays||[]).some(h=>h.date===d);
                                    const bg = isHoliday?'#854d0e':isWeekend?'#334155':'';
                                    const isSun = dow === 0;
                                    const dateColor = (isHoliday || isSun) ? '#ef4444' : 'inherit';
                                    return `<th style="padding:8px 4px;text-align:center;border:1px solid #334155;font-size:0.75rem;${bg?'background:'+bg+';':''}">
                                        <div style="font-weight:700;color:${dateColor};">${DAY_ES[dow]}</div>
                                        <div style="font-size:0.65rem;opacity:0.8;color:${dateColor};">${String(date.getDate()).padStart(2,'0')} ${MONTH_ES[date.getMonth()]}</div>
                                    </th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${empActivos.map((emp, ei) => {
                                const rowBg = ei%2===0 ? 'white' : '#f8fafc';
                                return `<tr style="background:${rowBg};">
                                    <td style="padding:6px 8px;border:1px solid #e2e8f0;font-weight:600;font-size:0.75rem;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#f1f5f9;">${emp.nombre}</td>
                                    ${days.map(d => {
                                        const shiftId = App.data.schedule[d]?.[emp.id];
                                        const raw = shiftId ? Utils.getShift(shiftId) : null;
                                        const s = fmtShift(raw);
                                        const cellStyle = 'height:56px;border:1px solid #e2e8f0;';
                                        if(!s) return `<td class="pres-cell" style="${cellStyle}"></td>`;
                                        if(s.libre) return `<td class="pres-cell" style="${cellStyle}"><div class="pres-cell-inner"><span style="font-size:0.72rem;font-weight:700;color:${s.color};">${s.label}</span></div></td>`;
                                        return `<td class="pres-cell" style="${cellStyle}">
                                            <div style="position:relative;height:100%;padding:4px 5px;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:0px;line-height:1.3;">
                                                ${s.hasBreak
                                                    ? `<span class="pres-turno-line">${s.seg1}</span>
                                                       <span class="pres-turno-line">${s.seg2}</span>`
                                                    : `<span class="pres-turno-line">${s.t1}</span>`
                                                }
                                                <span style="position:absolute;bottom:3px;right:5px;font-size:0.62rem;color:#3b82f6;font-weight:700;">${s.total}</span>
                                            </div>
                                        </td>`;
                                    }).join('')}
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>`;

            } else {
                // --- VISTA MENSUAL ---
                if(App.uiState.presMensualEmpId === undefined) App.uiState.presMensualEmpId = empActivos[0]?.id || null;
                if(App.uiState.presMensualYear === undefined) App.uiState.presMensualYear = new Date().getFullYear();
                if(App.uiState.presMensualMonth === undefined) App.uiState.presMensualMonth = new Date().getMonth(); // 0-indexed

                const empId = App.uiState.presMensualEmpId;
                const year  = App.uiState.presMensualYear;
                const month = App.uiState.presMensualMonth;
                const emp   = App.data.empleados.find(e => e.id === empId);

                const prevMonth = () => { let m=month-1,y=year; if(m<0){m=11;y--;} App.uiState.presMensualMonth=m; App.uiState.presMensualYear=y; App.ui.renderPresentacion(document.querySelector('.main-scroll')); };
                const nextMonth = () => { let m=month+1,y=year; if(m>11){m=0;y++;} App.uiState.presMensualMonth=m; App.uiState.presMensualYear=y; App.ui.renderPresentacion(document.querySelector('.main-scroll')); };

                const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
                const DAY_ES_SHORT = ['L','M','X','J','V','S','D'];
                const daysInMonth = new Date(year, month+1, 0).getDate();
                const firstDow = (new Date(year, month, 1).getDay()+6)%7; // 0=Lun

                // Pre-calcular mes anterior y siguiente para los botones
                const pm = month===0?11:month-1; const py = month===0?year-1:year;
                const nm = month===11?0:month+1; const ny = month===11?year+1:year;

                // Selector empleado + navegación mes
                let empOpts = empActivos.map(e => `<option value="${e.id}" ${e.id===empId?'selected':''}>${e.nombre}</option>`).join('');
                html += `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;" class="no-print">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <button onclick="App.uiState.presMensualMonth=${pm};App.uiState.presMensualYear=${py};App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">◀</button>
                        <span style="font-weight:600;font-size:0.9rem;">${MONTH_NAMES[month]} ${year}</span>
                        <button onclick="App.uiState.presMensualMonth=${nm};App.uiState.presMensualYear=${ny};App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">▶</button>
                    </div>
                    <select onchange="App.uiState.presMensualEmpId=this.value; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                        style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;font-weight:600;">${empOpts}</select>
                </div>

                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    <div style="text-align:center;font-weight:700;font-size:1rem;margin-bottom:8px;color:#1e293b;">
                        ${emp?.nombre||'—'} · ${MONTH_NAMES[month]} ${year}
                    </div>
                    <table style="border-collapse:collapse;width:100%;table-layout:fixed;">
                        <colgroup>${DAY_ES_SHORT.map(()=>'<col>').join('')}</colgroup>
                        <thead>
                            <tr style="background:#1e293b;color:white;">
                                ${DAY_ES_SHORT.map((d,i) => `<th style="padding:8px 4px;text-align:center;border:1px solid #334155;font-size:0.78rem;font-weight:700;${i>=5?'color:#94a3b8;':''}">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

                // Construir semanas
                let dayNum = 1 - firstDow;
                for(let row = 0; row < 6; row++) {
                    const hasDay = dayNum <= daysInMonth && dayNum + 6 > 0;
                    if(!hasDay) break;
                    html += '<tr>';
                    for(let col = 0; col < 7; col++, dayNum++) {
                        if(dayNum < 1 || dayNum > daysInMonth) {
                            html += `<td class="pres-cell" style="background:#f8fafc;height:72px;"></td>`;
                            continue;
                        }
                        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
                        const shiftId = empId ? (App.data.schedule[dateStr]?.[empId]) : null;
                        const raw = shiftId ? Utils.getShift(shiftId) : null;
                        const s = fmtShift(raw);
                        const isWeekend = col >= 5;
                        const isHoliday = (App.data.storeConfig.holidays||[]).some(h=>h.date===dateStr);
                        const cellBg = isHoliday?'#fef3c7':isWeekend?'#f8fafc':'white';
                        const isSunday = col === 6;
                        const dayNumColor = (isHoliday || isSunday) ? '#ef4444' : isWeekend ? '#94a3b8' : '#475569';
                        html += `<td class="pres-cell" style="height:72px;"
                            <div style="display:flex;flex-direction:column;height:100%;padding:3px 5px;box-sizing:border-box;">
                                <div style="text-align:right;font-size:0.7rem;font-weight:700;color:${dayNumColor};">${dayNum}</div>
                                <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0px;line-height:1.25;">
                                ${!s ? '' : s.libre
                                    ? `<span style="font-size:0.7rem;font-weight:700;color:${s.color};text-align:center;line-height:1.2;">${s.label}</span>`
                                    : s.hasBreak
                                        ? `<span style="font-size:0.78rem;font-weight:700;color:#1e293b;">${s.seg1}</span>
                                           <span style="font-size:0.78rem;font-weight:700;color:#1e293b;">${s.seg2}</span>
                                           <span style="font-size:0.62rem;color:#3b82f6;font-weight:700;margin-top:1px;">${s.total}</span>`
                                        : `<span style="font-size:0.82rem;font-weight:700;color:#1e293b;">${s.t1}</span>
                                           <span style="font-size:0.62rem;color:#3b82f6;font-weight:700;margin-top:1px;">${s.total}</span>`
                                }
                                </div>
                            </div>
                        </td>`;
                    }
                    html += '</tr>';
                }

                html += `</tbody></table></div>`;
            }

            html += `</div>`; // cierre print-area
            c.innerHTML = html;
        },

        printPresentacion: function() {
            const pv = App.uiState.presView || 'semanal';
            // Forzar orientación vía meta antes de imprimir
            let styleEl = document.getElementById('print-orientation-style');
            if(!styleEl) { styleEl = document.createElement('style'); styleEl.id='print-orientation-style'; document.head.appendChild(styleEl); }
            styleEl.textContent = pv === 'semanal'
                ? '@page { size: A4 landscape; margin: 8mm; }'
                : '@page { size: A4 portrait;  margin: 10mm; }';
            window.print();
        },

        // --- HOME ---
});
