/// <reference path="../jquery-2.0.3.js" />
/// <reference path="../chrome-api-vsdoc.js" />
/// <reference path="common.js" />
function refreshPopup(statusText, loggedIn, hideButton)
{
    function _loggedIn() {
        $('#tc-button').unbind('click').click(function () {
            TokenManager.removeStoredToken();
            refreshPopup(chrome.i18n.getMessage("STATUS_SUCCESS"), false, true);
            setTimeout(function () {
                window.close();
            }, 3000);
        }).text(chrome.i18n.getMessage("BUTTON_LOG_OUT"));
        $("#tc-signup").hide();
    }

    function _loggedOut() {
        $('#tc-button').unbind('click').click(function () {
            $('body').append('<iframe src="' + getAccessurl("popup.html") + '"></iframe>');
            $('iframe').focus();
            $(this).parent().parent().css('visibility', 'hidden');
        }).text(chrome.i18n.getMessage("BUTTON_LOG_IN"));
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
        TokenManager.getStoredToken().done(function () {
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

    $('#displaySidebarCheckbox').unbind('click').click(function () {
        toggleSidebarEnabled($(this).is(":checked"));
        refreshPopup(chrome.i18n.getMessage("PLEASE_REFRESH"));
    });

    chrome.storage.sync.get({"isSidebarEnabled": true}, function (items)
    {
        if (!items['isSidebarEnabled'])
            $('#displaySidebarCheckbox').removeAttr('checked');
        else
            $('#displaySidebarCheckbox').attr('checked','checked');
    });

    if (params.status != undefined) {
        //----------We are in iframe!!!-----------
        if (params.status == "1") {
            refreshPopup(chrome.i18n.getMessage("STATUS_LOGGING_IN"), true, true);
            TokenManager.getToken(true).done(function (token) {
                refreshPopup(chrome.i18n.getMessage("STATUS_SUCCESS"), true, true);
                TokenManager.storeToken(token);
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