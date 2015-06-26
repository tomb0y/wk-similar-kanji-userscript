// ==UserScript==
// @name        WaniKani Similar kanji
// @author      tomboy
// @namespace   japanese
// @description Shows similar kanji's for the given kanji on its page.
// @license     GPL version 3 or any later version; http://www.gnu.org/copyleft/gpl.html
// @include     http*://*wanikani.com/kanji/*
// @include     http*://*wanikani.com/level/*/kanji/*
// @include     http*://*wanikani.com/review/session
// @include     http*://*wanikani.com/lesson/session
// @version     1.0
// @grant       GM_xmlhttpRequest
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js
// ==/UserScript==

/*
 * Thanks a lot to ...
 * WaniKani Stroke Order - Userscript
 * The code heavily borrows from that script!
 */

/*
 * Helper Functions/Variables
 */
$ = unsafeWindow.$;

/*
 * Global Variables/Objects/Classes
 */
var Pnum = Object.freeze({ unknown:0, kanji:1, reviews:2, lessons:3 });
var thisPage = Pnum.unknown;
var API = "https://wk-similar-kanji.herokuapp.com/kanji";

/*
 * Main
 */
window.addEventListener("load", function (e) {

    // Determine page type
    if (/\/kanji\/./.test(document.URL)) {
        thisPage = Pnum.kanji;
    } else if (/\/review/.test(document.URL)) {
        thisPage = Pnum.reviews;
    } else if (/\/lesson/.test(document.URL)) {
        thisPage = Pnum.lessons;
    }

    // Create and store the element that will hold the image
    unsafeWindow.similarKanjiContainer = createSimilarKanjiSection();

    // Register callback for when to load stroke order
    switch (thisPage) {
        case Pnum.kanji:
            loadDiagram();
            break;
        case Pnum.reviews:
            var o = new MutationObserver(function(mutations) {
               // The last one always has 2 mutations, so let's use that
               if (mutations.length != 2)
                   return;

               // Reviews dynamically generate the DOM. We always need to re-insert the element
               if (getKanji() !== null) {
               setTimeout(function() {
                       var similarKanjiContainer = createSimilarKanjiSection();
                       if (similarKanjiContainer !== null && similarKanjiContainer.length > 0) {
                           unsafeWindow.similarKanjiContainer = similarKanjiContainer;
                           loadDiagram();
                       }
                   }, 150);
               }
            });
            o.observe(document.getElementById('item-info'), {'attributes' : true});
            break;
        case Pnum.lessons:
            var o = new MutationObserver(loadDiagram);
            o.observe(document.getElementById('supplement-kan'), {'attributes' : true});
            loadDiagram();
            break;
    }
});

/*
 * Returns the current kanji
 */
function getKanji() {
    switch(thisPage) {
        case Pnum.kanji:
            return document.title[document.title.length - 1];

        case Pnum.reviews:
            var curItem = $.jStorage.get("currentItem");
            if("kan" in curItem)
                return curItem.kan.trim();
            else
                return null;

        case Pnum.lessons:
            var kanjiNode = $("#character");

            if(kanjiNode === undefined || kanjiNode === null)
                return null;

            return kanjiNode.text().trim();
    }

    return null;
}

/*
 * Creates a section for the similarKanjiContainer and returns a pointer to its content
 */
function createSimilarKanjiSection() {

    // Reviews hack: Only do it once
    if ($('#similar_kanji').length == 0) {
        var sectionHTML = '<section><h2>Similar kanji</h2><p id="similar_kanji">&nbsp;</p></section>';

        switch(thisPage) {
            case Pnum.kanji:
                $(sectionHTML).insertAfter('#information');
                break;
            // case Pnum.reviews:
            //    console.log("prepend");
            //    $('#item-info-col2').prepend(sectionHTML);
            //    break;
            // case Pnum.lessons:
            //    $('#supplement-kan-breakdown .col1').append(sectionHTML);
            //    break;
        }
    }

    return $('#similar_kanji');
}


/*
 * Adds the similarKanjiContainer section element to the appropriate location
 */
function loadDiagram() {

    if (!unsafeWindow || !unsafeWindow.similarKanjiContainer.length)
        return;

    unsafeWindow.similarKanjiContainer.html("Loading...");

    setTimeout(function() {
        GM_xmlhttpRequest({
            method: "GET",
            url: API + "/" + getKanji(),
            onload: function(xhr) {
                var similarKanjiContainer = unsafeWindow.similarKanjiContainer;
                if (xhr.status == 200) {
                    if (similar = JSON.parse(xhr.responseText).similar) {
                            if (similar.length > 0) {

                                var buffer = "";

                                for (var i=0; i<similar.length; ++i ) {

                                    buffer += "<li class='character-item' id='kanji-custom-" + i + "'> \
                                        <span lang='ja' class='item-badge'></span> \
                                        <a href='/kanji/" + similar[i].character + "'> \
                                            <span class='character' lang='ja'>" + similar[i].character + "</span> \
                                                <ul> \
                                                    <li>" + similar[i].meaning + "</li> \
                                                </ul> \
                                        </a> \
                                    </li>";
                                }

                                similarKanjiContainer.html("<ul class='single-character-grid multi-character-grid-extra-styling-767px'>" + buffer + "</ul>");
                                return;
                            }
                        unsafeWindow.similarKanjiContainer.html("This is a unique kanji that has no similars.");
                    }
                }

                unsafeWindow.similarKanjiContainer.html("Error while loading similar kanji's...");
            },
            onerror: function(xhr) {
                unsafeWindow.similarKanjiContainer.html("Error while loading similar kanji's...");
            }
        });
    }, 0);
}
