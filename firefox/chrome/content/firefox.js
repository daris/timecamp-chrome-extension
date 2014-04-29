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

var PREFNAME_PREFIX = "extensions.timecamp-timer.";

window.extensions.timecamp.timer = {

    handleEvent: function (aEvent)
    {
        let that = window.extensions.timecamp.timer;

        if (aEvent.type == "load") {
            window.removeEventListener('load',window.extensions.timecamp.timer,false);

            var appcontent = document.getElementById('appcontent');
            if (appcontent)
                appcontent.addEventListener('DOMContentLoaded', that.checkEvent, true);

            that.init(aEvent);
        }
    },

    checkEvent: function (e) {
        var doc = e.originalTarget; // doc is document that triggered "onload" event
        var url = doc.location.href;
/*        if (/trello\.com/.test(url)) {
            document.loadOverlay('chrome://timecamp-timer/content/xuls/trello.xul', null);
        }

        if (/asana\.com/.test(url)) {
            document.loadOverlay('chrome://timecamp-timer/content/xuls/asana.xul', null);
        }

        if (/manageprojects\.com/.test(url)) {
            document.loadOverlay('chrome://timecamp-timer/content/xuls/activecollab.xul', null);
        }*/

        if (/podio\.com/.test(url)) {
            document.loadOverlay('chrome://timecamp-timer/content/xuls/podio.xul', null);
        }
    },

    init: function() {
        let firstRun = this.getPref("first_run", true);
        if (firstRun) {
            this._addButton();
            this.setPref("first_run", false);
        }
    },

    _addButton: function ()
    {
        let toolbarBtnElt = document.getElementById("tc-timerbutton-toolbarbutton");
        let browserNavBarElt = document.getElementById("nav-bar");
        if (browserNavBarElt && !toolbarBtnElt) {
            browserNavBarElt.insertItem("tc-timerbutton-toolbarbutton");
            browserNavBarElt.setAttribute("currentset", browserNavBarElt.currentSet);
            document.persist("nav-bar", "currentset");
        }
    },

    handleOnLoading: function() {
        let iframe = document.getElementById("tcLoginFrame");
        iframe.setAttribute("src","chrome://timecamp-timer/content/popup.html");
    },

    Application: function() {
        var rv;
        if ("@mozilla.org/fuel/application;1" in Components.classes) {
            rv = Components.classes["@mozilla.org/fuel/application;1"].getService(Components.interfaces.fuelIApplication);
        }
        else if ("@mozilla.org/steel/application;1" in Components.classes) {
            rv = Components.classes["@mozilla.org/steel/application;1"].getService(Components.interfaces.steelIApplication);
        }

        return rv;
    },

    getPref: function (aPrefKey, aDefaultValue)
    {
        return this.Application().prefs.getValue(PREFNAME_PREFIX + aPrefKey, aDefaultValue);
    },

    setPref: function (aPrefKey, aPrefValue)
    {
        this.Application().prefs.setValue(PREFNAME_PREFIX + aPrefKey, aPrefValue);
    }
};
window.addEventListener("load", window.extensions.timecamp.timer, false);
