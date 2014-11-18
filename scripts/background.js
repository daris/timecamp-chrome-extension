function checkForValidUrl(tabId, changeInfo, tab) {
    if (/trello\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
	
    if (/manageprojects\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }

    if (/podio\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }

    if (/pivotaltracker\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }

    if (/asana\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
    if (/teamwork\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
    if (/insight\.ly/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);