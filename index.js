// Raby-Pepin, David & Wang, XiaoQian
// 07-12-2018
// Description

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
var sondageList = [];

//Liste de jour
var jourListe = [];
var tempsListe = []; 
var mapdeTempsBlocs = [];

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
    
    //Bonus: 
    //Figure 5: Message d’erreur de base pour les formulaires invalides
    if(replacements != undefined && replacements != null){
        var errorElement = "div id=\"error\">";
        var replaceStart = indexHTML.indexOf(errorElement) + errorElement.length;
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

var mois = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Dec'
];

var MILLIS_PAR_JOUR = (24 * 60 * 60 * 1000);

// Retourne le texte HTML à afficher à l'utilisateur pour répondre au
// sondage demandé.
//
// Doit retourner false si le calendrier demandé n'existe pas
var getCalendar = function (sondageId) {
    var sondage = getSondage(sondageId);
    if(sondage == null)
        return false;
    var codeHTML = readFile("template/calendar.html");

    codeHTML = remplacerTexte(sondage.data.titre, "{{titre}}", codeHTML);
    initializeCalendarTable(sondage.data);

    codeHTML = remplacerTexte(createCalendarTable(), "{{table}}", codeHTML);
    codeHTML = remplacerTexte("http://localhost:" + port + "/" + 
                              sondage.data.id, "{{url}}", codeHTML);
    return codeHTML;
};

//Pour preparer les donnee a construire canlendrier
var initializeCalendarTable = function(data){
    initializeJourListe(data.dateDebut, data.dateFin);
    initializeTempsListe(data.heureDebut, data.heureFin);
    mapdeTempsBlocs = [];
    for(var i = -1; i < tempsListe.length; i ++){
        var rang = [];
        for(var j = -1; j < jourListe.length; j ++){
            if( i == -1 && j != -1){
                rang.push({"jourLable": getJourLable(j)});
            } else if(j == -1 && i != -1){
                rang.push({"tempsLable": getTimeLable(i)});
            } else {
                rang.push({"tempsBloc": [i,j]})
            }
        }
        mapdeTempsBlocs.push(rang);
    }
};

//Pour obtenir lable de Jour
var getJourLable = function(jourNumbre){
    var jour = jourListe[jourNumbre];
    var moisText = mois[jour.getMonth()];
    return jour.getDate() + " " + moisText;
};

//Pour obtenir lable de temps
var getTimeLable = function(timeNumbre){
    return tempsListe[timeNumbre] + "h";
};

//Initialize pour JourListe
var initializeJourListe = function (debut, fin){
    jourListe = []; 
    var jours = (fin.getTime() - debut.getTime()) / MILLIS_PAR_JOUR;
    jourListe.push[debut];

    var date = debut.getTime();
    for(var i = 0; i < jours; i ++){
        date += MILLIS_PAR_JOUR;
        var newDate = new Date(date); 
        jourListe.push(newDate); 
    }
};

//Initialize pour le temps liste
var initializeTempsListe = function (debut, fin){
    tempsListe = [];
    for(var i = debut; i <= fin; i ++){
        tempsListe.push(i);
    }
};

// fonction qui construit des balises HTML a partir des entrees, soit le nom
// de la balise, le code du style et le code contenu dans la balise
var balise = function(nom, propertyList, contenu) {
    var text = "";

    //ajouter nom s'il a besoin
    if(nom != null && nom != ""){
        text = text + "<" + nom + " ";
    }
    //ajouter chaque property a HTML
    if(propertyList != null && propertyList.length != 0){
        for(var i = 0; i < propertyList.length; i ++){
            var property = propertyList[i];
            text = text + property[0] +"=\""+ property[1] + "\" ";
        }
    }
    text = text + ">" + contenu + "</" + nom + ">";
    return text;
};

//Nouveau tableau HTML pour afficher canlendrier
var createCalendarTable = function() {

    var propertyList = [["id", "calendrier"],
                        ["data-nbjours", jourListe.length],
                        ["data-nbheures", tempsListe.length]];

    return balise("table", propertyList, mapdeTempsBlocs.map(
        function(ligne, indiceLigne){

        return balise("tr", "", ligne.map(function(cellule, indice) {
            if(cellule.jourLable != null){
                return balise("td",[["class", "tdlabel"]], cellule.jourLable);
            } if (cellule.tempsLable != null){
                return balise("td",[["class", "tdlabel"]], cellule.tempsLable);
            } else {
                if(cellule.tempsBloc[0] == -1 && cellule.tempsBloc[1] == -1){
                    return balise("td",[["id", id], ["class","tdlabel"]], "");
                } else {
                    var id = cellule.tempsBloc[0] + "_" + cellule.tempsBloc[1];
                    return balise("td",[["id", id], ["class","td"]], "");
                }
            }
        }).join(""));

    }).join(""));
};

// DAVID 12/09 ***INTEGRER 4.3.3 COULEURS DIFFERENTES***
var listePartcipantsAbregee = function(sondageId) {
    var listeAbregee = [];
    for (var i=0; i<listeParticipants.length; i++) {
        for (var j=0; j<listeParticipants[i].disponibilites.length; j++) {
            if (listeParticipants[i].id == sondageId){
                var disp = listeParticipants[i].disponibilites;
                if( listeAbregee.length == 0){
                    listeAbregee = 
                        Array(disp.length).fill(0).map(
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


// DAVID 12/09 ***INTEGRER 4.3.3 COULEURS DIFFERENTES***
var createResultsTable = function(sondageId) {
    var tabResultats = mapdeTempsBlocs.slice();
    tabResultats[0][0] = { jourLable: '' };
    
    var listeAbregee = listePartcipantsAbregee(sondageId);
    var compteCellule = 0;
    
    return balise("table", "", tabResultats.map(function(ligne, indiceLigne) {
        return balise("tr", "", ligne.map(function(cellule, indice) {
            if(cellule.jourLable != null){
                return balise("th","", cellule.jourLable);
            } if (cellule.tempsLable != null){
                return balise("th", "", cellule.tempsLable);
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
                    contenuBalise += balise(
                        "span",
                        [["style","background-color:" + couleur + 
                                        ";color:"+ couleur +";"]],
                        ".");
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

// Retourne le texte HTML à afficher à l'utilisateur pour voir les
// résultats du sondage demandé
// Doit retourner false si le calendrier demandé n'existe pas
var getResults = function (sondageId) {
    var sondage = getSondage(sondageId);
    if(sondage == null)
        return false;
    
    var codeHTML = readFile("template/results.html");
    codeHTML = remplacerTexte(sondage.data.titre, "{{titre}}", codeHTML);
    codeHTML = remplacerTexte(createResultsTable(sondageId), 
                              "{{table}}", codeHTML);
    codeHTML = remplacerTexte("http://localhost:" + port + "/" + sondageId, 
                              "{{url}}", codeHTML);
    codeHTML = remplacerTexte(createParticipantsHTML(sondageId), 
                              "{{legende}}", codeHTML);
    return codeHTML;
    
};

//Construire html pour la liste de participants
var createParticipantsHTML = function(sondageId){
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

// Crée un sondage à partir des informations entrées
// Doit retourner false si les informations ne sont pas valides, ou
// true si le sondage a été créé correctement.
// ******DAVID 12/01 - TERMINEE******
var creerSondage = function (titre, id, dateDebut, dateFin,
                             heureDebut, heureFin) {
    
    // le site https://www.w3schools.com/jsref/jsref_gettime.asp est la
    // reference pour l'usage de la fonction Date() et de la methode .getTime() 
    var dateDebutNum = +new Date(dateDebut).getTime() / MILLIS_PAR_JOUR;
    var dateFinNum = +new Date(dateFin).getTime() / MILLIS_PAR_JOUR;
    var heuresValides = +heureDebut <= +heureFin;
    var datesValides = dateDebutNum <= dateFinNum;
    var maxJours =  (dateFinNum-dateDebutNum) <= 30;

    //Bonus: 
    //Figure 5: Message d’erreur de base pour les formulaires invalides
    if (!idValide(id)){
        return {exists: false, 
                data: "Error: L'identifiant de sondage correspond à un sondage existant"};
    }
    
    if(!heuresValides) {
        return {exists: false,
                data: "Error: L’heure de fin doit être après l’heure de début"};
    }
    if(!datesValides) {
        return {exists: false,
                data: "Error: Le jour de fin doit être après le jour de début"};
    } 
    if(!maxJours){
        return {exists: false,
                data: "Error: La durée maximale d’un sondage est de 30 jours"};
    } 
    //new sondage object et garder dans la liste
    var sondage = {
            "titre": titre, 
            "id": id, 
            "dateDebut": new Date(dateDebut),
            "dateFin": new Date(dateFin), 
            "heureDebut": parseInt(heureDebut), 
            "heureFin": parseInt(heureFin) 
        };
    sondageList.push( {"id": id, "data": sondage});
    return {exists: true, data: null};

};

//Pour obtenir le sondage vient de la liste
//id: sondage id
var getSondage = function(id){
    if (sondageList.length == 0 || id === "undefined")
        return null;

    for(var i = 0; i < sondageList.length; i ++){
        var element = sondageList[i];
        if(element.id == id)
            return element;
    }
    return null;
};

//Fonction qui verifie que l'identifiant entre par l'utilisateur est bien valide
// ******DAVID 12/01 - TERMINEE******
var idValide = function (id) {
    for (var i=0; i<id.length; i++) {
        if (!(id.charCodeAt(i)==45
              || (id.charCodeAt(i)>47 && id.charCodeAt(i)<58)
              || (id.charCodeAt(i)>64 && id.charCodeAt(i)<91)
              || (id.charCodeAt(i)>96 && id.charCodeAt(i)<123))) {
                  return false;
        }
    }
    //Pour eviter de creer le meme id dans la list
    if(getSondage(id) == null)
        return true;
};

// Ajoute un participant et ses disponibilités aux résultats d'un
// sondage. Les disponibilités sont envoyées au format textuel
// fourni par la fonction compacterDisponibilites() de public/calendar.js
// Cette fonction ne retourne rien
var ajouterParticipant = function (sondageId, nom, disponibilites) {
    var number = listeParticipants.length;
    var couleur = genColor(number, number+1);
    listeParticipants.push({
                            "id":sondageId, 
                            "nom": nom, 
                            "disponibilites": disponibilites,
                            "couleur": couleur
                           });
};

// Génère la i ieme couleur parmi un nombre total `total` au format
// hexadécimal HTML
//
// Notez que pour un grand nombre de couleurs (ex.: 250), générer
// toutes les couleurs et les afficher devrait donner un joli dégradé qui
// commence en rouge, qui passe par toutes les autres couleurs et qui
// revient à rouge.
var genColor = function(i, nbTotal) {
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
    var couleur = "#" + componentToHex(rgb[0]) + 
                        componentToHex(rgb[1]) + 
                        componentToHex(rgb[2]);
    return couleur;
};

//Pour transformer couleur number a Hex
function componentToHex(c) {
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
