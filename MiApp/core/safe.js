const Safe = {
    _timers: {},
    _latest: {},
    _debounceMs: 350,
    load: function(k) { try { return localStorage.getItem(k); } catch(e) { document.getElementById('storage-warning').style.display='inline-block'; return null; } },
    saveImmediate: function(k, d) { try { localStorage.setItem(k, JSON.stringify(d)); } catch(e) { document.getElementById('storage-warning').style.display='inline-block'; } },
    save: function(k, d) {
        // Debounce only the main DB writes to keep UI responsive; keep other keys immediate
        if(k !== 'v40_db') return this.saveImmediate(k, d);
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
    }
};
