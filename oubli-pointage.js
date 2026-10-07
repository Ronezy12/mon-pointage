/* À L’HEURE — Détection des pointages incomplets */
(function(){
  "use strict";
  window.verifierOubliPointage=function(){
    var rows=Array.isArray(window.historiqueCourant)?window.historiqueCourant:[];
    var today=new Date();
    var alerts=[];
    rows.forEach(function(r){
      var d=r.date?new Date(r.date):null;if(!d||isNaN(d))return;
      var day=d.getDay(), weekend=day===0||day===6, status=String(r.statut||"").toLowerCase();
      if(weekend||/absent|fête|chabbat/.test(status))return;
      if(r.debut&&!r.fin)alerts.push({date:r.date,debut:r.debut,message:"Arrivée enregistrée, mais aucun départ."});
    });
    var current=rows.find(function(r){return String(r.date)===today.toISOString().slice(0,10)});
    if(current&&current.debut&&!current.fin)alerts.unshift({date:current.date,debut:current.debut,message:"Votre journée est encore ouverte."});
    window.aLHOublis=alerts;
    var el=document.getElementById("pointageAlerts");if(!el)return;
    if(!alerts.length){el.innerHTML="";el.classList.remove("show");return}
    el.innerHTML='<div class="alert-card"><strong>Pointage incomplet</strong><span>'+alerts.length+' journée'+(alerts.length>1?"s":"")+' nécessite'+(alerts.length>1?"nt":"")+" votre attention.</span><button onclick=\"window.ouvrirVue && ouvrirVue('hoursView',null)\">Voir les heures</button></div>";
    el.classList.add("show");
  };
})();