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

  this.imageUrl = this.element.attr('data-annotated-img');
  this.videoUrl = this.element.attr('data-annotated-video');
  this.videoPosterUrl = this.element.attr('data-annotated-video-poster');

  /*
    Element structure:
      .wrapper
        img
        svg
      .caption
      svg.hotspot
  */

  this.element.classed('annotated', true);

  this.hotspotSvg = this.element.append('svg');
  
  this.wrapper = this.element.append('div')
    .classed('wrapper', true)
    .attr('width', 100);

  this.svg = this.wrapper.append('svg');
  
  if (this.imageUrl) {
    this.img = this.wrapper.append('img').attr('src', this.imageUrl);
  } else if (this.videoUrl) {
    this.video = this.wrapper.append('video')

    var self = this;
    this.video.selectAll('source')
      .data(['mp4', 'ogg', 'webm'])
      .enter()
        .append('source')
        .attr('src', function(d) { return self.videoUrl + '.' + d; })
        .attr('type', function(d) { return 'video/' + d; });

    if (this.videoPosterUrl) {
      this.video.attr('poster', this.videoPosterUrl);
    }
  }

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
  this.hotspotSvg.attr('viewBox', '0 0 10 10').classed('hotspot', true);
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

  this.infoHotspot = this.hotspotSvg.append('g').append('circle')
    .classed('enabler', true)
    .attr('cx', 5)
    .attr('cy', 5)
    .attr('r', 3.5)
    .style('opacity', this.opacity);

  if (!this._isTouchDevice()) {
    this.infoHotspot.on('mouseover', function() { self._onInfo(); });
  } else {
    this.infoHotspot.on('touchstart', function() { self._onInfo(); });
  }

  d3.select(window).on('resize', function() { self.resize(); });
  this.resize();
};

Annotated.prototype.resize = function() {
  var h = parseInt(this.element.style('height'), 10);
  var w = parseInt(this.element.style('width'), 10);
  var currentAspectRatio = h/w;

  if (currentAspectRatio > this.aspectRatio) {
    // container is highert than image
    var wrapperWidth = h / this.aspectRatio;
    var wrapperLeftOffset = (wrapperWidth - w) / 2;

    this.wrapper.style('width', wrapperWidth + 'px');
    this.wrapper.style('height', undefined);
    this.wrapper.style('top', undefined);
    this.wrapper.style('left', -wrapperLeftOffset + 'px');
  } else {
    // container is wider than image
    var wrapperHeight = w * this.aspectRatio;
    var wrapperTopOffset = (wrapperHeight - h) / 2;

    this.wrapper.style('width', undefined);
    this.wrapper.style('height', wrapperHeight + 'px');
    this.wrapper.style('top', -wrapperTopOffset + 'px');
    this.wrapper.style('left', undefined);
  }

};

Annotated.prototype._hotSpotOn = function(circle) {

  var cb = circle[0][0].getBoundingClientRect();
  var ib = this.svg[0][0].getBoundingClientRect();

  var d = {};

  // width from the left
  d.left = cb.left - ib.left - Math.abs(ib.left);
  // width from the right
  d.right = ib.right - cb.right  - Math.abs(ib.left);
  d.top = cb.top - ib.top;
  d.bottom = ib.bottom - cb.bottom;

  var toTheLeft = d.left >= d.right;
  var width = (toTheLeft ? d.left : d.right) * 0.9;

  this.captionContent
    .classed('left', toTheLeft)
    .html(circle.datum().caption);

  this.caption.style('width', width + 'px');
  var height = parseInt(this.captionContent.style('height'), 10);

  var captionLeft, captionTop;

  if (toTheLeft) {
    captionLeft = cb.left - width - d.left * 0.05;
  } else {
    captionLeft = cb.right + d.right * 0.05;
  }

  captionTop = cb.top + cb.height/2 - height/2;

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

Annotated.prototype.play = function() {
  if (this.video) {
    this.video[0][0].play();
  }
};

Annotated.prototype.stop = function() {
  if (this.video) {
    this.video[0][0].pause();
    this.video[0][0].currentTime = this.video[0][0].currentTime - 0.4;
  }
};



