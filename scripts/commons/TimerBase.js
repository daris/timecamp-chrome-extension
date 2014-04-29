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
    this.taskDuration = [];
    var $this = this;

    this.updateFreshButton = function () {
        this.updateButtonState();
    };

    this.setButtonText = function (text)
    {
        if(this.button)
            this.button.children('.text').html(text);
    };
    this.currentTaskId = function () { return ''; };
    this.onSyncSuccess = function (response) { };
    this.onSyncFailure = function (reason) { };
    this.insertButtonIntoPage = function () { };
    this.insertInfoIntoPage = function () { };
    this.updateTopMessage = function (startDate) {};
    this.isButtonInserted = function () {
        return true;
    };
    this.isInfoInserted = function () {
        return true;
    };
    this.buttonClick = function (onStart, onStop) {
        $tc.when(getToken())
            .then(function (token) {
                var command;
                if ($this.isTimerRunning && $this.trackedTaskId == $this.currentTaskId()) {
                    command = 'stop';
                    $this.setButtonText(Locale.get(Locale.messages.buttonTimerStopping));
                    if (onStop)
                        onStop();
                }
                else {
                    command = 'start';
                    $this.setButtonText(Locale.get(Locale.messages.buttonTimerStarting));
                    if (onStart)
                        onStart();
                }

                $this.syncing = false;
                $this.apiCall(apiUrl, token, $this.currentTaskId(), command);
                $this.updateButtonState();
            });
    };

    this.onDomModified = function () {
        if (!$this.isButtonInserted())
            $this.insertButtonIntoPage();

        if (!$this.isInfoInserted())
            $this.insertInfoIntoPage();
    };

    this.apiCall = function (apiUrl, token, cardId, action) {
        if (this.syncing)
            return null;

        var fd = new FormData();
        fd.append('api_token', token);
        fd.append('service', this.service);
        fd.append('action', action);
        fd.append('external_task_id', cardId);

        this.syncing = true;
        return $tc.ajax({
            url: apiUrl,
            data: fd,
            processData: false,
            contentType: false,
            type: 'POST'
        }).always(function () {
            $this.syncing = false;
        });
    };

    this.updateButtonState = function () {
        $tc.when(getToken())
            .then(function (token) {
                var cardId = $this.currentTaskId();
                return $this.apiCall(apiUrl, token, cardId, 'status');
            }).done(function (response) {
                if (response == null)
                    return;

                $this.isTimerRunning = response.isTimerRunning;

                $this.onSyncSuccess(response);

                if ($this.isTimerRunning) {

                    $this.trackedTaskId = response.external_task_id;
                    if ($this.trackedTaskId != $this.currentTaskId())
                    {
                        $this.setButtonText(Locale.get(Locale.messages.buttonTimerStopTrackingAnotherTask));
                        return;
                    }

                    $this.setButtonText(Locale.get(Locale.messages.buttonTimerStarted));
                    if($this.button)
                        $this.button.children('.time').show();
                    var startDate = new Date(new Date().valueOf() - response.elapsed * 1000);
                    $this.startDate = startDate;
                    if ($this.oneSecondIntervalId) {
                        clearInterval($this.oneSecondIntervalId);
                    }

                    $this.updateTopMessage();
                    $this.oneSecondIntervalId = setInterval(function () {
                        var diff = Math.abs((new Date().valueOf() - startDate.valueOf()));
                        var minutes = Math.floor(diff / 1000 / 60);
                        var seconds = Math.floor((diff - minutes * 1000 * 60 ) / 1000);
                        if ($this.button)
                            $this.button.children('.time').html(zeroFill(minutes, 2) + ':' + zeroFill(seconds, 2));
                        if ($this.trackedTaskId == $this.currentTaskId())
                            $this.updateTopMessage();
                    }, 1000);
                }
                else {
                    if ($this.button)
                        $this.button.children('.time').hide();

                    $this.setButtonText(Locale.get(Locale.messages.buttonTimerStopped));
                    clearInterval($this.oneSecondIntervalId);
                    $this.updateTopMessage();
                }
            }).fail(function (reason) {
                $this.onSyncFailure(reason);

                getLoggedOutFlag().done(function(loggedOut){
                    if (loggedOut) {
                        $this.setButtonText(Locale.get(Locale.messages.buttonLogIn));
                        $this.updateTopMessage();
                    } else {
                        $this.setButtonText(Locale.get(Locale.messages.buttonConnectionError));
                        $this.updateTopMessage();
                    }
                });

            });
    };

    this.getTrackedTime = function()
    {
        return $tc.Deferred(function (dfd) {
            $tc.when(getToken())
                .then(function (token) {
                    $tc.ajax({
                        url: restUrl+'entries/format/json',
                        data: {
                            api_token: token,
                            service: $this.service,
                            from: moment().format('YYYY-MM-DD'),
                            to: moment().format('YYYY-MM-DD'),
                            user_ids: 'me',
                            external_task_id: $this.currentTaskId()
                        },
                        type: 'GET'
                    }).done(function (response) {
                        var sum = 0;
                        if (response.length > 0)
                        {
                            for (var i in response)
                            {
                                sum += parseInt(response[i]['duration'])
                            }
                        }
                        dfd.resolve(sum);
                    }).fail(function () {dfd.reject();});
                });
        });
    };

    this.getElapsedTime = function (timeInSeconds)
    {
        var time = {
            hours : Math.round(moment.duration(timeInSeconds, 'seconds').hours()),
            minutes : Math.round(moment.duration(timeInSeconds, 'seconds').minutes()),
            seconds : Math.round(moment.duration(timeInSeconds, 'seconds').seconds())
        };

        if(time.hours   > 0){   return time.hours   + ' hour'+(time.hours == 1 ? '' : 's')+' and '     + time.minutes  + ' minute'+(time.minutes == 1 ? '' : 's');}
        if(time.minutes > 0){   return time.minutes + ' minute'+(time.minutes == 1 ? '' : 's');}

        return 'seconds';
    };

    this.bindEvents = function ($that) {
        $this = $that;
        setInterval(function () {
            $this.updateButtonState();
        }, this.pushInterval);

        Browser.getContext().addEventListener("DOMNodeInserted", this.onDomModified);
    }
}
