
/**
 * Created by mdybizbanski on 22.09.15.
 */
function Sidebar()
{
    this.marginSelector = null;
    this.appendSelector = null;
    this.sidebar = $('<div class="tc-sidebar">');
    this.barChartSelector = '#tcBarChart';
    this.chartEntries = [];
    this.isReady = false;
    this.isCollapsed = true;
    this.templates = {
        "sidebarButton" :"sidebar_button",
        "sidebarMain"   :"sidebar_main",
        "sidebarDayHeader"  :"sidebar_day_header",
        "sidebarTotalTime"  :"sidebar_total_time",
        "sidebarEntry"      :"sidebar_entry",
        "sidebarMultiEntry" :"sidebar_multi_entry",
        "sidebarPlaceholder":"sidebar_placeholder"
    };

    this.templateData = {};
    this.templateData.sidebarButton = {};
    this.templateData.sidebarButton.isSingle = true;
    this.templateData.sidebarButton.taskName = false;
    this.templateData.sidebarButton.isRunning = false;
    this.templateData.sidebarButton.taskId = false;
    this.templateData.sidebarButton.hasRecent = false;
    this.templateData.sidebarButton.recent = [];

    $this = this;

    var watchTimerId = null;
    var hoverTimerId = null;
    var mouseoutTimerId = null;
    var barChart;
    var recentList = [];

    function pushRecentTask(taskId, taskName)
    {
        var found = false;
        for (i in recentList)
        {
            var entry = recentList[i];
            if (entry.taskId = taskId)
            {
                recentList.splice(0, 0, recentList.splice(i, 1)[0]);
                found = true;
                break;
            }
        }

        if (!found)
            recentList.push({taskId: taskId, taskName: taskName});

        recentList.slice(0, 4);

        $this.templateData.sidebarButton.hasRecent = true;
        $this.templateData.sidebarButton.recent = recentList;

        chrome.storage.sync.set({recentTasks: recentList});
    }

    function clearEntriesBox() {
        $('.tc-sidebar-time-details').html('');
        $('.tc-sidebar-total-time').remove();
    }

    this.bindInternalEvents = function()
    {
        $($this.marginSelector).on('click', $this.collapse);
        //$this.sidebar.on('mouseleave', $this.onMouseOut);
        $this.sidebar.on('click',       $this.onSidebarClick);
        $this.sidebar.on('mouseenter',  $this.onHover);
        $this.sidebar.on('blur',        '.note-input',              $this.onEntryLeave);
        $this.sidebar.on('click',       '.tc-sidebar-entry',        $this.onEntryClick);
        $this.sidebar.on('click',       '.tc-sidebar-start-button', $this.onButtonClick);
        $this.sidebar.on('click',       '.billable-checkbox',       $this.onBillableClick);
        $this.sidebar.on('click',       '.tc-subtask-picker-entry', $this.onTaskSelected);
        $this.sidebar.on('click',       '.note-placeholder a',      function(e) { e.stopPropagation(); });
        $this.sidebar.on('click',       '.tc-subtask-picker-list-header',      function(e) { e.stopPropagation(); });
    };

    this.onButtonClick = function() {
        console.log('here');
        console.log('$this.templateData', $this.templateData);
        if (!$this.templateData.sidebarButton.isSingle)
        {
            $this.sidebar.find('.tc-subtask-picker').toggle();
        }
    };

    this.onTaskSelected = function() {
        var DOMObj = $(this);
        var taskId = DOMObj.attr('data-taskId');
        var taskName = DOMObj.text();

        var args = {
            externalTaskId: taskId,
            taskName: taskName
        };

        pushRecentTask(taskId, taskName);

        $(document).trigger('tcTaskChangeDetected', args);
    };

    this.onBillableClick = function(e) {
        e.stopPropagation();

        var DOMObj = $(this).parents('.tc-sidebar-entry');
        var entry = DOMObj.data('entry');
        var entryDiff = {billable: value};

        $.extend(entry, entryDiff);

        ApiService.Entries.put({id: entry.id, billable: value});
        var eventData = {
            refType: "entry",
            refId: entry.id,
            parentType: "task",
            parentId: $this.templateData.sidebarButton.taskId,
            data: entryDiff,
            source: "sidebar"
        };

        $(document).trigger('tcDatasetChange', eventData);
    };

    function expandEntry(DOMObj)
    {
        DOMObj.addClass('active');
        DOMObj.find('.note-placeholder').hide();
        DOMObj.find('.note-input-box').show();
    }

    function collapseEntry(DOMObj, placeholder)
    {
        console.log('placeholder', placeholder);
        if (placeholder)
            DOMObj.find('.note-placeholder').html(placeholder);

        DOMObj.find('.note-placeholder').show();
        DOMObj.find('.note-input-box').hide();
        DOMObj.removeClass('active');
    }

    this.onEntryClick = function(e)
    {
        var DOMObj = $(this);
        expandEntry(DOMObj);
        e.stopPropagation();
    };

    this.onEntryLeave = function(e) {
        var DOMObj = $(this).parents('.tc-sidebar-entry');
        var entry = DOMObj.data('entry');

        var note = $(this).val();
        var linkify = note.linkify();
        collapseEntry(DOMObj, linkify);

        if (note == entry.description)
            return;

        var entryDiff = {
            description: note,
            description_formatted: linkify
        };

        $.extend(entry, entryDiff);

        ApiService.Entries.put({id: entry.id, description: note});

        var eventData = {
            refType: "entry",
            refId: entry.id,
            parentId: $this.templateData.sidebarButton.taskId,
            data: entryDiff,
            source: "sidebar"
        };

        $(document).trigger('tcDatasetChange', eventData);
        e.stopPropagation();
    };

    this.watch = function()
    {
        if (!$this.marginSelector || !$this.appendSelector)
            return null;

        var marginObj = $($this.marginSelector);
        var appendObj = $($this.appendSelector);

        if (marginObj.length == 0)
            return null;

        if (appendObj.length == 0)
            return null;

        $this.sidebar = ich.sidebarMain($this.templateData);
        $this.bindInternalEvents();

        marginObj.css('margin-left', '50px');
        appendObj.prepend($this.sidebar);

        clearInterval(watchTimerId);
        watchTimerId = null;
    };

    this.renderSidebarButton =  function() {
        $('.tc-sidebar-button-box').html(ich.sidebarButton($this.templateData.sidebarButton));
    };

    this.bindEvents = function()
    {
        $(document).on('tcTimerStarted', $this.onTimerStarted);
        $(document).on('tcTimerStopped', $this.onTimerStopped);
        $(document).on('tcTimerTick', $this.onTimerTick);
        $(document).on('tcTaskChangeDetected', $this.onTaskChange);
        $(document).on('tcParentChangeDetected', $this.onParentChange);
        $(document).on('tcEntriesLoaded', $this.onEntriesLoaded);
    };

    this.onTimerTick = function(event, eventData) {
        var taskId = eventData.taskId;
        var entryId = eventData.entryId;
        var elapsed = eventData.elapsed;

        if (taskId != $this.templateData.sidebarButton.taskId)
            return;

        var entryElement = $this.sidebar.find('[data-entryid="'+entryId+'"]');

        if (!entryElement.length)
            return;

        var entry = entryElement.data('entry');

        console.log('entryElement', entryElement);
        console.log('entry', entry);

        var newDuration = parseInt(entry.duration,10) + elapsed;
        console.log('entry.duration+', newDuration);

        entryElement.find('.duration').html(formatHMS(newDuration));

        var totalTimeObj = $('.tc-sidebar-total-time');

        console.log('totalTimeObj', totalTimeObj);
        if (!totalTimeObj.length)
            return;

        var totalTimeVal = parseInt(totalTimeObj.data('totalTime'), 10);
        $this.renderTotalTime(totalTimeVal, elapsed, taskId);

        var tmpEntries = JSON.parse(JSON.stringify($this.chartEntries));
        for (var i in tmpEntries)
        {
            if (tmpEntries[i].id == entryId)
            {
                tmpEntries[i].duration = parseInt(tmpEntries[i].duration, 10) + elapsed;
                break;
            }
        }

        console.log('tmpEntries', tmpEntries);
        console.log('$this.chartEntries', $this.chartEntries);
        renderBarChart(tmpEntries);
    };

    this.renderEntriesDay = function(entries, date, isFirst) {
        var params = {
            date: moment(date,'YYYY-MM-DD').format("DD MMM"),
            rawDate: date,
            isFirst: isFirst
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        sidebarTimeDetails.append(ich.sidebarDayHeader(params));

        for (i in entries)
        {
            var entry = entries[i];
            var render = ich.sidebarEntry(entry);
            render.data('entry', entry);
            sidebarTimeDetails.append(render);
        }
    };

    this.renderMultiEntriesDay = function(entries, date) {
        var params = {
            date: moment(date,'YYYY-MM-DD').format("DD MMM"),
            rawDate: date,
            isFirst: false
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        sidebarTimeDetails.append(ich.sidebarDayHeader(params));

        for (i in entries)
        {
            var entry = entries[i];
            var render = ich.sidebarMultiEntry(entry);
            render.data('entry', entry);
            sidebarTimeDetails.append(render);
        }
    };

    this.renderTotalTime = function(totalTime, elapsed, taskId) {
        $('.tc-sidebar-total-time').remove();
        var sidebarFooter = $('.tc-sidebar-footer');

        var params = {
            totalTime   : formatHMS(totalTime + elapsed),
            taskId      : taskId
        };

        var DOMObj = ich.sidebarTotalTime(params);
        DOMObj.data('totalTime', totalTime);
        sidebarFooter.before(DOMObj);
    };

    function renderBarChart(entries)
    {
        var chartParams = prepareBarChartData(entries);
        var ctx = $($this.barChartSelector).get(0).getContext("2d");
        barChart = new Chart(ctx).Bar(chartParams.data, chartParams.options);
    }

    function renderPieChart(entries)
    {
        var tasks = [];
        var maxVal = 0;

        for (i in entries)
        {
            var entry = entries[i];
            var taskId = entry.task_id;
            var idx = -1;

            for (j in tasks)
            {
                if (tasks[j].task_id == taskId)
                {
                    idx = j;
                    break;
                }
            }

            if (idx == -1)
            {
                row = {
                    name: entry.name,
                    duration: parseInt(entry.duration, 10),
                    task_id: taskId
                };
                if (maxVal < row.duration)
                    maxVal = row.duration;

                tasks.push(row);
            }
            else
            {
                tasks[idx].duration += parseInt(entry.duration, 10);
                if (maxVal < row.duration)
                    maxVal = row.duration;
            }
        }

        var dataset = [];
        var timeUnit = "s";
        var timeDivider = 1;

        if (maxVal > 7200)
        {
            timeDivider = 3600;
            timeUnit = 'h';
        }
        else if (maxVal > 60)
        {
            timeDivider = 60;
            timeUnit = 'min';
        }

        console.log('tasks', tasks);

        for (var i in tasks)
        {
            console.log('i', i);
            var subRange = tasks[i];
            var value = Math.floor(subRange.duration * 100 / timeDivider) / 100;
            var highlightColor = colorLuminance(getColor(i), 0.2);

            dataset.push({
                value: value,
                color: getColor(i),
                highlight: highlightColor,
                label: subRange.name
            });
        }

        var options = {
            tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= value %>" + timeUnit
        };

        var ctx = $($this.barChartSelector).get(0).getContext("2d");
        pieChart = new Chart(ctx).Pie(dataset, options);
    }

    function processSingleTask(entries, params)
    {
        var entriesByDays = {};
        var totalTime = 0;
        $this.chartEntries = entries;
        console.log('entries', entries);
        renderBarChart($this.chartEntries);
        for (i in entries)
        {
            var entry = entries[i];

            entry.description_formatted = entry.description.linkify();
            entry.isBillable = entry.billable == 1;
            entry.start_time_formatted = entry.start_time.substr(0, 5);
            entry.end_time_formatted = entry.end_time.substr(0, 5);

            var duration = moment.duration(parseInt(entry.duration, 10), 'seconds');
            entry.duration_formatted = duration.hours() + ":" + zeroFill(duration.minutes(), 2) + ":" +
                                       zeroFill(duration.seconds(), 2);
            entry.isBillable = entry.billable == 1;
            if (!entriesByDays[entry['date']])
                entriesByDays[entry['date']] = [];

            entriesByDays[entry['date']].push(entry);
            totalTime += parseInt(entry['duration'], 10);
        }

        var first = true;
        var days = Object.keys(entriesByDays).reverse();
        for (i in days)
        {
            var day = days[i];

            entriesByDays[day].sort(function (a, b)
            {
                if (a.start_time > b.start_time) return -1;
                return 1;
            });
            $this.renderEntriesDay(entriesByDays[day], day, first);
            first = false;
        }
        console.log('params', params);
        $this.renderTotalTime(totalTime, 0, params.external_task_id);
    }

    function processMultiTask(entries, params)
    {
        var row;
        var entriesByDays = {};
        var totalTime = 0;
        $this.chartEntries = entries;
        console.log('entries', entries);
        renderPieChart($this.chartEntries);
        for (i in entries)
        {
            var entry = entries[i];
            var date = entry.date;
            var taskId = entry.taskId;
            var idx = -1;

            if (!entriesByDays[date])
                entriesByDays[date] = [];

            for (j in entriesByDays[date])
            {
                if (entriesByDays[date].taskId == taskId)
                {
                    idx = j;
                    break;
                }
            }

            if (idx == -1)
            {
                row = {
                    name: entry.name,
                    duration: parseInt(entry.duration, 10),
                    taskId: taskId
                };
                row.duration_formatted = formatHMS(row.duration);

                entriesByDays[date].push(row);
            }
            else
            {
                entriesByDays[date][idx].duration += parseInt(entry.duration, 10);
                entriesByDays[date][idx].duration_formatted = formatHMS(entriesByDays[date][idx].duration);
            }
            totalTime += parseInt(entry['duration'], 10);
        }

        var days = Object.keys(entriesByDays).reverse();
        for (i in days)
        {
            var day = days[i];
            entriesByDays[day].sort(function (a, b)
            {
                if (a.duration > b.duration) return -1;
                return 1;
            });
            $this.renderMultiEntriesDay(entriesByDays[day], day);
        }
        $this.renderTotalTime(totalTime, 0, params.external_task_id);
    }

    this.onEntriesLoaded = function(event, eventData) {
        console.log('event', event);
        console.log('eventData', eventData);

        var params = eventData.params;
        var entries = eventData.data;


        if (!$this.sidebar)
            return;

        if (barChart)
            barChart.destroy();

        clearEntriesBox();

        if (entries.length == 0)
        {
            $('.tc-sidebar-time-details').append(ich.sidebarPlaceholder());
            return;
        }

        if (!params.with_subtasks)
            processSingleTask(entries, params);
        else
            processMultiTask(entries, params);
    };

    this.onMouseOut = function ()
    {
        mouseoutTimerId = setTimeout($this.collapse, 400);
        clearTimeout(hoverTimerId);
        hoverTimerId = null;
    };

    this.onHover = function ()
    {
        hoverTimerId = setTimeout($this.onSidebarClick, 300);
        clearTimeout(mouseoutTimerId);
        mouseoutTimerId = null;
    };

    this.onTaskChange = function(event, args)
    {
        if ($this.templateData.sidebarButton.isRunning)
            return;

        $this.templateData.sidebarButton.isSingle = true;
        if (args['taskName'])
            $this.templateData.sidebarButton.taskName = args['taskName'];
        else
            $this.templateData.sidebarButton.taskName = false;

        if (args['externalTaskId'])
            $this.templateData.sidebarButton.taskId = args['externalTaskId'];
        else
            $this.templateData.sidebarButton.taskId = false;

        $this.renderSidebarButton();
    };

    this.onParentChange = function(event, args)
    {
        if ($this.templateData.sidebarButton.isRunning)
            return;

        $this.templateData.sidebarButton.isSingle = false;
        if (args['subtasks'])
            $this.templateData.sidebarButton.subtasks = args['subtasks'];
        else
            $this.templateData.sidebarButton.subtasks = [];
        $this.templateData.sidebarButton.hasSubtasks = $this.templateData.sidebarButton.subtasks.length > 0;

        $this.templateData.sidebarButton.taskId = event['externalParentId'];
        $this.templateData.sidebarButton.taskName = "Select task";

        console.log('$this.templateData', $this.templateData);
        $this.renderSidebarButton();
    };

    this.onTimerStarted = function(event, eventData)
    {
        console.log('event', event);
        console.log('eventData', eventData);

        var taskName = eventData['taskName'];
        var taskId = eventData['taskId'];

        $this.templateData.sidebarButton.taskName = taskName;
        $this.templateData.sidebarButton.taskId = taskId;
        $this.templateData.sidebarButton.isRunning = true;

        pushRecentTask(taskId, taskName);

        $this.renderSidebarButton();
    };

    this.onTimerStopped = function (event, eventData)
    {
        var taskName = eventData['taskName'];
        var taskId = eventData['taskId'];

        $this.templateData.sidebarButton.isRunning = false;
        $this.templateData.sidebarButton.taskName = taskName;
        $this.templateData.sidebarButton.taskId = taskId;

        $this.renderSidebarButton();
    };

    this.onSidebarClick = function()
    {
        var entryObj = $this.sidebar.find('.tc-sidebar-entry.active');
        if (entryObj.length)
            collapseEntry(entryObj);

        if (!$this.isCollapsed)
            return;

        $this.sidebar.removeClass('collapsed').addClass('expanded');
        $this.isCollapsed = false;
    };

    this.collapse = function()
    {
        if ($this.isCollapsed)
            return;

        $this.sidebar.scrollTop(0).removeClass('expanded').addClass('collapsed');
        $this.isCollapsed = true;
    };

    this.loadTemplates = function() {
        $.each($this.templates, function (name, url) {
            $.get(chrome.extension.getURL("templates/"+url+".html"), function (data) {
                ich.addTemplate(name,data);
            });
        });
    };

    function prepareBarChartData(entries) {
        var startDate = entries[0].date + " " + entries[0].start_time;
        var today = moment();

        var range = moment.range(startDate, today);
        var subRanges = [];

        var unit = "day";

        if(range.diff('days') == 0)
            unit = 'hour';
        else if (range.diff('days') <= 6)
            unit = 'day';
        else if (range.diff('week') <= 5)
            unit = 'week';
        else if (range.diff('months') <= 12)
            unit = 'month';
        else
            unit = 'year';

        range.by(unit+'s', function(m) {
            var unitTmp = unit;
            var startOf = moment(m).startOf(unitTmp);
            var endOf = moment(m).endOf(unitTmp);
            if (unit == 'week')
            {
                startOf.add(1, 'days');
                endOf.add(1, 'days');
            }
            var range = formatRange(unitTmp,startOf, endOf);
            subRanges.push(range);
        });

        if (!subRanges[subRanges.length-1].range.contains(today))
        {
            if (unit == 'week')
                unit = 'isoweek';
            subRanges.push(formatRange(unit,moment().startOf(unit), moment().endOf(unit)));
        }

        //if (unit == 'hour')
        //{
        //    var newEntries = [];
        //    for(var i in entries)
        //    {
        //        var datetime = entries[i].date + " " + entries[i].start_time;
        //        var m = moment(datetime, 'YYYY-MM-DD HH:mm:ss');
        //
        //        var hourEnd = moment(m).endOf('hour');
        //        var diff = m.diff(hourEnd, 'second');
        //        var durationLeft = parseInt(entries[i].duration, 10);
        //
        //
        //        if (diff < durationLeft)
        //        {
        //
        //        }
        //    }
        //}

        var maxTotalTime = 0;
        for(var i in entries)
        {
            var entry = entries[i];
            var datetime = entries[i].date + " " + entries[i].start_time;
            var m = moment(datetime, 'YYYY-MM-DD HH:mm:ss');

            for (var j in subRanges)
            {
                var subRange = subRanges[j];

                if (subRange.range.contains(m))
                {
                    subRange.totalTime += parseInt(entry.duration, 10);
                    if (subRange.totalTime > maxTotalTime)
                        maxTotalTime = subRange.totalTime;
                    break;
                }
            }
        }

        var labels = [];
        var datasetData = [];

        var timeUnit = "s";
        var timeDivider = 1;
        if (maxTotalTime > 7200)
        {
            timeDivider = 3600;
            timeUnit = 'h';
        }
        else if (maxTotalTime > 60)
        {
            timeDivider = 60;
            timeUnit = 'min';
        }

        for (var i in subRanges)
        {
            var subRange = subRanges[i];
            var value = Math.floor(subRange.totalTime * 100 / timeDivider)/100;
            datasetData.push(value);
            labels.push(subRange.label);
        }

        return {
            data: {
                labels: labels,
                datasets: [
                    {
                        fillColor: "rgba(220,220,220,0.5)",
                        strokeColor: "rgba(220,220,220,0.8)",
                        highlightFill: "rgba(220,220,220,0.75)",
                        highlightStroke: "rgba(220,220,220,1)",
                        data: datasetData
                    }
                ]
            },
            options: {
                tooltipTemplate: "<%if (label){%><%=label%>: <%}%><%= value %>" + timeUnit,
                scaleLabel: "<%= value %>" + timeUnit
            }
        };
    }

    function formatRange(unit, startOf, endOf) {
        var label = null;
        switch(unit) {
            case 'hour' : label = startOf.format('HH:00'); break;
            case 'day' : label = startOf.format('ddd'); break;
            case 'isoweek' :
            case 'week' :
                if (startOf.month() != endOf.month())
                    label = startOf.format('DD MMM') + '/' + endOf.format('DD MMM');
                else
                    label = startOf.format('DD') + '/' + endOf.format('DD MMM');
                break;
            case 'month' : label = startOf.format('MMM'); break;
            case 'year' : label = startOf.format('YYYY'); break;
        }
        var range = moment.range(startOf,endOf);
        return {
            label: label,
            range: range,
            totalTime: 0
        };
    }

    watchTimerId = setInterval($this.watch, 100);
    this.loadTemplates();
    this.bindEvents();
    chrome.storage.sync.get('recentTasks', function (items) {
        var recent = items['recentTasks'];
        console.log('recent', recent);
        if (!recent)
            return;
        $this.templateData.sidebarButton.recent = recent;
        $this.templateData.sidebarButton.hasRecent = recent.length;
    });

    Chart.defaults.global.animation = false;
    Chart.defaults.global.maintainAspectRatio = true;
}