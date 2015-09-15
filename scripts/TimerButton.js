/**
 * Created by mdybizbanski on 14.09.15.
 */
function TimerButton(taskId) {
    this.taskId     = taskId;
    this.uiElement  = null;
    this.insertInProgress = true;
    this.enabled    = false;
    this.denied     = false;

    var $this = this;

    this.isRunning = function ()
    {
        return timer.trackedTaskId == $this.taskId;
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
        $this.uiElement.children('.time').hide();
        return $this;
    };
}