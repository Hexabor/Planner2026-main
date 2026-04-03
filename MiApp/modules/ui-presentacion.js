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
                        ${App.data.config.llavesActivo ? `<button onclick="App.uiState.presView='llaves'; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:6px 14px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;background:${pv==='llaves'?'var(--primary)':'white'};color:${pv==='llaves'?'white':'var(--text-muted)'};">🔑 Llaves</button>` : ''}
                    </div>
                    <button onclick="App.ui.printPresentacion()" style="background:#ef4444;color:white;border:none;border-radius:6px;padding:7px 16px;cursor:pointer;font-size:0.82rem;font-weight:700;">🖨️ Imprimir / PDF</button>
                </div>
            </div>
            <div id="print-area">`;

            if(pv === 'semanal') {
                // Navegación de semana
                // Función de navegación que se ejecuta en el momento del click — T12:00:00 evita DST, local getters evitan UTC drift
                const _nav = (delta) => `(function(){var d=new Date(App.uiState.currentDate+'T12:00:00');d.setDate(d.getDate()+(${delta}));App.uiState.currentDate=[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');App.ui.renderPresentacion(document.querySelector('.main-scroll'));})()`;
                const days = Utils.getWeekDays(Utils.getMonday(weekDate));
                const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
                const MONTH_ES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

                html += `
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;" class="no-print">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <button onclick="${_nav(-28)}" title="-4 semanas"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.6rem;opacity:0.7;letter-spacing:-1px;">◀◀</button>
                        <button onclick="${_nav(-7)}" title="-1 semana"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">◀</button>
                        <select onchange="App.uiState.currentDate=this.value; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="height:28px;padding:0 6px;border:1px solid var(--border);border-radius:4px;background:white;font-weight:700;font-size:0.82rem;color:#1e293b;cursor:pointer;">
                            ${(() => {
                                const _cur = Utils.getMonday(weekDate);
                                const _fmt = d => { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),dd=String(d.getDate()).padStart(2,'0'); return y+'-'+m+'-'+dd; };
                                const _fmtShort = s => { const [y,m,d]=s.split('-'); return d+'.'+m+'.'+y.slice(2); };
                                let _opts = '', _d = new Date(_cur+'T12:00:00');
                                _d.setDate(_d.getDate() - 52*7);
                                for(let i=0; i<120; i++, _d.setDate(_d.getDate()+7)) {
                                    const _mon = _fmt(_d);
                                    const _sun = Utils.getWeekDays(_mon)[6];
                                    const _sel = _mon === _cur ? 'selected' : '';
                                    _opts += '<option value="'+_mon+'" '+_sel+'>'+Utils.getWeekCode(_mon)+' · '+_fmtShort(_mon)+' – '+_fmtShort(_sun)+'</option>';
                                }
                                return _opts;
                            })()}
                        </select>
                        <button onclick="${_nav(7)}" title="+1 semana"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 10px;cursor:pointer;">▶</button>
                        <button onclick="${_nav(28)}" title="+4 semanas"
                            style="background:#f1f5f9;border:1px solid var(--border);border-radius:4px;padding:4px 8px;cursor:pointer;font-size:0.6rem;opacity:0.7;letter-spacing:-1px;">▶▶</button>
                    </div>
                </div>

                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:0.8rem;">
                    <div style="text-align:center;font-weight:700;font-size:1rem;margin-bottom:8px;color:#1e293b;">
                        ${App.data.storeConfig?.nombre||'Horario Semanal'} · ${Utils.getWeekCode(weekDate)}
                    </div>
                    <div style="overflow-x:auto;">
                    <table style="border-collapse:collapse;width:auto;table-layout:fixed;margin:0 auto;">
                        <colgroup>
                            <col style="width:120px;">
                            ${days.map(()=>'<col style="width:90px;">').join('')}
                        </colgroup>
                        <thead>
                            <tr style="background:#1e293b;color:white;">
                                <th style="padding:8px;text-align:left;border:1px solid #334155;border-bottom:3px solid #475569;font-size:0.75rem;background:#0f172a;">Empleado</th>
                                ${days.map(d => {
                                    const date = new Date(d+'T00:00:00');
                                    const dow = date.getDay();
                                    const isHoliday = (App.data.storeConfig.holidays||[]).some(h=>h.date===d);
                                    const isSun = dow === 0;
                                    // Fondo: festivo=blanco, domingo=blanco, finde=gris oscuro, normal=azul oscuro
                                    let bg, txtColor;
                                    if(isHoliday)      { bg='white';   txtColor='#ef4444'; }
                                    else if(isSun)     { bg='white';   txtColor='#7c3aed'; }
                                    else if(dow===6)   { bg='#334155'; txtColor='#94a3b8'; }
                                    else               { bg='';        txtColor='white';   }
                                    return `<th style="padding:8px 4px;text-align:center;border:1px solid #334155;border-bottom:3px solid #475569;font-size:0.75rem;${bg?'background:'+bg+';':''}">
                                        <div style="font-weight:700;color:${txtColor};">${DAY_ES[dow]}</div>
                                        <div style="font-size:0.65rem;opacity:0.85;color:${txtColor};">${String(date.getDate()).padStart(2,'0')} ${MONTH_ES[date.getMonth()]}</div>
                                    </th>`;
                                }).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${empActivos.map((emp, ei) => {
                                const rowBg = ei%2===0 ? 'white' : '#eef2f7';
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
                    </div>
                </div>`;

            } else if(pv === 'mensual') {
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
                <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:12px;" class="no-print">
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;width:32px;flex-shrink:0;">Mes</span>
                        <select onchange="App.uiState.presMensualMonth=parseInt(this.value); App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;font-weight:600;background:white;width:auto;">
                            ${MONTH_NAMES.map((n,i)=>`<option value="${i}" ${i===month?'selected':''}>${n}</option>`).join('')}
                        </select>
                        <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;width:32px;flex-shrink:0;">Año</span>
                        <select onchange="App.uiState.presMensualYear=parseInt(this.value); App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;font-weight:600;background:white;width:auto;">
                            ${Array.from({length:7},(_,i)=>year-3+i).map(y=>`<option value="${y}" ${y===year?'selected':''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="font-size:0.7rem;font-weight:700;color:#94a3b8;text-transform:uppercase;width:32px;flex-shrink:0;">Staff</span>
                        <select onchange="App.uiState.presMensualEmpId=this.value; App.ui.renderPresentacion(document.querySelector('.main-scroll'))"
                            style="padding:5px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.85rem;font-weight:600;background:white;width:auto;">${empOpts}</select>
                    </div>
                </div>

                <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
                    <div style="text-align:center;font-weight:700;font-size:1rem;margin-bottom:8px;color:#1e293b;">
                        ${emp?.nombre||'—'} · ${MONTH_NAMES[month]} ${year}
                    </div>
                    <div style="overflow-x:auto;">
                    <table style="border-collapse:collapse;width:auto;table-layout:fixed;margin:0 auto;">
                        <colgroup>${DAY_ES_SHORT.map(()=>'<col style="width:110px;">').join('')}</colgroup>
                        <thead>
                            <tr style="background:#1e293b;color:white;">
                                ${DAY_ES_SHORT.map((d,i) => `<th style="padding:8px 4px;text-align:center;border:1px solid #334155;font-size:0.78rem;font-weight:700;${i>=5?'color:#94a3b8;':''}">${d}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>`;

                // Construir semanas
                let dayNum = 1 - firstDow;
                const prevMonthDays = new Date(year, month, 0).getDate(); // días del mes anterior
                for(let row = 0; row < 6; row++) {
                    const hasDay = dayNum <= daysInMonth && dayNum + 6 > 0;
                    if(!hasDay) break;
                    html += '<tr>';
                    for(let col = 0; col < 7; col++, dayNum++) {
                        const isAdjacentMonth = dayNum < 1 || dayNum > daysInMonth;
                        // Calcular la fecha real (puede ser mes anterior o siguiente)
                        let adjYear = year, adjMonth = month + 1, adjDay = dayNum;
                        if(dayNum < 1) {
                            adjDay = prevMonthDays + dayNum;
                            adjMonth = month === 0 ? 12 : month;
                            adjYear = month === 0 ? year - 1 : year;
                        } else if(dayNum > daysInMonth) {
                            adjDay = dayNum - daysInMonth;
                            adjMonth = month === 11 ? 1 : month + 2;
                            adjYear = month === 11 ? year + 1 : year;
                        }
                        const dateStr = `${adjYear}-${String(adjMonth).padStart(2,'0')}-${String(adjDay).padStart(2,'0')}`;
                        const shiftId = empId ? (App.data.schedule[dateStr]?.[empId]) : null;
                        const raw = shiftId ? Utils.getShift(shiftId) : null;
                        const s = fmtShift(raw);
                        const isWeekend = col >= 5;
                        const isHoliday = (App.data.storeConfig.holidays||[]).some(h=>h.date===dateStr);
                        const isSunday = col === 6;
                        const cellBg = isAdjacentMonth ? '#f1f5f9' : isHoliday ? '#fef3c7' : isWeekend ? '#f8fafc' : 'white';
                        const opacity = isAdjacentMonth ? 'opacity:0.45;' : '';
                        const dayNumColor = isAdjacentMonth ? '#94a3b8' : (isHoliday || isSunday) ? '#ef4444' : isWeekend ? '#94a3b8' : '#475569';
                        const dispDay = isAdjacentMonth ? adjDay : dayNum;
                        html += `<td class="pres-cell" style="height:72px;background:${cellBg};border:1px solid #e2e8f0;">
                            <div style="position:relative;height:100%;padding:3px 5px;box-sizing:border-box;${opacity}">
                                <div style="text-align:right;font-size:0.7rem;font-weight:700;color:${dayNumColor};">${dispDay}</div>
                                <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:calc(100% - 18px);gap:0px;line-height:1.25;">
                                ${!s ? '' : s.libre
                                    ? `<span style="font-size:0.7rem;font-weight:700;color:${s.color};text-align:center;line-height:1.2;">${s.label}</span>`
                                    : s.hasBreak
                                        ? `<span style="font-size:0.78rem;font-weight:700;color:#1e293b;">${s.seg1}</span>
                                           <span style="font-size:0.78rem;font-weight:700;color:#1e293b;">${s.seg2}</span>`
                                        : `<span style="font-size:0.82rem;font-weight:700;color:#1e293b;">${s.t1}</span>`
                                }
                                </div>
                                ${!s || s.libre ? '' : `<div style="position:absolute;bottom:3px;right:5px;font-size:0.62rem;color:#3b82f6;font-weight:700;">${s.total}</div>`}
                            </div>
                        </td>`;
                    }
                    html += '</tr>';
                }

                html += `</tbody></table></div></div>`;
            }

            if(pv === 'llaves') {
                html += `<div style="max-width:900px;margin:0 auto;">
                    <h3 style="margin:0 0 16px;font-size:1rem;font-weight:700;color:#1e293b;">🔑 Cambios de llave programados</h3>
                    ${App.ui._renderLlavesPresView()}
                </div>`;
            }

            html += `</div>`; // cierre print-area
            c.innerHTML = html;
        },

        printPresentacion: function() {
            const pv = App.uiState.presView || 'semanal';
            let styleEl = document.getElementById('print-orientation-style');
            if(!styleEl) { styleEl = document.createElement('style'); styleEl.id='print-orientation-style'; document.head.appendChild(styleEl); }
            styleEl.textContent = (pv === 'semanal' || pv === 'llaves'
                ? '@page { size: A4 landscape; margin: 8mm; }'
                : '@page { size: A4 portrait;  margin: 10mm; }')
                + ' * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }';
            window.print();
        },

        _renderLlavesPresView: function() {
            const hoy = new Date().toISOString().slice(0,10);
            // Fecha de inicio y duración configurables
            if(!App.uiState.llavesPresDesde) App.uiState.llavesPresDesde = hoy;
            if(!App.uiState.llavesPresDias)  App.uiState.llavesPresDias  = 15;
            const desde = App.uiState.llavesPresDesde;
            const dias  = App.uiState.llavesPresDias;
            const limite = new Date(desde + 'T12:00:00'); limite.setDate(limite.getDate() + dias);
            const limiteStr = limite.toISOString().slice(0,10);
            const llaves = App.data.config.llaves || [];
            const _refresh = "App.ui.renderPresentacion(document.querySelector('.main-scroll'))";

            const empNombre = id => {
                if(!id) return '—';
                if(id === '__TIENDA__') return 'Tienda';
                return App.data.empleados.find(e => e.id === id)?.nombre || '—';
            };
            // Solo alias si lo tiene, sin número
            const llaveAlias = id => {
                const l = llaves.find(l => l.id === id);
                if(!l) return '';
                return l.alias || '';
            };

            const traspasos = (App.data.traspasoLlaves || [])
                .filter(t => t.fecha >= desde && t.fecha <= limiteStr)
                .sort((a, b) => a.fecha.localeCompare(b.fecha) || a.llaveId.localeCompare(b.llaveId));

            const porFecha = {};
            traspasos.forEach(t => {
                if(!porFecha[t.fecha]) porFecha[t.fecha] = [];
                porFecha[t.fecha].push(t);
            });
            const fechas = Object.keys(porFecha).sort();

            const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const fmtFecha = d => {
                const dt = new Date(d + 'T12:00:00');
                const [,, day] = d.split('-');
                return `${DAY_NAMES[dt.getDay()]} ${parseInt(day)}/${String(dt.getMonth()+1).padStart(2,'0')}`;
            };

            const diasOpts = [7,15,21,30,45,60,90].map(d =>
                `<option value="${d}" ${d === dias ? 'selected' : ''}>${d} días</option>`
            ).join('');
            const navegador = `<div class="no-print" style="display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;">
                <span style="font-size:0.82rem;font-weight:600;color:#475569;">Desde</span>
                ${Utils.getDateInputHTML('llaves-pres-desde', desde, `App.uiState.llavesPresDesde=this.dataset.isoValue; ${_refresh}`)}
                <select onchange="App.uiState.llavesPresDias=+this.value; ${_refresh}"
                    style="padding:4px 8px;border:1px solid #e2e8f0;border-radius:5px;font-size:0.82rem;color:#334155;cursor:pointer;">
                    ${diasOpts}
                </select>
                <span style="font-size:0.78rem;color:#94a3b8;">→ ${Utils.formatDateES(limiteStr)}</span>
            </div>`;

            if(fechas.length === 0) {
                return navegador + `<div style="padding:32px;text-align:center;color:#94a3b8;font-size:0.85rem;">Sin traspasos programados en este período.</div>`;
            }

            let rows = '';
            fechas.forEach(fecha => {
                const grupo = porFecha[fecha];
                grupo.forEach((t, i) => {
                    const esPrimero = i === 0;
                    const esUltimo  = i === grupo.length - 1;
                    const rowspan   = grupo.length;
                    const sepStyle  = esUltimo ? 'border-bottom:2px solid #94a3b8;' : 'border-bottom:1px solid #f1f5f9;';
                    const fechaCell = esPrimero
                        ? `<td rowspan="${rowspan}" style="padding:10px 12px;font-weight:700;font-size:0.88rem;color:#1e293b;text-align:center;white-space:nowrap;border-right:2px solid #e2e8f0;vertical-align:middle;border-bottom:2px solid #94a3b8;">${fmtFecha(fecha)}</td>`
                        : '';
                    const alias = llaveAlias(t.llaveId);
                    // Columnas de estado por llave (solo en la última fila del grupo, con rowspan)
                    const _td = (content, extra) =>
                        `<td style="padding:9px 12px;font-size:0.85rem;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${sepStyle}${extra||''}">${content}</td>`;

                    const estadoCells = esPrimero ? llaves.map((l, li) => {
                        const titId = App.logic.getTitularLlave(l.id, fecha);
                        const tit = titId === '__TIENDA__' ? 'Tienda' : (App.data.empleados.find(e => e.id === titId)?.nombre || '—');
                        const sep = li === 0 ? 'border-left:3px solid #94a3b8;' : 'border-left:1px solid #e2e8f0;';
                        return `<td rowspan="${rowspan}" style="padding:9px 12px;font-size:0.82rem;color:#475569;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${sep}vertical-align:middle;border-bottom:2px solid #94a3b8;">${tit}</td>`;
                    }).join('') : '';
                    rows += `<tr style="${sepStyle}">
                        ${fechaCell}
                        ${_td(empNombre(t.dadorId), 'color:#475569;')}
                        ${_td(alias, 'font-weight:600;color:#334155;')}
                        ${_td(empNombre(t.receptorId), 'font-weight:700;color:#1e293b;')}
                        ${estadoCells}
                    </tr>`;
                });
            });

            const stateW = 110;
            const colgroup = `<colgroup>
                <col style="width:80px;">
                <col style="width:95px;">
                <col style="width:110px;">
                <col style="width:95px;">
                ${llaves.map(() => `<col style="width:${stateW}px;">`).join('')}
            </colgroup>`;

            const _th = (label, align, extra) =>
                `<th style="padding:10px 12px;text-align:${align};font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;overflow:hidden;${extra||''}">${label}</th>`;
            const llaveThs = llaves.map((l, idx) => {
                const label = l.alias || `Llave ${idx+1}`;
                const sep = idx === 0 ? 'border-left:3px solid #4b5563;' : 'border-left:1px solid #334155;';
                return _th(label, 'center', sep);
            }).join('');

            return navegador + `
                <table style="width:100%;border-collapse:collapse;font-family:inherit;table-layout:fixed;">
                    ${colgroup}
                    <thead>
                        <tr style="background:#1e293b;color:white;">
                            ${_th('Fecha','center','')}
                            ${_th('Entrega','center','')}
                            ${_th('Llave','center','')}
                            ${_th('Recibe','center','')}
                            ${llaveThs}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>`;
        },

        // --- HOME ---
});
