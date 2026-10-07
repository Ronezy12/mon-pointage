/* À L’HEURE — Badge de synchronisation */
(function(){
"use strict";
function ensure(){
 var host=document.querySelector(".brand");if(!host||document.getElementById("syncBadge"))return;
 var el=document.createElement("div");el.id="syncBadge";el.className="sync-badge idle";el.innerHTML="<i></i><span>Synchronisation…</span>";
 var wrap=document.createElement("div");wrap.style.minWidth="0";wrap.appendChild(el);
 host.appendChild(wrap);
}
window.aLHSync={set:function(state,text){ensure();var el=document.getElementById("syncBadge");if(!el)return;el.className="sync-badge "+(state||"idle");el.innerHTML="<i></i><span>"+String(text||"Synchronisation…")+"</span>"},ok:function(){this.set("ok","Synchronisé à l’instant")},loading:function(){this.set("loading","Synchronisation…")},error:function(){this.set("error","Synchronisation à vérifier")}};
ensure();
var original=window.chargerTout;
if(typeof original==="function"){
 window.chargerTout=async function(){
  window.aLHSync.loading();
  try{var result=await original();window.aLHSync.ok();return result}catch(e){window.aLHSync.error();throw e}
 };
}
})();