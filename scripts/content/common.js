//var serverUrl = 'https://riv-asus/timecamp/';
var serverUrl = 'https://timecamp.com/';

var restUrl = serverUrl + 'third_party/api/';
var apiUrl = serverUrl + 'third_party/api/timer/format/json';
var tokenUrl = serverUrl + 'auth/token';
var signInUrl = serverUrl + 'auth/login';
var accessUrl = serverUrl + "auth/access";

var getAccessurl = function (redirect_url) {
    var internalUrl = encodeURIComponent(chrome.runtime.getURL(redirect_url));
    return accessUrl + '?redirect_url=' + internalUrl;
}

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
}

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
}

var storeToken = function (token) {
    chrome.storage.sync.set({ 'token': token , 'removed' : false}, function () {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
    });
}

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
}

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
}

function TimerBase() {
    this.service = '';
    this.oneSecondIntervalId = null;
    this.buttonInsertionInProgress = false;
    this.infoInsertingInProgress = false;
    this.pushInterval = 5000;
    this.isTimerRunning = false;
    this.trackedTaskId = "";
    this.button = null;
    this.syncing = false;
    this.startDate = null;
    this.taskDuration = [];
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
    }

    this.updateFreshButton = function () {
        this.updateButtonState();
    }

    this.setButtonText = function (text)
    {
        if(this.button)
            this.button.children('.text').html(text);
    }
    this.currentTaskId = function () { return ''; }
    this.onSyncSuccess = function (response) { }
    this.onSyncFailure = function (reason) { }
    this.insertButtonIntoPage = function () { }
    this.insertInfoIntoPage = function () { }
    this.updateTopMessage = function (startDate) {}
    this.isButtonInserted = function () {
        return true;
    }
    this.isInfoInserted = function () {
        return true;
    }
    this.buttonClick = function (onStart, onStop) {
        $.when(getToken())
            .then(function (token) {
                var command;
                if ($this.isTimerRunning && $this.trackedTaskId == $this.currentTaskId()) {
                    command = 'stop';
                    $this.setButtonText($this.messages.buttonTimerStopping);
                    if (onStop)
                        onStop();
                }
                else {
                    command = 'start';
                    $this.setButtonText($this.messages.buttonTimerStarting);
                    if (onStart)
                        onStart();
                }

                $this.syncing = false;
                $this.apiCall(apiUrl, token, $this.currentTaskId(), command);
                $this.updateButtonState();
            })
    }

    this.onDomModified = function () {
        if (!$this.isButtonInserted())
            $this.insertButtonIntoPage();

        if (!$this.isInfoInserted())
            $this.insertInfoIntoPage();
    }

    this.apiCall = function (apiUrl, token, cardId, action) {
        if (this.syncing)
            return null;

        var fd = new FormData();
        fd.append('api_token', token);
        fd.append('service', this.service);
        fd.append('action', action);
        fd.append('external_task_id', cardId);

        this.syncing = true;
        return $.ajax({
            url: apiUrl,
            data: fd,
            processData: false,
            contentType: false,
            type: 'POST'
        }).always(function () {
                $this.syncing = false;
            });
    }
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

                if ($this.isTimerRunning) {

                    $this.trackedTaskId = response.external_task_id;
                    if ($this.trackedTaskId != $this.currentTaskId())
                    {
                        $this.setButtonText($this.messages.buttonTimerStopTrackingAnotherTask);
                        return;
                    }

                    $this.setButtonText($this.messages.buttonTimerStarted);
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

                    $this.setButtonText($this.messages.buttonTimerStopped);
                    clearInterval($this.oneSecondIntervalId);
                        $this.updateTopMessage();
                }
            }).fail(function (reason) {
                $this.onSyncFailure(reason);

                getLoggedOutFlag().done(function(loggedOut){
                    if (loggedOut) {
                        $this.setButtonText($this.messages.buttonLogIn);
                        $this.updateTopMessage();
                    } else {
                        $this.setButtonText($this.messages.buttonConnectionError);
                        $this.updateTopMessage();
                    }
                });

            });
    };

    this.getTrackedTime = function()
    {
        return $.Deferred(function (dfd) {
            $.when(getToken())
                .then(function (token) {
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
    }

    this.bindEvents = function ($that) {
        $this = $that;
        setInterval(function () {
            $this.updateButtonState();
        }, this.pushInterval);

        document.addEventListener("DOMNodeInserted", this.onDomModified);
    }
}

