function Annotated(element, annotation, options) {
  var options = options || {};

  this.element = d3.select(element);
  this.annotation = annotation;
  this.aspectRatio = 
    (this.annotation.aspect ? eval(this.annotation.aspect) : 1).toFixed(4);
  this.opacity = options.opacity || 0.5;
  this.animationDuration = options.animationDuration || 200;

  this.uniqueId = 'annotated-' + this.annotation.id.replace(' ', '-')
    .toLowerCase();

  this.element.classed('annotated', true);
  this.svg = this.element.append('svg');

  this.caption = this.element.append('div');
  this.captionContent = this.caption.append('div').classed('content', true);

  this._create();
}

Annotated.prototype._isTouchDevice = function() {
  return Modernizr.touch;
}

Annotated.prototype._getTrueHeight = function(h) {
  return h * this.aspectRatio;
}

Annotated.prototype._create = function() {
  this.svg.attr('viewBox', '0 0 100 ' + this._getTrueHeight(100));
  this.caption.classed('caption', true);


  var defs = this.svg.append('defs');
  var holes = defs.append('mask');

  holes.attr('id', this.uniqueId + '-mask');

  holes.append('rect')
    .attr('width', 100)
    .attr('height', this._getTrueHeight(100))
    .style('fill', '#fff');

  var gradient = defs.append('radialGradient')
    .attr('id', this.uniqueId + "-gradient")
    .attr('cx', '50%')
    .attr('cy', '50%')
    .attr('r', '50%');

  gradient.append('stop')
    .attr('offset', '80%')
    .style('stop-opacity', 1.0);

  gradient.append('stop')
    .attr('offset', '100%')
    .style('stop-opacity', 0.0);

  var hotspots = this.svg.append('g')
    .classed('hotspots', true)
    .style('opacity', 0);

  this.hotspots = hotspots;

  hotspots.append('rect')
    .attr('width', 100)
    .attr('height', this._getTrueHeight(100))
    .style('fill', '#000')
    .style('opacity', this.opacity)
    .style('mask', 'url(#' + this.uniqueId + '-mask' + ')');

  var circles = hotspots.append('g')
    .classed('circles', true);

  this.circles = circles;

  var self = this;
  var getTrueHeight = function(h) {
    return self._getTrueHeight(h);
  };

  this.cutOuts = holes.selectAll('circle')
    .data(this.annotation.hotspots)
    .enter().append('circle')
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return getTrueHeight(d.y); })
      .attr('r', 10)
      .style('fill', "url(#" + this.uniqueId + "-gradient" + ")")
      .style('opacity', 0);

  var circleObjects = circles.selectAll('circle')
    .data(this.annotation.hotspots)
    .enter().append('circle')
      .attr('cx', function(d) { return d.x; })
      .attr('cy', function(d) { return getTrueHeight(d.y); })
      .attr('r', 10)
      .style('fill', "#000")
      .style('opacity', 0.00)

  if (!this._isTouchDevice()) {
    circleObjects
      .on('mouseover', function(e) { self._hotSpotOn(d3.select(this));})
      .on('mouseleave', function() {self._hotSpotOff(d3.select(this));});
  } else {
    circleObjects
      .on('touchstart', function(e) { self._hotSpotOn(d3.select(this));})
      .on('touchend', function() {self._hotSpotOff(d3.select(this));})
      .on('touchcancel', function() {self._hotSpotOff(d3.select(this));});
  }

  this.circleObjects = circleObjects;

  this.infoHotspot = this.svg.append('g').append('circle')
    .classed('enabler', true)
    .attr('cx', 3)
    .attr('cy', this._getTrueHeight(95))
    .attr('r', 2)
    .style('opacity', this.opacity);

  if (!this._isTouchDevice()) {
    this.infoHotspot.on('mouseover', function() { self._onInfo(); });
  } else {
    this.infoHotspot.on('touchstart', function() { self._onInfo(); });
  }
};

Annotated.prototype._hotSpotOn = function(circle) {

  var cb = circle[0][0].getBoundingClientRect();
  var ib = this.svg[0][0].getBoundingClientRect();

  var d = {};

  d.left = cb.left - ib.left;
  d.right = ib.right - cb.right;
  d.top = cb.top - ib.top;
  d.bottom = ib.bottom - cb.bottom;

  var toTheLeft = d.left >= d.right;
  var width = (toTheLeft ? d.left : d.right) * 0.9;

  this.captionContent
    .classed('left', toTheLeft)
    .text(circle.datum().caption);

  this.caption.style('width', width + 'px');
  var height = parseInt(this.captionContent.style('height'), 10);

  var captionLeft, captionTop;

  if (toTheLeft) {
    captionLeft = cb.left - width - d.left * 0.05 - ib.left;
  } else {
    captionLeft = cb.right + d.right * 0.05 - ib.left;
  }

  captionTop = cb.top + cb.height/2 - height/2 - ib.top;

  if (captionTop < 0) 
    captionTop = 0;
  if (captionTop + height > ib.bottom) 
    captionTop -= (captionTop + height) - ib.bottom;

  var cutOut = this.cutOuts[0][this._getIndexOfCircle(circle)];
  d3.select(cutOut).style('opacity', 1);

  // circle.style('opacity', 0.01);
  this.hotspots.style('opacity', 0.999);

  this.caption
    .style('top', captionTop + 'px')
    .style('left', captionLeft + 'px')
    .style('width', width + 'px')
    .style('z-index', 5)
    .style('opacity', 0.999);


};

Annotated.prototype._getIndexOfCircle = function(circle) {
  for(var i = 0; i < this.circleObjects[0].length; i++) {
    if (this.circleObjects[0][i] === circle[0][0]) return i; 
  }

  return -1;
}

Annotated.prototype._hotSpotOff = function(circle) {
  // circle.style('opacity', this.opacity);
  var cutOut = d3.select(this.cutOuts[0][this._getIndexOfCircle(circle)]);
  cutOut.style('opacity', 0);

  this.hotspots.style('opacity', 0.001);
  this.caption.style('opacity', 0.001);

  this.caption.style('z-index', -1);
};

Annotated.prototype._onInfo = function() {
  this.cutOuts.style('opacity', 0.999);
  this.hotspots.style('opacity', 0.999);

  var self = this;
  setTimeout(function() {
    self.hotspots.style('opacity', 0.001)
    setTimeout(function() {
      self.cutOuts.style('opacity', 0.001);
    }, self.animationDuration*2);
  }, 600);
}

