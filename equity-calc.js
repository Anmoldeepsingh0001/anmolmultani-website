/* Reverse mortgage / home equity estimator (reverse-mortgage.html). Estimates only. */
(function(){
  var root = document.getElementById('equityCalc');
  if(!root) return;
  var $ = function(id){ return document.getElementById(id); };
  var money = function(n){ return '$' + (Math.round(n / 1000) * 1000).toLocaleString('en-CA'); };
  var mode = 'reverse';

  root.querySelectorAll('.qc-tab').forEach(function(t){
    t.addEventListener('click', function(){
      mode = t.dataset.mode;
      root.querySelectorAll('.qc-tab').forEach(function(x){ x.classList.toggle('on', x === t); x.setAttribute('aria-selected', x === t); });
      root.querySelectorAll('[data-show]').forEach(function(el){ el.hidden = el.dataset.show !== mode; });
      calc();
    });
  });
  root.querySelectorAll('input[type=range]').forEach(function(s){ s.addEventListener('input', calc); });

  // Rough share of home value available by age of the youngest borrower.
  // Real offers depend on lender, property type and location.
  function reversePct(age){ return Math.min(0.55, Math.max(0.20, 0.20 + (age - 55) * 0.01)); }
  function fill(s){ s.style.setProperty('--p', ((s.value - s.min) / (s.max - s.min) * 100) + '%'); }

  function calc(){
    var val = +$('ecValue').value, owe = +$('ecOwe').value;
    if(owe > val){ $('ecOwe').value = val; owe = val; }
    $('ecValueV').textContent = money(val);
    $('ecOweV').textContent = owe ? money(owe) : 'None';
    var head, big, rows, note, cta;

    if(mode === 'reverse'){
      var age = +$('ecAge').value, hi = val * reversePct(age), lo = val * Math.max(0.15, reversePct(age) - 0.05);
      $('ecAgeV').textContent = age + (age >= 95 ? '+' : '') + ' years';
      head = 'Estimated reverse mortgage';
      big = money(lo) + '&ndash;' + money(hi);
      var cashLo = Math.max(0, lo - owe), cashHi = Math.max(0, hi - owe);
      rows = [['Share of home value', Math.round(reversePct(age) * 100 - 5) + '&ndash;' + Math.round(reversePct(age) * 100) + '%'],
              ['Pays off what you owe', owe ? money(owe) : '$0'],
              ['Tax-free cash to you', cashHi ? money(cashLo) + '&ndash;' + money(cashHi) : '$0']];
      note = owe > hi ? 'What you owe is more than the estimate. Let’s talk: a partial paydown or another option may work better.'
                      : 'No monthly mortgage payments required. Interest is added to the balance and repaid when you sell or move.';
    } else {
      var limit = Math.max(0, Math.min(val * 0.80 - owe, val * 0.65));
      head = 'Estimated home equity available';
      big = money(limit);
      rows = [['Max total borrowing (80%)', money(val * 0.8)],
              ['Minus what you owe', owe ? '&minus;' + money(owe) : '$0'],
              ['Line of credit cap (65%)', money(val * 0.65)]];
      note = limit ? 'A home equity line of credit or refinance needs regular payments and must qualify on income and credit.'
                   : 'At this balance there isn’t room under the 80% limit. A reverse mortgage (55+) may still work.';
    }
    $('ecHead').textContent = head;
    $('ecBig').innerHTML = big;
    $('ecRows').innerHTML = rows.map(function(r){ return '<div><span>' + r[0] + '</span><b>' + r[1] + '</b></div>'; }).join('');
    $('ecNote').textContent = note;
    root.querySelectorAll('input[type=range]').forEach(fill);
  }
  calc();
})();
