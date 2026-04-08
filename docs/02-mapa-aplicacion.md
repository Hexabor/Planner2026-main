# Planner 2026 — Mapa de la aplicación

## Visión general

La aplicación se organiza en un **Home central** que actúa como mapa navegable, con módulos agrupados en cuatro categorías:

```
                    INGREDIENTES                          REVISIÓN
              ┌─────────────────────┐              ┌──────────────────────┐
              │  Plantilla          │              │  Análisis            │
              │  Gestión diaria     │              │  Presentación        │
              └─────────────────────┘              └──────────────────────┘

                                   ┌──────────┐
                                   │          │
                                   │ PLANIFI- │
                                   │  CADOR   │
                                   │          │
                                   └──────────┘

                    CATÁLOGOS                              DATOS
              ┌─────────────────────┐              ┌──────────────────────┐
              │  Turnos             │              │  Exportar            │
              │  Calendario         │              │  Importar            │
              └─────────────────────┘              └──────────────────────┘
```

Además: **Alertas** (accesible desde el footer) y **Configuración** (engranaje en la barra lateral).

---

## 1. PLANIFICADOR (centro de la aplicación)

El corazón de Planner. Un **cuadrante semanal** donde se asignan turnos a empleados.

### Vista grupo
- Grid con empleados en filas y días en columnas (lunes a domingo)
- Cada celda muestra el código de turno con su color
- Drag & drop para asignar y mover turnos
- Paleta de turnos a la izquierda para arrastrar
- Indicador de llave junto al nombre del empleado

### Vista individual
- Tabla día a día para un solo empleado
- Timeline visual con franja horaria
- Columnas: día, turno, horario, festivo, solicitudes
- Copiar/pegar semanas

### Panel de controles
- **Navegador**: flechas para moverse entre semanas, indicador WK (código de semana)
- **Switch Cerrada/Abierta**: bloquea o desbloquea la semana para edición
- **Modo drag**: Editar (asignar) o Cambiar (intercambiar). Ctrl activa temporalmente el modo Cambiar
- **Vista**: Grupo/Individual, Junto/Separado, Color/Monocromo
- **Valle**: indicador de horas en franja valle (14:00-17:00), con bolsa semanal configurable

### Inspector lateral (panel derecho)
7 pestañas:
- **Gráficos**: distribución diaria y por franjas horarias
- **Balance**: horas asignadas vs contratadas por empleado, desvío acumulado, festivos pendientes. Tooltip ⚡ en semanas con contrato mixto (desglose L-D)
- **Eventos**: cursos, visitas, mentorías programados esa semana
- **Fines**: rotación de fines de semana (14 semanas), equilibrio sábados/domingos
- **Festivos**: panel de devolución de festivos trabajados, con fechas de recuperación
- **Equilibrio**: distribución de turnos por empleado (quién trabaja más mañanas, tardes, etc.)
- **Semanas**: vista de 20 semanas de un empleado con balance acumulado

---

## 2. PLANTILLA (Ingredientes)

Gestión del equipo de empleados.

### Submódulos:
- **Contratos**: datos de cada empleado — nombre, rol (MNG/AM/SPV/STF), horas contratadas, fechas de inicio/fin, historial de contratos con cambios de jornada y rol
- **Desvíos**: seguimiento de horas trabajadas vs contratadas, acumulado semana a semana, ajustes manuales (horas extra, ausencias)
- **Devolución de festivos**: registro de festivos trabajados, asignación de fecha de recuperación, estado (pendiente/asignado/disfrutado), integración con Factorial
- **Preferencias**: turno preferido, días libres preferidos, actitud ante domingos (gusta/indiferente/no gusta), turno partido (sí/no/ok), descanso (corto/largo)

### Inspector de empleado
Al seleccionar un empleado se abre un panel lateral con 4 pestañas: Datos, Desvío, Ajustes, Festivos.

---

## 3. GESTIÓN DIARIA (Ingredientes)

Todo lo que ocurre en el día a día y afecta al cuadrante. Anteriormente llamado "Peticiones".

3 botones principales: Solicitudes, Eventos, Llaves.

### Solicitudes (4 sub-tabs):
- **Puntuales**: peticiones individuales de ausencia — libres (LIB), bajas (BAJ), permisos (PER), franjas horarias (HRL). Con estados: pendiente, aprobada, rechazada. Filtros por tipo y empleado.
- **Periódicas**: patrones que generan solicitudes automáticamente (ej: "Flavia no trabaja tardes los miércoles de marzo a junio por clases de aerial").
- **Libranzas**: plan anual de libranzas por empleado — calendario de 12 meses, detección de conflictos con festivos, vista global.
- **Vacaciones**: plan anual de vacaciones — misma estructura, color púrpura, vista global con todos los empleados (colores por persona). Fusión de planes duplicados, detección de revocaciones.

### Eventos:
Actividades que no son ausencias pero afectan al planning — cursos de formación, visitas a otras tiendas, mentorías, reuniones. Aparecen como overlay en el grid del planificador. Vista Activos/Archivados con toggle y contadores.

### Llaves (si está activado):
Gestión de las llaves físicas de la tienda. Estado actual de cada llave (quién la tiene), traspasos planificados, archivo histórico. Reglas: las llaves nacen en tienda, una persona solo puede tener una llave, la tienda puede tener varias.
- **Vista traspasos**: tabla con filtros por persona o llave, rejilla tenue por días
- **Vista Por persona**: tabla por TAG3 con barras de posesión por llave (3 semanas)
- **Vista Por llave**: tabla con todos los TAG3 + fila Tienda, triángulos rojo (entrega) / verde (recibe)
- **Reiniciar cadena**: establecer nuevo punto de partida desde una fecha (icono 🔵)

---

## 4. TURNOS (Catálogos)

Definición de los turnos disponibles.

### Submódulos:
- **Paleta de turnos**: catálogo de turnos predefinidos. Cada turno tiene código, descripción, hora inicio/fin, descanso (para partidos), color. Ejemplos: M8 (10:00-18:00), T8 (14:00-22:00), P8 D4 (10:00-22:00 con 4h descanso).
- **Edición de turnos**: formulario para crear y modificar turnos del catálogo. Incluye flag "externo" para turnos fuera de tienda (viajes, formación) que no cuentan en el módulo Valle.
- **Turnos Ad Hoc**: turnos personalizados creados directamente en el grid que no coinciden con ningún turno del catálogo. Lista con frecuencia de uso y paginación.

### Turnos fijos (no editables)
Siempre disponibles, no se pueden borrar: L (Libre), F (Festivo), R (Recuperación), V (Vacaciones), B (Baja médica), P (Permiso).

---

## 5. CALENDARIO (Catálogos)

Configuración temporal de la tienda.

### Submódulos:
- **Horarios de tienda**: horario base por día de la semana (lunes a domingo + festivos). Hora de apertura y cierre. Días especiales con horario distinto (ej: Nochebuena cierra a las 19:00).
- **Festivos**: calendario de festivos del año — nacionales, autonómicos y locales. Cada festivo tiene fecha y descripción.
- **Bloqueos**: semanas bloqueadas (cerradas) que no se pueden editar en el planificador. Se bloquean cuando el cuadrante está confirmado y publicado.

---

## 6. ANÁLISIS (Revisión)

Métricas y visualizaciones para revisar el planning.

### Submódulos:
- **Turnos vs Facturación**: horas semanales asignadas por empleado, comparativa con horas contratadas. Tabla con desvíos y acumulados.
- **Equilibrio de turnos**: distribución de tipos de turno por empleado. ¿Quién trabaja más mañanas? ¿Quién más partidos? Modo semanas cerradas o rango personalizable.
- **Turnos más usados**: ranking de turnos por frecuencia de uso. Útil para identificar patrones y simplificar la paleta.
- **Vista de Semanas**: tabla de 20 semanas por empleado con balance acumulado, duplicada desde el inspector del planificador.

---

## 7. PRESENTACIÓN (Revisión)

Vistas optimizadas para imprimir o exportar como PDF.

### Submódulos:
- **Semanal grupo**: cuadrante de la semana con todos los empleados. Colores, festivos destacados en rojo, domingos en violeta. Navegador con flechas.
- **Mensual individual**: vista mes completo de un solo empleado. Selector de mes, año y empleado. Horas en esquina de cada celda. Días de meses adyacentes atenuados.
- **Traspasos de llaves** (si está activado): vista imprimible de los traspasos planificados. Date picker para rango, columnas Entrega/Llave/Recibe + estado por llave.

---

## 8. EXPORTAR (Datos)

Sacar datos de Planner hacia otros sistemas.

### Submódulos:
- **Hacia Eficiente**: genera el formato compatible con ROTA/Eficiente para subir al sistema corporativo.
- **Hacia Calendar**: exporta turnos como archivo .ics para importar en Google Calendar u otros calendarios.
- **Master Data**: exportación modular — selecciona qué datos incluir (equipo, turnos, planificación, config, festivos, días especiales). Genera un JSON descargable.

---

## 9. IMPORTAR (Datos)

Traer datos desde el sistema existente.

### Submódulo:
- **Desde Rota Eficiente**: se copia y pega una tabla desde Excel/ROTA. Planner la parsea, detecta empleados y turnos, permite mapear nombres (crear, renombrar, ignorar), y aplica los turnos al planificador. Flujo en 4 pasos: pegar → previsualizar → mapear → aplicar.

---

## 10. ALERTAS

Panel de notificaciones que avisa de problemas en el planning.

### Tipos de alerta:
- **Conflictos turno-solicitud**: empleado tiene turno asignado en un día que tiene solicitud aprobada
- **Solicitudes sin turno**: solicitudes pendientes en días sin asignación
- **Festivos mal asignados**: día marcado como festivo pero con turno L (libre) en vez de F (festivo)
- **Cobertura de llaves**: apertura o cierre sin empleado TAG3 con llave (solo semanas cerradas, ventana 21 días)
- **Tramo sin TAG3**: franja horaria sin ningún encargado
- **Persona sola**: empleado cubriendo solo una franja
- **Jornada >10h**: turno que excede las 10 horas
- **Descanso <12h**: menos de 12 horas entre cierre y siguiente apertura

Cada alerta tiene botón "Ignorar" para descartarla. Las alertas ignoradas se limpian automáticamente si el problema se resuelve.

---

## 11. CONFIGURACIÓN

Ajustes generales de la aplicación.

### Pestañas:
- **General**: nombre de la tienda, semana de inicio, horas estándar anuales, colores de turnos fijos, gestión de llaves (toggle + crear/borrar llaves con alias)
- **Valle**: configuración del tramo horario valle — hora inicio, hora fin, bolsa semanal de horas
- **Facturación**: rango de fechas para el cálculo de desvío, opciones de contrato disponibles
- **Backups**: intervalo de auto-guardado en Drive, toggles para backups preventivos antes de acciones destructivas
- **Peligro**: acciones destructivas — vaciar planificador, resetear recuperaciones de festivos. Import/export local de emergencia.

---

## 12. GOOGLE DRIVE

Sincronización de datos con Google Drive (panel visible en el Home).

- **Conexión**: autenticación OAuth con cuenta de Google
- **Auto-guardado**: cada 30 minutos si hay cambios pendientes
- **Backup manual**: botón "Guardar ahora"
- **Ver backups**: lista de archivos en Drive con fecha y tamaño, carga con un clic
- **Backups preventivos**: guardado automático antes de acciones destructivas (si está activado en Configuración)
- **Carpeta**: todos los backups se guardan en una carpeta "Planificador de Turnos" en Drive

---

## Navegación

### Barra lateral (siempre visible)
Iconos verticales: Home → Planificador → Plantilla → Gestión diaria → Turnos → Calendario → Análisis → Presentación → Importar → Exportar → Alertas → Configuración

### Home
Mapa visual con tiles organizados en 4 columnas. Al hacer hover sobre cualquier tile, aparece un **circuito animado** que muestra los submódulos que lo componen, con líneas que se dibujan progresivamente con efecto de chispa naranja.

### Atajos de teclado
- **Ctrl+Z / Ctrl+Y**: Deshacer / Rehacer (20 snapshots)
- **Ctrl (mantener)**: Activa temporalmente el modo Cambiar en drag & drop

---

## Robustez (bajo el capó)

Mecanismos de protección invisibles para el usuario:
- **Error handler global**: banner discreto al pie si ocurre un error JS, con botón "Copiar detalle" para diagnóstico
- **Rescue JSON corrupto**: si los datos guardados no se pueden leer, guarda copia de seguridad y permite descarga antes de arrancar vacío
- **Validación de schema**: al arrancar, verifica que cada campo tiene el tipo correcto y descarta solo los inválidos
- **Protección multi-pestaña**: si otra pestaña guarda cambios, avisa con banner + botón Recargar (no se pisan datos)
