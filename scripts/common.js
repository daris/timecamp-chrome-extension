if(!String.prototype.linkify) {
    String.prototype.linkify = function() {

        // http://, https://, ftp://
        var urlPattern = /\b(?:https?|ftp):\/\/[a-z0-9-+&@#\/%?=~_|!:,.;]*[a-z0-9-+&@#\/%=~_|]/gim;

        // www. sans http:// or https://
        var pseudoUrlPattern = /(^|[^\/])(www\.[\S]+(\b|$))/gim;

        // Email addresses
        var emailAddressPattern = /[\w.]+@[a-zA-Z_-]+?(?:\.[a-zA-Z]{2,6})+/gim;

        return this
            .replace(urlPattern, '<a target="_blank" href="$&">$&</a>')
            .replace(pseudoUrlPattern, '$1<a target="_blank" href="http://$2">$2</a>')
            .replace(emailAddressPattern, '<a target="_blank" href="mailto:$&">$&</a>');
    };
}

function bench(name)
{
    console.log(name, +moment());
}

if (!String.format) {
    String.format = function(format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function(match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : ''
                ;
        });
    };

    String.prototype.format = function()
    {
        var args = Array.prototype.slice.call(arguments);
        args.unshift(this);
        return String.format.apply(this, args);
    }
}

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

function formatHMS(seconds)
{
    var duration = moment.duration(seconds, 'seconds');
    return duration.hours() + ":" + zeroFill(duration.minutes(), 2) + ":" + zeroFill(duration.seconds(), 2);
}

$(document).ready(function() {
    var manifest = chrome.runtime.getManifest();

    $.ajaxSetup({
        beforeSend: function(request) {
            request.setRequestHeader("X-Chrome-Timer", manifest.version);
            request.setRequestHeader("Accept", "application/json");
        }
    });

    var interceptor = document.createElement('script');
    interceptor.src = chrome.extension.getURL('scripts/interceptHistoryChanges.js');
    interceptor.type ='text/javascript';

    document.body.appendChild(interceptor);
});

Messages = {
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
        Messages[key] = chrome.i18n.getMessage(value);
    }
};

var TokenManager    = new TokenManager();
var ApiService      = new ApiService();
var Sidebar         = new Sidebar();
var ButtonList      = {};

$.when(TokenManager.getToken()).then(function (token) {ApiService.setToken(token);});