// ============================================================
// DATOS PRINCIPALES Y ESTADO DE LA APLICACIÓN
// ============================================================

const App = {
    data: {
        meta: { ver: "41.93" },
        config: { weekStart: "2025-12-29", stdHours: 1800 }, 
        empleados: [], requests: [], recurringRequests: [], storeConfig: { base: {}, special: [], holidays: [] },
        fixedShifts: [
            { id: "fixed_L", code: "L", desc: "Libre", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_F", code: "F", desc: "Festivo", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_R", code: "R", desc: "Recuperación", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_V", code: "V", desc: "Vacaciones", start: "", end: "", color: "#a855f7", fixed: true },
            { id: "fixed_B", code: "B", desc: "Baja médica", start: "", end: "", color: "#ef4444", fixed: true },
            { id: "fixed_P", code: "P", desc: "Permiso", start: "", end: "", color: "#ec4899", fixed: true }
        ],
        shiftDefs: [
            { id: "s1", code: "M8", desc: "Mañana", start: "10:00", end: "18:00", breakStart: "", breakEnd: "", color: "#7dd3fc", customOrder: 0 },
            { id: "s2", code: "T8", desc: "Tarde", start: "14:00", end: "22:00", breakStart: "", breakEnd: "", color: "#fb923c", customOrder: 1 },
            { id: "s3", code: "P8", desc: "Partido 8h", start: "10:00", end: "20:00", breakStart: "14:00", breakEnd: "16:00", color: "#ec4899", customOrder: 2 }
        ],
        schedule: {},
        lockedDays: {}  // { "YYYY-MM-DD": true } — días bloqueados individualmente
    },
    uiState: { 
        selectedId: null, 
        currentDate: (() => {
            const today = Utils.getMonday(new Date());
            const MIN = new Date("2025-12-29");
            const MAX = new Date("2027-03-02");
            const current = new Date(today);
            // Si está dentro del rango, usar hoy; si no, usar inicio
            return (current >= MIN && current <= MAX) ? today : "2025-12-29";
        })(), 
        paintShiftId: null, 
        empViewMode: 'data', 
        empInspTab: 'overview', // 'overview' | 'prefs' | 'desvio' | 'festivos'
        festivosCurso: null, // año inicio del curso en vista (ej: "2025" = curso 2025/2026)
        sortKey: 'custom', 
        sortDir: 'asc', 
        shiftSortKey:'custom', 
        shiftSortDir:'asc',
        shiftsViewMode: 'catalog', // 'catalog' | 'adhoc' 
        monitorTab: 'balance', 
        balanceStartDate: null, 
        balanceEndDate: null, 
        exportEmps: [], 
        exportStartDate: '', 
        exportEndDate: '',
        icsLabelMode: 'code',   // 'code' | 'desc' | 'custom'
        icsLabelCustom: 'Turno',
        icsIncludeFixed: true,
        dragMode: 'edit', // 'edit' or 'swap'
        tempDragMode: null, // para Ctrl temporal
        plannerViewMode: 'group', // 'group' | 'individual'
        individualEmpId: null, // empleado seleccionado en vista individual
        copiedWeekPattern: null, // patrón copiado: { sourceEmpName, sourceWeek, shifts }
        // REPLICADOR
        replicatorRange: null, // { startWeek, endWeek } — se conserva al cerrar modal para re-abrir
        customGalleryPage: 0, // Página actual del popup CUSTOM (0-indexed)
        customGalleryPerPage: 15, // Turnos por página
        equilibrioSortKey: null, // Columna de ordenación en equilibrio (null, 'nombre', 'M', 'T', 'I', 'P', 'total', 'pref')
        equilibrioSortDir: 'asc', // Dirección de ordenación
        // ANÁLISIS
        analisisModule: 'desvio', // Módulo activo en Análisis
        analisisDesvioEmpId: null, // Empleado seleccionado en desvío
        analisisDesvioStart: null, // Fecha inicio rango desvío
        analisisDesvioEnd: null,   // Fecha fin rango desvío
        // SOLICITUDES
        reqShowArchived: false,
        reqSortKey: 'start',
        reqSortDir: 'desc',
        reqView: 'table',
        reqSection: 'individual',   // 'individual' | 'recurring'
        recurringSelectedId: null,  // patrón seleccionado en vista recurrentes
        reqCalCursoY: (() => { const t = new Date(); return t.getMonth() >= 2 ? t.getFullYear() : t.getFullYear() - 1; })(),
        // HISTORIAL UNDO/REDO
        history: [], // Array de snapshots
        historyIndex: -1, // Índice actual en el historial
        maxHistory: 20, // Máximo de snapshots a mantener
        isRestoringHistory: false, // Bloquea snapshots durante undo/redo
        // IMPORTACIÓN
        importState: { step: 'paste' }
    },

    init: function() {
        console.log("Iniciando v40.41 Monitor Refinado...");
        const s = Safe.load('v40_db');
        if(s) { try { App.data = { ...App.data, ...JSON.parse(s) }; } catch(e){} }
        
        if(!App.data.schedule) App.data.schedule = {};
        if(!App.data.config) App.data.config = { weekStart: "2025-12-29", stdHours: 1800 };
        if(!App.data.config.colors) App.data.config.colors = { L: '#94a3b8', V: '#22c55e', F: '#eab308', R: '#6366f1' };
        if(!App.data.config.valleStart) App.data.config.valleStart = '14:00';
        if(!App.data.config.valleEnd)   App.data.config.valleEnd   = '17:00';
        if(App.data.config.valleBolsa === undefined) App.data.config.valleBolsa = 0;
        if(!App.data.config.headerBgColor)      App.data.config.headerBgColor      = '#dde3ed';
        if(!App.data.config.valleHeaderBgColor) App.data.config.valleHeaderBgColor = '#bfdbfe';
        if(!App.data.eventos) App.data.eventos = [];
        if(!App.data.config.llaves) App.data.config.llaves = [];
        if(App.data.config.llavesActivo === undefined) App.data.config.llavesActivo = false;
        if(!App.data.traspasoLlaves) App.data.traspasoLlaves = [];
        if(!App.data.dismissedAlerts) App.data.dismissedAlerts = [];

        // Limpiar campo legacy emp.llaveId si quedara de versiones anteriores
        App.data.empleados.forEach(e => { delete e.llaveId; });

        // Purga: eliminar traspasos > 60 días, preservando siempre el más reciente por llave
        const _purgeDate = new Date(); _purgeDate.setDate(_purgeDate.getDate() - 60);
        const _purgeDateStr = _purgeDate.toISOString().slice(0,10);
        const _latestByLlave = {};
        App.data.traspasoLlaves.forEach(t => {
            if(!_latestByLlave[t.llaveId] || t.fecha > _latestByLlave[t.llaveId].fecha) _latestByLlave[t.llaveId] = t;
        });
        App.data.traspasoLlaves = App.data.traspasoLlaves.filter(t => t.fecha >= _purgeDateStr || _latestByLlave[t.llaveId]?.id === t.id);
        if(!App.data.config.backups) App.data.config.backups = {
            autoIntervalMin: 30,
            preventivo: {
                reset: true, replica: true, borrarEmpleado: true,
                importarRota: true, vaciarPlanner: true, cargarDrive: true
            }
        };
        if(App.data.config.backups.autoIntervalMin === undefined) App.data.config.backups.autoIntervalMin = 30;
        if(!App.data.config.backups.preventivo) App.data.config.backups.preventivo = {
            reset: true, replica: true, borrarEmpleado: true,
            importarRota: true, vaciarPlanner: true, cargarDrive: true
        };
        
        // Ensure fixedShifts always exist (these are NOT saved in backup, always from code)
        App.data.fixedShifts = [
            { id: "fixed_L", code: "L", desc: "Libre", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_F", code: "F", desc: "Festivo", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_R", code: "R", desc: "Recuperación", start: "", end: "", color: "#22c55e", fixed: true },
            { id: "fixed_V", code: "V", desc: "Vacaciones", start: "", end: "", color: "#a855f7", fixed: true },
            { id: "fixed_B", code: "B", desc: "Baja médica", start: "", end: "", color: "#ef4444", fixed: true },
            { id: "fixed_P", code: "P", desc: "Permiso", start: "", end: "", color: "#ec4899", fixed: true }
        ];

        const D=["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo"];
        D.forEach(d => { if(!App.data.storeConfig.base[d]) App.data.storeConfig.base[d]={open:"10:00",close:"22:00",closed:false}; });
        if(!App.data.storeConfig.base["Festivo"]) App.data.storeConfig.base["Festivo"]={open:"12:00",close:"20:00",closed:false};
        
        App.data.empleados.forEach((e, idx) => { if(!e.prefs) e.prefs = {}; if(e.customOrder === undefined) e.customOrder = idx; if(e.active === undefined) e.active = true; if(e.saldoInicial === undefined) e.saldoInicial = 0; if(e.recPendientes === undefined) e.recPendientes = 0; if(e.vacPendientes === undefined) e.vacPendientes = 0; if(!e.festivoTracking) e.festivoTracking = {}; if(!e.ajustes) e.ajustes = []; if(e.llaveId === undefined) e.llaveId = null; });
        App.data.shiftDefs.forEach((s, idx) => { if(s.customOrder === undefined) s.customOrder = idx; });
        App.logic.migrateData(); // Normaliza datos de backups antiguos (break heredado, campos faltantes)
        
        App.logic.checkAlerts();
        
        // Listeners globales para Ctrl (modo temporal de intercambio)
        window.addEventListener('keydown', (e) => {
            if(e.key === 'Control' && App.uiState.dragMode === 'edit') {
                App.uiState.tempDragMode = 'swap';
                App.logic.updateDragModeUI();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if(e.key === 'Control') {
                App.uiState.tempDragMode = null;
                App.logic.updateDragModeUI();
            }
        });
        
        // Atajos de teclado para Undo/Redo
        window.addEventListener('keydown', (e) => {
            // Ctrl+Z / Ctrl+Y solo activos en el planificador
            if(App.router.current() !== 'planificador') return;
            // Ctrl+Z = Undo
            if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
                e.preventDefault();
                App.logic.undo();
            }
            // Ctrl+Y o Ctrl+Shift+Z = Redo
            if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
                e.preventDefault();
                App.logic.redo();
            }
        });
        
        // Inicializar historial con estado actual
        App.logic.saveSnapshot('Estado inicial');
        
        App.drive.init();
        App.router.go('home');
        
        
        // Scale inline ya aplicado en renderPlanner
        // Solo el inspector necesita scale
        setTimeout(() => {
            scaleInspector();
        }, 50);
    }
};

// Inicializar namespaces para que Object.assign funcione en los módulos
App.ui = {};
App.logic = {};
App.io = {};
App.drive = {};
