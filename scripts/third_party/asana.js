function AsanaTimer() {

    this.service = 'asana';
    Messages.set('synchronizing', 'SYNCING');
    Messages.set('buttonTimerStopTrackingAnotherTask', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStarted', '');
    this.infoInsertingInProgress = false;
    this.isWatching = this.canWatch.URL;
    var $this = this;

    this.currentTaskId = function () {
        var url = document.URL;
        var MatchRes = url.match(/([0-9]+)/g);
        if (MatchRes) {
            var id = MatchRes[MatchRes.length-1];
            return id;
        } else {
            return null;
        }
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

        var dueDate = $(".property.due_date.flyout-owner").eq(0);
        if (dueDate.css('margin-right') == '7px')
            dueDate.css('margin-right','0px');


        var buttonObj = new TimerButton(currentTaskId);
        this.buttons[currentTaskId] = buttonObj;
        buttonObj.insertInProgress = true;

        var div1 = $('<div/>', { 'class': 'loading-boundary hidden'});
        var div2 = $('<div/>', { 'class': 'redesign-timecamp-container'});
        var div3 = $('<div/>', { 'class': 'property tc flyout-owner'});
        var div4 = $('<div/>', { 'class': 'property-name', 'id':'lunaTC' });
        var button = $('<span/>', { 'id': 'timecamp-track-button', 'data-taskId': currentTaskId, 'status': 'unknown', 'style':'position:relative' });

        this.button = button;
        div1.append(div2);
        div2.append(div3);
        div3.append(div4);
        div4.append(button);
        button.append($('<img />', {"src": chrome.extension.getURL('images/icon-14.png'), "id" : "tc-logo"}));
        button.append($('<span/>', {'class': 'text'}).text(Messages.synchronizing));
        button.append($('<span/>', {'class': 'time'}).text("00:00").hide());


        button.click(function () {
            $this.buttonClick($this.currentTaskId(), null, function () { $this.button.children('.time').hide() });
        });
        var buttonList = $('#right_pane').find('.toolbar-section.left').children().eq(1);
        div1.insertAfter(buttonList);
        buttonObj.insertInProgress = false;
        buttonObj.uiElement = button;

        $.when(this.updateButtonState()).always(function () {
            $this.buttonInsertionInProgress = false;
        });
    };

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            if (!this.trackedTaskId)
                return;
            var badges = $("#center_pane").find("textarea[id$='"+ this.trackedTaskId +"']").siblings('div');
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
        return this.infoInsertingInProgress || $("#timecamp-track-info").length > 0;
    };

    this.insertInfoIntoPage = function () {
        this.infoInsertingInProgress = true;
        var infoTop = $('#right_pane').find('.small-feed-story-group').eq(0);
        var feedStory = $('<div>', {'class' : 'feed-story'});
        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        feedStory.prepend(info);
        infoTop.prepend(feedStory);

        $.when($this.getTrackedTime())
            .then(function () {
                $this.updateTopMessage();
            });

        this.infoInsertingInProgress = false;
    };

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    };

    this.bindEvents(this);
}
Sidebar.marginSelector = "#whole_page_container";
Sidebar.appendSelector = "body";

AsanaTimer.prototype = new TimerBase();
timer = new AsanaTimer();