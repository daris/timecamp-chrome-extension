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

    this.getContext = function ()
    {
        if ($this.isFirefox)
            return content.document;
        else
            return document;
    };

    this.getFile = function(file)
    {
        if ($this.isFirefox)
            return "chrome://timecamp-timer/content/" + file;
        else
            return chrome.extension.getURL(file);
    };

    this.Storage = {
        firefoxStorage: null,
        _getFirefoxStorage: function ()
        {
            var url = "http://timecamp.timer";
            var ios = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
            var ssm = Components.classes["@mozilla.org/scriptsecuritymanager;1"].getService(Components.interfaces.nsIScriptSecurityManager);
            var dsm = Components.classes["@mozilla.org/dom/storagemanager;1"].getService(Components.interfaces.nsIDOMStorageManager);

            var uri = ios.newURI(url, "", null);
            var principal = ssm.getCodebasePrincipal(uri);
            this.firefoxStorage= dsm.getLocalStorageForPrincipal(principal, "");
        },

        get: function(key) {
            return $tc.Deferred(function (dfd) {
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
                {
                    if (!$this.Storage.firefoxStorage)
                        $this.Storage._getFirefoxStorage();

                    var item = $this.Storage.firefoxStorage.getItem(key);

                    if (item)
                        dfd.resolve(item);
                    else
                        dfd.reject();
                }
                else
                {
                    var token = localStorage.getItem(key);
                    if (token != null && token != '')
                        dfd.resolve(token);
                    else
                        dfd.reject();
                }
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
            {
                if (!$this.Storage.firefoxStorage)
                    $this.Storage._getFirefoxStorage();

                $this.Storage.firefoxStorage.setItem(key, value);
            }
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
            {
                if (!$this.Storage.firefoxStorage)
                    $this.Storage._getFirefoxStorage();

                $this.Storage.firefoxStorage.removeItem(key);
            }
            else
                localStorage.removeItem(key);
        }
    };
}