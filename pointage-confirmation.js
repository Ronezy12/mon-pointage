/* À L’HEURE — Confirmation avant départ */
(function(){
  "use strict";
  window.__aLHeureConfirmDepart = async function(payload){
    return new Promise(function(resolve){
      var old=document.getElementById("aLHConfirmModal");
      if(old) old.remove();
      var modal=document.createElement("div");
      modal.id="aLHConfirmModal";
      modal.className="modal show";
      modal.innerHTML=
        '<div class="modal-card" style="max-width:430px">'+
          '<div class="modal-kicker">CONFIRMATION</div>'+
          '<h3 style="margin:8px 0 6px">Confirmer mon départ</h3>'+
          '<p style="color:var(--muted);font-size:11px;line-height:1.5;margin:0 0 18px">Vérifiez vos informations avant d’enregistrer définitivement votre départ.</p>'+
          '<div style="display:grid;gap:7px;margin-bottom:18px">'+
            '<div class="setting"><span>Arrivée</span><strong>'+escLocal(payload.debut||"—")+'</strong></div>'+
            '<div class="setting"><span>Départ</span><strong>'+escLocal(payload.fin||"—")+'</strong></div>'+
            '<div class="setting"><span>Pause</span><strong>'+escLocal(payload.pauseLabel||"—")+'</strong></div>'+
            '<div class="setting"><span>Temps travaillé</span><strong style="color:var(--green)">'+escLocal(payload.travail||"—")+'</strong></div>'+
          '</div>'+
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'+
            '<button type="button" class="link-button" id="aLHConfirmNo" style="margin:0">Modifier</button>'+
            '<button type="button" class="action-main red" id="aLHConfirmYes" style="padding:14px;margin:0;text-align:center">Confirmer le départ</button>'+
          '</div>'+
        '</div>';
      document.body.appendChild(modal);
      document.getElementById("aLHConfirmNo").onclick=function(){modal.remove();resolve(false)};
      document.getElementById("aLHConfirmYes").onclick=function(){modal.remove();resolve(true)};
    });
  };
  function escLocal(v){return String(v==null?"":v).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]})}
})();