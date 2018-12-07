// Raby-Pepin, David & Wang, XiaoQian
// 07-12-2018
// Description

////////////////////////////////////////////////////////////////////////////////

'use strict';


document.addEventListener('DOMContentLoaded', function() {
    // TODO: Ajoutez ici du code qui doit s'exécuter au chargement de
    // la page

    //****DAVID TEST****
    //document.getElementById("partager").innerHTML = "OOO";

    var calendrier = document.getElementById("calendrier");
    if(calendrier == null)
        return;

    var nbHeures = calendrier.dataset.nbheures;
    var nbJours = calendrier.dataset.nbjours;
    //newCalendarTable(calendrier);
    calendrier.addEventListener("mousedown", onClick);
    calendrier.addEventListener("mouseover", onMove);

});

function onClick(event) {
    // TODO

    /* La variable t contient l'élément HTML sur lequel le clic a été
       fait. Notez qu'il ne s'agit pas forcément d'une case <td> du
       tableau */
    var t = event.target;
    // Attribut id de l'élément sur lequel le clic a été fait
    var id = t.id;
    t.innerHTML = t.innerHTML == "" ? "&#10004;" : "";
};

function onMove(event) {
    // TODO
    var t = event.target;
    var id = t.id;
};

// Fonction qui retourne une serie de "0" et de "1" qui encode les
// disponibilites selectionnees par les utilisateurs dans le tableau de dispos
// ******DAVID 12/06 - TERMINEE******
var compacterDisponibilites = function() {
    var heures = document.getElementById("calendrier").dataset.nbheures;
    var jours = document.getElementById("calendrier").dataset.nbjours;
    var dispos = "";
    for (var i=0; i<heures; i++) {
        for (var j=0; j<jours; j++) {
            var elemId = i+"_"+j;
            dispos += (document.getElementById(elemId).innerHTML+"").length;
        }
    }
    return dispos;
};
