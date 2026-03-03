// ============================================================
// LÓGICA: Config tienda: horarios base, festivos, días especiales
// ============================================================

Object.assign(App.logic, {
        stBase: function(d,f,v) { if(!App.data.storeConfig.base[d]) App.data.storeConfig.base[d]={}; App.data.storeConfig.base[d][f]=v; Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        holAdd: function() { App.data.storeConfig.holidays.push({date:"",note:""}); Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        holUpd: function(i,f,v) { App.data.storeConfig.holidays[i][f]=v; Safe.save('v40_db',App.data); if(f==='date') App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        holDel: function(i) { App.data.storeConfig.holidays.splice(i,1); Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        specAdd: function() { App.data.storeConfig.special.push({date:"", open:"10:00", close:"22:00", closed:false}); Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        specUpd: function(i,f,v) { App.data.storeConfig.special[i][f]=v; Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        specDel: function(i) { App.data.storeConfig.special.splice(i,1); Safe.save('v40_db',App.data); App.ui.renderCalendario(document.querySelector('.main-scroll')); },
        
        // EXPORT LOGIC
});
