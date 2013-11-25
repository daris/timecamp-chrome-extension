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
            var id = $('.item-container').data('item-id');
            return 'i' + id;
        }

        var parent = $(".preview-panel").find('.item-container');
        if (parent.length > 0)
        {
            return 'i' + parent.data('item-id');
        }
        return null;
    }

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            var permalink = '/tasks/'+this.trackedTaskId;
            var badges;
            badges = $('.task-summary').find('a[href$="'+permalink+'"]');
            if (badges.find("#tc-badge").length == 0) {
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
    }

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    }

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
        return !(!this.buttonInsertionInProgress && $('#timecamp-track-button').length == 0 && ($(".preview-panel").find('.action-bar').length > 0 || $(".header").find('.action-bar').length > 0 || $(".task-header").find('.action-bar').length > 0));
    }

    this.isInfoInserted = function () {
        return !(!this.infoInsertingInProgress && $("#timecamp-track-info").length == 0 && ($('.item-container').length > 0 || $('.task-body.fields').length > 0));
    }

    this.insertInfoIntoPage = function () {
        this.infoInsertingInProgress = true;

        console.log('Inserting info...');
        this.taskDuration[$this.currentTaskId()] = 0;
        $.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[$this.currentTaskId()] = sum;
                $this.updateTopMessage();
            });


        var info = $('<div/>', { 'class': 'field text', 'id': 'timecamp-track-info-container' });
        info.append($('<div/>', { 'class': 'label', 'text':'TimeCamp' }));
        info.append($('<div/>', { 'class': 'value', 'id': 'timecamp-track-info', 'text' : 'No data yet' }));

        var infoTop = $('.item-container').find('.fields').eq(0);
        if (infoTop.length == 0)
            infoTop = $('.task-body.fields').eq(0);
        infoTop.prepend(info);
        this.infoInsertingInProgress = false;
    }

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...')
        var button = $('<li/>', {'class': 'float-left tc', 'style':'margin-left: 7px;'}).width('auto');
        var a = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });
        this.button = a;
        button.append(a);
        a.append($('<img src="' + chrome.extension.getURL('images/icon-16.png') + '" style="vertical-align:middle;"/>'));
        a.append($('<span/>', { 'class': 'text', 'style':'line-height: 11px; font-size: 12px; margin-top: 9px; float: right; margin-left: 5px; color: #999' }).text(this.messages.synchronizing));
        a.append($('<span/>', { 'class': 'time' }).text("00:00").css({
            padding: "0px 2px 2px",
            'margin-left': '5px',
            "border-radius": "3px",
            "background-color": "green",
            color: "white"
        }).hide());

        $.when(this.updateFreshButton())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });
        button.click(function () {
            $this.buttonClick();
        });
        var buttonList = $(".preview-panel").find('.action-bar').find('ul').eq(0);
        if (buttonList.length == 0)
            buttonList = $(".header").find('.action-bar').find('ul').eq(0);
        if (buttonList.length == 0)
            buttonList = $(".task-header").find('.action-bar').find('ul').eq(0);
        buttonList.append(button);
    }

    this.bindEvents(this);
}
PodioTimer.prototype = new TimerBase();
timer = new PodioTimer();