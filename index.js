// Raby-Pepin, David & Wang, XiaoQian
// 07-12-2018
// Description

////////////////////////////////////////////////////////////////////////////////

'use strict';

var http = require("http");
var fs = require('fs');
var urlParse = require('url').parse;
var pathParse = require('path').parse;
var querystring = require('querystring');

var port = 1337;
var hostUrl = 'http://localhost:'+port+'/';
var defaultPage = '/index.html';

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

    var resultat = { exists: false, id: null };

    if (query !== null) {

        query = querystring.parse(query);
        if ('id' in query && 'titre' in query &&
            query.id.length > 0 && query.titre.length > 0) {

            resultat.exists = creerSondage(
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
        // query = { nom: ..., disponibilites: ... }
        ajouterParticipant(id, query.nom, query.disponibilites);
        return true;
    }
    return false;
};

var getIndex = function (replacements) {
    return {
        status: 200,
        data: readFile('template/index.html'),
        type: 'text/html'
    };
};


// --- À compléter ---

var mois = [
    'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
    'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Dec'
];

var MILLIS_PAR_JOUR = (24 * 60 * 60 * 1000);

// Retourne le texte HTML à afficher à l'utilisateur pour répondre au
// sondage demandé.
//
// Doit retourner false si le calendrier demandé n'existe pas
// ******DAVID 12/01- EN DEVELOPPEMENT******
var getCalendar = function (sondageId) {
    var codeHTML = readFile("template/calendar.html");
    codeHTML = remplacerTexte("INSERER LE TITRE", "{{titre}}", codeHTML);
    codeHTML = remplacerTexte("INSERER LA FONCTION TABLE LORSQUE TERMINEE", "{{table}}", codeHTML);
    codeHTML = remplacerTexte("INSERER LE URL", "{{url}}", codeHTML);
    return codeHTML;
};


// fonction qui construit des balises HTML a partir des entrees, soit le nom
// de la balise, le code du style et le code contenu dans la balise
// ******DAVID 12/01- TERMINEE******
var balise = function(nom, style, contenu) {
    return "<" + nom + " " + style +">" + contenu + "</" + nom + ">";
};


// fonction qui prend une chaine de caracteres et la formate en code HTML
// qui indique le style d'une balise
// ******DAVID 12/01 - TERMINEE******
var style = function(contenu) {
  return "style=\"" + contenu + "\"";
};


// ******DAVID 12/01- EN DEVELOPPEMENT******
var table = function(tabDates, tabHeures) {
    
    // le style des cases est definit
    var styleA = style("EXEMPLE");

    // EXEMPLE DE TABLE A DEVELOPPER
    return balise("table", "", mat.map(function(ligne, indiceLigne) {
        if (indiceLigne & 1) {
            return balise("tr", "", ligne.map(function(cellule, indice) {
                if (indice & 1) {
                    return balise("td", styleA, cellule);
                } else { return balise("td", styleB, cellule);}
            }).join(""))
        } else {
            return balise("tr", "", ligne.map(function(cellule, indice) {
                if (indice & 1) {
                    return balise("td", styleB, cellule);
                } else { return balise("td", styleA, cellule);}
            }).join(""))
        }
    }).join(""))
};


// Fonction qui remplace un element dans un texte par un nouvel element
// ******DAVID 12/01- TERMINEE******
var remplacerTexte = function(nouvContenu, contenuARemplacer, texte) {
    return texte.split(contenuARemplacer).join(nouvContenu);
};


// Retourne le texte HTML à afficher à l'utilisateur pour voir les
// résultats du sondage demandé
//
// Doit retourner false si le calendrier demandé n'existe pas
var getResults = function (sondageId) {
    // TODO
    return 'Resultats du sondage <b>' + sondageId + '</b> (TODO)';
};

// Crée un sondage à partir des informations entrées
//
// Doit retourner false si les informations ne sont pas valides, ou
// true si le sondage a été créé correctement.
// ******DAVID 12/01 - TERMINEE******
var creerSondage = function (titre, id, dateDebut, dateFin, heureDebut, heureFin) {
    
    // le site https://www.w3schools.com/jsref/jsref_gettime.asp est la
    // reference pour l'usage de la fonction Date() et de la methode .getTime() 
    var dateDebutNum = +new Date(dateDebut).getTime() / MILLIS_PAR_JOUR;
    var dateFinNum = +new Date(dateFin).getTime() / MILLIS_PAR_JOUR;
    var heuresValides = +heureDebut <= +heureFin;
    var datesValides = dateDebutNum <= dateFinNum;
    var maxJours =  (dateFinNum-dateDebutNum) <= 30;

    if (idValide(id) && heuresValides && datesValides && maxJours) {
        return true;
    }
    return false;
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
    return true;
};

// Ajoute un participant et ses disponibilités aux résultats d'un
// sondage. Les disponibilités sont envoyées au format textuel
// fourni par la fonction compacterDisponibilites() de public/calendar.js
//
// Cette fonction ne retourne rien
var ajouterParticipant = function (sondageId, nom, disponibilites) {
    // TODO
};

// Génère la `i`ème couleur parmi un nombre total `total` au format
// hexadécimal HTML
//
// Notez que pour un grand nombre de couleurs (ex.: 250), générer
// toutes les couleurs et les afficher devrait donner un joli dégradé qui
// commence en rouge, qui passe par toutes les autres couleurs et qui
// revient à rouge.
var genColor = function(i, nbTotal) {
    // TODO
    return '#000000';
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
