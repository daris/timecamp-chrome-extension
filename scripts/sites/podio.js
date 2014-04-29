/**
 * Created by m.dybizbanski on 22.11.13.
 */
function PodioTimer() {
    this.service = 'podio';
    var $this = this;

    this.currentTaskId = function () {
        var $html = $tc('html', Browser.getContext());

        if ($html.is('.tasks'))
        {
            var MatchRes = document.URL.match(/\/tasks\/([0-9]*)/);
            if (MatchRes)
                return MatchRes[1];
        }

        if ($html.is('.items'))
        {
            var id = $tc('.item-container', Browser.getContext()).data('item-id');
            return 'i' + id;
        }

        var parent = $tc(".preview-panel", Browser.getContext()).find('.item-container');
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
                badges = $tc('.task-summary', Browser.getContext()).find('a[href$="'+permalink+'"]');
            }

            if (badges && badges.find("#tc-badge").length == 0) {
                var badge = $tc("#tc-badge", Browser.getContext());

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $tc('<img/>', {
                        id:         "tc-badge",
                        "class":    "badge",
                        style:      "padding: 1px 4px; height: 14px; vertical-align: text-bottom",
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
    };

    this.onSyncFailure = function () {
        var badge = $tc("#tc-badge", Browser.getContext());
        if (badge.length > 0)
            badge.remove();
    };

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
        return !(!this.buttonInsertionInProgress && $tc('#timecamp-track-button', Browser.getContext()).length == 0 && ($tc(".preview-panel", Browser.getContext()).find('.action-bar').length > 0 || $tc(".header", Browser.getContext()).find('.action-bar').length > 0 || $tc(".task-header", Browser.getContext()).find('.action-bar').length > 0));
    };

    this.isInfoInserted = function () {
        return !(!this.infoInsertingInProgress && $tc("#timecamp-track-info", Browser.getContext()).length == 0 && ($tc('.item-container', Browser.getContext()).length > 0 || $tc('.task-body.fields', Browser.getContext()).length > 0));
    };

    this.insertInfoIntoPage = function () {
        this.infoInsertingInProgress = true;

        console.log('Inserting info...');
        this.taskDuration[$this.currentTaskId()] = 0;
        $tc.when($this.getTrackedTime())
            .then(function (sum) {
                $this.taskDuration[$this.currentTaskId()] = sum;
                $this.updateTopMessage();
            });


        var info = $tc('<div/>', { 'class': 'field text', 'id': 'timecamp-track-info-container' });
        info.append($tc('<div/>', { 'style':'position: absolute;', 'class': 'label', 'text':'TimeCamp' }));
        info.append($tc('<div/>', { 'class': 'value field-type-text', 'id': 'timecamp-track-info', 'text' : 'No data yet' }));

        var infoTop = $tc('.item-container', Browser.getContext()).find('.fields').eq(0);
        if (infoTop.length == 0)
            infoTop = $tc('.task-body.fields', Browser.getContext()).eq(0);
        infoTop.prepend(info);
        this.infoInsertingInProgress = false;
    };

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...');
        var button = $tc('<li/>', {'class': 'float-left tc highlight', 'style':'margin-left: 4px;'}).width('auto');
        var a = $tc('<span/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'status': 'unknown' });

        button.append($tc('<span/>', { 'class': 'icon-16 icon-clock-grey', 'style':'background-position: 0 -2304px'}));
        button.append(a);

        this.button = a;

        a.append($tc('<span/>', { 'class': 'text', 'style':'line-height: 11px; font-size: 12px; margin-top: 9px; float: right; margin-left: 5px; color: #777' }).text(Locale.get(Locale.messages.synchronizing)));
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


        var buttonList = $tc(".preview-panel", Browser.getContext()).find('.action-bar').find('ul').eq(0);
        if (buttonList.length == 0)
            buttonList = $tc(".header", Browser.getContext()).find('.action-bar').find('ul').eq(0);
        if (buttonList.length == 0)
            buttonList = $tc(".task-header", Browser.getContext()).find('.action-bar').find('ul').eq(0);
        buttonList.append(button);

        button.click(function () {
            console.log('click');
            $this.buttonClick();
        });
    };

    this.bindEvents(this);
}
PodioTimer.prototype = new TimerBase();
timer = new PodioTimer();