/* ============================================================
   Smith Manoeuvre calculator charts — plain SVG, no external
   charting library, built per the site's dataviz conventions:
   2px lines, hairline gridlines, legend for 2+ series, hover
   crosshair + tooltip, direct end-labels, dark-mode aware via
   the --viz-* custom properties below (mapped from the site's
   own --ink/--muted/--line/--accent tokens).
   ============================================================ */

(function(){
  var SVGNS = 'http://www.w3.org/2000/svg';

  function el(tag, attrs){
    var e = document.createElementNS(SVGNS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function fmtMoney(n){
    if (!isFinite(n)) n = 0;
    if (Math.abs(n) >= 1000000) return '$' + (n/1000000).toFixed(n >= 10000000 ? 0 : 1) + 'M';
    if (Math.abs(n) >= 1000) return '$' + Math.round(n/1000) + 'K';
    return '$' + Math.round(n);
  }

  function niceMax(v){
    if (v <= 0) return 100;
    var p = Math.pow(10, Math.floor(Math.log10(v)));
    var n = v / p;
    var step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * p;
  }

  // Renders a line chart into `container`. `series` = [{name, color, dashed, data:[{x,y}]}]
  function renderChart(container, series, opts){
    opts = opts || {};
    container.innerHTML = '';
    var w = container.clientWidth || 560, h = 280;
    var padL = 54, padR = 16, padT = 16, padB = 30;
    var plotW = w - padL - padR, plotH = h - padT - padB;

    var allX = [], allY = [0];
    series.forEach(function(s){ s.data.forEach(function(p){ allX.push(p.x); allY.push(p.y); }); });
    var maxX = Math.max.apply(null, allX);
    var maxY = niceMax(Math.max.apply(null, allY) * 1.08);

    function xPix(x){ return padL + (x/maxX)*plotW; }
    function yPix(y){ return padT + plotH - (y/maxY)*plotH; }

    var svg = el('svg', { viewBox: '0 0 ' + w + ' ' + h, width: '100%', height: h, role: 'img',
      'aria-label': opts.ariaLabel || 'Line chart' });

    // gridlines (horizontal, hairline) + y-axis labels
    var ticks = 4;
    for (var i = 0; i <= ticks; i++){
      var gy = padT + plotH - (i/ticks)*plotH;
      var gval = (maxY/ticks)*i;
      svg.appendChild(el('line', { x1: padL, x2: w-padR, y1: gy, y2: gy, class: 'viz-grid' }));
      var lbl = el('text', { x: padL - 8, y: gy + 4, class: 'viz-axis-label', 'text-anchor': 'end' });
      lbl.textContent = fmtMoney(gval);
      svg.appendChild(lbl);
    }
    // baseline
    svg.appendChild(el('line', { x1: padL, x2: w-padR, y1: padT+plotH, y2: padT+plotH, class: 'viz-axis' }));

    // x-axis year labels (every ~5 years, plus final)
    var xTickEvery = maxX > 20 ? 5 : maxX > 10 ? 2 : 1;
    for (var xy = 0; xy <= maxX; xy += xTickEvery){
      var lx = el('text', { x: xPix(xy), y: padT+plotH+20, class: 'viz-axis-label', 'text-anchor': 'middle' });
      lx.textContent = 'Yr ' + xy;
      svg.appendChild(lx);
    }

    // series lines + area fill (single-series charts get a subtle fill)
    var linePaths = [];
    series.forEach(function(s){
      if (opts.areaFill && series.length === 1){
        var areaD = 'M ' + xPix(s.data[0].x) + ' ' + yPix(0);
        s.data.forEach(function(p){ areaD += ' L ' + xPix(p.x) + ' ' + yPix(p.y); });
        areaD += ' L ' + xPix(s.data[s.data.length-1].x) + ' ' + yPix(0) + ' Z';
        svg.appendChild(el('path', { d: areaD, fill: s.color, opacity: '0.1', stroke: 'none' }));
      }
      var d = s.data.map(function(p,i){ return (i===0?'M ':'L ') + xPix(p.x) + ' ' + yPix(p.y); }).join(' ');
      var path = el('path', { d: d, fill: 'none', stroke: s.color, 'stroke-width': '2',
        'stroke-linejoin': 'round', 'stroke-linecap': 'round',
        'stroke-dasharray': s.dashed ? '6 5' : 'none' });
      svg.appendChild(path);
      linePaths.push({ series: s, path: path });

      // end marker + direct label
      var last = s.data[s.data.length-1];
      var ex = xPix(last.x), ey = yPix(last.y);
      svg.appendChild(el('circle', { cx: ex, cy: ey, r: '4', fill: s.color, stroke: 'var(--viz-surface)', 'stroke-width': '2' }));
      if (s.endLabel){
        var elx = ex - 6;
        var t = el('text', { x: elx, y: ey - 10, class: 'viz-end-label', 'text-anchor': 'end' });
        t.textContent = s.endLabel;
        svg.appendChild(t);
      }
    });

    container.appendChild(svg);

    // legend (only when 2+ series)
    if (series.length > 1){
      var legend = document.createElement('div');
      legend.className = 'viz-legend';
      series.forEach(function(s){
        var item = document.createElement('span');
        item.className = 'viz-legend-item';
        var key = document.createElement('span');
        key.className = 'viz-legend-key';
        key.style.background = s.color;
        if (s.dashed) key.classList.add('dashed');
        var label = document.createElement('span');
        label.textContent = s.name;
        item.appendChild(key); item.appendChild(label);
        legend.appendChild(item);
      });
      container.appendChild(legend);
    }

    // hover crosshair + tooltip (one tooltip listing every series at that x)
    var hitRect = el('rect', { x: padL, y: padT, width: plotW, height: plotH, fill: 'transparent' });
    svg.appendChild(hitRect);
    var crosshair = el('line', { x1:0, x2:0, y1: padT, y2: padT+plotH, class: 'viz-crosshair', style: 'display:none' });
    svg.appendChild(crosshair);

    var tooltip = document.createElement('div');
    tooltip.className = 'viz-tooltip';
    tooltip.style.display = 'none';
    container.style.position = 'relative';
    container.appendChild(tooltip);

    function nearestX(px){
      var xVal = ((px - padL) / plotW) * maxX;
      return Math.max(0, Math.min(maxX, Math.round(xVal)));
    }
    function pointAt(s, xv){
      var best = s.data[0], bestDiff = Infinity;
      s.data.forEach(function(p){ var d = Math.abs(p.x - xv); if (d < bestDiff){ bestDiff = d; best = p; } });
      return best;
    }

    function onMove(e){
      var rect = svg.getBoundingClientRect();
      var scaleX = w / rect.width;
      var px = (e.clientX - rect.left) * scaleX;
      var xv = nearestX(px);
      var sx = xPix(xv);
      crosshair.setAttribute('x1', sx); crosshair.setAttribute('x2', sx);
      crosshair.style.display = 'block';

      var rows = series.map(function(s){
        var p = pointAt(s, xv);
        return '<div class="viz-tooltip-row"><span class="viz-tooltip-key" style="background:' + s.color + '"></span>' +
          '<span class="viz-tooltip-name"></span><b class="viz-tooltip-val"></b></div>';
      });
      tooltip.innerHTML = '<div class="viz-tooltip-title"></div>' + rows.join('');
      tooltip.querySelector('.viz-tooltip-title').textContent = 'Year ' + xv;
      series.forEach(function(s, i){
        var p = pointAt(s, xv);
        var row = tooltip.querySelectorAll('.viz-tooltip-row')[i];
        row.querySelector('.viz-tooltip-name').textContent = s.name;
        row.querySelector('.viz-tooltip-val').textContent = fmtMoney(p.y);
      });

      var left = (sx / w) * container.clientWidth + 12;
      if (left + 160 > container.clientWidth) left = (sx / w) * container.clientWidth - 172;
      tooltip.style.left = left + 'px';
      tooltip.style.top = '8px';
      tooltip.style.display = 'block';
    }
    function onLeave(){ crosshair.style.display = 'none'; tooltip.style.display = 'none'; }

    hitRect.addEventListener('pointermove', onMove);
    hitRect.addEventListener('pointerleave', onLeave);
  }

  window.renderSmithManoeuvreCharts = function(result){
    var yearsSaved = null;
    var baselineFinalYear = result.baselineSnapshots[result.baselineSnapshots.length-1].year;

    renderChart(document.getElementById('chartMortgage'), [
      { name: 'Standard amortization', color: 'var(--viz-muted)', dashed: true,
        data: result.baselineSnapshots.map(function(s){ return {x:s.year, y:s.balance}; }) },
      { name: 'Smith Manoeuvre', color: 'var(--viz-accent)', dashed: false,
        data: result.smSnapshots.map(function(s){ return {x:s.year, y:s.balance}; }),
        // only this line gets an end-label — the two lines finish close enough on the
        // x-axis that labeling both collides (dataviz anti-pattern); this is the series
        // the chart's story is about, and the legend + tooltip still carry the other.
        endLabel: 'Paid off in ' + result.yearsTaken.toFixed(1) + ' yrs' }
    ], { ariaLabel: 'Mortgage balance over time, standard versus Smith Manoeuvre' });

    renderChart(document.getElementById('chartPortfolio'), [
      { name: 'Investment portfolio', color: 'var(--viz-accent)', dashed: false,
        data: result.smSnapshots.map(function(s){ return {x:s.year, y:s.portfolio}; }),
        endLabel: fmtMoney(result.smSnapshots[result.smSnapshots.length-1].portfolio) }
    ], { areaFill: true, ariaLabel: 'Projected investment portfolio value over time' });
  };
})();
