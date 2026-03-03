// ============================================================
// UI: Solicitudes y tienda
// ============================================================

Object.assign(App.ui, {
        reqTypeToggle: function(type) {
            const isHRL = type === 'HRL';
            document.getElementById('rq-end-group').style.display  = isHRL ? 'none' : '';
            document.getElementById('rq-hrl-group').style.display  = isHRL ? '' : 'none';
            document.getElementById('rq-start-label').textContent  = isHRL ? 'Fecha' : 'Fecha Inicio';
        },

        // --- STORE ---
        renderStore: function(c) {
            let html = `<div class="store-container">
                <h2 style="margin: 0 0 20px 0; font-size: 1.3rem; color: var(--text-main);">🏪 Configuración de Tienda</h2>
                
                <div class="store-grid">
                    <!-- HORARIO BASE (Arriba Izquierda) -->
                    <div class="store-card">
                        <div class="store-card-header">
                            <div class="store-card-title">📅 Horario Base</div>
                        </div>
                        <table class="store-table">
                            <thead>
                                <tr>
                                    <th>Día</th>
                                    <th>Apertura</th>
                                    <th>Cierre</th>
                                    <th style="text-align:center; width:40px;">Cerrado</th>
                                </tr>
                            </thead>
                            <tbody>`;
            
            ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo","Festivo"].forEach(d => {
                const cf = App.data.storeConfig.base[d] || {open:"10:00", close:"22:00", closed:false};
                const dayLabel = d === "Festivo" ? "🎉 Festivo" : d;
                html += `<tr>
                    <td class="store-day-name">${dayLabel}</td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','open',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.open)}</select></td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','close',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.close)}</select></td>
                    <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${cf.closed?'checked':''} onchange="App.logic.stBase('${d}','closed',this.checked)"></td>
                </tr>`;
            });
            
            html += `</tbody></table></div>
                    
                    <!-- EXCEPCIONES (Arriba Derecha) -->
                    <div class="store-card">
                        <div class="store-card-header">
                            <div class="store-card-title">⚠️ Excepciones de Horario</div>
                            <button class="store-add-btn" onclick="App.logic.specAdd()">+ Añadir</button>
                        </div>`;
            
            if(App.data.storeConfig.special.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay excepciones configuradas</div>`;
            } else {
                html += `<table class="store-table">
                    <thead>
                        <tr>
                            <th style="width:110px;">Fecha</th>
                            <th style="width:70px;">Apert.</th>
                            <th style="width:70px;">Cierre</th>
                            <th style="width:40px; text-align:center;">Off</th>
                            <th style="width:60px;"></th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                App.data.storeConfig.special.forEach((s, i) => {
                    const specOnChange = `App.logic.specUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('store-spec-' + i, s.date, specOnChange)}</td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'open',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.open)}</select></td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'close',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.close)}</select></td>
                        <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${s.closed?'checked':''} onchange="App.logic.specUpd(${i},'closed',this.checked); App.ui.renderCalendario(document.querySelector('.main-scroll'));"></td>
                        <td><button class="store-del-btn" onclick="App.logic.specDel(${i})">✕</button></td>
                    </tr>`;
                });
                
                html += `</tbody></table>`;
            }
            
            html += `</div></div>
                
                <!-- FESTIVOS (Abajo Full Width) -->
                <div class="store-card store-full-width">
                    <div class="store-card-header">
                        <div class="store-card-title">🎊 Festivos ${Utils.infoTip(Utils.Tips.festivosVsDiasEspeciales)}</div>
                        <button class="store-add-btn" onclick="App.logic.holAdd()">+ Añadir</button>
                    </div>`;
            
            if(App.data.storeConfig.holidays.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay festivos configurados</div>`;
            } else {
                html += `<table class="store-table">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nombre</th>
                            <th style="width:60px;"></th>
                        </tr>
                    </thead>
                    <tbody>`;
                
                App.data.storeConfig.holidays.forEach((hol, i) => {
                    const holOnChange = `App.logic.holUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('store-hol-' + i, hol.date, holOnChange)}</td>
                        <td><input type="text" class="store-text-input" value="${hol.note}" onchange="App.logic.holUpd(${i},'note',this.value)" placeholder="Nombre del festivo"></td>
                        <td><button class="store-del-btn" onclick="App.logic.holDel(${i})">✕</button></td>
                    </tr>`;
                });
                
                html += `</tbody></table>`;
            }
            
            html += `</div></div>`;
            c.innerHTML = html;
        },

        _calRenderFestivos: function() {
            const rerender = "App.ui.renderCalendario(document.querySelector('.main-scroll'))";
            let html = `<div class="store-card store-full-width" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                <div class="store-card-header">
                    <div class="store-card-title" style="font-weight:700; font-size:1rem;">🎊 Festivos ${Utils.infoTip(Utils.Tips.festivosVsDiasEspeciales)}</div>
                    <button class="store-add-btn" onclick="App.logic.holAdd()">+ Añadir</button>
                </div>`;
            if(App.data.storeConfig.holidays.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay festivos configurados</div>`;
            } else {
                html += `<table class="store-table"><thead><tr><th>Fecha</th><th>Nombre</th><th style="width:60px;"></th></tr></thead><tbody>`;
                App.data.storeConfig.holidays.forEach((hol, i) => {
                    const holOnChange = `App.logic.holUpd(${i}, 'date', this.dataset.isoValue); ${rerender}`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('cal-hol-' + i, hol.date, holOnChange)}</td>
                        <td><input type="text" class="store-text-input" value="${hol.note}" onchange="App.logic.holUpd(${i},'note',this.value)" placeholder="Nombre del festivo"></td>
                        <td><button class="store-del-btn" onclick="App.logic.holDel(${i})">✕</button></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
            html += `</div>`;
            return html;
        },

        _calRenderTienda: function() {
            const rerender = "App.ui.renderCalendario(document.querySelector('.main-scroll'))";
            let html = `<div class="store-grid">
                <div class="store-card" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <div class="store-card-header">
                        <div class="store-card-title" style="font-weight:700; font-size:1rem;">📅 Horario Base</div>
                    </div>
                    <table class="store-table"><thead><tr><th>Día</th><th>Apertura</th><th>Cierre</th><th style="text-align:center;width:40px;">Cerrado</th></tr></thead><tbody>`;
            ["Lunes","Martes","Miércoles","Jueves","Viernes","Sábado","Domingo","Festivo"].forEach(d => {
                const cf = App.data.storeConfig.base[d] || {open:"10:00", close:"22:00", closed:false};
                const dayLabel = d === "Festivo" ? "🎉 Festivo" : d;
                html += `<tr>
                    <td class="store-day-name">${dayLabel}</td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','open',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.open)}</select></td>
                    <td><select class="store-time-select" onchange="App.logic.stBase('${d}','close',this.value)" ${cf.closed?'disabled':''}>${Utils.getTimeOptions(cf.close)}</select></td>
                    <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${cf.closed?'checked':''} onchange="App.logic.stBase('${d}','closed',this.checked)"></td>
                </tr>`;
            });
            html += `</tbody></table></div>
                <div class="store-card" style="border:1px solid #e2e8f0; border-radius:10px; padding:16px;">
                    <div class="store-card-header">
                        <div class="store-card-title" style="font-weight:700; font-size:1rem;">⚠️ Excepciones de Horario</div>
                        <button class="store-add-btn" onclick="App.logic.specAdd()">+ Añadir</button>
                    </div>`;
            if(App.data.storeConfig.special.length === 0) {
                html += `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:0.85rem;">No hay excepciones configuradas</div>`;
            } else {
                html += `<table class="store-table"><thead><tr><th style="width:110px;">Fecha</th><th style="width:70px;">Apert.</th><th style="width:70px;">Cierre</th><th style="width:40px;text-align:center;">Off</th><th style="width:60px;"></th></tr></thead><tbody>`;
                App.data.storeConfig.special.forEach((s, i) => {
                    const specOnChange = `App.logic.specUpd(${i}, 'date', this.dataset.isoValue)`;
                    html += `<tr>
                        <td>${Utils.getDateInputHTML('cal-spec-' + i, s.date, specOnChange)}</td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'open',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.open)}</select></td>
                        <td><select class="store-time-select" onchange="App.logic.specUpd(${i},'close',this.value)" ${s.closed?'disabled':''} style="min-width:65px;">${Utils.getTimeOptions(s.close)}</select></td>
                        <td style="text-align:center;"><input type="checkbox" class="store-checkbox" ${s.closed?'checked':''} onchange="App.logic.specUpd(${i},'closed',this.checked); ${rerender}"></td>
                        <td><button class="store-del-btn" onclick="App.logic.specDel(${i})">✕</button></td>
                    </tr>`;
                });
                html += `</tbody></table>`;
            }
            html += `</div></div>`;
            return html;
        }
});
