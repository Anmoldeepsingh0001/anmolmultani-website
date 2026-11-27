/* Homepage slider calculator — Buy / Refinance / Renew.
   Rates come from RATES in settings.js. CTA uses the shared [data-apply] link. */
(function(){
  var root = document.getElementById('quickCalc');
  if(!root) return;

  var rates = (typeof RATES !== 'undefined' && RATES.length) ? RATES : [{ term:'5-Year Fixed', cat:'fixed', pct:'4.74' }];
  var rateIdx = 0;
  rates.forEach(function(r, i){ if(/5-year fixed/i.test(r.term)) rateIdx = i; });

  var mode = root.dataset.mode || 'buy';
  function showMode(){
    root.querySelectorAll('.qc-tab').forEach(function(x){ var on = x.dataset.mode === mode; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    root.querySelectorAll('[data-show]').forEach(function(el){ el.hidden = el.dataset.show.split(' ').indexOf(mode) < 0; });
  }
  var $ = function(id){ return document.getElementById(id); };
  var money = function(n){ return '$' + Math.round(n).toLocaleString('en-CA'); };

  // ---- rate chips
  var chipWrap = $('qcRates');
  chipWrap.innerHTML = rates.map(function(r, i){
    return '<button type="button" class="qc-chip' + (i === rateIdx ? ' on' : '') + '" data-i="' + i + '">' + r.term + ' <b>' + r.pct + '%</b></button>';
  }).join('');
  chipWrap.addEventListener('click', function(e){
    var b = e.target.closest('.qc-chip'); if(!b) return;
    rateIdx = +b.dataset.i;
    chipWrap.querySelectorAll('.qc-chip').forEach(function(c){ c.classList.toggle('on', c === b); });
    calc();
  });

  // ---- mode tabs
  root.querySelectorAll('.qc-tab').forEach(function(t){
    t.addEventListener('click', function(){
      mode = t.dataset.mode; showMode(); calc();
    });
  });

  root.querySelectorAll('input[type=range]').forEach(function(s){ s.addEventListener('input', calc); });

  // Canadian fixed-rate mortgages compound semi-annually.
  function payment(P, annualPct, years){
    var i = Math.pow(1 + annualPct / 200, 1 / 6) - 1, n = years * 12;
    return i === 0 ? P / n : P * i / (1 - Math.pow(1 + i, -n));
  }
  function interestOver(P, annualPct, pmt, months){
    var i = Math.pow(1 + annualPct / 200, 1 / 6) - 1, bal = P, paid = 0;
    for(var k = 0; k < months && bal > 0; k++){ var int = bal * i; paid += int; bal -= (pmt - int); }
    return paid;
  }
  // CMHC-style premium bands (share of the loan), +0.20% over 25 years.
  function premiumRate(ltv, years){
    var p = ltv <= 65 ? 0.6 : ltv <= 75 ? 1.7 : ltv <= 80 ? 2.4 : ltv <= 85 ? 2.8 : ltv <= 90 ? 3.1 : 4.0;
    return (p + (years > 25 ? 0.2 : 0)) / 100;
  }
  function minDownPct(price){
    if(price >= 1500000) return 20;
    var min = price <= 500000 ? price * 0.05 : 25000 + (price - 500000) * 0.10;
    return Math.ceil(min / price * 1000) / 10;
  }
  function fill(s){ var p = (s.value - s.min) / (s.max - s.min) * 100; s.style.setProperty('--p', p + '%'); }

  function calc(){
    var r = rates[rateIdx], pct = parseFloat(r.pct), termYrs = parseInt(r.term, 10) || 5;
    var amortS = $('qcAmort'), years = +amortS.value, loan = 0, note = '', prem = 0;

    if(mode === 'buy'){
      var price = +$('qcPrice').value, dpS = $('qcDown'), minPct = minDownPct(price);
      if(+dpS.value < minPct) dpS.value = minPct;
      var dp = +dpS.value, down = price * dp / 100, base = price - down;
      $('qcPriceV').textContent = money(price);
      $('qcDownV').textContent = dp.toFixed(1).replace('.0', '') + '% · ' + money(down);
      if(dp < 20){
        prem = base * premiumRate(base / price * 100, years);
        note = 'Under 20% down needs mortgage default insurance (about ' + money(prem) + ', added to the loan).';
        if(years > 25) note += ' Over 25 years with under 20% down is limited to first-time buyers and new builds.';
      }
      loan = base + prem;
      $('qcMinNote').textContent = 'Minimum down at this price: ' + minPct + '%';
    } else if(mode === 'refi'){
      var val = +$('qcValue').value, owS = $('qcOwing'), max = Math.floor(val * 0.8 / 5000) * 5000;
      owS.max = Math.max(max, +owS.min); if(+owS.value > max) owS.value = max;
      loan = +owS.value;
      $('qcValueV').textContent = money(val);
      $('qcOwingV').textContent = money(loan);
      note = 'Refinances can usually go up to 80% of your home’s value: ' + money(val * 0.8) + ' here.';
    } else {
      loan = +$('qcBal').value;
      $('qcBalV').textContent = money(loan);
      note = 'Shop your renewal before you sign your bank’s offer. Switching lenders at renewal often costs little or nothing.';
    }

    $('qcAmortV').textContent = years + ' years';
    var pmt = payment(loan, pct, years);
    $('qcPay').textContent = money(pmt);
    $('qcPayCap').textContent = 'At ' + pct.toFixed(2) + '% ' + r.term.toLowerCase() + ' over ' + years + ' years';
    $('qcLoan').textContent = money(loan);
    $('qcInt').textContent = money(interestOver(loan, pct, pmt, termYrs * 12));
    $('qcIntL').textContent = 'Interest over ' + termYrs + '-year term';
    $('qcNote').textContent = note;
    root.querySelectorAll('input[type=range]').forEach(fill);
  }
  showMode(); calc();
})();
