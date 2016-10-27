var module = require('module'),
    request = require('request')
extend = require('extend');
var glob_count = 0;
function requestWrapper(uri, options, callback) {
    if (typeof options === 'function') {
        callback = options;
    }

    var params = {}
    if (typeof options === 'object') {
        extend(params, options, { uri: uri });
    } else if (typeof uri === 'string') {
        extend(params, { uri: uri });
    } else {
        extend(params, uri);
    }

    params.callback = callback || params.callback;

    if (!params.uri && params.url) {
        params.uri = params.url;
        delete params.url;
    }

    glob_count++;
    console.log("Requests count : " + glob_count + "  URI : " + params.uri);
    return request(uri, options, callback);
}

function verbFunc(verb) {
    var method = verb.toUpperCase()
    return function (uri, options, callback) {
        var params = initParams(uri, options, callback)
        params.method = method
        return requestWrapper(params, params.callback)
    }
}

requestWrapper.get = verbFunc('get');

module._cache[require.resolve('request')].exports = requestWrapper;