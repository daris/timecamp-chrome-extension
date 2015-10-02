/**
 * Created by mdybizbanski on 22.09.15.
 */
function Sidebar()
{
    this.marginSelector = null;
    this.appendSelector = null;
    this.sidebar = $('<div class="tc-sidebar">');
    this.barChartSelector = '#tcBarChart';
    this.isReady = false;
    this.isCollapsed = true;
    this.templates = {
        "sidebarButton" :"sidebar_button",
        "sidebarMain"   :"sidebar_main",
        "sidebarDayHeader"  :"sidebar_day_header",
        "sidebarTotalTime"  :"sidebar_total_time",
        "sidebarEntry"      :"sidebar_entry"
    };

    this.templateData = {};
    this.templateData.sidebarButton = {};
    this.templateData.sidebarButton.taskName = false;
    this.templateData.sidebarButton.isRunning = false;

    $this = this;

    var watchTimerId = null;
    var hoverTimerId = null;
    var mouseoutTimerId = null;
    var barChart;

    this.bindInternalEvents = function()
    {
        $this.sidebar.on('click', $this.expand);
        $this.sidebar.on('mouseenter', $this.onHover);
        $this.sidebar.on('click', '.tc-sidebar-entry', $this.onEntryClick);
        $this.sidebar.on('blur', '.note-input', $this.onEntryLeave);
        $this.sidebar.on('click', '.tc-sidebar-start-button', $this.onButtonClick);
        //$this.sidebar.on('mouseleave', $this.onMouseOut);
        $($this.marginSelector).on('click', $this.collapse);
    };

    this.onButtonClick = function() {

    };



    this.onEntryClick = function()
    {
        console.log('this', this);
        var parent = $(this).parent();
        console.log('parent', parent);
        $(this).find('.note-placeholder').hide();
        $(this).find('.note-input-box').show();
    };

    $this.onEntryLeave = function() {
        var entryId = $(this).parents('.tc-sidebar-entry').attr('data-entryId');
        var note = $(this).val();
        
        console.log('entryId', entryId);
        console.log('note', note);
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
        $(document).on('tcTaskChangeDetected', $this.onTaskChange);
        $(document).on('tcEntriesLoaded', $this.onEntriesLoaded);
    };

    this.clearEntriesBox = function() {
        $('.tc-sidebar-time-details').html('');
    };

    this.renderEntriesDay = function(entries, date, isFirst) {
        var params = {
            date : moment(date,'YYYY-MM-DD').format("DD MMM"),
            rawDate: date,
            isFirst: isFirst
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        sidebarTimeDetails.append(ich.sidebarDayHeader(params));

        for (i in entries)
            sidebarTimeDetails.append(ich.sidebarEntry(entries[i]));
    };

    this.renderTotalTime = function(totalTime) {
        var duration = moment.duration(totalTime, 'seconds');
        totalTime = duration.hours()+":"+zeroFill(duration.minutes(), 2)+":"+zeroFill(duration.seconds(), 2);

        var params = {
            totalTime : totalTime
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        sidebarTimeDetails.append(ich.sidebarTotalTime(params));
    };

    this.onEntriesLoaded = function(event, eventData) {
        bench('start');
        var entriesByDays = {};
        var totalByDays = {};

        var params = eventData.params;
        var entries = eventData.data;
        var totalTime = 0;

        if (entries.length == 0)
        {
            $this.clearEntriesBox();
            return;
        }
        bench('data');
        console.log('entries', entries);

        if (barChart)
            barChart.destroy();
        var chartData = prepareChartData(entries);
        var ctx = $this.sidebar.find($this.barChartSelector).get(0).getContext("2d");
        console.log('chartData', chartData);
        barChart = new Chart(ctx).Bar(chartData);

        for (i in entries)
        {
            var entry = entries[i];


            entry.description_formatted = entry.description.linkify();
            entry.isBillable = entry.billable == 1;
            entry.start_time_formatted = entry.start_time.substr(0,5);
            entry.end_time_formatted = entry.end_time.substr(0,5);

            var duration = moment.duration(parseInt(entry.duration, 10), 'seconds');
            entry.duration_formatted = duration.hours()+":"+zeroFill(duration.minutes(), 2)+":"+zeroFill(duration.seconds(), 2);
            entry.isBillable = entry.billable == 1;
            if (!entriesByDays[entry['date']])
                entriesByDays[entry['date']] = [];

            console.log('entry', entry);
            entriesByDays[entry['date']].push(entry);
            totalTime += parseInt(entry['duration'], 10);
        }

        bench('parse');
        $this.clearEntriesBox();
        bench('clear');
        var first = true;
        for (day in entriesByDays)
        {
            $this.renderEntriesDay(entriesByDays[day], day, first);
            first = false;
        }
        bench('renderDays');
        $this.renderTotalTime(totalTime);
        bench('renderTotal');
    };

    this.onMouseOut = function ()
    {
        mouseoutTimerId = setTimeout($this.collapse, 400);
        clearTimeout(hoverTimerId);
        hoverTimerId = null;
    };

    this.onHover = function ()
    {
        hoverTimerId = setTimeout($this.expand, 300);
        clearTimeout(mouseoutTimerId);
        mouseoutTimerId = null;
    };

    this.onTaskChange = function(event, args)
    {
        if (args && args.hasOwnProperty('taskName'))
            $this.templateData.sidebarButton.taskName = args.taskName;
        else
            $this.templateData.sidebarButton.taskName = false;

        $this.renderSidebarButton();
    };

    this.onTimerStarted = function ()
    {
        $this.templateData.sidebarButton.isRunning = true;
        $this.renderSidebarButton();
    };

    this.onTimerStopped = function ()
    {
        $this.templateData.sidebarButton.isRunning = false;
        $this.renderSidebarButton();
    };

    this.expand = function()
    {
        if (!$this.isCollapsed)
            return;

        $this.sidebar.removeClass('collapsed').addClass('expanded');
        $this.isCollapsed = false;
    };

    this.collapse = function()
    {
        if ($this.isCollapsed)
            return;

        $this.sidebar.removeClass('expanded').addClass('collapsed');
        $this.isCollapsed = true;
    };


    this.loadTemplates = function() {
        $.each($this.templates, function (name, url) {
            $.get(chrome.extension.getURL("templates/"+url+".html"), function (data) {
                ich.addTemplate(name,data);
            });
        });
    };

    function prepareChartData(entries) {
        var startDate = entries[0].date + " 00:00:00";
        var today = moment();

        console.log('pcdEntries', entries);
        console.log('startDate', startDate);
        var range = moment.range(startDate, today);
        var subRanges = [];

        var unit = "day";

        if(range.diff('days') == 0)
            unit = 'hour';
        else if (range.diff('days') <= 7)
            unit = 'day';
        else if (range.diff('weeks') <= 5)
            unit = 'week';
        else if (range.diff('months') <= 12)
            unit = 'month';
        else
            unit = 'year';

        range.by(unit+'s', function(m) {
            var startOf = moment(m).startOf(unit);
            var endOf = moment(m).endOf(unit);
            var range = formatRange(unit,startOf, endOf);
            subRanges.push(range);
        });

        if (!subRanges[subRanges.length-1].range.contains(today))
            subRanges.push(formatRange(unit,moment().startOf(unit), moment().endOf(unit)));

        for(var i in entries)
        {
            var entry = entries[i];
            var datetime = entries[i].date + " " + entries[i].start_time;
            console.log('datetime', datetime);
            var m = moment(datetime, 'YYYY-MM-DD HH:mm:ss');

            for (var j in subRanges)
            {
                var subRange = subRanges[j];

                if (subRange.range.contains(m))
                {
                    subRange.totalTime += parseInt(entry.duration, 10);
                    break;
                }
            }
        }

        var labels = [];
        var datasetData = [];

        for (var i in subRanges)
        {
            var subRange = subRanges[i];
            labels.push(subRange.label);
            datasetData.push(subRange.totalTime);
        }
        console.log('labels', labels);

        var data = {
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
        };

        return data;
    }

    function formatRange(unit, startOf, endOf) {
        console.log('unit', unit);
        var label = null;
        switch(unit) {
            case 'hour' : label = startOf.format('HH:00'); break;
            case 'day' : label = startOf.format('ddd'); break;
            case 'week' :
                if (startOf.month() != endOf.month())
                    label = startOf.format('DD MMM') + '/' + endOf.format('DD MMM');
                else
                    label = startOf.format('DD') + '/' + endOf.format('DD MMM');
                break;
            case 'month' : label = startOf.format('MMMM'); break;
            case 'year' : label = startOf.format('YYYY'); break;
        }
        console.log('label', label);
        var range = moment.range(startOf,endOf);
        return {
            label: label,
            range: range,
            totalTime: 0
        };
    }

    this.pcd = prepareChartData;

    watchTimerId = setInterval($this.watch, 100);
    this.loadTemplates();
    this.bindEvents();

    Chart.defaults.global.animation = false;
    Chart.defaults.global.maintainAspectRatio = true;
}