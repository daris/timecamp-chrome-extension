/**
 * Created by mild on 29.01.14.
 */

function Browser()
{
    var $this = this;
    this.isChrome = false;
    this.isSafari = false;
    this.isFirefox = false;
    this.isIE = false;

    var ffMatch = null;
    var ieMatch = null;
    var chromeMatch = null;
    var appleMatch = null;
    if (navigator.vendor)
    {
        appleMatch = navigator.vendor.match(/Apple/);
        chromeMatch = navigator.vendor.match(/Google Inc\./);
    }
    else
    {
        chromeMatch = navigator.userAgent.match(/Chrome\//);
        appleMatch = navigator.userAgent.match(/Safari\//);
        ffMatch = navigator.userAgent.match(/Firefox\//);
        ieMatch = navigator.userAgent.match(/Trident\//);
    }

    this.isChrome   = chromeMatch != null;
    this.isSafari   = appleMatch != null;
    this.isFirefox  = ffMatch != null;
    this.isIE       = ieMatch != null;


    this.Storage = {
        get: function(key) {
            return $.Deferred(function (dfd) {
                if ($this.isChrome)
                {
                    chrome.storage.sync.get(key, function (items) {
                        var token = items[key];
                        if (token && !chrome.runtime.lastError) {
                            dfd.resolve(token);
                        } else {
                            dfd.reject();
                        }
                    });

                }
                else if ($this.isFirefox)
                    dfd.resolve(content.localStorage.getItem(key));
                else
                    dfd.resolve(localStorage.getItem(key));
            });

        },
        set: function (key, value) {
            if ($this.isChrome)
            {
                var data = {};
                data[key] = value;

                chrome.storage.sync.set(data, function () {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                    }
                });
            }
            else if ($this.isFirefox)
                dfd.resolve(content.localStorage.setItem(key, value));
            else
                localStorage.setItem(key, value)
        },
        remove: function (key) {
            if ($this.isChrome)
            {
                chrome.storage.sync.remove(key, function () {
                    if (chrome.runtime.lastError) {
                        console.log(chrome.runtime.lastError.message);
                    }
                });
            }
            else if ($this.isFirefox)
                dfd.resolve(content.localStorage.removeItem(key));
            else
                localStorage.removeItem(key);
        }
    };
}