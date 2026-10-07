/* À L’HEURE — Badge de synchronisation */
(function(){
  "use strict";
  window.aLHSync={
    set:function(state,text){
      var el=document.getElementById("syncBadge"); if(!el)return;
      el.className="sync-badge "+(state||"idle");
      el.innerHTML='<i></i><span>'+String(text||"Synchronisation…")+'</span>';
    },
    ok:function(){this.set("ok","Synchronisé à l’instant")},
    loading:function(){this.set("loading","Synchronisation…")},
    error:function(){this.set("error","Synchronisation à vérifier")}
  };
})();