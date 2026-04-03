// ============================================================
// UI: Home y alertas
// ============================================================

Object.assign(App.ui, {
        renderHome: function(c) {
            const alerts = App.logic.getAlerts();
            const dismissed = App.data.dismissedAlerts || [];
            const alertCount = alerts.filter(a => !dismissed.includes(a.title + '||' + (a.date || ''))).length;
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
                    'download': '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/>',
                    'cloud-upload': '<polyline points="16 16 12 12 8 16"/><line x1="12" x2="12" y1="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>',
                    'cloud-off': '<path d="m2 2 20 20"/><path d="M5.782 5.782A7 7 0 0 0 9 19h8.5a4.5 4.5 0 0 0 1.307-.193"/><path d="M21.532 16.5A4.5 4.5 0 0 0 17.5 10h-1.79A7.008 7.008 0 0 0 10 5.07"/>',
                    'settings': '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>'
                };
                return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${paths[name]||''}</svg>`;
            };

            // Constructor de Tile adaptado para modo Espejo (align)
            const tile = (id, iconName, label, dataPill='', badge=false, accent='#2563eb', align='left', subtiles='') => `
                <button class="home-tile ${align === 'right' ? 'home-tile-right' : ''}" onclick="App.router.go('${id}')" style="--accent:${accent};">
                    <div class="home-tile-icon" style="background:${accent}15; color:${accent};">${icon(iconName, 20, 2)}</div>
                    <div class="home-tile-text">
                        <span class="home-tile-label">${label}</span>
                        ${dataPill ? `<span class="home-tile-pill ${badge?'has-badge':''}">${dataPill}</span>` : ''}
                    </div>
                    ${subtiles}
                </button>`;

            const subtiles = (subs) => {
                const h = 38, gap = 4, single = subs.length === 1;
                const wires = subs.map((_,i) => `<span class="home-wire${single?' home-wire-solo':''}" style="top:${i*(h+gap)+h/2}px;"></span>`).join('');
                const boxes = subs.map(s => `<div class="home-subtile">${s}</div>`).join('');
                return `<div class="home-subtiles${single?' home-subtiles-solo':''}">${wires}${boxes}</div>`;
            };

            // Constructor de Grupo adaptado para modo Espejo
            const group = (title, tiles, align='left') => `
                <div class="home-group">
                    <div class="home-group-title" style="text-align: ${align}; padding-${align}: 4px;">${title}</div>
                    <div class="home-group-tiles">${tiles}</div>
                </div>`;
                
            // Lógica inline para editar la tienda al hacer clic
            const editStoreLogic = `const n = prompt('Nombre de la tienda:', '${storeNombre}'); if(n && n.trim() !== ''){ if(!App.data.storeConfig) App.data.storeConfig={base:{},special:[],holidays:[]}; App.data.storeConfig.nombre=n.trim(); Safe.save('v40_db',App.data); App.router.refreshCurrent(); }`;

            // ── Panel Google Drive ────────────────────────────────────────────
            const driveConnected = App.drive.isConnected();
            const driveCfg = (() => { try { return JSON.parse(localStorage.getItem('v40_drive') || '{}'); } catch(e) { return {}; } })();
            const driveClientOk = typeof DRIVE_CLIENT_ID !== 'undefined' && DRIVE_CLIENT_ID !== 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com';

            let drivePanel = '';
            if (!driveClientOk) {
                drivePanel = ''; // Sin CLIENT_ID no mostramos nada
            } else if (!driveConnected) {
                drivePanel = `
                    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:14px 20px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;max-width:520px;margin:0 auto;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${icon('cloud-off', 18, 1.5)}
                            <span style="font-size:0.83rem;color:#64748b;font-weight:500;">Google Drive no conectado — tus datos solo están en este equipo</span>
                        </div>
                        <button onclick="App.drive.connect()"
                            style="padding:7px 16px;border-radius:20px;border:1.5px solid #2563eb;background:white;color:#2563eb;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                            ☁️ Conectar Drive
                        </button>
                    </div>`;
            } else {
                const lastSave = driveCfg.lastSave ? new Date(driveCfg.lastSave).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}) : 'nunca';
                const folderName = driveCfg.folderName || App.drive.FOLDER_NAME;
                drivePanel = `
                    <div id="drive-panel" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;max-width:620px;margin:0 auto;overflow:hidden;">
                        <!-- Cabecera siempre visible -->
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0;"></span>
                                <span style="font-size:0.82rem;color:#166534;font-weight:600;">Drive conectado</span>
                                <span style="font-size:0.75rem;color:#6b7280;">· guardado: ${lastSave}</span>
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button onclick="document.getElementById('drive-save-modal').classList.add('open')"
                                    style="padding:5px 14px;border-radius:16px;border:1.5px solid #10b981;background:white;color:#059669;font-size:0.75rem;font-weight:700;cursor:pointer;">
                                    ☁️ Guardar ahora
                                </button>
                                <button onclick="App.drive.togglePanel()"
                                    id="drive-panel-toggle"
                                    style="padding:5px 10px;border-radius:16px;border:1px solid #bbf7d0;background:white;color:#166534;font-size:0.75rem;cursor:pointer;font-weight:600;">
                                    ▼ Ver backups
                                </button>
                            </div>
                        </div>
                        <!-- Panel expandible -->
                        <div id="drive-panel-body" style="display:none;border-top:1px solid #bbf7d0;padding:14px 16px;background:white;">
                            <!-- Carpeta -->
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                                <span style="font-size:0.78rem;color:#64748b;">📁 Carpeta:</span>
                                <span id="drive-folder-name" style="font-size:0.78rem;font-weight:600;color:#1e293b;">${folderName}</span>
                                <button onclick="App.drive.promptChangeFolder()"
                                    style="padding:2px 10px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#64748b;font-size:0.7rem;cursor:pointer;">
                                    Cambiar
                                </button>
                            </div>
                            <!-- Lista de backups -->
                            <div style="font-size:0.78rem;font-weight:600;color:#64748b;margin-bottom:8px;">Backups en Drive</div>
                            <div id="drive-file-list" style="display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto;">
                                <div style="color:#94a3b8;font-size:0.78rem;padding:10px 0;">Cargando...</div>
                            </div>
                            <div style="margin-top:12px;text-align:right;">
                                <button onclick="App.drive.disconnect()"
                                    style="padding:4px 12px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#94a3b8;font-size:0.72rem;cursor:pointer;">
                                    Desconectar Drive
                                </button>
                            </div>
                        </div>
                    </div>`;
            }

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
                .home-tile .home-subtiles {
                    position: absolute; top: 50%; transform: translateY(-50%); z-index: 10;
                    flex-direction: column; gap: 4px;
                    pointer-events: none;
                    display: flex;
                }
                .home-tile:hover .home-subtiles { pointer-events: auto; }
                .home-subtile {
                    opacity: 0; transition: opacity 0.08s ease;
                }
                .home-tile:hover .home-subtile { opacity: 1; transition: opacity 0.6s ease 0.7s; }
                .home-tile:not(.home-tile-right) .home-subtiles { right: calc(100% + 48px); align-items: stretch; }
                .home-tile.home-tile-right .home-subtiles { left: calc(100% + 48px); align-items: stretch; }
                .home-subtile {
                    position: relative;
                    padding: 10px 28px; border-radius: 10px; border: 1px solid #e2e8f0;
                    background: #f8fafc; font-size: 0.88rem; font-weight: 600; color: #94a3b8;
                    cursor: default; white-space: nowrap; text-align: center;
                }

                /* ── Conectores tipo circuito ── */

                /* Puente horizontal: tile → tronco (mitad del gap) */
                .home-tile:not(.home-tile-right) .home-subtiles::after {
                    content: ''; position: absolute;
                    top: 50%;
                    left: calc(100% + 24px); width: 24px; height: 1.5px;
                    background: #cbd5e1; transform-origin: right;
                    transform: translateY(-50%) scaleX(0); opacity: 0;
                }
                /* Tronco vertical: une las ramas */
                .home-tile:not(.home-tile-right) .home-subtiles::before {
                    content: ''; position: absolute;
                    left: calc(100% + 24px); width: 1.5px;
                    top: 19px; bottom: 19px;
                    background: #cbd5e1; transform: scaleY(0); transform-origin: center; opacity: 0;
                }
                /* Ramas horizontales: tronco → cada subtile (spans dentro del contenedor) */
                .home-tile:not(.home-tile-right) .home-wire {
                    position: absolute;
                    left: calc(100% + 0.5px); width: 24px; height: 1.5px;
                    background: #cbd5e1; transform: translateY(-50%) scaleX(0); transform-origin: right; opacity: 0;
                }

                /* Columna derecha: espejo */
                .home-tile.home-tile-right .home-subtiles::after {
                    content: ''; position: absolute;
                    top: 50%;
                    right: calc(100% + 23px); width: 24px; height: 1.5px;
                    background: #cbd5e1; transform-origin: left;
                    transform: translateY(-50%) scaleX(0); opacity: 0;
                }
                .home-tile.home-tile-right .home-subtiles::before {
                    content: ''; position: absolute;
                    right: calc(100% + 23px); width: 1.5px;
                    top: 19px; bottom: 19px;
                    background: #cbd5e1; transform: scaleY(0); transform-origin: center; opacity: 0;
                }
                /* Caso solo: 1 subtile → línea recta sin tronco */
                .home-subtiles-solo::before, .home-subtiles-solo::after { display: none !important; }

                .home-tile.home-tile-right .home-wire {
                    position: absolute;
                    right: calc(100% - 0.5px); width: 25px; height: 1.5px;
                    background: #cbd5e1; transform: translateY(-50%) scaleX(0); transform-origin: left; opacity: 0;
                }

                /* Animaciones secuenciales: tile → tronco → ramas */
                .home-tile:hover .home-subtiles::after {
                    animation: circuit-draw 0.35s cubic-bezier(0.4,0,0.2,1) 0s forwards;
                }
                .home-tile:hover .home-subtiles::before {
                    animation: circuit-trunk 0.35s cubic-bezier(0.4,0,0.2,1) 0.25s forwards;
                }
                .home-tile:hover .home-wire { animation: circuit-draw 0.3s cubic-bezier(0.4,0,0.2,1) forwards; }
                .home-tile:hover .home-wire:nth-of-type(1) { animation-delay: 0.5s; }
                .home-tile:hover .home-wire:nth-of-type(2) { animation-delay: 0.4s; }
                .home-tile:hover .home-wire:nth-of-type(3) { animation-delay: 0.6s; }
                .home-tile:hover .home-wire:nth-of-type(4) { animation-delay: 0.7s; }

                @keyframes circuit-draw {
                    0%   { opacity: 1; transform: translateY(-50%) scaleX(0); box-shadow: 0 0 6px 2px rgba(245,158,11,0.8); }
                    70%  { box-shadow: 0 0 4px 1px rgba(245,158,11,0.4); }
                    100% { opacity: 1; transform: translateY(-50%) scaleX(1); box-shadow: none; }
                }
                @keyframes circuit-trunk {
                    0%   { opacity: 1; transform: scaleY(0); box-shadow: 0 0 6px 2px rgba(245,158,11,0.8); }
                    70%  { box-shadow: 0 0 4px 1px rgba(245,158,11,0.4); }
                    100% { opacity: 1; transform: scaleY(1); box-shadow: none; }
                }
                /* Animaciones columna derecha (usan mismos keyframes, transform-origin las espeja) */
                .home-tile.home-tile-right:hover .home-subtiles::after {
                    animation: circuit-draw 0.35s cubic-bezier(0.4,0,0.2,1) 0s forwards;
                }
                .home-tile.home-tile-right:hover .home-subtiles::before {
                    animation: circuit-trunk 0.35s cubic-bezier(0.4,0,0.2,1) 0.25s forwards;
                }
                .home-tile.home-tile-right:hover .home-wire { animation: circuit-draw 0.3s cubic-bezier(0.4,0,0.2,1) forwards; }
                .home-tile.home-tile-right:hover .home-wire:nth-of-type(1) { animation-delay: 0.5s; }
                .home-tile.home-tile-right:hover .home-wire:nth-of-type(2) { animation-delay: 0.4s; }
                .home-tile.home-tile-right:hover .home-wire:nth-of-type(3) { animation-delay: 0.6s; }
                .home-tile.home-tile-right:hover .home-wire:nth-of-type(4) { animation-delay: 0.7s; }

                /* Caso solo: 1 subtile → línea recta completa sin tronco */
                .home-tile.home-tile-right .home-wire.home-wire-solo { width: 48px !important; }
                .home-tile:hover .home-wire.home-wire-solo { animation-delay: 0s !important; animation-duration: 0.5s !important; }
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
                    gap: 14px;
                    width: 100%;
                    padding: 24px 20px;
                    background: transparent;
                    border: none;
                    border-radius: 16px;
                    cursor: pointer;
                    color: #1e293b;
                    transition: all 0.18s ease;
                    position: relative;
                    text-align: center;
                }
                .home-planner-btn:hover {
                    background: white;
                    border: none;
                    box-shadow: 0 8px 24px rgba(37,99,235,0.13);
                    transform: translateY(-2px);
                }
                .home-planner-btn:hover .home-planner-icon { background: #47556928; }
                .home-planner-btn:hover .home-planner-arrow { color: #2563eb; opacity: 1; }
                .home-planner-icon {
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 240px;
                    height: 240px;
                    background: #47556918;
                    border-radius: 32px;
                    color: #334155;
                    transition: background 0.18s;
                }
                .home-planner-label {
                    font-size: 1.15rem;
                    font-weight: 700;
                    color: #0f172a;
                    letter-spacing: 0.01em;
                    line-height: 1.2;
                    margin-bottom: 4px;
                }
                .home-planner-sub {
                    font-size: 0.78rem;
                    color: #64748b;
                    font-weight: 500;
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
                        tile('empleados', 'users', 'Plantilla', `${activeEmps} activos`, false, '#2563eb', 'left',
                            subtiles(['Contratos', 'Desvíos', 'Festivos', 'Preferencias'])) +
                        tile('requests',  'inbox', 'Gestión diaria', pendingReqs > 0 ? `${pendingReqs} por revisar` : 'Todo al día', pendingReqs > 0, '#f59e0b', 'left',
                            subtiles(App.data.config.llavesActivo ? ['Solicitudes', 'Eventos', 'Llaves'] : ['Solicitudes', 'Eventos'])),
                        'left'
                    )}
                    ${group('Catálogos',
                        tile('shifts',  'palette', 'Turnos', `${shiftCount} turnos base`, false, '#8b5cf6', 'left',
                            subtiles(['Paleta de turnos', 'Edición de turnos', 'Turnos Ad Hoc'])) +
                        tile('calendario', 'calendar-range', 'Calendario', 'Festivos y cierres', false, '#10b981', 'left',
                            subtiles(['Horarios de tienda', 'Festivos', 'Bloqueos'])),
                        'left'
                    )}
                </div>

                <div class="home-col-mid">
                    <button class="home-planner-btn" onclick="App.router.go('planificador')">
                        <div class="home-planner-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="172" height="172" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
                        </div>
                        <div>
                            <div class="home-planner-label">Planificador</div>
                            <div class="home-planner-sub">Abrir cuadrante semanal</div>
                        </div>

                    </button>
                </div>

                <div class="home-col-right">
                    ${group('Revisión',
                        tile('analisis', 'bar-chart-2', 'Análisis', 'Desvíos y métricas', false, '#3b82f6', 'right',
                            subtiles(['Turnos vs Facturación', 'Equilibrio de turnos', 'Turnos más usados'])) +
                        tile('presentacion', 'printer', 'Presentación', 'Vista PDF e impresión', false, '#64748b', 'right',
                            subtiles(App.data.config.llavesActivo ? ['Semanal grupo', 'Mensual individual', 'Traspasos de llaves'] : ['Semanal grupo', 'Mensual individual'])),
                        'right'
                    )}
                    ${group('Datos',
                        tile('export', 'upload', 'Exportar', 'Excel y Calendar', false, '#059669', 'right',
                            subtiles(['Hacia Eficiente', 'Hacia Calendar', 'Master Data'])) +
                        tile('import', 'download', 'Importar', 'Desde el eficiente', false, '#94a3b8', 'right',
                            subtiles(['Desde Rota Eficiente'])),
                        'right'
                    )}
                </div>

                <div class="home-drive-row" style="grid-column:1/-1;">
                    <div style="display:flex;align-items:center;justify-content:center;gap:12px;">
                        <div style="flex:1;max-width:620px;">${drivePanel}</div>
                        <button onclick="App.router.go('config')" title="Configuración"
                            style="flex-shrink:0;display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#64748b;cursor:pointer;transition:all 0.15s;"
                            onmouseenter="this.style.background='#f1f5f9';this.style.color='#2563eb';this.style.borderColor='#2563eb';"
                            onmouseleave="this.style.background='white';this.style.color='#64748b';this.style.borderColor='#e2e8f0';">
                            ${icon('settings', 18, 1.75)}
                        </button>
                    </div>
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
            // ── Panel Google Drive ────────────────────────────────────────────
            const driveConnected = App.drive.isConnected();
            const driveCfg = (() => { try { return JSON.parse(localStorage.getItem('v40_drive') || '{}'); } catch(e) { return {}; } })();
            const driveClientOk = typeof DRIVE_CLIENT_ID !== 'undefined' && DRIVE_CLIENT_ID !== 'TU_CLIENT_ID_AQUI.apps.googleusercontent.com';

            let drivePanel = '';
            if (!driveClientOk) {
                drivePanel = ''; // Sin CLIENT_ID no mostramos nada
            } else if (!driveConnected) {
                drivePanel = `
                    <div style="display:flex;align-items:center;justify-content:center;gap:16px;padding:14px 20px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:10px;max-width:520px;margin:0 auto;">
                        <div style="display:flex;align-items:center;gap:8px;">
                            ${icon('cloud-off', 18, 1.5)}
                            <span style="font-size:0.83rem;color:#64748b;font-weight:500;">Google Drive no conectado — tus datos solo están en este equipo</span>
                        </div>
                        <button onclick="App.drive.connect()"
                            style="padding:7px 16px;border-radius:20px;border:1.5px solid #2563eb;background:white;color:#2563eb;font-size:0.78rem;font-weight:700;cursor:pointer;white-space:nowrap;flex-shrink:0;">
                            ☁️ Conectar Drive
                        </button>
                    </div>`;
            } else {
                const lastSave = driveCfg.lastSave ? new Date(driveCfg.lastSave).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}) : 'nunca';
                const folderName = driveCfg.folderName || App.drive.FOLDER_NAME;
                drivePanel = `
                    <div id="drive-panel" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;max-width:620px;margin:0 auto;overflow:hidden;">
                        <!-- Cabecera siempre visible -->
                        <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 16px;flex-wrap:wrap;">
                            <div style="display:flex;align-items:center;gap:8px;">
                                <span style="width:8px;height:8px;border-radius:50%;background:#10b981;flex-shrink:0;"></span>
                                <span style="font-size:0.82rem;color:#166534;font-weight:600;">Drive conectado</span>
                                <span style="font-size:0.75rem;color:#6b7280;">· guardado: ${lastSave}</span>
                            </div>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button onclick="document.getElementById('drive-save-modal').classList.add('open')"
                                    style="padding:5px 14px;border-radius:16px;border:1.5px solid #10b981;background:white;color:#059669;font-size:0.75rem;font-weight:700;cursor:pointer;">
                                    ☁️ Guardar ahora
                                </button>
                                <button onclick="App.drive.togglePanel()"
                                    id="drive-panel-toggle"
                                    style="padding:5px 10px;border-radius:16px;border:1px solid #bbf7d0;background:white;color:#166534;font-size:0.75rem;cursor:pointer;font-weight:600;">
                                    ▼ Ver backups
                                </button>
                            </div>
                        </div>
                        <!-- Panel expandible -->
                        <div id="drive-panel-body" style="display:none;border-top:1px solid #bbf7d0;padding:14px 16px;background:white;">
                            <!-- Carpeta -->
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
                                <span style="font-size:0.78rem;color:#64748b;">📁 Carpeta:</span>
                                <span id="drive-folder-name" style="font-size:0.78rem;font-weight:600;color:#1e293b;">${folderName}</span>
                                <button onclick="App.drive.promptChangeFolder()"
                                    style="padding:2px 10px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#64748b;font-size:0.7rem;cursor:pointer;">
                                    Cambiar
                                </button>
                            </div>
                            <!-- Lista de backups -->
                            <div style="font-size:0.78rem;font-weight:600;color:#64748b;margin-bottom:8px;">Backups en Drive</div>
                            <div id="drive-file-list" style="display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto;">
                                <div style="color:#94a3b8;font-size:0.78rem;padding:10px 0;">Cargando...</div>
                            </div>
                            <div style="margin-top:12px;text-align:right;">
                                <button onclick="App.drive.disconnect()"
                                    style="padding:4px 12px;border-radius:10px;border:1px solid #e2e8f0;background:white;color:#94a3b8;font-size:0.72rem;cursor:pointer;">
                                    Desconectar Drive
                                </button>
                            </div>
                        </div>
                    </div>`;
            }

                        c.innerHTML = `<h2>Panel de Alertas</h2><p style="color:#64748b">Conflictos detectados en la planificación.</p>`;
            // Accesos rápidos
            c.innerHTML += '<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px 18px;max-width:620px;margin:0 auto 20px;">' +
                '<div style="font-size:0.72rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Accesos rápidos</div>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button onclick="App.uiState.reqSection=\'llaves\';App.router.go(\'requests\')" ' +
                        'style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;background:white;font-size:0.8rem;cursor:pointer;">🔑 Optimizador de llaves</button>' +
                    '<button onclick="App.router.go(\'planificador\')" ' +
                        'style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;background:white;font-size:0.8rem;cursor:pointer;">📅 Planificador</button>' +
                    '<button onclick="App.router.go(\'requests\')" ' +
                        'style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;background:white;font-size:0.8rem;cursor:pointer;">📋 Gestión diaria</button>' +
                    '<button onclick="App.router.go(\'config\')" ' +
                        'style="padding:5px 14px;border-radius:6px;border:1px solid #e2e8f0;background:white;font-size:0.8rem;cursor:pointer;">⚙️ Config</button>' +
                '</div>' +
            '</div>';
            if(alerts.length === 0) {
                c.innerHTML += `<div style="text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:8px; color:#10b981">✨ Todo limpio. No hay alertas.</div>`;
            } else {
                const dismissed = App.data.dismissedAlerts || [];
                const visible = alerts.filter(a => !dismissed.includes(a.title + '||' + (a.date || '')));
                if(visible.length === 0) {
                    c.innerHTML += `<div style="text-align:center; padding:40px; border:2px dashed #e2e8f0; border-radius:8px; color:#10b981">✨ Todo limpio. No hay alertas.</div>`;
                } else {
                    visible.forEach(a => {
                        const key = a.title + '||' + (a.date || '');
                        const keyEsc = key.replace(/'/g, "\\'");
                        c.innerHTML += `
                        <div class="alert-card">
                            <div class="alert-info">
                                <span class="alert-icon">⚠️</span>
                                <div class="alert-text">
                                    <div>${a.title}</div>
                                    <div>${a.desc}</div>
                                </div>
                            </div>
                            <div style="display:flex;gap:6px;flex-shrink:0;">
                                <button class="btn btn-primary" style="width:auto;margin:0" onclick="App.router.go('planificador'); App.logic.setDate('${a.date}');">Ir al día</button>
                                <button style="width:auto;margin:0;padding:6px 12px;border:1px solid #cbd5e1;border-radius:6px;background:white;color:#64748b;font-size:0.8rem;font-weight:600;cursor:pointer;" onclick="App.logic.dismissAlert('${keyEsc}')">Ignorar</button>
                            </div>
                        </div>`;
                    });
                }
            }
        },

        // --- IMPORT ---
});
