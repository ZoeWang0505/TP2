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

var compacterDisponibilites = function() {
    // TODO

    return '0000000';
};
