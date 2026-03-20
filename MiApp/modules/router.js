// ============================================================
// ROUTER — Navegación entre vistas
// ============================================================

App.router = {
        currentRoute: 'planificador', // Guardar ruta actual
        
        current: function() {
            return this.currentRoute;
        },

        // Re-renderiza la vista activa sin resetear selectedId ni el inspector.
        // Usado por undo/redo para reflejar cambios de datos sin efectos colaterales.
        refreshCurrent: function() {
            const v = this.currentRoute;
            const main = document.getElementById('main-view');
            const inspectorContent = document.getElementById('inspector-content');

            if(v === 'planificador') {
                App.ui.renderPlanner(main);
                App.ui.renderPlannerInspector(inspectorContent);
            } else {
                // Re-renderizar el main-scroll preservando el selectedId
                const existingScroll = main.querySelector('.main-scroll');
                if(existingScroll) {
                    existingScroll.innerHTML = '';
                    if(v === 'home')         App.ui.renderHome(existingScroll);
                    else if(v === 'empleados')    App.ui.renderEmp(existingScroll);
                    else if(v === 'tienda')       App.ui.renderCalendario(existingScroll);
                    else if(v === 'requests')     App.ui.renderRequests(existingScroll);
                    else if(v === 'shifts')       App.ui.renderShifts(existingScroll);
                    else if(v === 'export')       App.ui.renderExport(existingScroll);
                    else if(v === 'import')       App.ui.renderImport(existingScroll);
                    else if(v === 'config')       App.ui.renderConfig(existingScroll);
                    else if(v === 'alerts')       App.ui.renderAlerts(existingScroll);
                    else if(v === 'analisis')     App.ui.renderAnalisis(existingScroll);
                    else if(v === 'presentacion') App.ui.renderPresentacion(existingScroll);
                    else if(v === 'calendario')   App.ui.renderCalendario(existingScroll);
                } else {
                    // Fallback: navegación completa si no existe el contenedor
                    this.go(v);
                    return;
                }
                // Re-renderizar inspector si hay algo seleccionado
                if(App.uiState.selectedId) {
                    if(v === 'empleados') App.ui.renderEmpInspector(App.uiState.selectedId);
                    else if(v === 'shifts') App.ui.renderShiftInspector(App.uiState.selectedId);
                    else if(v === 'requests') App.ui.renderReqInspector(App.uiState.selectedId);
                }
            }
            App.logic.checkAlerts();
            if(window.lucide) setTimeout(()=>lucide.createIcons(), 10);
        },
        
        go: function(v) {
            this.currentRoute = v; // Guardar ruta actual
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            const map = { 'home':'nav-home', 'planificador':'nav-plan', 'empleados':'nav-emp', 'requests':'nav-req', 'shifts':'nav-shifts', 'export':'nav-export', 'import':'nav-import', 'config':'nav-config', 'alerts':'nav-alerts', 'analisis':'nav-analisis', 'presentacion':'nav-presentacion', 'calendario':'nav-calendario' };
            if(map[v]) document.getElementById(map[v]).classList.add('active');
            const main = document.getElementById('main-view');
            const inspector = document.getElementById('inspector');
            const inspectorContent = document.getElementById('inspector-content');
            main.className = 'main'; main.innerHTML = '';
            App.uiState.selectedId = null; App.ui.inspectorEmpty();
            
            // Ocultar inspector en vistas que no lo necesitan
            const hideInspector = ['home', 'tienda', 'config', 'alerts', 'export', 'import', 'analisis', 'presentacion', 'calendario', 'changelog'].includes(v);
            inspector.style.display = hideInspector ? 'none' : 'flex';
            main.style.gridColumn = hideInspector ? '2 / span 2' : '2';
            if(!hideInspector) setTimeout(scaleInspector, 20);
            
            if(v === 'planificador') { 
                App.ui.renderPlanner(main); 
                App.ui.renderPlannerInspector(inspectorContent);
            } else {
                const div = document.createElement('div'); div.className = 'main-scroll'; main.appendChild(div);
                if(v === 'home') App.ui.renderHome(div);
                else if(v === 'empleados') App.ui.renderEmp(div);
                else if(v === 'tienda') { App.uiState.calendarioUi = App.uiState.calendarioUi || {}; App.uiState.calendarioUi.tab = 'tienda'; App.router.go('calendario'); return; }
                else if(v === 'requests') App.ui.renderRequests(div);
                else if(v === 'shifts') App.ui.renderShifts(div);
                else if(v === 'export') App.ui.renderExport(div);
                else if(v === 'import') App.ui.renderImport(div);
                else if(v === 'config') App.ui.renderConfig(div);
                else if(v === 'alerts') App.ui.renderAlerts(div);
                else if(v === 'analisis') App.ui.renderAnalisis(div);
                else if(v === 'presentacion') App.ui.renderPresentacion(div);
                else if(v === 'calendario') App.ui.renderCalendario(div);
                else if(v === 'changelog')  App.ui.renderChangelog(div);
            }
            App.logic.checkAlerts();
            App.logic.updateUndoRedoButtons();
        }
    };
