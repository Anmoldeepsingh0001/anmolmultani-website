/* Service-page calculators: pre-approval, renewal comparison, debt consolidation.
   Each looks for its own root element and quietly does nothing if it's absent. */
(function(){
  var $ = function(id){ return document.getElementById(id); };
  var money = function(n){ return '$' + Math.round(n).toLocaleString('en-CA'); };
  var k = function(n){ return '$' + (Math.round(n / 1000) * 1000).toLocaleString('en-CA'); };
  function fill(s){ s.style.setProperty('--p', ((s.value - s.min) / (s.max - s.min) * 100) + '%'); }
  // Canadian fixed-rate mortgages compound semi-annually.
  function mRate(pct){ return Math.pow(1 + pct / 200, 1 / 6) - 1; }
  function pmt(P, pct, yrs){ var i = mRate(pct), n = yrs * 12; return i ? P * i / (1 - Math.pow(1 + i, -n)) : P / n; }
  function pv(pay, pct, yrs){ var i = mRate(pct), n = yrs * 12; return i ? pay * (1 - Math.pow(1 + i, -n)) / i : pay * n; }
  function interestOver(P, pct, pay, months){ var i = mRate(pct), b = P, t = 0; for(var m = 0; m < months && b > 0; m++){ var x = b * i; t += x; b -= pay - x; } return t; }
  function fiveYr(){ var r = (typeof RATES !== 'undefined') ? RATES.filter(function(x){ return /5-year fixed/i.test(x.term); })[0] : null; return r ? parseFloat(r.pct) : 4.74; }
  function wire(root, calc){ root.querySelectorAll('input[type=range]').forEach(function(s){ s.addEventListener('input', function(){ calc(); root.querySelectorAll('input[type=range]').forEach(fill); }); }); calc(); root.querySelectorAll('input[type=range]').forEach(fill); }
  function rows(id, list){ $(id).innerHTML = list.map(function(r){ return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join(''); }

  // ---- Pre-approval: how much house could you qualify for?
  var pa = $('preCalc');
  if(pa) wire(pa, function(){
    var inc = +$('paInc').value, debt = +$('paDebt').value, down = +$('paDown').value, rate = fiveYr();
    var stress = Math.max(rate + 2, 5.25), mi = inc / 12;
    var heat = 100, taxRate = 0.01 / 12;   // rough heating + property tax
    $('paIncV').textContent = money(inc); $('paDebtV').textContent = money(debt) + '/mo'; $('paDownV').textContent = money(down);
    // Solve for price where GDS <= 39% and TDS <= 44% at the stress-test rate.
    var price = 0;
    for(var p = 50000; p <= 3000000; p += 5000){
      var loan = Math.max(0, p - down), housing = pmt(loan, stress, 25) + heat + p * taxRate;
      if(housing > mi * 0.39 || housing + debt > mi * 0.44) break;
      price = p;
    }
    var minDown = price <= 500000 ? price * 0.05 : 25000 + (price - 500000) * 0.10;
    while(price > 0 && down < minDown){ price -= 5000; minDown = price <= 500000 ? price * 0.05 : 25000 + (price - 500000) * 0.10; }
    $('paBig').textContent = k(price);
    rows('paRows', [['Mortgage amount', k(Math.max(0, price - down))], ['Qualifying (stress test) rate', stress.toFixed(2) + '%'], ['Payment at ' + rate.toFixed(2) + '%', money(pmt(Math.max(0, price - down), rate, 25)) + '/mo']]);
    $('paNote').textContent = price ? 'Based on standard debt-service limits and the federal stress test. Your actual approval depends on credit, income type and the lender.' : 'At these numbers it’s tight. Let’s look at options together.';
  });

  // ---- Renewal: your bank's offer vs a shopped rate
  var rn = $('renCalc');
  if(rn) wire(rn, function(){
    var bal = +$('rnBal').value, yrs = +$('rnYrs').value, bank = +$('rnBank').value, ours = fiveYr();
    $('rnBalV').textContent = k(bal); $('rnYrsV').textContent = yrs + ' years'; $('rnBankV').textContent = bank.toFixed(2) + '%';
    var pb = pmt(bal, bank, yrs), po = pmt(bal, ours, yrs), save = pb - po;
    var intB = interestOver(bal, bank, pb, 60), intO = interestOver(bal, ours, po, 60);
    $('rnBig').textContent = save > 0 ? money(save) + '/mo' : '$0/mo';
    rows('rnRows', [['Your bank’s offer', money(pb) + '/mo at ' + bank.toFixed(2) + '%'], ['Shopped rate', money(po) + '/mo at ' + ours.toFixed(2) + '%'], ['Interest saved over 5 years', save > 0 ? money(intB - intO) : '$0']]);
    $('rnNote').textContent = save > 0 ? 'Switching at maturity usually means a new appraisal and legal work, which lenders often cover. We’ll confirm the details for your file.' : 'Your bank’s offer is already competitive with today’s posted rate. We can still check for better terms.';
  });

  // ---- Debt consolidation: roll high-interest debt into the mortgage
  var dc = $('debtCalc');
  if(dc) wire(dc, function(){
    var debt = +$('dcDebt').value, apr = +$('dcRate').value, pay = +$('dcPay').value, rate = fiveYr();
    $('dcDebtV').textContent = k(debt); $('dcRateV').textContent = apr + '%'; $('dcPayV').textContent = money(pay) + '/mo';
    var newPay = pmt(debt, rate, 25), free = pay - newPay;
    var intOld = debt * apr / 100, intNew = debt * rate / 100;
    $('dcBig').textContent = free > 0 ? money(free) + '/mo' : '$0/mo';
    rows('dcRows', [['Today’s payments on these debts', money(pay) + '/mo'], ['Same debt in your mortgage', money(newPay) + '/mo at ' + rate.toFixed(2) + '%'], ['First-year interest, before → after', money(intOld) + ' → ' + money(intNew)]]);
    $('dcNote').textContent = 'Spreading debt over a longer mortgage term can cost more interest overall. Putting your monthly savings toward the mortgage keeps you ahead.';
  });
})();
