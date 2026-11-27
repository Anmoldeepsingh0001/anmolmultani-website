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

  // Approximate share of appraised value by age of the YOUNGEST owner, then
  // trimmed for condos and rural properties. Real offers depend on the lender.
  function reversePct(age){
    var p = Math.min(0.55, Math.max(0.20, 0.20 + (age - 55) * 0.01));
    if(homeType === 'condo') p -= 0.05;
    if(area === 'rural') p -= 0.05;
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
      var pct = reversePct(age), amt = val * pct, cash = Math.max(0, amt - owe);
      head = 'You could get up to';
      big = money(amt);
      rows = [['Share of home value', 'about ' + Math.round(pct * 100) + '%'],
              ['Based on youngest owner’s age', age],
              ['Pays off what you owe', owe ? '&minus;' + money(owe) : '$0'],
              ['Tax-free cash left for you', money(cash)]];
      note = owe > amt ? 'What you owe is more than this estimate. Let’s talk: a partial paydown or another option may work better.'
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
