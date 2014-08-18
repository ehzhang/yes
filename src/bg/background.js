// if you checked "fancy-settings" in extensionizr.com, uncomment this lines

// var settings = new Store("settings", {
//     "sample_setting": "This is how you use Store.js to remember values"
// });

/*
 * Calls specified callback with a table containing the latitude and
 * longitude of the given address
 * @param str_address A string representing the target address
 * @param responseCallback A function that takes as its argument an
 * object containing two fields: lat (the longitude) and lng (the longitude),
 * each corresponding to the location of the specified address
 *
 */
function bestLatLng(str_address, responseCallback) {
  new google.maps.Geocoder().geocode({ 'address': str_address}, function(results, status) {
    if (responseCallback && typeof(responseCallback) === "function") {
      if (results && results.length > 0) {
        var resultLoc = results[0].geometry.location;
        responseCallback({lat: resultLoc.lat(), lng: resultLoc.lng()});
      } else {
        //console.log("Got no geocode results for: " + str_address);
        responseCallback(null);
      }
          }
  });
}

/*
 * Returns a string version of the given location object in a form to be passed to the Groupon API
 * @param loc {object} An Object with two fields: lat (the latitude), and lng (the longitude)
 * @return {string} A string representing the given location in a format that can be passed
 * to the Groupon API
 *
 */
function getLatLngUrlParam(loc) {
  return "lat=" + loc.lat + "&" + "lng=" + loc.lng;
}

/*
 * Fuzzy string comparison that ignores leading "the", case, &/"and" distinctions, and non-alphanumeric
 * characters.
 * @param str1, str2 {string} Two strings, intended to be merchant names
 * @return {boolean} true if the two names are approximately equal, false otherwise
 *
 */
function fuzzyNameCompare(str1, str2) {
  function simp(s) {
    return s.split(" ").reduce(
      function (memo, value) {
        return memo + (value === "the" ? "" : value);
      }, "").split("").reduce(
        function (memo, value) {
          var newVal = "";
          if (value === "&") {
            newVal = "and";
	  } else if (value.match(/[a-z0-9]/)) {
            newVal = value;
          }
          return memo + newVal;
        });
  }
  var simpleStr1 = simp(str1.toLowerCase());
  var simpleStr2 = simp(str2.toLowerCase());
  var ret = simpleStr1.indexOf(simpleStr2) >= 0 || simpleStr2.indexOf(simpleStr1) >= 0;
  return ret;
}

/*
 * Simple asynchronous HTTP GET method
 * @param theUrl {string} The URL for the site to GET from
 * @param callback {function} function to call on completion; callback
 * will be called with the response text
 *
 */

function asynchHttpGet(theUrl, callback)
{
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, true );
    xmlHttp.addEventListener('load',function() {callback(xmlHttp.responseText)});
    xmlHttp.send( null );
}

/*
 * Constructs the URL to use for the Groupon API call, and sends it to given callback
 * @param address {string} A string representation of the address
 * @param callback {function} A function that will be passed a URL on which a GET will
 * return deal objects
 *
 */
function getApiUrl(address, callback) {
  var showParam = "show=merchant,title,announcementTitle,pitchHtml,options,locations,dealUrl";
  var radiusParam = "radius=1";
  var sortParam = "sort=distance";
  bestLatLng(address, 
    function(loc) {
      if (loc) {
        callback("https://api.groupon.com/v2/deals/search" + "?" + 
          [
            "client_id=d06a93eb3d058ea36f8a8b6d614780df8a89c6fc", 
            getLatLngUrlParam(loc),
            radiusParam,
            showParam,
            sortParam
          ].join("&")
        );
      } else {
        callback(null);
      }
    });
}

/*
 * Gets all deals near given address and passes them to callback
 * @param address {string} A string representation of the address
 * @param callback {function} A function that will be passed a JSON
 * array of deal objects
 *
 */
function getAllDealsJson(address, callback) {
  getApiUrl(address,
    function () {
      function multiTryGet(url, numRetries) {
        if (url) { 
          numRetries = numRetries | 3;
          asynchHttpGet(url,
            function(responseText) {
              var jsonResponse = JSON.parse(responseText);
              if (jsonResponse.deals) {
                callback(JSON.parse(responseText).deals);
              } else if (jsonResponse.error.httpCode = 503 && numRetries > 0) {
                //console.log("API call failed, retrying... response was:" + JSON.stringify(jsonResponse));
                window.setTimeout(function(){multiTryGet(url, numRetries - 1)},1000);
              }
            });
        } else {
          callback([]);
        }
      }
      return multiTryGet;
     }());
}
/*
 * Filters a JSON Array by given business name using fuzzy comparison
 * @param dealsJson {Array} A JSON Array of deals
 * @param businessName {string} A string representation of the business
 * name
 * @return {Array} A JSON Array of deals that fuzzily match businessName
 *
 */
function matchBusinesses(dealsJson, businessName) {
    return dealsJson.filter(
    function(deal) {
      return deal.locations.reduce(
        function(memo, loc) {
          return memo || loc.distance < 0.75;
        }, false) && fuzzyNameCompare(deal.merchant.name, businessName) ;
    });
}

/*
 * Gets a list of deal matching the business name and
 * sends them to the given callback
 * @param address {string} A string representation of the business address
 * @param businessName {string} A string representation of the business name
 * @param callback {function} A function that will be passed a JSON Array of deals
 *
 */
function getMatchingDeals(address, businessName, callback) {
  getAllDealsJson(address,
    function(dealsJson) {
      callback(matchBusinesses(dealsJson, businessName));
    });
}

// To send a message, use this format:
// chrome.runtime.sendMessage(
//   null, //the extensionid, keeping it null ensures that just our extension gets the message
//   {address: "BUSINESS_ADDRESS", businessName: "BUSINESS_NAME"}, //the message object, which should be in this format for our purposes
//   function(deals) { //the callback to handle the results, because lots of asynch stuff happens with this
//     DO_STUFF_WITH_RETURNED_DEALS
//   }
// };
chrome.extension.onMessage.addListener(function (message, sender, sendResponse) {
    if (message && message.address && message.businessName) {
      if (sendResponse) {
        getMatchingDeals(message.address, message.businessName, sendResponse);
        return true;
      }
    } else if (sendResponse) {
      sendResponse();
    }
  }
);

/**
 * Send a request to re-execute a content script, sent to a specific tabID
 * @param tabId
 */
function updatePageAction(tabId) {
  chrome.tabs.sendRequest(tabId, {is_content_script: true}, function(response) {
    if (response && response.is_content_script)
      chrome.pageAction.show(tabId);
  });
}

/**
 * Listen for changes in the tabs (i.e, URL)
 */
chrome.tabs.onUpdated.addListener(function(tabId, change, tab) {
  if (change.status == "complete") {
    updatePageAction(tabId);
  }
});
