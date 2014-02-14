var serverUrl = 'https://www.timecamp.com/';

var restUrl = serverUrl + 'third_party/api/';
var apiUrl = serverUrl + 'third_party/api/timer/format/json';
var tokenUrl = serverUrl + 'auth/token';
var signInUrl = serverUrl + 'auth/login';
var accessUrl = serverUrl + "auth/access";

Browser = new Browser();
Locale = new Locale();

var getAccessurl = function (redirect_url) {
    if (Browser.isChrome)
        var internalUrl = encodeURIComponent(chrome.runtime.getURL(redirect_url));
    else
        var internalUrl = '';
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
        Browser.Storage.get('removed').done(function (removed) {
            if (removed) {
                dfd.resolve(true);
            } else {
                dfd.resolve(false);
            }
        });
    });
}

var getStoredToken = function () {
    return Browser.Storage.get('token');
}

var storeToken = function (token) {
    Browser.Storage.set('token', token);
}

var removeStoredToken = function () {
    Browser.Storage.remove('token');
    Browser.Storage.set('removed',true);
}

var getToken = function (forceApiCall) {
    return $.Deferred(function (dfd) {
        getStoredToken().done(function (token) {
            console.log('token2',token);
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
