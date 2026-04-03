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
    COVERAGE_PENALTY: 8,   // coste extra por dejar sin cierre (dador cierra, receptor no)
    APERTURA_CIERRE_PENALTY: 3, // coste por dejar apertura o cierre sin cobertura entre llaves (justifica round-trip 2.8)
    OPEN_IDLE_PENALTY: 50, // coste por tener un titular humano que no trabaja en día de tienda abierta

    // ─── UI STATE ────────────────────────────────────────────────────────────
    _ui: { semanas: 2, plan: null, days: [], startDate: null, initialHolders: {}, optimizerCollapsed: true, inspectorDate: null },


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

    // Cuenta días consecutivos en los que el titular NO trabajará, empezando por days[dayIdx+1].
    // Umbral usado fuera: si streak >= 2, el DP penaliza quedarse o recibir la llave hoy.
    _idleStreakAhead: function(holderId, dayIdx, days) {
        if (!holderId || holderId === '__TIENDA__') return 0;
        let streak = 0;
        for (let k = dayIdx + 1; k < days.length; k++) {
            if (!this._trabajaReal(holderId, days[k])) streak++;
            else break;
        }
        return streak;
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

    // true si empId abre la tienda ese día (turno empieza a la hora de apertura)
    _esOpener: function(empId, dateStr) {
        if (!empId || empId === '__TIENDA__') return false;
        const shiftId = (App.data.schedule[dateStr] || {})[empId];
        if (!shiftId) return false;
        const shift = Utils.getShift(shiftId);
        if (!shift || shift.fixed) return false;
        const h = App.logic._getHorarioDelDia(dateStr);
        return !!(h && !h.closed && shift.start === h.open);
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

    // Devuelve la fecha local en formato YYYY-MM-DD (sin conversión UTC)
    _localDateStr: function(date) {
        const d = date || new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    },

    // Titular actual de una llave según traspasos históricos
    _getCurrentHolder: function(llave) {
        const hoyStr = this._localDateStr();
        const recientes = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.fecha <= hoyStr
        ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.creadoEn.localeCompare(a.creadoEn));
        return recientes.length > 0 ? recientes[0].receptorId : '__TIENDA__';
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

        // Usar startDate del UI si está configurado, sino hoy en hora local (sin conversión UTC)
        const hoyStr = this._ui.startDate || this._localDateStr();
        const fin = new Date(hoyStr + 'T12:00:00');
        fin.setDate(fin.getDate() + semanas * 7 - 1);
        const finStr = this._localDateStr(fin);

        const days = this._dateRange(hoyStr, finStr);
        const tag3Ids = this._tag3Ids();
        // Receptores válidos: TAG3 + tienda
        const receptoresValidos = new Set([...tag3Ids, '__TIENDA__']);

        // coverageByDay rastrea si ya hay cobertura de apertura/cierre entre llaves anteriores
        const coverageByDay = {};
        days.forEach(d => { coverageByDay[d] = { opens: false, closes: false }; });

        // holdersByDay se reconstruye antes de cada llave con el estado de TODAS las demás llaves.
        // Así, la primera llave ya ve quién porta las otras y no puede asignar a esa persona.
        const holdersByDay = {};
        days.forEach(d => { holdersByDay[d] = new Set(); });

        // planByLlave: guarda el plan ya optimizado de llaves anteriores
        const planByLlave = {};

        const plan = [];
        llaves.forEach((llave, idx) => {
            // Reconstruir holdersByDay excluyendo la llave actual (que va a re-optimizarse)
            days.forEach(d => { holdersByDay[d] = new Set(); });
            llaves.forEach(other => {
                if (other.id === llave.id) return;
                const otherPlan = planByLlave[other.id];
                if (otherPlan) {
                    // Llave ya optimizada: usar su plan nuevo
                    this._updateHoldersByDay(holdersByDay, other, otherPlan, days);
                } else {
                    // Llave aún no optimizada: usar su estado actual (manual + initial)
                    this._addInitialHoldersByDay(holdersByDay, other, days);
                }
            });

            const llavePlan = this._optimizarLlave(llave, idx, days, hoyStr, finStr, tag3Ids, receptoresValidos, coverageByDay, holdersByDay);
            plan.push(...llavePlan);
            planByLlave[llave.id] = llavePlan;
            this._updateCoverage(coverageByDay, llave, llavePlan, days);
        });

        return { plan, hoyStr, finStr, semanas, days };
    },


    // ─── COBERTURA ENTRE LLAVES ──────────────────────────────────────────────

    // Registra en holdersByDay el titular actual de una llave que AÚN NO se ha optimizado.
    // Usa el initial holder + traspasos manuales del rango (los auto se ignorarán al optimizar).
    _addInitialHoldersByDay: function(holdersByDay, llave, days) {
        const hoyStr = days[0];
        const finStr = days[days.length - 1];
        let holder = this._ui.initialHolders[llave.id] || this._getCurrentHolder(llave);
        const manualesEnRango = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.source !== 'auto' &&
            t.fecha >= hoyStr && t.fecha <= finStr
        ).sort((a, b) => a.fecha.localeCompare(b.fecha));
        let mi = 0;
        days.forEach(d => {
            while (mi < manualesEnRango.length && manualesEnRango[mi].fecha === d) {
                holder = manualesEnRango[mi].receptorId;
                mi++;
            }
            if (holdersByDay[d] && holder && holder !== '__TIENDA__') holdersByDay[d].add(holder);
        });
    },

    // Actualiza holdersByDay tras optimizar una llave: registra el titular de esa llave
    // por día para evitar que una persona acumule más de una llave a la vez.
    _updateHoldersByDay: function(holdersByDay, llave, llavePlan, days) {
        let holder = this._ui.initialHolders[llave.id] || this._getCurrentHolder(llave);
        const adds = llavePlan
            .filter(p => p.action === 'add')
            .sort((a, b) => a.traspaso.fecha.localeCompare(b.traspaso.fecha));
        let ai = 0;
        days.forEach(d => {
            while (ai < adds.length && adds[ai].traspaso.fecha === d) {
                holder = adds[ai].traspaso.receptorId;
                ai++;
            }
            if (holdersByDay[d] && holder && holder !== '__TIENDA__') holdersByDay[d].add(holder);
        });
    },

    // Actualiza coverageByDay tras optimizar una llave: recorre el plan resultante
    // y marca los días en que el titular de esa llave abre o cierra.
    _updateCoverage: function(coverageByDay, llave, llavePlan, days) {
        let holder = this._ui.initialHolders[llave.id] || this._getCurrentHolder(llave);
        const adds = llavePlan
            .filter(p => p.action === 'add')
            .sort((a, b) => a.traspaso.fecha.localeCompare(b.traspaso.fecha));
        let ai = 0;
        days.forEach(d => {
            while (ai < adds.length && adds[ai].traspaso.fecha === d) {
                holder = adds[ai].traspaso.receptorId;
                ai++;
            }
            if (!coverageByDay[d]) return;
            if (this._esOpener(holder, d)) coverageByDay[d].opens = true;
            if (this._esCloser(holder, d)) coverageByDay[d].closes = true;
        });
    },

    // ─── OPTIMIZADOR POR LLAVE ───────────────────────────────────────────────

    _optimizarLlave: function(llave, idx, days, hoyStr, finStr, tag3Ids, receptoresValidos, coverageByDay, holdersByDay) {

        // Traspasos auto en el rango — se calculan qué borrar DESPUÉS de generar el nuevo plan
        const autos = (App.data.traspasoLlaves || []).filter(t =>
            t.llaveId === llave.id && t.source === 'auto' &&
            t.fecha >= hoyStr && t.fecha <= finStr
        );

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
        // initialHolders del UI tiene prioridad; si no, traspasos manuales; si no, titular actual (autos incluidos)
        const titularInicial = this._ui.initialHolders[llave.id] ||
            (manualesAnteriores.length > 0 ? manualesAnteriores[0].receptorId : this._getCurrentHolder(llave));

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
                holders, receptoresValidos, openDays, llave, idx, coverageByDay, holdersByDay
            );
            toAdd.push(...transfers);
        });

        // Ancla de día 0: traspaso sin flecha (dadorId:null) para que el titular inicial
        // sea visible en el grid desde el primer día, aunque no haya transferencia.
        if (titularInicial && titularInicial !== '__TIENDA__') {
            const yaTransfiereDia0 = toAdd.some(t => t.traspaso.fecha === hoyStr);
            if (!yaTransfiereDia0) {
                toAdd.unshift({
                    action: 'add',
                    llave,
                    llaveIdx: idx,
                    traspaso: {
                        id: 'tr_anchor_' + llave.id + '_' + hoyStr,
                        llaveId: llave.id,
                        fecha: hoyStr,
                        dadorId: null,
                        receptorId: titularInicial,
                        source: 'auto',
                        creadoEn: new Date().toISOString()
                    }
                });
            }
        }

        // Eliminar todos los autos del rango (el nuevo plan los reemplaza completamente)
        const toDelete = autos
            .map(t => ({ action: 'del', llave, llaveIdx: idx, traspaso: t }));

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

    _dpSegmento: function(days, startHolder, requiredEnd, holders, receptoresValidos, openDays, llave, llaveIdx, coverageByDay, holdersByDay) {
        const n = days.length;
        const M = holders.length;
        const hIdx = {};
        holders.forEach((h, i) => { hIdx[h] = i; });

        // Precomputa holderConflictEnd[empId] = último índice de día (0-based) en que empId
        // aparece en holdersByDay (es decir, tiene asignada otra llave en ese tramo).
        // Regla: no se puede asignar esta llave a P si holderConflictEnd[P] >= i,
        // porque P tendría dos llaves simultáneas desde el día i en adelante.
        const holderConflictEnd = {};
        if (holdersByDay) {
            days.forEach((d, i) => {
                const set = holdersByDay[d];
                if (!set) return;
                set.forEach(empId => {
                    if (holderConflictEnd[empId] === undefined || holderConflictEnd[empId] < i) {
                        holderConflictEnd[empId] = i;
                    }
                });
            });
        }

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
                // No permitir que el receptor tenga otra llave activa desde el día 0 en adelante
                if (holderConflictEnd[holders[j]] !== undefined && holderConflictEnd[holders[j]] >= 0) continue;
                const coveragePenalty = (dador0Cierra && !this._esCloser(holders[j], days[0])) ? this.COVERAGE_PENALTY : 0;
                // R1: openPk/closePk en day+1 para día 0
                const cov0Next = (n > 1) ? (coverageByDay && coverageByDay[days[1]]) : null;
                const abierto0Next = (n > 1) && this._estaAbierta(days[1]);
                const openPk0  = (cov0Next && abierto0Next && !cov0Next.opens  && !this._esOpener(holders[j], days[1])) ? this.APERTURA_CIERRE_PENALTY : 0;
                const closePk0 = (cov0Next && abierto0Next && !cov0Next.closes && !this._esCloser(holders[j], days[1])) ? this.APERTURA_CIERRE_PENALTY : 0;
                const cost = this.TRANSFER_COST + this._idleCost(holders[j], days[0]) + coveragePenalty + openPk0 + closePk0;
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

                // Penalización de cobertura colectiva (otras llaves ya optimizadas)
                const cov     = coverageByDay && coverageByDay[days[i]];
                const covNext = (i + 1 < n) ? (coverageByDay && coverageByDay[days[i + 1]]) : null;
                const abierto = this._estaAbierta(days[i]);

                // Quedarse — __TIENDA__ solo válido si el día lo permite
                if (h === '__TIENDA__' && !this._tiendaValidaEnDia(i, days, openDays)) {
                    // no se puede quedar __TIENDA__ este día
                } else if (h !== '__TIENDA__' && holderConflictEnd[h] !== undefined && holderConflictEnd[h] >= i) {
                    // no puede quedarse: tiene otra llave activa en el día i o posteriores
                } else {
                    const openP  = (cov && abierto && !cov.opens  && !this._esOpener(h, days[i])) ? this.APERTURA_CIERRE_PENALTY : 0;
                    const closeP = (cov && abierto && !cov.closes && !this._esCloser(h, days[i])) ? this.APERTURA_CIERRE_PENALTY : 0;
                    // R2: racha inminente — si el titular no trabajará ≥2 días seguidos a partir de mañana,
                    // encarecemos quedarse hoy para que el DP prefiera traspasar antes de que se quede bloqueado.
                    const streak = this._idleStreakAhead(h, i, days);
                    const strandedPk = streak >= 2 ? streak : 0;
                    const stayC = prev[j] + this._idleCost(h, days[i]) + openP + closeP + strandedPk;
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
                        // No permitir que el receptor tenga otra llave activa desde el día i en adelante
                        if (holderConflictEnd[holders[k]] !== undefined && holderConflictEnd[holders[k]] >= i) continue;
                        // Penalizar traspaso que deja sin cierre (dador cierra, receptor no)
                        const coveragePenalty = (dadorCierra && !this._esCloser(holders[k], days[i])) ? this.COVERAGE_PENALTY : 0;
                        // R1: openPk/closePk en day+1 — el receptor tiene la llave a partir del día siguiente,
                        // así que comprobamos si cubrirá la apertura/cierre de ese primer día real.
                        const abiertoNext = (i + 1 < n) && this._estaAbierta(days[i + 1]);
                        const openPk  = (covNext && abiertoNext && !covNext.opens  && !this._esOpener(holders[k], days[i + 1])) ? this.APERTURA_CIERRE_PENALTY : 0;
                        const closePk = (covNext && abiertoNext && !covNext.closes && !this._esCloser(holders[k], days[i + 1])) ? this.APERTURA_CIERRE_PENALTY : 0;
                        const transC = prev[j] + this.TRANSFER_COST + this._idleCost(holders[k], days[i]) + coveragePenalty + openPk + closePk;
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

    _toggleOptimizer: function() {
        this._ui.optimizerCollapsed = !this._ui.optimizerCollapsed;
        const w = document.getElementById('llaves-optimizer-wrapper');
        if (w) w.innerHTML = this._renderPanel();
    },

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

    _resetearTodo: function() {
        if (!confirm('¿Borrar todos los traspasos de llaves? Esta acción no se puede deshacer.')) return;
        App.data.traspasoLlaves = [];
        Safe.save('v40_db', App.data);
        App.logic.checkAlerts();
        this._ui.plan = null;
        this._ui.days = [];
        this._ui.initialHolders = {};
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


    // ─── OPTIMIZAR DESDE UNA FILA ────────────────────────────────────────────

    _optimizarDesde: function(fecha) {
        this._ui.startDate = fecha;
        (App.data.config.llaves || []).forEach(l => {
            this._ui.initialHolders[l.id] = App.logic.getTitularLlave(l.id, fecha) || null;
        });
        this._rerender();
        setTimeout(() => {
            const panel = document.getElementById('llaves-optimizer-panel');
            if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
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

        // ── Sección de configuración del punto de partida ────────────────────
        const llaves = App.data.config.llaves || [];
        const tag3Ids = this._tag3Ids();
        const todayStr = this._localDateStr();
        const startDateVal = this._ui.startDate || todayStr;

        let holderSelects = '';
        llaves.forEach((llave, idx) => {
            const current = this._ui.initialHolders[llave.id] || this._getCurrentHolder(llave);
            const opts = ['__TIENDA__', ...tag3Ids].map(id =>
                '<option value="' + id + '"' + (id === current ? ' selected' : '') + '>' +
                this._empNombre(id) + '</option>'
            ).join('');
            holderSelects +=
                '<div style="display:flex;align-items:center;gap:5px;">' +
                    '<span style="font-size:0.75rem;color:#64748b;white-space:nowrap;">' + this._llaveLabel(llave, idx) + ':</span>' +
                    '<select onchange="App.llaves._ui.initialHolders[\'' + llave.id + '\']=this.value" ' +
                        'style="font-size:0.75rem;border:1px solid #e2e8f0;border-radius:5px;padding:2px 4px;max-width:110px;">' +
                        opts +
                    '</select>' +
                '</div>';
        });

        const configSection =
            '<div style="margin-top:10px;padding:8px 10px;background:#f1f5f9;border-radius:7px;' +
                'display:flex;gap:14px;flex-wrap:wrap;align-items:center;">' +
                '<div style="display:flex;align-items:center;gap:6px;">' +
                    '<span style="font-size:0.75rem;color:#64748b;font-weight:600;">Desde:</span>' +
                    '<input type="text" placeholder="DD/MM/AAAA" value="' + Utils.formatDateES(startDateVal) + '" ' +
                        'onchange="var v=Utils.parseDateES(this.value);if(v)App.llaves._ui.startDate=v;" ' +
                        'style="font-size:0.75rem;border:1px solid #e2e8f0;border-radius:5px;padding:2px 5px;width:96px;">' +
                '</div>' +
                '<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">' +
                    '<span style="font-size:0.75rem;color:#64748b;font-weight:600;">Titular inicial:</span>' +
                    holderSelects +
                '</div>' +
            '</div>';

        const capiImg = '<img id="capi-llaves" src="data:image/webp;base64,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" ' +
            'style="position:absolute;top:50%;left:50%;transform:translate(-50%,-36%);width:73px;height:73px;object-fit:contain;pointer-events:none;display:none;border-radius:10px;border:1.5px solid #cbd5e1;padding:3px;background:white;box-shadow:0 2px 8px rgba(0,0,0,0.1);">';

        // ── EN OBRAS ──────────────────────────────────────────────────────────────
        // El optimizador está temporalmente desactivado. Para reactivarlo:
        //   1. Borrar el return del panel "en obras" (líneas ~870-881).
        //   2. Descomentar el bloque REACTIVACIÓN de abajo (if optimizerCollapsed + return).
        //   3. El resto del método (panel expandido) ya funciona tal cual.
        // ── BLOQUE REACTIVACIÓN (descomentar completo al reimplantar) ─────────────
        // if (this._ui.optimizerCollapsed) {
        //     return '<div id="llaves-optimizer-panel" onclick="App.llaves._toggleOptimizer()" ' +
        //         'title="Abrir optimizador" ' +
        //         'style="position:relative;cursor:pointer;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;' +
        //         'padding:10px 18px;max-width:680px;margin:0 auto 20px;' +
        //         'display:flex;align-items:center;gap:12px;opacity:0.65;transition:opacity .15s;" ' +
        //         'onmousedown="document.getElementById(\'capi-llaves\').style.display=\'block\'" ' +
        //         'onmouseup="document.getElementById(\'capi-llaves\').style.display=\'none\'" ' +
        //         'onmouseenter="this.style.opacity=\'1\'" ' +
        //         'onmouseleave="this.style.opacity=\'0.65\';document.getElementById(\'capi-llaves\').style.display=\'none\'">' +
        //         capiImg +
        //         '<span style="font-size:0.82rem;font-weight:600;color:#64748b;">Optimizador de llaves</span>' +
        //         '<span style="font-size:0.72rem;color:#94a3b8;margin-left:auto;">clic para abrir</span>' +
        //     '</div>';
        // }
        // ─────────────────────────────────────────────────────────────────────────
        return '<div id="llaves-optimizer-panel" ' +
            'title="Optimizador en obras" ' +
            'style="position:relative;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;' +
            'padding:10px 18px;max-width:680px;margin:0 auto 20px;' +
            'display:flex;align-items:center;gap:12px;opacity:0.5;cursor:default;" ' +
            'onmousedown="document.getElementById(\'capi-llaves\').style.display=\'block\'" ' +
            'onmouseup="document.getElementById(\'capi-llaves\').style.display=\'none\'" ' +
            'onmouseleave="document.getElementById(\'capi-llaves\').style.display=\'none\'">' +
            capiImg +
            '<span style="font-size:0.82rem;font-weight:600;color:#64748b;">Optimizador de llaves</span>' +
            '<span style="font-size:0.72rem;color:#94a3b8;margin-left:auto;">🚧 en obras</span>' +
        '</div>';

        return '<div id="llaves-optimizer-panel" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;' +
                    'padding:14px 18px;max-width:680px;margin:0 auto 20px;">' +
                '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;">' +
                    '<div style="display:flex;align-items:center;gap:8px;">' +
                        '<button onclick="App.llaves._toggleOptimizer()" title="Colapsar" ' +
                            'style="background:none;border:none;cursor:pointer;padding:2px;color:#94a3b8;line-height:1;">' +
                            '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="2" y1="8" x2="14" y2="8"/></svg>' +
                        '</button>' +
                        '<span style="font-size:0.88rem;font-weight:700;color:#1e293b;">🔑 Optimizador de llaves</span>' +
                    '</div>' +
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
                configSection +
                planHTML +
                '<div style="margin-top:12px;padding-top:10px;border-top:1px solid #e2e8f0;">' +
                    '<button onclick="App.llaves._resetearTodo()" ' +
                        'style="padding:4px 12px;border-radius:6px;border:1px solid #fca5a5;background:white;color:#dc2626;font-size:0.75rem;font-weight:600;cursor:pointer;">' +
                        'Resetear todos los traspasos' +
                    '</button>' +
                '</div>' +
            '</div>';
    }
};
