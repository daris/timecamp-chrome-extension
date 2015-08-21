/**
 * Created by m.dybizbanski on 22.11.13.
 */
function PivotalTrackerTimer() {
    this.service = 'pivotaltracker';
    this.multiButton = true;
    this.messages.set('buttonTimerStopped', 'BUTTON_TIMER_STOPPED');
    this.messages.set('buttonTimerStarted', 'EMPTY_MESSAGE');
    this.messages.set('synchronizing', 'SYNCING');
    this.messages.set('buttonTimerStopping', 'BUTTON_TIMER_STOPPING_SHORT');
    this.messages.set('buttonTimerStopTrackingAnotherTask', 'BUTTON_TIMER_STOPPED');
    var $this = this;

    this.currentTaskId = function () {
        var $html = $('html');

        if ($html.is('.tasks'))
        {
            var MatchRes = document.URL.match(/\/tasks\/([0-9]*)/);
            if (MatchRes)
                return MatchRes[1];
        }

        if ($html.is('.items'))
        {
            var id = $('#wrapper').data('context-id');
            return 'i' + id;
        }

        var parent = $(".preview-panel").find('.item-container');
        if (parent.length > 0)
        {
            return 'i' + parent.data('item-id');
        }

        var share = $('.share');
        if (share.length > 0)
        {
            if (!share.data('id'))
                return null;

            return  'i'+ share.data('id');
        }
        return null;
    };

    this.getAvailableButtons = function()
    {
        var res = [];
        var parents = $('.current .story');
        parents.each(function (i, item) {
            var arr = $(item).attr('class').split(' ');
            for (var j in arr)
            {
                var cl = arr[j];
                if (cl.substring(0, 6) == 'story_')
                {
                    var storyId = cl.replace('story_','');
                    res.push({taskId: storyId, parentElement: item});
                }
            }
        });
        parents.each(function (i, item) {
            var arr = $(item).attr('class').split(' ');
            for (var j in arr)
            {
                var cl = arr[j];
                if (cl.substring(0, 6) == 'story_')
                {
                    var storyId = cl.replace('story_','');
                    var details = $(item).find('.edit.details');
                    if (details.length)
                    {
                        var box = details.find('.info_box .info');
                        if (box.length)
                            res.push({taskId: storyId, parentElement: box});
                    }
                    else
                        res.push({taskId: storyId, parentElement: item});
                }
            }
        });
        console.log('res', res);
        return res;
    };

    this.isButtonInserted = function (taskId)
    {
        var button = timer.buttons[taskId];
        if (!button)
            return false;

        return button.isInserted();
    };

    this.isInfoInserted = function () {
        if (this.infoInsertingInProgress)
            return true;

        if ($('#timecamp-track-info').length > 0)
            return true;

        if ($('ul.app-fields-list').length == 0  && $('.task-body.fields').length == 0)
            return true;
    };

    this.insertInfoIntoPage = function () {
        var taskId = $this.currentTaskId();
        if (!taskId)
            return;

        this.infoInsertingInProgress = true;
        console.log('Inserting info...');

        var addDiv = false;
        var infoTop = $('ul.app-fields-list');
        if (infoTop.length == 0)
        {
            infoTop = $('.task-body.fields').eq(0);
            addDiv = true;
        }


        var info;
        if (addDiv)
        {
            info = $('<div/>', { 'class': 'field text', 'id': 'timecamp-container'});
            info.append($('<div/>', { 'class': 'label', 'text':'TimeCamp' }));

            var wrapper = $('<div/>', { 'class': 'value'});
            wrapper.append($('<div/>', { 'id': 'timecamp-track-info', 'text' : 'No data yet', style:'float: left; margin-left: 10px;' }));

            info.append(wrapper);
        }
        else
        {
            info = $('<li/>', { 'class': 'field text', 'id': 'timecamp-container' });
            var frameWrapper = $('<div/>', { 'class': 'frame-wrapper'});
            var frameLabel = $('<div/>', { 'class': 'frame-label'});
            var frameContent = $('<div/>', { 'class': 'frame-content'});
            var labelContentWrapper = $('<div/>', { 'class': 'label-content-wrapper'});
            var labelContent = $('<div/>', { 'class': 'label-content', text: 'TimeCamp'});
            labelContentWrapper.append(labelContent);
            frameLabel.append(labelContentWrapper);
            frameContent.append($('<div/>', { 'class': 'value', 'id': 'timecamp-track-info', 'text' : 'No data yet', 'style':'margin-left: 10px; float: left;' }));
            frameWrapper.append(frameLabel);
            frameWrapper.append(frameContent);
            info.append(frameWrapper);
        }

        infoTop.prepend(info);
        this.infoInsertingInProgress = false;
    };

    this.insertButtonIntoPage = function (task) {
        if (!task)
            return;

        var taskId = task.taskId;
        var parentElement = task.parentElement;

        if (this.buttons.hasOwnProperty(taskId))
        {
            var tmp = this.buttons[taskId];
            if (tmp.insertInProgress)
                return;
        }

        console.log('parentElement', parentElement);

        var buttonObj = new TimerButton(taskId);
        buttonObj.insertInProgress = true;
        this.buttons[taskId] = buttonObj;

        console.log('Inserting button into page...', taskId);
        var button = $('<label/>', { 'class': 'tc-button', 'id': 'timecamp-track-button-'+taskId, style:''});
        this.button = button;
        button.append($('<span/>', { 'class': 'text'}).text(this.messages.synchronizing));
        button.append($('<span/>', { 'class': 'time'}).text("00:00").css({ padding: "0px 2px 2px"}).hide());

        button.click(function () {
            $this.buttonClick(taskId);
        });

        if ($(parentElement).is('.info'))
        {
            var row = $('<div/>', {"class": 'timecamp row'});
            row.append($('<em/>', {"text": 'TimeCamp'}));
            row.append(button);
            $(parentElement).prepend(row);
        }
        else
        {
            $(parentElement).find('span.state').append(button);
        }

        buttonObj.uiElement = button;
        buttonObj.insertInProgress = false;
        this.updateButtonState();
    };

    this.bindEvents(this);
}
PivotalTrackerTimer.prototype = new TimerBase();
timer = new PivotalTrackerTimer();
