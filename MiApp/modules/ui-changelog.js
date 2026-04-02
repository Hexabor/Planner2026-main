// ============================================================
// UI: Changelog — Historial de novedades
// ============================================================

Object.assign(App.ui, {
    renderChangelog: function(c) {
        const CHANGELOG = [
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
