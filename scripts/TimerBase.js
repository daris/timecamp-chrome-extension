/**
 * Created by mdybizbanski on 14.09.15.
 */

function TimerBase() {
    this.service = '';
    this.oneSecondIntervalId = null;
    this.buttonInsertionInProgress = false;
    this.infoInsertingInProgress = false;
    this.pushInterval = 30000;
    this.isTimerRunning = false;
    this.trackedTaskId = "";
    this.button = null;
    this.syncing = false;
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

    this.messages = {
        buttonTimerStopping                 : chrome.i18n.getMessage('BUTTON_TIMER_STOPPING'),
        buttonTimerStarting                 : chrome.i18n.getMessage('BUTTON_TIMER_STARTING'),
        buttonTimerStopTrackingAnotherTask  : chrome.i18n.getMessage('BUTTON_TIMER_STOP_TRACKING_ANOTHER_TASK'),
        buttonTimerStarted                  : chrome.i18n.getMessage('BUTTON_TIMER_STARTED'),
        buttonTimerStopped                  : chrome.i18n.getMessage('BUTTON_TIMER_STOPPED'),
        buttonLogIn                         : chrome.i18n.getMessage('BUTTON_LOG_IN'),
        buttonConnectionError               : chrome.i18n.getMessage('BUTTON_CONNECTION_ERROR'),
        synchronizing                       : chrome.i18n.getMessage('SYNCHRONIZING'),
        badgeTimerRunning                   : chrome.i18n.getMessage('BADGE_TIMER_RUNNING'),
        set: function (key, value) {
            $this.messages[key] = chrome.i18n.getMessage(value);
        }
    };

    this.canWatch = {'DOM': 0,'URL': 1, 'HISTORY': 2};
    this.isWatching = this.canWatch.DOM;

    this.currentTaskId          = function () { return ''; };
    this.onSyncSuccess          = function (response) {};
    this.onSyncFailure          = function (reason) {};
    this.insertButtonIntoPage   = function () {};
    this.insertInfoIntoPage     = function () {};
    this.updateTopMessage       = function (startDate) {};
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

    this.runTimer = function (startDate, button) {
        return setInterval(function () {
            var diff = moment().diff(startDate,'seconds');
            if (button)
                button.setButtonTime(diff);
            if ($this.trackedTaskId == $this.currentTaskId())
                $this.updateTopMessage();
        }, 1000);
    };

    this.buttonClick = function (taskId, onStart, onStop) {
        if (!taskId)
            return;
        if (!$this.buttons[taskId])
            return;
        if (!$this.buttons[taskId].isEnabled())
            return;

        $.when(TokenManager.getToken())
            .then(function (token) {
                var payload = {};
                if ($this.isTimerRunning && $this.trackedTaskId == taskId) {
                    payload = {"stopped_at": moment().format("YYYY-MM-DD HH:mm:ss"), "action":"stop"};
                    $this.buttons[taskId].setButtonTime(0).hideTimer().setButtonText($this.messages.buttonTimerStopping);
                    $this.buttons[taskId].enabled = false;
                    if (onStop)
                        onStop();

                    if ($this.oneSecondIntervalId) {
                        clearInterval($this.oneSecondIntervalId);
                    }
                }
                else {
                    payload = {"started_at": moment().format("YYYY-MM-DD HH:mm:ss"), "action":"start"};
                    $this.buttons[taskId].setButtonText($this.messages.buttonTimerStarting);
                    $this.buttons[taskId].enabled = false;
                    if (onStart)
                        onStart();
                }

                $this.syncing = false;
                $this.apiCall(apiUrl, token, taskId, payload).done(function() {
                    $this.updateButtonState();
                    $.when($this.getEntries(taskId)).then(function () {
                        $.when($this.getTrackedTime()).then(function () {
                            $this.updateTopMessage();
                        });
                    });
                });
            })
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

        }
    };

    this.apiCall = function (apiUrl, token, cardId, payload) {
        if (this.syncing)
            return null;

        this.syncing = true;

        payload.api_token = token;
        payload.service = this.service;
        payload.external_task_id = cardId;

        return $.ajax({
            url: apiUrl,
            data: payload,
            type: 'POST'
        }).always(function () {
            $this.syncing = false;
        });
    };

    this.updateButtonState = function () {
        $.when(TokenManager.getToken())
            .then(function (token) {
                var cardId = $this.currentTaskId();
                return $this.apiCall(apiUrl, token, cardId, {action: 'status'});
            }).done(function (response) {
            if (response == null)
                return;

            $this.isTimerRunning = response.isTimerRunning;

            $this.onSyncSuccess(response);

            for (var i in $this.buttons)
                $this.buttons[i].enabled = true;

            if ($this.isTimerRunning)
            {
                $this.trackedTaskId = response.external_task_id;
                var startDate = moment(response.start_time);
                var button = $this.buttons[$this.trackedTaskId];
                $this.startDate = startDate;

                for (var i in $this.buttons)
                {
                    if ($this.trackedTaskId != i)
                    {
                        $this.buttons[i].setButtonText($this.messages.buttonTimerStopTrackingAnotherTask);
                        $this.buttons[i].setButtonTime(0);
                        $this.buttons[i].hideTimer();
                    }
                }

                if ($this.oneSecondIntervalId) {
                    clearInterval($this.oneSecondIntervalId);
                }

                if(button)
                {
                    button.setButtonText($this.messages.buttonTimerStarted);
                    $this.oneSecondIntervalId = $this.runTimer(startDate, button);
                    button.uiElement.children('.time').show();
                }
            }
            else {
                for (var i in $this.buttons)
                {
                    $this.buttons[i].hideTimer();
                    $this.buttons[i].setButtonTime(0);
                    $this.buttons[i].setButtonText($this.messages.buttonTimerStopped);
                }
                clearInterval($this.oneSecondIntervalId);
            }
        }).fail(function (reason) {
            $this.onSyncFailure(reason);

            TokenManager.getLoggedOutFlag().done(function(loggedOut){
                if (loggedOut) {
                    for (var i in $this.buttons)
                        $this.buttons[i].setButtonText($this.messages.buttonLogIn);
                } else {
                    for (var i in $this.buttons)
                        $this.buttons[i].setButtonText($this.messages.buttonConnectionError);
                }
            });
        });
    };

    this.getEntriesStartTime = function () {
        return moment().format('YYYY-MM-DD');
    };

    this.getEntries = function(taskId)
    {
        return $.Deferred(function (dfd) {
            $.when(TokenManager.getToken())
                .then(function (token) {
                    var today = moment().format('YYYY-MM-DD');

                    $.ajax({
                        url: restUrl+'entries/format/json',
                        data: {
                            api_token: token,
                            service: $this.service,
                            from: $this.getEntriesStartTime(),
                            to: today,
                            user_ids: 'me',
                            external_task_id: taskId
                        },
                        type: 'GET'
                    }).done(function (response) {
                        var sum = 0;
                        var todaySum = 0;
                        if (response.length > 0)
                        {
                            for (var i in response)
                            {
                                sum += parseInt(response[i]['duration']);
                                if (response[i]['date'] == today)
                                    todaySum += parseInt(response[i]['duration']);
                            }
                        }
                        $this.taskDuration[taskId] = sum;
                        $this.taskDurationToday[taskId] = todaySum;

                        dfd.resolve(sum, todaySum);
                    }).fail(function () {dfd.reject();});
                });
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
            this.lastUrl = url;

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


    this.bindEvents = function ($that) {
        $this = $that;
        setInterval($this.updateButtonState, this.pushInterval);
        setTimeout($this.updateButtonState, 3000);

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