/* À L’HEURE — Correction sécurisée d’un pointage */
(function(){
  "use strict";
  window.ouvrirCorrectionPointage = async function(date){
    var row=(Array.isArray(window.historiqueCourant)?window.historiqueCourant:[]).find(function(r){return String(r.date)===String(date)});
    if(!row){toast("Journée introuvable.");return}
    var old=document.getElementById("aLHCorrectionModal"); if(old) old.remove();
    var modal=document.createElement("div"); modal.id="aLHCorrectionModal"; modal.className="modal show";
    modal.innerHTML='<div class="modal-card" style="max-width:460px">'+
      '<div class="modal-kicker">CORRECTION DU POINTAGE</div>'+
      '<h3 style="margin:8px 0 5px">Modifier la journée</h3>'+
      '<p style="color:var(--muted);font-size:10px;margin:0 0 16px">'+escC(date)+'</p>'+
      '<div style="display:grid;gap:9px">'+
        field("Arrivée","corrDebut",row.debut)+field("Départ","corrFin",row.fin)+
        field("Pause (minutes)","corrPause",pauseMinutes(row.pause))+
        '<label style="display:grid;gap:6px;color:var(--muted);font-size:10px">Observation<textarea id="corrObs" rows="3" style="resize:vertical">'+escC(row.observation||"")+'</textarea></label>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:16px"><button class="link-button" style="margin:0" onclick="document.getElementById(\'aLHCorrectionModal\').remove()">Annuler</button><button class="action-main" style="padding:14px" id="corrSave">Enregistrer</button></div>'+
    '</div>';
    document.body.appendChild(modal);
    document.getElementById("corrSave").onclick=async function(){
      var b=document.getElementById("corrDebut").value.trim(),f=document.getElementById("corrFin").value.trim(),p=Number(document.getElementById("corrPause").value||0),o=document.getElementById("corrObs").value.trim();
      if(b&&!/^\d{1,2}:\d{2}$/.test(b)||f&&!/^\d{1,2}:\d{2}$/.test(f)){toast("Format d’heure invalide.");return}
      this.disabled=true;
      try{
        await window.appelerAPI("modifierPointage",{date:date,debut:b,fin:f,pauseMinutes:p,observation:o});
        modal.remove(); toast("Pointage corrigé"); await window.chargerRecapEtHistorique(); await window.chargerEtat();
      }catch(e){toast(e.message||"Impossible de modifier le pointage.");this.disabled=false}
    };
  };
  window.ajouterBoutonCorrection=function(container,date){
    if(!container||!date)return;
    var b=document.createElement("button"); b.className="link-button"; b.style.marginTop="8px"; b.textContent="Modifier le pointage"; b.onclick=function(){ouvrirCorrectionPointage(date)}; container.appendChild(b);
  };
  function field(label,id,value){return '<label style="display:grid;gap:6px;color:var(--muted);font-size:10px">'+label+'<input id="'+id+'" value="'+escC(value||"")+'" inputmode="numeric" placeholder="HH:MM"></label>'}
  function pauseMinutes(v){var s=String(v||"").toLowerCase();var m=s.match(/(\d+)\s*heure/);var n=m?Number(m[1])*60:0;var x=s.match(/(\d+)\s*minute/);return n+(x?Number(x[1]):0)}
  function escC(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
})();