# Planner 2026 — Propósito y visión

## ¿Qué es?

Planner 2026 es una herramienta de planificación de turnos diseñada para tiendas retail. Nació de una necesidad real: gestionar el cuadrante semanal de una tienda con 10-14 empleados, turnos rotativos, festivos, vacaciones, llaves de apertura/cierre y toda la complejidad operativa que eso conlleva.

No es un software genérico de RRHH. Es una herramienta hecha **por un manager de tienda, para managers de tienda**.

## ¿Qué problema resuelve?

Antes de Planner, el cuadrante se gestionaba con Excel ("el Eficiente" o "ROTA"), un sistema que funciona pero que tiene limitaciones importantes:

- **No valida nada.** Puedes poner a alguien a trabajar en vacaciones y no te avisa.
- **No calcula desvíos.** Saber si alguien lleva más o menos horas de las que debería requiere cálculos manuales.
- **No gestiona festivos.** El seguimiento de qué festivos se han trabajado, cuáles se deben devolver y cuándo, es un cuaderno aparte.
- **No visualiza patrones.** Ver si los fines de semana están equilibrados o si un turno domina sobre otro requiere contar a mano.
- **No gestiona llaves.** Quién tiene la llave de la tienda, quién abre, quién cierra, cuándo hay que hacer traspasos — todo está en la cabeza del manager.

Planner resuelve todo esto en una sola herramienta, accesible desde el navegador, sin instalación, con backup automático en Google Drive.

## ¿Para quién es?

Para **managers y assistant managers de tiendas retail** que:

- Gestionan equipos de 4-20 personas
- Trabajan con turnos rotativos (mañana, tarde, partido, intermedio)
- Necesitan cubrir apertura y cierre todos los días
- Tienen que equilibrar horas contratadas, festivos, vacaciones y preferencias
- Quieren dejar de depender de Excel para algo tan crítico

## Principios de diseño

1. **Cero instalación.** Se abre en el navegador. Los datos viven en localStorage + Google Drive.
2. **Una sola pantalla principal.** El planificador semanal es el centro de todo. Todo lo demás orbita alrededor.
3. **Validación en tiempo real.** Si algo no cuadra (horas, festivos, conflictos), la herramienta avisa.
4. **Importación desde el sistema existente.** Se puede copiar y pegar desde el Eficiente/ROTA para no empezar de cero.
5. **Imprimible.** La vista de presentación genera PDFs limpios para colgar en el tablón o enviar por email.

## Estado actual

La herramienta está en uso real en producción (tienda Madrid Islazul) desde noviembre 2025. Se ha ido construyendo iterativamente, añadiendo funcionalidades según las necesidades reales del día a día.

Versión actual: **v1.0** (~16.000 líneas de código, ~20 archivos).

Tecnología: JavaScript vanilla, sin frameworks ni bundlers. Un solo HTML con módulos JS. Funciona offline (excepto Drive).
