function ActiveCollabTimer() {
    this.service = 'activecollab';
    var $this = this;

    this.currentTaskId = function () {
        var url = document.URL;
        var MatchRes = url.match(/\/projects\/(.*)\/tasks\/([0-9]*)/);
        if (MatchRes) {
            return MatchRes[1]+'_'+MatchRes[2];
        } else {
            return null;
        }
    }

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            var permalinkArray = this.trackedTaskId.split("_");
            var permalink = permalinkArray[0]+'/tasks/'+permalinkArray[1];
            var badges = $tc('#tasks', Browser.getContext()).find('[permalink$="'+permalink+'"]').find('.real_task_name');
            if (badges.find("#tc-badge").length == 0) {
                var badge = $tc("#tc-badge", Browser.getContext());

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $tc('<img/>', {
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

    this.updateTopMessage = function ()
    {
        var timecampTrackInfo = $tc('#timecamp-track-info', Browser.getContext());
        var taskDuration = $this.taskDuration[$this.currentTaskId()];
        if (!taskDuration)
            taskDuration = 0;

        var duration = 0;
        if ($this.startDate && $this.trackedTaskId == $this.currentTaskId())
            duration = moment().diff($this.startDate, 'seconds');

        duration += taskDuration;

        if (duration == 0)
            timecampTrackInfo.html('No data yet');
        else
            timecampTrackInfo.html('You spent ' + $this.getElapsedTime(duration) + ' doing this task');
    };

    this.isButtonInserted = function () {
        return !(!this.buttonInsertionInProgress && $tc('#timecamp-track-button', Browser.getContext()).length == 0 && $tc('.objects_list_details_single_wrapper', Browser.getContext()).find('.actions').length > 0);
    }

    this.isInfoInserted = function () {
        return !(!this.infoInsertingInProgress && $tc("#timecamp-track-info", Browser.getContext()).length == 0 && $tc('.objects_list_details_single_wrapper', Browser.getContext()).find('.properties').length > 0);
    }

    this.insertInfoIntoPage = function () {
        console.log('Inserting info...');

        this.infoInsertingInProgress = true;
        this.taskDuration[$this.currentTaskId()] = 0;
        $tc.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[$this.currentTaskId()] = sum;
                $this.updateTopMessage();
            });

        var infoTop = $tc('.objects_list_details_single_wrapper', Browser.getContext()).find('.properties');
        var info = $tc('<div/>', { 'class': 'property', 'id': 'timecamp-track-info-container' });
        info.append($tc('<div/>', { 'class': 'label', 'text':'TimeCamp' }));
        info.append($tc('<div/>', { 'class': 'content', 'id': 'timecamp-track-info', 'text' : 'No data yet' }));
        infoTop.append(info);
        this.infoInsertingInProgress = false;
    }

    this.insertButtonIntoPage = function () {
        console.log('Inserting button into page...')

        this.buttonInsertionInProgress = true;
        var button = $tc('<li/>');
        var a = $tc('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
        this.button = a;
        button.append(a);
        a.append($tc('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" style="vertical-align:middle; margin-top:-4px;"/>'));
        a.append($tc('<span/>', { 'class': 'text', 'style': 'width: 60; display: inline-block;' }).text(Locale.get(Locale.messages.synchronizing)));
        a.append($tc('<span/>', { 'class': 'time' }).text("00:00").css({
            padding: "0px 2px 2px",
            'margin-left': '5px',
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
        var buttonList = $tc('.objects_list_details_single_wrapper', Browser.getContext()).find('.actions');
        buttonList.append(button);
    }

    this.bindEvents(this);
}
ActiveCollabTimer.prototype = new TimerBase();
timer = new ActiveCollabTimer();