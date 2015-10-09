/**
 * Created by mdybizbanski on 14.09.15.
 */

function TimerBase() {
    this.service = '';
    this.buttonInsertionInProgress = false;
    this.infoInsertingInProgress = false;
    this.pushInterval = 30000;
    this.isTimerRunning = false;
    this.previousTaskId = null;
    this.trackedTaskId = "";
    this.button = null;
    this.startDate = null;
    this.multiButton = false;
    this.taskDuration = {};
    this.taskDurationToday = {};
    this.buttons = {};
    this.trackableParents = false;
    this.lastParentId = null;
    this.lastData = null;
    this.lastUrl = '';

    var $this = this;

    this.canWatch = {'DOM': 0,'URL': 1, 'HISTORY': 2};
    this.isWatching = this.canWatch.DOM;

    this.currentTaskId          = function () { return ''; };
    this.currentTaskName        = function () { return false; };
    this.onSyncSuccess          = function (response) {};
    this.onSyncFailure          = function (reason) {};
    this.insertButtonIntoPage   = function () {};
    this.insertInfoIntoPage     = function () {};
    this.updateTopMessage       = function (taskId, duration) {};
    this.getAvailableButtons    = function () {};
    this.onTrackingDisabled     = function () {};

    this.isButtonInserted       = function () {
        return true;
    };

    this.isInfoInserted = function () {
        return true;
    };

    this.getParentId = function() {
        return false;
    };

    this.canTrack = function () {
        var parent = this.getParentId();
        if (!parent || !this.trackableParents)
            return true;

        if (this.trackableParents == 'all')
            return true;

        if (this.trackableParents.indexOf(parent) !== -1)
            return true;

        return false;
    };

    var storage = {
        entries: {}
    };

    this.buttonClick = function (taskId, onStart, onStop) {
        if (!taskId)
            return;

        console.log('$this.buttons', $this.buttons);
        if (!$this.buttons[taskId])
            return;
        if (!$this.buttons[taskId].isEnabled())
            return;

        $this.buttons[taskId].enabled = false;

        var always = function() {
            //$this.updateButtonState();
            $.when($this.getEntries(taskId, true)).then(function () {
                $.when($this.getTrackedTime()).then(function () {
                    $this.updateTopMessage();
                });
            });
        };

        var now = moment().format("YYYY-MM-DD HH:mm:ss");
        if ($this.isTimerRunning && $this.trackedTaskId == taskId)
        {
            $this.buttons[taskId].hideTimer().setButtonText(Messages.buttonTimerStopping);
            $.when(ApiService.Timer.stop(now)).then(function () {
                $this.buttons[taskId].stop();
                always();
                if (onStop)
                    onStop();
            });
        }
        else
        {
            $this.buttons[taskId].setButtonText(Messages.buttonTimerStarting);
            $.when(ApiService.Timer.start(taskId, now)).then(function (data) {
                console.log('data', data);
                $this.buttons[taskId].start(now, data.entry_id);
                always();
                if (onStart)
                    onStart();
            });
        }
    };

    this.detectTaskIdChange = function() {
        var currentTaskId = $this.currentTaskId();
        if ($this.previousTaskId == currentTaskId)
            return;

        var args = {
            externalTaskId: currentTaskId,
            taskName: $this.currentTaskName()
        };

        $(document).trigger('tcTaskChangeDetected', args);
    };

    this.onDomModified = function () {
        if ($this.multiButton)
        {
            var tasks = $this.getAvailableButtons();
            for (i in tasks)
            {
                if (!$this.isButtonInserted(tasks[i].taskId))
                    $this.insertButtonIntoPage(tasks[i]);
            }
        }
        else
        {
            if ($('#timecamp-track-button').length == 0)
            {
                if (!$this.isButtonInserted())
                    $this.insertButtonIntoPage();
            }
            if (!$this.isInfoInserted())
                $this.insertInfoIntoPage();

            if (!$this.canTrack())
                $this.onTrackingDisabled();

            $this.detectTaskIdChange();
        }
    };

    this.updateButtonState = function () {
        $.when(ApiService.Timer.status()).then(function (response) {
            if (response == null)
                return;

            $this.onSyncSuccess(response);

            for (var i in $this.buttons)
                $this.buttons[i].enabled = true;

            if(!response.isTimerRunning) {
                for (var i in $this.buttons)
                {
                    $this.buttons[i].stop();
                    $this.buttons[i].setButtonText(Messages.buttonTimerStopped);
                }
            }
            else
            {
                if ($this.trackedTaskId == response.external_task_id)
                    return;

                $this.trackedTaskId = response.external_task_id;
                var startDate = moment(response.start_time);
                $this.startDate = startDate;

                for (var i in $this.buttons)
                {
                    if ($this.trackedTaskId != i )
                    {
                        $this.buttons[i].setButtonText(Messages.buttonTimerStopTrackingAnotherTask);
                        $this.buttons[i].stop();
                    }
                    else
                        $this.buttons[i].start(startDate, response.entry_id);
                }
            }

            $this.isTimerRunning = response.isTimerRunning;
            $this.updateTopMessage();

        }).fail(function (reason) {
            $this.onSyncFailure(reason);

            TokenManager.getLoggedOutFlag().done(function(loggedOut){
                if (loggedOut) {
                    for (var i in $this.buttons)
                        $this.buttons[i].setButtonText(Messages.buttonLogIn);
                } else {
                    for (var i in $this.buttons)
                        $this.buttons[i].setButtonText(Messages.buttonConnectionError);
                }
            });
        });
    };

    this.onEntriesLoaded = function(event, eventData)
    {
        var params = eventData.params;
        var data   = eventData.data;

        var total = 0;
        for (i in data)
        {
            entry = data[i];
            total += parseInt(entry.duration,10);
        }
        var taskId = params.external_task_id;
        $this.updateTopMessage(taskId, total);
    };

    this.getEntries = function(taskId, forceReload)
    {
        var params = {
            from : '2012-01-01',
            to   : moment().format('YYYY-MM-DD'),
            user_ids: "me",
            external_task_id: taskId
        };

        if (storage.entries.hasOwnProperty(taskId) && !forceReload)
        {
            $(document).trigger('tcEntriesLoaded', {params: params, data: storage.entries[taskId]});
            return;
        }

        $.when(ApiService.Entries.get(params)).then(function (data) {
            if (data.lenght)
                data.reverse();
            storage.entries[taskId] = data;
            $(document).trigger('tcEntriesLoaded', {params: params, data: data});
        });
    };

    this.getTrackedTime = function()
    {
        return $.Deferred(function (dfd) {

            var taskId = $this.currentTaskId();

            if ($this.taskDuration[taskId] !== undefined)
            {
                dfd.resolve($this.taskDuration[taskId], $this.taskDurationToday[taskId]);
                return;
            }

            $this.taskDuration[taskId] = 0;
            $this.taskDurationToday[taskId] = 0;

            $.when($this.getEntries(taskId)).then(function(sum, sumToday) {
                dfd.resolve(sum, sumToday);
            }).fail(function () {dfd.reject();});
        });
    };

    this.getElapsedTime = function (timeInSeconds)
    {
        var duration = moment.duration(timeInSeconds, 'seconds');
        var time = {
            hours : Math.round(duration.hours()),
            minutes : Math.round(duration.minutes()),
            seconds : Math.round(duration.seconds())
        };

        if(time.hours   > 0){   return time.hours   + ' hour'+(time.hours == 1 ? '' : 's')+' and '     + time.minutes  + ' minute'+(time.minutes == 1 ? '' : 's');}
        if(time.minutes > 0){   return time.minutes + ' minute'+(time.minutes == 1 ? '' : 's');}

        return 'seconds';
    };

    this.URLWatcher = function ()
    {
        var url = document.URL;
        if (url != $this.lastUrl || $this.buttons.length == 0)
        {
            $this.lastUrl = url;

            var event;

            if (document.createEvent) {
                event = document.createEvent("HTMLEvents");
                event.initEvent("TCURLChanged", true, true);
            } else {
                event = document.createEventObject();
                event.eventType = "TCURLChanged";
            }

            event.eventName = "TCURLChanged";

            if (document.createEvent) {
                document.dispatchEvent(event);
            } else {
                document.fireEvent("on" + event.eventType, event);
            }
        }
    };

    this.onTaskChangeDetected = function(event, eventData) {
        console.log('event', event);
        console.log('eventData', eventData);

        if (eventData.externalTaskId)
            $this.getEntries(eventData.externalTaskId);
    };

    this.onDatasetChange = function(event, eventData) {
        console.log('onDatasetChange', eventData);
        var source = eventData.source;
        var refType = eventData.refType;
        var refId = eventData.refId;
        var data = eventData.data;

        if (source == "timer")
            return;

        console.log('storage', storage);

        if (refType == 'entry')
        {
            var taskId = eventData.parentId;
            for (i in storage['entries'][taskId])
            {
                var entry = storage['entries'][taskId][i];
                if (entry['id'] == refId)
                {
                    $.extend(storage['entries'][taskId][i], data);
                    console.log('storage', storage);
                    return;
                }

            }
        }
    };

    this.bindEvents = function ($that) {
        $this = $that;
        setInterval($this.updateButtonState, this.pushInterval);
        setTimeout($this.updateButtonState, 3000);
        $(document).on('tcEntriesLoaded',this.onEntriesLoaded);
        $(document).on('tcDatasetChange',this.onDatasetChange);
        $(document).on('tcTaskChangeDetected',this.onTaskChangeDetected);
        switch ($this.isWatching)
        {
            case $this.canWatch.DOM:
                document.addEventListener("DOMNodeInserted", this.onDomModified);
                break;
            case $this.canWatch.URL:
                setInterval($this.URLWatcher, 100);
                document.addEventListener("TCURLChanged", this.onDomModified);
                break;
            case $this.canWatch.HISTORY:
                window.addEventListener("popstate", function(){
                    setTimeout($this.onDomModified, 20)
                });

                window.addEventListener("historyPushState", function(){
                    setTimeout($this.onDomModified, 20)
                });
                break;
        }

        $.when(TokenManager.getToken()).then(function (token)
        {
            $.ajax({
                url: restUrl+'can_track/format/json',
                data: {
                    api_token: token,
                    service: $this.service
                },
                type: 'GET'
            }).done(function (response) {
                $this.trackableParents = response['trackable_parents'];

            }).fail(function () {$this.trackableParents = false;});
        });
    };
}