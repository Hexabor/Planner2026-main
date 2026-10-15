// ============================================================
// UI: Informe Factorial — recuperaciones de festivos trabajados por pedir
// ============================================================
// Dos pestañas:
//  · POR PEDIR (principal): solo recuperaciones (R) de festivos TRABAJADOS cuya fecha ya ha pasado
//    (ayer o antes) y que aún no constan como pedidas. Las futuras nunca se piden: pueden moverse.
//    Por persona, un mensaje de texto listo para copiar y mandárselo individualmente.
//  · TOTALES (consulta): todos los festivos trabajados con su estado (por pedir, ya pedida, sin R),
//    pasados y futuros.
// "Ya pedida" = recuperación fijada (📌 Factorial / Fijado en la ficha).

Object.assign(App.ui, {
    // Fecha local AAAA-MM-DD (toISOString daría la fecha UTC y de madrugada se iría al día anterior)
    _isoLocal: function(d) {
        d = d || new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    },

    // Datos del informe: [{ emp, items:[{ hDate, nota, rDate, estado:'pedir'|'pedida'|'sin_r', factorialDate, fijada }] }]
    _informeFactorialData: function() {
        const holidays = (App.data.storeConfig.holidays || []).slice().sort((a, b) => a.date.localeCompare(b.date));
        const out = [];
        App.data.empleados.filter(e => e.active !== false).forEach(emp => {
            const tracking = emp.festivoTracking || {};
            const realRs = new Set();
            Object.keys(App.data.schedule || {}).forEach(iso => {
                const sid = App.data.schedule[iso]?.[emp.id];
                const sh = sid ? Utils.getShift(sid) : null;
                if(sh && sh.fixed && sh.code === 'R') realRs.add(iso);
            });
            const items = [];
            holidays.forEach(h => {
                if(!Utils.empleadoVigenteEnFecha(emp, h.date)) return;
                // Solo festivos realmente trabajados (mismo criterio que el estado "trabaja" del panel)
                const sid = App.data.schedule[h.date]?.[emp.id];
                const sh = sid ? Utils.getShift(sid) : null;
                if(!(sh && !sh.fixed && sh.start && sh.end)) return;
                const tr = tracking[h.date] || {};
                const rValida = !!tr.rDate && (realRs.has(tr.rDate) || tr.fijada);
                let estado;
                if(tr.factorialDate || tr.fijada) estado = 'pedida';
                else if(rValida) estado = 'pedir';
                else estado = 'sin_r';
                items.push({ hDate: h.date, nota: h.note || '', rDate: rValida ? tr.rDate : null, estado, factorialDate: tr.factorialDate || null, fijada: !!tr.fijada });
            });
            if(items.length) out.push({ emp, items });
        });
        return out;
    },

    // Lo que hay que pedir YA: estado 'pedir' con la R en ayer o antes. [{ emp, items }]
    _informeFactorialPedirYa: function(data) {
        const hoy = App.ui._isoLocal();
        return (data || App.ui._informeFactorialData())
            .map(({ emp, items }) => ({ emp, items: items.filter(i => i.estado === 'pedir' && i.rDate < hoy).sort((a, b) => a.rDate.localeCompare(b.rDate)) }))
            .filter(d => d.items.length);
    },

    _fDiaSem: function(iso) {
        return ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'][new Date(iso + 'T12:00:00').getDay()];
    },

    // Mensaje individual para mandar a la persona
    _informeFactorialMensaje: function(emp, items) {
        const nombre = (emp.nombre || '').trim().split(/\s+/)[0] || '';
        const n = items.length;
        const lineas = [
            `Hola ${nombre}, tienes ${n === 1 ? 'una ausencia pendiente' : `${n} ausencias pendientes`} de pedir en Factorial por festivo trabajado:`,
            '',
            ...items.map(i => `• Día ${Utils.formatDateES(i.rDate)} (${App.ui._fDiaSem(i.rDate)}) → en la solicitud pon: "Festivo trabajado ${Utils.formatDateES(i.hDate)}"`),
            '',
            '¡Gracias!'
        ];
        return lineas.join('\n');
    },

    renderInformeFactorial: function() {
        const tab = App.uiState.factInformeTab || 'pedir';
        const data = App.ui._informeFactorialData();
        const pedirYa = App.ui._informeFactorialPedirYa(data);
        const nPedirYa = pedirYa.reduce((s, d) => s + d.items.length, 0);

        const tabBtn = (id, label) => `<button onclick="App.uiState.factInformeTab='${id}'; App.ui.renderInformeFactorial();"
            style="padding:7px 14px; border:none; border-radius:6px; font-size:0.75rem; font-weight:700; cursor:pointer; background:${tab === id ? 'white' : 'transparent'}; box-shadow:${tab === id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'}; color:${tab === id ? '#1e293b' : '#64748b'};">${label}</button>`;

        const body = tab === 'pedir' ? App.ui._informeFactorialTabPedir(pedirYa) : App.ui._informeFactorialTabTotales(data);

        let overlay = document.getElementById('factorial-informe-overlay');
        if(!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'factorial-informe-overlay';
            overlay.className = 'modal-overlay';
            overlay.addEventListener('click', ev => { if(ev.target === overlay) overlay.classList.remove('open'); });
            document.body.appendChild(overlay);
        }
        overlay.innerHTML = `
        <div class="modal" style="width:820px; max-width:95%; max-height:90vh; overflow-y:auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                <h3 style="margin:0;">📋 Recuperaciones de festivos en Factorial</h3>
                <button onclick="document.getElementById('factorial-informe-overlay').classList.remove('open')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✕</button>
            </div>
            <div style="display:inline-flex; gap:2px; background:#f1f5f9; padding:3px; border-radius:8px; margin-bottom:12px;">
                ${tabBtn('pedir', `Por pedir${nPedirYa ? ` <span style="background:#ef4444; color:white; border-radius:10px; padding:0 6px; font-size:0.65rem; margin-left:3px;">${nPedirYa}</span>` : ''}`)}
                ${tabBtn('totales', 'Totales')}
            </div>
            <div id="factorial-informe-body">${body}</div>
        </div>`;
        overlay.classList.add('open');
    },

    // ── Pestaña principal: lo que hay que pedir ya, con mensaje copiable por persona ──
    _informeFactorialTabPedir: function(pedirYa) {
        const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        const ayer = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return App.ui._isoLocal(d); })();
        let html = `<div style="font-size:0.72rem; color:#64748b; line-height:1.5; margin-bottom:12px;">
            Recuperaciones de festivos <b>trabajados</b> con fecha de R hasta ayer (${Utils.formatDateES(ayer)}) que aún no constan como pedidas.
            Las futuras no salen aquí: pueden moverse, así que no se piden hasta que pasen. Cuando la persona la pida, márcala como pedida.
        </div>`;

        if(!pedirYa.length) {
            return html + `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:0.85rem; border:1px dashed var(--border); border-radius:8px;">✓ Nadie tiene recuperaciones pasadas pendientes de pedir.</div>`;
        }

        if(pedirYa.length > 1) {
            html += `<div style="display:flex; justify-content:flex-end; margin-bottom:10px;">
                <button onclick="App.ui.informeFactorialCopiarTodo()" style="padding:5px 10px; border:1px solid var(--border); background:white; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">⧉ Copiar todos los mensajes</button>
            </div>`;
        }

        pedirYa.forEach(({ emp, items }) => {
            const msg = App.ui._informeFactorialMensaje(emp, items);
            html += `<div style="margin-bottom:14px; border:1px solid var(--border); border-radius:8px; overflow:hidden;">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:7px 10px; background:#f8fafc; border-bottom:1px solid var(--border);">
                    <span style="font-weight:800; font-size:0.85rem;">${esc(emp.nombre)} <span style="font-weight:700; font-size:0.7rem; color:#b91c1c; margin-left:4px;">${items.length} por pedir</span></span>
                    <span style="display:flex; gap:6px;">
                        <button onclick="App.ui.informeFactorialCopiarMensaje('${emp.id}', this)" style="padding:4px 10px; border:1px solid #93c5fd; background:#eff6ff; color:#1d4ed8; border-radius:5px; font-size:0.68rem; font-weight:700; cursor:pointer; white-space:nowrap;">⧉ Copiar mensaje</button>
                        <button onclick="App.ui.informeFactorialMarcarPedida('${emp.id}', ${JSON.stringify(items.map(i => i.hDate)).replace(/"/g, '&quot;')})" title="Ya las ha pedido todas: las fija (📌 Factorial / Fijado)" style="padding:4px 10px; border:1px solid #86efac; background:#f0fdf4; color:#15803d; border-radius:5px; font-size:0.68rem; font-weight:700; cursor:pointer; white-space:nowrap;">✓ Todas pedidas</button>
                    </span>
                </div>
                <pre style="margin:0; padding:10px 12px; font-family:inherit; font-size:0.78rem; line-height:1.55; white-space:pre-wrap; user-select:text; cursor:text; background:white;">${esc(msg)}</pre>
                <div style="border-top:1px dashed var(--border); padding:4px 10px 6px;">
                    ${items.map(i => `<div style="display:flex; justify-content:space-between; align-items:center; font-size:0.7rem; color:#475569; padding:2px 0;">
                        <span>R ${Utils.formatDateES(i.rDate)} · festivo ${Utils.formatDateES(i.hDate)}${i.nota ? ` <span style="color:#94a3b8;">(${esc(i.nota)})</span>` : ''}</span>
                        <button onclick="App.ui.informeFactorialMarcarPedida('${emp.id}', ['${i.hDate}'])" title="Ya la ha pedido: la fija (📌 Factorial / Fijado)" style="border:1px solid #86efac; background:white; color:#15803d; border-radius:5px; cursor:pointer; font-size:0.62rem; font-weight:700; padding:2px 7px;">✓ Pedida</button>
                    </div>`).join('')}
                </div>
            </div>`;
        });
        return html;
    },

    // ── Pestaña de consulta: todo, pasado y futuro, sin acciones ──
    _informeFactorialTabTotales: function(data) {
        const soloPend = App.uiState.factInformeSoloPend !== false; // por defecto: solo personas con algo por pedir
        const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
        const hoy = App.ui._isoLocal();
        const motivo = hDate => `Festivo trabajado ${Utils.formatDateES(hDate)}`;

        const totPedir = data.reduce((s, d) => s + d.items.filter(i => i.estado === 'pedir').length, 0);
        const totFut   = data.reduce((s, d) => s + d.items.filter(i => i.estado === 'pedir' && i.rDate >= hoy).length, 0);
        const totSinR  = data.reduce((s, d) => s + d.items.filter(i => i.estado === 'sin_r').length, 0);
        const visibles = soloPend ? data.filter(d => d.items.some(i => i.estado !== 'pedida')) : data;

        const badge = (bg, fg, txt) => `<span style="background:${bg}; color:${fg}; padding:2px 6px; border-radius:6px; font-size:0.62rem; font-weight:800; white-space:nowrap;">${txt}</span>`;
        const rowHtml = it => {
            if(it.estado === 'pedir') {
                const futura = it.rDate >= hoy;
                return `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:6px 8px;">${futura ? badge('#e0f2fe', '#075985', '🕓 FUTURA') : badge('#fee2e2', '#991b1b', '⬜ POR PEDIR')}</td>
                    <td style="padding:6px 8px; font-weight:700; white-space:nowrap;">${Utils.formatDateES(it.rDate)} <span style="font-weight:400; color:#64748b;">${App.ui._fDiaSem(it.rDate)} · ${Utils.getWeekCode(it.rDate)}</span></td>
                    <td style="padding:6px 8px;">${motivo(it.hDate)}</td>
                    <td style="padding:6px 8px; text-align:right; font-size:0.65rem; color:#94a3b8; white-space:nowrap;">${futura ? 'No se pide hasta que pase' : ''}</td>
                </tr>`;
            }
            if(it.estado === 'pedida') {
                const det = '📌 Factorial / Fijado';
                return `<tr style="border-bottom:1px solid #f1f5f9; color:#94a3b8;">
                    <td style="padding:6px 8px;">${badge('#dcfce7', '#15803d', '✅ YA PEDIDA')}</td>
                    <td style="padding:6px 8px; white-space:nowrap; text-decoration:line-through;">${it.rDate ? Utils.formatDateES(it.rDate) : '—'}</td>
                    <td style="padding:6px 8px; text-decoration:line-through;">${motivo(it.hDate)}</td>
                    <td style="padding:6px 8px; text-align:right; font-size:0.65rem; white-space:nowrap;">${det}</td>
                </tr>`;
            }
            return `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px;">${badge('#fef9c3', '#854d0e', '⏳ SIN R')}</td>
                <td style="padding:6px 8px; color:#94a3b8; font-style:italic;">sin día de recuperación</td>
                <td style="padding:6px 8px; color:#64748b;">${motivo(it.hDate)}</td>
                <td style="padding:6px 8px; text-align:right; font-size:0.65rem; color:#94a3b8;">Aún no se puede pedir</td>
            </tr>`;
        };

        let html = `<div style="font-size:0.72rem; color:#64748b; line-height:1.5; margin-bottom:12px;">
            Solo consulta: todos los festivos <b>trabajados</b> y su estado, pasados y futuros. Lo que hay que pedir ya está en la pestaña <b>Por pedir</b>.
        </div>
        <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
            <span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800;">${totPedir - totFut} por pedir</span>
            ${totFut ? `<span style="background:#e0f2fe; color:#075985; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800;" title="R asignadas con fecha de hoy en adelante">${totFut} futuras</span>` : ''}
            ${totSinR ? `<span style="background:#fef9c3; color:#854d0e; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800;" title="Festivos trabajados que aún no tienen R asignada en la ficha">${totSinR} sin R asignada</span>` : ''}
            <label style="display:flex; align-items:center; gap:5px; font-size:0.72rem; color:#475569; cursor:pointer; margin-left:auto;">
                <input type="checkbox" ${soloPend ? 'checked' : ''} onchange="App.uiState.factInformeSoloPend=this.checked; App.ui.renderInformeFactorial();"> Ocultar personas con todo pedido
            </label>
            <button onclick="App.ui.informeFactorialImprimir()" style="padding:5px 10px; border:1px solid var(--border); background:white; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">🖨 Imprimir</button>
        </div>
        <div id="factorial-informe-totales">`;

        if(!visibles.length) {
            html += `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:0.85rem;">✓ No hay recuperaciones de festivos trabajados pendientes.</div>`;
        } else {
            visibles.forEach(({ emp, items }) => {
                html += `<div style="margin-bottom:14px; border:1px solid var(--border); border-radius:8px; overflow:hidden; break-inside:avoid;">
                    <div style="padding:7px 10px; background:#f8fafc; border-bottom:1px solid var(--border); font-weight:800; font-size:0.85rem;">${esc(emp.nombre)}</div>
                    <table style="width:100%; border-collapse:collapse; font-size:0.76rem;">
                        <thead><tr style="color:#64748b; font-size:0.62rem; text-transform:uppercase; text-align:left;">
                            <th style="padding:5px 8px; font-weight:700;">Estado</th><th style="padding:5px 8px; font-weight:700;">Día de R</th><th style="padding:5px 8px; font-weight:700;">Texto de la solicitud</th><th></th>
                        </tr></thead>
                        <tbody>${items.map(rowHtml).join('')}</tbody>
                    </table>
                </div>`;
            });
        }
        return html + `</div>`;
    },

    _informeFactorialCopiar: function(txt, btn) {
        const ok = () => { if(btn) { const t = btn.textContent; btn.textContent = '✓ Copiado'; setTimeout(() => btn.textContent = t, 1300); } else alert('✅ Copiado al portapapeles.'); };
        navigator.clipboard.writeText(txt).then(ok, () => alert(txt));
    },

    informeFactorialCopiarMensaje: function(empId, btn) {
        const d = App.ui._informeFactorialPedirYa().find(x => x.emp.id === empId);
        if(d) App.ui._informeFactorialCopiar(App.ui._informeFactorialMensaje(d.emp, d.items), btn);
    },

    informeFactorialCopiarTodo: function() {
        const txt = App.ui._informeFactorialPedirYa()
            .map(({ emp, items }) => `── ${emp.nombre} ──\n${App.ui._informeFactorialMensaje(emp, items)}`)
            .join('\n\n');
        App.ui._informeFactorialCopiar(txt);
    },

    // Marca como pedidas en Factorial = fija (📌) la R de esos festivos, igual que el botón de la ficha
    informeFactorialMarcarPedida: function(empId, hDates) {
        const emp = App.data.empleados.find(e => e.id === empId);
        if(!emp) return;
        hDates.forEach(hDate => {
            const t = emp.festivoTracking?.[hDate];
            if(t && t.rDate) t.fijada = true;
        });
        Safe.save('v40_db', App.data);
        App.ui.renderInformeFactorial();
        // El "(N)" rojo de la columna Festivos de Gestión de Equipo depende de las fijadas
        const ms = document.querySelector('.main-scroll');
        if(ms && App.router.currentRoute === 'empleados') App.ui.renderEmp(ms);
        if(App.uiState.selectedId === empId && document.getElementById('inspector-content')) App.ui.renderEmpInspector(empId);
    },

    informeFactorialImprimir: function() {
        const inner = document.getElementById('factorial-informe-totales')?.innerHTML || '';
        const storeName = App.data.storeConfig?.nombre || '';
        const w = window.open('', '_blank');
        if(!w) { alert('Permite las ventanas emergentes para imprimir el informe.'); return; }
        w.document.open();
        w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recuperaciones de festivos en Factorial</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b;padding:14px;margin:0;--border:#e2e8f0;--text-muted:#64748b;}' +
            'h1{font-size:18px;margin:0 0 2px;}.sub{color:#64748b;font-size:12px;margin-bottom:14px;}' +
            '@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}@page{size:A4;margin:10mm;}</style>' +
            '</head><body onload="window.print()">' +
            '<h1>📋 Recuperaciones de festivos trabajados — totales</h1>' +
            '<div class="sub">' + (storeName ? storeName + ' · ' : '') + Utils.formatDateES(App.ui._isoLocal()) + '</div>' +
            inner + '</body></html>');
        w.document.close();
    },
});
