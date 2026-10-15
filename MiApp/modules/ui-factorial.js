// ============================================================
// UI: Informe Factorial — recuperaciones de festivos trabajados por pedir
// ============================================================
// Por cada persona activa, lista los festivos que TRABAJÓ (turno con horas) y qué día de
// recuperación (R) tiene que pedir en Factorial, con el texto exacto de la solicitud:
// "Festivo trabajado DD/MM/AAAA". Las ya pedidas (fecha Factorial) o fijadas (📌 aceptadas)
// salen señaladas para no pedirlas dos veces.

Object.assign(App.ui, {
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

    renderInformeFactorial: function() {
        const data = App.ui._informeFactorialData();
        const soloPend = App.uiState.factInformeSoloPend !== false; // por defecto: solo personas con algo por pedir
        const DIAS = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        const diaSem = iso => DIAS[new Date(iso + 'T12:00:00').getDay()];
        const motivo = hDate => `Festivo trabajado ${Utils.formatDateES(hDate)}`;
        const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');

        const totPedir = data.reduce((s, d) => s + d.items.filter(i => i.estado === 'pedir').length, 0);
        const totSinR  = data.reduce((s, d) => s + d.items.filter(i => i.estado === 'sin_r').length, 0);
        const visibles = soloPend ? data.filter(d => d.items.some(i => i.estado !== 'pedida')) : data;

        const rowHtml = (emp, it) => {
            if(it.estado === 'pedir') {
                return `<tr style="border-bottom:1px solid #f1f5f9;">
                    <td style="padding:6px 8px;"><span style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:6px; font-size:0.62rem; font-weight:800; white-space:nowrap;">⬜ POR PEDIR</span></td>
                    <td style="padding:6px 8px; font-weight:700; white-space:nowrap;">${Utils.formatDateES(it.rDate)} <span style="font-weight:400; color:#64748b;">${diaSem(it.rDate)} · ${Utils.getWeekCode(it.rDate)}</span></td>
                    <td style="padding:6px 8px;"><code style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:4px; padding:2px 6px; font-size:0.72rem;">${motivo(it.hDate)}</code>
                        <button onclick="navigator.clipboard.writeText('${motivo(it.hDate)}'); this.textContent='✓'; setTimeout(()=>this.textContent='⧉',1200);" title="Copiar texto de la solicitud" style="border:none; background:none; cursor:pointer; color:#64748b; font-size:0.85rem;">⧉</button></td>
                    <td style="padding:6px 8px; text-align:right;" class="no-print"><button onclick="App.ui.informeFactorialMarcarPedida('${emp.id}','${it.hDate}')" title="Ya la he pedido en Factorial: anota hoy como fecha de solicitud" style="border:1px solid #86efac; background:#f0fdf4; color:#15803d; border-radius:5px; cursor:pointer; font-size:0.65rem; font-weight:700; padding:3px 8px; white-space:nowrap;">✓ Marcar pedida</button></td>
                </tr>`;
            }
            if(it.estado === 'pedida') {
                const det = it.fijada ? '📌 Aceptada en Factorial' : `Pedida el ${Utils.formatDateES(it.factorialDate)}`;
                return `<tr style="border-bottom:1px solid #f1f5f9; color:#94a3b8;">
                    <td style="padding:6px 8px;"><span style="background:#dcfce7; color:#15803d; padding:2px 6px; border-radius:6px; font-size:0.62rem; font-weight:800; white-space:nowrap;">✅ YA PEDIDA</span></td>
                    <td style="padding:6px 8px; white-space:nowrap; text-decoration:line-through;">${it.rDate ? Utils.formatDateES(it.rDate) : '—'}</td>
                    <td style="padding:6px 8px; text-decoration:line-through;">${motivo(it.hDate)}</td>
                    <td style="padding:6px 8px; text-align:right; font-size:0.65rem; white-space:nowrap;">${det}${!it.fijada ? ` <button class="no-print" onclick="App.ui.informeFactorialMarcarPedida('${emp.id}','${it.hDate}',true)" title="Deshacer: no está pedida" style="border:none; background:none; color:#94a3b8; cursor:pointer;">✕</button>` : ''}</td>
                </tr>`;
            }
            return `<tr style="border-bottom:1px solid #f1f5f9;">
                <td style="padding:6px 8px;"><span style="background:#fef9c3; color:#854d0e; padding:2px 6px; border-radius:6px; font-size:0.62rem; font-weight:800; white-space:nowrap;">⏳ SIN R</span></td>
                <td style="padding:6px 8px; color:#94a3b8; font-style:italic;">sin día de recuperación</td>
                <td style="padding:6px 8px; color:#64748b;">${motivo(it.hDate)}</td>
                <td style="padding:6px 8px; text-align:right; font-size:0.65rem; color:#94a3b8;">Aún no se puede pedir</td>
            </tr>`;
        };

        let body = '';
        if(!visibles.length) {
            body = `<div style="padding:30px; text-align:center; color:var(--text-muted); font-size:0.85rem;">✓ No hay recuperaciones de festivos trabajados por pedir en Factorial.</div>`;
        } else {
            visibles.forEach(({ emp, items }) => {
                const nPedir = items.filter(i => i.estado === 'pedir').length;
                body += `<div style="margin-bottom:14px; border:1px solid var(--border); border-radius:8px; overflow:hidden; break-inside:avoid;">
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:7px 10px; background:#f8fafc; border-bottom:1px solid var(--border);">
                        <span style="font-weight:800; font-size:0.85rem;">${esc(emp.nombre)}</span>
                        <span style="font-size:0.7rem; font-weight:700; color:${nPedir ? '#b91c1c' : '#15803d'};">${nPedir ? `${nPedir} por pedir` : 'nada por pedir'}</span>
                    </div>
                    <table style="width:100%; border-collapse:collapse; font-size:0.76rem;">
                        <thead><tr style="color:#64748b; font-size:0.62rem; text-transform:uppercase; text-align:left;">
                            <th style="padding:5px 8px; font-weight:700;">Estado</th><th style="padding:5px 8px; font-weight:700;">Día a pedir (R)</th><th style="padding:5px 8px; font-weight:700;">Texto de la solicitud</th><th></th>
                        </tr></thead>
                        <tbody>${items.map(it => rowHtml(emp, it)).join('')}</tbody>
                    </table>
                </div>`;
            });
        }

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
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                <h3 style="margin:0;">📋 Recuperaciones por pedir en Factorial</h3>
                <button onclick="document.getElementById('factorial-informe-overlay').classList.remove('open')" style="background:none; border:none; cursor:pointer; font-size:1.2rem;">✕</button>
            </div>
            <div style="font-size:0.72rem; color:#64748b; line-height:1.5; margin-bottom:12px;">
                Festivos <b>trabajados</b>: cada persona pide en Factorial una ausencia el día de recuperación (R) indicado, con el texto <b>"Festivo trabajado"</b> y la fecha del festivo.
                Las marcadas como <b>ya pedidas</b> (fecha Factorial anotada) o <b>📌 fijadas</b> no hay que volver a pedirlas.
            </div>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:12px;">
                <span style="background:#fee2e2; color:#991b1b; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800;">${totPedir} por pedir</span>
                ${totSinR ? `<span style="background:#fef9c3; color:#854d0e; padding:4px 10px; border-radius:6px; font-size:0.72rem; font-weight:800;" title="Festivos trabajados que aún no tienen R asignada en la ficha">${totSinR} sin R asignada</span>` : ''}
                <label style="display:flex; align-items:center; gap:5px; font-size:0.72rem; color:#475569; cursor:pointer; margin-left:auto;">
                    <input type="checkbox" ${soloPend ? 'checked' : ''} onchange="App.uiState.factInformeSoloPend=this.checked; App.ui.renderInformeFactorial();"> Ocultar personas con todo pedido
                </label>
                <button onclick="App.ui.informeFactorialCopiar()" style="padding:5px 10px; border:1px solid var(--border); background:white; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">⧉ Copiar texto</button>
                <button onclick="App.ui.informeFactorialImprimir()" style="padding:5px 10px; border:1px solid var(--border); background:white; border-radius:6px; font-size:0.72rem; font-weight:700; cursor:pointer;">🖨 Imprimir</button>
            </div>
            <div id="factorial-informe-body">${body}</div>
        </div>`;
        overlay.classList.add('open');
    },

    // Anota (o borra, con deshacer=true) hoy como fecha de solicitud en Factorial
    informeFactorialMarcarPedida: function(empId, hDate, deshacer) {
        const emp = App.data.empleados.find(e => e.id === empId);
        if(!emp) return;
        if(!emp.festivoTracking) emp.festivoTracking = {};
        const t = emp.festivoTracking[hDate] || (emp.festivoTracking[hDate] = {});
        if(deshacer) delete t.factorialDate;
        else t.factorialDate = new Date().toISOString().slice(0, 10);
        if(!t.rDate && !t.factorialDate) delete emp.festivoTracking[hDate];
        Safe.save('v40_db', App.data);
        App.ui.renderInformeFactorial();
        // El "(N)" rojo de la columna Festivos de Gestión de Equipo depende de la fecha Factorial
        const ms = document.querySelector('.main-scroll');
        if(ms && App.router.currentRoute === 'empleados') App.ui.renderEmp(ms);
    },

    // Texto plano del informe (solo lo que hay que pedir), para pegar en un chat o correo
    informeFactorialCopiar: function() {
        const data = App.ui._informeFactorialData();
        const lineas = [];
        data.forEach(({ emp, items }) => {
            const pedir = items.filter(i => i.estado === 'pedir');
            const pedidas = items.filter(i => i.estado === 'pedida');
            if(!pedir.length) return;
            lineas.push(`${emp.nombre}:`);
            pedir.forEach(i => lineas.push(`  • Pedir ausencia el ${Utils.formatDateES(i.rDate)} — "Festivo trabajado ${Utils.formatDateES(i.hDate)}"`));
            if(pedidas.length) lineas.push(`  (Ya pedidas, no repetir: ${pedidas.map(i => i.rDate ? Utils.formatDateES(i.rDate) : Utils.formatDateES(i.hDate)).join(', ')})`);
            lineas.push('');
        });
        const txt = lineas.length ? lineas.join('\n').trim() : 'No hay recuperaciones de festivos trabajados por pedir en Factorial.';
        navigator.clipboard.writeText(txt).then(() => alert('✅ Informe copiado al portapapeles.'), () => alert(txt));
    },

    informeFactorialImprimir: function() {
        const inner = document.getElementById('factorial-informe-body')?.innerHTML || '';
        const storeName = App.data.storeConfig?.nombre || '';
        const w = window.open('', '_blank');
        if(!w) { alert('Permite las ventanas emergentes para imprimir el informe.'); return; }
        w.document.open();
        w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Recuperaciones por pedir en Factorial</title>' +
            '<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#1e293b;padding:14px;margin:0;--border:#e2e8f0;--text-muted:#64748b;}' +
            '.no-print{display:none!important;}h1{font-size:18px;margin:0 0 2px;}.sub{color:#64748b;font-size:12px;margin-bottom:14px;}' +
            '@media print{*{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}@page{size:A4;margin:10mm;}</style>' +
            '</head><body onload="window.print()">' +
            '<h1>📋 Recuperaciones por pedir en Factorial</h1>' +
            '<div class="sub">' + (storeName ? storeName + ' · ' : '') + Utils.formatDateES(new Date().toISOString().slice(0, 10)) + '</div>' +
            inner + '</body></html>');
        w.document.close();
    },
});
