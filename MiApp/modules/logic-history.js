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
            if(!Array.isArray(App.data.requests)) App.data.requests = [];
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
        },
        // ═══════════════════════════════════════════════════════════
        // SISTEMA UNDO/REDO — patrón dos pilas
        //
        // undoStack (App.uiState.history): estados a los que se puede volver
        // redoStack (App.uiState.redoStack): estados a los que se puede avanzar
        //
        // saveSnapshot() guarda el estado ACTUAL en undoStack y vacía redoStack.
        // undo() mueve estado actual → redoStack, restaura tope de undoStack.
        // redo() mueve estado actual → undoStack, restaura tope de redoStack.
        // ═══════════════════════════════════════════════════════════

        _captureData: function() {
            return {
                timestamp: Date.now(),
                empleados:  JSON.parse(JSON.stringify(App.data.empleados)),
                schedule:   JSON.parse(JSON.stringify(App.data.schedule)),
                shiftDefs:  JSON.parse(JSON.stringify(App.data.shiftDefs)),
                requests:   JSON.parse(JSON.stringify(App.data.requests)),
                storeConfig:JSON.parse(JSON.stringify(App.data.storeConfig)),
                lockedDays: JSON.parse(JSON.stringify(App.data.lockedDays || {}))
            };
        },

        _restoreData: function(snap) {
            App.data.empleados   = JSON.parse(JSON.stringify(snap.empleados));
            App.data.schedule    = JSON.parse(JSON.stringify(snap.schedule));
            App.data.shiftDefs   = JSON.parse(JSON.stringify(snap.shiftDefs));
            App.data.requests    = JSON.parse(JSON.stringify(snap.requests));
            App.data.storeConfig = JSON.parse(JSON.stringify(snap.storeConfig));
            App.data.lockedDays  = JSON.parse(JSON.stringify(snap.lockedDays || {}));
        },

        _refreshView: function() {
            const route = App.router.current();
            if (route === 'import' || route === 'export') {
                App.router.go('planificador');
            } else if (typeof App.router.refreshCurrent === 'function') {
                App.router.refreshCurrent();
            } else {
                App.router.go(route);
            }
        },

        saveSnapshot: function(description) {
            if (App.uiState.isRestoringHistory) return;

            // Inicializar redoStack si no existe (compatibilidad con uiState antiguo)
            if (!Array.isArray(App.uiState.redoStack)) App.uiState.redoStack = [];

            const snap = this._captureData();
            snap.description = description || 'Cambio';

            // Nueva acción → limpiar redo
            App.uiState.redoStack = [];

            App.uiState.history.push(snap);

            // Limitar tamaño
            if (App.uiState.history.length > App.uiState.maxHistory) {
                App.uiState.history.shift();
            }

            // historyIndex se mantiene por compatibilidad con código externo que lo lea
            App.uiState.historyIndex = App.uiState.history.length - 1;

            this.updateUndoRedoButtons();
            console.log(`📸 Snapshot "${description}" — undo:${App.uiState.history.length} redo:0`);
        },

        undo: function() {
            if (!Array.isArray(App.uiState.redoStack)) App.uiState.redoStack = [];
            if (App.uiState.history.length === 0) return;

            try {
                App.uiState.isRestoringHistory = true;

                const current = this._captureData();
                const currentSchedule = JSON.stringify(current.schedule);

                // Si el tope del historial es idéntico al estado actual,
                // significa que saveSnapshot fue llamado DESPUÉS del cambio:
                // ese snapshot no es el estado "anterior" real, sino el mismo.
                // Lo descartamos y usamos el que hay debajo.
                let snap = App.uiState.history.pop();
                if (JSON.stringify(snap.schedule) === currentSchedule) {
                    if (App.uiState.history.length === 0) {
                        // No hay estado anterior real, revertir y salir
                        App.uiState.history.push(snap);
                        return;
                    }
                    snap = App.uiState.history.pop();
                }

                App.uiState.redoStack.push(current);
                App.uiState.historyIndex = App.uiState.history.length - 1;

                this._restoreData(snap);
                Safe.save('v40_db', App.data);
                this._refreshView();

                console.log(`⟲ Deshacer: "${snap.description}" — undo:${App.uiState.history.length} redo:${App.uiState.redoStack.length}`);
            } finally {
                App.uiState.isRestoringHistory = false;
                this.updateUndoRedoButtons();
            }
        },

        redo: function() {
            if (!Array.isArray(App.uiState.redoStack)) App.uiState.redoStack = [];
            if (App.uiState.redoStack.length === 0) return;

            try {
                App.uiState.isRestoringHistory = true;

                // Guardar estado actual en undoStack
                const current = this._captureData();
                current.description = 'undo';
                App.uiState.history.push(current);
                App.uiState.historyIndex = App.uiState.history.length - 1;

                // Restaurar tope de redoStack
                const snap = App.uiState.redoStack.pop();

                this._restoreData(snap);
                Safe.save('v40_db', App.data);
                this._refreshView();

                console.log(`⟳ Rehacer — undo:${App.uiState.history.length} redo:${App.uiState.redoStack.length}`);
            } finally {
                App.uiState.isRestoringHistory = false;
                this.updateUndoRedoButtons();
            }
        },

        updateUndoRedoButtons: function() {
            if (!Array.isArray(App.uiState.redoStack)) App.uiState.redoStack = [];

            const undoBtn = document.getElementById('undo-btn');
            const redoBtn = document.getElementById('redo-btn');

            const inPlanner = App.router.current() === 'planificador';
            const canUndo = inPlanner && App.uiState.history.length > 0;
            const canRedo = inPlanner && App.uiState.redoStack.length > 0;

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
            
            // Limpiar clases
            editBtn.classList.remove('active', 'temp');
            swapBtn.classList.remove('active', 'temp');
            
            // Aplicar clase activa
            if(currentMode === 'edit') {
                editBtn.classList.add('active');
            } else if(currentMode === 'swap') {
                swapBtn.classList.add('active');
                // Si es temporal (Ctrl), añadir animación
                if(App.uiState.tempDragMode === 'swap') {
                    swapBtn.classList.add('temp');
                }
            }
        },
        
        _weekStateRowHTML: function(monday) {
            const ws = this.getWeekState(monday);
            const isClosed = ws === 'closed';
            const trackCls = isClosed ? 'closed' : 'open';
            const lblCls = isClosed ? 'is-closed' : '';
            const lblTxt = isClosed ? 'Cerrada' : 'Abierta';
            const title = isClosed ? 'Desbloquear semana' : 'Cerrar/bloquear semana';
            return '<button type="button" class="week-lock-track ' + trackCls + '"'
                 + ' data-monday="' + monday + '"'
                 + ' onclick="App.logic.toggleWeekLock(this.dataset.monday)"'
                 + ' title="' + title + '">'
                 + '<div class="week-lock-thumb"></div></button>'
                 + '<span class="week-lock-label ' + lblCls + '">' + lblTxt + '</span>';
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
                // Desbloquear todos
                days.forEach(d => delete App.data.lockedDays[d]);
            } else {
                // Bloquear todos
                days.forEach(d => App.data.lockedDays[d] = true);
            }
            Safe.save('v40_db', App.data);
            App.ui.renderPlanner(document.getElementById('main-view'));
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
