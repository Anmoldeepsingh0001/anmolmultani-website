/* ============================================================
   SHARED SITE BEHAVIOR — nav, reveal system, rendering from
   settings.js, smooth scroll. Loaded on every page after
   settings.js and the GSAP/Lenis CDN scripts.
   ============================================================ */

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var hasGsap = (typeof gsap !== 'undefined') && !reduceMotion;
var lenis = null;

/* ---- Reveal + counters: triple-backed (scroll + load + timer). Content can never stay hidden. ---- */
(function(){
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var nums    = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  var counted = [];

  function finalText(el){ return (el.dataset.prefix||'') + parseFloat(el.dataset.count).toLocaleString() + (el.dataset.suffix||''); }
  function runCount(el){
    if(counted.indexOf(el) !== -1) return; counted.push(el);
    var end = parseFloat(el.dataset.count), pre = el.dataset.prefix||'', suf = el.dataset.suffix||'', t0 = null, dur = 1600;
    function step(ts){ if(!t0) t0 = ts; var p = Math.min((ts-t0)/dur, 1); var v = Math.round(end*(1-Math.pow(1-p,3)));
      el.textContent = pre + v.toLocaleString() + suf; if(p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }
  function showAll(){ reveals.forEach(function(el){ el.classList.add('in'); }); nums.forEach(runCount); }

  if (reduceMotion){ reveals.forEach(function(el){ el.classList.add('in'); }); nums.forEach(function(el){ el.textContent = finalText(el); }); return; }

  function inView(el){ var r = el.getBoundingClientRect(); return r.top < (window.innerHeight * 0.9) && r.bottom > 0; }
  function check(){
    reveals.forEach(function(el){ if(!el.classList.contains('in') && inView(el)) el.classList.add('in'); });
    nums.forEach(function(el){ if(counted.indexOf(el) === -1 && inView(el)) runCount(el); });
  }

  // 1) IntersectionObserver — nice, precise
  if ('IntersectionObserver' in window){
    var ro = new IntersectionObserver(function(entries){
      entries.forEach(function(en){ if(en.isIntersecting){ en.target.classList.add('in'); if(en.target.dataset.count!==undefined) runCount(en.target); ro.unobserve(en.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(function(el){ ro.observe(el); });
    nums.forEach(function(el){ ro.observe(el); });
  }
  // 2) Scroll/resize/load fallback — reliable with smooth-scroll libraries
  window.addEventListener('scroll', check, { passive: true });
  window.addEventListener('resize', check, { passive: true });
  window.addEventListener('load', check);
  check();
  // 3) Final guarantee — if anything above misfires, nothing stays hidden
  setTimeout(showAll, 2600);
})();

/* ---- About text (homepage only — no-ops elsewhere) ---- */
(function(){
  var el = document.getElementById('aboutText');
  if(!el || typeof ABOUT_TEXT === 'undefined') return;
  el.innerHTML = ABOUT_TEXT.map(function(t){ return '<p class="lead">'+t+'</p>'; }).join('');
})();

/* ---- Team (homepage only — no-ops elsewhere) ---- */
(function(){
  var grid = document.getElementById('teamGrid');
  if(!grid || typeof TEAM === 'undefined') return;
  grid.innerHTML = TEAM.map(function(m){
    var initial = (m.name || '').trim().charAt(0).toUpperCase();
    var img = m.photo ? '<img src="'+m.photo+'" alt="" onerror="this.style.display=\'none\'">' : '';
    return '<div class="member glass">'+
      '<div class="av">'+img+initial+'</div>'+
      '<div><h4>'+m.name+'</h4><div class="role">'+m.role+'</div><p>'+m.bio+'</p></div>'+
      '</div>';
  }).join('');
})();

/* ---- Booking embed (homepage only — no-ops elsewhere) ---- */
(function(){
  var wrap = document.getElementById('bookingEmbed');
  if(!wrap) return;
  if (typeof BOOKING_LINK !== 'undefined' && BOOKING_LINK.trim()) {
    wrap.innerHTML = '<div class="booking-frame"><iframe src="' + BOOKING_LINK.trim() + '" title="Book a call with Anmol Multani"></iframe></div>';
  } else {
    wrap.innerHTML =
      '<div class="booking-fallback glass"><p>Online booking is coming soon — call, text, or email using the details above and I&rsquo;ll find a time that works for you.</p></div>';
  }
})();

/* ---- Lenders marquee (homepage only — no-ops elsewhere) ---- */
(function(){
  var track = document.getElementById('lendersTrack');
  if(!track || typeof LENDERS === 'undefined') return;
  // duplicated once so the -50% scroll animation loops seamlessly
  var doubled = LENDERS.concat(LENDERS);
  track.innerHTML = doubled.map(function(name){ return '<span>'+name+'</span>'; }).join('');
})();

/* ---- Reviews (homepage only — no-ops elsewhere) ---- */
(function(){
  var grid = document.getElementById('reviewsGrid');
  if(!grid || typeof REVIEWS === 'undefined') return;
  grid.innerHTML = REVIEWS.map(function(rv){
    var s = Math.max(0, Math.min(5, rv.stars || 5));
    var stars = '★★★★★'.slice(0, s) + '☆☆☆☆☆'.slice(0, 5 - s);
    return '<div class="review-card glass">'+
      '<div class="stars" aria-label="'+s+' out of 5 stars">'+stars+'</div>'+
      '<p class="quote">“'+rv.quote+'”</p>'+
      '<div class="who"><b>'+rv.name+'</b><span>'+(rv.detail||'')+'</span></div>'+
      '</div>';
  }).join('');
})();

/* ---- Start-application buttons (any page) ---- */
(function(){
  var url = (typeof APPLICATION_LINK !== 'undefined' && APPLICATION_LINK.trim()) ? APPLICATION_LINK.trim() : '#contact';
  document.querySelectorAll('[data-apply]').forEach(function(a){
    a.setAttribute('href', url);
    a.style.cursor = 'pointer';
    if(url.indexOf('http') === 0){ a.setAttribute('target','_blank'); a.setAttribute('rel','noopener'); }
  });
})();

/* ---- Rate table + tab switching (homepage only — no-ops elsewhere) ---- */
(function(){
  var body = document.getElementById('rateBody');
  var tabs = document.querySelectorAll('#rateTabs .rtab');
  if(!body || typeof RATES === 'undefined') return;
  function exPay(pct){
    var r = parseFloat(pct), n = 300, loan = 400000;
    var mr = r <= 0 ? 0 : Math.pow(1 + (r/100)/2, 1/6) - 1;
    var p = mr === 0 ? loan/n : loan * mr * Math.pow(1+mr,n) / (Math.pow(1+mr,n)-1);
    return '$' + Math.round(p).toLocaleString();
  }
  function buildTable(cat){
    body.innerHTML = RATES.filter(function(r){ return r.cat === cat; }).map(function(r){
      return '<tr>'+
        '<td><b>'+r.term+'</b></td>'+
        '<td><div class="r-pct">'+r.pct+'%</div><div class="r-ex">per year</div></td>'+
        '<td><div class="r-pct" style="font-size:1.3rem">'+exPay(r.pct)+'<span style="font-size:.8rem;font-weight:400;color:var(--muted)">/mo</span></div></td>'+
        '<td class="r-note">'+r.note+'</td>'+
        '</tr>';
    }).join('');
  }
  buildTable('fixed');
  tabs.forEach(function(tab){
    tab.addEventListener('click', function(){
      tabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      buildTable(tab.dataset.tab);
    });
  });
})();

// smooth scroll
if (typeof Lenis !== 'undefined' && !reduceMotion) {
  lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  if (hasGsap) {
    lenis.on('scroll', function(){ if (ScrollTrigger) ScrollTrigger.update(); });
    gsap.ticker.add(function(t){ lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  } else {
    function raf(t){ lenis.raf(t); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  }
}

// nav: header style + smooth-scroll links
var header = document.getElementById('header');
function onScroll(){ if(header) header.classList.toggle('scrolled', (window.scrollY || document.documentElement.scrollTop) > 8); }
window.addEventListener('scroll', onScroll); if (lenis) lenis.on('scroll', onScroll); onScroll();

document.querySelectorAll('[data-scroll]').forEach(function(a){
  a.addEventListener('click', function(e){
    var href = a.getAttribute('href');
    if(!href || href.charAt(0) !== '#') return;
    var target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    if (lenis) lenis.scrollTo(target, { offset: -66 });
    else target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });
  });
});

// glass slider that glides under whichever top-level nav item is hovered
(function(){
  var menu = document.querySelector('.menu');
  if(!menu) return;
  var slider = document.createElement('div');
  slider.className = 'menu-slider glass';
  menu.appendChild(slider);
  var items = Array.prototype.slice.call(menu.children).filter(function(el){ return el.tagName === 'LI'; });
  function moveTo(li){
    var link = li.querySelector('a');
    if(!link) return;
    var mRect = menu.getBoundingClientRect(), r = link.getBoundingClientRect();
    slider.style.left  = (r.left - mRect.left - 14) + 'px';
    slider.style.width = (r.width + 28) + 'px';
    slider.classList.add('show');
  }
  items.forEach(function(li){ li.addEventListener('mouseenter', function(){ moveTo(li); }); });
  menu.addEventListener('mouseleave', function(){ slider.classList.remove('show'); });
})();

// hero + statement animations (homepage only — guarded so other pages don't warn)
if (hasGsap) {
  gsap.registerPlugin(ScrollTrigger);

  if (document.querySelector('.hero-title')) {
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
    tl.from('.hero-eyebrow', { opacity: 0, y: 18, duration: .7 })
      .from('.hero-title .line', { opacity: 0, yPercent: 110, duration: 1, stagger: .12 }, '-=.3')
      .from('.hero-sub', { opacity: 0, y: 18, duration: .8 }, '-=.6')
      .from('.hero-cta', { opacity: 0, y: 18, duration: .8 }, '-=.6');
  }

  if (document.querySelector('.stmt')) {
    var words = gsap.utils.toArray('.stmt .w');
    gsap.set(words, { opacity: .18 });
    gsap.to(words, { opacity: 1, stagger: 1, ease: 'none',
      scrollTrigger: { trigger: '.stmt', start: 'top top', end: '+=140%', scrub: true, pin: true } });
  }

  // Web fonts and images can finish loading after ScrollTrigger first measures the
  // page, leaving stale pin spacing (blank gaps). Re-measure once everything settles.
  window.addEventListener('load', function(){ ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function(){ ScrollTrigger.refresh(); });
  }
}

// mobile menu
(function(){
  var hamb = document.getElementById('hamb'), mm = document.getElementById('mobileMenu');
  if(!hamb || !mm) return;
  function close(){ mm.classList.remove('open'); hamb.classList.remove('open'); hamb.setAttribute('aria-expanded','false'); }
  hamb.addEventListener('click', function(){
    var open = mm.classList.toggle('open');
    hamb.classList.toggle('open', open);
    hamb.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  mm.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', close); });
})();
