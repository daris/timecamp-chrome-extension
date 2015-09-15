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

$(document).ready(function() {
    var manifest = chrome.runtime.getManifest();

    $.ajaxSetup({
        beforeSend: function(request) {
            request.setRequestHeader("X-Chrome-Timer", manifest.version);
        }
    });

    var interceptor = document.createElement('script');

    interceptor.src = chrome.extension.getURL('scripts/interceptHistoryChanges.js');
    interceptor.type ='text/javascript';

    document.body.appendChild(interceptor);
});

var TokenManager = new TokenManager();