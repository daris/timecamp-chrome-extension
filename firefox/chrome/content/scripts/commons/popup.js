function refreshPopup(statusText, loggedIn, hideButton)
{
    function _loggedIn() {
        $tc('#tc-button').unbind('click').click(function () {
            removeStoredToken();
            refreshPopup("Success", false);
        }).text("Logout");
        $tc("#tc-signup").hide();
    }

    function _loggedOut() {
        $tc('#tc-button').unbind('click').click(function () {
            getToken(true)
                .done(function(){ refreshPopup("Success", true); })
                .fail(function(){ refreshPopup("Success", false); });
        }).text("Log In");
    }

    if (statusText != null) {
        $tc("#status").show().text(statusText);
        setTimeout(function () {
            $tc("#status").hide();
        }, 5000);
    }

    if (hideButton)
        $tc('#tc-button').hide();

    if (loggedIn != undefined) {
        if (loggedIn)
            _loggedIn();
        else
            _loggedOut();
    } else {
        getStoredToken().done(function () {
            _loggedIn();
        }).fail(function () {
            _loggedOut();
        });
    }
}

$tc(document).ready(function () {
    var prmstr = window.location.search.substr(1);
    var prmarr = prmstr.split("&");
    var params = {};
    for (var i = 0; i < prmarr.length; i++) {
        var tmparr = prmarr[i].split("=");
        params[tmparr[0]] = tmparr[1];
    }
    var text = "";
    if (params.status != undefined) {
        //----------We are in iframe!!!-----------
        if (params.status == "1") {
            refreshPopup("Logging in...", true, true);
            getToken(true).done(function (token) {
                refreshPopup("Success", true, true);
                storeToken(token);
                setTimeout(function(){
                    window.parent.close();
                }, 3000);
            });
        } else
            refreshPopup("whoops!");
    } else
        refreshPopup();
});