// Raby-Pepin, David & Wang, XiaoQian
// 12-12-2018
// Script qui gere les interactions cote client avec le calendrier.

////////////////////////////////////////////////////////////////////////////////

'use strict';

// Fonction qui va chercher le nombre d'heures et de jours dans le calendrier
// ainsi que l'emplacement de la souris de l'utilisateur et les cases du
// calendrier dans lesquelles l'utilisateur clique
document.addEventListener('DOMContentLoaded', function() {
    var calendrier = document.getElementById("calendrier");
    if(calendrier == null)
        return;

    var nbHeures = calendrier.dataset.nbheures;
    var nbJours = calendrier.dataset.nbjours;

    calendrier.addEventListener("mousedown", onClick);
    calendrier.addEventListener("mouseover", onMove);
});

// Fonction qui identifie les cases du calendrier dans lesquelles
// l'utilisateur clique
function onClick(event) {
    /* La variable t contient l'élément HTML sur lequel le clic a été
       fait. Notez qu'il ne s'agit pas forcément d'une case <td> du
       tableau */
    var t = event.target;

    // Attribut id de l'élément sur lequel le clic a été fait
    var id = "";

    // Si l'utilisateur clique sur un element qui n'est pas une case <td>,
    // ne rien faire
    if(t.nodeName.toLocaleLowerCase() == "td"){
        id = t.id;
        t.innerHTML = t.innerHTML == "" ? "&#10004;" : "";
    }
};

// Fonction qui identifie l'emplacement de la souris de l'utilisateur
function onMove(event) {
    var t = event.target;
    var id = "";
    if(t.nodeName.toLocaleLowerCase() == "td"){
        id = t.id;
    }
};

// Fonction qui retourne une serie de "0" et de "1" qui encode les
// disponibilites selectionnees par les utilisateurs dans le tableau de dispos
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
