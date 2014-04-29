/**
 * Created by m.dybizbanski on 22.11.13.
 */
function PodioTimer() {
    this.service = 'podio';
    var $this = this;

    this.currentTaskId = function () {
        var $html = $('html');

        if ($html.is('.tasks'))
        {
            var MatchRes = document.URL.match(/\/tasks\/([0-9]*)/);
            if (MatchRes)
                return MatchRes[1];
        }

        if ($html.is('.items'))
        {
            var id = $('#wrapper').data('context-id');
            return 'i' + id;
        }

        var parent = $(".preview-panel").find('.item-container');
        if (parent.length > 0)
        {
            return 'i' + parent.data('item-id');
        }
        return null;
    };

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;

            var badges;
            if (this.trackedTaskId.charAt(0) != 'i')
            {
                var permalink = '/tasks/'+this.trackedTaskId;
                badges = $('.task-summary').find('a[href$="'+permalink+'"]');
            }

            if (badges && badges.find("#tc-badge").length == 0) {
                var badge = $("#tc-badge");

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $('<img/>', {
                        id:         "tc-badge",
                        "class":    "badge",
                        style:      "padding: 1px 4px; height: 14px; vertical-align: text-bottom",
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
    };

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    };

    this.updateTopMessage = function ()
    {
        var timecampTrackInfo = $('#timecamp-track-info');
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
        if (this.buttonInsertionInProgress)
            return true;

        if ($('#timecamp-track-button').length > 0)
            return true;

        return $("#timecamp-container").length == 0;
    };

    this.isInfoInserted = function () {
        if (this.infoInsertingInProgress)
            return true;

        if ($('#timecamp-track-info').length > 0)
            return true;

        if ($('ul.app-fields-list').length == 0  && $('.task-body.fields').length == 0)
            return true;
    };

    this.insertInfoIntoPage = function () {
        this.infoInsertingInProgress = true;

        console.log('$this.currentTaskId()',$this.currentTaskId());

        console.log('Inserting info...');
        this.taskDuration[$this.currentTaskId()] = 0;
        $.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[$this.currentTaskId()] = sum;
                $this.updateTopMessage();
            });

        var addDiv = false;
        var infoTop = $('ul.app-fields-list');
        if (infoTop.length == 0)
        {
            infoTop = $('.task-body.fields').eq(0);
            addDiv = true;
        }


        var info;
        if (addDiv)
        {
            info = $('<div/>', { 'class': 'field text', 'id': 'timecamp-container'});
            info.append($('<div/>', { 'class': 'label', 'text':'TimeCamp' }));

            var wrapper = $('<div/>', { 'class': 'value'});
            wrapper.append($('<div/>', { 'id': 'timecamp-track-info', 'text' : 'No data yet', style:'float: left; margin-left: 10px;' }));

            info.append(wrapper);
        }
        else
        {
            info = $('<li/>', { 'class': 'field text', 'id': 'timecamp-container' });
            var frameWrapper = $('<div/>', { 'class': 'frame-wrapper'});
            var frameLabel = $('<div/>', { 'class': 'frame-label'});
            var frameContent = $('<div/>', { 'class': 'frame-content'});
            var labelContentWrapper = $('<div/>', { 'class': 'label-content-wrapper'});
            var labelContent = $('<div/>', { 'class': 'label-content', text: 'TimeCamp'});
            labelContentWrapper.append(labelContent);
            frameLabel.append(labelContentWrapper);
            frameContent.append($('<div/>', { 'class': 'value', 'id': 'timecamp-track-info', 'text' : 'No data yet', 'style':'margin-left: 10px; float: left;' }));
            frameWrapper.append(frameLabel);
            frameWrapper.append(frameContent);
            info.append(frameWrapper);
        }

        infoTop.prepend(info);
        this.infoInsertingInProgress = false;
    };

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...');
        var button = $('<div/>', {'class': 'float-left tc button-new silver'}).width('auto');
        var a = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
        this.button = a;
        button.append(a);
        a.append($('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" style="vertical-align:text-bottom;"/>'));
        a.append($('<span/>', { 'class': 'text', 'style':'float: right; margin-left: 5px;' }).text(this.messages.synchronizing));
        a.append($('<span/>', { 'class': 'time' }).text("00:00").css({ padding: "0px 2px 2px", 'margin-left': '5px'}).hide());

        button.click(function () {
            $this.buttonClick();
        });
        var buttonList = $(".preview-panel").find('.action-bar').find('ul').eq(0);
        if (buttonList.length == 0)
            buttonList = $("#timecamp-container").find('.frame-content').eq(0);
        if (buttonList.length == 0)
            buttonList = $("#timecamp-container").find('.value').eq(0);
        buttonList.prepend(button);

        $.when(this.updateFreshButton())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });
    };

    this.bindEvents(this);
}
PodioTimer.prototype = new TimerBase();
timer = new PodioTimer();
