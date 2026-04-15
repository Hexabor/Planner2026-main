# Planner 2026 — Historia del desarrollo

Changelog narrativo, desde los cimientos hasta el estado actual. Pensado para entender cómo ha crecido la herramienta y por qué se tomó cada decisión.

---

## Fase 1: Los cimientos (4 marzo 2026 — v41.93)

### Vista individual del planificador
Se crea una segunda vista del planificador: en vez del grid grupal (todos los empleados × 7 días), una tabla día a día para un solo empleado, con timeline visual. Permite copiar y pegar semanas enteras. Es la primera vez que se puede ver el planning "desde los ojos" de un empleado concreto.

### Panel de domingos y festivos
Quinta pestaña del inspector. Muestra la rotación de fines de semana en 12 semanas con una columna de totales (Σ) y umbrales para detectar desequilibrios. Los festivos durante vacaciones se empiezan a contabilizar correctamente como disfrutados.

---

## Fase 2: Importación inteligente (5-7 marzo 2026 — v41.94/v41.95)

### Replicador de semanas
Modal con vista previa que permite copiar una semana y pegarla en otras. Detecta conflictos (días con turnos ya asignados) y los muestra de forma navegable. Doble confirmación para evitar accidentes.

### Importación desde ROTA/Eficiente
Rediseño completo del flujo de importación. Se copia y pega desde Excel y Planner lo parsea, detectando automáticamente empleados y turnos. Si un nombre no coincide, ofrece opciones: crear nuevo, renombrar existente, mapear a otro o ignorar. Se resolvió un bug crítico donde los empleados renombrados desaparecían silenciosamente.

---

## Fase 3: Google Drive y protección de datos (18-20 marzo 2026 — v41.96 a v41.98)

### Integración con Google Drive
El cambio más importante para la fiabilidad. Los datos dejan de vivir solo en localStorage (volátil, un borrado de caché lo destruye todo) y se sincronizan con Google Drive. Auto-guardado cada 30 minutos, backup manual con un clic, y backups preventivos antes de cualquier acción destructiva.

### Sistema de backups preventivos
Antes de 6 acciones peligrosas (resetear, vaciar, replicar, borrar empleado, importar, cargar backup) se guarda automáticamente una copia en Drive. Red de seguridad invisible.

### Módulo VISTA
El planificador gana opciones de visualización: Grupo/Individual, Junto/Separado (inspector visible o no), Color/Monocromo. El modo monocromo es útil para imprimir en blanco y negro.

### Ajustes manuales de horas
Nueva pestaña en el inspector de empleado para registrar ajustes: horas extra, ausencias parciales, desplazamientos. Cada ajuste tiene fecha, horas, signo (+/-) y motivo. Se integra en el cálculo de desvío.

### Módulo Valle
Indicador visual del consumo de horas en franja valle (14:00-17:00). Un círculo SVG que se llena de verde y pasa a rojo cuando se supera la bolsa semanal. Configurable desde Configuración.

---

## Fase 4: Eventos y diseño visual (20-22 marzo 2026 — v1.0)

### Eventos extra
Nueva categoría de datos: cursos de formación, visitas a otras tiendas, mentorías, reuniones. Se gestionan desde Gestión diaria (entonces "Peticiones") y aparecen como overlay rojo en el grid del planificador. También tienen badge en la vista de presentación.

### Configuración rediseñada
De una página larga a 5 pestañas horizontales: General, Valle, Facturación, Backups, Peligro. Mucho más organizado y navegable.

### Pantalla de Novedades
El changelog se hace accesible desde dentro de la app, con un botón en el header. Cada entrada muestra la fecha, versión y lista de cambios con iconos (✨ nuevo, 🔧 arreglo).

### Reorganización de la navegación
La barra lateral se reordena siguiendo una lógica de flujo de trabajo: Home → Planificador → ingredientes (Plantilla, Peticiones, Turnos, Calendario) → revisión (Análisis, Presentación) → datos (Importar, Exportar) → Alertas → Configuración.

---

## Fase 5: Balance y equilibrio (24-30 marzo 2026)

### Balance Semanal mejorado
El inspector del planificador gana columnas de desvío acumulado y festivos pendientes, con tooltips que muestran las fechas exactas. Los cuadraditos del grid muestran las horas de cada día con colores adaptativos. Se añaden filtros a las peticiones y eventos.

### Equilibrio de turnos
Nuevo modo en el análisis: ¿Cómo se distribuyen los tipos de turno entre los empleados? Se puede ver en semanas cerradas o en un rango personalizable. Permite detectar si alguien siempre trabaja mañanas y otro siempre tardes.

### Rotación ampliada
La rotación de fines de semana pasa de 12 a 14 semanas, dando una visión más completa del equilibrio.

---

## Fase 6: Presentación y navegación (1 abril 2026)

### Vista de presentación
Dos vistas para imprimir o generar PDF:
- **Semanal**: cuadrante completo de la semana, festivos en rojo/blanco, domingos en violeta/blanco. Navegador con flechas simples y dobles (±1 y ±4 semanas).
- **Mensual**: vista de un mes completo para un empleado, con horas en cada celda y días de meses adyacentes atenuados. Selectores apilados de Mes/Año/Empleado.

### Festivos durante vacaciones
Resolución de un caso edge: si un festivo cae durante las vacaciones de alguien, no se "absorbe" — queda como estado especial con badge púrpura y posibilidad de asignar recuperación.

---

## Fase 7: Controles del planificador (2 abril 2026)

### Rediseño de controles
La barra de controles del planificador se reorganiza completamente. Drag y Vista se fusionan en un módulo CONTROLES con layout en dos columnas. El navegador semanal se compacta: muestra solo el código de semana (2026WK14), con flechas para saltar ±1 y ±4 semanas. El módulo Valle se rediseña con número grande y barra visual verde→rojo.

### Ctrl para swap temporal
Mantener pulsada la tecla Ctrl activa temporalmente el modo "Cambiar" en drag & drop (intercambiar dos turnos), sin cambiar el botón activo. Al soltar Ctrl, vuelve al modo anterior. Mucho más ágil que ir cambiando de modo manualmente.

### Iconos SVG
Se eliminan los emojis de toda la barra de controles y se sustituyen por iconos SVG minimalistas y consistentes. Un paso hacia un diseño más profesional.

---

## Fase 8: Gestión de llaves (2-3 abril 2026)

### El problema
En una tienda retail, las llaves físicas son críticas. Hay 2-3 llaves y 4-5 empleados TAG3 (Manager, Assistant Manager, Supervisores) que pueden tenerlas. Siempre tiene que haber alguien con llave a la apertura y al cierre. Cuando un TAG3 tiene libranza, hay que traspasar la llave. Es un puzle logístico que hasta ahora se resolvía mentalmente.

### Modelo de datos
Se crea `traspasoLlaves[]`: un historial de traspasos con fecha, llave, quién entrega, quién recibe. Las llaves nacen en tienda (`__TIENDA__`). Una persona solo puede tener una llave a la vez; la tienda puede tener varias.

### Interfaz
- **Configuración**: toggle para activar/desactivar, crear/borrar llaves con alias personalizado (ej: "Capibatido", "Capimochila", "Panda")
- **Gestión diaria → Llaves**: estado actual, tabla de traspasos próximos, archivo histórico, botón "+ Nuevo traspaso"
- **Grid del planificador**: iconos SVG junto al nombre (llave, flecha roja entrega, flecha verde recibe, icono tienda)
- **Presentación → Llaves**: vista imprimible con date picker y columnas Entrega/Llave/Recibe
- **Inspector del planificador**: tabla TAG3 con proyección a 6 días, indicadores de cobertura apertura/cierre

### Alertas de llaves
El sistema genera alertas cuando detecta que un día de una semana cerrada no tiene cobertura de llave a la apertura o al cierre. Ventana de 21 días.

### Optimizador (en desarrollo)
Se intentó crear un algoritmo automático para sugerir traspasos óptimos. El problema resultó ser más complejo de lo esperado (múltiples llaves compiten por los mismos TAG3, decisiones encadenadas, visión global necesaria). Actualmente marcado como "en obras" con un capibara de easter egg. La gestión manual funciona bien.

---

## Fase 9: Pulido y mapa (3 abril 2026)

### Bug del backup de Drive
Se descubre que los backups de Drive estaban perdiendo los últimos ~4KB del JSON (incluyendo `traspasoLlaves` y `dismissedAlerts`). La causa: la construcción del body multipart como string concatenada con `.join('\r\n')` truncaba silenciosamente payloads grandes. Se resuelve cambiando a `Blob`, que maneja cada parte por separado sin pérdida.

### Export/Import local
Se descubre que el export modular (JSON local) nunca incluía `traspasoLlaves`. Se añade a la categoría "Planificación" tanto en exportación como en importación.

### Renombrado: Gestión diaria
El módulo "Peticiones" se renombra a "Gestión diaria", reflejando mejor su contenido actual (solicitudes + eventos + llaves). La pestaña interna pasa a llamarse "Solicitudes". Se actualiza menú, home, tooltip y todas las referencias.

### Home como mapa
El Home se transforma en un mapa interactivo de la aplicación. Al hacer hover sobre cualquier módulo, aparecen sus submódulos como rectángulos conectados por un circuito animado:
- Primero se dibuja una línea horizontal desde el módulo hacia un tronco vertical
- Luego el tronco se extiende hacia arriba y abajo
- Finalmente, ramas se extienden del tronco a cada submódulo
- Todo el recorrido lleva una chispa naranja que viaja por las líneas

El efecto es puramente visual y de navegación — convierte la pantalla de inicio en un mapa que explica la estructura de la herramienta sin necesidad de documentación.

---

## Fase 10: Alertas ampliadas y llaves mejoradas (3-4 abril 2026)

### Alertas laborales
Cuatro nuevas alertas que solo se activan en semanas cerradas:
- **Tramo sin TAG3**: franja horaria sin ningún encargado
- **Persona sola**: empleado cubriendo solo una franja
- **Jornada >10h**: turno que excede las 10 horas
- **Descanso <12h**: menos de 12 horas entre un cierre y la siguiente apertura

### Llaves — inspector mejorado
Proyección ampliada a 5 días, sobretítulo con fecha, columnas más amplias. Las llaves que faltan aparecen sombreadas. Detección visual de flujo roto (fondo rojo + efecto cascada) y borrado de traspasos en lote.

### Fix: backup de Drive y traspasos
Se descubre que el export modular nunca incluía `traspasoLlaves` — añadido como casilla independiente en los 3 modales de export/import. Drag/resize ahora se bloquea correctamente en días cerrados.

---

## Fase 11: Libranzas, vacaciones y contratos (5-7 abril 2026)

### Gestión diaria reestructurada
El módulo pasa de 2 botones a 3 botones principales (Solicitudes/Eventos/Llaves), y Solicitudes gana 4 sub-tabs: Puntuales, Periódicas, Libranzas, Vacaciones.

### Plan de libranzas y vacaciones
Calendario anual de 12 meses donde el empleado (o el manager) marca los días deseados. Detecta conflictos con festivos (→ F automático). Vista global de vacaciones con calendario anual de todos los empleados (colores por persona). Fusión de planes duplicados, incorporación de V huérfanas del planificador, detección de revocaciones (fechas en rojo).

### Integración en el grid
Los planes aprobados aparecen como solicitudes en el planificador (columna REQ), con bloqueo de turnos incompatibles. Protección al sobreescribir libranzas/vacaciones de un plan solicitado.

### Contratos mixtos
Cuando un empleado cambia de contrato a mitad de semana, el balance se calcula por prorrateo diario (no semanal). Tooltip ⚡ en semanas mixtas con desglose L-D.

### Vista de Semanas
Nueva pestaña en el inspector del planificador y en Análisis: vista de 20 semanas de un empleado con balance acumulado.

### Fixes
- Ausencias justificadas (B/V/R/P) descuentan contrato/5 (día laborable), no contrato/7
- Migración automática de requests VAC → vacacionesPlans
- Doble `const contrato` corregida en varios módulos

---

## Fase 12: Exportación y llaves avanzadas (7-8 abril 2026)

### Exportación Eficiente mejorada
Las filas de TOTAL ahora usan fórmulas `=COUNTIF()` en vez de valores fijos, de modo que al pegar en la hoja ROTA/C9 las fórmulas del destino se respetan.

### Llaves — reiniciar cadena
Botón para establecer un nuevo punto de partida desde una fecha (icono 🔵). Los traspasos de reinicio no se marcan como flujo roto.

### Llaves — vistas visuales
Dos nuevas vistas:
- **Por persona**: tabla por TAG3 con barras de posesión por llave (3 semanas)
- **Por llave**: tabla con todos los TAG3 + fila Tienda, colores por llave, celdas con medio rectángulo + triángulo rojo (entrega) / verde (recibe)

Filtros por persona o por llave en traspasos. Rejilla tenue para delimitar días en las vistas calendario.

### Eventos — archivo
Vista Activos/Archivados con toggle y contadores. Los eventos pasados pasan al archivo automáticamente.

---

## Fase 13: Robustez (8 abril 2026)

### Error handler global
Banner discreto al pie de página para errores JS no capturados (`window.onerror` + `onunhandledrejection`). Incluye botón "Copiar detalle" con el stack trace para diagnóstico. Auto-desaparece en 10 segundos.

### Rescue de JSON corrupto
Si localStorage tiene datos corruptos (JSON no parseable), la app guarda una copia de seguridad en `v40_db_corrupted`, muestra un modal con opción de descargar el archivo corrupto, y arranca con datos vacíos en vez de crashear.

### Validación de schema
Al arrancar, verifica que los campos clave (`empleados`, `schedule`, `config`, `shiftDefs`, `requests`, `storeConfig`) tienen el tipo correcto. Si alguno está corrupto, descarta solo ese campo y avisa al usuario — no se pierden los demás datos.

### Protección multi-pestaña
Si dos pestañas tienen la app abierta y una guarda cambios, la otra muestra un banner fijo: "Otra pestaña ha guardado cambios. Recarga para no perder datos." El auto-guardado se pausa para no pisar los datos de la otra pestaña.

---

## Fase 14: Atajos del grid (12 abril 2026)

### ALT+click para borrar turno
Nuevo atajo de teclado en el grid del planificador: mantener pulsada la tecla ALT y hacer click sobre un turno lo borra directamente, sin necesidad de seleccionar la goma de borrar de la paleta. Respeta las mismas protecciones que el borrado normal: semanas cerradas, planes de libranzas y vacaciones aprobados.

---

## Fase 15: Panel de Justicia y vista Cuadrados (15 abril 2026)

### Vista "Cuadrados" — balance en el panel principal
Nueva vista del planificador que sustituye el grid de barras (timeline) por una tabla compacta con toda la información de balance integrada. Cada fila es un empleado con: Rol, Tag, Contrato, Asignado, Diferencia, Desvío acumulado, Festivos pendientes, SEG (días consecutivos), LIB (chivato de libranzas), DA (Domingo Anterior — turno del domingo de la semana previa para evitar encadenar partidos entre semanas), los 7 dots de la semana (clickables para pintar/intercambiar/borrar con ALT), y columnas de Equilibrio (M/I/T/P) con límites configurables. Se activa desde el módulo VISTA con el toggle Barras/Cuadrados.

### Pestaña "Libranzas" en el inspector
Séptima pestaña del inspector del planificador. Muestra la distribución de días libres (L, F, R) por empleado y día de la semana, con heatmap verde proporcional. Fila EQUIPO con gradiente azul. Desglose por tipo (badges L/F/R). Modo "Semanas cerradas" o "Rango". Columnas ordenables.

### Domingo Anterior (DA) en el balance
Tanto en vista Cuadrados como en el balance del inspector, se muestra el turno del domingo de la semana previa. En Cuadrados aparece como cuadrado translúcido; en balance como destello fantasmal junto al primer dot. Útil para detectar si alguien cierra en partido el domingo y vuelve a abrir en partido el lunes.

### Pintar desde el balance
Los dots de la semana (en balance y en cuadrados) ahora permiten pintar directamente: si hay un turno seleccionado en la paleta, hacer click en un dot lo asigna. Sin turno en paleta, mantiene la lógica de selección para intercambio. ALT+click borra el turno.

### Workspace Presets (Flujos)
Nuevo módulo en los controles del planificador: "FLUJOS". Atajos configurables (hasta 6) que activan una combinación de vista principal (Barras/Cuadrados/Individual) + pestaña del inspector. Modal de configuración con nombre, modo grid y pestaña inspector. Permite saltar instantáneamente entre configuraciones de trabajo habituales.

### Visibilidad de turnos en la paleta
Cada turno del catálogo tiene ahora un toggle "PAL" (visible en la tabla de Turnos) que controla si aparece o no en la paleta del planificador. Los turnos ocultos siguen existiendo y funcionando, simplemente no ocupan espacio en la paleta. Configurable también el número de columnas de la paleta (2-8) desde el botón "Paleta" en Turnos.

### Contrato como selector
El campo de horas/semana del contrato pasa de input numérico libre a un `<select>` con las opciones configuradas (40, 37.5, 30, 20, 12 por defecto) más "Otro..." para valores personalizados. Más rápido y menos propenso a errores.

### Límites de Equilibrio
Nueva configuración (accesible desde tooltip de las columnas M/I/T/P en Cuadrados): máximo de turnos de cada tipo por semana y persona. Si se supera el límite, la celda se marca en rojo.

### Validación cruzada de preferencias
Si un empleado selecciona un turno partido como preferido, la preferencia "Partidos: No" se corrige automáticamente a "OK". Y viceversa: si elige "No partidos", su turno preferido se limpia si era partido.

### Tag dinámico por rol
El tag del empleado (T1/T3) se recalcula automáticamente al cambiar de rol en un contrato. MNG/AM/SPV → T3, STF → T1. El listado de empleados también usa el rol actual en vez del tag estático.

### Cálculo de días consecutivos (SEG) revisado
El algoritmo de `calcConsecutiveWorkDays` cambia su semántica: hacia atrás, los días sin turno asignado cuentan como potenciales días de trabajo (solo se rompe la racha con una libranza explícita L/F/R/V/B/P). Hacia adelante en la semana actual, solo cuentan turnos realmente asignados. Más realista para planificación.

### Subtiles del Home como enlaces directos
Los subtiles del mapa del Home dejan de ser decorativos y pasan a ser clickables: cada uno navega directamente a la vista/pestaña correspondiente (ej: "Preferencias" → Plantilla en modo preferencias, "Ad Hoc" → Turnos en modo ad hoc). Animaciones aceleradas y estado "sticky" al hacer hover.

### Pestaña "Gráficos" renombrada
La pestaña "Gráficos" del inspector pasa a llamarse "Reparto horas", describiendo mejor su contenido.

### Paleta compactada
La paleta del planificador se reduce de 313px a 280px de ancho, con items ligeramente más pequeños, para dejar más espacio al grid.

### Tooltips mejorados
Los diff-tooltips del balance ganan auto-cierre progresivo (transition en visibility con delay 2s) y se mantienen visibles mientras el cursor esté encima (pointer-events: auto al hover).

---

## Resumen de evolución

| Fecha | Hito |
|-------|------|
| Feb 2026 | Inicio del proyecto, primeras versiones |
| 4-7 Mar | Cimientos: vista individual, importación, replicador |
| 18-20 Mar | Google Drive, backups, protección de datos |
| 20-22 Mar | Eventos, configuración, changelog, navegación |
| 24-30 Mar | Balance, equilibrio, filtros |
| 1 Abr | Presentación imprimible (semanal + mensual) |
| 2 Abr | Controles del planificador, Ctrl swap, gestión de llaves |
| 3 Abr | Fix backup Drive, mapa del Home, Gestión diaria |
| 3-4 Abr | Alertas laborales (TAG3, persona sola, jornada, descanso), llaves mejoradas |
| 5-7 Abr | Libranzas/vacaciones, contratos mixtos, vista de semanas |
| 7-8 Abr | Export COUNTIF, llaves avanzadas (vistas, reinicio, filtros), archivo eventos |
| 8 Abr | Robustez: error handler, rescue JSON, validación schema, multi-pestaña |
| 12 Abr | Atajos del grid: ALT+click para borrar turno |
| 15 Abr | Panel de Justicia: vista Cuadrados, libranzas, flujos, paleta configurable |
