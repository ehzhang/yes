chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
    if (document.readyState === "complete") {clearInterval(readyStateCheckInterval);

      // ----------------------------------------------------------
      // This part of the script triggers when page is done loading
      console.log("Activate Groupon Injectors!");
      // ----------------------------------------------------------

//      $(document).append("<script src='https://maps.google.com/maps/api/js?key=AIzaSyBWrsXOH1mjGQ3p6mGwKWFd6KdduoHWln0'></script>");

      // Inject elements into the indexed-biz-name span.
//      $(".indexed-biz-name").each(function(i, e){
//        $(e).append("<h1> GROUPON ROX YELP SUX</h1>");
//      });

    }
	}, 10);
});
