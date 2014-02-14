/**
 * Created by mild on 28.01.14.
 */

function Locale ()
{
    this.messages = {
        buttonTimerStopping                 : 'BUTTON_TIMER_STOPPING',
        buttonTimerStarting                 : 'BUTTON_TIMER_STARTING',
        buttonTimerStopTrackingAnotherTask  : 'BUTTON_TIMER_STOP_TRACKING_ANOTHER_TASK',
        buttonTimerStopTrackingAnotherTaskShort: 'BUTTON_TIMER_STOPPED_SHORT',
        buttonTimerStarted                  : 'BUTTON_TIMER_STARTED',
        buttonTimerStopped                  : 'BUTTON_TIMER_STOPPED',
        buttonTimerStoppedShort             : 'BUTTON_TIMER_STOPPED_SHORT',
        buttonConnectionError               : 'BUTTON_CONNECTION_ERROR',
        synchronizing                       : 'SYNCHRONIZING',
        syncing                             : 'SYNCING',
        badgeTimerRunning                   : 'BADGE_TIMER_RUNNING',
        statusSuccess                       : 'STATUS_SUCCESS',
        statusLoggingIn                     : 'STATUS_LOGGING_IN',
        buttonLogOut                        : 'BUTTON_LOG_OUT',
        buttonLogIn                         : 'BUTTON_LOG_IN'
};

    this.get = function (label)
    {
        if (Browser.isChrome)
            return chrome.i18n.getMessage(label);
        else if (Browser.isFirefox)
        {
            var stringsBundle = document.getElementById("tc-string-bundle");
            return stringsBundle.getString(label);
        }


        return label;
    }
}
