const Utils = {
    // === TEXTOS DE INFO TIPS ===
    Tips: {
        vigencia: `<span class="tip-title">📅 Vigencia del empleado</span>Si dejas ambas fechas vacías, el empleado aparece en todo el histórico.<br><br><strong>Solo inicio:</strong> no aparece en semanas anteriores a esa fecha.<br><strong>Solo fin:</strong> no aparece en semanas posteriores.<br><strong>Ambas:</strong> solo visible en ese rango.<br><br>Útil para incorporaciones tardías, sustituciones o bajas.`,
        saldoInicial: `<span class="tip-title">⚖️ Saldo inicial de horas</span>Horas arrastradas de antes del periodo que estás gestionando.<br><br><strong>Positivo (+):</strong> el empleado tiene horas acumuladas a su favor — deberás compensar con salidas antes.<br><strong>Negativo (−):</strong> el empleado tiene horas pendientes de recuperar.<br><strong>0:</strong> arranca de cero.<br><br>Aparece como primera fila en la tabla de Desvío.`,
        recArrastre: `<span class="tip-title">🔴 Recuperaciones de festivo (arrastre)</span>Días de recuperación de festivo <strong>del curso anterior</strong> que aún debes a este empleado.<br><br>Este contador es manual. Los festivos del curso actual se calculan automáticamente en la pestaña <strong>🗓️ Festivos</strong>.<br><br>Actualízalo conforme vayas dando esos días.`,
        vacPendientes: `<span class="tip-title">🟣 Vacaciones pendientes</span>Días de vacaciones que aún debes a este empleado.<br><br>Contador de referencia manual — no afecta al cálculo de horas esperadas ni al desvío. Úsalo para tener un recordatorio visible en el tooltip del balance semanal.`,
        tag: `<span class="tip-title">🏷️ Tag</span>Clasifica al empleado por el nivel de responsabilidad que aporta en tienda.<br><br><strong>T3:</strong> Manager, AM, Supervisor — cubren funciones de responsable.<br><strong>T1:</strong> Staff — cobertura base.<br><br>El HUD del planificador muestra cuántas personas T3 hay en cada momento, útil para detectar turnos sin responsable.`,
        estadoFestivo: `<span class="tip-title">🗓️ Estados del festivo</span><strong>✅ Disfrutado:</strong> tiene F ese día + 2 libranzas esa semana. Sin deuda.<br><hr><strong>⚠️ Coincide:</strong> tiene F pero con menos de 2 libranzas. El festivo tapa una libranza obligatoria → 1 recuperación, sin Factorial.<br><hr><strong>🔴 Trabaja:</strong> no tiene F — trabajó en festivo → 1 recuperación + solicitud en Factorial.<br><hr><strong>⬜ Sin definir:</strong> no hay turno asignado todavía.`,
        factorial: `<span class="tip-title">📋 Factorial</span>Cuando un empleado trabaja en festivo (<strong>🔴 Trabaja</strong>), hay que solicitar la recuperación en el software de RRHH Factorial.<br><br>Anota aquí la fecha en que hiciste la solicitud. Quedará registrada y visible para seguimiento.`,
        cursoFestivos: `<span class="tip-title">📆 Año de curso</span>El año laboral va del <strong>1 de marzo</strong> al <strong>último día de febrero</strong> del siguiente año.<br><br>Ejemplo: 2025/2026 = 01/03/2025 → 28/02/2026.<br><br>Solo se muestran los festivos del calendario de tienda que caen dentro de este rango y la vigencia del empleado.`,
        columnaCntr: `<span class="tip-title">📊 Cntr — Desvío acumulado</span><span style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,
        columnaDif: `<span class="tip-title">Dif — Diferencia semanal</span><span style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,
        columnaEsp: `<span class="tip-title">Esp. — Horas esperadas</span><span style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,
        turnoExterno: `<span class="tip-title">📤 Turno externo</span><span style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,
        festivosVsDiasEspeciales: `<span class="tip-title">Festivos vs Días especiales</span><span style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,
    },

    getTimeOptions: function(sel, empty=false) { let o=empty?`<option value="" ${sel===""?'selected':''}>--</option>`:''; for(let h=0;h<24;h++) for(let m=0;m<60;m+=30) { let v=`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; o+=`<option value="${v}" ${v===sel?'selected':''}>${v}</option>`; } return o; },
    formatDateES: function(iso) { if(!iso) return ""; const p=iso.split('-'); return `${p[2]}/${p[1]}/${p[0]}`; },
    parseDateES: function(ddmmyyyy) {
        // Convierte DD/MM/AAAA a AAAA-MM-DD
        if(!ddmmyyyy) return "";
        const parts = ddmmyyyy.split('/');
        if(parts.length !== 3) return "";
        const [dd, mm, yyyy] = parts;
        if(!dd || !mm || !yyyy) return "";
        return `${yyyy}-${mm.padStart(2,'0')}-${dd.padStart(2,'0')}`;
    },
    validateDateES: function(text) {
        // Valida formato DD/MM/AAAA
        const regex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = text.match(regex);
        if(!match) return false;
        const [_, dd, mm, yyyy] = match;
        const d = parseInt(dd);
        const m = parseInt(mm);
        const y = parseInt(yyyy);
        if(m < 1 || m > 12) return false;
        if(d < 1 || d > 31) return false;
        if(y < 1900 || y > 2100) return false;
        // Validar fecha real
        const date = new Date(y, m - 1, d);
        return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
    },
    getDateInputHTML: function(id, value, onChange) {
        // Genera un input de texto con calendario personalizado (lunes primer día)
        const display = Utils.formatDateES(value);
        const uniqueId = 'cal-' + id;
        return `<div class="custom-date-input-wrapper">
            <button class="custom-date-btn custom-date-btn-left" onclick="event.preventDefault(); document.getElementById('${id}').focus();">📅</button>
            <input type="text" 
                   id="${id}" 
                   class="custom-date-input"
                   value="${display}" 
                   placeholder="DD/MM/AAAA"
                   data-iso-value="${value}"
                   onchange="${onChange}"
                   onblur="Utils.handleDateInput(this)"
                   onfocus="Utils.showCalendar('${uniqueId}', this)"
                   readonly>
            <div id="${uniqueId}" class="custom-calendar"></div>
        </div>`;
    },
    // --- INFO TIPS ---
    infoTip: function(content) {
        const escaped = content.replace(/'/g, '&#39;').replace(/"/g, '&quot;');
        return `<span class="info-tip" onclick="event.stopPropagation(); Utils.showInfoTip(event, '${escaped}')">i</span>`;
    },
    showInfoTip: function(event, content) {
        let panel = document.getElementById('info-tip-panel');
        if(!panel) {
            panel = document.createElement('div');
            panel.id = 'info-tip-panel';
            panel.className = 'info-tip-panel';
            document.body.appendChild(panel);
            document.addEventListener('click', () => Utils.hideInfoTip());
        }
        // Si ya está visible con el mismo contenido, toggle off
        if(panel.classList.contains('visible') && panel.dataset.content === content) {
            Utils.hideInfoTip(); return;
        }
        panel.innerHTML = content;
        panel.dataset.content = content;
        panel.classList.add('visible');
        // Posicionamiento inteligente usando dimensiones reales
        requestAnimationFrame(() => {
            const rect = event.target.getBoundingClientRect();
            const pw = panel.offsetWidth || 280;
            const ph = panel.offsetHeight || 200;
            const vw = window.innerWidth, vh = window.innerHeight;
            let left = rect.right + 8;
            let top  = rect.top - 8;
            if(left + pw > vw - 10) left = rect.left - pw - 8;
            if(left < 10) left = 10;
            if(top + ph > vh - 10) top = vh - ph - 10;
            if(top < 10) top = 10;
            panel.style.left = left + 'px';
            panel.style.top  = top  + 'px';
        });
    },
    hideInfoTip: function() {
        const panel = document.getElementById('info-tip-panel');
        if(panel) panel.classList.remove('visible');
    },
    PENDING: `<span class="tip-pending" style="color:#fbbf24;font-style:italic;">⏳ Descripción pendiente</span>`,

    handleDateInput: function(input) {
        const text = input.value.trim();
        if(!text) {
            input.dataset.isoValue = "";
            return;
        }
        
        // Validar formato
        if(!Utils.validateDateES(text)) {
            alert('Formato de fecha inválido. Use DD/MM/AAAA\nEjemplo: 15/02/2026');
            const oldValue = input.dataset.isoValue || "";
            input.value = Utils.formatDateES(oldValue);
            return;
        }
        
        // Convertir a ISO y guardar
        const iso = Utils.parseDateES(text);
        input.dataset.isoValue = iso;
        
        // Reformatear para asegurar DD/MM/AAAA limpio
        input.value = Utils.formatDateES(iso);
    },
    
    showCalendar: function(calendarId, input) {
        // Cerrar otros calendarios abiertos
        document.querySelectorAll('.custom-calendar').forEach(cal => {
            if(cal.id !== calendarId) cal.classList.remove('open');
        });
        
        const calendar = document.getElementById(calendarId);
        if(!calendar) return;
        
        // Obtener fecha actual del input o hoy
        let currentDate = new Date();
        const isoValue = input.dataset.isoValue;
        if(isoValue) {
            currentDate = new Date(isoValue);
        }
        
        // Renderizar calendario
        Utils.renderCalendar(calendar, currentDate, input);
        
        // Mostrar/ocultar
        calendar.classList.toggle('open');
        
        // Reposicionar si se sale de la ventana
        if(calendar.classList.contains('open')) {
            calendar.style.left = '0'; calendar.style.right = 'auto';
            requestAnimationFrame(() => {
                const rect = calendar.getBoundingClientRect();
                if(rect.right > window.innerWidth - 4) {
                    calendar.style.left = 'auto';
                    calendar.style.right = '0';
                }
                if(rect.bottom > window.innerHeight - 4) {
                    calendar.style.top = 'auto';
                    calendar.style.bottom = '100%';
                    calendar.style.marginTop = '0';
                    calendar.style.marginBottom = '4px';
                }
            });
        } else {
            calendar.style.left = ''; calendar.style.right = '';
            calendar.style.top = ''; calendar.style.bottom = '';
            calendar.style.marginTop = ''; calendar.style.marginBottom = '';
        }
        
        // Cerrar al hacer clic fuera
        if(calendar.classList.contains('open')) {
            setTimeout(() => {
                document.addEventListener('click', function closeCalendar(e) {
                    if(!calendar.contains(e.target) && e.target !== input && !e.target.classList.contains('custom-date-btn')) {
                        calendar.classList.remove('open');
                        document.removeEventListener('click', closeCalendar);
                    }
                });
            }, 0);
        }
    },
    
    renderCalendar: function(calendarEl, date, inputEl) {
        const year = date.getFullYear();
        const month = date.getMonth();
        
        const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                           'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        // Header con navegación
        let html = `
        <div class="calendar-header">
            <button class="calendar-nav-btn" onclick="event.stopPropagation(); event.preventDefault(); Utils.changeMonth('${calendarEl.id}', ${year}, ${month}, -1, '${inputEl.id}')">◀</button>
            <div class="calendar-month">${monthNames[month]} ${year}</div>
            <button class="calendar-nav-btn" onclick="event.stopPropagation(); event.preventDefault(); Utils.changeMonth('${calendarEl.id}', ${year}, ${month}, 1, '${inputEl.id}')">▶</button>
        </div>`;
        
        // Grid del calendario
        html += `<div class="calendar-grid">`;
        
        // Headers de días (LUNES primero)
        const dayHeaders = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
        dayHeaders.forEach(d => {
            html += `<div class="calendar-day-header">${d}</div>`;
        });
        
        // Primer día del mes
        const firstDay = new Date(year, month, 1);
        // getDay() devuelve 0=domingo, 1=lunes, etc.
        // Ajustar para que lunes=0
        let startDay = firstDay.getDay() - 1;
        if(startDay === -1) startDay = 6; // Domingo
        
        // Días del mes anterior
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
        
        for(let i = startDay - 1; i >= 0; i--) {
            const day = daysInPrevMonth - i;
            html += `<div class="calendar-day other-month">${day}</div>`;
        }
        
        // Días del mes actual
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        const selectedISO = inputEl.dataset.isoValue;
        
        for(let day = 1; day <= daysInMonth; day++) {
            const dateISO = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = (today.getFullYear() === year && today.getMonth() === month && today.getDate() === day);
            const isSelected = (dateISO === selectedISO);
            
            let classes = 'calendar-day';
            if(isToday) classes += ' today';
            if(isSelected) classes += ' selected';
            
            html += `<div class="${classes}" onclick="Utils.selectDate('${dateISO}', '${inputEl.id}', '${calendarEl.id}')">${day}</div>`;
        }
        
        // Días del mes siguiente (completar última semana)
        const totalCells = startDay + daysInMonth;
        const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
        for(let day = 1; day <= remainingCells; day++) {
            html += `<div class="calendar-day other-month">${day}</div>`;
        }
        
        html += `</div>`;
        calendarEl.innerHTML = html;
    },
    
    changeMonth: function(calendarId, year, month, delta, inputId) {
        const newMonth = month + delta;
        let newYear = year;
        let finalMonth = newMonth;
        
        if(newMonth < 0) {
            finalMonth = 11;
            newYear = year - 1;
        } else if(newMonth > 11) {
            finalMonth = 0;
            newYear = year + 1;
        }
        
        const newDate = new Date(newYear, finalMonth, 1);
        const calendarEl = document.getElementById(calendarId);
        const inputEl = document.getElementById(inputId);
        
        Utils.renderCalendar(calendarEl, newDate, inputEl);
    },
    
    selectDate: function(dateISO, inputId, calendarId) {
        const input = document.getElementById(inputId);
        const calendar = document.getElementById(calendarId);
        
        input.dataset.isoValue = dateISO;
        input.value = Utils.formatDateES(dateISO);
        
        // Cerrar calendario
        calendar.classList.remove('open');
        
        // Trigger change event
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    },

    getMonday: function(d) { 
            const date = new Date(d);
            // Fijar al mediodía para evitar problemas de DST
            date.setHours(12, 0, 0, 0);
            const day = date.getDay();
            const diff = date.getDate() - day + (day === 0 ? -6 : 1);
            date.setDate(diff);
            
            // Formateo local manual
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${dayStr}`;
    },    
        
    getWeekDays: function(mondayStr) { let d=new Date(mondayStr); let days=[]; for(let i=0;i<7;i++){ let next=new Date(d); next.setDate(d.getDate()+i); days.push(next.toISOString().slice(0,10)); } return days; },
    getDayName: function(iso) { return ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'][new Date(iso).getDay()]; },
    getDayKey: function(iso) { return ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][new Date(iso).getDay()]; },
    
    getFiscalWeek: function(dateStr) {
        const anchorStr = App.data.config?.weekStart || "2025-12-29";
        const anchor = new Date(anchorStr);
        const current = new Date(dateStr);
        const diffTime = current - anchor;
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const weekOffset = Math.floor(diffDays / 7);
        
        // IMPORTANTE: El anchor date es el inicio del AÑO SIGUIENTE
        // Ejemplo: 2025-12-29 es el inicio de 2026WK01
        const anchorYear = anchor.getFullYear() + 1;
        const weeksInYear = 52;
        
        let year = anchorYear;
        let week = weekOffset + 1;
        
        // Ajustar hacia atrás (semanas negativas)
        while(week <= 0) {
            year--;
            week += weeksInYear;
        }
        
        // Ajustar hacia adelante (semanas > 52)
        while(week > weeksInYear) {
            year++;
            week -= weeksInYear;
        }
        
        return { year, week };
    },
    
    getWeekCode: function(dateStr) {
        const { year, week } = this.getFiscalWeek(dateStr);
        return `${year}WK${String(week).padStart(2, '0')}`;
    },
    
    getWeekLabel: function(iso) {
        const weekCode = this.getWeekCode(iso);
        const d = new Date(iso);
        const monthNames = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
        return `${weekCode} (${monthNames[d.getMonth()]} ${d.getFullYear()})`;
    },

    // Calcula las horas esperadas para un empleado en una semana dada,
    // Devuelve las horas de contrato vigentes para un empleado en una fecha concreta.
    // Si el empleado tiene historial (emp.contratos), busca el tramo aplicable.
    // Si no, usa emp.contrato como fallback (compatibilidad total con datos existentes).
    getContrato: function(emp, isoDate) {
        if(emp.contratos && emp.contratos.length > 0) {
            const sorted = [...emp.contratos].sort((a, b) => b.desde.localeCompare(a.desde));
            const tramo  = sorted.find(t => t.desde <= isoDate);
            if(tramo) return tramo.horas;
            // Fecha anterior al primer tramo → usar emp.contrato original como base
        }
        return emp.contrato || 0;
    },

    // Devuelve el rol vigente del empleado en una fecha dada.
    // Si el tramo activo tiene un rol propio lo usa; si no, cae al emp.rol global.
    getRolEnFecha: function(emp, isoDate) {
        if(emp.contratos && emp.contratos.length > 0) {
            const sorted = [...emp.contratos].sort((a, b) => b.desde.localeCompare(a.desde));
            const tramo  = sorted.find(t => t.desde <= isoDate);
            if(tramo && tramo.rol) return tramo.rol;
        }
        return emp.rol || 'STF';
    },

    // aplicando la regla F/L: los F solo reducen horas si hay L de sobra para cubrirlos.
    // L faltantes = max(0, 2 - countL)
    // F que reducen = max(0, countF - L_faltantes)
    // Otras ausencias (V, R, B, P) siempre reducen.
    calcEsperadas: function(empContrato, weekDays, empId) {
        const dailyH = empContrato / 5;
        let countL = 0, countF = 0, otherJustified = 0;
        weekDays.forEach(d => {
            const sid = App.data.schedule[d] ? App.data.schedule[d][empId] : null;
            const shift = sid ? Utils.getShift(sid) : null;
            if(shift && shift.fixed) {
                if(shift.code === 'L') countL++;
                else if(shift.code === 'F') countF++;
                else if(['V','R','B','P'].includes(shift.code)) otherJustified += dailyH;
            }
        });
        const lFaltantes = Math.max(0, 2 - countL);
        const fReducen   = Math.max(0, countF - lFaltantes);
        const justifiedRaw = (fReducen * dailyH) + otherJustified;
        // Clamp: las ausencias no pueden justificar más horas que el contrato semanal
        const justifiedH = Math.min(justifiedRaw, empContrato);
        const esperadas  = Math.max(0, Math.round((empContrato - justifiedH) * 10) / 10);
        return { esperadas, justifiedH: Math.round(justifiedH * 10) / 10, countL, countF, fReducen, otherJustified };
    },

    
    empleadoVigenteEnFecha: function(empleado, fecha) {
        // Verifica si un empleado está vigente en una fecha dada
        // Considera: active, fechaInicio, fechaFin
        
        // Si no activo, nunca vigente
        if(empleado.active === false) return false;
        
        // Si tiene fechaInicio y estamos ANTES, no vigente
        if(empleado.fechaInicio && fecha < empleado.fechaInicio) {
            return false;
        }
        
        // Si tiene fechaFin y estamos DESPUÉS, no vigente
        if(empleado.fechaFin && fecha > empleado.fechaFin) {
            return false;
        }
        
        // En cualquier otro caso, SÍ vigente
        return true;
    },
    
    empleadoVigenteEnRango: function(empleado, fechaInicio, fechaFin) {
        // Verifica si un empleado estuvo vigente en ALGÚN momento del rango
        // Retorna true si hay solapamiento entre el periodo del empleado y el rango
        
        if(empleado.active === false) return false;
        
        // Si el empleado tiene fechaInicio y el rango termina ANTES, no vigente
        if(empleado.fechaInicio && fechaFin < empleado.fechaInicio) {
            return false;
        }
        
        // Si el empleado tiene fechaFin y el rango empieza DESPUÉS, no vigente
        if(empleado.fechaFin && fechaInicio > empleado.fechaFin) {
            return false;
        }
        
        // Hay solapamiento, el empleado estuvo vigente en algún momento
        return true;
    },

    isStoreOpen: function(min10to22, open, close) { if(!open || !close) return false; const getMin=(t)=>{const[h,m]=t.split(':').map(Number); return h*60+m;}; const minReal=600+(min10to22*30); const minOpen=getMin(open); const minClose=getMin(close); return minReal>=minOpen && minReal<minClose; },
    
    // Clasificar turno automáticamente como M/T/I/P según sus horarios
    classifyShift: function(shift) {
        if(!shift || !shift.start || !shift.end) return null;
        
        // Si tiene código explícito, usarlo (turnos de paleta)
        if(shift.code) return shift.code.charAt(0).toUpperCase();
        
        // Regla 1: Turnos PARTIDOS (tienen break)
        if(shift.breakStart && shift.breakEnd) return 'P';
        
        // Regla 2-4: Turnos NO PARTIDOS según hora de salida
        const [endH, endM] = shift.end.split(':').map(Number);
        const endMinutes = endH * 60 + endM;
        
        // MAÑANA: termina a las 19:00 o antes (1140 min)
        if(endMinutes <= 19 * 60) return 'M';
        
        // TARDE: termina a las 20:30 o más tarde (1230 min)
        if(endMinutes >= 20 * 60 + 30) return 'T';
        
        // INTERMEDIO: termina entre 19:30 y 20:00 (1170-1200 min)
        return 'I';
    },
    
    getShift: function(id) { 
        // Si es un objeto (CUSTOM), devolverlo directamente
        if(typeof id === 'object' && id !== null) return id;
        // Si es un ID, buscar en paleta
        return App.data.fixedShifts.find(s=>s.id===id) || App.data.shiftDefs.find(s=>s.id===id); 
    },
    
    // CUSTOM SHIFT HELPERS
    isCustomShift: function(shift) {
        return typeof shift === 'object' && shift !== null && !shift.id;
    },
    
    createCustomShift: function(start, end, breakStart, breakEnd) {
        return {
            start: start || '',
            end: end || '',
            breakStart: breakStart || '',
            breakEnd: breakEnd || '',
            color: '#6b7280', // Gris oscuro fijo para CUSTOM
            custom: true
        };
    },
    
    matchesPaletteShift: function(customShift) {
    // Buscar coincidencia exacta en paleta (incluyendo descanso).
    if(!customShift || !customShift.start || !customShift.end) return null;

    const getMin = (t)=>{ if(!t) return 0; const [h,m]=t.split(':').map(Number); return h*60+m; };
    const breakDur = (sh)=>{
        if(!sh) return 0;
        if(sh.breakStart && sh.breakEnd){
            let d = getMin(sh.breakEnd) - getMin(sh.breakStart);
            if(d < 0) d += 24*60;
            return d;
        }
        if(typeof sh.break === 'number' && sh.break > 0) return sh.break;
        return 0;
    };

    const customBreak = breakDur(customShift);

    const allShifts = [...App.data.shiftDefs];
    for(let shift of allShifts) {
        if(
            shift.start === customShift.start &&
            shift.end === customShift.end &&
            breakDur(shift) === customBreak &&
            (shift.breakStart || '') === (customShift.breakStart || '') &&
            (shift.breakEnd || '') === (customShift.breakEnd || '')
        ) {
            return shift.id;
        }
    }
    return null;
},
    
    getRequest: function(empId, date) { return App.data.requests.find(r=>r.empId===empId && !r.archived && date>=r.start && date<=r.end); },
    calcHours: function(start, end, bStart, bEnd, breakMinutes) { if(!start || !end) return 0; const getMin=(t)=>{if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m;}; let total=getMin(end)-getMin(start); if(total<0) total+=24*60; let brk=0; if(bStart && bEnd){ brk=getMin(bEnd)-getMin(bStart); if(brk<0) brk+=24*60; } else if(typeof breakMinutes==='number' && breakMinutes>0){ brk=breakMinutes; } return Math.max(0,(total-brk)/60); },
    
    isShiftValidForDay: function(shift, dayConfig) {
        if(!shift) return false;
        if(!shift.start || !shift.end) return true; 
        if(!dayConfig || dayConfig.closed || !dayConfig.open || !dayConfig.close) return false;
        const getMin=(t)=>{const[h,m]=t.split(':').map(Number); return h*60+m;};
        const sStart = getMin(shift.start); const sEnd = getMin(shift.end);
        const dOpen = getMin(dayConfig.open); const dClose = getMin(dayConfig.close);
        return sStart >= dOpen && sEnd <= dClose; 
    },

    renderPlannerTimeline: function(s, dayConfig, empId, date) {
        let html=`<div class="planner-timeline-wrapper"><div class="pt-bg-grid">`;
        // 26 slots de 30min desde 9:30 hasta 22:00 inclusive
        for(let i=0;i<26;i++){ 
            const slotMin = 570 + (i * 30); // Empezar en 9:30 (570 min)
            const slotHour = Math.floor(slotMin / 60);
            const slotMinute = slotMin % 60;
            const slotTime = `${String(slotHour).padStart(2,'0')}:${String(slotMinute).padStart(2,'0')}`;
            const isOpen = !dayConfig.closed && dayConfig.open && dayConfig.close && slotTime >= dayConfig.open && slotTime < dayConfig.close;
            html+=`<div class="pt-slot ${isOpen?'':'closed-zone'}"></div>`; 
        }
        html+=`</div>`;
        if(s) {
            if(s.start && s.end) {
                const rangeStart=570; // 9:30 en minutos
                const rangeTotal=780; // 13 horas (9:30 a 22:30)
                const getMin=(t)=>{if(!t)return 0;const[h,m]=t.split(':').map(Number);return h*60+m;}; 
                const getPct=(min)=>{let rel=min-rangeStart; let pct=(rel/rangeTotal)*100; return Math.max(0,Math.min(100,pct));};
                
                // Determinar color: gris para CUSTOM, color de paleta para normales
                const barColor = Utils.isCustomShift(s) ? '#9ca3af' : s.color;
                
                // Hacer barra(s) editables si tenemos empId y date
                const canEdit = (empId && date);
                const editAttrs = canEdit ? `data-emp="${empId}" data-date="${date}"` : '';
                const dragAttrs = canEdit ? `draggable="true" ondragstart="App.logic.shiftDragStart(event, '${empId}', '${date}')" ondragend="this.style.opacity='1'"` : '';
                
                // Si hay descanso, renderizar dos barras separadas + gap visual
                if(s.breakStart && s.breakEnd) {
                    const tStart = getMin(s.start);
                    const bStart = getMin(s.breakStart);
                    const bEnd = getMin(s.breakEnd);
                    const tEnd = getMin(s.end);
                    
                    // Primera barra (antes del descanso)
                    const bar1Left = getPct(tStart);
                    const bar1Width = getPct(bStart) - bar1Left;
                    if(bar1Width > 0) {
                        const onmousedown = canEdit ? `onmousedown="App.logic.barDragStart(event, '${empId}', '${date}', 'start')"` : '';
                        html+=`<div class="pt-bar" ${editAttrs} ${dragAttrs} ${onmousedown} style="left:${bar1Left}%; width:${bar1Width}%; background-color:${barColor}"></div>`;
                    }
                    
                    // Gap visual (descanso editable)
                    const gapLeft = getPct(bStart);
                    const gapWidth = getPct(bEnd) - gapLeft;
                    if(gapWidth > 0) {
                        const onmousedown = canEdit ? `onmousedown="App.logic.barDragStart(event, '${empId}', '${date}', 'gap')"` : '';
                        html+=`<div class="pt-gap" ${editAttrs} ${onmousedown} style="left:${gapLeft}%; width:${gapWidth}%;"></div>`;
                    }
                    
                    // Segunda barra (después del descanso)
                    const bar2Left = getPct(bEnd);
                    const bar2Width = getPct(tEnd) - bar2Left;
                    if(bar2Width > 0) {
                        const onmousedown = canEdit ? `onmousedown="App.logic.barDragStart(event, '${empId}', '${date}', 'end')"` : '';
                        html+=`<div class="pt-bar" ${editAttrs} ${dragAttrs} ${onmousedown} style="left:${bar2Left}%; width:${bar2Width}%; background-color:${barColor}"></div>`;
                    }
                } else {
                    // Turno normal - una sola barra
                    const tStart = getMin(s.start);
                    const tEnd = getMin(s.end);
                    const barLeft = getPct(tStart);
                    const barWidth = getPct(tEnd) - barLeft;
                    const onmousedown = canEdit ? `onmousedown="App.logic.barDragStart(event, '${empId}', '${date}', 'normal')"` : '';
                    html+=`<div class="pt-bar" ${editAttrs} ${dragAttrs} ${onmousedown} style="left:${barLeft}%; width:${barWidth}%; background-color:${barColor}"></div>`;
                }
            } else {
                html+=`<div style="position:absolute; top:0; left:0; width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:${s.color}; font-weight:bold; font-size:1.1rem; opacity:0.8; z-index:10; background:rgba(255,255,255,0.6); pointer-events:none;">${s.code}</div>`;
            }
        }
        html+=`</div>`; return html;
    },
    renderMiniTimeline: function(s) { return this.renderPlannerTimeline(s, {open:'00:00', close:'24:00', closed:false}); }, 
    getDatePickerHTML: function(val, onChange) { const disp=Utils.formatDateES(val); return `<div class="date-picker-wrapper"><div class="date-display">${disp}</div><div style="position:relative;width:30px;height:30px;"><input type="date" value="${val}" onchange="${onChange}; this.parentElement.previousElementSibling.innerText=Utils.formatDateES(this.value)" style="position:absolute;left:0;top:0;width:100%;height:100%;opacity:0;cursor:pointer;z-index:10;"><button class="date-btn" style="pointer-events:none;position:absolute;left:0;top:0;width:100%;height:100%;">📅</button></div></div>`; },
    
    getPrefColor: function(val) {
        const c = { 'like': '#bbf7d0', 'ok': '#bbf7d0', 'help': '#bae6fd', 'yes': '#bbf7d0', 'hate': '#fecaca', 'no': '#fecaca', 'avoid': '#fecaca', 'indif': '#f1f5f9', 'any': '#f1f5f9', 'M': '#fef08a', 'T': '#fed7aa', 'P': '#e9d5ff', 'short': '#e9d5ff', 'long': '#fbcfe8', 'L': '#bfdbfe', 'M': '#bfdbfe', 'X': '#bfdbfe', 'J': '#bfdbfe', 'V': '#bfdbfe', 'S': '#bfdbfe', 'D': '#bfdbfe' };
        return c[val] || '#fff';
    },
    
    isLightColor: function(hex) {
        // Convertir hex a RGB
        const rgb = parseInt(hex.replace('#', ''), 16);
        const r = (rgb >> 16) & 0xff;
        const g = (rgb >> 8) & 0xff;
        const b = (rgb >> 0) & 0xff;
        // Calcular luminancia relativa (fórmula estándar)
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        // Si la luminancia es mayor a 0.6, es un color claro
        return luminance > 0.6;
    }
};
