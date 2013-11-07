//var serverUrl = 'https://riv-asus/timecamp/';
var serverUrl = 'https://timecamp.com/';

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
                        console.log('Token GET response:')
                        console.log(response);
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
