function TrelloTimer() {

    this.service = 'trello';
    var $this = this;

	this.messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    this.messages.set('buttonTimerStarted', 'BUTTON_TIMER_STARTED_SHORT');
    this.messages.set('synchronizing', 'SYNCING');
    this.messages.set('buttonTimerStopping', 'BUTTON_TIMER_STOPPING_SHORT');
	
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

    this.updateTopMessage = function () {
        var timecampTrackInfo = $('#timecamp-track-info');
        var taskDuration = $this.taskDuration[$this.currentTaskId()];
        if (!taskDuration)
            taskDuration = 0;

        var duration = 0;
        if ($this.startDate && $this.trackedTaskId == $this.currentTaskId())
            duration = moment().diff($this.startDate, 'seconds');

        duration += taskDuration;

        if (duration > 0) {
            timecampTrackInfo.text('(You spent ' + $this.getElapsedTime(duration) + ' doing this task)');
        }
        else
        {
            timecampTrackInfo.text('');
        }
    }

    this.isButtonInserted = function () {
        if (this.buttonInsertionInProgress)
            return true;

        if ($('#timecamp-track-button').length > 0)
            return true;

        return $('.window .window-main-col').length == 0;
    }

    this.isInfoInserted = function () {
        if (this.infoInsertingInProgress)
            return true;

        if ($('#timecamp-track-info').length > 0)
            return true;

        if ($('.window-header-inline-content.js-current-list').length == 0)
            return true;

        return false;
    }

    this.insertInfoIntoPage = function () {
        var taskId = $this.currentTaskId();
        if (!taskId)
            return;
        console.log('Inserting Info into page...');
        this.infoInsertingInProgress = true;

        $.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[taskId] = sum;
                $this.updateTopMessage();
            });

        var infoTop = $('.quiet.hide-on-edit.window-header-inline-content.js-current-list');
        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        infoTop.append(info);
        this.infoInsertingInProgress = false;
    }

    this.insertButtonIntoPage = function () {
        if (!$this.currentTaskId())
            return;
        console.log('Inserting button into page...');

        var buttonObj = new TimerButton($this.currentTaskId());
        this.buttons[$this.currentTaskId()] = buttonObj;
        buttonObj.insertInProgress = true;

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
            $this.buttonClick($this.currentTaskId());
        });
        var buttonList = $('.window-module.other-actions.clearfix .clearfix');
        buttonList.prepend(button);
        $('<hr />').insertAfter('#timecamp-track-button');
        buttonObj.insertInProgress = false;
        buttonObj.uiElement = button;
    }

    this.bindEvents(this);
}
TrelloTimer.prototype = new TimerBase();
timer = new TrelloTimer();
