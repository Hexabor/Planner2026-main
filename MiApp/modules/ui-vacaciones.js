// ============================================================
// UI: Vacaciones adjudicadas (Gestión diaria → Vacaciones)
// Lee las V del planificador: no hay planes ni solicitudes.
// Vistas: Por persona · Vista global (12 meses) · Agenda (día a día del curso)
// ============================================================

Object.assign(App.ui, {
        _vacState: function() {
            if (!App.uiState.vacView) {
                const t = new Date();
                App.uiState.vacView = {
                    mode: 'global',
                    year: t.getFullYear(),
                    cursoY: t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1
                };
            }
            return App.uiState.vacView;
        },

        _vacRerender: function() {
            App.ui.renderRequests(document.querySelector('.main-scroll'));
        },

        // Índice de V en el planificador: { fecha: [{ empId, empName }] } ordenado por nombre
        _vacIndex: function() {
            const index = {};
            Object.keys(App.data.schedule || {}).forEach(date => {
                const day = App.data.schedule[date];
                Object.keys(day).forEach(empId => {
                    const sh = Utils.getShift(day[empId]);
                    if (sh && sh.fixed && sh.code === 'V') {
                        const emp = App.data.empleados.find(e => e.id === empId);
                        if (!index[date]) index[date] = [];
                        index[date].push({ empId, empName: emp ? emp.nombre : '?' });
                    }
                });
            });
            Object.keys(index).forEach(d => index[d].sort((a,b) => a.empName.localeCompare(b.empName)));
            return index;
        },

        // Curso laboral marzo → febrero
        _vacCursoRange: function(cursoY) {
            const endMonthLast = new Date(cursoY+1, 2, 0).getDate();
            return { start: `${cursoY}-03-01`, end: `${cursoY+1}-02-${String(endMonthLast).padStart(2,'0')}` };
        },

        _vacToolbar: function() {
            const mode = this._vacState().mode;
            const btn = (key, label, icon) => {
                const on = mode === key;
                return `<button onclick="App.uiState.vacView.mode='${key}';App.ui._vacRerender()"
                    style="display:flex;align-items:center;gap:5px;padding:5px 12px;border:1px solid ${on?'#2563eb':'#e2e8f0'};border-radius:6px;background:${on?'#eff6ff':'white'};color:${on?'#2563eb':'#64748b'};font-size:0.78rem;font-weight:600;cursor:pointer;">${icon}${label}</button>`;
            };
            return `<div style="display:flex;gap:4px;">${btn('persona','Por persona','📇')}${btn('global','Vista global','📅')}${btn('agenda','Agenda','📋')}</div>`;
        },

        _vacCursoNav: function(cursoY) {
            return `<div style="display:flex;align-items:center;gap:3px;">
                <button onclick="App.uiState.vacView.cursoY=${cursoY-1};App.ui._vacRerender()"
                    style="padding:3px 9px;border:1px solid #e2e8f0;border-radius:5px;background:#f1f5f9;cursor:pointer;font-size:0.82rem;color:#64748b;">◀</button>
                <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:68px;text-align:center;">${cursoY}/${cursoY+1}</span>
                <button onclick="App.uiState.vacView.cursoY=${cursoY+1};App.ui._vacRerender()"
                    style="padding:3px 9px;border:1px solid #e2e8f0;border-radius:5px;background:#f1f5f9;cursor:pointer;font-size:0.82rem;color:#64748b;">▶</button>
            </div>`;
        },

        _renderVacaciones: function(c, sectionBar) {
            if (c.parentElement) c.parentElement.style.cssText += ';display:flex;flex-direction:column;';
            c.style.cssText = 'padding:16px;overflow-y:auto;box-sizing:border-box;scrollbar-gutter:stable;';
            const st = this._vacState();
            if (st.mode === 'agenda') this._renderVacAgenda(c, sectionBar);
            else if (st.mode === 'persona') this._renderVacPersona(c, sectionBar);
            else this._renderVacGlobal(c, sectionBar);
            const insp = document.getElementById('inspector-content');
            if (insp) insp.innerHTML = '';
        },

        // ─── Por persona: días y tramos de cada empleado en el curso ───
        _renderVacPersona: function(c, sectionBar) {
            const st = this._vacState();
            const { start, end } = this._vacCursoRange(st.cursoY);
            const index = this._vacIndex();

            const byEmp = {};
            Object.keys(index).filter(d => d >= start && d <= end).sort().forEach(d => {
                index[d].forEach(e => { (byEmp[e.empId] = byEmp[e.empId] || []).push(d); });
            });

            // Agrupar días consecutivos en tramos
            const tramos = dates => {
                const out = [];
                dates.forEach(d => {
                    const last = out[out.length - 1];
                    if (last) {
                        const next = new Date(last.to + 'T12:00:00'); next.setDate(next.getDate() + 1);
                        if (next.toISOString().slice(0,10) === d) { last.to = d; last.n++; return; }
                    }
                    out.push({ from: d, to: d, n: 1 });
                });
                return out;
            };

            const emps = App.data.empleados
                .filter(e => byEmp[e.id] || (e.active !== false && Utils.empleadoVigenteEnRango(e, start, end)))
                .sort((a,b) => a.customOrder - b.customOrder);

            let html = sectionBar + `<div style="max-width:680px;margin:0 auto;width:100%;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;gap:10px;flex-wrap:wrap;">
                    ${this._vacToolbar()}
                    ${this._vacCursoNav(st.cursoY)}
                </div>
                <div style="display:flex;flex-direction:column;gap:8px;">`;

            emps.forEach(emp => {
                const dates = byEmp[emp.id] || [];
                const chips = tramos(dates).map(t => {
                    const label = t.n === 1 ? Utils.formatDateES(t.from) : `${Utils.formatDateES(t.from)} → ${Utils.formatDateES(t.to)}`;
                    return `<button onclick="App.ui._vacGoToDay('${t.from}')" title="Ir al planificador"
                        style="padding:2px 8px;border:1px solid #c4b5fd;border-radius:4px;background:#ede9fe;color:#5b21b6;font-size:0.72rem;font-weight:600;cursor:pointer;">${label} <span style="color:#7c3aed;font-weight:500;">· ${t.n}d</span></button>`;
                }).join('');
                html += `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:${dates.length ? '8px' : '0'};">
                        <span style="font-weight:700;font-size:0.88rem;color:#1e293b;">${emp.nombre}</span>
                        <span style="padding:2px 8px;background:${dates.length ? '#ede9fe' : '#f1f5f9'};color:${dates.length ? '#5b21b6' : '#94a3b8'};border-radius:4px;font-size:0.68rem;font-weight:700;">${dates.length} día${dates.length !== 1 ? 's' : ''}</span>
                    </div>
                    ${dates.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;">${chips}</div>` : ''}
                </div>`;
            });
            if (emps.length === 0) {
                html += `<div style="text-align:center;padding:50px;border:2px dashed #e2e8f0;border-radius:8px;color:#94a3b8;">Sin empleados en este curso.</div>`;
            }
            html += `</div></div>`;
            c.innerHTML = html;
        },

        // ─── Vista global: 12 meses, un color por empleado ───
        _renderVacGlobal: function(c, sectionBar) {
            const st = this._vacState();
            const index = this._vacIndex();

            const DIAS_H = ['L','M','X','J','V','S','D'];
            const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

            // Colores por empleado (orden de plantilla, como antes)
            const EMP_COLORS = ['#2563eb','#7c3aed','#0891b2','#dc2626','#d97706','#16a34a','#db2777','#4f46e5','#0d9488','#b91c1c','#ca8a04','#059669'];
            const activeEmps = App.data.empleados.filter(e => e.active !== false).sort((a,b) => a.customOrder - b.customOrder);
            const empColorMap = {};
            activeEmps.forEach((e, i) => { empColorMap[e.id] = EMP_COLORS[i % EMP_COLORS.length]; });

            const buildMonth = (year, month) => {
                const first = new Date(year, month, 1);
                let startDow = first.getDay();
                startDow = startDow === 0 ? 6 : startDow - 1;
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                let cells = '';
                for (let i = 0; i < startDow; i++) cells += `<div style="width:28px;height:24px;"></div>`;
                for (let d = 1; d <= daysInMonth; d++) {
                    const iso = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
                    const entries = (index[iso] || []).map(e => ({ ...e, color: empColorMap[e.empId] || '#94a3b8' }));
                    const isSun = new Date(year, month, d).getDay() === 0;
                    let bg = 'white', color = isSun ? '#7c3aed' : '#1e293b', border = '1px solid #e2e8f0', title = '';
                    if (entries.length === 1) {
                        bg = entries[0].color + '22'; border = `2px solid ${entries[0].color}`;
                        color = entries[0].color; title = `title="${entries[0].empName}"`;
                    } else if (entries.length > 1) {
                        // Varias personas — gradiente
                        const names = entries.map(e => e.empName).join(', ');
                        bg = `linear-gradient(135deg, ${entries.map((e,i) => e.color + ' ' + Math.round(i/entries.length*100) + '%, ' + e.color + ' ' + Math.round((i+1)/entries.length*100) + '%').join(', ')})`;
                        color = 'white'; border = '2px solid #475569';
                        title = `title="${entries.length} personas: ${names}"`;
                    }
                    const click = entries.length ? `onclick="App.ui._vacGoToDay('${iso}')"` : '';
                    cells += `<div ${title} ${click} style="width:28px;height:24px;display:flex;align-items:center;justify-content:center;
                        font-size:0.72rem;font-weight:${entries.length > 0 ? '700' : '500'};border-radius:4px;cursor:${entries.length ? 'pointer' : 'default'};
                        background:${bg};color:${color};border:${border};">${d}</div>`;
                }
                return `<div style="background:white;border:1px solid #e2e8f0;border-radius:8px;padding:8px;">
                    <div style="text-align:center;font-size:0.75rem;font-weight:700;color:#475569;margin-bottom:6px;">${MESES[month]} ${year}</div>
                    <div style="display:grid;grid-template-columns:repeat(7,28px);gap:2px;justify-content:center;">
                        ${DIAS_H.map(d => `<div style="width:28px;text-align:center;font-size:0.6rem;font-weight:700;color:#94a3b8;">${d}</div>`).join('')}
                        ${cells}
                    </div>
                </div>`;
            };

            let monthsHtml = '';
            for (let m = 0; m < 12; m++) monthsHtml += buildMonth(st.year, m);

            // Leyenda: quién tiene V en el año mostrado y cuántos días
            const yearPrefix = String(st.year) + '-';
            const daysByEmp = {};
            Object.keys(index).filter(d => d.startsWith(yearPrefix)).forEach(d => {
                index[d].forEach(e => { daysByEmp[e.empId] = (daysByEmp[e.empId] || 0) + 1; });
            });
            const legendEmps = App.data.empleados.filter(e => daysByEmp[e.id]).sort((a,b) => a.customOrder - b.customOrder);
            const legend = legendEmps.map(emp => `<div style="display:flex;align-items:center;gap:6px;">
                    <div style="width:12px;height:12px;border-radius:3px;background:${empColorMap[emp.id] || '#94a3b8'};flex-shrink:0;"></div>
                    <span style="font-size:0.78rem;color:#1e293b;font-weight:600;">${emp.nombre}</span>
                    <span style="font-size:0.7rem;color:#94a3b8;">${daysByEmp[emp.id]}d</span>
                </div>`).join('') || `<span style="font-size:0.78rem;color:#94a3b8;">Nadie tiene vacaciones en ${st.year}</span>`;

            c.innerHTML = sectionBar + `
                <div style="max-width:980px;margin:0 auto;width:100%;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                        ${this._vacToolbar()}
                        <div style="display:flex;align-items:center;gap:3px;">
                            <button onclick="App.uiState.vacView.year--;App.ui._vacRerender()"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">◀</button>
                            <span style="font-size:0.82rem;font-weight:700;color:#1e293b;min-width:40px;text-align:center;">${st.year}</span>
                            <button onclick="App.uiState.vacView.year++;App.ui._vacRerender()"
                                style="padding:3px 8px;border:1px solid #e2e8f0;border-radius:4px;background:#f8fafc;cursor:pointer;font-size:0.78rem;color:#475569;">▶</button>
                        </div>
                    </div>
                    <div style="display:flex;flex-wrap:wrap;gap:10px 20px;margin-bottom:12px;padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;">
                        ${legend}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
                        ${monthsHtml}
                    </div>
                </div>`;
        },

        // ─── Agenda: día a día del curso, 3 columnas de otorgadas ───
        _renderVacAgenda: function(c, sectionBar) {
            const st = this._vacState();
            // Sin padding vertical en el scrollport para que el sticky ancle limpio al borde
            c.style.padding = '0 16px';
            const cursoY = st.cursoY;
            const { start, end } = this._vacCursoRange(cursoY);

            const days = [];
            let cur = new Date(start + 'T00:00:00');
            const last = new Date(end + 'T00:00:00');
            while (cur <= last) {
                days.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,'0')}-${String(cur.getDate()).padStart(2,'0')}`);
                cur.setDate(cur.getDate()+1);
            }

            const grantedIndex = this._vacIndex();
            const DAY_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
            const today = new Date().toISOString().slice(0,10);

            let html = sectionBar + `<div style="max-width:620px;margin:0 auto;width:100%;padding:16px 0;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;flex-wrap:wrap;">
                    ${this._vacToolbar()}
                    ${this._vacCursoNav(cursoY)}
                </div>
                <div style="display:flex;gap:10px;align-items:center;margin-bottom:8px;flex-wrap:wrap;font-size:0.67rem;color:var(--text-muted);">
                    <span><span style="display:inline-block;width:10px;height:10px;background:#ede9fe;border:1px solid #c4b5fd;border-radius:2px;vertical-align:middle;margin-right:3px;"></span>V en planificador</span>
                    <span style="color:#94a3b8;">· click en un hueco → otorgar V a un empleado</span>
                </div>
                <table style="border-collapse:separate;border-spacing:0;font-size:0.75rem;table-layout:fixed;margin:0 auto;">
                    <thead>
                        <tr>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 3px;font-size:0.64rem;color:#64748b;font-weight:600;width:28px;background:#f1f5f9;border-right:1px solid #e2e8f0;border-bottom:2px solid #cbd5e1;">WK</th>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 4px;text-align:left;font-size:0.64rem;color:#64748b;font-weight:600;width:44px;background:#f1f5f9;border-bottom:2px solid #cbd5e1;">Fecha</th>
                            <th style="position:sticky;top:0;z-index:5;padding:4px 3px;font-size:0.64rem;color:#64748b;font-weight:600;width:28px;background:#f1f5f9;border-right:2px solid #cbd5e1;border-bottom:2px solid #cbd5e1;">Día</th>
                            <th colspan="3" style="position:sticky;top:0;z-index:5;padding:4px 5px;font-size:0.64rem;color:#5b21b6;font-weight:700;background:#ede9fe;border-bottom:2px solid #cbd5e1;">OTORGADAS</th>
                        </tr>
                    </thead>
                    <tbody>`;

            let lastWk = null, wkParity = 0;
            days.forEach(date => {
                const d = new Date(date + 'T00:00:00');
                const dow = d.getDay();
                const isWeekend = dow === 0 || dow === 6;
                const isMon = dow === 1;
                const wk = Utils.getWeekCode(date);
                const isHoliday = (App.data.storeConfig.holidays || []).some(h => h.date === date);
                const isToday = date === today;
                if (wk !== lastWk) { lastWk = wk; wkParity = 1 - wkParity; }

                const grants = grantedIndex[date] || [];

                const weekSep = isMon ? 'border-top:2px solid #94a3b8;' : '';
                const weekBg = wkParity === 0 ? '#ffffff' : '#f8fafc';
                const rowBg = isHoliday ? '#fef3c7' : isWeekend ? '#f0f4f8' : weekBg;
                const todayHL = isToday ? 'outline:2px solid #2563eb;outline-offset:-2px;' : '';
                const dayColor = isWeekend ? '#94a3b8' : '#1e293b';
                const dayW = isWeekend ? '700' : '400';
                const wkDisplay = wk.replace(/^\d{4}/, '').replace('WK','W');
                const dateDisplay = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
                const bdBot = 'border-bottom:1px solid #f1f5f9;';
                const cellBase = `padding:2px 4px;${bdBot}${weekSep}`;
                const rowId = isToday ? 'id="vac-agenda-today"' : '';

                const grantCell = (e, more) => {
                    if (!e) return `<td style="${cellBase}width:128px;cursor:pointer;" onclick="event.stopPropagation();App.ui._vacAgendaMenu('empty','${date}',null,this)" onmouseover="this.style.background='#faf5ff'" onmouseout="this.style.background=''"></td>`;
                    const first = e.empName.split(' ')[0];
                    return `<td style="${cellBase}width:128px;">
                        <div style="display:flex;align-items:center;background:#ede9fe;border:1px solid #c4b5fd;border-radius:4px;padding:2px 5px;min-height:20px;cursor:pointer;"
                             onclick="event.stopPropagation();App.ui._vacAgendaMenu('granted','${date}','${e.empId}',this)"
                             title="${more ? [e, ...more].map(g => g.empName).join(', ') : e.empName}">
                            <span style="font-weight:600;font-size:0.72rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${first}</span>
                            ${more ? `<span style="margin-left:auto;font-size:0.64rem;font-weight:700;color:#7c3aed;">+${more.length}</span>` : ''}
                        </div></td>`;
                };
                // Más de 3 a la vez: la tercera columna indica cuántos más
                const more = grants.length > 3 ? grants.slice(3) : null;

                html += `<tr ${rowId} style="background:${rowBg};${todayHL}">
                    <td style="padding:2px 3px;text-align:center;color:#94a3b8;font-size:0.62rem;font-weight:700;border-right:1px solid #e2e8f0;${bdBot}${weekSep}">${isMon?wkDisplay:''}</td>
                    <td style="padding:2px 6px;font-size:0.71rem;color:${dayColor};${bdBot}${weekSep}">${dateDisplay}</td>
                    <td style="padding:2px 4px;text-align:center;color:${dayColor};font-size:0.67rem;font-weight:${dayW};border-right:2px solid #cbd5e1;${bdBot}${weekSep}">${DAY_ES[dow]}</td>
                    ${grantCell(grants[0]||null)}
                    ${grantCell(grants[1]||null)}
                    ${grantCell(grants[2]||null, more)}
                </tr>`;
            });

            html += `</tbody></table></div>`;
            const prevScroll = c.scrollTop;
            c.innerHTML = html;

            if (prevScroll > 0) {
                c.scrollTop = prevScroll;
            } else {
                const todayRow = document.getElementById('vac-agenda-today');
                if (todayRow) setTimeout(() => todayRow.scrollIntoView({ block:'center', behavior:'instant' }), 50);
            }
        },

        // Dropdown contextual de la agenda
        _vacAgendaMenu: function(kind, date, empId, el) {
            this._vacCloseMenu();
            const rect = el.getBoundingClientRect();
            const menu = document.createElement('div');
            menu.id = 'vac-agenda-menu';
            const left = Math.min(rect.left, window.innerWidth - 240);
            const top = Math.min(rect.bottom + 2, window.innerHeight - 200);
            menu.style.cssText = `position:fixed;left:${left}px;top:${top}px;background:white;border:1px solid #cbd5e1;border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,0.15);z-index:9999;min-width:200px;padding:4px;font-size:0.8rem;max-height:320px;overflow-y:auto;`;
            menu.oncontextmenu = (e) => { e.preventDefault(); App.ui._vacCloseMenu(); };

            const item = (label, onclick, color) => `<button onclick="${onclick}" style="display:block;width:100%;padding:6px 10px;border:none;background:none;text-align:left;cursor:pointer;border-radius:4px;font-size:0.78rem;color:${color||'#1e293b'};" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">${label}</button>`;

            let body = '';
            if (kind === 'granted') {
                body = item('📅 Ir al día en planificador', `App.ui._vacGoToDay('${date}')`) +
                       item('✕ Revocar vacaciones', `App.ui._vacRevoke('${date}','${empId}')`, '#dc2626');
            } else {
                const dayV = new Set((this._vacIndex()[date] || []).map(e => e.empId));
                const picks = App.data.empleados
                    .filter(e => e.active !== false && !dayV.has(e.id) && Utils.empleadoVigenteEnRango(e, date, date))
                    .sort((a,b) => a.nombre.localeCompare(b.nombre));
                if (picks.length === 0) {
                    body = `<div style="padding:6px 10px;color:#94a3b8;">Sin candidatos.</div>`;
                } else {
                    body = `<div style="padding:3px 8px;font-size:0.64rem;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">Otorgar V a…</div>` +
                        picks.map(e => item(e.nombre, `App.ui._vacAssign('${date}','${e.id}')`)).join('');
                }
            }
            menu.innerHTML = body;
            document.body.appendChild(menu);

            const close = (ev) => {
                const insideMenu = ev && ev.target && ev.target.closest && ev.target.closest('#vac-agenda-menu');
                if (ev && ev.type === 'contextmenu') {
                    if (insideMenu) ev.preventDefault();
                    App.ui._vacCloseMenu();
                    return;
                }
                if (insideMenu) return;
                App.ui._vacCloseMenu();
            };
            App.ui._vacCloseFn = close;
            setTimeout(() => {
                document.addEventListener('click', close);
                document.addEventListener('contextmenu', close);
            }, 0);
        },

        _vacCloseMenu: function() {
            ['vac-agenda-menu', 'vac-agenda-conflict', 'vac-agenda-backdrop'].forEach(id => { const n = document.getElementById(id); if (n) n.remove(); });
            if (App.ui._vacCloseFn) {
                document.removeEventListener('click', App.ui._vacCloseFn);
                document.removeEventListener('contextmenu', App.ui._vacCloseFn);
                App.ui._vacCloseFn = null;
            }
        },

        _vacGoToDay: function(date) {
            App.ui._vacCloseMenu();
            App.uiState.currentDate = date;
            App.router.go('planificador');
        },

        // Comprobaciones comunes antes de tocar un turno desde la agenda
        _vacCanEdit: async function(date, empId) {
            if (App.logic.isDayLocked(date)) {
                alert('🔒 Esta semana está cerrada.\n\nPara editar los turnos, ábrela primero con el switch del planificador.');
                return false;
            }
            return await App.logic._blindajeGate(empId, date);
        },

        _vacAssign: async function(date, empId) {
            App.ui._vacCloseMenu();
            const emp = App.data.empleados.find(e => e.id === empId);
            if (!emp) return;
            const sv = (App.data.schedule[date] || {})[empId];
            if (sv) {
                const sh = Utils.getShift(sv);
                if (sh && !sh.fixed) { App.ui._vacConflictPopup(date, empId, sh); return; }
            }
            if (!(await App.ui._vacCanEdit(date, empId))) return;
            const fixed = App.data.fixedShifts.find(s => s.code === 'V');
            if (!fixed) { alert('No existe el turno fijo V en la configuración.'); return; }
            if (!App.data.schedule[date]) App.data.schedule[date] = {};
            App.data.schedule[date][empId] = fixed.id;
            App.logic.saveSnapshot(`Vacaciones a ${emp.nombre}`);
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.ui._vacRerender();
        },

        _vacRevoke: async function(date, empId) {
            App.ui._vacCloseMenu();
            if (!App.data.schedule[date]) return;
            if (!(await App.ui._vacCanEdit(date, empId))) return;
            const emp = App.data.empleados.find(e => e.id === empId);
            delete App.data.schedule[date][empId];
            App.logic.saveSnapshot(`Quitar vacaciones de ${emp ? emp.nombre : empId}`);
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.ui._vacRerender();
        },

        _vacConflictPopup: function(date, empId, shift) {
            App.ui._vacCloseMenu();
            const emp = App.data.empleados.find(e => e.id === empId);
            const desc = shift.code || `${shift.start}–${shift.end}`;
            const bd = document.createElement('div');
            bd.id = 'vac-agenda-backdrop';
            bd.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.35);z-index:9999;';
            bd.onclick = () => App.ui._vacCloseMenu();
            const pop = document.createElement('div');
            pop.id = 'vac-agenda-conflict';
            pop.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:white;border:1px solid #fca5a5;border-radius:8px;padding:18px 22px;box-shadow:0 10px 30px rgba(0,0,0,0.2);z-index:10000;max-width:400px;';
            pop.innerHTML = `
                <div style="font-weight:700;color:#dc2626;margin-bottom:8px;font-size:0.95rem;">⚠️ Conflicto de turno</div>
                <div style="color:#475569;line-height:1.5;font-size:0.85rem;margin-bottom:14px;">
                    <strong>${emp ? emp.nombre : '?'}</strong> ya tiene el turno <strong>${desc}</strong> asignado el <strong>${Utils.formatDateES(date)}</strong>.<br><br>
                    No se otorga la vacación. Revisa la situación en el planificador antes de continuar.
                </div>
                <div style="display:flex;justify-content:flex-end;gap:6px;">
                    <button onclick="App.ui._vacCloseMenu()" style="padding:6px 14px;border:1px solid #e2e8f0;background:white;color:#64748b;font-size:0.82rem;font-weight:600;border-radius:5px;cursor:pointer;">Cancelar</button>
                    <button onclick="App.ui._vacGoToDay('${date}')" style="padding:6px 14px;border:none;background:#2563eb;color:white;font-size:0.82rem;font-weight:600;border-radius:5px;cursor:pointer;">📅 Ir al día</button>
                </div>`;
            document.body.appendChild(bd);
            document.body.appendChild(pop);
        },
});
