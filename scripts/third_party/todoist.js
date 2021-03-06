﻿function TodoistTimer() {

    var $this = this;

	Messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    Messages.set('buttonTimerStarted', 'BUTTON_TIMER_STARTED_SHORT');
    Messages.set('synchronizing', 'SYNCING');
    Messages.set('buttonTimerStopping', 'BUTTON_TIMER_STOPPING_SHORT');


    this.currentTaskId = function () {
        var item = $(".manager").prev();
        if (item.hasClass("task_item")) {
            var itemClassesArr = item.attr("class").split(" ");

            for (var i = 0; i < itemClassesArr.length; i++) {
                if (itemClassesArr[i].indexOf("item_") == 0) {
                    var itemId = itemClassesArr[i].replace("item_", "");

                    if (itemId != "" && itemId != undefined) {
                        return itemId;
                    }
                }
            }
        }

        return null;
    };

    this.getParentId = function() {
        var item = $(".current_editor");

        var parentId = item.attr("data-project-id");

        return parentId;
    };

    this.getSubtasks = function() {
        var subtasks = [];
        return subtasks;
        var links = $(".list-card-title");

        if (links.length)
        {
            $.each(links, function(key, el)
            {
                var reg = new RegExp("/c/([A-Za-z0-9]+)","g");
                var href = $(el).attr("href");

                var matchRes = reg.exec(href);
                if (!matchRes)
                    return;

                var taskId = matchRes[1];
                var taskName = $(el).contents().filter(function(){return this.nodeType == Node.TEXT_NODE})[0].nodeValue;

                var subtask = {
                    taskId: taskId,
                    taskName: taskName,
                    DOMObj: el
                };
                subtasks.push(subtask);
            });
        }

        return subtasks;
    };

    this.currentTaskName = function () {

        var el = $(".sel_richtext_editor").html();
        if (el.length)
            return el;

        return false;
    };



    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            if (!this.trackedTaskId)
                return;
            var badges = $('.list-cards a[href^="/c/' + this.trackedTaskId + '"]').siblings('div.badges');
            if (badges.find("#tc-badge").length == 0) {
                var badge = $("#tc-badge");

                if (badge.length > 0)
                    badge.detach();
                else
                    badge = $('<img/>',
                        {
                            id:         "tc-badge",
                            class:    "badge",
                            src:        chrome.extension.getURL('images/icon-14.png'),
                            title:      Messages.badgeTimerRunning
                        });
                badges.append(badge);
            }
        }
        else
        {
            this.onSyncFailure();
        }
    };

    this.onSyncFailure = function () {
        // var badge = $("#tc-badge");
        // if (badge.length > 0)
        //     badge.remove();
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

    this.isButtonInserted = function () {
        if (this.buttonInsertionInProgress)
            return true;

        if ($('#timecamp-track-button').length > 0)
            return true;

        return $('#timecamp-track-button').length != 0;
    };

    this.isInfoInserted = function () {
        if (this.infoInsertingInProgress)
            return true;

        if ($('#timecamp-track-info').length > 0)
            return true;

        if ($('.window-header-inline-content.js-current-list').length == 0)
            return true;

        return false;
    };

    this.insertInfoIntoPage = function () {
        var taskId = $this.currentTaskId();
        if (!taskId)
            return;
        console.log('Inserting Info into page...');
        this.infoInsertingInProgress = true;

        var infoTop = $('.quiet.hide-on-edit.window-header-inline-content.js-current-list');


        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        infoTop.append(info);
        $this.getTrackedTime();
        this.infoInsertingInProgress = false;
    };

    this.insertButtonIntoPage = function () {
        var currentTaskId = $this.currentTaskId();
        if (!currentTaskId)
            return;
        console.log('Inserting button into page...');

        //var iconsCont = $(".form_icon_holder");
        //iconsCont.prepend($('<a id="timecamp-track-button" data-taskid="' + currentTaskId + '" class="button-link tc-button-cont"><img id="tc-logo" src="' + chrome.extension.getURL('images/icon-16.png') + '" /><span class="time" style="display: none;">00:00</span></a>'));

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

        this.buttonInsertionInProgress = true;
        var button = $('<a/>', { 'class': 'button-link', 'id': 'timecamp-track-button', 'data-taskId': currentTaskId, 'status': 'unknown' });

        buttonObj.uiElement = button;
        this.button = button;
        button.append($('<img id="tc-logo" src="' + chrome.extension.getURL('images/icon-16.png') + '" />'));
        button.append($('<span/>', { 'class': 'text' }).text(Messages.synchronizing));
        button.append($('<span/>', { 'class': 'time' }).text("00:00").hide());

        $.when(this.updateButtonState())
            .always(function () {
                $this.buttonInsertionInProgress = false;
            });

        var iconsCont = $(".form_icon_holder");
        iconsCont.prepend(button);
        buttonObj.insertInProgress = false;
        $(".time").css("color", "white");
    };

    this.onTrackingDisabled = function() {
        var button = ButtonList[$this.currentTaskId()];
        if (!button || button.denied)
            return;

        var link = $('<a/>', {
            class:'quiet-button',
            text:'Integration settings',
            href:'https://www.timecamp.com/addons/todoist/index/'+this.lastParentId,
            title:'Synchronize tasks to start tracking time.',
            target:'_blank'}
        );

        var p = $('<p/>', {class: 'quiet bottom', id:'tc-integration-link'});

        p.append(link);
        button.denied = true;
        button.uiElement.off('click')
            .addClass('disabled')
            .attr('title','Current settings of the integration don\'t allow time tracking for this tasks. Please use link below to review and change the settings of the integration')
            .after(p);

        $("#timecamp-track-info").hide();
        $("#tc-logo").css({'opacity': '0.7', '-webkit-filter':'saturate(0%)'});
    };

    this.bindEvents(this);
}
$(document).ready(function () {
    TodoistTimer.prototype = new TimerBase();
    timer = new TodoistTimer();
});

Sidebar.cssUpdate = [
    {
        selector: "#top_bar",
        property: "padding-left",
        value: "50px"
    },
    {
        selector: "#all_holder",
        property: "padding-left",
        value: "50px"
    }
];
Sidebar.clickBindSelector = ["body"];
Sidebar.appendSelector = "body";

Service = "todoist";