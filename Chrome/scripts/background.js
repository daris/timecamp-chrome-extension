/// <reference path="jquery-2.0.3.js" />

//alert('background.js');

//var checkUrl= function (tabId, changeInfo, tab) {
//        if (changeInfo.status === 'complete') {
//            if (/timecamp\.com/.test(tab.url)) {
//                TimecampButton.fetchUser();
//            }
//        }
//    },

//fetchUser: function () {
//    var xhr = new XMLHttpRequest();
//    xhr.open("GET", TimecampButton.$apiUrl + "/fetch_user", true);
//    xhr.onload = function () {
//        if (xhr.status === 200) {
//            var resp = JSON.parse(xhr.responseText);
//            TimecampButton.$user = resp.data;
//        }
//    };
//    xhr.send();
//},

//createTimeEntry: function (timeEntry) {
//    var start = new Date(),
//      xhr = new XMLHttpRequest(),
//      entry = {
//          time_entry: {
//              start: start.toISOString(),
//              created_with: "Timecamp Button",
//              description: timeEntry.description,
//              wid: TimecampButton.$user.default_wid,
//          }
//      };
//    xhr.open("POST", TimecampButton.$apiUrl + "/try_add_task", true);
//    xhr.setRequestHeader('Authorization', 'Basic ' + btoa(TimecampButton.$user.api_token + ':api_token'));
//    xhr.send(JSON.stringify(entry));
//},

//newMessage: function (request, sender, sendResponse) {
//    if (request.type === 'activate') {
//        if (TimecampButton.$user !== null) {
//            //chrome.pageAction.show(sender.tab.id);
//            //TODO zmieniæ kolor ikonki na ¿ywy
//        }
//        sendResponse({ success: true });
//    } else if (request.type === 'timeEntry') {
//        TimecampButton.createTimeEntry(request);
//    }
//}


//TimecampButton.fetchUser();
//chrome.tabs.onUpdated.addListener(TimecampButton.checkUrl);
//chrome.extension.onMessage.addListener(TimecampButton.newMessage);

function checkForValidUrl(tabId, changeInfo, tab) {
    if (/trello\.com/.test(tab.url)) {
        chrome.pageAction.show(tabId);
    }
};

// Listen for any changes to the URL of any tab.
chrome.tabs.onUpdated.addListener(checkForValidUrl);