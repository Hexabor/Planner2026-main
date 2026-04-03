// ============================================================
// LÓGICA: Historial Undo/Redo, migrateData, bloqueo de días
// ============================================================

App.logic = {
        migrateData: function() {
            // Backward compatibility for older backups (e.g., meta.ver 40.x)
            if(!App.data || typeof App.data !== 'object') return;
            if(!App.data.meta) App.data.meta = { ver: 'unknown' };
            if(!App.data.config) App.data.config = { weekStart: '', stdHours: 0, colors: {} };
            if(!Array.isArray(App.data.empleados)) App.data.empleados = [];
            if(!Array.isArray(App.data.shiftDefs)) App.data.shiftDefs = [];
            if(!Array.isArray(App.data.fixedShifts)) App.data.fixedShifts = [];
            // Garantizar que el turno fijo DH (Devolución de Horas) existe y está justo antes de V
            const dhDef = { id: 'fixed_DH', code: 'DH', desc: 'Devolución de horas', start: '', end: '', color: '#22c55e', fixed: true };
            const existingDH = App.data.fixedShifts.findIndex(s => s.id === 'fixed_DH');
            if(existingDH >= 0) App.data.fixedShifts.splice(existingDH, 1); // quitar de donde esté
            const vPos = App.data.fixedShifts.findIndex(s => s.id === 'fixed_V');
            if(vPos >= 0) App.data.fixedShifts.splice(vPos, 0, dhDef); // insertar antes de V
            else App.data.fixedShifts.push(dhDef); // fallback: al final
            if(!Array.isArray(App.data.requests)) App.data.requests = [];
            if(!Array.isArray(App.data.recurringRequests)) App.data.recurringRequests = [];
            if(!App.data.schedule || typeof App.data.schedule !== 'object') App.data.schedule = {};
            if(!App.data.storeConfig) App.data.storeConfig = { base: {}, special: [], holidays: [] };

            // shiftDefs: ensure breakStart/breakEnd exist; support legacy `break` (minutes)
            const _getMin = (t)=>{ if(!t) return 0; const parts=String(t).split(':'); if(parts.length<2) return 0; const h=Number(parts[0]); const m=Number(parts[1]); return (Number.isFinite(h)?h:0)*60 + (Number.isFinite(m)?m:0); };
            const _spanMin = (start,end)=>{ if(!start||!end) return 0; let total=_getMin(end)-_getMin(start); if(total<0) total+=24*60; return total; };
            
            for(const sd of App.data.shiftDefs) {
                if(!sd || typeof sd !== 'object') continue;
                if(sd.breakStart == null) sd.breakStart = '';
                if(sd.breakEnd == null) sd.breakEnd = '';
                if(sd.break != null) {
                    const n = Number(sd.break);
                    sd.break = Number.isFinite(n) ? n : 0;

                    // Compat 40.x: if legacy break minutes exist but the shift span is already <= 8h
                    // (common in some older configs), we assume start/end are net working time and avoid subtracting.
                    if(!sd.breakStart && !sd.breakEnd && sd.break > 0) {
                        const span = _spanMin(sd.start, sd.end);
                        if(span > 0 && span <= 8*60) sd.break = 0;
                    }
                }
            }

            // schedule: normalize custom shift objects
            for(const date of Object.keys(App.data.schedule)) {
                const dayMap = App.data.schedule[date];
                if(!dayMap || typeof dayMap !== 'object') continue;
                for(const empId of Object.keys(dayMap)) {
                    const v = dayMap[empId];
                    if(v && typeof v === 'object' && !Array.isArray(v)) {
                        if(v.breakStart == null) v.breakStart = '';
                        if(v.breakEnd == null) v.breakEnd = '';
                        if(v.break != null) {
                            const n = Number(v.break);
                            v.break = Number.isFinite(n) ? n : 0;
                            if(!v.breakStart && !v.breakEnd && v.break > 0) {
                                const span = _spanMin(v.start, v.end);
                                if(span > 0 && span <= 8*60) v.break = 0;
                            }
                        }
                    }
                }
            }

            // Migración: re-sincronizar fechaInicio/fechaFin desde contratos
            (App.data.empleados || []).forEach(emp => {
                if(emp.contratos && emp.contratos.length > 0) {
                    emp.fechaInicio = emp.contratos[0].desde;
                    const ult = emp.contratos[emp.contratos.length - 1];
                    emp.fechaFin = ult.hasta || null;
                }
            });
        },
        // ═══════════════════════════════════════════════════════════
        // SISTEMA UNDO/REDO
        // ═══════════════════════════════════════════════════════════
        
        saveSnapshot: function(description) {
        if (App.uiState.isRestoringHistory) {
                console.log('📸 Skipping snapshot during history restoration:', description);
                return;
            }
            console.log('📸 Guardando snapshot:', description);
            
            // Crear snapshot profundo de los datos importantes
            const snapshot = {
                timestamp: Date.now(),
                description: description || 'Cambio',
                data: {
                    empleados: JSON.parse(JSON.stringify(App.data.empleados)),
                    schedule: JSON.parse(JSON.stringify(App.data.schedule)),
                    shiftDefs: JSON.parse(JSON.stringify(App.data.shiftDefs)),
                    requests: JSON.parse(JSON.stringify(App.data.requests)),
                    recurringRequests: JSON.parse(JSON.stringify(App.data.recurringRequests || [])),
                    storeConfig: JSON.parse(JSON.stringify(App.data.storeConfig)),
                    lockedDays: JSON.parse(JSON.stringify(App.data.lockedDays || {}))
                }
            };
            
            // Si estamos en medio del historial (después de hacer undo), eliminar el futuro
            if (App.uiState.historyIndex < App.uiState.history.length - 1) {
                const eliminados = App.uiState.history.length - 1 - App.uiState.historyIndex;
                console.log(`  Eliminando ${eliminados} snapshot(s) del futuro`);
                App.uiState.history = App.uiState.history.slice(0, App.uiState.historyIndex + 1);
            }
            
            // Añadir snapshot
            App.uiState.history.push(snapshot);
            App.uiState.historyIndex = App.uiState.history.length - 1;
            
            // Limitar tamaño del historial
            if (App.uiState.history.length > App.uiState.maxHistory) {
                console.log(`  Eliminando snapshot más antiguo (límite: ${App.uiState.maxHistory})`);
                App.uiState.history.shift();
                App.uiState.historyIndex--;
            }
            
            this.updateUndoRedoButtons();
            console.log(`  ✅ Snapshot #${App.uiState.historyIndex + 1}/${App.uiState.history.length}: "${description}"`);
        },
        
                undo: function() {
            console.log('=== UNDO INICIADO ===');
            console.log('historyIndex:', App.uiState.historyIndex);
            console.log('history.length:', App.uiState.history.length);

            if (App.uiState.historyIndex <= 0) {
                console.log('⚠️ No hay nada que deshacer');
                return;
            }

            try {
                App.uiState.isRestoringHistory = true;

                App.uiState.historyIndex--;
                const snapshot = App.uiState.history[App.uiState.historyIndex];

                console.log('Restaurando snapshot:', snapshot.description);
                console.log('Timestamp:', new Date(snapshot.timestamp).toLocaleString());

                // Restaurar datos
                App.data.empleados = JSON.parse(JSON.stringify(snapshot.data.empleados));
                App.data.schedule = JSON.parse(JSON.stringify(snapshot.data.schedule));
                App.data.shiftDefs = JSON.parse(JSON.stringify(snapshot.data.shiftDefs));
                App.data.requests = JSON.parse(JSON.stringify(snapshot.data.requests));
                App.data.recurringRequests = JSON.parse(JSON.stringify(snapshot.data.recurringRequests || []));
                App.data.storeConfig = JSON.parse(JSON.stringify(snapshot.data.storeConfig));

                console.log('Datos restaurados');

                // Guardar en localStorage
                Safe.save('v40_db', App.data);
                console.log('Guardado en localStorage');

                // Re-renderizar
                const currentRoute = App.router.current();
                console.log('currentRoute:', currentRoute);

                if (currentRoute === 'import' || currentRoute === 'export') {
                    console.log('Redirigiendo a planificador...');
                    App.router.go('planificador');
                } else if (typeof App.router.refreshCurrent === 'function') {
                    console.log('Refrescando vista actual (sin navegar)...');
                    App.router.refreshCurrent();
                } else {
                    console.log('Re-renderizando vista actual...');
                    App.router.go(currentRoute);
                }

                console.log(`⟲ Deshacer: ${snapshot.description}`);
                console.log('=== UNDO COMPLETADO ===');
            } finally {
                App.uiState.isRestoringHistory = false;
                this.updateUndoRedoButtons();
            }
        },
        
                redo: function() {
            console.log('=== REDO INICIADO ===');
            console.log('historyIndex:', App.uiState.historyIndex);
            console.log('history.length:', App.uiState.history.length);

            if (App.uiState.historyIndex >= App.uiState.history.length - 1) {
                console.log('⚠️ No hay nada que rehacer');
                return;
            }

            try {
                App.uiState.isRestoringHistory = true;

                App.uiState.historyIndex++;
                const snapshot = App.uiState.history[App.uiState.historyIndex];

                console.log('Restaurando snapshot:', snapshot.description);
                console.log('Timestamp:', new Date(snapshot.timestamp).toLocaleString());

                // Restaurar datos
                App.data.empleados = JSON.parse(JSON.stringify(snapshot.data.empleados));
                App.data.schedule = JSON.parse(JSON.stringify(snapshot.data.schedule));
                App.data.shiftDefs = JSON.parse(JSON.stringify(snapshot.data.shiftDefs));
                App.data.requests = JSON.parse(JSON.stringify(snapshot.data.requests));
                App.data.recurringRequests = JSON.parse(JSON.stringify(snapshot.data.recurringRequests || []));
                App.data.storeConfig = JSON.parse(JSON.stringify(snapshot.data.storeConfig));

                console.log('Datos restaurados');

                // Guardar en localStorage
                Safe.save('v40_db', App.data);
                console.log('Guardado en localStorage');

                // Re-renderizar
                const currentRoute = App.router.current();
                console.log('currentRoute:', currentRoute);

                if (currentRoute === 'import' || currentRoute === 'export') {
                    console.log('Redirigiendo a planificador...');
                    App.router.go('planificador');
                } else if (typeof App.router.refreshCurrent === 'function') {
                    console.log('Refrescando vista actual (sin navegar)...');
                    App.router.refreshCurrent();
                } else {
                    console.log('Re-renderizando vista actual...');
                    App.router.go(currentRoute);
                }

                console.log(`⟳ Rehacer: ${snapshot.description}`);
                console.log('=== REDO COMPLETADO ===');
            } finally {
                App.uiState.isRestoringHistory = false;
                this.updateUndoRedoButtons();
            }
        },
        
        updateUndoRedoButtons: function() {
            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');
            
            const inPlanner = App.router.current() === 'planificador';
            const canUndo = inPlanner && App.uiState.historyIndex > 0;
            const canRedo = inPlanner && App.uiState.historyIndex < App.uiState.history.length - 1;
            
            if (undoBtn) {
                undoBtn.disabled = !canUndo;
                undoBtn.style.opacity = canUndo ? '1' : '0.3';
                undoBtn.style.cursor = canUndo ? 'pointer' : 'not-allowed';
                undoBtn.title = inPlanner ? (canUndo ? 'Deshacer (Ctrl+Z)' : 'Nada que deshacer') : 'Solo disponible en el planificador';
            }
            
            if (redoBtn) {
                redoBtn.disabled = !canRedo;
                redoBtn.style.opacity = canRedo ? '1' : '0.3';
                redoBtn.style.cursor = canRedo ? 'pointer' : 'not-allowed';
                redoBtn.title = inPlanner ? (canRedo ? 'Rehacer (Ctrl+Y)' : 'Nada que rehacer') : 'Solo disponible en el planificador';
            }
        },
        
        // GESTIÓN DE MODO DE DRAG (Editar / Intercambiar)
        getCurrentDragMode: function() {
            return App.uiState.tempDragMode || App.uiState.dragMode;
        },
        
        setDragMode: function(mode) {
            App.uiState.dragMode = mode;
            this.updateDragModeUI();
            // Guardar preferencia
            Safe.save('v40_db', App.data);
        },
        
        updateDragModeUI: function() {
            const currentMode = this.getCurrentDragMode();
            const editBtn = document.getElementById('mode-edit-btn');
            const swapBtn = document.getElementById('mode-swap-btn');
            if(!editBtn || !swapBtn) return;
            const _active = 'background:#2563eb; color:white;';
            const _inactive = 'background:#f1f5f9; color:#64748b;';
            const _base = 'width:100%; padding:5px 4px; border:none; border-radius:6px; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:2px; transition:all 0.15s; ';
            editBtn.style.cssText = _base + (currentMode === 'edit' ? _active : _inactive);
            swapBtn.style.cssText = _base + (currentMode === 'swap' ? _active : _inactive);
        },
        
        _weekStateRowHTML: function(monday) {
            const ws = this.getWeekState(monday);
            const isClosed = ws === 'closed';
            const trackCls = isClosed ? 'closed' : 'open';
            const lblCls = isClosed ? 'is-closed' : '';
            const lblTxt = isClosed ? 'Cerrada' : 'Abierta';
            const title = isClosed ? 'Desbloquear semana' : 'Cerrar/bloquear semana';
            const borderColor = isClosed ? '#bfdbfe' : '#e2e8f0';
            const bgColor = isClosed ? '#eff6ff' : '#f8fafc';
            return '<div style="display:flex; flex-direction:column; align-items:center; gap:3px; padding:5px 10px; border:1px solid ' + borderColor + '; border-radius:8px; background:' + bgColor + '; min-width:72px; width:72px; box-sizing:border-box;">'
                 + '<div style="transform:scale(0.75); transform-origin:center center;">'
                 + '<button type="button" id="week-lock-btn" class="week-lock-track ' + trackCls + '"'
                 + ' data-monday="' + monday + '"'
                 + ' onclick="App.logic.toggleWeekLock(this.dataset.monday)"'
                 + ' title="' + title + '">'
                 + '<div class="week-lock-thumb"></div></button>'
                 + '</div>'
                 + '<span id="week-lock-label" class="week-lock-label ' + lblCls + '"'
                 + ' style="font-size:0.55rem; font-weight:800; text-transform:uppercase; letter-spacing:0.03em; cursor:help;"'
                 + ' onmouseenter="const r=this.getBoundingClientRect();const t=document.getElementById(\'wk-info-tip\');t.style.left=r.left+\'px\';t.style.top=(r.bottom+4)+\'px\';t.style.display=\'block\';"'
                 + ' onmouseleave="document.getElementById(\'wk-info-tip\').style.display=\'none\';">' + lblTxt + '</span>'
                 + '</div>';
        },

        // ── BLOQUEO DE DÍAS ──────────────────────────────────────────────────
        // lockedDays: { "YYYY-MM-DD": true } — granularidad por día
        // El estado de semana se deriva: todos bloqueados→cerrada, alguno→parcial, ninguno→vacía/abierta

        isDayLocked: function(date) {
            return !!(App.data.lockedDays && App.data.lockedDays[date]);
        },

        getWeekState: function(monday) {
            const days = Utils.getWeekDays(monday);
            const locked = App.data.lockedDays || {};
            const allLocked = days.every(d => locked[d]);
            if (allLocked) return 'closed';
            // ¿Tiene algún turno asignado?
            let hasAny = days.some(d => {
                const dd = App.data.schedule[d];
                return dd && Object.keys(dd).length > 0;
            });
            // ¿Tiene algún día bloqueado aunque no todos?
            const someBlocked = days.some(d => locked[d]);
            return (hasAny || someBlocked) ? 'partial' : 'empty';
        },

        toggleWeekLock: function(monday) {
            if (!App.data.lockedDays) App.data.lockedDays = {};
            const days = Utils.getWeekDays(monday);
            const allLocked = days.every(d => App.data.lockedDays[d]);
            if (allLocked) {
                // Desbloquear todos — sin validación de llaves
                days.forEach(d => delete App.data.lockedDays[d]);
            } else {
                // ANTES DE BLOQUEAR: comprobar cobertura de llaves
                const hasLlaves = App.data.config.llavesActivo && App.data.config.llaves && App.data.config.llaves.length > 0;
                const hasKeyHolders = App.data.config.llavesActivo && App.data.empleados.some(e => e.llaveId);
                if(hasLlaves || hasKeyHolders) {
                    const issues = [];
                    days.forEach(date => {
                        const cov = App.logic._checkKeysCoverageDay(date);
                        if(!cov) return;
                        if(!cov.hasApertura) issues.push(`${Utils.formatDateES(date)} · apertura (${cov.horario.open}) sin portador de llave`);
                        if(!cov.hasCierre)   issues.push(`${Utils.formatDateES(date)} · cierre (${cov.horario.close}) sin portador de llave`);
                    });
                    if(issues.length > 0) {
                        const lista = issues.map(i => `• ${i}`).join('\n');
                        const ok = confirm(`🔑 Cobertura de llaves incompleta\n\n${lista}\n\n¿Cerrar la semana de todas formas?`);
                        if(!ok) return;
                    }
                }
                // Bloquear todos
                days.forEach(d => App.data.lockedDays[d] = true);
            }
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.ui.renderPlanner(document.getElementById('main-view'));
            const insp = document.getElementById('inspector-content');
            if(insp) App.ui.renderPlannerInspector(insp);
        },

        toggleDayLock: function(date) {
            if (!App.data.lockedDays) App.data.lockedDays = {};
            if (App.data.lockedDays[date]) {
                delete App.data.lockedDays[date];
            } else {
                App.data.lockedDays[date] = true;
            }
            // Recalcular monday para actualizar UI de semana
            const monday = Utils.getMonday(date);
            Safe.save('v40_db', App.data);
            App.logic.checkAlerts();
            App.ui.renderPlanner(document.getElementById('main-view'));
        },

        _refreshWeekStateUI: function(monday) {
            // Actualización quirúrgica por IDs — sin re-render completo
            const ws = this.getWeekState(monday);
            const isClosed = ws === 'closed';
            const dotCls = ws === 'empty' ? 'dot-empty' : ws === 'partial' ? 'dot-partial' : 'dot-closed';
            const badgeCls = ws === 'empty' ? 'badge-empty' : ws === 'partial' ? 'badge-partial' : 'badge-closed';
            const badgeLbl = ws === 'empty' ? 'Vacía' : ws === 'partial' ? 'Parcial' : 'Cerrada';

            // Badge: reconstruir innerHTML (dot + texto)
            const badge = document.getElementById('week-state-badge');
            if (badge) {
                badge.className = 'week-state-badge ' + badgeCls;
                badge.innerHTML = '<span class="week-state-dot ' + dotCls + '"></span>' + badgeLbl;
            }
            const btn = document.getElementById('week-lock-btn');
            if (btn) {
                btn.className = 'week-lock-track ' + (isClosed ? 'closed' : 'open');
                btn.title = isClosed ? 'Desbloquear semana' : 'Cerrar/bloquear semana';
            }
            const lbl = document.getElementById('week-lock-label');
            if (lbl) {
                lbl.className = 'week-lock-label' + (isClosed ? ' is-closed' : '');
                lbl.textContent = isClosed ? 'Cerrada' : 'Abierta';
            }
        }
};
