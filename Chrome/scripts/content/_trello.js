(function () {
    var prawda = true;
    function isTimeTrackingForThisTask() {
        prawda = !prawda;
        return prawda;
        //TODO TESTOWO, NORMALNIE TO QUERY DO API
    }

    function updateButtonState(btn) {
        if (isTimeTrackingForThisTask()) {
            onButtonTrackingState(btn);
        } else {
            onButtonActiveState(btn);
        }
    }

    function getCurrentBaordId() {
        var url = document.URL;
        var splittedUrl = url.split("/");
        var uniqueBoardId = splittedUrl[5];
        var cardNumber = splittedUrl[6];

        return uniqueBoardId;
    }

    function onButtonActiveState(btn) {
        btn.innerHTML = "";
        var span = createTag('span', 'icon-sm icon-clock');
        btn.appendChild(span);
        btn.innerHTML += "Time track this";
    }

    function onButtonTrackingState(btn) {
        btn.innerHTML = "";
        var span = createTag('span', 'icon-sm icon-move');
        btn.appendChild(span);
        btn.innerHTML += "Time tracking...";
    }

    function createButton() {
        var btn = createTag('a', 'button-link timecamp-button');

        updateButtonState(btn);

        btn.addEventListener("click", function (e) {
            //chrome.extension.sendMessage({
            //    type: 'timeEntry',
            //    description: task
            //});

            updateButtonState(btn);

            return false;
        });

        return btn;
    }

    function addButton(e) {
        if ($('.timecamp-button')) {
            return;
        }

        var buttonList = $('.window-module.other-actions.clearfix .clearfix');
        var button = createButton();
        if(buttonList)
        {
            buttonList.insertBefore(button, buttonList.childNodes[0]);
        }
    }

    chrome.extension.sendMessage({ type: 'activate' }, function (response) {
        if (response.success) {
            document.addEventListener("DOMNodeInserted", addButton);
        }
    });

}());
