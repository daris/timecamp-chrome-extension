function TeamworkTimer() {

    Messages.set('synchronizing', 'SYNCING');
    Messages.set('buttonTimerStopTrackingAnotherTask', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStarted', 'BUTTON_TIMER_STARTED_SHORT');
    this.infoInsertingInProgress = false;
    var $this = this;
    $this.isWatching = $this.canWatch.DOM;

    this.currentTaskId = function () {
        var url = document.URL;

        var MatchRes = /tasks\/([0-9]+)/g.exec(url);
        if (MatchRes)
            return "task_"+ MatchRes[1];
    };

    this.getParentId = function() {
        var url = document.URL;
        var reg = /teamwork\.com\/projects\/([0-9]+)/g;
        var MatchRes = reg.exec(url);

        if (MatchRes)
            return "project_"+MatchRes[1];

        reg = /teamwork\.com\/tasklists\/([0-9]+)/g;
        MatchRes = reg.exec(url);
        if (MatchRes)
            return "list_"+MatchRes[1];

        return null;
    };

    this.getSubtasks = function() {
        var subtasks = [];

        var tasksList = $("#TaskListsContent");

        var regStr = "";
        var links = [];

        if (tasksList.length)
        {
            links = tasksList.find(".taskRHSText a.ql");
            regStr = "tasks/([0-9]+)";
        }

        if (links.length)
        {
            $.each(links, function(key, el)
            {
                var reg = new RegExp(regStr,"g");
                var href = $(el).attr("href");

                var matchRes = reg.exec(href);
                if (!matchRes)
                    return;

                var taskId = "task_"+matchRes[1];
                var taskName = $(el).children(".taskName").text();

                var subtask = {
                    taskId: taskId,
                    taskName: taskName
                };
                subtasks.push(subtask);
            });
        }

        return subtasks;
    };

    this.currentTaskName = function () {

        var el = $("#taskName"+$this.currentTaskId());
        if (el.length)
            return el.text();

        return false;
    };

    this.isButtonInserted = function () {
        if (this.buttonInsertionInProgress)
            return true;

        if ($('#timecamp-track-button').length > 0)
            return true;

        return $('#Task').find('.titlecontent ul.options').length == 0;
    };

    this.insertButtonIntoPage = function () {
        this.buttonInsertionInProgress = true;
        console.log('Inserting button into page...');
        var currentTaskId = $this.currentTaskId();

        var parent = $('#Task').find('.titlecontent ul.options');

        var buttonObj;
        if (ButtonList[currentTaskId])
            buttonObj = ButtonList[currentTaskId];
        else
        {
            buttonObj = new TimerButton(currentTaskId);
            ButtonList[currentTaskId] = buttonObj;
        }
        buttonObj.insertInProgress = true;
        buttonObj.taskName = $this.currentTaskName();
        console.log('buttonObj.taskName', buttonObj.taskName);

        var li = $('<li/>');
        var button = $('<button/>', { class:'btn btn-default', 'id': 'timecamp-track-button', 'data-taskId': currentTaskId });
        this.button = button;
        buttonObj.uiElement = button;

        li.append(button);
        parent.prepend(li);
        button.append($('<img id="tc-logo" src="' + chrome.extension.getURL('images/icon-14.png') + '"/>'));
        button.append($('<span/>', { 'class': 'text' }).text(Messages.synchronizing));
        button.append($('<span/>', { 'class': 'time' }).text("00:00").hide());

        buttonObj.insertInProgress = false;

        $.when(this.updateButtonState()).always(function () {
            $this.buttonInsertionInProgress = false;
        });

    };

    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            if (!this.trackedTaskId)
                return;
            var id = "#taskRHS"+this.trackedTaskId;
            var badges = $(id).find('.taskIcons');
            if (badges.find("#tc-badge").length == 0) {
                var badge = $("#tc-badge");

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $('<img/>',
                        {
                            id:         "tc-badge",
                            "class":    "badge",
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
        return true;
    };

    this.insertInfoIntoPage = function () {
    };

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    };

    this.onTrackingDisabled = function() {
        var button = ButtonList[$this.currentTaskId()];
        if (!button || button.denied)
            return;

        var notice = $('<div/>', {'class': 'teamwork-settings-notice',
            'html':'Current settings of the integration in TimeCamp don\'t allow time tracking for this tasks. <a href="https://www.timecamp.com/addons/teamwork/index/'+this.lastParentId+'" target="_blank">Synchronize this project</a> to start tracking time.'});

        button.denied = true;
        button.uiElement.children().css({'opacity': '0.6'});
        $("#tc-logo").css({'-webkit-filter':'saturate(0%)'});
        $('#TaskContent').find('.taskList').before(notice);
    };

    this.getTrackableId = function() {
        var overview = $('#tab_overview');
        if (!overview.length)
            return null;

        var link = overview.children('a:first').attr('href');
        if (link == '' || link === undefined)
            return null;
        if (link == this.lastData)
            return this.lastTrackableId;

        var id = /projects\/([0-9]+)+-.*\/overview/.exec(link);

        if (id.length < 2)
            return null;

        this.lastData = link;
        this.lastTrackableId = id[1];
        return id[1];
    };

    this.bindEvents(this);
}

$(document).on('scroll', function () {setTimeout(function () {
    var sd = $(".sidebarHolder");
    if (sd.css('position') == 'fixed')
        sd.css('margin-left','50px');
    else
        sd.css('margin-left','0');
})});

$(document).ready(function () {
    TeamworkTimer.prototype = new TimerBase();
    timer = new TeamworkTimer();
});

Sidebar.cssUpdate = [
    {
        selector: "body",
        property: "margin-left",
        value   : "50px"
    },
    {
        selector: "sidebarHolder",
        property: "left",
        value   : "50px"
    }
];
Sidebar.clickBindSelector = ["body"];
Sidebar.appendSelector = "body";

Service = "teamwork";