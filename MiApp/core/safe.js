const Safe = {
    _timers: {},
    _latest: {},
    _debounceMs: 350,
    load: function(k) { try { return localStorage.getItem(k); } catch(e) { document.getElementById('storage-warning').style.display='inline-block'; return null; } },
    saveImmediate: function(k, d) { try { localStorage.setItem(k, JSON.stringify(d)); } catch(e) { document.getElementById('storage-warning').style.display='inline-block'; } },
    save: function(k, d) {
        // Debounce only the main DB writes to keep UI responsive; keep other keys immediate
        if(k !== 'v40_db') return this.saveImmediate(k, d);
        // Si otra pestaña guardó, no pisar sus datos
        if(this._staleTab) return;
        this._latest[k] = d;
        if(this._timers[k]) clearTimeout(this._timers[k]);
        this._timers[k] = setTimeout(() => {
            this.saveImmediate(k, this._latest[k]);
            this._timers[k] = null;
            if (window.App && App.drive && App.drive.markPending) App.drive.markPending();
        }, this._debounceMs);
    },
    flush: function(k) {
        const key = k || 'v40_db';
        if(key !== 'v40_db') return;
        if(this._timers[key]) {
            clearTimeout(this._timers[key]);
            this._timers[key] = null;
        }
        if(key in this._latest) this.saveImmediate(key, this._latest[key]);
    },

    // --- Detección multi-pestaña ---
    _staleTab: false,
    _staleBanner: null,
    initTabGuard: function() {
        window.addEventListener('storage', function(e) {
            if (e.key !== 'v40_db' || Safe._staleTab) return;
            Safe._staleTab = true;
            // Pausar auto-guardado para no pisar la otra pestaña
            if (Safe._timers['v40_db']) {
                clearTimeout(Safe._timers['v40_db']);
                Safe._timers['v40_db'] = null;
            }
            var banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#1e40af;color:white;padding:10px 20px;font-size:0.82rem;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 2px 12px rgba(0,0,0,0.3);';
            banner.innerHTML = '<span>Otra pestaña ha guardado cambios. Recarga para no perder datos.</span>'
                + '<button id="stale-reload" style="background:white;color:#1e40af;border:none;padding:5px 14px;border-radius:6px;font-weight:600;cursor:pointer;font-size:0.78rem;">Recargar</button>';
            document.body.appendChild(banner);
            Safe._staleBanner = banner;
            document.getElementById('stale-reload').onclick = function(){ location.reload(); };
        });
    }
};
