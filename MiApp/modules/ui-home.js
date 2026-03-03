// ============================================================
// UI: Home y alertas
// ============================================================

Object.assign(App.ui, {
        renderHome: function(c) {
            const alerts = App.logic.getAlerts();
            const alertCount = alerts.length;
            const pendingReqs = App.data.requests.filter(r => r.status === 'pending' && !r.archived).length;
            const wkCode = Utils.getWeekCode(App.uiState.currentDate);
            const storeNombre = App.data.storeConfig?.nombre || 'Mi Tienda';
            
            // Extraer el número de semana y año para hacerlo conversacional
            const year = wkCode.substring(0, 4);
            const weekNum = parseInt(wkCode.substring(6, 8), 10);
            
            // Datos útiles para las píldoras
            const activeEmps = App.data.empleados.filter(e => e.active !== false).length;
            const shiftCount = App.data.shiftDefs.length;

            // Saludo dinámico según la hora
            const hour = new Date().getHours();
            let greeting = 'Buenas noches';
            let greetIcon = '🌙';
            if(hour >= 6 && hour < 12) { greeting = 'Buenos días'; greetIcon = '☀️'; }
            else if(hour >= 12 && hour < 20) { greeting = 'Buenas tardes'; greetIcon = '👋'; }

            // Lucide icons as inline SVG
            const icon = (name, size=24, sw=1.5) => {
                const paths = {
                    'users': '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
                    'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
                    'palette': '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
                    'calendar-range': '<rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M7 14h2"/><path d="M7 18h5"/><path d="M15 14h2"/>',
                    'bar-chart-2': '<line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/>',
                    'printer': '<polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/>',
                    'upload': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/>',
                    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>'
                };
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths[name]||''}</svg>`;
            };

            // Constructor de Tile adaptado para modo Espejo (align)
            const tile = (id, iconName, label, dataPill='', badge=false, accent='#2563eb', align='left') => `
                <button class="home-tile ${align === 'right' ? 'home-tile-right' : ''}" onclick="App.router.go('${id}')" style="--accent:${accent};">
                    <div class="home-tile-icon" style="background:${accent}15; color:${accent};">${icon(iconName, 20, 2)}</div>
                    <div class="home-tile-text">
                        <span class="home-tile-label">${label}</span>
                        ${dataPill ? `<span class="home-tile-pill ${badge?'has-badge':''}">${dataPill}</span>` : ''}
                    </div>
                </button>`;

            // Constructor de Grupo adaptado para modo Espejo
            const group = (title, tiles, align='left') => `
                <div class="home-group">
                    <div class="home-group-title" style="text-align: ${align}; padding-${align}: 4px;">${title}</div>
                    <div class="home-group-tiles">${tiles}</div>
                </div>`;
                
            // Lógica inline para editar la tienda al hacer clic
            const editStoreLogic = `const n = prompt('Nombre de la tienda:', '${storeNombre}'); if(n && n.trim() !== ''){ if(!App.data.storeConfig) App.data.storeConfig={base:{},special:[],holidays:[]}; App.data.storeConfig.nombre=n.trim(); Safe.save('v40_db',App.data); App.router.refreshCurrent(); }`;

            c.innerHTML = `
            <style>
                .home-wrap {
                    display: grid;
                    grid-template-columns: 1fr 260px 1fr;
                    grid-template-rows: min-content 1fr min-content;
                    gap: 24px;
                    padding: 40px 40px;
                    height: 100%;
                    box-sizing: border-box;
                    max-width: 1040px;
                    margin: 0 auto;
                }
                
                /* Cabecera Conversacional */
                .home-header {
                    grid-column: 1 / -1;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    margin-bottom: 20px;
                    text-align: center;
                }
                .home-greeting {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: #0f172a;
                    letter-spacing: -0.03em;
                    margin-bottom: 10px;
                }
                .home-context {
                    font-size: 0.95rem;
                    color: #64748b;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                .store-badge {
                    color: var(--primary);
                    background: #eff6ff;
                    padding: 4px 12px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.2s;
                    font-weight: 700;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                }
                .store-badge:hover {
                    background: #dbeafe;
                    transform: translateY(-1px);
                }

                .home-col-left  { grid-column: 1; display: flex; flex-direction: column; gap: 32px; justify-content: center; }
                .home-col-mid   { grid-column: 2; display: flex; align-items: center; justify-content: center; }
                .home-col-right { grid-column: 3; display: flex; flex-direction: column; gap: 32px; justify-content: center; }
                .home-alerts-row { grid-column: 1 / -1; display: flex; justify-content: center; }

                .home-group { display: flex; flex-direction: column; gap: 10px; }
                .home-group-title {
                    font-size: 0.65rem;
                    font-weight: 700;
                    text-transform: uppercase;
                    letter-spacing: 0.12em;
                    color: #94a3b8;
                }
                .home-group-tiles { display: flex; flex-direction: column; gap: 8px; }

                /* Tiles Sustractivos */
                .home-tile {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 0 16px;
                    height: 68px; /* Altura fija para simetría */
                    background: transparent;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    text-align: left;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                }
                
                /* Modificador para efecto ESPEJO (columna derecha) */
                .home-tile-right {
                    flex-direction: row-reverse;
                    text-align: right;
                }
                
                .home-tile:hover {
                    background: white;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    transform: translateY(-2px);
                }
                .home-tile-icon {
                    width: 40px; height: 40px;
                    border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                    transition: transform 0.2s;
                }
                .home-tile:hover .home-tile-icon {
                    transform: scale(1.05);
                }
                
                .home-tile-text { display: flex; flex-direction: column; flex: 1; min-width: 0; gap: 2px; }
                /* Ajuste de flexbox para alinear el texto a la derecha en el modo espejo */
                .home-tile-right .home-tile-text { align-items: flex-end; }
                
                .home-tile-label { font-size: 0.9rem; font-weight: 600; color: #1e293b; line-height: 1; }
                
                /* Píldoras de datos suaves */
                .home-tile-pill { 
                    font-size: 0.7rem; 
                    color: #64748b; 
                    font-weight: 500;
                    line-height: 1.2;
                }
                .home-tile-pill.has-badge {
                    color: #ea580c;
                    font-weight: 600;
                }

                /* Botón Héroe Central */
                .home-planner-btn {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    width: 100%;
                    aspect-ratio: 1;
                    background: linear-gradient(145deg, #1e293b, #0f172a);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 24px;
                    cursor: pointer;
                    color: white;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 20px 40px rgba(15, 23, 42, 0.2);
                    position: relative;
                    overflow: hidden;
                }
                .home-planner-btn::before {
                    content: ''; position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.3), transparent 60%);
                    opacity: 0; transition: opacity 0.3s;
                }
                .home-planner-btn:hover {
                    box-shadow: 0 25px 50px rgba(37, 99, 235, 0.3);
                    transform: translateY(-4px);
                    border-color: rgba(59, 130, 246, 0.4);
                }
                .home-planner-btn:hover::before { opacity: 1; }
                
                .home-planner-btn svg { stroke: white; position: relative; z-index: 1; }
                .home-planner-label {
                    font-size: 1.1rem;
                    font-weight: 700;
                    letter-spacing: 0.05em;
                    position: relative; z-index: 1;
                }
                .home-planner-sub {
                    font-size: 0.75rem;
                    color: #94a3b8;
                    font-weight: 500;
                    position: relative; z-index: 1;
                }

                /* Alertas Estilo Toast */
                .home-alerts-bar {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 20px;
                    background: ${alertCount > 0 ? '#fffbeb' : 'transparent'};
                    border: 1px solid ${alertCount > 0 ? '#fde68a' : 'transparent'};
                    border-radius: 99px;
                    cursor: ${alertCount > 0 ? 'pointer' : 'default'};
                    transition: all 0.2s;
                }
                .home-alerts-bar:hover { 
                    transform: ${alertCount > 0 ? 'translateY(-2px)' : 'none'}; 
                    box-shadow: ${alertCount > 0 ? '0 10px 20px rgba(245,158,11,0.1)' : 'none'};
                }
                .home-alerts-text {
                    font-size: 0.8rem;
                    font-weight: 600;
                    color: ${alertCount > 0 ? '#b45309' : '#94a3b8'};
                }
            </style>

            <div class="home-wrap">
                <div class="home-header">
                    <div class="home-greeting">${greetIcon} ${greeting}</div>
                    <div class="home-context">
                        <div class="store-badge" onclick="${editStoreLogic}" title="Haz clic para editar el nombre">
                            🏪 ${storeNombre}
                        </div>
                        <span style="color:#cbd5e1;">|</span>
                        <span>Estás en la semana <strong>${weekNum}</strong> de <strong>${year}</strong></span>
                    </div>
                </div>

                <div class="home-col-left">
                    ${group('Ingredientes',
                        tile('empleados', 'users', 'Plantilla', `${activeEmps} activos`, false, '#2563eb', 'left') +
                        tile('requests',  'inbox', 'Peticiones', pendingReqs > 0 ? `${pendingReqs} por revisar` : 'Todo al día', pendingReqs > 0, '#f59e0b', 'left'),
                        'left'
                    )}
                    ${group('Catálogos',
                        tile('shifts',  'palette', 'Turnos', `${shiftCount} turnos base`, false, '#8b5cf6', 'left') +
                        tile('calendario', 'calendar-range', 'Calendario', 'Festivos y cierres', false, '#10b981', 'left'),
                        'left'
                    )}
                </div>

                <div class="home-col-mid">
                    <button class="home-planner-btn" onclick="App.router.go('planificador')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
                        <div>
                            <div class="home-planner-label">PLANIFICADOR</div>
                            <div class="home-planner-sub">Abrir cuadrante</div>
                        </div>
                    </button>
                </div>

                <div class="home-col-right">
                    ${group('Revisión',
                        tile('analisis', 'bar-chart-2', 'Análisis', 'Desvíos y métricas', false, '#3b82f6', 'right') +
                        tile('presentacion', 'printer', 'Presentación', 'Vista PDF e impresión', false, '#64748b', 'right'),
                        'right'
                    )}
                    ${group('Datos',
                        tile('export', 'upload', 'Exportar', 'Crear Backup o Excel', false, '#059669', 'right') +
                        tile('import', 'download', 'Importar', 'Restaurar datos', false, '#0891b2', 'right'),
                        'right'
                    )}
                </div>

                <div class="home-alerts-row">
                    <div class="home-alerts-bar" onclick="${alertCount > 0 ? "App.router.go('alerts')" : ""}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${alertCount>0?'#ea580c':'#cbd5e1'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>
                        <span class="home-alerts-text">
                            ${alertCount === 0 ? 'Sin conflictos en el planificador' : `Atención: ${alertCount} alerta${alertCount>1?'s':''} detectada${alertCount>1?'s':''}`}
                        </span>
                        ${alertCount > 0 ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>` : ''}
                    </div>
                </div>
            </div>`;
        },

        // --- ALERTS ---
        renderAlerts: function(c) {
            const alerts = App.logic.getAlerts();
            c.innerHTML = `<h2>Panel de Alertas</h2><p style="color:#64748b">Conflictos detectados en la planificación.</p>`;
            if(alerts.length === 0) {
                c.innerHTML += `<div style="text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:8px; color:#10b981">✨ Todo limpio. No hay alertas.</div>`;
            } else {
                alerts.forEach(a => {
                    c.innerHTML += `
                    <div class="alert-card">
                        <div class="alert-info">
                            <span class="alert-icon">⚠️</span>
                            <div class="alert-text">
                                <div>${a.title}</div>
                                <div>${a.desc}</div>
                            </div>
                        </div>
                        <button class="btn btn-primary" style="width:auto; margin:0" onclick="App.router.go('planificador'); App.logic.setDate('${a.date}');">Ir al día</button>
                    </div>`;
                });
            }
        },

        // --- IMPORT ---
});
