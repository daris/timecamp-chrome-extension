/// <reference path="../jquery-2.0.3.js" />
/// <reference path="../chrome-api-vsdoc.js" />
/// <reference path="common.js" />


function refreshPopup(statusText, loggedIn, hideButton)
{
    function _loggedIn() {
        $('#tc-button').unbind('click').click(function () {
            removeStoredToken();
            refreshPopup(Locale.get(Locale.messages.statusSuccess), false, true);
            setTimeout(function () {
                window.close();
            }, 3000);
        }).text(Locale.get(Locale.messages.buttonLogOut));
        $("#tc-signup").hide();
    }

    function _loggedOut() {
        $('#tc-button').unbind('click').click(function () {
            $('body').append('<iframe src="' + getAccessurl("popup.html") + '"></iframe>');
            $('iframe').focus();
            $(this).parent().parent().css('visibility', 'hidden');
        }).text(Locale.get(Locale.messages.buttonLogIn));
    }

    if (statusText != null) {
        $("#status").show().text(statusText);
    }

    if (hideButton)
        $('#tc-button').hide();

    if (loggedIn != undefined) {
        if (loggedIn) {
            _loggedIn();
        } else {
            _loggedOut();
        }
    } else {
        getStoredToken().done(function () {
            _loggedIn();
        }).fail(function () {
            _loggedOut();
        });
    }
}

$(document).ready(function () {
    var prmstr = window.location.search.substr(1);
    var prmarr = prmstr.split("&");
    var params = {};

    for (var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    var text = "";
    if (params.status != undefined) {
        //----------We are in iframe!!!-----------
        if (params.status == "1") {
            refreshPopup(Locale.get(Locale.messages.statusLoggingIn), true, true);
            getToken(true).done(function (token) {
                refreshPopup(Locale.get(Locale.messages.statusSuccess), true, true);
                storeToken(token);
                setTimeout(function(){
                    window.parent.close();
                }, 3000);
            });
        } else {
            refreshPopup("whoops!");
        }
        //---------------------------------------
    } else {
        refreshPopup();
    }

    
});