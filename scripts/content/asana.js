console.debug = console.debug || function (txt, obj) { };
function AsanaTimer() {

    this.service = 'asana';
    console.debug(this.messages.synchronizing);
    this.messages.set('synchronizing', 'SYNCING');
    this.messages.set('buttonTimerStopTrackingAnotherTask', 'BUTTON_TIMER_STOPPED_SHORT');
    this.messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED_SHORT');
    this.messages.set('buttonTimerStarted', '');
    console.debug(this.messages.synchronizing);
    this.infoInsertingInProgress = false;
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
    }

    this.isButtonInserted = function () {
        return !(!this.buttonInsertionInProgress && $('#timecamp-track-button').length == 0 && $('#right_pane').length > 0);
    }

    this.insertButtonIntoPage = function () {
        console.debug('Inserting button into page...');

        var dueDate = $(".property.due_date.flyout-owner").eq(0);
        if (dueDate.css('margin-right') == '7px')
            dueDate.css('margin-right','0px');

        this.buttonInsertionInProgress = true;
        var div1 = $('<div/>', { 'class': 'loading-boundary hidden'});
        var div2 = $('<div/>', { 'class': 'redesign-timecamp-container'});
        var div3 = $('<div/>', { 'class': 'property tc flyout-owner'});
        var div4 = $('<div/>', { 'class': 'property-name', 'id':'lunaTC' });
        var button = $('<span/>', { 'id': 'timecamp-track-button', 'status': 'unknown', 'style':'position:relative' });

        this.button = button;
        div1.append(div2);
        div2.append(div3);
        div3.append(div4);
        div4.append(button);
        button.append($('<img src="' + chrome.extension.getURL('images/icon-14.png') + '" style="position: absolute; margin-left:10px; margin-top:-8px; top: 50%;"/>'));
        button.append($('<span/>', { 'class': 'text', 'style': 'display: inline-block; padding-left: 30px; padding-right:10px;' }).text(this.messages.synchronizing));
        button.append($('<span/>', { 'class': 'time' }).text("00:00").css({
            "font-size": "12px",
            padding: "0px 2px",
            "border-radius": "3px",
            "background-color": "green",
            color: "white",
            'margin-right': '5px',
            'margin-left': '-8px',
            'text-shadow': 'none'
        }).hide());

        $.when(this.updateFreshButton()).always(function () {
                $this.buttonInsertionInProgress = false;
        });
        div1.click(function () {
            $this.buttonClick(null, function () { $this.button.children('.time').hide() });
        });
        var buttonList = $('#right_pane').find('.toolbar-section.left').children().eq(1);
        div1.insertAfter(buttonList);

        //#center_pane__contents
        //grid-row-selected

    }
    this.onSyncSuccess = function (response) {
        if (this.isTimerRunning) {
            this.trackedTaskId = response.external_task_id;
            var badges = $("#center_pane").find("textarea[id$='"+ this.trackedTaskId +"']").siblings('div')
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
                            title:      this.messages.badgeTimerRunning
                        });
                badges.prepend(badge);
            }
        }
        else
        {
            this.onSyncFailure();
        }
    }

    this.updateTopMessage = function (startDate) {
        if (startDate) {
            var duration = moment().from(startDate, true);
            $('#timecamp-track-info').html('<b>You</b> spent ' + duration + ' doing this task');
        }
        else
        {
            $('#timecamp-track-info').html('');
        }
    }

    this.isInfoInserted = function () {
        console.log($("#timecamp-track-info").length > 0);
        return this.infoInsertingInProgress || $("#timecamp-track-info").length > 0;
    }

    this.insertInfoIntoPage = function () {
        console.log('inserting info');
        this.infoInsertingInProgress = true;
        var infoTop = $('#right_pane').find('.small-feed-story-group');
        var info = $('<span/>', { 'id': 'timecamp-track-info' });
        infoTop.prepend(info);
        this.infoInsertingInProgress = false;
    }

    this.onSyncFailure = function () {
        var badge = $("#tc-badge");
        if (badge.length > 0)
            badge.remove();
    }

    this.bindEvents(this);
}
AsanaTimer.prototype = new TimerBase();
timer = new AsanaTimer();