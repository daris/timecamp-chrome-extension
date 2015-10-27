/**
 * Created by mdybizbanski on 14.09.15.
 */

function TimerBase() {
    this.service = '';
    this.buttonInsertionInProgress = false;
    this.infoInsertingInProgress = false;
    this.pushInterval = 30000;
    this.isTimerRunning = false;
    this.trackedTaskId = "";
    this.button = null;
    this.startDate = null;
    this.multiButton = false;
    this.taskDuration = {};
    this.taskDurationToday = {};
    this.trackableParents = false;
    this.lastParentId = null;
    this.lastData = null;
    this.lastUrl = '';

    var $this = this;

    this.canWatch = {'DOM': 0,'URL': 1, 'HISTORY': 2};
    this.isWatching = this.canWatch.DOM;

    this.currentTaskId          = function () { return ''; };
    this.isTaskSelected         = function () { return !!$this.currentTaskId() };
    this.currentTaskName        = function () { return false; };
    this.isParentSelected       = function () { return !!$this.getParentId() };
    this.getSubtasks            = function () { return [] };
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

        console.log('ButtonList', ButtonList);
        if (!ButtonList[taskId])
            return;
        if (!ButtonList[taskId].isEnabled())
            return;

        ButtonList[taskId].enabled = false;

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
            ButtonList[taskId].hideTimer().setButtonText(Messages.buttonTimerStopping);
            $.when(ApiService.Timer.stop(now)).then(function () {
                ButtonList[taskId].stop();
                always();
                if (onStop)
                    onStop();
            });
        }
        else
        {
            ButtonList[taskId].setButtonText(Messages.buttonTimerStarting);
            $.when(ApiService.Timer.start(taskId, now)).then(function (data) {
                console.log('data', data);
                ButtonList[taskId].start(now, data.entry_id);
                always();
                if (onStart)
                    onStart();
            });
        }
    };

    this.detectTaskIdChange = function()
    {
        var args;

        if (!$this.isTaskSelected())
        {
            if (!$this.isParentSelected())
                return;

            args = {
                externalParentId: $this.getParentId(),
                subtasks: $this.getSubtasks()
            };
            $(document).trigger('tcParentChangeDetected', args);
            return;
        }

        args = {
            externalTaskId: $this.currentTaskId(),
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

            for (var i in ButtonList)
                ButtonList[i].enabled = true;

            if(!response.isTimerRunning) {
                for (var i in ButtonList)
                {
                    ButtonList[i].stop();
                    ButtonList[i].setButtonText(Messages.buttonTimerStopped);
                }
            }
            else
            {
                if ($this.trackedTaskId == response.external_task_id)
                    return;

                $this.trackedTaskId = response.external_task_id;
                $this.startDate = moment(response.start_time);

                for (var i in ButtonList)
                {
                    if ($this.trackedTaskId != i )
                        ButtonList[i].setButtonText(Messages.buttonTimerStopTrackingAnotherTask).stop();
                    else
                        ButtonList[i].start($this.startDate, response.entry_id);
                }
            }

            $this.isTimerRunning = response.isTimerRunning;
            $this.updateTopMessage();

        }).fail(function (reason) {
            $this.onSyncFailure(reason);

            TokenManager.getLoggedOutFlag().done(function(loggedOut){
                if (loggedOut) {
                    for (var i in ButtonList)
                        ButtonList[i].setButtonText(Messages.buttonLogIn);
                } else {
                    for (var i in ButtonList)
                        ButtonList[i].setButtonText(Messages.buttonConnectionError);
                }
            });
        });
    };

    this.onEntriesLoaded = function(event, eventData)
    {
        var params = eventData.params;
        var data   = eventData.data;

        if (params.with_subtasks)
            return;

        var total = 0;
        for (i in data)
            total += parseInt(data[i].duration, 10);

        var taskId = params.external_task_id;
        $this.updateTopMessage(taskId, total);
    };

    this.getEntries = function(taskId, forceReload, with_subtasks)
    {
        with_subtasks = !!with_subtasks;

        if (!taskId || taskId == "")
            return;

        var params = {
            from : '2012-01-01',
            to   : moment().format('YYYY-MM-DD'),
            user_ids: "me",
            external_task_id: taskId,
            with_subtasks: with_subtasks
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
        if (url != $this.lastUrl || ButtonList.length == 0)
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
    this.onParentChangeDetected = function(event, eventData) {
        console.log('event', event);
        console.log('eventData', eventData);

        if (eventData.externalParentId)
            $this.getEntries(eventData.externalTaskId);
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
        setInterval($this.updateButtonState, $this.pushInterval);
        setTimeout($this.updateButtonState, 3000);
        $(document).on('tcEntriesLoaded',$this.onEntriesLoaded);
        $(document).on('tcDatasetChange',$this.onDatasetChange);
        $(document).on('tcTaskChangeDetected',$this.onTaskChangeDetected);
        $(document).on('tcParentChangeDetected',$this.onParentChangeDetected);
        $(document).on('tcTimerStarted', $this.onTimerStarted);
        $(document).on('tcTimerStopped', $this.onTimerStopped);

        switch ($this.isWatching)
        {
            case $this.canWatch.DOM:
                document.addEventListener("DOMNodeInserted", $this.onDomModified);
                break;
            case $this.canWatch.URL:
                setInterval($this.URLWatcher, 100);
                document.addEventListener("TCURLChanged", $this.onDomModified);
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
                url: restUrl+'/can_track/format/json',
                data: {
                    api_token: token,
                    service: $this.service
                },
                type: 'GET'
            }).done(function (response) {
                $this.trackableParents = response['trackable_parents'];

            }).fail(function () {
                $this.trackableParents = false;
            });
        });
    };
}