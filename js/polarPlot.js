// Based upon ideas from http://bl.ocks.org/jeffthink/1630683
function PolarPlot(vizBody, bounds, categories, valueFuncs, styleClass) {
  // Initialize the parent prototype
  this.base = Plot;
  this.base(vizBody, bounds);

  // Initialize with provided parameters
  this.categories = categories;
  this.valueFuncs = valueFuncs;
  this.styleClass = d3.scale.ordinal().domain(styleClass.length).range(styleClass);

  var that = this;

  // Define functions
  this.setScales = function() {
    var vizPadding = {
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    };

    // figure out the largest possible circle
    var heightCircleConstraint = that.bounds.height - vizPadding.top - vizPadding.bottom;
    var widthCircleConstraint = that.bounds.width - vizPadding.left - vizPadding.right;
    that.maxRadius = d3.min([heightCircleConstraint, widthCircleConstraint]) / 2;

    var centerX = widthCircleConstraint / 2 + vizPadding.left;
    var centerY = heightCircleConstraint / 2 + vizPadding.top;

    that.maxVal = d3.max(that.flatten(that.values));
    that.radius = d3.scale.linear().domain([0, that.maxVal])
      .range([0, that.maxRadius]);

    // center the circle in the box
    that.vizBody.attr("transform",
      "translate(" + centerX + ", " + centerY + ")");
  };

  this.addAxes = function() {
    // create the axes
    var radialTicks = that.radius.ticks(5);

    that.vizBody.selectAll('.circle-ticks').remove();
    that.vizBody.selectAll('.line-ticks').remove();

    var circleAxes = that.vizBody.selectAll('.circle-ticks')
      .data(radialTicks)
      .enter().append('svg:g')
      .attr("class", "circle-ticks");

    circleAxes.append("svg:circle")
      .attr("r", function (d, i) {
        return that.radius(d);
      })
      .attr("class", "circle-axis");

    circleAxes.append("svg:text")
      .attr("text-anchor", "middle")
      .attr("dy", function (d) {
        return -1 * that.radius(d);
      })
      .text(String);

    var lineAxes = that.vizBody.selectAll('.line-ticks')
      .data(that.categories)
      .enter().append('svg:g')
      .attr("transform", function (d, i) {
        return "rotate(" + ((i / that.categories.length * 360) - 90) +
          ")translate(" + that.radius(that.maxVal) + ")";
      })
      .attr("class", "line-ticks");

    lineAxes.append('svg:line')
      .attr("x2", -1 * that.radius(that.maxVal))
      .attr("class", "line-axis");

    lineAxes.append('svg:text')
      .text(String)
      .attr("text-anchor", "middle")
      .attr("transform", function (d, i) {
        return (i / that.categories.length * 360) < 180 ? null : "rotate(180)";
      });
  };

  this.draw = function() {
    var lines = that.vizBody.selectAll('.line')
      .data(that.values);

    // draw the line
    lines.enter().append('svg:path')
      .attr("d", d3.svg.line.radial()
        .radius(function (d) { return 0; })
        .angle(function (d, i) {
          i = i % that.categories.length; // wrap back around
          return (i / that.categories.length) * 2 * Math.PI;
        })
      )
      .attr('class', function (d, i) { return "line " + that.styleClass(i); })
      .style("fill", "none");

    // animate the changes
    lines.transition()
      .duration(transitionDuration)
      .attr("d", d3.svg.line.radial()
        .radius(function (d) { return that.radius(d); })
        .angle(function (d, i) {
          i = i % that.categories.length; // wrap back around
          return (i / that.categories.length) * 2 * Math.PI;
      })
    );
  };

  this.update = function() {
    // update the dataset
    that.values = that.valueFuncs.map(function (d) {
      return d().concat(d()[0]);
    });
    that.maxVal = d3.max(that.flatten(that.values));
    that.radius = d3.scale.linear().domain([0, that.maxVal])
      .range([0, that.maxRadius]);

    // figure out the new axes
    that.addAxes();

    // draw it!
    return that.draw();
  };

  this.flatten = function(values) {
    // a helper to flatten lists
    return values.reduce(function(prev, curr) {
      return prev.concat(curr);
    },[]);
  };

  // Finish initialization
  this.values = this.valueFuncs.map(function (d) {
    // concat the first value to the end to close the circle
    return d().concat(d()[0]);
  });

  // do all the things
  this.setScales();
  this.addAxes();
  this.draw();
};

PolarPlot.prototype = new Plot;

