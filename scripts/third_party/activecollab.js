function ActiveCollabTimer() {
    var $this = this;


    this.currentTaskId = function () {
        var url = document.URL;
        var MatchRes = url.match(/\/projects\/(.*)\/tasks\/([0-9]*)/);
        if (MatchRes) {
            return MatchRes[1]+'_'+MatchRes[2];
        } else {
            return null;
        }
    };

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            if (!this.trackedTaskId)
                return;
            var permalinkArray = this.trackedTaskId.split("_");
            var permalink = permalinkArray[0]+'/tasks/'+permalinkArray[1];
            var badges = $('#tasks').find('[permalink$="'+permalink+'"]').find('.real_task_name');
            if (badges.find("#tc-badge").length == 0) {
                var badge = $("#tc-badge");

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $('<img/>', {
                        id:         "tc-badge",
                        "class":    "badge",
                        style:      "padding: 1px 4px; height: 14px;",
                        src:        chrome.extension.getURL('images/icon-14.png'),
                        title:      Messages.badgeTimerRunning
                    });
                badges.append(badge);
            }
        }
        else
        {
            this.onSyncFailure();
        }
    };

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    };

    this.updateTopMessage = function (taskId, duration) {
        if (!$this.isInfoInserted())
            return;
        if (taskId != $this.currentTaskId())
            return;

        if ($this.startDate && $this.trackedTaskId == $this.currentTaskId())
            duration += moment().diff($this.startDate, 'seconds');

        var timecampTrackInfo = $('#timecamp-track-info');
        if (duration == 0)
            timecampTrackInfo.html('');
        else
            timecampTrackInfo.html('<b>You</b> spent ' + $this.getElapsedTime(duration) + ' doing this task');
    };

    this.isButtonInserted = function () {
        return !(!this.buttonInsertionInProgress && $('#timecamp-track-button').length == 0 && $('.objects_list_details_single_wrapper').find('.actions').length > 0);
    };

    this.isInfoInserted = function () {
        return !(!this.infoInsertingInProgress && $("#timecamp-track-info").length == 0 && $('.objects_list_details_single_wrapper').find('.properties').length > 0);
    };

    this.insertInfoIntoPage = function () {
        var taskId = $this.currentTaskId();
        if (!taskId)
            return;
        console.log('Inserting info...');

        this.infoInsertingInProgress = true;
        var infoTop = $('.objects_list_details_single_wrapper').find('.properties');

        var info = $('<div/>', { 'class': 'property', 'id': 'timecamp-track-info-container' });
        info.append($('<div/>', { 'class': 'label', 'text':'TimeCamp' }));
        info.append($('<div/>', { 'class': 'content', 'id': 'timecamp-track-info', 'text' : 'No data yet' }));
        infoTop.append(info);
        $this.getTrackedTime();
        this.infoInsertingInProgress = false;
    };

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...');
        var currentTaskId = $this.currentTaskId();
        if (!currentTaskId)
        {
            this.buttonInsertionInProgress = false;
            return;
        }

        var buttonObj;
        if (ButtonList[currentTaskId])
            buttonObj = ButtonList[currentTaskId];
        else
        {
            var taskName = $this.currentTaskName();
            buttonObj = new TimerButton(currentTaskId, taskName);
            ButtonList[currentTaskId] = buttonObj;
        }

        buttonObj.insertInProgress = true;

        var button = $('<li/>');
        var a = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'data-taskId': currentTaskId });
        this.button = a;
        button.append(a);
        a.append($('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" style="vertical-align:middle; margin-top:-4px;"/>'));
        a.append($('<span/>', { 'class': 'text', 'style': 'width: 60; display: inline-block;' }).text(Messages.synchronizing));
        a.append($('<span/>', { 'class': 'time' }).text("00:00").css({
            padding: "0px 2px 2px",
            'margin-left': '5px',
            "border-radius": "3px",
            "background-color": "green",
            color: "white"
        }).hide());

        $.when(this.updateButtonState())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });
        button.click(function () {
            $this.buttonClick($this.currentTaskId());
        });
        var buttonList = $('.objects_list_details_single_wrapper').find('.actions');
        buttonList.append(button);

        buttonObj.insertInProgress = false;
        buttonObj.uiElement = a;
    };

    this.bindEvents(this);
}
ActiveCollabTimer.prototype = new TimerBase();
timer = new ActiveCollabTimer();
Service = "activecollab";