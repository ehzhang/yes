// ------------------------------------------------------------
// YES - Yelp Enhancement Suite for Groupon Deals
// ------------------------------------------------------------

/**
 * Yes Main application.
 * @param site: (optional) specify the site.
 */

function yes() {

  /**
   * Helper function to check url
   * @returns {string}
   */
  function urlContains(url, check){
    return url.indexOf(check) > -1;
  }

  /**
   * Return ths current site that we're on.
   * @returns {string} Currently, only yelp_search
   */
  function getCurrentSite() {

    var url = window.location.href;

    if (urlContains(url, '/search?')) return "yelp_search";

    if (urlContains(url, '/biz/')) return "yelp_biz";

  }

  /**
   * Get the businesses and their bindings for this site.
   * @return [Array] of Objects, structured as:
   *  {
   *    name: <Business Name>,
   *    address: <Business Address>
   *    element: <jQuery Object Reference>
   *  }
   */
  function getBusinesses() {

    var businesses= [];

    switch(getCurrentSite()) {
      case "yelp_search":
        // Search for yelp!
        $('.biz-name').each(function(index, element){
          businesses.push({
            name: element.innerText,
            address: $(element)
                        .parents('.search-result')
                        .find('address')[0]
                        .innerText.split('\n')
                        .join(' '),
            element: $(element)
          })
        });
        break;
      case "yelp_biz":
        businesses.push({
          name: $('.biz-page-title').text(),
          address: $('address')[0].innerText,
          element: $('div.mapbox')
        });
        break;
      default:
        // Nothing here.
    }

    return businesses;
  }

  /**
   * Attach deals overlays and buttons the appropriate objects corresponding to businesses.
   *
   * @param businesses: {name, address, $element}
   */
  function attachDeals(businesses) {

    businesses.forEach(function(business){
      chrome.runtime.sendMessage(

        {
          address: business.address,
          businessName: business.name
        },

        function(response) { // Get the deal as a response
          if (response[0]) { // Get the first deal only.
            var $grouponItemParent;

            switch (getCurrentSite()) {
              case "yelp_search":

                if (business.element.parents('.search-result').children('.groupon-item').length === 0) {
                  $grouponItemParent = $(business.element.parents('.search-result')
                    .append(createDeal(response[0])));
                }

                break;
              case "yelp_biz":

                if (business.element.children('.groupon-item').length === 0) {
                  $grouponItemParent = $(business.element
                    .append(createDeal(response[0])));
                }

                break;
              default:
              // Nah
            }
            if ($grouponItemParent) {
              activateDealOverlay($grouponItemParent.children('.groupon-item'));
            }
          }
      });
    });
  }

  /**
   * Generate a deal given a deal object.
   *
   * {
   *  name: <String>
   *  address: <String>
   *  element: <jQuery Element>
   *  deal: {
   *    msg: <String>
   *    url: <String>
   *  }
   * }
   *
   * Currently, randomly generate numbers.
   *
   */
  function createDeal(deal){

    var title = styledTitle(deal.title),
        url = deal.dealUrl;

    return "" +
      "<div class='groupon-item'>" +
        "<img class='groupon-tab'/>" +
        "<div class='groupon-deal'>" +
          "<div class='content'>" +
          "<img class='groupon-logo'/>" +
              title +
          "</div>" +
          "<a href='" + url + "'> " +
            "<button class='groupon-button'> VIEW DEAL </button> " +
          "</a>" +
        "</div>" +
      "</div>"
  }

  /**
   * Get the title from the deal.
   * @param business
   * @returns {string}
   */
  function styledTitle(title){
    return "" +
      "<div class='deal-title'>" +
        title +
      "</div>"
  }

  /**
   * Activate the deal overlay for an item with animation
   */
  function activateDealOverlay($grouponItem){

    var delay = 300;

    var $grouponDeal = $grouponItem.children('.groupon-deal'),
        $grouponTab = $grouponItem.children('.groupon-tab');

    // Adjust the height of the overlay
    if ($grouponDeal.height() <= $grouponDeal.parents('li').outerHeight()){
      $grouponDeal.height($grouponDeal.parents('li').outerHeight() - 8);
    }

    $('.groupon-tab, .groupon-logo')
      .attr('src', chrome.extension.getURL('images/G.png'));

    // Slide down!
    $grouponTab
      .slideDown(300);

    // Add hover listener
    $grouponTab.hover(function(){
      $(this)
        .siblings('.groupon-deal')
          .slideDown(delay);
    });

    // Moar hover listening
    $grouponDeal.hover(null, function(){
      $(this)
        .slideUp(delay)
        });
  }

  /**
   * Execution function.
   */
  function exec() {
    console.log("YES!");
    // Get the businesses from the DOM
    var businesses = getBusinesses();

    // Attach deals to each business.
    attachDeals(businesses);

    // fin.
  }

  exec();

}

// Run the yes function.
yes();

// Listen for requests to re-execute YES.
if (window == top) {
  chrome.extension.onRequest.addListener(function(req, sender, sendResponse) {
    if (req.is_content_script) {
      setTimeout(yes, 2000); // <- This is totally bad let's fix this in the future
      sendResponse({is_content_script: true});
    }
  });
}
