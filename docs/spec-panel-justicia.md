# Spec: Panel de Justicia — Intercambios rápidos para equilibrar semanas

## Problema

Al planificar una semana, el usuario necesita ver **simultáneamente**:

- **Balance semanal**: horas asignadas vs contrato, diferencia, desvío acumulado, libranzas, dots de la semana.
- **Equilibrio de turnos**: distribución M/T/I/P por empleado (porcentajes acumulados).

Actualmente ambas vistas son pestañas independientes del inspector — solo se ve una a la vez. Esto obliga a ir alternando entre ellas mientras se intenta equilibrar la semana mediante intercambios de turnos.

El objetivo es poder **ver ambos datos a la vez** y hacer **swaps rápidos** (click-click en dos celdas del mismo día, distinto empleado) sin salir de esa vista.

---

## Opciones evaluadas

### Opción 1 — Inspector split (dos paneles apilados)

Dividir el inspector en top/bottom, cada mitad con su propia pestaña. Arriba Balance, abajo Equilibrio.

- **Pro**: no toca la grid, no duplica código, solo cambia layout del inspector.
- **Contra**: cada panel queda con la mitad de alto — apretado con muchos empleados.

### Opción 2 — Pestaña fusionada "Justicia" en el inspector (recomendada)

Nueva pestaña del inspector que combina ambas tablas en una sola vista compacta:

| Emp | Cntr | Asig | Dif | Des | M | T | I | P | Semana (L-D) |
|-----|------|------|-----|-----|---|---|---|---|--------------|

- Columnas de balance: Cntr, Asig, Dif, Des (desvío acumulado).
- Columnas de equilibrio: M%, T%, I%, P% con sus gradientes de color.
- Dots de la semana: clickeables para swap (click celda A + click celda B mismo día = intercambio).
- Botón flotante `⇄ Intercambiar` aparece tras seleccionar dos celdas válidas.

**Pro**: toda la info en una tabla, diseñada para este flujo. Los dots ya existen en el balance — solo se añaden columnas de equilibrio.
**Contra**: tabla ancha, pero el inspector ya tiene scroll horizontal.

### Opción 3 — Panel flotante para equilibrio

Al activar un modo AJUSTAR, el equilibrio se muestra en un popover/drawer flotante sobre la grid, independiente del inspector (que se queda en Balance).

- **Pro**: no cambia la estructura del inspector.
- **Contra**: complejidad UI, posible oclusión de la grid, más código.

### Opción descartada — Tercer modo en el switch de vista

Añadir `group | individual | justicia` al switch VISTA del planner. Descartada porque duplicaría la grid entera solo para añadir mecánica click-click-swap, y el panel de justicia no es una "vista" sino un modo de trabajo.

---

## Decisión pendiente

La opción 2 (pestaña fusionada) es la recomendada. Pendiente de confirmación del usuario.

## Contexto técnico

- Lógica de swap ya existe: `shiftDrop` en `logic-schedule.js:1167` — reutilizable.
- Balance semanal: `renderMonitorBalance()` en `ui-planner.js:428`.
- Equilibrio: `renderMonitorEquilibrio()` en `ui-planner.js:1048`.
- Semanas cerradas: `_getLockedWeeks()` en `ui-employees.js:7`.
- El equilibrio tiene dos modos (cerradas / rango) — en Justicia probablemente solo aplique la semana actual.
