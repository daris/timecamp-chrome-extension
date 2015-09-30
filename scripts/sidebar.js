/**
 * Created by mdybizbanski on 22.09.15.
 */
function Sidebar()
{
    this.marginSelector = null;
    this.appendSelector = null;
    this.sidebar = $('<div class="tc-sidebar">');
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

    this.bindInternalEvents = function()
    {
        $this.sidebar.on('click', $this.expand);
        $this.sidebar.on('mouseenter', $this.onHover);
        //$this.sidebar.on('mouseleave', $this.onMouseOut);
        $($this.marginSelector).on('click', $this.collapse);
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
        $('tc-sidebar-time-details').html('');
    };

    this.renderEntriesDay = function(entries, date, isFirst) {
        var params = {
            date : moment(date,'YYYY-MM-DD').format("DD MMM"),
            rawDate: date,
            isFirst: isFirst
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        console.log('sidebarTimeDetails', sidebarTimeDetails);
        sidebarTimeDetails.append(ich.sidebarDayHeader(params));

        for (i in entries)
            sidebarTimeDetails.append(ich.sidebarEntry(entries[i]));
    };

    this.renderTotalTime = function(totalTime) {
        var params = {
            totalTime : totalTime
        };

        var sidebarTimeDetails = $('.tc-sidebar-time-details');
        sidebarTimeDetails.append(ich.sidebarTotalTime(params));
    };

    this.onEntriesLoaded = function(event, eventData) {
        var entriesByDays = {};

        var params = eventData.params;
        var entries = eventData.data;
        var totalTime = 0;

        for (i in entries)
        {
            var entry = entries[i];

            entry.noteFormatted = entry.description.linkify();
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

        $this.clearEntriesBox();
        var first = true;
        for (day in entriesByDays)
        {
            $this.renderEntriesDay(entriesByDays[day], day, first);
            first = false;
        }

        $this.renderTotalTime(totalTime);
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

    watchTimerId = setInterval($this.watch, 100);
    this.loadTemplates();
    this.bindEvents();
}