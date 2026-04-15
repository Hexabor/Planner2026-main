// ============================================================
// UI: Changelog — Historial de novedades
// ============================================================

Object.assign(App.ui, {
    renderChangelog: function(c) {
        const CHANGELOG = [
            {
                fecha: '15/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '✨ Grid — click en barra de turno con turno en paleta → sobreescribe (antes solo seleccionaba para intercambio)',
                    '✨ Cursor indicador — puntito del color del turno seleccionado junto al cursor en grid, cuadrados y balance',
                    '✨ Click derecho en el planificador — deselecciona el turno de la paleta (solo si hay uno seleccionado)',
                ]
            },
            {
                fecha: '15/04/2026', version: 'v1.0',
                items: [
                    '✨ Vista Cuadrados — balance completo en el grid principal: Rol, Tag, Contrato, Asignado, Dif, Desvío, Festivos, SEG, LIB, DA, dots clickables, Equilibrio (M/I/T/P)',
                    '✨ Pestaña Libranzas en el inspector — distribución de L/F/R por empleado y día de la semana con heatmap verde y fila EQUIPO en azul',
                    '✨ Domingo Anterior (DA) — columna con el turno del domingo previo para evitar encadenar partidos entre semanas',
                    '✨ Pintar desde el balance — click en un dot con turno seleccionado en paleta lo asigna directamente; ALT+click borra',
                    '✨ Workspace Presets (Flujos) — atajos configurables (hasta 6) que activan combinación vista+inspector de un click',
                    '✨ Visibilidad de turnos en paleta — toggle PAL por turno en el catálogo; turnos ocultos no aparecen en la paleta',
                    '✨ Columnas de paleta configurables (2-8) desde botón "⚙ Paleta" en Turnos',
                    '✨ Límites de Equilibrio — máximo configurable de turnos M/I/T/P por semana y persona; celda en rojo al superar',
                    '✨ Contrato como selector — dropdown con opciones configuradas + "Otro..." para valores personalizados',
                    '✨ Home — subtiles clickables con navegación directa a vistas/pestañas específicas',
                    '✨ Tag dinámico — T1/T3 se recalcula automáticamente al cambiar rol en un contrato (MNG/AM/SPV → T3)',
                    '✨ Validación cruzada de preferencias — turno partido ↔ "No partidos" se corrigen mutuamente',
                    '✨ Pestaña "Gráficos" renombrada a "Reparto horas" en el inspector',
                    '🔧 SEG revisado — hacia atrás los huecos vacíos cuentan como potencial trabajo; solo libranza explícita rompe la racha',
                    '🔧 Paleta compactada — de 313px a 280px de ancho, items más pequeños',
                    '🔧 Tooltips del balance — auto-cierre progresivo (2s) y se mantienen con el cursor encima',
                    '🔧 Animaciones del Home aceleradas — circuito más rápido, estado sticky al hover',
                    '🔧 Home — subtiles se cierran tras 3s, al abrir otro tile, o al clicar fuera',
                    '🔧 Fix: subtiles de Presentación usaban propiedad inexistente (presentacionMode → presView) con valores incorrectos',
                ]
            },
            {
                fecha: '12/04/2026', version: 'v1.0',
                items: [
                    '✨ Grid — ALT+click sobre un turno borra la asignación (atajo rápido sin necesidad de seleccionar la goma)',
                ]
            },
            {
                fecha: '11/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '✨ Alerta racha 7+ días consecutivos trabajando — detecta rachas en semanas cerradas (incluso si empiezan en la anterior)',
                    '✨ Balance Semanal — bloque "Disponibilidad diaria" con personas y horas potenciales por día (contrato/5)',
                    '✨ Balance Semanal — tooltip info en disponibilidad diaria explicando el cálculo',
                    '✨ Balance Semanal — columna FES mejorada: rojo (pendientes), verde ✓ (ok), azul (recuperaciones sobrantes con detalle por semana)',
                    '✨ Balance Semanal — intercambio rápido: click en dos casillas del mismo día + botón Intercambiar',
                    '✨ Planes de libranzas — fechas denegables: ciclo click azul→rojo→vacío, se excluyen al aplicar el plan',
                    '✨ Grid — intercambio por click-select: click en barra = seleccionar, segundo click mismo día = intercambiar (sin modo SWAP)',
                    '✨ Grid — barra informativa debajo del grid al seleccionar (no desplaza el contenido)',
                    '✨ Grid — borde verde cuando la semana está cerrada',
                    '✨ Grid — módulo VISTA reorganizado con títulos centrados (Equipo/Grid/Color), VALLE debajo de botones automáticos',
                    '🔧 Contratos parciales — F/L rule corregida: F reduce solo hasta cubrir el déficit real de horas (20h con F y 20h trabajadas = 0 diferencia, no +4)',
                    '🗑️ Eliminado switch EDITAR/CAMBIAR y override Ctrl — drag + resize + click-select unificados en un solo modo',
                ]
            },
            {
                fecha: '11/04/2026', version: 'v1.0',
                items: [
                    '✨ Inspector Fines de Semana — columna 🔒 con conteo global de sábados/domingos sobre todas las semanas cerradas',
                    '✨ Inspector Fines de Semana — columna % con porcentaje sobre semanas cerradas (umbrales proporcionales independientes)',
                    '🔧 Rotación reducida de 14W a 13W — se elimina semana -13 para dar espacio a las nuevas columnas',
                    '🔧 Fix: scroll fantasma eliminado en panel de fines de semana (min-width → width)',
                ]
            },
            {
                fecha: '08/04/2026 (noche)', version: 'v1.0',
                items: [
                    '🛡️ Validación de schema — al cargar datos, verifica que cada campo tiene el tipo correcto (array/objeto) y descarta solo lo inválido',
                    '🛡️ Protección multi-pestaña — detecta si otra pestaña guardó cambios y avisa con banner + botón Recargar (no se pisan datos)',
                ]
            },
            {
                fecha: '08/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '🛡️ Error handler global — banner discreto al pie con "Copiar detalle" para errores JS no capturados',
                    '🛡️ Rescue JSON corrupto — si localStorage se corrompe, guarda copia de seguridad y ofrece descarga antes de arrancar vacío',
                ]
            },
            {
                fecha: '08/04/2026', version: 'v1.0',
                items: [
                    '✨ Llaves — vista "Por persona": tabla por TAG3 con barras de posesión por llave (3 semanas)',
                    '✨ Llaves — vista "Por llave": tabla con todos los TAG3 + fila Tienda, colores por llave',
                    '✨ Llaves — celdas con medio rectángulo + triángulo rojo (entrega) / verde (recibe)',
                    '✨ Llaves — filtros por persona o por llave en la vista de traspasos',
                    '✨ Llaves — rejilla tenue para delimitar días en las vistas calendario',
                    '🔧 Fix: cerrar semana 2+ adelante ya no pregunta por cobertura de llaves',
                    '🔧 Fix: doble const contrato en ui-analysis.js impedía cargar Análisis',
                ]
            },
            {
                fecha: '07/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '✨ Llaves — botón "Reiniciar cadena" para establecer nuevo punto de partida desde una fecha',
                    '✨ Llaves — traspasos de reinicio con icono 🔵 y etiqueta "Inicio" (no se marcan como flujo roto)',
                    '✨ Eventos — vista Activos/Archivados con toggle y contadores (eventos pasados al archivo)',
                ]
            },
            {
                fecha: '07/04/2026 (mediodía)', version: 'v1.0',
                items: [
                    '✨ Exportación Eficiente — filas de totales con fórmulas =COUNTIF() en vez de valores (respeta fórmulas al pegar en C9)',
                ]
            },
            {
                fecha: '07/04/2026', version: 'v1.0',
                items: [
                    '✨ Planes de libranzas/vacaciones — integrados como solicitudes aprobadas en el grid (columna REQ, bloqueo de turnos incompatibles)',
                    '✨ Contratos mixtos — prorrateo correcto cuando el contrato cambia a mitad de semana (7 días ponderados)',
                    '✨ Balance semanal — tooltip ⚡ para semanas con contrato mixto (desglose L-D)',
                    '🔧 Fix: ausencias (B/V/R/P) descuentan a razón de contrato/5 (día laborable), no contrato/7',
                    '🔧 Fix: tooltip de Cntr mostraba desvío acumulado en vez de info del contrato',
                    '🔧 Fix: doble declaración const contrato rompía ui-planner.js al cargar',
                ]
            },
            {
                fecha: '05/04/2026', version: 'v1.0',
                items: [
                    '✨ Gestión diaria — reestructuración: 3 botones principales (Solicitudes/Eventos/Llaves) + sub-tabs (Puntuales/Periódicas/Libranzas/Vacaciones)',
                    '✨ Plan de libranzas — calendario anual 12 meses, selección de días, detección de conflictos, festivos → F',
                    '✨ Plan de vacaciones — misma estructura, color púrpura, siempre V',
                    '✨ Vacaciones — vista global con calendario anual de todos los empleados (colores por persona)',
                    '✨ Vacaciones — fusión de planes duplicados del mismo empleado',
                    '✨ Vacaciones — incorporación de V huérfanas del planificador a planes existentes',
                    '✨ Vacaciones — detección de revocaciones (fechas en rojo al editar plan)',
                    '✨ Protección — aviso al sobreescribir libranza o vacaciones de un plan solicitado por el staff',
                    '✨ Inspector planner — nueva pestaña "Semanas": vista de 20 semanas de un empleado con balance',
                    '✨ Análisis — nueva pestaña "Vista de Semanas" con tabla centrada y dots grandes',
                    '✨ Utils.addWeeks — helper para navegación por semanas',
                    '🔧 Migración automática: requests VAC → vacacionesPlans (transparente con backups)',
                    '🔧 VAC eliminado de solicitudes puntuales (ahora solo en Plan de vacaciones)',
                    '🔧 Export/Import incluye libranzaPlans y vacacionesPlans en categoría Planificación',
                    '🔧 Fix: editar plan aplicado ya no resetea a Pendiente si las fechas siguen aplicadas',
                    '🔧 Fix: guardar plan ya no descarta fechas pasadas (vacaciones disfrutadas se conservan)',
                    '🔧 Pestañas inspector reordenadas: Gráficos/Balance/Fines/Eventos/Festivos/Equilibrio/Semanas',
                ]
            },
            {
                fecha: '03/04/2026 (noche 2)', version: 'v1.0',
                items: [
                    '✨ Alertas — tramo sin TAG3 en tienda (semanas cerradas)',
                    '✨ Alertas — solo 1 persona en tienda (semanas cerradas)',
                    '✨ Alertas — jornada superior a 10h (semanas cerradas)',
                    '✨ Alertas — descanso insuficiente entre días consecutivos < 12h (semanas cerradas)',
                    '✨ Alertas — detección correcta de descansos en turnos partidos (excluye break)',
                    '🔧 Fix: drag/resize de barras ya no funciona en días cerrados',
                    '🔧 Fix: cerrar/abrir semana ahora recalcula alertas inmediatamente',
                    '🔧 Fix: alertas de fechas pasadas ya no aparecen',
                    '🔧 Fix: descanso calculado correctamente (no falsos 0h por normalización errónea)',
                    '🔧 Fix: ancho del grid del planificador ajustado a 1465px (columna llave no se cortaba)',
                ]
            },
            {
                fecha: '03/04/2026 (noche)', version: 'v1.0',
                items: [
                    '✨ Inspector llaves — layout mejorado: 5 días de proyección, sobretítulo con fecha, columnas LIBRA/ABRE/CIERRA más amplias',
                    '✨ Inspector llaves — llavecitas verdes bajo los badges de cobertura apertura/cierre',
                    '✨ Inspector llaves — días sin gestión de llaves instaurada en gris (no rojo)',
                    '✨ Inspector llaves — llaves ausentes sombreadas con tooltip "Ausente hoy"',
                    '✨ Traspasos — detección visual de flujo roto (fondo rojo, borde, icono ⚠) con cascada',
                    '✨ Traspasos — borrado en cascada de traspasos rotos con confirmación',
                    '✨ Export/Import — casilla independiente "🔑 Traspasos de Llaves" en los 3 modales (local, Drive, import)',
                    '🔧 Fix: export modular Drive nunca incluía traspasoLlaves (bug crítico)',
                    '🔧 Fix: botón "Optimizar desde aquí" eliminado de filas de traspaso (feature en desarrollo)',
                ]
            },
            {
                fecha: '03/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '✨ Análisis — barras de objetivo por facturación superpuestas en Horas Semanales (naranja = objetivo, rojo = exceso)',
                    '✨ admin-config.js — archivo dedicado para configuración de administrador (facturación, próximamente festivos por CCAA)',
                    '✨ Facturación — selector de semana de inicio al importar datos + advertencia de edición solo admin',
                    '✨ Importación ROTA — días festivos sin turno se marcan como F (no L) + advertencia sobre V/B/P',
                    '✨ Análisis — persistencia del rango de semanas en localStorage',
                    '🔧 Fix: barras de objetivo no aparecían por desalineación de fechas UTC vs local',
                ]
            },
            {
                fecha: '03/04/2026 (mañana)', version: 'v1.0',
                items: [
                    '✨ Home como mapa — subtiles con circuito animado (chispas, tronco, ramas) al hover en cada módulo',
                    '✨ Módulo "Peticiones" renombrado a "Gestión diaria" — menú, home, título, tooltip y referencias',
                    '✨ Pestaña "Peticiones" dentro del módulo renombrada a "Solicitudes"',
                    '✨ Botón "+ Nuevo traspaso" en la vista principal de llaves',
                    '✨ Editor de traspasos mejorado — muestra explícitamente quién entrega, dropdown de llave sin ambigüedad',
                    '✨ Estado inicial de llaves — las llaves nuevas nacen en tienda, no "sin asignar"',
                    '🔧 Fix: backup Drive truncado — subida multipart cambiada de string a Blob (perdía ~4KB al final)',
                    '🔧 Fix: export/import local JSON — traspasoLlaves ahora se incluye en la categoría Planificación',
                    '🔧 Fix: editar traspaso ya no confunde dador/receptor (excluye el propio traspaso al calcular titular)',
                    '🔧 Migración automática: traspasos con dadorId null → __TIENDA__',
                ]
            },
            {
                fecha: '03/04/2026', version: 'v1.0',
                items: [
                    '✨ Inspector de llaves — tabla TAG3 con columnas Nombre, Llave (réplica grid), LIB, ABR, CIE + 6 días de proyección',
                    '✨ Inspector de llaves — indicador de cobertura apertura/cierre por día (check verde / X rojo)',
                    '✨ Inspector de llaves — persistencia del día al cambiar de vista y volver',
                    '✨ Inspector de llaves — tooltips en todas las celdas (apertura, cierre, libranza, turno sin cobertura)',
                    '✨ Presentación llaves — duración configurable (7–90 días) con selector + landscape al imprimir',
                    '✨ Optimizador de llaves — panel "en obras" con capibara easter egg (base64 webp)',
                    '🔧 Fix: alertas fantasma en Home — el contador ahora excluye alertas ignoradas',
                    '🔧 Fix: alertas de sugerencia de traspaso eliminadas — la gestión manual cubre ese caso',
                    '🔧 Proyección futura — libranzas en verde, punto gris para turnos sin apertura/cierre, separador visual',
                    '🔧 Presentación llaves — contenedor ampliado a 900px, márgenes simétricos en PDF',
                ]
            },
            {
                fecha: '02/04/2026 (noche v2)', version: 'v1.0',
                items: [
                    '✨ Optimizador — sección "Punto de partida": fecha de inicio y titular inicial por llave configurables',
                    '✨ Optimizador — botón "Resetear todos los traspasos" (acción destructiva con confirmación)',
                    '🔧 Fix: fecha del optimizador usa hora local en lugar de UTC (ya no muestra el día anterior en UTC+2)',
                ]
            },
            {
                fecha: '02/04/2026 (noche)', version: 'v1.0',
                items: [
                    '✨ Optimizador de llaves movido a Peticiones → Llaves; panel de accesos rápidos en Alertas',
                    '✨ Columna llave separada en el grid del planificador (entre Nombre y ROL) con iconos SVG',
                    '✨ Alertas ociosas muestran turno de regreso del titular (fecha + horario)',
                    '🔧 Fix: alerta fantasma eliminada — sin traspasos equivale a llaves en tienda (sin alerta)',
                    '🔧 Fix: Aceptar un traspaso individual ya no genera duplicados (borra auto traspasos antes de crear ancla)',
                    '🔧 Penalización COVERAGE_PENALTY al traspasar dejando el cierre sin cobertura',
                ]
            },
            {
                fecha: '02/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '✨ Gestor de Llaves — modelo dinámico de traspasos con historial (traspasoLlaves[])',
                    '✨ Peticiones → nueva sección Llaves con estado actual, traspasos próximos y archivo histórico',
                    '✨ Traspaso "Dejar en tienda" — llave sin portador personal como estado intermedio',
                    '✨ Iconos SVG en el grid: llave sola, flecha roja (entrega), flecha verde (recibe), icono tienda',
                    '✨ Alertas de llaves — apertura/cierre sin cobertura y traspasos necesarios (ventana 21 días)',
                    '✨ Alertas — botón Ignorar por alerta con auto-limpieza al resolverse el problema',
                    '✨ Presentación → vista Llaves imprimible: date picker, columnas Entrega/Llave/Recibe + estado por llave',
                    '✨ Configuración → toggle activar/desactivar gestión de llaves',
                    '🔧 Apertura usa titular al inicio del día (antes del traspaso), cierre usa el titular al final',
                    '🔧 Fix: checkAlerts y dismissAlert re-renderizan inmediatamente sin depender del nombre de ruta',
                ]
            },
            {
                fecha: '02/04/2026', version: 'v1.0',
                items: [
                    '✨ Navegador del planificador — marco con borde alrededor de flechas+selector, mes debajo del código WK (detecta cambio de mes y de año)',
                    '✨ Módulo Valle rediseñado — número grande con barra verde que se vacía hasta 0 y se rellena de rojo al pasarse, tooltip al hover',
                    '✨ Barra de controles — VISTA y DRAG fusionados en módulo CONTROLES; layout en dos columnas apiladas con Botones Automáticos y Valle',
                    '✨ Ctrl activa temporalmente el modo Cambiar (drag swap) mientras se mantiene pulsado',
                    '✨ Iconos SVG minimalistas en CONTROLES y Botones Automáticos (sin emojis)',
                    '✨ Títulos de módulos más compactos y sin emojis en toda la barra de controles',
                    '🔧 Drag de timeline y shiftDrop añaden snapshot — el botón Deshacer ahora se activa tras arrastrar',
                    '🔧 Turno externo arrastrado preserva el flag external → ya no cuenta en el módulo Valle',
                    '🔧 Fix: Ctrl no mutaba visualmente los botones Editar/Cambiar',
                ]
            },
            {
                fecha: '01/04/2026 (tarde)', version: 'v1.0',
                items: [
                    '🔧 Festivos en el tooltip de Balance Semanal ahora muestra todas las fechas correctamente (incluye vacaciones)',
                    '✨ Navegador del planificador — flechas + semana + switch centrados como unidad, switch en marco redondeado con color según estado',
                    '✨ Balance Semanal — F+F muestra círculo naranja igual que L+F, con tooltip preciso sobre cuántas L faltan',
                    '✨ Vista de impresión mensual — días del mes anterior/siguiente visibles atenuados',
                    '✨ Vista de impresión mensual — horas en esquina inferior derecha de cada celda',
                    '✨ Vista de impresión semanal — festivos en rojo/blanco, domingos en violeta/blanco, línea separadora gruesa',
                    '✨ Navegador en vista de impresión — ◀◀ ◀ [selector] ▶ ▶▶ en semanal; selectores Mes/Año/Staff en mensual',
                    '🔧 Fix definitivo navegación en presentación — cálculo de fecha en click-time, sin deriva de zona horaria',
                    '✨ Selector de empleado mensual rediseñado — etiquetas Mes / Año / Staff apiladas',
                ]
            },
                        {
                fecha: '01/04/2026', version: 'v1.0',
                items: [
                    '🔧 Festivos durante vacaciones ya no se absorben — nuevo estado "En vacaciones" con badge púrpura y selector de recuperación',
                    '✨ Navegador semanal compacto — muestra solo el código de semana (2026WK14), flechas ◀◀▶▶ para saltar ±4 semanas',
                    '✨ Switch Cerrada/Abierta integrado en la fila del navegador, más compacto y con tooltip en la etiqueta',
                    '✨ Módulo DRAG independiente a la derecha de VISTA — botones Editar/Cambiar apilados verticalmente',
                    '🔧 Botón activo del modo drag refleja visualmente el modo seleccionado',
                    '🔧 Botón DH ocultado de la paleta de turnos',
                ]
            },
                        {
                fecha: '30/03/2026', version: 'v1.0',
                items: [
                    '✨ Balance Semanal — nuevas columnas Desvío acumulado y Festivos pendientes con tooltip de fechas',
                    '✨ Balance Semanal — tooltips explicativos en todas las cabeceras',
                    '✨ Balance Semanal — reorden de columnas: EMP·CNTR·ASIG·DIF ‖ DES·FES ‖ SEG·LIB·SEMANA',
                    '✨ Equilibrio de turnos — modo Semanas Cerradas vs Rango seleccionable',
                    '✨ Rotación de fines de semana ampliada a 14 semanas',
                    '✨ Festivos — botón "Resetear recuperaciones" con aviso destructivo',
                    '🔧 DIF semana usa umbral del 10% del contrato en lugar de 0.5h fijo',
                    '🔧 Al cerrar/abrir semana el inspector del planner se actualiza automáticamente',
                    '🔧 Fix: editar evento en Peticiones refresca correctamente sin sobreescribir el inspector',
                ]
            },
            {
                fecha: '28/03/2026', version: 'v1.0',
                items: [
                    '✨ Balance Semanal — cuadraditos muestran las horas del día con color adaptado a la luminancia del fondo',
                    '✨ Inspector más ancho (+15%) y cuadraditos más grandes (22px)',
                    '✨ Pestaña Eventos del inspector — vista tabla con edición y borrado por fila',
                    '✨ Peticiones — filtros de tipo exclusivos (click = solo ese tipo) y nuevo filtro de empleado',
                    '✨ Eventos en Peticiones — filtros de tipo y empleado, formulario usa el inspector',
                    '🔧 Al cambiar de sección en Peticiones el inspector se abre automáticamente',
                    '🔧 Eventos solo tienen una fecha (eliminada fecha fin redundante)',
                ]
            },
            {
                fecha: '24/03/2026', version: 'v1.0',
                items: [
                    '🔧 Módulo Valle — domingos excluidos del cómputo de horas semanal',
                ]
            },
                        {
                fecha: '22/03/2026', version: 'v1.0',
                items: [
                    '✨ Botón Configuración visible en home junto al panel Drive',
                    '✨ Nav lateral reordenado — Home / Planificador / Plantilla·Peticiones·Turnos·Calendario / Análisis·Presentación·Importar·Exportar / Alertas / Configuración',
                    '✨ Botón central Planificador rediseñado — icono slate grande, layout columna, fondo transparente hasta hover',
                    '✨ Tile Importar restaurado en home con ruta correcta',
                    '✨ Pestaña Eventos centrada y consistente con el resto de Peticiones',
                    '🔧 Eventos viajan en backups modulares Drive y local (bloque schedule)',
                    '🔧 Guarda anti-sobreescritura al cargar backup desde Drive — conserva eventos locales si el backup los trae vacíos',
                    '🔧 Festivos pendientes en tooltip Balance Semanal ahora solo cuenta semanas cerradas (igual que rejilla de empleados)',
                ]
            },
                        {
                fecha: '20/03/2026 (noche)', version: 'v41.99',
                items: [
                    '✨ Pantalla de Novedades — historial de versiones accesible desde el header',
                    '✨ Botón "✦ Novedades" en la barra superior junto al número de versión',
                    '✨ Versión actualizada a v1.0',
                    '🔧 Sombreado de filas alternas en impresión/PDF (print-color-adjust)',
                    '🔧 Fix: modo monocromo fallaba al cambiar vista en la cuadrícula individual',
                ]
            },
            {
                fecha: '20/03/2026 (tarde)', version: 'v41.99',
                items: [
                    '✨ Distintivo visual en el header del grid para el tramo horario valle (colores configurables)',
                    '✨ Eventos extra — cursos, mentorías, visitas: CRUD en Peticiones, overlay rojo en el grid, badge en presentación',
                    '✨ Inspector planificador — 6ª pestaña Eventos con filtros por tipo y empleado, formulario desplegable',
                    '✨ Pestañas del inspector con iconos SVG minimalistas y labels (sin emojis)',
                    '✨ Configuración rediseñada en 5 pestañas horizontales: General, Valle, Facturación, Backups, Peligro',
                    '✨ Botón Configuración movido junto al resto del nav',
                    '🔧 Modo monocromo ahora afecta también a turnos custom y a la vista individual',
                    '🔧 Calendario date picker usa position:fixed — ya no queda cortado por contenedores con overflow:hidden',
                    '🔧 Tooltips ℹ️ en columnas Desvío y Festivos con position:fixed',
                ]
            },
            {
                fecha: '20/03/2026', version: 'v41.98',
                items: [
                    '✨ Backups preventivos en Drive antes de 6 acciones destructivas (reset, vaciar, replicar, borrar empleado, importar, cargar)',
                    '✨ Módulo VISTA en el planificador — Grupo/Individual, Junto/Separado, Color/Monocromo',
                    '✨ Indicadores en columna Festivos: ↩ Rs disponibles sin asignar, ● compensados sin Factorial',
                    '✨ Tabla de empleados centrada y acotada, auto-guardado sin botón GUARDAR',
                    '🔧 Semanas cerradas protegen la edición en paint, editSchedule y shiftDrop',
                    '🔧 festivoTrackUpd preserva el estado de los detalles abiertos al re-renderizar',
                    '🔧 nav-export y nav-import restaurados; importState.step corregido a paste',
                ]
            },
            {
                fecha: '19/03/2026', version: 'v41.97',
                items: [
                    '✨ Registro de ajustes manuales de horas — nueva pestaña AJUSTES en inspector de empleado',
                    '✨ Módulo VALLE en el planificador — círculo SVG con consumo semanal de horas valle',
                    '✨ Configuración de tramo valle (hora inicio/fin, bolsa semanal)',
                    '🔧 Rol y TAG basados en contrato vigente (getRolEnFecha) en todo el planificador',
                    '🔧 Desvío inspector: orden reciente→antiguo, desglose semanas+ajustes en cabecera',
                ]
            },
            {
                fecha: '18/03/2026', version: 'v41.96',
                items: [
                    '✨ Integración Google Drive — backup automático, preventivo y manual',
                    '✨ Auto-guardado en Drive cada 30 min cuando hay cambios pendientes',
                    '✨ Modal de sincronización al arrancar si Drive tiene datos más recientes',
                    '✨ Panel Drive en pantalla de inicio con estado de conexión',
                    '🔧 Export/import local movidos a Configuración como sección de emergencia',
                ]
            },
            {
                fecha: '07/03/2026', version: 'v41.95',
                items: [
                    '✨ Vista previa de importación rediseñada — layout 2 columnas, lista de días + detalle sticky',
                    '✨ Mapeador de empleados rediseñado con pills de acción (Crear/Renombrar/Mapear/Ignorar)',
                    '🔧 Bug: empleados renombrados desaparecían silenciosamente al importar',
                    '🔧 Bug: todos los empleados "crear" salían con primer nombre',
                ]
            },
            {
                fecha: '05/03/2026', version: 'v41.94',
                items: [
                    '✨ Replicador de semanas — modal con vista previa, conflictos navegables y doble confirmación',
                    '✨ Grid individual — nuevas columnas Festivo, Horario y REQ',
                    '🔧 CSS global rompía el modal del replicador — reglas scoped',
                ]
            },
            {
                fecha: '04/03/2026', version: 'v41.93',
                items: [
                    '✨ Vista individual del planificador — tabla por días con timeline, copiar/pegar semana',
                    '✨ Panel Domingos y Festivos — 5ª pestaña del inspector',
                    '✨ Panel Rotación Fines de Semana mejorado — 12 semanas, columna Σ con umbrales',
                    '🔧 Festivos durante vacaciones se contabilizan como disfrutados',
                    '🔧 Tooltip desvío usa rango real por empleado',
                    '🔧 fechaInicio/fechaFin no se sincronizaba al añadir/borrar contratos',
                ]
            },
        ];

        const rows = CHANGELOG.map((entry, idx) => {
            const isFirst = idx === 0;
            const items = entry.items.map(item => {
                const isFeature = item.startsWith('✨');
                const color  = isFeature ? '#1e40af' : '#475569';
                const bg     = isFeature ? '#eff6ff'  : '#f8fafc';
                const border = isFeature ? '#bfdbfe'  : '#e2e8f0';
                return `<li style="display:flex;gap:8px;align-items:flex-start;background:${bg};border:1px solid ${border};border-radius:6px;padding:7px 10px;">
                    <span style="flex-shrink:0;font-size:0.85rem;">${item.slice(0,2)}</span>
                    <span style="font-size:0.82rem;color:${color};line-height:1.45;">${item.slice(2).trim()}</span>
                </li>`;
            }).join('');

            return `<div style="margin-bottom:28px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid ${isFirst ? '#2563eb' : '#e2e8f0'};">
                    <span style="font-size:0.95rem;font-weight:800;color:#1e293b;">${entry.fecha}</span>
                    <span style="background:${isFirst ? '#eff6ff' : '#f1f5f9'};color:${isFirst ? '#2563eb' : '#64748b'};border:1px solid ${isFirst ? '#bfdbfe' : '#e2e8f0'};border-radius:10px;padding:2px 10px;font-size:0.7rem;font-weight:700;">${entry.version}</span>
                    ${isFirst ? '<span style="background:#dcfce7;color:#166534;border:1px solid #bbf7d0;border-radius:10px;padding:2px 8px;font-size:0.65rem;font-weight:700;">ÚLTIMA</span>' : ''}
                </div>
                <ul style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:5px;">${items}</ul>
            </div>`;
        }).join('');

        c.innerHTML = `<div style="max-width:680px; margin:0 auto; padding:24px;">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
                <h2 style="margin:0;font-size:1.2rem;font-weight:800;color:#0f172a;">Novedades</h2>
                <span style="background:#f1f5f9;color:#64748b;border:1px solid #e2e8f0;border-radius:10px;padding:2px 10px;font-size:0.75rem;font-weight:700;">v1.0</span>
            </div>
            <p style="margin:0 0 24px;font-size:0.82rem;color:#94a3b8;">Historial de cambios y mejoras, del más reciente al más antiguo.</p>
            ${rows}
        </div>`;
    }
});
