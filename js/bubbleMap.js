var bubbleMap = {
  bb: null,
  g: null,
  projection: null,
  path: null,
  tooltip: null,
  // converts lon, lat to x and y using a d3 projection
  latLngToXY: function(d) {
    return bubbleMap.projection([parseFloat(d.lng), parseFloat(d.lat)]);
  },

  createTooltip: function(city, showCount) {
    // reset
    bubbleMap.tooltip.html("");

    // city name and count
    var html = city.city + ": <b>" 
      + (showCount ? numberFormat(city.count) : "-") 
      + "</b>";
    bubbleMap.tooltip.append("div")
      .html(html);

    if (!showCount) {
      return;
    }

    // get detailed data for city
    var cityData = waf.getDataForCity(city);
    var hourlyData = cityData.hourlyComplete;
    // this will tell us the selected time window
    var extent = timeRangeSelector.getSelectedTimeRange();

    // bounding box for tooltip viz
    var bb = {};
    bb.margin = {
      top: 10, 
      right: 40, 
      bottom: 20, 
      left: 60
    };
    bb.height = 100 - bb.margin.top - bb.margin.bottom;
    bb.width = 400 - bb.margin.left - bb.margin.right;

    // parent <g> element
    var g = bubbleMap.tooltip
      .append("svg")
        .attr({
          width: bb.width + bb.margin.left + bb.margin.right, 
          height: bb.height + bb.margin.top + bb.margin.bottom
        })
      .append("g")
        .attr({
          class: "tooltipTimeRangeWrapper",
          transform: "translate(" + bb.margin.left + "," + bb.margin.top  + ")"
        });

    // x scale
    var x = d3.scale.linear()
      .domain([0, hourlyData.length])
      .range([0, bb.width]);

    // y scale
    var y = d3.scale.linear()
      .domain([0, d3.max(hourlyData)])
      .rangeRound([bb.height, 0]);

    // x axis
    var xAxis = d3.svg.axis()
      .scale(x)
      .orient("bottom");

    // y axis
    var yAxis = d3.svg.axis()
      .scale(y)
      .orient("left")
      .ticks(4);

    // draw x axis
    g.append("g")
      .attr("class", "x axis")
      .attr("transform", "translate(0," + bb.height + ")")
      .call(xAxis);

    // draw y axis
    g.append("g")
      .attr("class", "y axis")
      .call(yAxis);

    g.selectAll(".timeAttack")
      .data(hourlyData)
      .enter().append("rect")
        .attr("class", "timeAttack")
        .attr("x", function(d, i) { return x(i); })
        .attr("y", function(d) { return y(d); })
        .attr("height", function(d) { return bb.height - y(d); })
        .attr("width", (bb.width / hourlyData.length) - 2)
        .style("fill", function(d, i) {
          // use color for attacks if this hour is within the selected time range
          if (i >= extent[0] && i < extent[1]) {
            return colorAttack;
          } else {
            // otherwise grey out
            return colorNoAttack;
          }
        });
  }, 

  update: function() {
    var radiusNoData = 2;
    var data = waf.getAggregatedMapData();

    // create linear scale for the radius
    var rScale = d3.scale.sqrt()
      .domain(d3.extent(data, function(d) { return d.count; }))
      .range([radiusNoData, 20]);

    // reset
    // bubbleMap.g.selectAll(".mapAttack").classed("mapAttackDisabled", true);
    // bubbleMap.g.selectAll(".mapAttack").remove();

    // use object constancy to preserve data bindings
    // see [1]
    var selection = bubbleMap.g.selectAll(".mapAttack")
      // some cities can have the same name, so I am concat'ing it with the latitude
      // to create a unique key
      .data(data, function(d) { return d.id; });
      // .data(data);

    // new circles
    selection.enter().append("circle")
        .attr("class", "mapAttack")
        // use projection to figure out cx and cy
        .attr("cx", function(d, i) { return bubbleMap.latLngToXY(d)[0]; })
        .attr("cy", function(d, i) { return bubbleMap.latLngToXY(d)[1]; })
        .attr("r", function(d) { return rScale(d.count); })
        .style({
          fill: colorAttack,
          'stroke-width': "0px",
          stroke: "yellow"
        })
        // show tooltip
        .on("mouseover", function(d, i) {
          this.style.strokeWidth = "2px";
          showTooltip(d, true);
        })
        // hide tooltip
        .on("mouseout", function(d, i) {
          this.style.strokeWidth = "0px";
          hideTooltip(d);
        });

    // updated circles
    selection
      // show updated tooltip
      .on("mouseover", function(d, i) {
        this.style.strokeWidth = "2px";
        showTooltip(d, true);
      })
      .on("mouseout", function(d, i) {
        this.style.strokeWidth = "0px";
        hideTooltip(d);
      })
      .transition()
      .duration(transitionDuration)
        .attr("r", function(d) { return rScale(d.count); })
        .style("fill", function(d) {
          return d.count ? colorAttack : colorNoAttack;
        });

    selection.order();

    // exiting circles
    selection.exit()
      // show updated tooltip
      .on("mouseover", function(d, i) {
        showTooltip(d, false);
      })
      // hide tooltip
      .on("mouseout", function(d, i) {
        hideTooltip(d);
      })
      .transition()
      .duration(transitionDuration)
        .attr("r", radiusNoData)
        .style("fill", colorNoAttack);

    var showTooltip = function(d, showCount) {
      bubbleMap.tooltip.transition()
        .duration(200)
        .style("opacity", 0.9)

      bubbleMap.createTooltip(d, showCount);
      
      bubbleMap.tooltip
        .style("left", (d3.event.pageX) + "px")
        .style("top", (d3.event.pageY) + "px");
    }

    var hideTooltip = function(d) {
      bubbleMap.tooltip.transition()
        .duration(200)
        .style("opacity", 0);
    }
  },

  init: function(gWrapper, bbMap, world) {
    bubbleMap.bb = bbMap;
    // this will clip paths and points that lie outside the drawable area
    // thanks to [1]
    gWrapper.append("defs")
      .append("clipPath")
        .attr("id", "bubbleMapClipper")
        .append("rect")
          .attr("width", bbMap.width)
          .attr("height", bbMap.height);

    var mapOverlay = gWrapper.append("rect")
        .attr("class", "mapOverlay")
        // .attr("transform", "translate(" + bbMap.left + "," + bbMap.top + ")")
        .attr("width", bbMap.width)
        .attr("height", bbMap.height)

    bubbleMap.g = gWrapper.append("g");

    // tooltip div element
    bubbleMap.tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("opacity", 0);

    // projection used
    bubbleMap.projection = d3.geo.mercator()
      .translate([bbMap.width / 2, bbMap.height / 1.75])
      .scale(140);
    // path used to draw the world map
    bubbleMap.path = d3.geo.path().projection(bubbleMap.projection);

    var zoom = d3.behavior.zoom()
        // .translate([0, 0])
        // .scale(1)
        .scaleExtent([1, 24])
        .on("zoom", function() {
          bubbleMap.g.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
        });

    bubbleMap.g.selectAll("path")
        .data(world.features)
        .enter().append("path")
          .attr("class", "country")
          .attr("d", bubbleMap.path);

    mapOverlay.call(zoom);
  }
}
