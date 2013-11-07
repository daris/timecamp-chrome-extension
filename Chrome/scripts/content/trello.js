/// <reference path="../jquery-2.0.3.js" />
/// <reference path="../moment.js" />
/// <reference path="../chrome-api-vsdoc.js" />
/// <reference path="common.js" />
/// 
var oneSecondIntervalId = null;
var pushIntervalId = null;
var buttonInsertionInProgress = false;
var pushInterval = 5000;
var isTimerRunning = false;
var trackedCardId = "";
var button = null;
var changingState = false;

var syncing = false;


var currentCardId = function () {
    var url = document.URL;
    var MatchRes = url.match(/\/c\/([a-zA-Z0-9]*)/);
    if (MatchRes) {
        var id = MatchRes[1];
        return id;
    } else {
        return null;
    }
}

var updateButtonState = function () {
    /// <param name="button" type="jQuery"></param>
    //console.log('Updating button state...')

    $.when(getToken())
        .then(function (token) {
            var cardId = currentCardId();
            return checkButtonTimer(apiUrl, token, cardId, 'status');
        }).done(function (response) {
            if (response == null)
                return;

            isTimerRunning = response.isTimerRunning;

            if (isTimerRunning) {
                trackedCardId = response.external_task_id;
                var badges = $('.list-cards a[href^="/c/' + trackedCardId + '"]').siblings('div.badges');
                if (badges.find("#tc-badge").length == 0) {
                    var badge = $("#tc-badge");

                    if (badge.length > 0)
                        badge.detach();
                    else
                        badge = $('<img/>',
                            {
                                id:         "tc-badge",
                                "class":    "badge",
                                style:      "padding: 1px 4px; height: 14px;",
                                src:        chrome.extension.getURL('images/icon-16.png'),
                                title:      chrome.i18n.getMessage('BADGE_TIMER_RUNNING')
                            });
                    badges.append(badge);
                }
                
                if (trackedCardId != currentCardId())
                {
                    setButtonText(chrome.i18n.getMessage('BUTTON_TIMER_STOP_TRACKING_ANOTHER_TASK'));
                    return;
                }

                setButtonText(chrome.i18n.getMessage('BUTTON_TIMER_STARTED'));
                if(button)
                    button.children('.time').show();
                var startDate = new Date(new Date().valueOf() - response.elapsed * 1000);
                
                if (oneSecondIntervalId) {
                    clearInterval(oneSecondIntervalId);
                }

                updateTopMessage(startDate);
                oneSecondIntervalId = setInterval(function () {
                    var diff = Math.abs((new Date().valueOf() - startDate.valueOf()));
                    var minutes = Math.floor(diff / 1000 / 60);
                    var seconds = Math.floor((diff - minutes * 1000 * 60 ) / 1000);
                    if (button)
                        button.children('.time').text(zeroFill(minutes, 2) + ':' + zeroFill(seconds, 2));
                    //button.children('.time').text(moment.duration(diff, "seconds").format("H:mm:ss"));
                    updateTopMessage(startDate);
                }, 1000);
            }
            else {
                if (button)
                    button.children('.time').hide();

                var badge = $("#tc-badge");
                if (badge.length > 0)
                    badge.remove();

                setButtonText(chrome.i18n.getMessage('BUTTON_TIMER_STOPPED'));
                clearInterval(oneSecondIntervalId);
                updateTopMessage(null);
            }
        }).fail(function (reason) {
            var badge = $("#tc-badge");
            if (badge.length > 0)
                badge.remove();

            getLoggedOutFlag().done(function(loggedOut){
                if (loggedOut) {
                    setButtonText(chrome.i18n.getMessage('BUTTON_LOG_IN'));
                    updateTopMessage(null);
                } else {
                    setButtonText(chrome.i18n.getMessage('BUTTON_CONNECTION_ERROR'));
                    updateTopMessage(null);
                }
            });
            
        });
}
var checkButtonTimer = function (apiUrl, token, cardId, action) {
    if (syncing)
        return null;

    var fd = new FormData();
    fd.append('api_token', token);
    fd.append('service', 'trello');
    fd.append('action', action);
    fd.append('external_task_id', cardId);

    syncing = true;
    return $.ajax({
        url: apiUrl,
        data: fd,
        processData: false,
        contentType: false,
        type: 'POST',
    }).always(function () {
        syncing = false;
    });
}

var updateTopMessage = function (startDate) {
    if (startDate) {
        var duration = moment().from(startDate, true);
        $('#timecamp-track-info').text('(You spent ' + duration + ' doing this task)');
    }
    else
    {
        $('#timecamp-track-info').text('');
    }
}

var onDomModified = function () {
    if (!buttonInsertionInProgress && $('#timecamp-track-button').length == 0 && $('.window .window-main-col').length > 0) {//.css('display').toUpperCase() != 'NONE') {
        insertButtonIntoPage();
        insertInfoIntoPage();
    }
}

var insertInfoIntoPage = function () {
    var infoTop = $('.quiet.hide-on-edit.window-header-inline-content.js-current-list');
    var info = $('<span/>', { 'id': 'timecamp-track-info' });
    infoTop.append(info);
}

var insertButtonIntoPage = function () {
    console.log('Inserting button into page...')

    buttonInsertionInProgress = true;
    var button = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
    this.button = button;
    //.css('height', 'auto')
    //.css('white-space', 'normal');
    //button.append($('<span/>', { 'style': 'margin-left: 0.2em; background-image: url(' + chrome.extension.getURL('images/icon-16.png') + ');' }));//'class': 'icon-sm icon-clock' }));
    button.append($('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" />'));
    button.append($('<span/>', { 'class': 'text', 'style': 'vertical-align: top; margin-left: 0.3em;width: 60; display: inline-block;' }).text(chrome.i18n.getMessage('SYNCHRONIZING')));
    button.append($('<span/>', { 'class': 'time' }).text("00:00").css({
        float: "right",
        "font-size": "12px",
        padding: "1px 4px",
        "border-radius": "3px",
        "background-color": "green",
        color: "white"
    }).hide());
    //button.append($('<span/>', { 'class': 'time' }))
    //    .css('display', 'block');
    //.css('text-align','center');

    $.when(updateFreshButton(button))
        .always(function () {
            buttonInsertionInProgress = false;
        });
    button.click(function () {
        buttonClick(button);
    });
    var buttonList = $('.window-module.other-actions.clearfix .clearfix');
    buttonList.prepend(button);
    $('<hr />').insertAfter('#timecamp-track-button');

    //button.children('.text').text();
    //button.children('.time').text('');
}

var updateFreshButton = function () {
    updateButtonState();
    //pushIntervalId = setInterval(function () {
    //    updateButtonState();
    //}, pushInterval);
}

var setButtonText = function (text)
{
    if(button)
        button.children('.text').text(text);
}

var buttonClick = function (button) {
    $.when(getToken())
    .then(function (token) {
        var command;
        if (isTimerRunning && trackedCardId == currentCardId()) {
            command = 'stop';
            setButtonText(chrome.i18n.getMessage('BUTTON_TIMER_STOPPING'));
        }
        else {
            command = 'start';
            setButtonText(chrome.i18n.getMessage('BUTTON_TIMER_STARTING'));
        }

        syncing = false;
        checkButtonTimer(apiUrl, token, currentCardId(), command);
        updateButtonState();
    })
}
pushIntervalId = setInterval(function () {
    updateButtonState();
}, pushInterval);

document.addEventListener("DOMNodeInserted", onDomModified);