// ============================================================
// OPTIMIZADOR DE LLAVES
// Calcula el plan óptimo de traspasos para un rango de fechas.
//
// Función de coste: 1 traspaso = 1.4 días ociosos
// Día ocioso = el titular es una persona y libra ese día
// __TIENDA__ no genera días ociosos (coste = 0)
//
// Los traspasos manuales son anclas fijas.
// Los traspasos con source:'auto' se recalculan en cada ejecución.
// Al aceptar un traspaso sugerido pasa a source:'manual' (ancla).
// ============================================================

App.llaves = {

    TRANSFER_COST: 1.4,
    COVERAGE_PENALTY: 8,  // coste extra por dejar sin cierre (dador cierra, receptor no)

    // ─── UI STATE ────────────────────────────────────────────────────────────
    _ui: { semanas: 2, plan: null, days: [] },


    // ─── HELPERS ─────────────────────────────────────────────────────────────

    _trabajaReal: function(empId, dateStr) {
        const shiftId = (App.data.schedule[dateStr] || {})[empId];
        if (!shiftId) return false;
        const shift = Utils.getShift(shiftId);
        return !!(shift && !shift.fixed);
    },

    _tag3Ids: function() {
        const hoy = new Date().toISOString().slice(0, 10);
        return App.data.empleados
            .filter(e => e.active !== false && ['MNG', 'AM', 'SPV'].includes(Utils.getRolEnFecha(e, hoy)))
            .map(e => e.id);
    },

    _idleCost: function(holderId, dateStr) {
        if (!holderId || holderId === '__TIENDA__') return 0;
        return this._trabajaReal(holderId, dateStr) ? 0 : 1;
    },

    // true si empId cierra la tienda ese día (turno termina a la hora de cierre)
    _esCloser: function(empId, dateStr) {
        if (!empId || empId === '__TIENDA__') return false;
        const shiftId = (App.data.schedule[dateStr] || {})[empId];
        if (!shiftId) return false;
        const shift = Utils.getShift(shiftId);
        if (!shift || shift.fixed) return false;
        const h = App.logic._getHorarioDelDia(dateStr);
        return !!(h && !h.closed && shift.end === h.close);
    },

    // true si la tienda está abierta ese día (necesita cobertura de llave)
    _estaAbierta: function(dateStr) {
        const h = App.logic._getHorarioDelDia(dateStr);
        return !!(h && !h.closed);
    },

    _dateRange: function(startStr, endStr) {
        const days = [];
        const cur = new Date(startStr + 'T12:00:00');
        const end = new Date(endStr + 'T12:00:00');
        while (cur <= end) {
            days.push(cur.toISOString().slice(0, 10));
            cur.setDate(cur.getDate() + 1);
        }
        return days;
    },

    _llaveLabel: function(llave, idx) {
        return 'Llave ' + (idx + 1) + (llave.alias ? ' (' + llave.alias + ')' : '');
    },

    _empNombre: function(id) {
        if (!id || id === '__TIENDA__') return 'Tienda';
        return App.data.empleados.find(e => e.id === id)?.nombre || id;
    },


    // ─── OPTIMIZADOR PRINCIPAL ────────────────────────────────────────────────

    optimizar: function(semanas) {
        if (!App.data.config.llavesActivo) return null;
        const llaves = App.data.config.llaves || [];
        if (!llaves.length) return null;

        const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        const hoyStr = hoy.toISOString().slice(0, 10);
        const fin = new Date(hoy);
        fin.setDate(fin.getDate() + semanas * 7 - 1);
        const finStr = fin.toISOString().slice(0, 10);

        const days = this._dateRange(hoyStr, finStr);
        const tag3Ids = this._tag3Ids();
        // Receptores válidos: TAG3 + tienda
        const receptoresValidos = new Set([...tag3Ids, '__TIENDA__']);

        const plan = [];
        llaves.forEach((llave, idx) => {
            const llavePlan = this._optimizarLlave(llave, idx, days, hoyStr, finStr, tag3Ids, receptoresValidos);
            plan.push(...llavePlan);
        });

        return { plan, hoyStr, finStr, semanas, days };
    },


    // ─── OPTIMIZADOR POR LLAVE ───────────────────────────────────────────────

    _optimizarLlave: function(llave, idx, days, hoyStr, finStr, tag3Ids, receptoresValidos) {

        // Traspasos auto en el rango → marcar para borrar
        const autos = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.source === 'auto' &&
            t.fecha >= hoyStr && t.fecha <= finStr
        );
        const toDelete = autos.map(t => ({ action: 'del', llave, llaveIdx: idx, traspaso: t }));

        // Traspasos manuales en el rango (anclas), ordenados por fecha
        const manuales = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.source !== 'auto' &&
            t.fecha >= hoyStr && t.fecha <= finStr
        ).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creadoEn.localeCompare(b.creadoEn));

        // Titular basado solo en traspasos manuales — los auto van a borrarse,
        // así que no deben influir en el punto de partida del algoritmo.
        const manualesAnteriores = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.source !== 'auto' && t.fecha <= hoyStr
        ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
        const titularInicial = manualesAnteriores.length > 0
            ? manualesAnteriores[0].receptorId
            : '__TIENDA__';

        // Conjunto de holders para el DP: TAG3 + tienda + titular inicial (por si no es TAG3)
        const holdersSet = new Set([...tag3Ids, '__TIENDA__', titularInicial]);
        manuales.forEach(t => { if (t.receptorId) holdersSet.add(t.receptorId); });
        const holders = [...holdersSet];

        // Construir segmentos entre anclas
        // Cada segmento: [segStart, anchorDate], el DP optimiza dentro del segmento
        const segments = [];
        let segStart = hoyStr;
        let segStartHolder = titularInicial;

        for (const anchor of manuales) {
            if (anchor.fecha < segStart) continue;
            segments.push({
                days: days.filter(d => d >= segStart && d <= anchor.fecha),
                startHolder: segStartHolder,
                endHolder: anchor.receptorId  // el ancla fija el titular al final
            });
            segStart = anchor.fecha;
            segStartHolder = anchor.receptorId;
        }
        // Segmento final (sin ancla de cierre)
        segments.push({
            days: days.filter(d => d >= segStart),
            startHolder: segStartHolder,
            endHolder: null
        });

        // Precomputar días abiertos del rango completo (para la restricción de __TIENDA__)
        const openDays = new Set(days.filter(d => this._estaAbierta(d)));

        // Optimizar cada segmento y recoger traspasos sugeridos
        const toAdd = [];
        segments.forEach(seg => {
            if (seg.days.length < 2) return; // 0 o 1 día: sin margen para traspasos
            const transfers = this._dpSegmento(
                seg.days, seg.startHolder, seg.endHolder,
                holders, receptoresValidos, openDays, llave, idx
            );
            toAdd.push(...transfers);
        });

        return [...toDelete, ...toAdd];
    },


    // ─── PROGRAMACIÓN DINÁMICA ───────────────────────────────────────────────
    //
    // dp[i][j] = coste mínimo para llegar al final del día days[i]
    //            con el titular j (índice en holders[])
    //
    // Transiciones:
    //   Quedarse:   dp[i+1][j] = dp[i][j] + idleCost(holders[j], days[i+1])
    //   Transferir: dp[i+1][k] = dp[i][j] + TRANSFER_COST + idleCost(holders[k], days[i+1])
    //               solo si holders[k] ∈ receptoresValidos
    //
    // Reconstrucción del camino → lista de traspasos (action:'add', source:'auto')

    // openDays: Set de fechas en las que la tienda está abierta.
    // __TIENDA__ no puede ser titular al final de un día abierto (cierre)
    // ni la noche anterior a uno abierto (provocaría fallo de apertura).
    _tiendaValidaEnDia: function(dayIdx, days, openDays) {
        if (openDays.has(days[dayIdx])) return false;                          // cierre
        if (dayIdx + 1 < days.length && openDays.has(days[dayIdx + 1])) return false; // apertura siguiente
        return true;
    },

    _dpSegmento: function(days, startHolder, requiredEnd, holders, receptoresValidos, openDays, llave, llaveIdx) {
        const n = days.length;
        const M = holders.length;
        const hIdx = {};
        holders.forEach((h, i) => { hIdx[h] = i; });

        const INF = 1e9;
        const dpAll   = [];
        const fromAll = [];  // fromAll[i][j] = { prevIdx, transferred }

        // ── Día 0 ──────────────────────────────────────────────────────────
        const dp0   = new Array(M).fill(INF);
        const from0 = new Array(M).fill(null);
        const h0    = hIdx[startHolder];

        if (h0 !== undefined) {
            dp0[h0]   = this._idleCost(startHolder, days[0]);
            from0[h0] = { prevIdx: null, transferred: false };
        }
        // Estado inicial: __TIENDA__ solo válido si el día 0 lo permite
        if (h0 !== undefined && startHolder === '__TIENDA__' && !this._tiendaValidaEnDia(0, days, openDays)) {
            dp0[h0] = INF; // invalida el estado
        }

        // Transferencia en el propio día 0 (startHolder → otro)
        // El dador debe trabajar ese día (o ser __TIENDA__)
        const dador0PuedeEntregar = (startHolder === '__TIENDA__') || this._trabajaReal(startHolder, days[0]);
        if (dador0PuedeEntregar) {
            const dador0Cierra = this._esCloser(startHolder, days[0]);
            for (let j = 0; j < M; j++) {
                if (j === h0) continue;
                if (!receptoresValidos.has(holders[j])) continue;
                // El receptor debe trabajar ese día (o ser __TIENDA__ en día válido)
                if (holders[j] === '__TIENDA__') {
                    if (!this._tiendaValidaEnDia(0, days, openDays)) continue;
                } else if (!this._trabajaReal(holders[j], days[0])) continue;
                const coveragePenalty = (dador0Cierra && !this._esCloser(holders[j], days[0])) ? this.COVERAGE_PENALTY : 0;
                const cost = this.TRANSFER_COST + this._idleCost(holders[j], days[0]) + coveragePenalty;
                if (cost < dp0[j]) {
                    dp0[j]   = cost;
                    from0[j] = { prevIdx: h0 !== undefined ? h0 : null, transferred: true };
                }
            }
        }
        dpAll.push(dp0);
        fromAll.push(from0);

        // ── Días 1..n-1 ───────────────────────────────────────────────────
        for (let i = 1; i < n; i++) {
            const dpI   = new Array(M).fill(INF);
            const fromI = new Array(M).fill(null);
            const prev  = dpAll[i - 1];

            for (let j = 0; j < M; j++) {
                if (prev[j] === INF) continue;
                const h = holders[j];

                // Quedarse — __TIENDA__ solo válido si el día lo permite
                if (h === '__TIENDA__' && !this._tiendaValidaEnDia(i, days, openDays)) {
                    // no se puede quedar __TIENDA__ este día
                } else {
                    const stayC = prev[j] + this._idleCost(h, days[i]);
                    if (stayC < dpI[j]) {
                        dpI[j]   = stayC;
                        fromI[j] = { prevIdx: j, transferred: false };
                    }
                }

                // Transferir a otro — solo si el dador trabaja ese día (o es __TIENDA__)
                const dadorPuedeEntregar = (h === '__TIENDA__') || this._trabajaReal(h, days[i]);
                if (dadorPuedeEntregar) {
                    const dadorCierra = this._esCloser(h, days[i]);
                    for (let k = 0; k < M; k++) {
                        if (k === j) continue;
                        if (!receptoresValidos.has(holders[k])) continue;
                        // El receptor debe trabajar ese día, o ser __TIENDA__ en día válido
                        if (holders[k] === '__TIENDA__') {
                            if (!this._tiendaValidaEnDia(i, days, openDays)) continue;
                        } else if (!this._trabajaReal(holders[k], days[i])) continue;
                        // Penalizar traspaso que deja sin cierre (dador cierra, receptor no)
                        const coveragePenalty = (dadorCierra && !this._esCloser(holders[k], days[i])) ? this.COVERAGE_PENALTY : 0;
                        const transC = prev[j] + this.TRANSFER_COST + this._idleCost(holders[k], days[i]) + coveragePenalty;
                        if (transC < dpI[k]) {
                            dpI[k]   = transC;
                            fromI[k] = { prevIdx: j, transferred: true };
                        }
                    }
                }
            }
            dpAll.push(dpI);
            fromAll.push(fromI);
        }

        // ── Encontrar mejor estado final ──────────────────────────────────
        const last = dpAll[n - 1];
        let bestJ;

        if (requiredEnd !== null && requiredEnd !== undefined) {
            bestJ = hIdx[requiredEnd];
        } else {
            let minC = INF;
            for (let j = 0; j < M; j++) {
                if (last[j] < minC) { minC = last[j]; bestJ = j; }
            }
        }

        if (bestJ === undefined || last[bestJ] === INF) return [];

        // ── Reconstruir camino ────────────────────────────────────────────
        // path[i] = titular al FINAL del día days[i]
        const path = [];
        let curJ = bestJ;
        for (let i = n - 1; i >= 0; i--) {
            path.unshift(holders[curJ]);
            const f = fromAll[i][curJ];
            if (f && f.prevIdx !== null && f.prevIdx !== undefined) {
                curJ = f.prevIdx;
            }
        }

        // ── Convertir camino en lista de traspasos ────────────────────────
        const result = [];
        let current = startHolder;
        const tsBase = Date.now();

        for (let i = 0; i < days.length; i++) {
            if (path[i] !== current) {
                result.push({
                    action: 'add',
                    llave,
                    llaveIdx,
                    traspaso: {
                        id: 'tr_auto_' + (tsBase + i) + '_' + Math.random().toString(36).slice(2, 6),
                        llaveId: llave.id,
                        dadorId: current || null,
                        receptorId: path[i],
                        fecha: days[i],
                        creadoEn: new Date().toISOString(),
                        source: 'auto'
                    }
                });
                current = path[i];
            }
        }
        return result;
    },


    // ─── APLICAR PLAN ────────────────────────────────────────────────────────

    aplicarPlan: function(plan) {
        if (!plan || !plan.length) return;
        if (!App.data.traspasoLlaves) App.data.traspasoLlaves = [];

        const idsABorrar = new Set(
            plan.filter(p => p.action === 'del').map(p => p.traspaso.id)
        );
        App.data.traspasoLlaves = App.data.traspasoLlaves.filter(t => !idsABorrar.has(t.id));

        plan.filter(p => p.action === 'add').forEach(p => {
            App.data.traspasoLlaves.push(p.traspaso);
        });

        Safe.save('v40_db', App.data);
        App.logic.checkAlerts();
    },

    // Aplica un único ítem del plan.
    // Si el ítem es 'add', el traspaso se guarda como 'manual' (queda como ancla).
    aplicarUno: function(item) {
        if (!App.data.traspasoLlaves) App.data.traspasoLlaves = [];

        if (item.action === 'del') {
            App.data.traspasoLlaves = App.data.traspasoLlaves.filter(t => t.id !== item.traspaso.id);
        } else {
            App.data.traspasoLlaves.push({ ...item.traspaso, source: 'manual' });
        }

        Safe.save('v40_db', App.data);
        App.logic.checkAlerts();
    },


    // ─── IDLE SEGMENTS ──────────────────────────────────────────────────────
    // Detecta periodos ociosos >1 día en el plan propuesto.
    // Un día ocioso = titular es una persona que no trabaja ese día.

    _computeIdleSegments: function(plan, days) {
        if (!plan || !days.length) return [];
        const llaves = App.data.config.llaves || [];
        const hoyStr = days[0];
        const hints = [];

        llaves.forEach((llave, idx) => {
            const manualesAnt = (App.data.traspasoLlaves || []).filter(t =>
                t.llaveId === llave.id && t.source !== 'auto' && t.fecha <= hoyStr
            ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
            let holder = manualesAnt.length > 0 ? manualesAnt[0].receptorId : '__TIENDA__';

            const adds = plan.filter(p => p.action === 'add' && p.llave.id === llave.id)
                .sort((a, b) => a.traspaso.fecha.localeCompare(b.traspaso.fecha));

            let addIdx = 0;
            let idleStart = null;
            let idleCount = 0;
            let idleHolder = null;

            days.forEach((d, i) => {
                while (addIdx < adds.length && adds[addIdx].traspaso.fecha === d) {
                    holder = adds[addIdx].traspaso.receptorId;
                    addIdx++;
                }
                const isIdle = holder !== '__TIENDA__' && !this._trabajaReal(holder, d);
                if (isIdle) {
                    if (idleStart === null) { idleStart = d; idleCount = 0; idleHolder = holder; }
                    idleCount++;
                } else {
                    if (idleStart !== null && idleCount > 1) {
                        // d es el primer día no-ocioso — si el titular trabaja ese día, es su día de regreso
                        const returnDate = this._trabajaReal(idleHolder, d) ? d : null;
                        const returnShiftId = returnDate ? (App.data.schedule[returnDate] || {})[idleHolder] : null;
                        const returnShift = returnShiftId ? Utils.getShift(returnShiftId) : null;
                        const returnShiftLabel = returnShift && returnShift.start ? returnShift.start + '-' + returnShift.end : null;
                        hints.push({ llave, llaveIdx: idx, idleStart, idleEnd: days[i - 1], count: idleCount, holderId: idleHolder, returnDate, returnShiftLabel });
                    }
                    idleStart = null; idleCount = 0; idleHolder = null;
                }
            });
            if (idleStart !== null && idleCount > 1) {
                hints.push({ llave, llaveIdx: idx, idleStart, idleEnd: days[days.length - 1], count: idleCount, holderId: idleHolder, returnDate: null, returnShiftLabel: null });
            }
        });

        return hints;
    },


    // ─── UI HANDLERS ─────────────────────────────────────────────────────────

    _rerender: function() {
        App.uiState.reqSection = 'llaves';
        const c = document.querySelector('.main-scroll');
        if (c) App.ui.renderRequests(c);
    },

    _calcular: function() {
        const result = this.optimizar(this._ui.semanas);
        this._ui.plan  = result ? result.plan  : [];
        this._ui.days  = result ? result.days  : [];
        this._rerender();
    },

    _aplicarTodo: function() {
        if (this._ui.plan) this.aplicarPlan(this._ui.plan);
        this._ui.plan = null;
        this._ui.days = [];
        this._rerender();
    },

    _cancelar: function() {
        this._ui.plan = null;
        this._ui.days = [];
        this._rerender();
    },

    // Acepta un ítem individual por índice, lo convierte en ancla y recalcula
    _aceptarUno: function(idx) {
        if (!this._ui.plan) return;
        const item = this._ui.plan[idx];
        if (!item) return;

        // Primero borrar todos los auto traspasos del rango (del items del plan actual),
        // para que no queden duplicados al añadir el nuevo traspaso manual.
        if (!App.data.traspasoLlaves) App.data.traspasoLlaves = [];
        const idsABorrar = new Set(
            this._ui.plan.filter(p => p.action === 'del').map(p => p.traspaso.id)
        );
        if (idsABorrar.size > 0) {
            App.data.traspasoLlaves = App.data.traspasoLlaves.filter(t => !idsABorrar.has(t.id));
        }

        // Luego aceptar el item como ancla manual
        this.aplicarUno(item);

        // Recalcular con el nuevo estado (el traspaso aceptado ya es ancla)
        const result = this.optimizar(this._ui.semanas);
        this._ui.plan = result ? result.plan : [];
        this._ui.days = result ? result.days : [];
        this._rerender();
    },


    // ─── RENDER PANEL (inyectado en renderAlerts) ────────────────────────────

    _renderPanel: function() {
        if (!App.data.config.llavesActivo || !(App.data.config.llaves || []).length) return '';

        const semanas = this._ui.semanas || 2;
        const semOpts = [1, 2, 3, 4].map(n =>
            '<option value="' + n + '"' + (n === semanas ? ' selected' : '') + '>' +
            n + ' semana' + (n > 1 ? 's' : '') + '</option>'
        ).join('');

        let planHTML = '';
        const plan = this._ui.plan;

        if (plan !== null) {
            const planAdds = plan.filter(p => p.action === 'add');
            if (!planAdds.length) {
                planHTML = '<div style="color:#10b981;font-size:0.82rem;padding:10px 0 2px;">' +
                    '✓ Sin cambios necesarios para este período.</div>';
            } else {
                let rows = '';
                const hoyParaHint = new Date(); hoyParaHint.setHours(0,0,0,0);
                plan.forEach((item, i) => {
                    // Los items 'del' son contabilidad interna — no se muestran al usuario
                    if (item.action === 'del') return;

                    const t = item.traspaso;
                    const lbl = this._llaveLabel(item.llave, item.llaveIdx);
                    const dador    = this._empNombre(t.dadorId);
                    const receptor = this._empNombre(t.receptorId);
                    // Hint de horizonte largo: ≥21 días → recomendar ajuste de turno
                    const diasHasta = Math.round((new Date(t.fecha + 'T12:00:00') - hoyParaHint) / 86400000);
                    const hint = diasHasta >= 21
                        ? '<div style="font-size:0.72rem;color:#b45309;margin-top:2px;">💡 A 3+ semanas: valora ajustar un turno en lugar de este traspaso</div>'
                        : '';
                    rows +=
                        '<tr style="border-bottom:1px solid #f1f5f9;">' +
                            '<td style="padding:5px 8px;">' +
                                '<span style="font-size:0.7rem;background:#dbeafe;color:#2563eb;border-radius:4px;padding:1px 6px;">nuevo</span>' +
                            '</td>' +
                            '<td style="padding:5px 8px;font-size:0.8rem;color:#1e293b;">' + Utils.formatDateES(t.fecha) + hint + '</td>' +
                            '<td style="padding:5px 8px;font-size:0.8rem;color:#1e293b;">' + lbl + '</td>' +
                            '<td style="padding:5px 8px;font-size:0.8rem;color:#1e293b;">' + dador + ' → ' + receptor + '</td>' +
                            '<td style="padding:5px 8px;">' +
                                '<button onclick="App.llaves._aceptarUno(' + i + ')" ' +
                                'style="padding:2px 10px;border-radius:5px;border:1px solid #10b981;background:white;color:#059669;font-size:0.75rem;font-weight:600;cursor:pointer;">' +
                                'Aceptar</button>' +
                            '</td>' +
                        '</tr>';
                });

                // Idle hints: periodos ociosos >1 día en el plan
                const idleSegs = this._computeIdleSegments(plan, this._ui.days || []);
                let idleHintsHtml = '';
                if (idleSegs.length > 0) {
                    const hLines = idleSegs.map(h => {
                        const nombre = this._empNombre(h.holderId);
                        const lbl    = this._llaveLabel(h.llave, h.llaveIdx);
                        const desde  = Utils.formatDateES(h.idleStart);
                        const hasta  = h.idleStart !== h.idleEnd ? ' → ' + Utils.formatDateES(h.idleEnd) : '';
                        const regreso = h.returnDate
                            ? ' Regresa el ' + Utils.formatDateES(h.returnDate) +
                              (h.returnShiftLabel ? ' (' + h.returnShiftLabel + ')' : '') + '.'
                            : '';
                        return '<div style="font-size:0.79rem;color:#92400e;padding:2px 0;">💡 <b>' + lbl + '</b>: ' +
                            nombre + ' libre ' + h.count + ' días seguidos (' + desde + hasta + ').' +
                            regreso + ' Si hay tiempo suficiente, valora ajustar su turno uno de esos días.</div>';
                    }).join('');
                    idleHintsHtml = '<div style="background:#fef3c7;border:1px solid #fde68a;border-radius:8px;' +
                        'padding:10px 14px;margin-top:10px;">' + hLines + '</div>';
                }

                planHTML =
                    '<div style="overflow-x:auto;margin-top:10px;">' +
                        '<table style="width:100%;border-collapse:collapse;">' +
                            '<thead>' +
                                '<tr style="background:#f1f5f9;">' +
                                    '<th style="padding:4px 8px;text-align:left;font-size:0.72rem;color:#64748b;font-weight:600;"></th>' +
                                    '<th style="padding:4px 8px;text-align:left;font-size:0.72rem;color:#64748b;font-weight:600;">Fecha</th>' +
                                    '<th style="padding:4px 8px;text-align:left;font-size:0.72rem;color:#64748b;font-weight:600;">Llave</th>' +
                                    '<th style="padding:4px 8px;text-align:left;font-size:0.72rem;color:#64748b;font-weight:600;">Movimiento</th>' +
                                    '<th style="padding:4px 8px;"></th>' +
                                '</tr>' +
                            '</thead>' +
                            '<tbody>' + rows + '</tbody>' +
                        '</table>' +
                    '</div>' +
                    '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">' +
                        '<button onclick="App.llaves._aplicarTodo()" ' +
                            'style="padding:6px 16px;border-radius:6px;border:none;background:#2563eb;color:white;font-size:0.8rem;font-weight:600;cursor:pointer;">' +
                            'Aplicar todo' +
                        '</button>' +
                        '<button onclick="App.llaves._cancelar()" ' +
                            'style="padding:6px 16px;border-radius:6px;border:1px solid #cbd5e1;background:white;color:#64748b;font-size:0.8rem;font-weight:600;cursor:pointer;">' +
                            'Cancelar' +
                        '</button>' +
                    '</div>' +
                    idleHintsHtml;
            }
        }

        return '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;' +
                    'padding:14px 18px;max-width:620px;margin:0 auto 20px;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
                    '<span style="font-size:0.88rem;font-weight:700;color:#1e293b;">🔑 Optimizador de llaves</span>' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<span style="font-size:0.8rem;color:#64748b;">Planificar</span>' +
                        '<select onchange="App.llaves._ui.semanas=parseInt(this.value)" ' +
                            'style="font-size:0.8rem;border:1px solid #e2e8f0;border-radius:6px;padding:3px 6px;cursor:pointer;">' +
                            semOpts +
                        '</select>' +
                        '<button onclick="App.llaves._calcular()" ' +
                            'style="padding:5px 14px;border-radius:6px;border:none;background:#2563eb;color:white;font-size:0.8rem;font-weight:600;cursor:pointer;">' +
                            'Calcular' +
                        '</button>' +
                    '</div>' +
                '</div>' +
                planHTML +
            '</div>';
    }
};
