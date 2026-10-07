/* À L’HEURE — Confirmation avant départ */
(function(){
"use strict";
window.__aLHeureConfirmDepart=function(payload){
 return new Promise(function(resolve){
  var old=document.getElementById("aLHConfirmModal");if(old)old.remove();
  var modal=document.createElement("div");modal.id="aLHConfirmModal";modal.className="modal show";
  modal.innerHTML='<div class="modal-card" style="max-width:430px">'+
   '<div class="modal-kicker">CONFIRMATION</div><h3 style="margin:8px 0 6px">Confirmer mon départ</h3>'+
   '<p style="color:var(--muted);font-size:11px;line-height:1.5;margin:0 0 18px">Vérifiez vos informations avant l’enregistrement définitif.</p>'+
   '<div style="display:grid;gap:7px;margin-bottom:18px">'+
   '<div class="setting"><span>Arrivée</span><strong>'+esc(payload.debut||"—")+'</strong></div>'+
   '<div class="setting"><span>Départ</span><strong>'+esc(payload.fin||"—")+'</strong></div>'+
   '<div class="setting"><span>Pause</span><strong>'+esc(payload.pauseLabel||"—")+'</strong></div>'+
   '<div class="setting"><span>Temps travaillé</span><strong style="color:var(--green)">'+esc(payload.travail||"—")+'</strong></div></div>'+
   '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button type="button" class="link-button" id="aLHConfirmNo" style="margin:0">Modifier</button>'+
   '<button type="button" class="action-main red" id="aLHConfirmYes" style="padding:14px;margin:0;text-align:center">Confirmer le départ</button></div></div>';
  document.body.appendChild(modal);
  document.getElementById("aLHConfirmNo").onclick=function(){modal.remove();resolve(false)};
  document.getElementById("aLHConfirmYes").onclick=function(){modal.remove();resolve(true)};
 });
};
function esc(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
var originalTerminer=window.terminer;
if(typeof originalTerminer==="function"){
 window.terminer=async function(pauseMinutes){
  var debut=(document.getElementById("arrival")||{}).textContent||"—";
  var fin=typeof window.heureActuelle==="function"?window.heureActuelle():"—";
  var pauseLabel=typeof window.formaterPauseAffichage==="function"?window.formaterPauseAffichage(pauseMinutes):String(pauseMinutes)+" minutes";
  var start=debut.match(/^(\d{1,2}):(\d{2})$/),end=fin.match(/^(\d{1,2}):(\d{2})$/);
  var worked="—";
  if(start&&end){var a=Number(start[1])*60+Number(start[2]),b=Number(end[1])*60+Number(end[2]);if(b<a)b+=1440;var n=Math.max(0,b-a-Number(pauseMinutes||0));worked=typeof window.minutesEnTexte==="function"?window.minutesEnTexte(n):Math.floor(n/60)+"h"+(n%60?" "+String(n%60).padStart(2,"0"):"")}
  var ok=await window.__aLHeureConfirmDepart({debut:debut,fin:fin,pauseLabel:pauseLabel,travail:worked});
  if(!ok)return;
  return originalTerminer(pauseMinutes);
 };
}
})();