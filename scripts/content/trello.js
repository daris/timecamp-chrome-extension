﻿function TrelloTimer() {

    this.service = 'trello';
    var $this = this;

    this.currentTaskId = function () {
        var url = document.URL;
        var MatchRes = url.match(/\/c\/([a-zA-Z0-9]*)/);
        if (MatchRes) {
            var id = MatchRes[1];
            return id;
        } else {
            return null;
        }
    }
    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            var badges = $('.list-cards a[href^="/c/' + this.trackedTaskId + '"]').siblings('div.badges');
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
                            src:        chrome.extension.getURL('images/icon-14.png'),
                            title:      this.messages.badgeTimerRunning
                        });
                badges.append(badge);
            }
        }
        else
        {
            this.onSyncFailure();
        }
    }

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    }

    this.updateTopMessage = function (startDate) {
        if (startDate) {
            var duration = moment().from(startDate, true);
            $('#timecamp-track-info').text('(You spent ' + duration + ' doing this task)');
        }
        else
        {
            $('#timecamp-track-info').text('');
        }
    }

    this.isButtonInserted = function () {
        return !(!this.buttonInsertionInProgress && $('#timecamp-track-button').length == 0 && $('.window .window-main-col').length > 0);
    }

    this.isInfoInserted = function () {
        return $("#timecamp-track-info").length > 0;
    }

    this.insertInfoIntoPage = function () {
        var infoTop = $('.quiet.hide-on-edit.window-header-inline-content.js-current-list');
        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        infoTop.append(info);
    }

    this.insertButtonIntoPage = function () {
        console.log('Inserting button into page...')

        this.buttonInsertionInProgress = true;
        var button = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
        this.button = button;
        button.append($('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" />'));
        button.append($('<span/>', { 'class': 'text', 'style': 'vertical-align: top; margin-left: 0.3em;width: 60; display: inline-block;' }).text(this.messages.synchronizing));
        button.append($('<span/>', { 'class': 'time' }).text("00:00").css({
            float: "right",
            "font-size": "12px",
            padding: "1px 4px",
            "border-radius": "3px",
            "background-color": "green",
            color: "white"
        }).hide());

        $.when(this.updateFreshButton())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });
        button.click(function () {
            $this.buttonClick(button);
        });
        var buttonList = $('.window-module.other-actions.clearfix .clearfix');
        buttonList.prepend(button);
        $('<hr />').insertAfter('#timecamp-track-button');

    }

    this.bindEvents(this);
}
TrelloTimer.prototype = new TimerBase();
timer = new TrelloTimer();