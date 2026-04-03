// ============================================================
// Configuración de administrador (equipo de operaciones)
// Este archivo contiene datos compartidos por todas las tiendas.
// Solo debe ser editado por el equipo de operaciones.
// ============================================================

const ADMIN_CONFIG = {

    // Previsión de facturación semanal (WK01 a WK52)
    // Fuente: tabla de previsión anual de la compañía
    // Última actualización: 03/04/2026
    facturacion: [
        0,        // WK01 (sin datos)
        0,        // WK02 (sin datos)
        0,        // WK03 (sin datos)
        0,        // WK04 (sin datos)
        0,        // WK05 (sin datos)
        0,        // WK06 (sin datos)
        0,        // WK07 (sin datos)
        0,        // WK08 (sin datos)
        1806714,  // WK09
        1872197,  // WK10
        1844992,  // WK11
        1762960,  // WK12
        1788394,  // WK13
        1910736,  // WK14
        1952217,  // WK15
        1779809,  // WK16
        1809015,  // WK17
        1615051,  // WK18
        1978365,  // WK19
        1897346,  // WK20
        1754517,  // WK21
        1755192,  // WK22
        1965808,  // WK23
        1960874,  // WK24
        1936625,  // WK25
        2068392,  // WK26
        2177491,  // WK27
        2195665,  // WK28
        2127696,  // WK29
        2097632,  // WK30
        2250980,  // WK31
        2322817,  // WK32
        2095295,  // WK33
        2205866,  // WK34
        2239648,  // WK35
        2455512,  // WK36
        2205429,  // WK37
        2165113,  // WK38
        2323579,  // WK39
        2439965,  // WK40
        2410258,  // WK41
        2252400,  // WK42
        2220018,  // WK43
        2187955,  // WK44
        2267097,  // WK45
        2325166,  // WK46
        2369854,  // WK47
        2661660,  // WK48
        2907464,  // WK49
        2725482,  // WK50
        3119436,  // WK51
        3348020,  // WK52
        3283247,  // WK01 (2027)
        3202267,  // WK02 (2027)
        2648962,  // WK03 (2027)
        2271829,  // WK04 (2027)
        2205678,  // WK05 (2027)
        2339474,  // WK06 (2027)
        2332074,  // WK07 (2027)
        2171100,  // WK08 (2027)
        2240325,  // WK09 (2027)
    ],

    // Aquí irán los festivos por comunidad autónoma (próximamente)
    // festivosPorComunidad: { ... }
};
