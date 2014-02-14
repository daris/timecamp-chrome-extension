/**
 * Created by mild on 28.01.14.
 */

// Namespace inspired by browser overlay code for Minimize To Tray
if (! ('extensions' in window)) {
    window.extensions = {};
}

if (! ('timecamp' in window.extensions)) {
    window.extensions.timecamp = {};
}

if (! ('timer' in window.extensions.timecamp)) {
    window.extensions.timecamp.timer = {};
}
else {
    throw new Error("timer object already defined");
}


window.extensions.timecamp.timer = {
    _cssClass: {
        // The code for the _cssClass object is adapted from "JavaScript: The
        // Definitive Guide" 5/e by David Flanagan (O'Reilly, 2006, pp. 381-382)
        is: function (aElt, aCls) {
            if (typeof aElt == "string") aElt = document.getElementById(aElt);

            var classes = aElt.className;
            if (! classes) return false;
            if (classes == aCls) return true;

            return aElt.className.search("\\b" + aCls + "\\b") != -1;
        },

        add: function (aElt, aCls) {
            if (typeof aElt == "string") aElt = document.getElementById(aElt);
            if (this.is(aElt, aCls)) return;
            if (aElt.className) aCls = " " + aCls;
            aElt.className += aCls;
        },

        remove: function (aElt, aCls) {
            if (typeof aElt == "string") aElt = document.getElementById(aElt);
            aElt.className = aElt.className.replace(new RegExp("\\b" + aCls + "\\b\\s*", "g"), "");
            aElt.className = window.extensions.timecamp.timer;
        }
    },
    handleEvent: function (aEvent)
    {
        console.log('Event retrieved',aEvent);
        let that = window.extensions.timecamp.timer;

        if (aEvent.type == "load") {
            console.log('In LOAD');
            that.init(aEvent);
            var doc = aEvent.originalTarget; // doc is document that triggered "onload" event
            var url = doc.location.href;
            if (/trello\.com/.test(url)) {
                document.loadOverlay('chrome://timecamp-timer/content/xuls/trello.xul', null);
            }

            if (/asana\.com/.test(url)) {
                document.loadOverlay('chrome://timecamp-timer/content/xuls/asana.xul', null);
            }

            if (/manageprojects\.com/.test(url)) {
                document.loadOverlay('chrome://timecamp-timer/content/xuls/activecollab.xul', null);
            }

            if (/podio\.com/.test(url)) {
                console.log('Loading podio');
                document.loadOverlay('chrome://timecamp-timer/content/xuls/podio.xul', null);
            }
        }
    },
    init: function() {
        this.tcUtils.setPref("timecamp-timer.first_run", true);
        let firstRun = this.tcUtils.getPref("timecamp-timer.first_run", true);
        if (firstRun) {
            this._addButton();
            this.tcUtils.setPref("timecamp-timer.first_run", false);
        }
    },

    _addButton: function ()
    {
        // Add the Panic Button toolbar button to the browser's navigation toolbar,
        // if it was not added already.
        let toolbarBtnElt = document.getElementById("tc-timerbutton-toolbarbutton");
        this._cssClass.add('tc-timerbutton-toolbarbutton','tc-timerbutton-quit');
        let browserNavBarElt = document.getElementById("nav-bar");
        if (browserNavBarElt && !toolbarBtnElt) {
            browserNavBarElt.insertItem("tc-timerbutton-toolbarbutton");
            browserNavBarElt.setAttribute("currentset", browserNavBarElt.currentSet);
            document.persist("nav-bar", "currentset");
        }
    },

    handleOnLoad: function() {
        let iframe = document.getElementById("tcLoginFrame");
        iframe.setAttribute("src","chrome://timecamp-timer/content/popup.html");
    }
};
window.addEventListener("load", window.extensions.timecamp.timer, false);
/*
window.addEventListener("unload", window.extensions.timecamp.timer, false);
window.addEventListener("DOMNodeInserted", window.extensions.timecamp.timer, false);
*/
