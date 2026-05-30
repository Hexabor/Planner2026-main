// ============================================================
// UI: Análisis: desvío y resumen
// ============================================================

Object.assign(App.ui, {
        renderAnalisis: function(c) {
            const tab = App.uiState.analisisTab || 'horas';
            const setTab = t => `App.uiState.analisisTab='${t}'; App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;
            const emps = App.data.empleados.filter(e => e.active !== false)
                .sort((a,b) => (App.uiState.sortKey==='custom' ? a.customOrder-b.customOrder : a.nombre.localeCompare(b.nombre)));

            const tabBar = `
                <div style="display:flex;gap:0;border:1px solid var(--border);border-radius:8px;overflow:hidden;width:fit-content;margin-bottom:20px;">
                    ${[['horas','Horas Semanales'],['staffv2','Horas por Staff'],['staff','Horas por Staff (legacy)'],['equilibrio','Equilibrio de Turnos'],['ranking','Turnos Más Usados'],['semanas','Vista de Semanas']].map(([id,label])=>`
                    <button onclick="${setTab(id)}" style="padding:8px 18px;border:none;cursor:pointer;font-size:0.8rem;font-weight:600;
                        background:${tab===id?'#1e293b':'white'};color:${tab===id?'white':'#64748b'};border-right:1px solid var(--border);">${label}</button>`).join('')}
                </div>`;

            // --- Helpers Globales para el Selector de Semanas ---
            const fyStart = App.data.config.weekStart || "2025-12-29";
            const fyEndObj = new Date(fyStart + 'T00:00:00');
            fyEndObj.setDate(fyEndObj.getDate() + (51 * 7)); // Semana 52 (51 semanas sumadas a la 01)
            const fyEnd = fyEndObj.toISOString().slice(0,10);

            const _shortDate = iso => { const [y,m,d] = iso.split('-'); return `${d}.${m}`; };
            const buildAllWeekOpts = (sel) => {
                const anchor = new Date(fyStart + 'T00:00:00');
                const min = new Date(anchor); min.setDate(min.getDate() - 8 * 7); // Rango fijo: empieza 8 sem antes (WK44 prev)
                const max = new Date(anchor); max.setDate(max.getDate() + 61 * 7); // Rango fijo: termina 61 sem despues (WK10 próx)

                let opts = '';
                let cur = new Date(min);
                while(cur <= max) {
                    const iso = cur.toISOString().slice(0,10);
                    const wdays = Utils.getWeekDays(iso);
                    const label = `${Utils.getWeekCode(iso)} · ${_shortDate(wdays[0])}–${_shortDate(wdays[6])}`;
                    opts += `<option value="${iso}" ${iso === sel ? 'selected' : ''}>${label}</option>`;
                    cur.setDate(cur.getDate() + 7);
                }
                return opts;
            };
            const wkSelectStyle = `padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:0.8rem;background:white;min-width:230px;cursor:pointer;`;

            let body = '';

            // ─── TAB 1: EQUILIBRIO ───────────────────────────────────────────
            if(tab === 'equilibrio') {
                if(!App.uiState.analisisEqStart) {
                    App.uiState.analisisEqStart = fyStart;
                    App.uiState.analisisEqEnd   = fyEnd;
                }
                // Si el usuario invierte las fechas, las rotamos automáticamente
                if(App.uiState.analisisEqStart > App.uiState.analisisEqEnd) {
                    const temp = App.uiState.analisisEqStart;
                    App.uiState.analisisEqStart = App.uiState.analisisEqEnd;
                    App.uiState.analisisEqEnd = temp;
                }
                
                const startISO = App.uiState.analisisEqStart;
                const endISO   = App.uiState.analisisEqEnd;

                if(!App.uiState.analisisEqHidden)    App.uiState.analisisEqHidden = [];
                if(!App.uiState.analisisEqFavFilter) App.uiState.analisisEqFavFilter = 'all';

                const hiddenEmps  = App.uiState.analisisEqHidden;
                const favFilter   = App.uiState.analisisEqFavFilter;

                const empFavType = emp => {
                    const prefId = emp.prefs?.shift;
                    if(!prefId || prefId === 'any') return 'any';
                    const sh = App.data.shiftDefs.find(s => s.id === prefId);
                    if(!sh || !sh.start || !sh.end) return 'any';
                    return Utils.classifyShift(sh) || 'any';
                };

                let totalM=0, totalT=0, totalI=0, totalP=0, totalAll=0;
                let empStats = emps.map(emp => {
                    let countM=0, countT=0, countI=0, countP=0;
                    Object.keys(App.data.schedule).forEach(date => {
                        if(date < startISO || date > endISO) return;
                        const sid = App.data.schedule[date][emp.id];
                        if(!sid) return;
                        const sh = Utils.getShift(sid);
                        if(!sh || !sh.start || !sh.end) return;
                        const type = Utils.classifyShift(sh);
                        if(type==='M') countM++;
                        else if(type==='T') countT++;
                        else if(type==='I') countI++;
                        else if(type==='P') countP++;
                    });
                    const total = countM+countT+countI+countP;
                    totalM+=countM; totalT+=countT; totalI+=countI; totalP+=countP; totalAll+=total;
                    return { emp, countM, countT, countI, countP, total, favType: empFavType(emp) };
                });

                const visibleStats = empStats.filter(d => {
                    if(hiddenEmps.includes(d.emp.id)) return false;
                    if(favFilter === 'all') return true;
                    if(favFilter === 'any') return d.favType === 'any';
                    return d.favType === favFilter;
                });

                let vTotalM=0,vTotalT=0,vTotalI=0,vTotalP=0,vTotalAll=0;
                visibleStats.forEach(d=>{ vTotalM+=d.countM; vTotalT+=d.countT; vTotalI+=d.countI; vTotalP+=d.countP; vTotalAll+=d.total; });
                const vTotals = {M:vTotalM,T:vTotalT,I:vTotalI,P:vTotalP};

                const eqSortKey = App.uiState.analisisEqSortKey || null;
                const eqSortDir = App.uiState.analisisEqSortDir || 'desc';
                if(eqSortKey) {
                    visibleStats.sort((a,b) => {
                        const av = eqSortKey==='nombre' ? a.emp.nombre : (a.total>0 ? a['count'+eqSortKey]/a.total : 0);
                        const bv = eqSortKey==='nombre' ? b.emp.nombre : (b.total>0 ? b['count'+eqSortKey]/b.total : 0);
                        if(eqSortKey==='nombre') return eqSortDir==='asc' ? av.localeCompare(bv) : bv.localeCompare(av);
                        return eqSortDir==='asc' ? av-bv : bv-av;
                    });
                }
                const sortArrow = key => eqSortKey===key ? (eqSortDir==='asc'?' ↑':' ↓') : '';
                const sortClick = key => `App.uiState.analisisEqSortDir=(App.uiState.analisisEqSortKey==='${key}'&&App.uiState.analisisEqSortDir==='desc')?'asc':'desc';App.uiState.analisisEqSortKey='${key}';App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;

                const gradStyle = (type, perc) => {
                    if(type==='M') {
                        if(perc>=60) return `background:#1e40af;color:white;font-weight:700;`;
                        if(perc>=50) return `background:#3b82f6;color:white;font-weight:700;`;
                        if(perc>=40) return `background:#60a5fa;color:white;font-weight:600;`;
                        if(perc>=30) return `background:#93c5fd;color:#1e3a8a;font-weight:600;`;
                        if(perc>=20) return `background:#bfdbfe;color:#1e40af;`;
                        if(perc>=10) return `background:#dbeafe;color:#1e40af;`;
                        return `background:#eff6ff;color:#64748b;`;
                    } else if(type==='T') {
                        if(perc>=60) return `background:#c2410c;color:white;font-weight:700;`;
                        if(perc>=50) return `background:#ea580c;color:white;font-weight:700;`;
                        if(perc>=40) return `background:#f97316;color:white;font-weight:600;`;
                        if(perc>=30) return `background:#fb923c;color:#7c2d12;font-weight:600;`;
                        if(perc>=20) return `background:#fdba74;color:#9a3412;`;
                        if(perc>=10) return `background:#fed7aa;color:#9a3412;`;
                        return `background:#ffedd5;color:#64748b;`;
                    } else if(type==='I') {
                        if(perc>=60) return `background:#a16207;color:white;font-weight:700;`;
                        if(perc>=50) return `background:#ca8a04;color:white;font-weight:700;`;
                        if(perc>=40) return `background:#eab308;color:white;font-weight:600;`;
                        if(perc>=30) return `background:#facc15;color:#713f12;font-weight:600;`;
                        if(perc>=20) return `background:#fde047;color:#854d0e;`;
                        if(perc>=10) return `background:#fef08a;color:#92400e;`;
                        return `background:#fef9c3;color:#64748b;`;
                    } else {
                        if(perc>=60) return `background:#991b1b;color:white;font-weight:700;`;
                        if(perc>=50) return `background:#dc2626;color:white;font-weight:700;`;
                        if(perc>=40) return `background:#ef4444;color:white;font-weight:600;`;
                        if(perc>=30) return `background:#f87171;color:#7f1d1d;font-weight:600;`;
                        if(perc>=20) return `background:#fca5a5;color:#991b1b;`;
                        if(perc>=10) return `background:#fecaca;color:#991b1b;`;
                        return `background:#fee2e2;color:#64748b;`;
                    }
                };

                const favBadgeStyle = { M:'background:#dbeafe;color:#1e40af;', T:'background:#fed7aa;color:#9a3412;', I:'background:#fef08a;color:#92400e;', P:'background:#fecaca;color:#991b1b;' };
                const favBadge = type => type === 'any'
                    ? `<span style="font-size:0.65rem;color:#cbd5e1;">–</span>`
                    : `<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:0.7rem;font-weight:700;${favBadgeStyle[type]||''}">${type}</span>`;

                const cell = (count, total, type) => {
                    const perc = total>0 ? count/total*100 : 0;
                    const ratio = total>0 ? ((count/total)*5).toFixed(1) : '0.0';
                    return `<td style="text-align:center;padding:8px 6px;min-width:120px;width:120px;${gradStyle(type,perc)}" title="${count} turnos · ${perc.toFixed(1)}%">
                        <div style="font-size:0.9rem;font-weight:700;line-height:1.3;">${perc.toFixed(0)}%</div>
                        <div style="font-size:0.72rem;opacity:0.9;line-height:1.4;">${count} t · ${ratio}/5</div>
                    </td>`;
                };

                const types = ['M','T','I','P'];
                const typeNames = {M:'Mañana',T:'Tarde',I:'Intermedio',P:'Partido'};
                const thStyle = `padding:9px 6px;font-size:0.78rem;font-weight:700;color:#1e293b;text-align:center;background:#f8fafc;min-width:120px;width:120px;cursor:pointer;user-select:none;`;

                const setFavFilter = key => `App.uiState.analisisEqFavFilter='${key}';App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;
                const favBtnStyle = (key) => `padding:5px 12px;border-radius:6px;border:1px solid var(--border);font-size:0.75rem;font-weight:600;cursor:pointer;
                    background:${favFilter===key?'#1e293b':'white'};color:${favFilter===key?'white':'#64748b'};`;
                const favButtons = `
                    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
                        <span style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-right:4px;">Favorito</span>
                        ${[['all','Todos'],['M','Mañana'],['T','Tarde'],['I','Intermedio'],['P','Partido'],['any','Indiferente']].map(([k,l])=>
                            `<button onclick="${setFavFilter(k)}" style="${favBtnStyle(k)}">${l}</button>`
                        ).join('')}
                    </div>`;

                const hiddenCount = hiddenEmps.length;
                const hiddenBanner = hiddenCount > 0
                    ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:8px;padding:8px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;">
                        <span style="font-size:0.78rem;color:#92400e;">👁 ${hiddenCount} empleado${hiddenCount>1?'s':''} oculto${hiddenCount>1?'s':''}.</span>
                        <button onclick="App.uiState.analisisEqHidden=[];App.ui.renderAnalisis(document.querySelector('.main-scroll'));" style="padding:4px 12px;border-radius:6px;border:1px solid #ca8a04;background:white;font-size:0.75rem;font-weight:600;cursor:pointer;color:#92400e;">Mostrar todos</button>
                      </div>`
                    : '';

                body = `
                <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:12px;flex-wrap:wrap;">
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Desde</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisEqStart=this.value;App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(startISO)}</select></div>
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Hasta</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisEqEnd=this.value;App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(endISO)}</select></div>
                    <div style="font-size:0.75rem;color:#94a3b8;padding-bottom:8px;">${vTotalAll} turnos · ${visibleStats.length} empleados visibles</div>
                </div>
                <div style="margin-bottom:12px;">${favButtons}</div>
                ${hiddenBanner ? `<div style="margin-bottom:12px;">${hiddenBanner}</div>` : ''}
                <div style="background:white;border:1px solid var(--border);border-radius:10px;overflow-x:auto;">
                    <table style="border-collapse:collapse;">
                        <thead>
                            <tr style="border-bottom:2px solid var(--border);">
                                <th style="${thStyle} text-align:center;min-width:36px;width:36px;cursor:default;" title="Turno favorito">Fav</th>
                                <th style="${thStyle} text-align:left;min-width:160px;width:160px;cursor:pointer;" onclick="${sortClick('nombre')}">Empleado${sortArrow('nombre')}</th>
                                ${types.map(t=>`<th style="${thStyle}" onclick="${sortClick(t)}" title="Ordenar por ${typeNames[t]}">${t} · ${typeNames[t]}${sortArrow(t)}</th>`).join('')}
                                <th style="${thStyle} background:#1e293b;color:white;cursor:default;">Total</th>
                                <th style="${thStyle} min-width:36px;width:36px;cursor:default;"></th>
                            </tr>
                        </thead>
                        <tbody>
                            ${visibleStats.map((d,i)=>{
                                const hideClick = `App.uiState.analisisEqHidden=[...App.uiState.analisisEqHidden,'${d.emp.id}'];App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;
                                return `<tr style="border-bottom:1px solid #f1f5f9;${i%2===1?'background:#fafafa':''}">
                                    <td style="text-align:center;padding:8px 4px;min-width:36px;">${favBadge(d.favType)}</td>
                                    <td style="padding:8px 14px;font-weight:600;font-size:0.82rem;color:#1e293b;white-space:nowrap;min-width:160px;">${d.emp.nombre}</td>
                                    ${types.map(t => cell(d['count'+t], d.total, t)).join('')}
                                    <td style="text-align:center;padding:8px 6px;font-weight:800;color:#1e293b;font-size:0.9rem;background:#f8fafc;">${d.total}</td>
                                    <td style="text-align:center;padding:8px 4px;">
                                        <button onclick="${hideClick}" title="Ocultar ${d.emp.nombre}" style="background:none;border:none;cursor:pointer;color:#cbd5e1;font-size:0.85rem;padding:2px 4px;border-radius:4px;" onmouseover="this.style.color='#64748b'" onmouseout="this.style.color='#cbd5e1'">👁</button>
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="border-top:3px solid var(--border);background:#f1f5f9;">
                                <td style="padding:9px 4px;"></td>
                                <td style="padding:9px 14px;font-size:0.78rem;font-weight:800;color:#1e293b;">EQUIPO</td>
                                ${types.map(t => {
                                    const perc = vTotalAll>0 ? vTotals[t]/vTotalAll*100 : 0;
                                    const ratio = vTotalAll>0 ? ((vTotals[t]/vTotalAll)*5).toFixed(1) : '0.0';
                                    return `<td style="text-align:center;padding:9px 6px;font-weight:700;${gradStyle(t,perc)}">
                                        <div style="font-size:0.9rem;font-weight:700;">${perc.toFixed(0)}%</div>
                                        <div style="font-size:0.72rem;opacity:0.9;">${vTotals[t]} t · ${ratio}/5</div>
                                    </td>`;
                                }).join('')}
                                <td style="text-align:center;padding:9px 6px;font-weight:800;font-size:0.95rem;color:#1e293b;background:#e2e8f0;">${vTotalAll}</td>
                                <td style="padding:9px 4px;"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>`;

            // ─── TAB 2: HORAS SEMANALES ──────────────────────────────────────
            } else if(tab === 'horas') {
                if(!App.uiState.analisisHorasStart) {
                    try { const saved = JSON.parse(localStorage.getItem('v40_analisisHoras')); if(saved) { App.uiState.analisisHorasStart = saved.start; App.uiState.analisisHorasEnd = saved.end; } } catch(e){}
                }
                if(!App.uiState.analisisHorasStart) {
                    App.uiState.analisisHorasStart = fyStart;
                    App.uiState.analisisHorasEnd   = fyEnd;
                }
                if(App.uiState.analisisHorasStart > App.uiState.analisisHorasEnd) {
                    const temp = App.uiState.analisisHorasStart;
                    App.uiState.analisisHorasStart = App.uiState.analisisHorasEnd;
                    App.uiState.analisisHorasEnd = temp;
                }
                const startISO = App.uiState.analisisHorasStart;
                const endISO   = App.uiState.analisisHorasEnd;

                const weeks = [];
                let cur = new Date(Utils.getMonday(startISO)+'T12:00:00');
                const endD = new Date(Utils.getMonday(endISO)+'T12:00:00');
                while(cur <= endD) { weeks.push(cur.toISOString().slice(0,10)); cur.setDate(cur.getDate()+7); }

                const weekData = weeks.map(monday => {
                    let worked = 0;
                    emps.forEach(emp => {
                        if(!Utils.empleadoVigenteEnFecha(emp, monday)) return;
                        const wdays = Utils.getWeekDays(monday);
                        wdays.forEach(d => {
                            const sid = App.data.schedule[d]?.[emp.id];
                            const sh = sid ? Utils.getShift(sid) : null;
                            if(sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd);
                        });
                    });
                    return { monday, worked: Math.round(worked*10)/10 };
                });

                // ── Horas objetivo por facturación ──
                const fact = App.data.config.facturacion || [];
                const factTotal = fact.reduce((s,v) => s+v, 0);
                const wsDate = App.data.config.weekStart || '2025-12-29';
                let targetByWeek = {};
                if(factTotal > 0 && fact.length > 0) {
                    const horasAnuales = emps.reduce((s, emp) => {
                        if(emp.contratos && emp.contratos.length > 0) {
                            const ultimo = [...emp.contratos].sort((a,b) => b.desde.localeCompare(a.desde))[0];
                            return s + (ultimo.horas || 0);
                        }
                        return s + (emp.contrato || 0);
                    }, 0) * 52;
                    // Usar misma lógica que weeks para generar claves alineadas
                    let fCur = new Date(Utils.getMonday(wsDate)+'T12:00:00');
                    fact.forEach((val) => {
                        const key = fCur.toISOString().slice(0,10);
                        targetByWeek[key] = Math.round(val / factTotal * horasAnuales * 10) / 10;
                        fCur.setDate(fCur.getDate() + 7);
                    });
                }

                const maxTarget = Object.values(targetByWeek).length > 0 ? Math.max(...Object.values(targetByWeek)) : 0;
                const maxH = Math.max(...weekData.map(w=>w.worked), maxTarget, 1);
                const chartH = 200;
                const barW = Math.max(8, Math.min(40, Math.floor(1200 / Math.max(weeks.length,1)) - 3));
                const totalW = weeks.length * (barW + 3) + 60;

                let svgTargets = '', svgBlue = '', svgOverlines = '', svgLabels = '';
                weekData.forEach((w,i) => {
                    const x = 40 + i*(barW+3);
                    const wH = Math.round(w.worked/maxH*chartH);
                    const target = targetByWeek[w.monday] || 0;
                    const tH = target > 0 ? Math.round(target/maxH*chartH) : 0;
                    const wkLabel = Utils.getWeekCode(w.monday).replace(/.*WK/,'W');
                    if(tH > 0) svgTargets += `<rect x="${x}" y="${chartH-tH+10}" width="${barW}" height="${tH}" fill="#f59e0b" rx="2" opacity="0.18"/>`;
                    if(tH > 0 && wH <= tH) svgTargets += `<line x1="${x}" y1="${chartH-tH+10}" x2="${x+barW}" y2="${chartH-tH+10}" stroke="#f59e0b" stroke-width="1.5" opacity="0.6"/>`;
                    svgBlue += `<rect x="${x}" y="${chartH-wH+10}" width="${barW}" height="${wH}" fill="#3b82f6" rx="2" opacity="0.55"/>`;
                    if(tH > 0 && wH > tH) svgOverlines += `<line x1="${x}" y1="${chartH-tH+10}" x2="${x+barW}" y2="${chartH-tH+10}" stroke="#ef4444" stroke-width="2" opacity="0.85"/>`;
                    svgLabels += `<text x="${x+barW/2}" y="${chartH+22}" text-anchor="middle" font-size="${barW>16?8:6}" fill="#94a3b8" font-family="monospace">${wkLabel}</text>`;
                    if(w.worked>0) svgLabels += `<text x="${x+barW/2}" y="${chartH-wH+7}" text-anchor="middle" font-size="7" fill="#3b82f6" font-weight="700">${w.worked}</text>`;
                    if(tH > 0) svgLabels += `<text x="${x+barW/2}" y="${chartH-tH-8}" text-anchor="middle" font-size="7.5" fill="#f59e0b" font-weight="600">${Math.round(target)}</text>`;
                });
                const svgBars = svgTargets + svgBlue + svgOverlines + svgLabels;

                const yLabels = [0, 0.25, 0.5, 0.75, 1].map(pct => {
                    const val = Math.round(maxH*pct);
                    const y = chartH - Math.round(chartH*pct) + 10;
                    return `<text x="35" y="${y+4}" text-anchor="end" font-size="9" fill="#94a3b8">${val}</text>
                            <line x1="38" y1="${y}" x2="${totalW}" y2="${y}" stroke="#f1f5f9" stroke-width="1"/>`;
                }).join('');

                const totalWorked = Math.round(weekData.reduce((s,w)=>s+w.worked,0)*10)/10;
                const avgWorked   = weeks.length > 0 ? Math.round(totalWorked/weeks.length*10)/10 : 0;

                body = `
                <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Desde</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisHorasStart=this.value;localStorage.setItem('v40_analisisHoras',JSON.stringify({start:App.uiState.analisisHorasStart,end:App.uiState.analisisHorasEnd}));App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(startISO)}</select></div>
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Hasta</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisHorasEnd=this.value;localStorage.setItem('v40_analisisHoras',JSON.stringify({start:App.uiState.analisisHorasStart,end:App.uiState.analisisHorasEnd}));App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(endISO)}</select></div>
                </div>

                <div style="display:flex;gap:12px;margin-bottom:16px;">
                    ${[['Total trabajadas', totalWorked+'h', '#1e293b'],['Media semanal', avgWorked+'h', '#3b82f6'],['Semanas', weeks.length, '#64748b']].map(([l,v,col])=>`
                    <div style="background:white;border:1px solid var(--border);border-radius:8px;padding:14px 20px;flex:1;">
                        <div style="font-size:0.68rem;color:#94a3b8;font-weight:600;text-transform:uppercase;margin-bottom:4px;">${l}</div>
                        <div style="font-size:1.4rem;font-weight:800;color:${col};">${v}</div>
                    </div>`).join('')}
                </div>

                ${Object.keys(targetByWeek).length > 0 ? `<div style="display:flex;gap:16px;align-items:center;margin-bottom:12px;font-size:0.75rem;color:#64748b;">
                    <span style="display:flex;align-items:center;gap:5px;"><span style="display:inline-block;width:12px;height:12px;background:#3b82f6;border-radius:2px;opacity:0.85;"></span> Horas asignadas</span>
                    <span style="display:flex;align-items:center;gap:5px;"><span style="display:inline-block;width:12px;height:12px;background:#f59e0b;border-radius:2px;opacity:0.25;border-top:2px solid rgba(245,158,11,0.6);"></span> Objetivo por facturación</span>
                </div>` : ''}

                <div style="background:white;border:1px solid var(--border);border-radius:10px;padding:20px;">
                    <svg width="100%" viewBox="0 -20 ${Math.max(totalW, 400)} ${chartH+60}" preserveAspectRatio="xMinYMid meet" style="display:block;">
                        ${yLabels}
                        ${svgBars}
                    </svg>
                </div>`;

            // ─── TAB: HORAS POR STAFF ────────────────────────────────────────
            } else if(tab === 'staffv2') {
                // ─── HORAS POR STAFF (nueva versión, en diseño) ──────────────
                // Comparte el rango con la versión legacy; ordenación propia.
                if(!App.uiState.analisisHorasStaffStart) {
                    try { const saved = JSON.parse(localStorage.getItem('v40_analisisHorasStaff')); if(saved) { App.uiState.analisisHorasStaffStart = saved.start; App.uiState.analisisHorasStaffEnd = saved.end; } } catch(e){}
                }
                if(!App.uiState.analisisHorasStaffStart) {
                    App.uiState.analisisHorasStaffStart = fyStart;
                    App.uiState.analisisHorasStaffEnd   = fyEnd;
                }
                if(App.uiState.analisisHorasStaffStart > App.uiState.analisisHorasStaffEnd) {
                    const temp = App.uiState.analisisHorasStaffStart;
                    App.uiState.analisisHorasStaffStart = App.uiState.analisisHorasStaffEnd;
                    App.uiState.analisisHorasStaffEnd = temp;
                }
                const startISO = App.uiState.analisisHorasStaffStart;
                const endISO   = App.uiState.analisisHorasStaffEnd;

                // Lista de lunes en el rango
                const weeksList = [];
                let curMon = new Date(Utils.getMonday(startISO)+'T12:00:00');
                const endMon = new Date(Utils.getMonday(endISO)+'T12:00:00');
                while(curMon <= endMon) { weeksList.push(curMon.toISOString().slice(0,10)); curMon.setDate(curMon.getDate()+7); }

                const f1 = n => Math.round(n*10)/10;
                const REF_CONTRATO = 37.5;                                  // contrato de referencia de las horas teóricas
                const stdH = parseFloat(App.data.config.stdHours) || 1711;  // horas convenio/año para 37,5h/sem

                // Ventana "año anterior": 12 meses previos al inicio del rango
                const prevStart = (() => { const d = new Date(startISO+'T12:00:00'); d.setFullYear(d.getFullYear()-1); return d.toISOString().slice(0,10); })();
                const monthShortV2 = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                const fmtFestDateV2 = iso => { const dt = new Date(iso+'T12:00:00'); return `${dt.getDate()} ${monthShortV2[dt.getMonth()]} '${iso.slice(2,4)}`; };

                // Festivos del año anterior pendientes de recuperar (mismo criterio que el panel legacy)
                const calcPendPrevYear = (emp) => {
                    const locked = App.data.lockedDays || {};
                    const tracking = emp.festivoTracking || {};
                    const realRs = new Set();
                    Object.keys(App.data.schedule || {}).forEach(iso => {
                        const sid = App.data.schedule[iso]?.[emp.id];
                        const sh = sid ? Utils.getShift(sid) : null;
                        if(sh && sh.fixed && sh.code === 'R') realRs.add(iso);
                    });
                    const holidays = (App.data.storeConfig.holidays || [])
                        .filter(h => h.date >= prevStart && h.date < startISO)
                        .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(emp, h.date));
                    let count = 0; const list = [];
                    holidays.forEach(h => {
                        const tr = tracking[h.date] || {};
                        // Compensado SOLO si su R cae dentro del tramo anterior; si la R está en el rango actual, sigue siendo deuda heredada
                        if(tr.rDate && realRs.has(tr.rDate) && tr.rDate >= prevStart && tr.rDate < startISO) return;
                        const sid = App.data.schedule[h.date]?.[emp.id];
                        const shift = sid ? Utils.getShift(sid) : null;
                        if(!shift) return;
                        let reason = null;
                        if(shift.fixed && shift.code === 'V') reason = 'V (vacaciones no absorben)';
                        else if(shift.fixed && shift.code === 'F') {
                            const wdays = Utils.getWeekDays(Utils.getMonday(h.date));
                            let countL = 0;
                            wdays.forEach(d => { const s2 = App.data.schedule[d]?.[emp.id]; const sh2 = s2 ? Utils.getShift(s2) : null; if(sh2 && sh2.fixed && sh2.code === 'L') countL++; });
                            if(countL < 2) reason = `F (solo ${countL} L en la semana)`;
                        } else if(shift.start && shift.end) reason = 'trabajado';
                        if(reason) { count++; list.push({ date: h.date, reason }); }
                    });
                    return { count, list };
                };

                // Fila por empleado: recuento de días por tipo + horas trabajadas + horas teóricas
                const rows = emps.map(emp => {
                    let workedH=0, workedDays=0;
                    let countL=0, countV=0, countB=0, countF=0, countR=0, countP=0, countOtros=0;
                    const otrosCodes = {};
                    let theoH=0, weeksVig=0; const theoTramos = {};
                    weeksList.forEach(monday => {
                        if(!Utils.empleadoVigenteEnFecha(emp, monday)) return;
                        // Horas teóricas: parte proporcional del convenio para la semana, según el contrato vigente
                        weeksVig++;
                        const cW = Utils.getContrato(emp, monday);
                        theoH += stdH * (cW / REF_CONTRATO) / 52;
                        theoTramos[cW] = (theoTramos[cW] || 0) + 1;
                        const wdays = Utils.getWeekDays(monday);
                        // Libranzas (L) de la semana — para decidir si un festivo se disfrutó (≥2 L sin contar el festivo)
                        let weekL = 0;
                        wdays.forEach(d => { const s = App.data.schedule[d]?.[emp.id]; const sh = s ? Utils.getShift(s) : null; if(sh && sh.fixed && sh.code==='L') weekL++; });
                        wdays.forEach(d => {
                            const sid = App.data.schedule[d]?.[emp.id];
                            if(!sid) return;
                            const sh = Utils.getShift(sid);
                            if(!sh) return;
                            if(sh.fixed) {
                                if(sh.code==='L') countL++;
                                else if(sh.code==='V') countV++;
                                else if(sh.code==='B') countB++;
                                else if(sh.code==='F') { if(weekL >= 2) countF++; } // solo festivos disfrutados; "coincide" (<2 L) no cuenta
                                else if(sh.code==='R') countR++;
                                else if(sh.code==='P') countP++;
                                else { countOtros++; otrosCodes[sh.code]=(otrosCodes[sh.code]||0)+1; }
                            } else if(sh.start && sh.end) {
                                workedDays++;
                                workedH += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                            }
                        });
                    });
                    const pend = calcPendPrevYear(emp);
                    return {
                        emp,
                        contratoActual: Utils.getContrato(emp, endISO),
                        theoH: f1(theoH), theoTramos, weeksVig,
                        workedDays, countL, countV, countB, countF, countR, countP,
                        pendPrev: pend.count, pendPrevList: pend.list,
                        festRecA: countF + countR - pend.count,
                        countOtros, otrosCodes,
                        workedH: f1(workedH),
                        customOrder: emp.customOrder ?? 0
                    };
                });

                // Ordenación propia (por defecto, el orden establecido del equipo)
                const sortKey = App.uiState.analisisStaffV2SortKey || 'custom';
                const sortDir = App.uiState.analisisStaffV2SortDir || 'asc';
                const dirMul = sortDir==='asc' ? 1 : -1;
                rows.sort((a,b) => {
                    if(sortKey==='custom') return ((a.customOrder??0)-(b.customOrder??0))*dirMul;
                    if(sortKey==='nombre') return a.emp.nombre.localeCompare(b.emp.nombre)*dirMul;
                    return ((a[sortKey]||0)-(b[sortKey]||0))*dirMul;
                });

                // Totales
                const T = k => rows.reduce((s,r)=>s+(r[k]||0),0);
                const totWorkedDays=T('workedDays'), totL=T('countL'), totV=T('countV'),
                      totB=T('countB'), totF=T('countF'), totR=T('countR'), totP=T('countP'),
                      totFestRecA=T('festRecA'), totTheo=f1(T('theoH')), totPendPrev=T('pendPrev'),
                      totOtros=T('countOtros'), totWorkedH=f1(T('workedH'));

                // Estilos + helpers de orden
                const thStyle  = `text-align:right;padding:8px 10px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;cursor:pointer;user-select:none;white-space:nowrap;`;
                const thStyleL = thStyle.replace('text-align:right','text-align:left');
                const tdStyle  = `text-align:right;padding:7px 10px;font-family:monospace;font-size:0.82rem;`;
                const tdStyleL = `text-align:left;padding:7px 10px;font-size:0.85rem;`;
                const sortClick = key => `App.uiState.analisisStaffV2SortDir=(App.uiState.analisisStaffV2SortKey==='${key}'&&App.uiState.analisisStaffV2SortDir==='desc')?'asc':'desc';App.uiState.analisisStaffV2SortKey='${key}';App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;
                const sortArrow = key => sortKey===key ? (sortDir==='desc'?' ▼':' ▲') : '';
                const th = (label, key, title) => `<th style="${key==='nombre'?thStyleL:thStyle}" title="${title}" onclick="${sortClick(key)}">${label}${sortArrow(key)}</th>`;

                const headerHTML = `
                    ${th('Empleado','nombre','Nombre del empleado')}
                    ${th('CNTR','contratoActual','Contrato semanal vigente al final del rango')}
                    ${th('Teóricas','theoH','Horas teóricas — parte proporcional del convenio según contrato y semanas vigentes')}
                    ${th('Trab.','workedDays','Días con turno de trabajo (horario real)')}
                    ${th('Libr.','countL','Días librados (L)')}
                    ${th('Vac.','countV','Días de vacaciones (V)')}
                    ${th('Baja','countB','Días de baja médica (B)')}
                    ${th('Fest.','countF','Festivos disfrutados — la semana tuvo 2 libranzas sin contar el festivo (los “coincide” no cuentan)')}
                    ${th('Rec.','countR','Días de recuperación de festivo (R)')}
                    ${th('Ant.','pendPrev','Festivos del tramo anterior no compensados dentro de ese tramo')}
                    ${th('F+R-A','festRecA','Festivos disfrutados + recuperaciones − festivos del tramo anterior sin compensar (A)')}
                    ${th('Perm.','countP','Días de permiso (P)')}
                    ${th('H. trab.','workedH','Horas trabajadas (turnos con horario, descontando descansos)')}
                `;

                const renderRow = r => {
                    const theoTip = r.theoH > 0
                        ? `<div class="diff-tooltip-wrap" style="cursor:help;">${r.theoH}h<div class="diff-tooltip" style="min-width:260px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Horas teóricas (${r.weeksVig} sem vigente)</div>${Object.entries(r.theoTramos).sort((a,b)=>parseFloat(b[0])-parseFloat(a[0])).map(([c,wk])=>{const cN=parseFloat(c);const sub=f1(stdH*(cN/REF_CONTRATO)/52*wk);return `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">${cN}h/sem × ${wk} sem</span><span style="font-weight:600;font-family:monospace;">${sub}h</span></div>`;}).join('')}<div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">= Total teóricas</span><span style="font-weight:700;">${r.theoH}h</span></div><div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Base convenio <strong>${stdH}h/año</strong> para 37,5h/sem · proporcional al contrato y a las semanas con contrato vigente (año = 52 sem). Cada tramo cuenta con sus propias horas.</div></div></div>`
                        : '—';
                    const pendPrevCell = r.pendPrev > 0
                        ? `<div class="diff-tooltip-wrap" style="cursor:help;font-weight:700;color:#ef4444;">${r.pendPrev}<div class="diff-tooltip" style="min-width:230px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:4px;">Festivos del tramo anterior sin compensar</div>${r.pendPrevList.map(p=>`<div style="color:#fca5a5;font-size:0.72rem;line-height:1.7;">${fmtFestDateV2(p.date)} <span style="color:#94a3b8;">— ${p.reason}</span></div>`).join('')}<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Festivos de los 12 meses previos al inicio del rango (semanas cerradas) cuya recuperación no se hizo dentro de ese tramo: su R cae en el rango actual o aún no existe.</div></div></div>`
                        : '<span style="color:#10b981;font-weight:700;">✓</span>';
                    return `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="${tdStyleL}font-weight:600;">${r.emp.nombre}</td>
                    <td style="${tdStyle}color:#64748b;">${r.contratoActual}h</td>
                    <td style="${tdStyle}color:#475569;font-weight:600;">${theoTip}</td>
                    <td style="${tdStyle}font-weight:700;color:#1e293b;">${r.workedDays || '—'}</td>
                    <td style="${tdStyle}color:#16a34a;">${r.countL || '—'}</td>
                    <td style="${tdStyle}color:#a855f7;">${r.countV || '—'}</td>
                    <td style="${tdStyle}color:#ef4444;">${r.countB || '—'}</td>
                    <td style="${tdStyle}color:#d97706;">${r.countF || '—'}</td>
                    <td style="${tdStyle}color:#10b981;">${r.countR || '—'}</td>
                    <td style="${tdStyle}">${pendPrevCell}</td>
                    <td style="${tdStyle}color:${r.festRecA<0?'#ef4444':'#0891b2'};font-weight:600;">${r.festRecA || '—'}</td>
                    <td style="${tdStyle}color:#ec4899;">${r.countP || '—'}</td>
                    <td style="${tdStyle}font-weight:700;color:#1e293b;">${r.workedH}h</td>
                </tr>`;
                };

                // Aviso si aparecen días de otro tipo no contemplados (p.ej. DH)
                const otrosAll = {};
                rows.forEach(r => Object.entries(r.otrosCodes).forEach(([cod,n]) => otrosAll[cod]=(otrosAll[cod]||0)+n));
                const otrosNote = totOtros > 0
                    ? `<div style="margin-top:10px;padding:8px 12px;background:#fef9c3;border:1px solid #fde68a;border-radius:8px;font-size:0.75rem;color:#854d0e;line-height:1.5;">⚠️ Hay <strong>${totOtros}</strong> día${totOtros!==1?'s':''} de otro tipo, sin columna propia todavía: ${Object.entries(otrosAll).map(([cod,n])=>`<strong>${cod}</strong>×${n}`).join(' · ')}. Dime si quieres una columna para ${Object.keys(otrosAll).length>1?'ellos':'él'}.</div>`
                    : '';

                // Botón "Mi orden"
                const customActive = sortKey === 'custom';
                const customBtnStyle = `padding:7px 14px;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;` +
                    (customActive ? 'border:1px solid #1e293b;background:#1e293b;color:white;' : 'border:1px solid var(--border);background:white;color:#475569;');
                const customBtn = `<button onclick="App.uiState.analisisStaffV2SortKey='custom';App.uiState.analisisStaffV2SortDir='asc';App.ui.renderAnalisis(document.querySelector('.main-scroll'));" title="Ordena por el orden establecido del equipo (configurable arrastrando empleados en Plantilla)." style="${customBtnStyle}">☰ Mi orden${customActive?' ▾':''}</button>`;

                const rangeOnchange = field => `App.uiState.analisisHorasStaff${field}=this.value;localStorage.setItem('v40_analisisHorasStaff',JSON.stringify({start:App.uiState.analisisHorasStaffStart,end:App.uiState.analisisHorasStaffEnd}));App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;

                body = `
                <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Desde</div>
                        <select style="${wkSelectStyle}" onchange="${rangeOnchange('Start')}">${buildAllWeekOpts(startISO)}</select></div>
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Hasta</div>
                        <select style="${wkSelectStyle}" onchange="${rangeOnchange('End')}">${buildAllWeekOpts(endISO)}</select></div>
                    <div style="align-self:flex-end;">${customBtn}</div>
                    <div style="margin-left:auto;font-size:0.78rem;color:#64748b;align-self:center;">${weeksList.length} semana${weeksList.length!==1?'s':''} · ${emps.length} empleado${emps.length!==1?'s':''} activo${emps.length!==1?'s':''}</div>
                </div>

                <div style="background:white;border:1px solid var(--border);border-radius:10px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">${headerHTML}</tr></thead>
                        <tbody>${rows.map(renderRow).join('')}
                            <tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;font-weight:800;">
                                <td style="${tdStyleL}font-weight:800;">TOTAL</td>
                                <td style="${tdStyle}">—</td>
                                <td style="${tdStyle}">${totTheo?totTheo+'h':'—'}</td>
                                <td style="${tdStyle}">${totWorkedDays||'—'}</td>
                                <td style="${tdStyle}">${totL||'—'}</td>
                                <td style="${tdStyle}">${totV||'—'}</td>
                                <td style="${tdStyle}">${totB||'—'}</td>
                                <td style="${tdStyle}">${totF||'—'}</td>
                                <td style="${tdStyle}">${totR||'—'}</td>
                                <td style="${tdStyle}">${totPendPrev>0?`<span style="color:#ef4444;">${totPendPrev}</span>`:'<span style="color:#10b981;">✓</span>'}</td>
                                <td style="${tdStyle}">${totFestRecA||'—'}</td>
                                <td style="${tdStyle}">${totP||'—'}</td>
                                <td style="${tdStyle}">${totWorkedH}h</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                ${otrosNote}
                <div style="margin-top:10px;font-size:0.75rem;color:#94a3b8;line-height:1.5;">
                    💡 Versión nueva, en construcción. Recuento de días por tipo dentro del rango (semanas con contrato vigente) y horas reales de trabajo. Clic en cualquier columna para ordenar; “☰ Mi orden” vuelve al orden del equipo.
                </div>`;

            } else if(tab === 'staff') {
                if(!App.uiState.analisisHorasStaffStart) {
                    try { const saved = JSON.parse(localStorage.getItem('v40_analisisHorasStaff')); if(saved) { App.uiState.analisisHorasStaffStart = saved.start; App.uiState.analisisHorasStaffEnd = saved.end; } } catch(e){}
                }
                if(!App.uiState.analisisHorasStaffStart) {
                    App.uiState.analisisHorasStaffStart = fyStart;
                    App.uiState.analisisHorasStaffEnd   = fyEnd;
                }
                if(App.uiState.analisisHorasStaffStart > App.uiState.analisisHorasStaffEnd) {
                    const temp = App.uiState.analisisHorasStaffStart;
                    App.uiState.analisisHorasStaffStart = App.uiState.analisisHorasStaffEnd;
                    App.uiState.analisisHorasStaffEnd = temp;
                }
                const startISO = App.uiState.analisisHorasStaffStart;
                const endISO   = App.uiState.analisisHorasStaffEnd;

                // Generar lista de lunes en el rango
                const weeksList = [];
                let curMon = new Date(Utils.getMonday(startISO)+'T12:00:00');
                const endMon = new Date(Utils.getMonday(endISO)+'T12:00:00');
                while(curMon <= endMon) { weeksList.push(curMon.toISOString().slice(0,10)); curMon.setDate(curMon.getDate()+7); }

                const f1 = n => Math.round(n*10)/10;
                const lastDayOfRange = endISO; // referencia para el contrato actual

                // Festivos del rango — un set para lookup rápido
                const holidayDates = new Set((App.data.storeConfig.holidays || []).map(h => h.date));

                // Helper: obtiene los contratos distintos del empleado dentro del rango
                const getContractsInRange = (emp) => {
                    const trams = (emp.contratos && emp.contratos.length > 0) ? [...emp.contratos] : null;
                    if(!trams) return [{ horas: emp.contrato || 0, desde: startISO, hasta: endISO }];
                    trams.sort((a,b) => (a.desde || '').localeCompare(b.desde || ''));
                    const out = [];
                    trams.forEach((t, idx) => {
                        const tStart = t.desde || '0000-01-01';
                        const next = trams[idx+1];
                        const tEnd = (t.hasta && t.hasta !== '') ? t.hasta : (next ? Utils.addWeeks(next.desde, 0) : '9999-12-31');
                        // Ajustar por extremos del rango
                        if(tStart > endISO) return;
                        if(tEnd < startISO) return;
                        out.push({
                            horas: t.horas,
                            desde: tStart > startISO ? tStart : startISO,
                            hasta: tEnd < endISO ? tEnd : endISO
                        });
                    });
                    return out.length ? out : [{ horas: emp.contrato || 0, desde: startISO, hasta: endISO }];
                };

                const fmtDateShort = iso => { if(!iso || iso==='9999-12-31') return ''; const [y,m,d]=iso.split('-'); return `${d}/${m}/${y.slice(2)}`; };

                // Helpers: festivos pendientes y Rs sobrantes en el rango (solo semanas cerradas)
                // Misma lógica que Balance Semanal pero acotada al rango analizado.
                const calcFestivosPendInRange = (emp) => {
                    const locked = App.data.lockedDays || {};
                    const tracking = emp.festivoTracking || {};
                    const realRs = new Set();
                    Object.keys(App.data.schedule || {}).forEach(iso => {
                        const sid = App.data.schedule[iso]?.[emp.id];
                        const sh = sid ? Utils.getShift(sid) : null;
                        if(sh && sh.fixed && sh.code === 'R') realRs.add(iso);
                    });
                    const holidays = (App.data.storeConfig.holidays || [])
                        .filter(h => h.date >= startISO && h.date <= endISO)
                        .filter(h => locked[h.date] && Utils.empleadoVigenteEnFecha(emp, h.date));
                    let pendientes = 0;
                    const pendList = [];
                    holidays.forEach(h => {
                        const tr = tracking[h.date] || {};
                        if(tr.rDate && realRs.has(tr.rDate)) return; // ya tiene R válida
                        const sid = App.data.schedule[h.date]?.[emp.id];
                        const shift = sid ? Utils.getShift(sid) : null;
                        if(!shift) return;
                        let reason = null;
                        if(shift.fixed && shift.code === 'V') {
                            reason = 'V (vacaciones no absorben)';
                        } else if(shift.fixed && shift.code === 'F') {
                            const wdays = Utils.getWeekDays(Utils.getMonday(h.date));
                            let countL = 0;
                            wdays.forEach(d => {
                                const s2 = App.data.schedule[d]?.[emp.id];
                                const sh2 = s2 ? Utils.getShift(s2) : null;
                                if(sh2 && sh2.fixed && sh2.code === 'L') countL++;
                            });
                            if(countL < 2) reason = `F (solo ${countL} L en la semana)`;
                        } else if(shift.start && shift.end) {
                            reason = 'trabajado';
                        }
                        if(reason) {
                            pendientes++;
                            pendList.push({ date: h.date, name: h.name || h.note || 'Festivo', reason });
                        }
                    });
                    return { pendientes, pendList };
                };

                const calcRsSobrantesInRange = (emp) => {
                    const locked = App.data.lockedDays || {};
                    const tracking = emp.festivoTracking || {};
                    const assignedRDates = new Set(Object.values(tracking).map(t => t.rDate).filter(Boolean));
                    let sobrantes = 0;
                    const sobrantesList = [];
                    Object.keys(App.data.schedule || {}).forEach(iso => {
                        if(iso < startISO || iso > endISO) return;
                        if(!locked[iso]) return;
                        const sid = App.data.schedule[iso]?.[emp.id];
                        const sh = sid ? Utils.getShift(sid) : null;
                        if(sh && sh.fixed && sh.code === 'R' && !assignedRDates.has(iso)) {
                            sobrantes++;
                            sobrantesList.push(iso);
                        }
                    });
                    return { sobrantes, sobrantesList };
                };

                // Calcular fila por empleado
                const rows = emps.map(emp => {
                    let workedH = 0;
                    let workedDays = 0;
                    let countL=0, countF=0, countR=0, countV=0, countB=0, countP=0;
                    let contractWeeklyH = 0; // suma del contrato semanal nominal (totalContrato) en semanas vigentes
                    let festivosCount = 0;   // días que descuentan en columna festivos (F'd festivos + R)
                    let festivosCalCount = 0; // festivos del calendario en el rango con emp vigente (todos)
                    let festivosTrabCount = 0; // festivos del calendario que el emp trabajó (no descuenta directo, su R lo hará)
                    let festivosVCount = 0;  // festivos del calendario que cayeron en V (no descuenta directo, V+R lo cubren)
                    let festivosH = 0;       // horas equivalentes de los festivos+R que descuentan
                    let vacacionesH = 0;     // horas equivalentes de vacaciones REALES (no prorrateadas)
                    let weeksVigentes = 0;
                    let weeksVacaciones = 0;
                    // Desglose por tramo de contrato: { '37.5': { brutoH, vacH, festH, vCount, festCount } }
                    const tramoMap = {};
                    const tramoStats = (cd) => {
                        if(!tramoMap[cd]) tramoMap[cd] = { brutoH: 0, vacH: 0, festH: 0, vCount: 0, festCount: 0 };
                        return tramoMap[cd];
                    };
                    // Horas justificadas por tipo (solo B y P) usando contrato/5 del día.
                    // R no entra: la R compensa trabajo en festivo, los dos se cancelan
                    // (trabajó un día que estaba descontado en festivos + libró otro que sí estaba esperado).
                    let bH=0, pH=0;

                    let cappedTotalRaw = 0; // total raw B+P antes del cap (para tooltip)
                    let cappedTotalH = 0;   // total B+P después del cap (para tooltip)

                    weeksList.forEach(monday => {
                        const wdays = Utils.getWeekDays(monday);
                        if(!Utils.empleadoVigenteEnFecha(emp, monday)) return;
                        weeksVigentes++;
                        const calc = Utils.calcEsperadas(emp, wdays, emp.id);
                        contractWeeklyH += (calc.totalContrato || 0);

                        let vW=0;
                        let workedThisWeek = 0;
                        let bWeekRaw = 0; // horas raw de B esta semana
                        let pWeekRaw = 0; // horas raw de P esta semana
                        let festivosThisWeekH = 0;
                        let vacWeekRaw = 0; // horas raw de V esta semana (sin contar overlaps con festivo)

                        wdays.forEach(d => {
                            // Contrato vigente en este día (puede variar dentro del rango)
                            const cd = Utils.getContrato(emp, d);
                            const dailyRate = cd / 5;
                            // Cada día contribuye contrato_día/7 al bruto semanal del tramo
                            tramoStats(cd).brutoH += cd / 7;

                            const isFestivo = holidayDates.has(d) && Utils.empleadoVigenteEnFecha(emp, d);
                            const sid = App.data.schedule[d]?.[emp.id];
                            const sh = sid ? Utils.getShift(sid) : null;
                            const code = sh && sh.fixed ? sh.code : null;
                            const isWorkedShift = sh && !sh.fixed && sh.start && sh.end;

                            // Festivo del calendario: contar para info (todos)
                            if(isFestivo) {
                                festivosCalCount++;
                                if(code === 'V') festivosVCount++;
                                else if(isWorkedShift) festivosTrabCount++;
                            }

                            // Festivo descuenta SOLO si el día tiene F (o no hay turno = se trata como F).
                            // Si el día tiene V → V descuenta y la recuperación posterior aparece como R.
                            // Si el día tiene shift trabajado → festivo trabajado, la R posterior descontará.
                            // Si el día tiene B/P → la justificada se ocupa.
                            // Si el día tiene R → ese R descontará por su lado (caso raro: R encima de festivo).
                            // Esto evita doble-descuento (festivo + R) en festivos trabajados/V'd.
                            const festCuenta = isFestivo && (code === 'F' || (!sh));
                            if(festCuenta) {
                                festivosCount++;
                                festivosH += dailyRate;
                                festivosThisWeekH += dailyRate;
                                tramoStats(cd).festH += dailyRate;
                                tramoStats(cd).festCount++;
                            }

                            if(!sh) return;
                            if(sh.fixed) {
                                if(sh.code==='L') countL++;
                                else if(sh.code==='F') countF++;
                                else if(sh.code==='V') {
                                    // V SIEMPRE cuenta como V (no la absorbe el festivo).
                                    // Si el día era festivo, la "recuperación" pendiente se reflejará
                                    // como un día R en otra fecha que también descuenta como festivo.
                                    countV++; vW++;
                                    vacWeekRaw += dailyRate;
                                    tramoStats(cd).vacH += dailyRate;
                                    tramoStats(cd).vCount++;
                                }
                                else if(sh.code==='R') {
                                    // R = recuperación de festivo. Cuenta en festivos para que
                                    // el total festivos+R = nº de festivos del calendario.
                                    countR++;
                                    festivosH += dailyRate;
                                    festivosThisWeekH += dailyRate;
                                    tramoStats(cd).festH += dailyRate;
                                    tramoStats(cd).festCount++;
                                }
                                else if(sh.code==='B') { countB++; bWeekRaw += dailyRate; }
                                else if(sh.code==='P') { countP++; pWeekRaw += dailyRate; }
                            } else if(sh.start && sh.end) {
                                const h = Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break);
                                workedH += h;
                                workedThisWeek += h;
                                workedDays++;
                            }
                        });

                        // Cap semanal de vacaciones: V+festivos no puede exceder el contrato semanal
                        // (evita over-descuento si V está marcada en días de descanso)
                        const weekContract = calc.totalContrato || 0;
                        const vFestRaw = vacWeekRaw + festivosThisWeekH;
                        let vacWeekCapped, festivosWeekCapped;
                        if(vFestRaw > weekContract && vFestRaw > 0) {
                            const scale = weekContract / vFestRaw;
                            vacWeekCapped = vacWeekRaw * scale;
                            festivosWeekCapped = festivosThisWeekH * scale;
                            // Reajustar el running festivosH (ya añadimos antes el raw)
                            festivosH -= festivosThisWeekH - festivosWeekCapped;
                        } else {
                            vacWeekCapped = vacWeekRaw;
                            festivosWeekCapped = festivosThisWeekH;
                        }
                        vacacionesH += vacWeekCapped;

                        // Cap semanal: B+P NO puede exceder el contrato semanal − festivos − V de la semana.
                        const weekCap = Math.max(0, weekContract - festivosWeekCapped - vacWeekCapped);
                        const totalWeekRaw = bWeekRaw + pWeekRaw;
                        cappedTotalRaw += totalWeekRaw;
                        if(totalWeekRaw > weekCap && totalWeekRaw > 0) {
                            const scale = weekCap / totalWeekRaw;
                            bH += bWeekRaw * scale;
                            pH += pWeekRaw * scale;
                            cappedTotalH += weekCap;
                        } else {
                            bH += bWeekRaw;
                            pH += pWeekRaw;
                            cappedTotalH += totalWeekRaw;
                        }

                        // Semana de vacaciones = semana sin trabajo y con al menos 1 día V
                        if(workedThisWeek === 0 && vW > 0) weeksVacaciones++;
                    });

                    // Esperadas = contrato − vacaciones REALES (V marcadas en schedule) − festivos
                    // V y F NO entran en Justificadas porque ya están descontadas aquí
                    const esperadasH = Math.max(0, contractWeeklyH - vacacionesH - festivosH);

                    // Justificadas = solo B + P (cada día = contrato/5 de ese día)
                    const justifiedH = bH + pH;

                    // Δ = trabajadas + justificadas − esperadas
                    const dif = workedH + justifiedH - esperadasH;
                    const contratoActual = Utils.getContrato(emp, lastDayOfRange);
                    // Festivos pendientes y Rs sobrantes (solo semanas cerradas del rango)
                    const { pendientes: pdtesCount, pendList: pdtesList } = calcFestivosPendInRange(emp);
                    const { sobrantes: sobrantesCount, sobrantesList } = calcRsSobrantesInRange(emp);
                    const contractsInRange = getContractsInRange(emp);
                    const tieneVariosContratos = contractsInRange.length > 1
                        || (contractsInRange.length === 1 && Math.abs((contractsInRange[0].horas||0) - contratoActual) > 0.01);
                    // Media efectiva: workedH × 5 / workedDays
                    // (rate medio por turno extrapolado a 5 días = se acerca al contrato cuando la persona
                    //  trabaja sus turnos típicos. No se ve afectada por festivos/vacaciones porque solo
                    //  divide por días con turno real.)
                    const promedio = workedDays > 0 ? (workedH * 5) / workedDays : 0;
                    return {
                        emp,
                        workedH: f1(workedH),
                        justifiedH: f1(justifiedH),
                        esperadasH: f1(esperadasH),
                        contractWeeklyH: f1(contractWeeklyH),
                        vacacionesH: f1(vacacionesH),
                        festivosH: f1(festivosH),
                        festivosCount,
                        festivosCalCount,
                        festivosTrabCount,
                        festivosVCount,
                        dif: f1(dif),
                        workedDays,
                        countL, countF, countR, countV, countB, countP,
                        bH: f1(bH), pH: f1(pH),
                        cappedTotalRaw: f1(cappedTotalRaw),
                        cappedTotalH: f1(cappedTotalH),
                        wasCapped: cappedTotalRaw > cappedTotalH + 0.05,
                        contratoActual,
                        contractsInRange,
                        tieneVariosContratos,
                        tramoMap,
                        pdtesCount,
                        pdtesList,
                        sobrantesCount,
                        sobrantesList,
                        weeksVigentes,
                        weeksVacaciones,
                        promedio: f1(promedio),
                        customOrder: emp.customOrder ?? 0
                    };
                });

                // Ordenación
                const sortKey = App.uiState.analisisHorasStaffSortKey || 'custom';
                const sortDir = App.uiState.analisisHorasStaffSortDir || 'asc';
                const dirMul = sortDir === 'asc' ? 1 : -1;
                rows.sort((a,b) => {
                    if(sortKey === 'custom')  return ((a.customOrder ?? 0) - (b.customOrder ?? 0)) * dirMul;
                    if(sortKey === 'nombre')  return a.emp.nombre.localeCompare(b.emp.nombre) * dirMul;
                    return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dirMul;
                });

                // Totales
                const totalWorked       = f1(rows.reduce((s,r)=>s+r.workedH,0));
                const totalJustified    = f1(rows.reduce((s,r)=>s+r.justifiedH,0));
                const totalEsperadas    = f1(rows.reduce((s,r)=>s+r.esperadasH,0));
                const totalContractWeek = f1(rows.reduce((s,r)=>s+r.contractWeeklyH,0));
                const totalVacaciones   = f1(rows.reduce((s,r)=>s+r.vacacionesH,0));
                const totalFestivos     = f1(rows.reduce((s,r)=>s+r.festivosH,0));
                const totalPdtes        = rows.reduce((s,r)=>s+r.pdtesCount,0);
                const totalSobrantes    = rows.reduce((s,r)=>s+r.sobrantesCount,0);
                const totalDif          = f1(rows.reduce((s,r)=>s+r.dif,0));
                const totalDays         = rows.reduce((s,r)=>s+r.workedDays,0);

                const sortClick = key => `App.uiState.analisisHorasStaffSortDir=(App.uiState.analisisHorasStaffSortKey==='${key}'&&App.uiState.analisisHorasStaffSortDir==='desc')?'asc':'desc';App.uiState.analisisHorasStaffSortKey='${key}';App.ui.renderAnalisis(document.querySelector('.main-scroll'));`;
                const sortArrow = key => sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
                const thStyle = `text-align:right;padding:8px 10px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;cursor:pointer;user-select:none;white-space:nowrap;`;
                const thStyleL = thStyle.replace('text-align:right','text-align:left');
                const tdStyle = `text-align:right;padding:7px 10px;font-family:monospace;font-size:0.82rem;`;
                const tdStyleL = `text-align:left;padding:7px 10px;font-size:0.85rem;`;

                // Tooltip helper para cabeceras y celdas
                const tipHeader = (label, key, body) => `<th style="${key==='nombre'?thStyleL:thStyle}" onclick="${sortClick(key)}">
                    <span class="diff-tooltip-wrap" style="cursor:help;">${label}${sortArrow(key)}<div class="diff-tooltip" style="min-width:230px;white-space:normal;line-height:1.55;text-align:left;font-weight:400;text-transform:none;">${body}</div></span>
                </th>`;

                // Cabeceras con tooltip — orden: nombre · cntr · días · bruto · -vac · -fest · esperadas · trab · just · Δ · media
                const headerHTML = `
                    ${tipHeader('Empleado', 'nombre', '<strong>Empleado</strong> — clic ordena por nombre. Botón "☰ Mi orden" reordena por el orden personalizado del equipo.')}
                    ${tipHeader('Cntr', 'contratoActual', '<strong>Contrato semanal</strong> vigente al final del rango. Si la persona ha tenido cambios de contrato durante el rango, aparece un asterisco — pasa el cursor sobre la celda para ver el historial. Los cálculos respetan cada tramo del contrato día a día.')}
                    ${tipHeader('Días', 'workedDays', '<strong>Días con turno real</strong> — días con un turno con horario asignado (no L/F/V/B/P/R). Pasa el cursor sobre la celda para ver el desglose por tipo.')}
                    ${tipHeader('Bruto', 'contractWeeklyH', '<strong>Horas brutas</strong> = contrato semanal × semanas vigente. Es el total que cobra antes de descontar vacaciones y festivos. Para contratos cambiantes se calcula día a día.')}
                    ${tipHeader('−Vac', 'vacacionesH', '<strong>Horas descontadas por vacaciones reales</strong> — días V marcados en el calendario × (contrato/5) del día. V siempre cuenta como V, incluso si el día era festivo (la recuperación posterior aparecerá como R).')}
                    ${tipHeader('−Fest', 'festivosH', '<strong>Horas descontadas por festivos + recuperaciones</strong> — (festivos del calendario que NO caen en V) + (días R marcados) × (contrato/5). Total festivos+R debería igualar el nº de festivos del calendario en el rango. Cuando un festivo cae en V, no cuenta aquí: V lo descuenta y la R posterior lo recoge.')}
                    ${tipHeader('Pdtes', 'pdtesCount', '<strong>Festivos pendientes de recuperar</strong> en semanas cerradas del rango. Misma lógica que Balance Semanal: festivos que el empleado ha trabajado, ha tenido en V (vacaciones no absorben), o tiene F sin las 2 L de la semana, y aún no tienen una R asignada. <span style="color:#ef4444;">Rojo</span>: pendientes. <span style="color:#3b82f6;">Azul</span>: Rs sobrantes (sin festivo asociado). <span style="color:#10b981;">Verde ✓</span>: cuadrado.')}
                    ${tipHeader('Esperadas', 'esperadasH', '<strong>Horas esperadas netas</strong> = Bruto − Vacaciones − Festivos. Es lo que la persona "debería trabajar realmente" en el rango.')}
                    ${tipHeader('Trabajadas', 'workedH', '<strong>Horas trabajadas</strong> — suma de horas reales asignadas (turnos con horario, descontando descansos). No incluye horas justificadas.')}
                    ${tipHeader('Justif.', 'justifiedH', '<strong>Horas justificadas</strong> — solo <strong>B (baja médica)</strong> y <strong>P (permiso)</strong>. Cada día = contrato/5. <strong>Cap por semana</strong>: el total B+P no puede superar el contrato semanal menos festivos − vacaciones de esa semana — así, días B/P marcados en libranzas no inflan las justificadas. V, F y R no aparecen aquí: V y F ya están en Esperadas; R cancela un festivo trabajado.')}
                    ${tipHeader('Δ', 'dif', '<strong>Desviación</strong> = Trabajadas + Justif. (B/P) − Esperadas. <span style="color:#10b981;">Verde</span>: dentro de ±0,5h. <span style="color:#f59e0b;">Ámbar</span>: horas de más. <span style="color:#3b82f6;">Azul</span>: horas de menos.')}
                    ${tipHeader('Media', 'promedio', '<strong>Media de horas por semana equivalente</strong> = Trabajadas × 5 ÷ Días con turno. Extrapola el ritmo real de los turnos a una semana de 5 días. <strong>No se ve afectada por festivos ni vacaciones</strong> porque solo divide por días realmente trabajados. Si la persona trabaja a su ritmo de contrato, la media se acercará al contrato semanal.')}
                `;

                const renderRow = r => {
                    const difColor = r.dif > 0.5 ? '#f59e0b' : r.dif < -0.5 ? '#3b82f6' : '#10b981';
                    const difSign = r.dif > 0 ? '+' : '';
                    const breakdown = `${r.countL} L · ${r.countF} F · ${r.countR} R · ${r.countV} V · ${r.countB} B · ${r.countP} P`;
                    const breakdownTip = `<div class="diff-tooltip-wrap" style="cursor:help;">${r.workedDays}<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.6;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Desglose</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">Días con turno</span><span style="font-weight:600;">${r.workedDays}</span></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">Días tipo</span><span style="font-weight:600;font-size:0.7rem;">${breakdown}</span></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">Semanas vigente</span><span style="font-weight:600;">${r.weeksVigentes}</span></div></div></div>`;

                    // Tooltip de Justificadas: solo B+P, cada día = contrato/5, con cap semanal
                    let justifTip;
                    if(r.justifiedH > 0 || r.countB > 0 || r.countP > 0) {
                        const fmt = (count, hours, label, color) => `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:${color};">${label}</span><span style="font-weight:600;font-family:monospace;">${count} día${count!==1?'s':''} = ${hours}h</span></div>`;
                        const lines = [];
                        if(r.countB > 0) lines.push(fmt(r.countB, r.bH, '🔴 Baja médica (B)', '#fca5a5'));
                        if(r.countP > 0) lines.push(fmt(r.countP, r.pH, '🟪 Permiso (P)', '#f9a8d4'));
                        const sumLines = `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">Total justificadas</span><span style="font-weight:700;">${r.justifiedH}h</span></div>`;
                        const capLine = r.wasCapped
                            ? `<div style="margin-top:5px;padding:5px 8px;background:rgba(245,158,11,0.18);border-radius:4px;font-size:10px;color:#fde68a;line-height:1.45;">⚠️ Cap aplicado: el raw era ${r.cappedTotalRaw}h pero se ha limitado a ${r.cappedTotalH}h (contrato semanal − festivos por semana). Se evita contar B/P marcados en libranzas (sábado/domingo).</div>`
                            : '';
                        const note = `<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Cada día = contrato/5 de ese día. <strong>V y F</strong> ya están descontadas de Esperadas. <strong>R</strong> tampoco se cuenta: cancela un festivo trabajado.</div>`;
                        const display = r.justifiedH > 0 ? `+${r.justifiedH}h` : '—';
                        justifTip = `<div class="diff-tooltip-wrap" style="cursor:help;">${display}<div class="diff-tooltip" style="min-width:300px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Horas justificadas (B/P)</div>${lines.join('')}${sumLines}${capLine}${note}</div></div>`;
                    } else {
                        justifTip = '—';
                    }

                    // Tooltip de Esperadas: contrato − vacaciones reales (V del schedule) − festivos
                    // Si hay varios tramos de contrato, desglosamos por tramo
                    const tramoKeys = Object.keys(r.tramoMap || {})
                        .map(k => parseFloat(k))
                        .filter(k => !isNaN(k) && (r.tramoMap[k]?.brutoH || 0) > 0.05)
                        .sort((a,b) => b - a); // de mayor a menor contrato
                    const espLines = [];

                    if(tramoKeys.length > 1) {
                        // Múltiples tramos: desglose
                        espLines.push(`<div style="font-size:10px;color:#94a3b8;margin-bottom:4px;">Por tramo de contrato:</div>`);
                        tramoKeys.forEach(k => {
                            const t = r.tramoMap[k];
                            const tramoNeto = (t.brutoH || 0) - (t.vacH || 0) - (t.festH || 0);
                            espLines.push(`<div style="margin-top:5px;padding:5px 7px;background:rgba(255,255,255,0.04);border-radius:4px;"><div style="display:flex;justify-content:space-between;gap:16px;font-weight:700;color:#e2e8f0;font-size:10.5px;"><span>Tramo ${k}h/sem</span><span>= ${f1(tramoNeto)}h</span></div><div style="display:flex;justify-content:space-between;gap:14px;margin-top:2px;font-size:10px;"><span style="color:#94a3b8;">Bruto</span><span style="font-family:monospace;">${f1(t.brutoH)}h</span></div>${t.vCount > 0 ? `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:1px;font-size:10px;"><span style="color:#c084fc;">− Vac (${t.vCount}d)</span><span style="font-family:monospace;">−${f1(t.vacH)}h</span></div>` : ''}${t.festCount > 0 ? `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:1px;font-size:10px;"><span style="color:#fde68a;">− Fest (${t.festCount}d)</span><span style="font-family:monospace;">−${f1(t.festH)}h</span></div>` : ''}</div>`);
                        });
                    } else {
                        // Un solo tramo: formato simple
                        espLines.push(`<div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">Contrato semanal × ${r.weeksVigentes} sem vigente</span><span style="font-weight:700;">${r.contractWeeklyH}h</span></div>`);
                        if(r.countV > 0) {
                            espLines.push(`<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#c084fc;">− Vacaciones (${r.countV} día${r.countV!==1?'s':''} V × contrato/5)</span><span style="font-weight:600;font-family:monospace;">−${r.vacacionesH}h</span></div>`);
                        } else {
                            espLines.push(`<div style="margin-top:3px;font-size:10px;color:#94a3b8;">Sin días V marcados — no se descuentan vacaciones.</div>`);
                        }
                        if(r.festivosCount > 0) {
                            espLines.push(`<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#fde68a;">− Festivos (${r.festivosCount} día${r.festivosCount!==1?'s':''} × contrato/5)</span><span style="font-weight:600;font-family:monospace;">−${r.festivosH}h</span></div>`);
                        } else {
                            espLines.push(`<div style="margin-top:4px;font-size:10px;color:#94a3b8;">Sin festivos en el rango.</div>`);
                        }
                    }
                    const espTotal = `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">= Esperadas</span><span style="font-weight:700;">${r.esperadasH}h</span></div>`;
                    const espNote = `<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Vacaciones reales del calendario y festivos ya están descontados aquí; por eso <strong>no</strong> aparecen en Justif. Si una persona no marca V (p.ej. baja larga), no se descuentan vacaciones — su esperada será mayor.</div>`;
                    const espTip = `<div class="diff-tooltip-wrap" style="cursor:help;">${r.esperadasH}h<div class="diff-tooltip" style="min-width:300px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Cálculo de horas esperadas</div>${espLines.join('')}${espTotal}${espNote}</div></div>`;

                    // Tooltip Media: workedH × 5 ÷ workedDays
                    const mediaTip = r.workedDays > 0
                        ? `<div class="diff-tooltip-wrap" style="cursor:help;">${r.promedio}h<div class="diff-tooltip" style="min-width:240px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Media por semana equivalente</div><div style="display:flex;justify-content:space-between;gap:16px;"><span style="color:#94a3b8;">Trabajadas</span><span style="font-weight:700;">${r.workedH}h</span></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">÷ Días con turno</span><span style="font-weight:600;">${r.workedDays}</span></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">× 5 días/semana</span><span style="font-weight:600;">${f1(r.workedH/r.workedDays)}h × 5</span></div><div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">= Media equivalente</span><span style="font-weight:700;">${r.promedio}h</span></div><div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Extrapolación a semana de 5 días al ritmo real de los turnos. No baja por festivos ni vacaciones.</div></div></div>`
                        : '—';

                    // Tooltip Contrato: si tiene varios tramos en el rango, mostrarlos
                    let contratoCell;
                    if(r.tieneVariosContratos && r.contractsInRange.length > 0) {
                        const lines = r.contractsInRange.map(c => {
                            const desde = fmtDateShort(c.desde);
                            const hasta = fmtDateShort(c.hasta);
                            const rangoStr = (desde === '' && hasta === '') ? '' : `${desde} → ${hasta || 'fin'}`;
                            return `<div style="display:flex;justify-content:space-between;gap:16px;margin-top:3px;"><span style="color:#94a3b8;">${rangoStr}</span><span style="font-weight:700;font-family:monospace;">${c.horas}h</span></div>`;
                        }).join('');
                        contratoCell = `<div class="diff-tooltip-wrap" style="cursor:help;">${r.contratoActual}h<sup style="color:#f59e0b;font-size:0.6rem;margin-left:1px;">⚡</sup><div class="diff-tooltip" style="min-width:240px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Contratos en el rango</div>${lines}<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Los cálculos respetan cada tramo día a día. La columna muestra el contrato vigente al final del rango.</div></div></div>`;
                    } else {
                        contratoCell = `${r.contratoActual}h`;
                    }

                    // Tooltip celda −Vac: cuenta días V y desglose por tramo
                    let vacCellTip;
                    if(r.vacacionesH > 0) {
                        const vacTramoLines = tramoKeys
                            .filter(k => (r.tramoMap[k]?.vCount || 0) > 0)
                            .map(k => {
                                const t = r.tramoMap[k];
                                return `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:2px;"><span style="color:#94a3b8;">Tramo ${k}h/sem</span><span style="font-family:monospace;font-weight:600;">${t.vCount}d × ${f1(k/5)}h = ${f1(t.vacH)}h</span></div>`;
                            }).join('');
                        const vacNote = `<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Cuenta los días V realmente marcados en el calendario. Si una persona tiene "31 días de vacaciones" pero solo marca los días laborables (no fines de semana), countV ≈ 22-23 días. Si un día V coincide con un festivo, cuenta como festivo (no doble-descuento).</div>`;
                        vacCellTip = `<div class="diff-tooltip-wrap" style="cursor:help;">−${r.vacacionesH}h<div class="diff-tooltip" style="min-width:240px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Vacaciones reales (${r.countV} día${r.countV!==1?'s':''} V)</div>${vacTramoLines || `<div style="color:#94a3b8;font-size:10px;">Sin desglose por tramo.</div>`}<div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">Total descontado</span><span style="font-weight:700;">−${r.vacacionesH}h</span></div>${vacNote}</div></div>`;
                    } else {
                        vacCellTip = '—';
                    }

                    // Tooltip celda −Fest: composición clara entre festivos del calendario y R
                    let festCellTip;
                    if(r.festivosH > 0) {
                        const festTramoLines = tramoKeys
                            .filter(k => (r.tramoMap[k]?.festCount || 0) > 0)
                            .map(k => {
                                const t = r.tramoMap[k];
                                return `<div style="display:flex;justify-content:space-between;gap:14px;margin-top:2px;"><span style="color:#94a3b8;">Tramo ${k}h/sem</span><span style="font-family:monospace;font-weight:600;">${t.festCount}d × ${f1(k/5)}h = ${f1(t.festH)}h</span></div>`;
                            }).join('');
                        const festFCount = r.festivosCount - r.countR; // festivos con F que descontaron directo
                        const calLine = r.festivosCalCount > 0
                            ? `<div style="margin-top:5px;font-size:10px;color:#94a3b8;line-height:1.5;">Festivos del calendario (rango vigente): <strong>${r.festivosCalCount}</strong>${r.festivosTrabCount > 0 ? ` · trabajados: ${r.festivosTrabCount}` : ''}${r.festivosVCount > 0 ? ` · cayeron en V: ${r.festivosVCount}` : ''}</div>`
                            : '';
                        const composicionLine = `<div style="margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.1);font-size:10px;"><div style="color:#94a3b8;margin-bottom:3px;">Días que descuentan aquí:</div><div style="display:flex;justify-content:space-between;gap:14px;"><span style="color:#fde68a;">  • Festivos con F</span><span style="font-weight:600;">${festFCount}</span></div><div style="display:flex;justify-content:space-between;gap:14px;margin-top:1px;"><span style="color:#86efac;">  • Recuperaciones (R)</span><span style="font-weight:600;">${r.countR}</span></div></div>`;
                        const festNote = `<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Solo descuenta el festivo si el día está marcado <strong>F</strong> (sin turno). Si el festivo se trabajó o cayó en V, descuenta la <strong>R</strong> posterior. Las R del año anterior también descuentan aquí (representan días libres tomados este año).</div>`;
                        festCellTip = `<div class="diff-tooltip-wrap" style="cursor:help;">−${r.festivosH}h<div class="diff-tooltip" style="min-width:280px;white-space:normal;line-height:1.55;text-align:left;"><div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:6px;">Festivos descontados (${r.festivosCount} día${r.festivosCount!==1?'s':''})</div>${festTramoLines || `<div style="color:#94a3b8;font-size:10px;">Sin desglose por tramo.</div>`}${composicionLine}${calLine}<div style="display:flex;justify-content:space-between;gap:16px;margin-top:5px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.15);"><span style="color:#94a3b8;">Total descontado</span><span style="font-weight:700;">−${r.festivosH}h</span></div>${festNote}</div></div>`;
                    } else {
                        festCellTip = '—';
                    }

                    // Celda Pdtes: mismo código de color que Balance Semanal
                    const monthShort = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
                    const fmtFestDate = iso => { const dt = new Date(iso+'T12:00:00'); return `${dt.getDate()} ${monthShort[dt.getMonth()]}`; };
                    let pdtesCell;
                    if(r.pdtesCount > 0) {
                        const pdLines = r.pdtesList.map(p => `<div style="color:#fca5a5;font-size:0.72rem;line-height:1.7;">${fmtFestDate(p.date)} <span style="color:#94a3b8;">— ${p.reason}</span></div>`).join('');
                        const pdTip = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:4px;">Festivos pendientes de recuperar</div>${pdLines}<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Equivalente: ${f1(r.pdtesCount * 7.5)}h aprox. de exceso esperable en Δ.</div>`;
                        pdtesCell = `<span class="diff-tooltip-wrap" style="cursor:help;font-weight:700;color:#ef4444;">${r.pdtesCount}<div class="diff-tooltip" style="min-width:230px;white-space:normal;line-height:1.55;text-align:left;">${pdTip}</div></span>`;
                    } else if(r.sobrantesCount > 0) {
                        const sbLines = r.sobrantesList.map(iso => `<div style="color:#93c5fd;font-size:0.72rem;line-height:1.7;">${fmtFestDate(iso)}</div>`).join('');
                        const sbTip = `<div style="font-weight:700;color:#e2e8f0;border-bottom:1px solid rgba(255,255,255,0.15);padding-bottom:5px;margin-bottom:4px;">Recuperaciones sobrantes</div>${sbLines}<div style="margin-top:6px;font-size:9.5px;color:#94a3b8;line-height:1.45;">Días R sin festivo asociado en el tracking.</div>`;
                        pdtesCell = `<span class="diff-tooltip-wrap" style="cursor:help;font-weight:700;color:#3b82f6;">${r.sobrantesCount}<div class="diff-tooltip" style="min-width:200px;white-space:normal;line-height:1.55;text-align:left;">${sbTip}</div></span>`;
                    } else {
                        pdtesCell = `<span style="color:#10b981;font-weight:700;">✓</span>`;
                    }

                    return `<tr style="border-bottom:1px solid #f1f5f9;">
                        <td style="${tdStyleL}font-weight:600;">${r.emp.nombre}</td>
                        <td style="${tdStyle}color:#64748b;">${contratoCell}</td>
                        <td style="${tdStyle}">${breakdownTip}</td>
                        <td style="${tdStyle}color:#475569;">${r.contractWeeklyH}h</td>
                        <td style="${tdStyle}color:#c084fc;">${vacCellTip}</td>
                        <td style="${tdStyle}color:#fbbf24;">${festCellTip}</td>
                        <td style="${tdStyle}">${pdtesCell}</td>
                        <td style="${tdStyle}color:#64748b;font-weight:600;">${espTip}</td>
                        <td style="${tdStyle}font-weight:700;color:#1e293b;">${r.workedH}h</td>
                        <td style="${tdStyle}color:#a78bfa;">${justifTip}</td>
                        <td style="${tdStyle}font-weight:700;color:${difColor};">${difSign}${r.dif}h</td>
                        <td style="${tdStyle}color:#3b82f6;">${mediaTip}</td>
                    </tr>`;
                };

                // Botón "Mi orden"
                const customActive = sortKey === 'custom';
                const customBtnStyle = `padding:7px 14px;border-radius:6px;font-size:0.8rem;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;gap:6px;transition:all 0.15s;` +
                    (customActive
                        ? 'border:1px solid #1e293b;background:#1e293b;color:white;'
                        : 'border:1px solid var(--border);background:white;color:#475569;');
                const customBtnTip = customActive
                    ? 'Ordenado por el orden establecido del equipo. Clic en cualquier columna para reordenar por ese campo.'
                    : 'Restablece la ordenación al orden establecido del equipo (configurable arrastrando empleados en Plantilla).';
                const customBtn = `<button onclick="App.uiState.analisisHorasStaffSortKey='custom';App.uiState.analisisHorasStaffSortDir='asc';App.ui.renderAnalisis(document.querySelector('.main-scroll'));"
                    title="${customBtnTip}" style="${customBtnStyle}">☰ Mi orden${customActive ? ' ▾' : ''}</button>`;

                body = `
                <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:16px;flex-wrap:wrap;">
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Desde</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisHorasStaffStart=this.value;localStorage.setItem('v40_analisisHorasStaff',JSON.stringify({start:App.uiState.analisisHorasStaffStart,end:App.uiState.analisisHorasStaffEnd}));App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(startISO)}</select></div>
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Hasta</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisHorasStaffEnd=this.value;localStorage.setItem('v40_analisisHorasStaff',JSON.stringify({start:App.uiState.analisisHorasStaffStart,end:App.uiState.analisisHorasStaffEnd}));App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(endISO)}</select></div>
                    <div style="align-self:flex-end;">${customBtn}</div>
                    <div style="margin-left:auto;font-size:0.78rem;color:#64748b;align-self:center;">${weeksList.length} semana${weeksList.length!==1?'s':''} · ${emps.length} empleado${emps.length!==1?'s':''} activo${emps.length!==1?'s':''}</div>
                </div>

                <div style="background:white;border:1px solid var(--border);border-radius:10px;">
                    <table style="width:100%;border-collapse:collapse;">
                        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                            ${headerHTML}
                        </tr></thead>
                        <tbody>${rows.map(renderRow).join('')}
                            <tr style="background:#f1f5f9;border-top:2px solid #cbd5e1;font-weight:800;">
                                <td style="${tdStyleL}font-weight:800;">TOTAL</td>
                                <td style="${tdStyle}">—</td>
                                <td style="${tdStyle}">${totalDays}</td>
                                <td style="${tdStyle}">${totalContractWeek}h</td>
                                <td style="${tdStyle}color:#c084fc;">${totalVacaciones > 0 ? '−'+totalVacaciones+'h' : '—'}</td>
                                <td style="${tdStyle}color:#fbbf24;">${totalFestivos > 0 ? '−'+totalFestivos+'h' : '—'}</td>
                                <td style="${tdStyle}">${totalPdtes > 0 ? `<span style="color:#ef4444;">${totalPdtes}</span>` : (totalSobrantes > 0 ? `<span style="color:#3b82f6;">${totalSobrantes}</span>` : '<span style="color:#10b981;">✓</span>')}</td>
                                <td style="${tdStyle}">${totalEsperadas}h</td>
                                <td style="${tdStyle}">${totalWorked}h</td>
                                <td style="${tdStyle}">${totalJustified > 0 ? '+'+totalJustified+'h' : '—'}</td>
                                <td style="${tdStyle}color:${totalDif > 0.5 ? '#f59e0b' : totalDif < -0.5 ? '#3b82f6' : '#10b981'};">${totalDif > 0 ? '+' : ''}${totalDif}h</td>
                                <td style="${tdStyle}">—</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div style="margin-top:10px;font-size:0.75rem;color:#94a3b8;line-height:1.5;">
                    💡 <strong>Bruto</strong> = contrato × semanas vigente. <strong>Esperadas</strong> = Bruto − Vacaciones (días V reales, sin absorber festivos) − Festivos (festivos no en V + recuperaciones R). <strong>Justif.</strong> = B + P (capadas por semana, V/F/R no entran). <strong>Δ</strong> = Trabajadas + Justif. − Esperadas. <strong>Media</strong> = Trabajadas × 5 ÷ Días con turno. Para contratos cambiantes se usa el contrato vigente día a día — el tooltip de Cntr (con ⚡) muestra el historial. Pasa el cursor sobre cualquier título o celda con valor para ver el desglose.
                </div>`;

            // ─── TAB 3: TURNOS MÁS USADOS ────────────────────────────────────
            } else if(tab === 'ranking') {
                if(!App.uiState.analisisRankStart) {
                    App.uiState.analisisRankStart = fyStart;
                    App.uiState.analisisRankEnd   = fyEnd;
                }
                if(App.uiState.analisisRankStart > App.uiState.analisisRankEnd) {
                    const temp = App.uiState.analisisRankStart;
                    App.uiState.analisisRankStart = App.uiState.analisisRankEnd;
                    App.uiState.analisisRankEnd = temp;
                }
                const startISO = App.uiState.analisisRankStart;
                const endISO   = App.uiState.analisisRankEnd;

                const weeks = [];
                let cur2 = new Date(Utils.getMonday(startISO)+'T00:00:00');
                const endD2 = new Date(Utils.getMonday(endISO)+'T00:00:00');
                while(cur2<=endD2){ weeks.push(cur2.toISOString().slice(0,10)); cur2.setDate(cur2.getDate()+7); }

                const codeCounts = {}; let grandTotal = 0;
                weeks.forEach(monday => {
                    Utils.getWeekDays(monday).forEach(d => {
                        const daySched = App.data.schedule[d] || {};
                        Object.entries(daySched).forEach(([,sid]) => {
                            const sh = Utils.getShift(sid);
                            if(!sh || !sh.start || !sh.end) return;
                            if(sh.fixed) return;

                            if(Utils.isCustomShift(sid)) {
                                const key = `${sh.start}|${sh.end}|${sh.breakStart||''}|${sh.breakEnd||''}`;
                                const label = sh.breakStart && sh.breakEnd
                                    ? `${sh.start}–${sh.end}`
                                    : `${sh.start}–${sh.end}`;
                                if(!codeCounts[key]) codeCounts[key] = { code: label, count:0, hours:0, color:'#9ca3af', desc:'Turno personalizado', isCustom:true, customKey:key, shiftDef: sh };
                                codeCounts[key].count++;
                                codeCounts[key].hours += Utils.calcHours(sh.start,sh.end,sh.breakStart,sh.breakEnd);
                            } else {
                                if(!sh.code) return;
                                const code = sh.code;
                                if(!codeCounts[code]) codeCounts[code] = { code, count:0, hours:0, color: sh.color||'#94a3b8', desc: sh.desc||'', isCustom:false, shiftDef: sh };
                                codeCounts[code].count++;
                                codeCounts[code].hours += Utils.calcHours(sh.start,sh.end,sh.breakStart,sh.breakEnd);
                            }
                            grandTotal++;
                        });
                    });
                });

                const ranked = Object.values(codeCounts).sort((a,b)=>b.count-a.count).slice(0, 15);
                const maxCount = ranked[0]?.count || 1;

                body = `
                <div style="display:flex;gap:12px;align-items:flex-end;margin-bottom:20px;flex-wrap:wrap;">
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Desde</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisRankStart=this.value;App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(startISO)}</select></div>
                    <div><div style="font-size:0.68rem;font-weight:700;color:#94a3b8;text-transform:uppercase;margin-bottom:4px;">Hasta</div>
                        <select style="${wkSelectStyle}" onchange="App.uiState.analisisRankEnd=this.value;App.ui.renderAnalisis(document.querySelector('.main-scroll'));">${buildAllWeekOpts(endISO)}</select></div>
                    <div style="font-size:0.75rem;color:#94a3b8;padding-bottom:8px;">${grandTotal} asignaciones · ${weeks.length} semanas</div>
                </div>
                ${ranked.length === 0
                    ? `<div style="background:white;border:1px solid var(--border);border-radius:10px;padding:40px;text-align:center;color:#94a3b8;">Sin datos en este rango</div>`
                    : `<div style="background:white;border:1px solid var(--border);border-radius:10px;overflow:hidden;">
                        ${ranked.map((r,i)=>{
                            const pct = Math.round(r.count/grandTotal*100);
                            const barPct = Math.round(r.count/maxCount*100);
                            const avgH = r.count > 0 ? Math.round(r.hours/r.count*10)/10 : 0;
                            const shiftDef = r.isCustom ? r.shiftDef : App.data.shiftDefs.find(s => s.code === r.code);
                            const hoursLabel = shiftDef
                                ? (shiftDef.breakStart && shiftDef.breakEnd
                                    ? `<div>${shiftDef.start}–${shiftDef.end}</div><div style="color:#94a3b8;">(${shiftDef.breakStart}–${shiftDef.breakEnd})</div>`
                                    : `<div>${shiftDef.start}–${shiftDef.end}</div>`)
                                : '';
                            const badgeExtra = r.isCustom ? `border-style:dashed;` : '';
                            return `<div style="display:flex;align-items:center;gap:12px;padding:12px 18px;border-bottom:1px solid #f1f5f9;${i===0?'background:#fafafa':''}">
                                <div style="width:22px;text-align:center;font-size:0.75rem;font-weight:700;color:#94a3b8;flex-shrink:0;">${i+1}</div>
                                <div style="background:${r.color}22;color:${r.color};border:1px solid ${r.color}44;${badgeExtra}border-radius:5px;padding:3px 8px;font-weight:800;font-size:0.8rem;width:90px;flex-shrink:0;text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${r.code}">${r.code}</div>
                                <div style="width:90px;flex-shrink:0;font-size:0.72rem;color:#64748b;font-family:monospace;line-height:1.4;">${hoursLabel}</div>
                                <div style="flex:1;min-width:0;">
                                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
                                        <span style="font-size:0.78rem;font-weight:600;color:${r.isCustom?'#94a3b8':'#1e293b'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.isCustom?'Sin código asignado':r.desc||r.code}</span>
                                        <span style="font-size:0.75rem;color:#64748b;flex-shrink:0;margin-left:8px;">${r.count} veces · ${pct}% · ${avgH?avgH+'h/asig':''}</span>
                                    </div>
                                    <div style="background:#f1f5f9;border-radius:3px;height:6px;overflow:hidden;">
                                        <div style="background:${r.color};height:100%;width:${barPct}%;border-radius:3px;transition:width 0.3s;"></div>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>`
                }`;
            }

            // ─── TAB 4: VISTA DE SEMANAS ─────────────────────────────────────
            if(tab === 'semanas') {
                const NUM_WEEKS = 20;
                if (!App.uiState.analisisSemanasEmpId) {
                    const first = emps[0];
                    App.uiState.analisisSemanasEmpId = first ? first.id : null;
                }
                if (!App.uiState.analisisSemanasStart) App.uiState.analisisSemanasStart = Utils.getMonday(new Date().toISOString().slice(0,10));

                const emp = App.data.empleados.find(e => e.id === App.uiState.analisisSemanasEmpId);
                const _rerender = `App.ui.renderAnalisis(document.querySelector('.main-scroll'))`;
                const f1 = n => Math.round(n * 10) / 10;

                if (!emp) {
                    body = '<div style="padding:40px;text-align:center;color:#94a3b8;">No hay empleados activos</div>';
                } else {
                    const startMonday = App.uiState.analisisSemanasStart;
                    const empOpts = emps.map(e => `<option value="${e.id}" ${e.id === emp.id ? 'selected' : ''}>${e.nombre}</option>`).join('');

                    // Acumulado previo
                    let acum = emp.saldoInicial || 0;
                    const lockedWeeks = App.ui._getLockedWeeks(emp);
                    lockedWeeks.forEach(lw => {
                        if (lw >= startMonday) return;
                        const wdays = Utils.getWeekDays(lw);
                        let worked = 0;
                        wdays.forEach(d => { const sid = App.data.schedule[d]?.[emp.id]; const sh = sid ? Utils.getShift(sid) : null; if (sh && sh.start && sh.end) worked += Utils.calcHours(sh.start, sh.end, sh.breakStart, sh.breakEnd, sh.break); });
                        const { esperadas } = Utils.calcEsperadas(emp, wdays, emp.id);
                        acum += worked - esperadas;
                    });
                    acum += (emp.ajustes || []).reduce((s, a) => s + a.signo * a.horas, 0);

                    const todayMonday = Utils.getMonday(new Date().toISOString().slice(0,10));

                    let rows = '';
                    for (let w = 0; w < NUM_WEEKS; w++) {
                        const mon = Utils.addWeeks(startMonday, w);
                        const days = Utils.getWeekDays(mon);
                        const wkCode = Utils.getWeekCode(mon);
                        const isLocked = days.every(d => App.data.lockedDays && App.data.lockedDays[d]);
                        const isCurrent = mon === todayMonday;

                        let asig = 0, countL = 0, countF = 0;
                        const dayStatuses = [];
                        days.forEach(d => {
                            const sid = App.data.schedule[d] ? App.data.schedule[d][emp.id] : null;
                            const shift = sid ? Utils.getShift(sid) : null;
                            if (shift) {
                                if (shift.fixed) { if (shift.code === 'L') countL++; if (shift.code === 'F') countF++; dayStatuses.push({ type: 'hollow', color: shift.color, code: shift.code }); }
                                else if (shift.start && shift.end) { const h = Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break); asig += h; dayStatuses.push({ type: 'solid', color: shift.color || '#6b7280', hours: h }); }
                                else dayStatuses.push({ type: 'empty' });
                            } else dayStatuses.push({ type: 'empty' });
                        });

                        const { justifiedH, totalContrato: contrato } = Utils.calcEsperadas(emp, days, emp.id);
                        const dif = f1(asig + justifiedH - contrato);
                        if (isLocked) acum += asig + justifiedH - contrato;
                        const acumR = f1(acum);
                        const acumColor = acumR > 0.5 ? '#f59e0b' : acumR < -0.5 ? '#3b82f6' : '#10b981';

                        let libHtml = '';
                        if (countL >= 2) libHtml = `<div style="width:14px;height:14px;background:#22c55e;color:white;border-radius:50%;font-size:0.55rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto;">✓</div>`;
                        else if (countL >= 1 && countF >= 1) libHtml = `<div style="width:14px;height:14px;background:#f59e0b;color:white;border-radius:50%;font-size:0.55rem;font-weight:700;display:flex;align-items:center;justify-content:center;margin:0 auto;">⚠</div>`;

                        let dotsHtml = `<div style="display:flex;gap:3px;justify-content:center;">`;
                        dayStatuses.forEach(s => {
                            if (s.type === 'solid') {
                                const hTxt = s.hours ? f1(s.hours) : '';
                                const txtCol = Utils.isLightColor(s.color) ? '#1e293b' : '#fff';
                                dotsHtml += `<div style="width:26px;height:22px;border-radius:4px;background:${s.color};display:flex;align-items:center;justify-content:center;font-size:0.62rem;font-weight:700;color:${txtCol};">${hTxt}</div>`;
                            }
                            else if (s.type === 'hollow') dotsHtml += `<div style="width:26px;height:22px;border-radius:4px;border:2px solid ${s.color};box-sizing:border-box;display:flex;align-items:center;justify-content:center;font-size:0.58rem;font-weight:700;color:${s.color};">${s.code || ''}</div>`;
                            else dotsHtml += `<div style="width:26px;height:22px;border-radius:4px;border:1px dashed #e2e8f0;"></div>`;
                        });
                        dotsHtml += `</div>`;

                        const difClass = dif >= -0.5 && dif <= 0.5 ? 'val-good' : dif < 0 ? 'val-warn' : 'val-good';
                        const rowBg = isCurrent ? 'background:#eff6ff;' : (isLocked ? '' : 'opacity:0.55;');
                        const lockIcon = isLocked ? '🔒' : '';
                        const d0 = new Date(days[0] + 'T12:00:00'), d6 = new Date(days[6] + 'T12:00:00');
                        const shortRange = `${d0.getDate()}/${d0.getMonth()+1}–${d6.getDate()}/${d6.getMonth()+1}`;

                        rows += `<tr style="${rowBg}border-bottom:1px solid #f1f5f9;">
                            <td style="text-align:left;padding:6px 10px;white-space:nowrap;">${lockIcon} <strong>${wkCode.slice(-4)}</strong> <span style="color:#94a3b8;font-size:0.75rem;">${shortRange}</span></td>
                            <td style="text-align:center;padding:6px 8px;">${f1(contrato)}</td>
                            <td style="text-align:center;padding:6px 8px;">${f1(asig)}</td>
                            <td class="${difClass}" style="text-align:center;padding:6px 8px;font-weight:600;">${dif > 0 ? '+' : ''}${dif}</td>
                            <td style="text-align:center;padding:6px 8px;border-left:2px solid #cbd5e1;color:${acumColor};font-weight:700;">${acumR > 0 ? '+' : ''}${acumR}</td>
                            <td style="text-align:center;padding:6px 8px;">${libHtml}</td>
                            <td style="padding:6px 8px;">${dotsHtml}</td>
                        </tr>`;
                    }

                    body = `<div style="max-width:680px;margin:0 auto;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                        <select onchange="App.uiState.analisisSemanasEmpId=this.value;${_rerender}"
                            style="padding:6px 10px;border:1px solid #e2e8f0;border-radius:6px;font-size:0.85rem;color:#1e293b;">${empOpts}</select>
                        <div style="display:flex;align-items:center;gap:4px;margin-left:auto;">
                            <button onclick="App.uiState.analisisSemanasStart=Utils.addWeeks(App.uiState.analisisSemanasStart,-4);${_rerender}" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.82rem;color:#475569;">◀◀</button>
                            <button onclick="App.uiState.analisisSemanasStart=Utils.addWeeks(App.uiState.analisisSemanasStart,-1);${_rerender}" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.82rem;color:#475569;">◀</button>
                            <button onclick="App.uiState.analisisSemanasStart=Utils.addWeeks(App.uiState.analisisSemanasStart,1);${_rerender}" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.82rem;color:#475569;">▶</button>
                            <button onclick="App.uiState.analisisSemanasStart=Utils.addWeeks(App.uiState.analisisSemanasStart,4);${_rerender}" style="padding:4px 10px;border:1px solid #e2e8f0;border-radius:5px;background:#f8fafc;cursor:pointer;font-size:0.82rem;color:#475569;">▶▶</button>
                        </div>
                    </div>
                    <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
                        <thead><tr style="background:#f8fafc;border-bottom:2px solid #e2e8f0;">
                            <th style="text-align:left;padding:8px 10px;font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;">Semana</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;">Cntr</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;">Asig</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;">Dif</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;border-left:2px solid #cbd5e1;">Acum</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;">LIB</th>
                            <th style="text-align:center;padding:8px;font-size:0.72rem;font-weight:700;color:#64748b;">L–D</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                    </table>
                    </div>`;
                }
            }

            c.innerHTML = `
            <div style="padding:20px 24px;max-width:1400px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
                    <h2 style="margin:0;font-size:1.2rem;font-weight:700;color:#1e293b;">Análisis</h2>
                </div>
                ${tabBar}
                ${body}
            </div>`;
        },

        renderAnalisisDesvio: function(emps) {
            const startISO = App.uiState.analisisDesvioStart;
            const endISO   = App.uiState.analisisDesvioEnd;
            const selEmpId = App.uiState.analisisDesvioEmpId;
            const selEmp   = emps.find(e => e.id === selEmpId);

            // Helper: formato corto DD.MM.AA
            const shortDate = iso => { const [y,m,d] = iso.split('-'); return `${d}.${m}.${y.slice(2)}`; };

            // Helper: etiqueta canónica de semana = "2026WK07 · 29.12–04.01"
            const weekLabel = iso => {
                const code = Utils.getWeekCode(iso);
                const days = Utils.getWeekDays(iso);
                return `${code} · ${shortDate(days[0])}–${shortDate(days[6])}`;
            };

            // Generar opciones de semana para el selector (rango navegable del planificador)
            const buildWeekOptions = (selectedISO) => {
                const anchor = new Date(App.data.config.weekStart || "2025-12-29");
                const minDate = new Date(anchor); minDate.setDate(minDate.getDate() - 8*7);
                const maxDate = new Date(anchor); maxDate.setDate(maxDate.getDate() + 61*7);
                let opts = '';
                let cur = new Date(minDate);
                while(cur <= maxDate) {
                    const iso = cur.toISOString().slice(0,10);
                    const sel = iso === selectedISO ? 'selected' : '';
                    opts += `<option value="${iso}" ${sel}>${weekLabel(iso)}</option>`;
                    cur.setDate(cur.getDate() + 7);
                }
                return opts;
            };

            const weekSelectStyle = `padding:7px 10px; border:1px solid var(--border); border-radius:6px; font-size:0.82rem; background:white; color:var(--text-main); cursor:pointer; min-width:240px;`;

            // Selector de empleados
            let empBtns = emps.map(e =>
                `<button class="desvio-emp-btn ${e.id===selEmpId?'active':''}"
                    onclick="App.uiState.analisisDesvioEmpId='${e.id}'; App.router.go('analisis')">${e.nombre}</button>`
            ).join('');

            let html = `
            <div style="background:white; border-radius:10px; border:1px solid var(--border); padding:20px; margin-bottom:16px;">
                <div style="display:flex; gap:24px; align-items:flex-end; flex-wrap:wrap; margin-bottom:20px;">
                    <div>
                        <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Desde</div>
                        <select style="${weekSelectStyle}" onchange="App.uiState.analisisDesvioStart=this.value; App.router.go('analisis');">
                            ${buildWeekOptions(startISO)}
                        </select>
                    </div>
                    <div>
                        <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:6px;">Hasta</div>
                        <select style="${weekSelectStyle}" onchange="App.uiState.analisisDesvioEnd=this.value; App.router.go('analisis');">
                            ${buildWeekOptions(endISO)}
                        </select>
                    </div>
                </div>
                <div style="font-size:0.7rem; font-weight:700; color:var(--text-muted); text-transform:uppercase; margin-bottom:8px;">Empleado</div>
                <div class="desvio-emp-selector">${empBtns}</div>
            </div>`;

            if(!selEmp) return html + `<p style="color:var(--text-muted)">Selecciona un empleado.</p>`;

            // Semanas del rango en que el empleado está vigente
            const weeks = [];
            let cur = new Date(Utils.getMonday(startISO));
            const endD = new Date(Utils.getMonday(endISO));
            while(cur <= endD) {
                const iso = cur.toISOString().slice(0,10);
                if(Utils.empleadoVigenteEnFecha(selEmp, iso)) weeks.push(iso);
                cur.setDate(cur.getDate() + 7);
            }

            let acum = 0;
            let maxAbs = 0;
            const rows = weeks.map(monday => {
                const wdays = Utils.getWeekDays(monday);
                let worked = 0;
                wdays.forEach(d => {
                    const sid = App.data.schedule[d] ? App.data.schedule[d][selEmp.id] : null;
                    const shift = sid ? Utils.getShift(sid) : null;
                    if(shift && shift.start && shift.end) {
                        worked += Utils.calcHours(shift.start, shift.end, shift.breakStart, shift.breakEnd, shift.break);
                    }
                });
                const { esperadas, justifiedH } = Utils.calcEsperadas(selEmp, wdays, selEmp.id);
                const desvio = Math.round((worked - esperadas) * 10) / 10;
                acum = Math.round((acum + desvio) * 10) / 10;
                if(Math.abs(desvio) > maxAbs) maxAbs = Math.abs(desvio);
                if(Math.abs(acum)   > maxAbs) maxAbs = Math.abs(acum);
                return { monday, worked, esperadas, justified: justifiedH, desvio, acum };
            });

            if(rows.length === 0) {
                return html + `<div style="background:white; border-radius:10px; border:1px solid var(--border); padding:30px; text-align:center; color:var(--text-muted);">
                    <div style="font-size:2rem; margin-bottom:8px;">📭</div>
                    <div style="font-weight:600;">Sin semanas vigentes en este rango</div>
                    <div style="font-size:0.8rem; margin-top:4px;">Comprueba las fechas de vigencia del empleado o amplía el rango.</div>
                </div>`;
            }

            const barScale    = maxAbs > 0 ? maxAbs : 1;
            const totalDesvio = rows[rows.length-1].acum;
            const totalColor  = totalDesvio > 0.5 ? '#f59e0b' : totalDesvio < -0.5 ? '#3b82f6' : '#10b981';
            const totalLabel  = totalDesvio > 0.5 ? `${totalDesvio}h de más` : totalDesvio < -0.5 ? `${Math.abs(totalDesvio)}h de menos` : 'Sin desvío';

            html += `<div style="background:white; border-radius:10px; border:1px solid var(--border); overflow:hidden;">
                <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; font-size:1rem;">${selEmp.nombre}</div>
                        <div style="font-size:0.8rem; color:var(--text-muted);">Contrato ${selEmp.contrato}h/sem · ${rows.length} semana${rows.length!==1?'s':''} vigentes</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:1.4rem; font-weight:800; color:${totalColor};">${totalDesvio > 0 ? '+' : ''}${totalDesvio}h</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${totalLabel} acumulado</div>
                    </div>
                </div>
                <table class="desvio-table">
                    <thead><tr>
                        <th>Semana</th>
                        <th style="text-align:right;">Esperadas</th>
                        <th style="text-align:right;">Trabajadas</th>
                        <th style="text-align:right;">Desvío</th>
                        <th style="text-align:center; width:120px;">Barra</th>
                        <th style="text-align:right;">Acumulado</th>
                    </tr></thead>
                    <tbody>`;

            rows.forEach(r => {
                const dColor  = r.desvio > 0.5 ? '#f59e0b' : r.desvio < -0.5 ? '#3b82f6' : '#10b981';
                const aColor  = r.acum > 0.5   ? '#f59e0b' : r.acum   < -0.5 ? '#3b82f6' : '#10b981';
                const dSign   = r.desvio > 0 ? '+' : '';
                const aSign   = r.acum   > 0 ? '+' : '';
                const pct     = Math.min(Math.abs(r.desvio) / barScale * 48, 48);
                const barHtml = r.desvio > 0.5
                    ? `<div class="desvio-bar desvio-pos" style="width:${pct}%;"></div>`
                    : r.desvio < -0.5
                        ? `<div class="desvio-bar desvio-neg" style="width:${pct}%;"></div>`
                        : '';
                const justNote = r.justified > 0
                    ? `<span class="diff-tooltip-wrap" style="cursor:help; color:#a78bfa; font-size:0.7rem; margin-left:3px;">✦<div class="diff-tooltip" style="min-width:220px; white-space:normal; line-height:1.6;">${r.justified}h de ausencias justificadas (V/F/R/B/P)<br>Horas esperadas reducidas de ${selEmp.contrato}h a ${r.esperadas}h</div></span>`
                    : '';
                const wkCode  = Utils.getWeekCode(r.monday);
                const wkDays  = Utils.getWeekDays(r.monday);

                html += `<tr>
                    <td style="font-size:0.82rem; white-space:nowrap;">
                        <span style="font-weight:700; color:var(--text-main);">${wkCode}</span>
                        <span style="color:#94a3b8; font-size:0.75rem; margin-left:5px;">${shortDate(wkDays[0])}–${shortDate(wkDays[6])}</span>
                    </td>
                    <td style="text-align:right; font-family:monospace;">${r.esperadas}h${justNote}</td>
                    <td style="text-align:right; font-family:monospace;">${r.worked}h</td>
                    <td style="text-align:right; font-family:monospace; font-weight:700; color:${dColor};">${dSign}${r.desvio}h</td>
                    <td style="text-align:center;">
                        <div class="desvio-bar-wrap"><div class="desvio-center"></div>${barHtml}</div>
                    </td>
                    <td style="text-align:right; font-family:monospace; font-weight:700; color:${aColor};">${aSign}${r.acum}h</td>
                </tr>`;
            });

            html += `<tr class="desvio-total">
                <td colspan="3">TOTAL ACUMULADO · ${rows.length} semana${rows.length!==1?'s':''}</td>
                <td style="text-align:right; font-family:monospace; color:${totalColor};">${totalDesvio > 0 ? '+' : ''}${totalDesvio}h</td>
                <td></td>
                <td style="text-align:right; font-family:monospace; color:${totalColor};">${totalDesvio > 0 ? '+' : ''}${totalDesvio}h</td>
            </tr>`;

            html += `</tbody></table></div>
            <div style="margin-top:10px; font-size:0.75rem; color:var(--text-muted); padding:0 4px;">
                🟡 Ámbar = horas de más &nbsp;·&nbsp; 🔵 Azul = horas de menos &nbsp;·&nbsp; ✦ Semana con ausencias justificadas
            </div>`;

            return html;
        },

        // --- EXPORT ---
});
