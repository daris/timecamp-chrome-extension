function AsanaTimer() {

    Messages.set('synchronizing', 'SYNCING');
    Messages.set('buttonTimerStopTrackingAnotherTask', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStarted', '');
    this.infoInsertingInProgress = false;
    this.isWatching = this.canWatch.URL;
    var $this = this;

    this.currentTaskId = function () {
        var url = document.URL;
        var reg = /0\/([0-9]+)\/([0-9]+)/g;
        var MatchRes = reg.exec(url);

        if (MatchRes && MatchRes.length >= 3)
            return MatchRes[2];

        return null;
    };

    this.getParentId = function() {
        var url = document.URL;
        var reg = /0\/([0-9]+)/g;
        var MatchRes = reg.exec(url);

        if (MatchRes && MatchRes.length >= 2)
            return MatchRes[1];

        return null;
    };

    this.getSubtasks = function() {
        var subtasks = [];

        $(".item-list-groups").find('.task-row').each(function(i, el){
            var arr = $(el).attr('id').split('_');
            var taskId = arr[3];

            var taskName = $(el).find('textarea').val();

            var subtask = {
                taskId: taskId,
                taskName: taskName
            };

            subtasks.push(subtask);
        });

        return subtasks;
    };

    this.currentTaskName = function () {

        var el = $("#details_property_sheet_title");
        if (el.length)
            return el.val();

        return false;
    };

    this.isButtonInserted = function () {
        if (this.buttonInsertionInProgress)
            return true;

        var button = $('#timecamp-track-button');

        if (button.length > 0)
        {
            if (button.attr('data-taskId') != $this.currentTaskId())
            {
                button.remove();
                return false;
            }
            return true;
        }

        return $('#right_pane').find('.toolbar-section.left').children().eq(1).length == 0;
    };

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...');
        var currentTaskId = $this.currentTaskId();
        if (!currentTaskId)
        {
            this.buttonInsertionInProgress = false;
            return;
        }

        var dueDate = $(".property.due_date.flyout-owner").eq(0);
        if (dueDate.css('margin-right') == '7px')
            dueDate.css('margin-right','0px');


        var buttonObj;
        if (ButtonList[currentTaskId])
            buttonObj = ButtonList[currentTaskId];
        else
        {
            var taskName = $this.currentTaskName();
            buttonObj = new TimerButton(currentTaskId, taskName);
            ButtonList[currentTaskId] = buttonObj;
        }
        buttonObj.insertInProgress = true;

        var div1 = $('<div/>', { 'class': 'loading-boundary hidden'});
        var div2 = $('<div/>', { 'class': 'redesign-timecamp-container'});
        var div3 = $('<div/>', { 'class': 'property tc flyout-owner'});
        var div4 = $('<div/>', { 'class': 'property-name', 'id':'lunaTC' });
        var button = $('<span/>', { 'class': 'timecamp-track-button', 'id': 'timecamp-track-button', 'data-taskId': currentTaskId, 'style':'position:relative' });

        this.button = button;
        div1.append(div2);
        div2.append(div3);
        div3.append(div4);
        div4.append(button);
        button.append($('<img />', {"src": chrome.extension.getURL('images/icon-14.png'), "id" : "tc-logo"}));
        button.append($('<span/>', {'class': 'text'}).text(Messages.synchronizing));
        button.append($('<span/>', {'class': 'time'}).text("00:00").hide());


        var buttonList = $('#right_pane').find('.toolbar-section.left').children().eq(1);
        div1.insertAfter(buttonList);
        buttonObj.insertInProgress = false;
        buttonObj.uiElement = button;

        $.when(this.updateButtonState()).always(function () {
            $this.buttonInsertionInProgress = false;
        });
    };

    this.onSyncSuccess = function (response) {
        if (response.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            if (!this.trackedTaskId)
                return;
            var badges = $("#center_pane__contents").find("#item_row_view_"+ this.trackedTaskId +" .itemRowView-taskMetadata");
            if (badges.find("#tc-badge").length == 0) {
                var badge = $("#tc-badge");

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $('<img/>',
                        {
                            id:         "tc-badge",
                            style:      "vertical-align: top;",
                            src:        chrome.extension.getURL('images/icon-14.png'),
                            title:      Messages.badgeTimerRunning
                        });
                badges.prepend(badge);
            }
        }
        else
        {
            this.onSyncFailure();
        }
    };

    this.updateTopMessage = function (taskId, duration) {
        if (!$this.isInfoInserted())
            return;
        if (taskId != $this.currentTaskId())
            return;

        if ($this.startDate && $this.trackedTaskId == $this.currentTaskId())
            duration += moment().diff($this.startDate, 'seconds');

        var timecampTrackInfo = $('#timecamp-track-info');
        if (duration == 0)
            timecampTrackInfo.html('');
        else
            timecampTrackInfo.html('<b>You</b> spent ' + $this.getElapsedTime(duration) + ' doing this task');
    };

    this.isInfoInserted = function () {
        if (!$this.isTaskSelected())
            return false;

        return this.infoInsertingInProgress || $("#timecamp-track-info").length > 0;
    };

    this.insertInfoIntoPage = function () {
        var taskId = $this.currentTaskId();
        if (!taskId)
            return;

        this.infoInsertingInProgress = true;
        var infoTop = $('#right_pane').find('.small-feed-story-group').eq(0);
        var feedStory = $('<div>', {'class' : 'feed-story'});
        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        feedStory.prepend(info);
        infoTop.prepend(feedStory);

        $this.getTrackedTime();


        this.infoInsertingInProgress = false;
    };

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    };

    this.bindEvents(this);
}

$(document).ready(function () {
    AsanaTimer.prototype = new TimerBase();
    timer = new AsanaTimer();
});

Sidebar.cssUpdate = [
    {
        selector: "#whole_page_container",
        property: "margin-left",
        value: "50px"
    }
];
Sidebar.clickBindSelector = ["body"];
Sidebar.appendSelector = "body";
Service = "asana";