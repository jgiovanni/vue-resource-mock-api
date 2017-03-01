/*!
 * vue-resource-mock-api v0.0.9 
 * (c) 2017 Jerez Bain
 * Released under the MIT License.
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('url-pattern'), require('qs')) :
  typeof define === 'function' && define.amd ? define(['url-pattern', 'qs'], factory) :
  (global.VueResourceMockApi = factory(global.UrlPattern,global.qs));
}(this, (function (UrlPattern,qs) { 'use strict';

UrlPattern = 'default' in UrlPattern ? UrlPattern['default'] : UrlPattern;
qs = 'default' in qs ? qs['default'] : qs;

/*  */
function plugin (request, next) {
    var TAG = '[vue-resource-mock] ';
    var MATCH_OPTIONS = this.mockMATCH_OPTIONS;
    var mapRoutes = function (map) {
        return Object.keys(map)
            .reduce(function (result, route) {
                var ref = route.split(' ');
                var method = ref[0];
                var url = ref[1];
                var handler = map[route];

                switch (handler.constructor.name) {
                    case 'Function':
                        result.push({
                            method: method,
                            pattern: new UrlPattern(url, MATCH_OPTIONS),
                            handler: handler
                        });
                        break;
                    case 'Object':
                        result.push({
                            method: method,
                            pattern: new UrlPattern(url, MATCH_OPTIONS),
                            handler: function () {
                                return {
                                    body: handler,
                                    status: 200
                                }
                            }
                        });
                        break;
                    case 'Number':
                        if (!Number.isInteger(handler) || handler < 200 || handler > 599) {
                            throw new Error((handler + " is not a valid Http Status Code"))
                        }
                        result.push({
                            method: method,
                            pattern: new UrlPattern(url, MATCH_OPTIONS),
                            handler: function () {
                                return {
                                    body: undefined,
                                    status: 200
                                }
                            }
                        });
                        break;
                    default:
                        throw new Error('Routes must be an Object or Function or number(status code)')
                }
                return result
            }, [])
    };
    var Routes = mapRoutes(this.mockAPI);

    var ref = request.url.split('?');
    var path = ref[0];
    var query = ref[1];
    var route = Routes.filter(function (item) {
        item.matchResult = item.pattern.match(path);
        return request.method.toLowerCase() === item.method.toLowerCase() && !!item.matchResult
    });
    if (route.length === 0) {
        console.warn(TAG + 'Request pass through: ' + request.url);
        next();
    } else {
        console.info(TAG + 'Request served with mock: ' + request.url);
        var mockResponse = route[0].handler(route[0].matchResult, qs.parse(query), request);
        if (mockResponse.delay) {
            setTimeout(function () { return next(request.respondWith(mockResponse.body, mockResponse)); }, mockResponse.delay);
        } else {
            next(request.respondWith(mockResponse.body, mockResponse));
        }
    }
}

function extend(obj1, obj2) {
    var keys = Object.keys(obj2);
    for (var i = 0; i < keys.length; i += 1) {
        var val = obj2[keys[i]];
        obj1[keys[i]] = ['string', 'number', 'array', 'boolean'].indexOf(typeof val) === -1 ? extend(obj1[keys[i]] || {}, val) : val;
    }
    return obj1;
}

plugin.version = '0.0.9';

/*export default plugin

if (typeof window !== 'undefined' && window.Vue) {
  // window.Vue.use(plugin);
    if (!Vue.http) {
        throw new Error('[vue-resource] is not found. Make sure it is imported and "Vue.use" it before vue-resource-mock')
    }
    Vue.http.interceptors.push(plugin(data))
}*/

var index = {
    install: function install(Vue, data) {
        if (!Vue.http) {
            throw new Error('[vue-resource] is not found. Make sure it is imported and "Vue.use" it before vue-resource-mock')
        }
        Vue.prototype.mockAPI = data.hasOwnProperty('routes') ? data.routes : data;
        var matchOptions = { segmentValueCharset: 'a-zA-Z0-9.:-_%' };
        if (data.hasOwnProperty('matchOptions')) {
            extend(matchOptions, data.matchOptions);
        }
        Vue.prototype.mockMATCH_OPTIONS = matchOptions;
        // Lets begin
        Vue.http.interceptors.push(plugin);
    }
};

return index;

})));
