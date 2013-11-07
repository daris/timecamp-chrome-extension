/// <reference path="../jquery-2.0.3.js" />
/// <reference path="../moment.js" />
/// <reference path="../chrome-api-vsdoc.js" />

var apiUrl = "https://www.timecamp.com/api";
var intervalId;

var currentBoardToken = function () {
    var urlParts = document.URL.split('/');
    var boardToken = urlParts[5];
    return boardToken;
}

var updateButtonState = function (button) {
    /// <param name="button" type="jQuery"></param>
    button.children('.text').text('Synchronizing...');
    button.children('.time').text('');
    $.post(apiUrl + '/track',
        {
            token: 'xyz123',
            source: 'trello',
            action: 'button',
            data: {
                board: currentBoardToken(),
                card: '?',
                status: button.attr('status')
            }
        }).done(function (response) {
            // sent from server
            var response = {};
            response.status = 'active';
            response.text = 'You spent';
            response.timing = true;
            response.startDate = new Date();

            button.attr('status', response.status);
            button.children('.text').text(response.text + ' ');//.append('<br />');

            var setButtonTime = function () {
                button.children('.time').text(moment(response.startDate).fromNow(true) + ' on this task');//.format('HH:mm:ss'));
            }

            if (response.timing) {
                if (intervalId) {
                    clearInterval(intervalId);
                }

                setButtonTime();
                intervalId = setInterval(function () {
                    setButtonTime();
                }, 1000);
            }
        }).fail(function (reason) {
            button.text('Connection error');//.css('color', 'red');
        });
}

var insertButtonIntoPage = function () {
    var button = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' })
        .css('height', 'auto')
        .css('white-space','normal');
    button.append($('<span/>', { 'class': 'icon-sm icon-clock' }));
    button.append($('<span/>', { 'class': 'text' }));
    button.append($('<span/>', { 'class': 'time' }))
        .css('display', 'block');
        //.css('text-align','center');

    updateButtonState(button);
    button.click(function () {
        updateButtonState(button);
    });
    var buttonList = $('.window-module.other-actions.clearfix .clearfix');
    buttonList.prepend(button);
}

var onDomModified = function () {
    if ($('#timecamp-track-button').length == 0) {
        insertButtonIntoPage();
    }
}

document.addEventListener("DOMNodeInserted", onDomModified);