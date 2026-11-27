/* Reverse mortgage / home equity line estimator. Estimates only.
   Used on reverse-mortgage.html, reverse-mortgage-calculator.html and
   home-equity-line-of-credit.html (data-mode="heloc"). */
(function(){
  var root = document.getElementById('equityCalc');
  if(!root) return;
  var $ = function(id){ return document.getElementById(id); };
  var money = function(n){ return '$' + (Math.round(n / 1000) * 1000).toLocaleString('en-CA'); };
  var mode = root.dataset.mode || 'reverse';
  var homeType = 'house', area = 'urban', owners = 1;

  function showMode(){
    root.querySelectorAll('.qc-tab').forEach(function(x){ var on = x.dataset.mode === mode; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    root.querySelectorAll('[data-show]').forEach(function(el){ el.hidden = el.dataset.show !== mode; });
  }
  root.querySelectorAll('.qc-tab').forEach(function(t){
    t.addEventListener('click', function(){ mode = t.dataset.mode; showMode(); calc(); });
  });
  // segmented choices: owners / home type / area
  root.querySelectorAll('.qc-chips[data-pick]').forEach(function(g){
    g.addEventListener('click', function(e){
      var b = e.target.closest('.qc-chip'); if(!b) return;
      g.querySelectorAll('.qc-chip').forEach(function(c){ c.classList.toggle('on', c === b); });
      var k = g.dataset.pick, v = b.dataset.v;
      if(k === 'owners'){ owners = +v; var s = $('ecAge2f'); if(s) s.hidden = owners < 2; }
      if(k === 'type') homeType = v;
      if(k === 'area') area = v;
      calc();
    });
  });
  root.querySelectorAll('input[type=range]').forEach(function(s){ s.addEventListener('input', calc); });

  // Share of appraised value (low end of range) by age of the YOUNGEST owner.
  // Calibrated Nov 2026 to HomeEquity Bank quotes for a $450k house in Stratford, PEI:
  // 60 -> 26.1%, 70 -> 35.7%, 80 -> 51.4%; condo at 70 -> 27.7% (x0.776).
  // The top of their range is always 10% above the low end. Ages past 80 are held flat
  // (no data yet), and the rural factor is a placeholder until we have a rural quote.
  function reversePct(age){
    var d = Math.min(age, 80) - 60;
    var p = (26.11 + 0.6455 * d + 0.03105 * d * d) / 100;
    if(homeType === 'condo') p *= 0.776;
    if(area === 'rural') p *= 0.85;
    return Math.max(0.10, p);
  }
  function fill(s){ s.style.setProperty('--p', ((s.value - s.min) / (s.max - s.min) * 100) + '%'); }

  function calc(){
    var val = +$('ecValue').value, owe = +$('ecOwe').value;
    if(owe > val){ $('ecOwe').value = val; owe = val; }
    $('ecValueV').textContent = money(val);
    $('ecOweV').textContent = owe ? money(owe) : 'None';
    var head, big, rows, note;

    if(mode === 'reverse'){
      var a1 = +$('ecAge').value, a2El = $('ecAge2'), age = a1;
      $('ecAgeV').textContent = a1 + (a1 >= 95 ? '+' : '');
      if(a2El){ $('ecAge2V').textContent = a2El.value + (+a2El.value >= 95 ? '+' : ''); if(owners > 1) age = Math.min(a1, +a2El.value); }
      var pct = reversePct(age), r500 = function(n){ return Math.round(n / 500) * 500; };
      var lo = r500(val * pct), hi = Math.round(lo * 1.1 / 50) * 50, cashLo = Math.max(0, lo - owe), cashHi = Math.max(0, hi - owe);
      var fmt = function(n){ return '$' + n.toLocaleString('en-CA'); };
      head = 'You may be eligible for';
      big = fmt(lo) + '&ndash;' + fmt(hi);
      rows = [['Share of home value', Math.round(pct * 100) + '&ndash;' + Math.round(pct * 110) + '%'],
              ['Based on youngest owner\u2019s age', age],
              ['Pays off what you owe', owe ? '&minus;' + money(owe) : '$0'],
              ['Tax-free cash left for you', cashHi ? fmt(r500(cashLo)) + '&ndash;' + fmt(r500(cashHi)) : '$0']];
      note = owe > hi ? 'What you owe is more than this estimate. Let\u2019s talk: a partial paydown or another option may work better.'
                      : 'No regular mortgage payments required. Interest is added to the balance and repaid when you sell or move.';
    } else {
      var limit = Math.max(0, Math.min(val * 0.80 - owe, val * 0.65));
      head = 'Estimated home equity available';
      big = money(limit);
      rows = [['Max total borrowing (80% of value)', money(val * 0.8)],
              ['Minus what you owe', owe ? '&minus;' + money(owe) : '$0'],
              ['Line of credit cap (65% of value)', money(val * 0.65)]];
      note = limit ? 'A home equity line needs at least interest-only payments and must qualify on income and credit.'
                   : 'At this balance there isn’t room under the 80% limit. If you’re 55+, a reverse mortgage may still work.';
    }
    $('ecHead').textContent = head;
    $('ecBig').innerHTML = big;
    $('ecRows').innerHTML = rows.map(function(r){ return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    $('ecNote').textContent = note;
    root.querySelectorAll('input[type=range]').forEach(fill);
  }
  showMode(); calc();
})();
