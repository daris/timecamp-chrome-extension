/**
 * Created by mdybizbanski on 21.09.15.
 */
function ApiService() {

    ApiToken = null;

    var $this = this;

    this.setToken = function (token)
    {
        this.ApiToken = token;
    };

    this.call = function (url, data, method) {
        if (url == undefined)
            return null;

        if (!this.ApiToken)
            return null;

        if (data == undefined)
            data = {};

        if (method == undefined)
            method = 'GET';
        else
            method = method.toUpperCase();

        data.service = timer.service;

        apiAddress = restUrl;
        url = apiAddress + url;

        var params = {
            type: method,
            url: url,
            data: data,
            headers: {"Authorization": "Basic " + btoa(ApiService.ApiToken + ":")}
        };


        switch (method) {
            case 'POST':
            case 'PUT':
            case 'DELETE':
                break;

            case 'GET':
                params.data.cachekill = new Date().getTime();
                break;
        }

        return $.Deferred(function (dfd)
        {
            $.ajax(params).success(function (data) {
                dfd.resolve(data);
            }).error(function (data) {
                dfd.reject(data);
            });
        });
    };

    /**
     * Constructor for default api interface for resource
     * @param resource string
     * @param methods string[], default = ['get','delete','post','put']
     * @returns {{}} Object containing api methods.
     */
    function ApiResource(resource, methods)
    {
        var reg = /{[0-9]+}/g;
        var resourceParams = resource.match(reg);

        if (methods == undefined) {
            methods = ['get', 'delete', 'post', 'put'];
        }

        var res = this;

        $.each(methods, function (key, method) {
            res[method] = function ()
            {
                var args = Array.prototype.slice.call(arguments);
                var data = undefined;
                var paramOffset = 0;
                if(resourceParams)
                {
                    for (var i = 0; i < arguments.length; i++)
                    {
                        var arg = arguments[i];
                        if(angular.isObject(arg)){
                            paramOffset = i;
                            break;
                        }
                    }
                    if(i == arguments.length){
                        paramOffset = i;
                    }
                }
                if(arguments.length >= paramOffset + 1)
                    data = args[paramOffset];

                var params = args.slice(0, paramOffset);
                params.unshift(resource);
                var theResource = String.format.apply(this, params);
                return $this.call(theResource, data, method);
            }
        });
        return this;
    }

    this.Timer = {
        status: function () {
            var data = {action: 'status'};
            return ApiService.call('/timer', data, 'POST');
        },
        start: function (external_task_id, startedAt) {
            var data = {action: 'start', external_task_id: external_task_id};
            if (startedAt != null)
                data['started_at'] = startedAt;
            return ApiService.call('/timer', data, 'POST');
        },
        cancel: function (timer_id){
            var data = {};
            if(timer_id)
                data.timer_id = timer_id;
            return ApiService.call('/timer', data, 'DELETE');
        },
        stop: function (stoppedAt){
            var data = {action: 'stop'};
            if(stoppedAt)
                data.stopped_at = stoppedAt;
            return ApiService.call('/timer', data, 'POST');
        }
    };
    this.Entries = new ApiResource('/entries', ["get","post", "put"]);
    this.Tasks = new ApiResource('/tasks', ["get"]);
}


