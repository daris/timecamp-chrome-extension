var serverUrl = 'https://www.timecamp.com/';
//var serverUrl = 'https://localhost/timecamp/';

var restUrl = serverUrl + 'third_party/api/';
var apiUrl = serverUrl + 'third_party/api/timer/format/json';
var tokenUrl = serverUrl + 'auth/token';
var signInUrl = serverUrl + 'auth/login';
var accessUrl = serverUrl + "auth/access";

var getAccessurl = function (redirect_url) {
    var internalUrl = encodeURIComponent(chrome.runtime.getURL(redirect_url));
    return accessUrl + '?redirect_url=' + internalUrl;
};

function zeroFill(number, width) {
    width -= number.toString().length;
    if (width > 0) {
        return new Array(width + (/\./.test(number) ? 2 : 1)).join('0') + number;
    }
    return number + ""; // always return a string
}

var getLoggedOutFlag = function () {
    return $.Deferred(function (dfd) {
        chrome.storage.sync.get('removed', function (items) {
            if (chrome.runtime.lastError) {
                dfd.reject();
                return;
            }
            var removed = items['removed'];
            if (removed) {
                dfd.resolve(true);
            } else {
                dfd.resolve(false);
            }
        });
    });
};

var getStoredToken = function () {
    return $.Deferred(function (dfd) {
        chrome.storage.sync.get('token', function (items) {
            var token = items['token'];
            if (token && !chrome.runtime.lastError) {
                dfd.resolve(token);
            } else {
                dfd.reject();
            }
        });
    });
};

var storeToken = function (token) {
    chrome.storage.sync.set({ 'token': token , 'removed' : false}, function () {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
};

var removeStoredToken = function () {
    chrome.storage.sync.remove('token', function () {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
    chrome.storage.sync.set({ 'removed': true }, function () {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
};

var getToken = function (forceApiCall) {
    return $.Deferred(function (dfd) {
        getStoredToken().done(function (token) {
            dfd.resolve(token);
        }).fail(function () {
            getLoggedOutFlag().done(function (loggedOut) {
                if (!loggedOut || forceApiCall) {
                    $.get(tokenUrl)
                    .done(function (response) {
                        if (response.toUpperCase() == 'NO_SESSION') {
                            console.log('NO_SESSION.');
                            dfd.reject();
                        } else {
                            storeToken(response);
                            dfd.resolve(response);
                        }
                    })
                    .fail(function (error) {
                        console.log('GET token failed');
                        dfd.reject();
                    });
                } else {
                    dfd.reject();
                }
            });
        });
    });
};

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
    this.taskDuration = [];
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

    this.canWatch = {'DOM': 0,'URL': 1};
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
            var diff = Math.abs((new Date().valueOf() - startDate.valueOf()));
            var minutes = Math.floor(diff / 1000 / 60);
            var seconds = Math.floor((diff - minutes * 1000 * 60 ) / 1000);
            if (button)
                button.uiElement.children('.time').html(zeroFill(minutes, 2) + ':' + zeroFill(seconds, 2));
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

        $.when(getToken())
            .then(function (token) {
                var command;
                if ($this.isTimerRunning && $this.trackedTaskId == taskId) {
                    command = 'stop';
                    $this.buttons[taskId].setButtonText($this.messages.buttonTimerStopping);
                    $this.buttons[taskId].enabled = false;
                    $this.buttons[taskId].uiElement.children('.time').hide();
                    if (onStop)
                        onStop();

                    if ($this.oneSecondIntervalId) {
                        clearInterval($this.oneSecondIntervalId);
                    }
                }
                else {
                    command = 'start';
                    $this.buttons[taskId].setButtonText($this.messages.buttonTimerStarting);
                    $this.buttons[taskId].enabled = false;
                    if (onStart)
                        onStart();
                }

                $this.syncing = false;
                $this.apiCall(apiUrl, token, taskId, command).done(function() {
                    $this.updateButtonState();
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

                if (!$this.isInfoInserted())
                    $this.insertInfoIntoPage();
            }
            if (!$this.canTrack())
                $this.onTrackingDisabled();

        }
    };

    this.apiCall = function (apiUrl, token, cardId, action) {
        if (this.syncing)
            return null;

        this.syncing = true;
        return $.ajax({
            url: apiUrl,
            data: {
                api_token   : token,
                service     : this.service,
                action      : action,
                external_task_id : cardId
            },
            type: 'POST'
        }).always(function () {
                $this.syncing = false;
            });
    };

    this.updateButtonState = function () {
        $.when(getToken())
            .then(function (token) {
                var cardId = $this.currentTaskId();
                return $this.apiCall(apiUrl, token, cardId, 'status');
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
                    var startDate = new Date(new Date().valueOf() - response.elapsed * 1000);
                    var button = $this.buttons[$this.trackedTaskId];
                    $this.startDate = startDate;

                    for (var i in $this.buttons)
                    {
                        if ($this.trackedTaskId != i)
                        {
                            $this.buttons[i].setButtonText($this.messages.buttonTimerStopTrackingAnotherTask);
                            $this.buttons[i].uiElement.children('.time').hide();
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
                    $this.updateTopMessage();
                }
                else {
                    for (var i in $this.buttons)
                    {
                        $this.buttons[i].uiElement.children('.time').hide();
                        $this.buttons[i].setButtonText($this.messages.buttonTimerStopped);
                    }
                    clearInterval($this.oneSecondIntervalId);
                    $this.updateTopMessage();
                }
            }).fail(function (reason) {
                $this.onSyncFailure(reason);

                getLoggedOutFlag().done(function(loggedOut){
                    if (loggedOut) {
                        for (var i in $this.buttons)
                            $this.buttons[i].setButtonText($this.messages.buttonLogIn);
                    } else {
                        for (var i in $this.buttons)
                            $this.buttons[i].setButtonText($this.messages.buttonConnectionError);
                    }
                    $this.updateTopMessage();
                });
            });
    };

    this.getTrackedTime = function()
    {
        return $.Deferred(function (dfd) {
            $.when(getToken())
                .then(function (token) {
                    if (!$this.currentTaskId())
                    {
                        dfd.reject();
                        return;
                    }
                    $.ajax({
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
        }

        $.when(getToken()).then(function (token)
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

function TimerButton(taskId) {
    this.taskId     = taskId;
    this.uiElement  = null;
    this.insertInProgress = true;
    this.enabled    = false;
    this.denied     = false;

    var $this = this;

    this.isRunning = function ()
    {
        return timer.trackedTaskId == $this.taskId;
    };

    this.isEnabled = function ()
    {
        return !this.insertInProgress && this.enabled;
    };

    this.isInserted = function ()
    {
        return $this.insertInProgress || $('#timecamp-track-button-'+$this.taskId).length > 0;
    };

    this.setButtonText = function (text)
    {
        if ($this.uiElement)
            $this.uiElement.children('.text').html(text);
    };
}
