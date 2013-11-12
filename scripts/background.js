function checkForValidUrl(tabId, changeInfo, tab) {
    if (/trello\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }

    if (/asana\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);