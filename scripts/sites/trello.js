function TrelloTimer() {

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
            var badges = $tc('.list-cards a[href^="/c/' + this.trackedTaskId + '"]', Browser.getContext()).siblings('div.badges');
            if (badges.find("#tc-badge").length == 0) {
                var badge = $tc("#tc-badge", Browser.getContext());

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $tc('<img/>',
                        {
                            id:         "tc-badge",
                            "class":    "badge",
                            style:      "padding: 1px 4px; height: 14px;",
                            src:        chrome.extension.getURL('images/icon-14.png'),
                            title:      Locale.get(Locale.messages.badgeTimerRunning)
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
        var badge = $tc("#tc-badge", Browser.getContext());
        if (badge.length > 0)
            badge.remove();
    }

    this.updateTopMessage = function () {
        var timecampTrackInfo = $tc('#timecamp-track-info', Browser.getContext());
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
        return !(!this.buttonInsertionInProgress && $tc('#timecamp-track-button', Browser.getContext()).length == 0 && $tc('.window .window-main-col', Browser.getContext()).length > 0);
    }

    this.isInfoInserted = function () {
        return this.infoInsertingInProgress || $tc("#timecamp-track-info", Browser.getContext()).length > 0;
    }

    this.insertInfoIntoPage = function () {
        console.log('Inserting Info into page...');
        this.infoInsertingInProgress = true;

        $tc.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[$this.currentTaskId()] = sum;
                $this.updateTopMessage();
            });

        var infoTop = $tc('.quiet.hide-on-edit.window-header-inline-content.js-current-list', Browser.getContext());
        var info = $tc('<span/>', { 'id': 'timecamp-track-info' });
        infoTop.append(info);
        this.infoInsertingInProgress = false;
    }

    this.insertButtonIntoPage = function () {
        console.log('Inserting button into page...');

        this.buttonInsertionInProgress = true;
        var button = $tc('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
        this.button = button;
        button.append($tc('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" />'));
        button.append($tc('<span/>', { 'class': 'text', 'style': 'vertical-align: top; margin-left: 0.3em;width: 60; display: inline-block;' }).text(Locale.get(Locale.messages.synchronizing)));
        button.append($tc('<span/>', { 'class': 'time' }).text("00:00").css({
            float: "right",
            "font-size": "12px",
            padding: "1px 4px",
            "border-radius": "3px",
            "background-color": "green",
            color: "white"
        }).hide());

        $tc.when(this.updateFreshButton())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });
        button.click(function () {
            $this.buttonClick();
        });
        var buttonList = $tc('.window-module.other-actions.clearfix .clearfix', Browser.getContext());
        buttonList.prepend(button);
        $tc('<hr />').insertAfter('#timecamp-track-button');

    }

    this.bindEvents(this);
}
TrelloTimer.prototype = new TimerBase();
timer = new TrelloTimer();
