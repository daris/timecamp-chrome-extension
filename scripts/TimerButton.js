/**
 * Created by mdybizbanski on 14.09.15.
 */
function TimerButton(taskId) {
    this.taskId     = taskId;
    this.uiElement  = null;
    this.insertInProgress = true;
    this.enabled    = false;
    this.denied     = false;
    this.startedAt  = null;
    this.intervalId = null;
    this.runningEntryId = false;
    this.isRunning = false;

    var $this = this;

    this.start = function (startDate, entryId) {
        if ($this.isRunning)
            return;
        $this.isRunning = true;
        $this.startedAt = startDate;
        $this.runningEntryId = entryId;

        var callback = function () {
            var diff = moment().diff($this.startedAt,'seconds');
            $this.setButtonTime(diff);

            var eventParams = {
                elapsed: diff,
                entryId: $this.runningEntryId,
                taskId: $this.taskId
            };

            $(document).trigger('tcTimerTick', eventParams);
        };

        callback();
        $this.setButtonText(Messages.buttonTimerStarted);
        $this.showTimer();

        $this.intervalId = setInterval(callback, 1000);
        console.error('start');
    };

    this.stop = function()
    {
        if (!$this.isRunning)
            return;

        $this.isRunning = false;
        console.error('stop');
        $this.hideTimer();
        clearInterval($this.intervalId);
        $this.intervalId = null;
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

        return $this;
    };

    this.setButtonTime = function (seconds)
    {
        var minutes = Math.floor(seconds / 60);
        seconds = Math.floor((seconds - minutes * 60 ));

        if ($this.uiElement)
            $this.uiElement.children('.time').html(zeroFill(minutes, 2) + ':' + zeroFill(seconds, 2));

        return $this;
    };

    this.hideTimer = function ()
    {
        var ui = $this.uiElement.children('.time');
        if (ui.is(':visible'))
            ui.hide();
        return $this;
    };

    this.showTimer = function ()
    {
        var ui = $this.uiElement.children('.time');
        if (!ui.is(':visible'))
            ui.show();
        return $this;
    };
}