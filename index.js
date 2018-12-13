// Raby-Pepin, David & Wang, XiaoQian
// 12-12-2018
// Le programme execute une application dans le style du site doodle.com qui
// permet de planifier des reunions et autres activites aux moments qui
// conviennent le mieux à tous les participants.

////////////////////////////////////////////////////////////////////////////////

'use strict';

var http = require("http");
var fs = require('fs');

//utilise validator pour 
//var check = require('validator').check;
//var sanitize = require('validator').sanitize;

var urlParse = require('url').parse;
var pathParse = require('path').parse;
var querystring = require('querystring');

var port = 1337;
var hostUrl = 'http://localhost:'+port+'/';
var defaultPage = '/index.html';

/********* variables globes **************/
//coefficientDeCouleur
var coefficientCouleur = 0.7;
var couleurMax =  255;
//Liste de participants
var listeParticipants = [];

//La liste de sondages
var listeSondagesExistants = [];

//Liste de jour
var listeJours = [];
var listeHeures = []; 
var matriceCalendrier = [];

/********************************/
var mimes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
};

// --- Helpers ---
var readFile = function (path) {
    return fs.readFileSync(path).toString('utf8');
};

var writeFile = function (path, texte) {
    fs.writeFileSync(path, texte);
};

// --- Server handler ---
var redirect = function (reponse, path, query) {
    var newLocation = path + (query == null ? '' : '?' + query);
    reponse.writeHeader(302, {'Location' : newLocation });
    reponse.end('302 page déplacé');
};

var getDocument = function (url) {
    var pathname = url.pathname;
    var parsedPath = pathParse(url.pathname);
    var result = { data: null, status: 200, type: null };

    if(parsedPath.ext in mimes) {
        result.type = mimes[parsedPath.ext];
    } else {
        result.type = 'text/plain';
    }

    try {
        result.data = readFile('./public' + pathname);
        console.log('['+new Date().toLocaleString('iso') + "] GET " + url.path);
    } catch (e) {
        // File not found.
        console.log('['+new Date().toLocaleString('iso') + "] GET " +
                    url.path + ' not found');
        result.data = readFile('template/error404.html');
        result.type = 'text/html';
        result.status = 404;
    }

    return result;
};

var sendPage = function (reponse, page) {
    reponse.writeHeader(page.status, {'Content-Type' : page.type});
    reponse.end(page.data);
};

var indexQuery = function (query) {

    var resultat = { exists: false, data: null, id: null };

    if (query !== null) {

        query = querystring.parse(query);
        if ('id' in query && 'titre' in query &&
            query.id.length > 0 && query.titre.length > 0) {

            resultat = creerSondage(
                query.titre, query.id,
                query.dateDebut, query.dateFin,
                query.heureDebut, query.heureFin);
        }

        if (resultat.exists) {
            resultat.id = query.id;
        }
    }

    return resultat;
};

var calQuery = function (id, query) {
    if (query !== null) {
        query = querystring.parse(query);
        ajouterParticipant(id, query.nom, query.disponibilites);
        return true;
    }
    return false;
};

var getIndex = function (replacements) {
    var indexHTML = readFile('template/index.html');
    
    // Bonus: 
    // Figure 5: Message d’erreur de base pour les formulaires invalides
    if(replacements != undefined && replacements != null){
        var errorElement = "div id=\"error\">";
        var replaceStart = indexHTML.indexOf(errorElement)+errorElement.length;
        var replaceEnd = indexHTML.indexOf("</div>", replaceStart);
        var replacetext = indexHTML.substring(replaceStart, replaceEnd -1);
        indexHTML = indexHTML.replace(replacetext, replacements);
    }
    return {
        status: 200,
        data: indexHTML,
        type: 'text/html'
    };
};

// Liste des mois dans une annee
var mois = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Le nombre de millisecondes dans une journee
var MILLIS_PAR_JOUR = (24 * 60 * 60 * 1000);

// Retourne le texte HTML à afficher à l'utilisateur pour repondre au
// sondage demande; retourne false si le calendrier demande n'existe pas
var getCalendar = function (sondageId) {
    var sondage = obtenirSondage(sondageId);
    if(sondage == null)
        return false;
    
    var codeHTML = readFile("template/calendar.html");
    codeHTML = remplacerTexte(sondage.data.titre, "{{titre}}", codeHTML);
    structureTabCalendrier(sondage.data);
    codeHTML = remplacerTexte(creerCodeCalendrier(), "{{table}}", codeHTML);
    codeHTML = remplacerTexte("http://localhost:" + port + "/" + 
                              sondage.data.id, "{{url}}", codeHTML);
    return codeHTML;
};

// Fonction qui prepare la structure du tableau utilise afin de construire
// le calendrier
var structureTabCalendrier = function(data){
    creeListeJours(data.dateDebut, data.dateFin);
    creeListeHeures(data.heureDebut, data.heureFin);
    matriceCalendrier = [];
    
    for(var i = -1; i < listeHeures.length; i ++){
        var rangee = [];
        for(var j = -1; j < listeJours.length; j ++){
            if( i == -1 && j != -1){
                rangee.push({"enTeteJour": obtenirEnTeteJour(j)});
            } else if(j == -1 && i != -1){
                rangee.push({"enTeteHeure": obtenirEnTeteHeure(i)});
            } else {
                rangee.push({"caseCalendrier": [i,j]})
            }
        }
        matriceCalendrier.push(rangee);
    }
};

// Fonction qui cree les en-tetes de jours dans le tableau utilise afin de
// construire le calendrier
var obtenirEnTeteJour = function(numJour){
    var jour = listeJours[numJour];
    var moisTexte = mois[jour.getMonth()];
    return jour.getDate() + " " + moisTexte;
};

// Fonction qui cree les en-tetes d'heures dans le tableau utilise afin de
// construire le calendrier
var obtenirEnTeteHeure = function(numHeure){
    return listeHeures[numHeure] + "h";
};

// Fonction qui cree une liste des jours dans le calendrier
var creeListeJours = function (jourDebut, jourFin){
    listeJours = []; 
    var jours = (jourFin.getTime() - jourDebut.getTime()) / MILLIS_PAR_JOUR;
    listeJours.push[jourDebut];

    var date = jourDebut.getTime();
    for(var i = 0; i < jours; i ++){
        date += MILLIS_PAR_JOUR;
        var newDate = new Date(date); 
        listeJours.push(newDate); 
    }
};

// Fonction qui cree une liste des heures dans le calendrier
var creeListeHeures = function (heureDebut, heureFin){
    listeHeures = [];
    for(var i = heureDebut; i <= heureFin; i ++){
        listeHeures.push(i);
    }
};

// Fonction qui construit des balises HTML a partir des entrees, soit le nom
// de la balise, ses proprietes et le code contenu dans la balise
var balise = function(nom, listeProprietes, contenu) {
    var texte = "";

    // ajoute un nom si necessaire
    if(nom != null && nom != ""){
        texte = texte + "<" + nom + " ";
    }
    // ajoute les proprietes
    if(listeProprietes != null && listeProprietes.length != 0){
        for(var i = 0; i < listeProprietes.length; i ++){
            var property = listeProprietes[i];
            texte = texte + property[0] +"=\""+ property[1] + "\" ";
        }
    }
    texte = texte + ">" + contenu + "</" + nom + ">";
    return texte;
};

// Cree le code HTML afin d'afficher le canlendrier en ligne
var creerCodeCalendrier = function() {
    var listeProprietes = [["id", "calendrier"],
                        ["data-nbjours", listeJours.length],
                        ["data-nbheures", listeHeures.length]];

    return balise("table", listeProprietes, matriceCalendrier.map(
        function(ligne, indiceLigne){
        return balise("tr", "", ligne.map(function(cellule, indice) {
            if(cellule.enTeteJour != null){
                return balise("td",[["class", "tdlabel"]], cellule.enTeteJour);
            } if (cellule.enTeteHeure != null){
                return balise("td",[["class", "tdlabel"]], cellule.enTeteHeure);
            } else {
                if(cellule.caseCalendrier[0] == -1 &&
                   cellule.caseCalendrier[1] == -1){
                    return balise("td",[["id", id], ["class","tdlabel"]], "");
                } else {
                    var id = (cellule.caseCalendrier[0] + "_" +
                              cellule.caseCalendrier[1]);
                    return balise("td",[["id", id], ["class","td"]], "");
                }
            }
        }).join(""));
    }).join(""));
};

// Fonction qui cree une liste pour chaque case du calendrier de tous les
// participants qui ont indiques etre disponibiles a ce moment et qui calcule
// le maximum et le minimum de disponibilites dans le calendrier
var listePartcipantsAbregee = function(sondageId) {
    var listeAbregee = [];
    for (var i=0; i<listeParticipants.length; i++) {
        for (var j=0; j<listeParticipants[i].disponibilites.length; j++) {
            if (listeParticipants[i].id == sondageId){
                var disp = listeParticipants[i].disponibilites;
                if(listeAbregee.length == 0){
                    listeAbregee = Array(disp.length).fill(0).map(
                                   function(x) { return [].slice() });
                }
                if(disp.slice().split("")[j] == '1') {
                    listeAbregee[j].push(listeParticipants[i]);
                }
            }
        }
    }

    var maxDispos = 0;
    var minDispos = Infinity;
    for (var k=0; k<listeAbregee.length; k++) {
        if (listeAbregee[k].length > maxDispos) {
            maxDispos = listeAbregee[k].length;
        }
        if (listeAbregee[k].length < minDispos) {
            minDispos = listeAbregee[k].length;
        }
    }
    return {liste: listeAbregee, min: minDispos, max: maxDispos};
};

// Cree le code HTML afin d'afficher les resultats du sondage en ligne
var creerCodeResultats = function(sondageId) {
    var tabResultats = matriceCalendrier.slice();
    tabResultats[0][0] = { enTeteJour: '' };
    var listeAbregee = listePartcipantsAbregee(sondageId);
    var compteCellule = 0;

    return balise("table", "", tabResultats.map(function(ligne, indiceLigne) {
        return balise("tr", "", ligne.map(function(cellule, indice) {
            if(cellule.enTeteJour != null){
                return balise("th","", cellule.enTeteJour);
            } if (cellule.enTeteHeure != null){
                return balise("th", "", cellule.enTeteHeure);
            } else {
                var classe = "";
                var list = listeAbregee.liste[compteCellule];
                if (list.length == listeAbregee.min) {
                    classe = ["class","min"]; 
                }
                if (list.length == listeAbregee.max) {
                    classe = ["class","max"]; 
                }
                var contenuBalise = "";
                for (var i=0; i<list.length; i++) {
                    var couleur = list[i].couleur;
                    contenuBalise += balise("span",
                                     [["style","background-color:" + couleur +
                                     ";color:"+ couleur +";"]], ".");
                }
                compteCellule++;
                return balise("td", [classe], contenuBalise);
            }
        }).join(""));
    }).join(""));
};

// Fonction qui remplace un element dans un texte par un nouvel element
var remplacerTexte = function(nouvContenu, contenuARemplacer, texte) {
    return texte.split(contenuARemplacer).join(nouvContenu);
};

// Retourne le texte HTML à afficher à l'utilisateur pour voir les resultats
// du sondage demande; retourne false si le calendrier demande n'existe pas
var getResults = function (sondageId) {
    var sondage = obtenirSondage(sondageId);
    if(sondage == null)
        return false;

    var codeHTML = readFile("template/results.html");
    codeHTML = remplacerTexte(sondage.data.titre, "{{titre}}", codeHTML);
    codeHTML = remplacerTexte(creerCodeResultats(sondageId), 
                              "{{table}}", codeHTML);
    codeHTML = remplacerTexte("http://localhost:" + port + "/" + sondageId, 
                              "{{url}}", codeHTML);
    codeHTML = remplacerTexte(creerCodeLegende(sondageId), 
                              "{{legende}}", codeHTML);
    return codeHTML;
};

// Cree le code HTML afin d'afficher la liste de participants dans la legende
var creerCodeLegende = function(sondageId){
    var participantsHTML = "";
    for (var i=0; i<listeParticipants.length; i++) {
        if (sondageId == listeParticipants[i].id){
            participantsHTML += balise("li", 
                    [["style", 
                      "background-color: " + listeParticipants[i].couleur]], 
                      listeParticipants[i].nom);
        }
    }
    return participantsHTML;
};

// Cree un sondage a partir des informations entrees
// Doit retourner false si les informations ne sont pas valides, ou
// true si le sondage a ete cree correctement.
var creerSondage = function (titre, id, dateDebut, dateFin,
                             heureDebut, heureFin) {

    // Le site https://www.w3schools.com/jsref/jsref_gettime.asp est la
    // reference pour l'usage de la fonction Date() et de la methode .getTime()
    var dateDebutNum = +new Date(dateDebut).getTime() / MILLIS_PAR_JOUR;
    var dateFinNum = +new Date(dateFin).getTime() / MILLIS_PAR_JOUR;
    var heuresValides = +heureDebut <= +heureFin;
    var datesValides = dateDebutNum <= dateFinNum;
    var maxJours =  (dateFinNum-dateDebutNum) <= 30;

    // Bonus:
    // Figure 5: Message d’erreur de base pour les formulaires invalides
    if (!idValide(id)){
        return {exists: false, 
                data: "Erreur: L'identifiant de sondage correspond a un " +
                "sondage existant"};
    }
    if(!heuresValides) {
        return {exists: false,
                data: "Erreur: L’heure de fin doit etre apres l’heure " +
                "de debut."};
    }
    if(!datesValides) {
        return {exists: false,
                data: "Erreur: Le jour de fin doit etre apres le jour " +
                "de debut."};
    } 
    if(!maxJours){
        return {exists: false,
                data: "Erreur: La duree maximale d’un sondage est de " +
                "30 jours."};
    }

    // Nouvel objet sondage integre dans la liste des sondages existants
    var sondage = {
            "titre": titre, 
            "id": id, 
            "dateDebut": new Date(dateDebut),
            "dateFin": new Date(dateFin), 
            "heureDebut": parseInt(heureDebut), 
            "heureFin": parseInt(heureFin) 
        };
    listeSondagesExistants.push({"id": id, "data": sondage});
    return {exists: true, data: null};
};

// Verifie si l'identifiant d'un sondage n'est pas deja utilise
var obtenirSondage = function(id){
    if (listeSondagesExistants.length == 0 || id === "undefined")
        return null;

    for (var i=0; i<listeSondagesExistants.length; i++){
        var element = listeSondagesExistants[i];
        if(element.id == id)
            return element;
    }
    return null;
};

// Fonction qui verifie que l'identifiant entre par l'utilisateur est valide
var idValide = function (id) {
    for (var i=0; i<id.length; i++) {
        if (!(id.charCodeAt(i)==45
              || (id.charCodeAt(i)>47 && id.charCodeAt(i)<58)
              || (id.charCodeAt(i)>64 && id.charCodeAt(i)<91)
              || (id.charCodeAt(i)>96 && id.charCodeAt(i)<123))) {
                  return false;
        }
    }
    // Pour eviter de recreer le meme id dans la liste de sondages existants
    if(obtenirSondage(id) == null)
        return true;
};

// Ajoute un participant et ses disponibilités aux résultats d'un
// sondage. Les disponibilités sont envoyées au format textuel
// fourni par la fonction compacterDisponibilites() de public/calendar.js
// Cette fonction ne retourne rien
var ajouterParticipant = function (sondageId, nom, disponibilites) {
    var number = listeParticipants.length;
    var couleur = genCouleur(number, number+1);
    listeParticipants.push({
                            "id":sondageId, 
                            "nom": nom, 
                            "disponibilites": disponibilites,
                            "couleur": couleur
                           });
};

// Génère la i ieme couleur parmi un nombre total `total` au format
// hexadécimal HTML
var genCouleur = function(i, nbTotal) {
    var teinte = ( i / nbTotal ) * 360;
    var h = teinte /60;
    var x = Math.floor(couleurMax * coefficientCouleur *
            (1 - Math.abs( h % 2 - 1)));

    var c = Math.floor(coefficientCouleur * couleurMax);
    var rgb = [];
    switch(Math.floor(h)){
        case 0:
            rgb = [c, x , 0];
            break;
        case 1:
            rgb = [x, c, 0];
            break;
        case 2:
            rgb = [0, c, x];
            break;
        case 3: 
            rgb = [0, x, c];
            break;
        case 4:
            rgb = [x, 0, c];
            break;
        case 5:
            rgb = [c, 0, x];
            break;
        default:
            rgb = [0,0,0];
            break;
    }
    var couleur = "#" + couleurHexa(rgb[0]) + 
                        couleurHexa(rgb[1]) + 
                        couleurHexa(rgb[2]);
    return couleur;
};

// Transforme le numero de couleur en hexadecimal
function couleurHexa(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
};

/*
 * Création du serveur HTTP
 * Note : pas besoin de toucher au code ici (sauf peut-être si vous
 * faites les bonus)
 */
http.createServer(function (requete, reponse) {
    var url = urlParse(requete.url);

    // Redirect to index.html
    if (url.pathname == '/') {
        redirect(reponse, defaultPage, url.query);
        return;
    }

    var doc;

    if (url.pathname == defaultPage) {
        var res = indexQuery(url.query);

        if (res.exists) {
            redirect(reponse, res.id);
            return;
        } else {
            doc = getIndex(res.data);
        }
    } else {
        var parsedPath = pathParse(url.pathname);

        if (parsedPath.ext.length == 0) {
            var id;

            if (parsedPath.dir == '/') {
                id = parsedPath.base;

                if (calQuery(id, url.query)) {
                    redirect(reponse, '/'+ id + '/results')
                    return ;
                }

                var data = getCalendar(id);

                if(data === false) {
                    redirect(reponse, '/error404.html');
                    return;
                }

                doc = {status: 200, data: data, type: 'text/html'};
            } else {
                if (parsedPath.base == 'results') {
                    id = parsedPath.dir.slice(1);
                    var data = getResults(id);

                    if(data === false) {
                        redirect(reponse, '/error404.html');
                        return;
                    }

                    doc = {status: 200, data: data, type: 'text/html'};
                } else {
                    redirect(reponse, '/error404.html');
                    return;
                }
            }
        } else {
            doc = getDocument(url);
        }
    }

    sendPage(reponse, doc);

}).listen(port);
