/* À L’HEURE — Détection des pointages incomplets */
(function(){
"use strict";
function ensureBox(){
 var anchor=document.querySelector(".hero")||document.querySelector("#homeView");if(!anchor)return null;
 var el=document.getElementById("pointageAlerts");if(!el){el=document.createElement("div");el.id="pointageAlerts";anchor.parentNode.insertBefore(el,anchor.nextSibling)}
 return el;
}
window.verifierOubliPointage=function(){
 var rows=Array.isArray(window.historiqueCourant)?window.historiqueCourant:[],today=new Date(),todayKey=today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0")+"-"+String(today.getDate()).padStart(2,"0"),alerts=[];
 rows.forEach(function(r){var d=r.date?new Date(r.date):null;if(!d||isNaN(d))return;var wd=d.getDay();if(wd===0||wd===6||/absent|fête|chabbat/i.test(String(r.statut||"")))return;if(r.debut&&!r.fin)alerts.push({date:r.date,debut:r.debut,message:"Arrivée enregistrée, mais aucun départ."})});
 var current=rows.find(function(r){return String(r.date)===todayKey});if(current&&current.debut&&!current.fin)alerts.unshift({date:current.date,debut:current.debut,message:"Votre journée est encore ouverte."});
 var el=ensureBox();if(!el)return;window.aLHOublis=alerts;
 if(!alerts.length){el.innerHTML="";el.classList.remove("show");return}
 el.innerHTML='<div class="alert-card"><strong>Pointage incomplet</strong><span>'+alerts.length+' journée'+(alerts.length>1?"s":"")+' nécessite'+(alerts.length>1?"nt":"")+" votre attention.</span><button type="button" id="aLHOubliBtn">Voir les heures</button></div>";
 el.classList.add("show");document.getElementById("aLHOubliBtn").onclick=function(){if(typeof window.ouvrirVue==="function")window.ouvrirVue("hoursView",null)};
};
var original=window.chargerRecapEtHistorique;
if(typeof original==="function")window.chargerRecapEtHistorique=async function(){var result=await original();window.verifierOubliPointage();return result};
})();