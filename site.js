/* ============================================================
   SHARED SITE BEHAVIOR — nav, reveal system, rendering from
   settings.js, smooth scroll. Loaded on every page after
   settings.js and the GSAP/Lenis CDN scripts.
   ============================================================ */

var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var hasGsap = (typeof gsap !== 'undefined') && !reduceMotion;
var lenis = null;

/* ---- Subtle cursor spotlight on dark hero/statement sections — desktop pointer
   only (skipped on touch devices, which have no hover cursor) and reduced-motion-safe. ---- */
if (!reduceMotion && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
  Array.prototype.slice.call(document.querySelectorAll('.hero, .stmt')).forEach(function(sec){
    sec.addEventListener('mouseenter', function(){ sec.classList.add('cursor-active'); });
    sec.addEventListener('mouseleave', function(){ sec.classList.remove('cursor-active'); });
    sec.addEventListener('mousemove', function(e){
      var r = sec.getBoundingClientRect();
      sec.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
      sec.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    });
  });
}

/* ---- Theme toggle (sun/moon button) — the early inline script in <head> already
   applies any saved theme before first paint; this just wires the click. ---- */
(function(){
  var btn = document.getElementById('themeToggle');
  if(!btn) return;
  btn.addEventListener('click', function(){
    var current = document.documentElement.getAttribute('data-theme');
    var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var effectiveDark = current === 'dark' || (!current && systemDark);
    var next = effectiveDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch(e) {}
  });
})();

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

/* ---- Social icons in the footer (any page) ---- */
(function(){
  var el = document.getElementById('socialIcons');
  if(!el || typeof SOCIAL === 'undefined') return;
  var ICONS = {
    instagram: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.2c3.2 0 3.6 0 4.9.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8 0 3.2 0 3.6-.1 4.8-.1 3.2-1.6 4.8-4.9 4.9-1.3.1-1.6.1-4.9.1-3.2 0-3.6 0-4.8-.1-3.3-.1-4.8-1.7-4.9-4.9-.1-1.3-.1-1.6-.1-4.8 0-3.2 0-3.6.1-4.8.1-3.3 1.7-4.8 4.9-4.9 1.3-.1 1.6-.1 4.8-.1M12 0C8.7 0 8.3 0 7 .1 2.7.3.3 2.7.1 7 0 8.3 0 8.7 0 12s0 3.7.1 5c.2 4.3 2.6 6.7 6.9 6.9 1.3.1 1.7.1 5 .1s3.7 0 5-.1c4.3-.2 6.7-2.6 6.9-6.9.1-1.3.1-1.7.1-5s0-3.7-.1-5C23.7 2.7 21.3.3 17 .1 15.7 0 15.3 0 12 0zm0 5.8A6.2 6.2 0 1 0 18.2 12 6.2 6.2 0 0 0 12 5.8zm0 10.2A4 4 0 1 1 16 12a4 4 0 0 1-4 4zm6.4-10.4a1.4 1.4 0 1 1-1.4-1.4 1.4 1.4 0 0 1 1.4 1.4z"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 5.82c-.9-.8-1.4-2-1.5-3.32h-3.1v12.6c0 1.4-1.1 2.6-2.6 2.6-1.4 0-2.6-1.2-2.6-2.6 0-1.7 1.7-3 3.4-2.5V9.7c-3.5-.5-6.5 2.2-6.5 5.6 0 3.3 2.8 5.7 5.7 5.7 3.1 0 5.7-2.6 5.7-5.7V9c1.2.9 2.7 1.4 4.3 1.4V7.3s-1.9.1-3.2-1.48z"/></svg>',
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23.5 6.2s-.2-1.6-.9-2.4c-.9-.9-1.9-.9-2.3-1C17.1 2.5 12 2.5 12 2.5h0s-5.1 0-8.3.3c-.4 0-1.4.1-2.3 1-.7.7-.9 2.4-.9 2.4S.2 8.1.2 10v1.9c0 1.9.2 3.8.2 3.8s.2 1.6.9 2.4c.9.9 2 .9 2.5 1 1.8.2 7.7.3 7.7.3s5.1 0 8.3-.3c.4 0 1.4-.1 2.3-1 .7-.7.9-2.4.9-2.4s.2-1.9.2-3.8V10c0-1.9-.2-3.8-.2-3.8zM9.7 14.6V7.9l6.4 3.4-6.4 3.3z"/></svg>'
  };
  var labels = { instagram: 'Instagram', tiktok: 'TikTok', youtube: 'YouTube' };
  var html = '';
  ['instagram', 'tiktok', 'youtube'].forEach(function(key){
    if (SOCIAL[key] && SOCIAL[key].trim()) {
      html += '<a href="'+SOCIAL[key].trim()+'" target="_blank" rel="noopener" aria-label="'+labels[key]+'">'+ICONS[key]+'</a>';
    }
  });
  el.innerHTML = html;
})();

/* ---- Book-a-call buttons (any page). Google doesn't allow its booking
   page to be embedded in an iframe, so this opens it in a new tab instead. ---- */
(function(){
  var links = document.querySelectorAll('[data-book]');
  if(!links.length) return;
  var hasLink = typeof BOOKING_LINK !== 'undefined' && BOOKING_LINK.trim();
  links.forEach(function(a){
    if (hasLink) {
      a.setAttribute('href', BOOKING_LINK.trim());
    } else {
      a.style.display = 'none';
    }
  });
})();

/* ---- Lenders marquee (homepage only — no-ops elsewhere) ---- */
(function(){
  var track = document.getElementById('lendersTrack');
  if(!track || typeof LENDERS === 'undefined') return;
  // duplicated once so the -50% scroll animation loops seamlessly
  var doubled = LENDERS.concat(LENDERS);
  track.innerHTML = doubled.map(function(l){
    var name = typeof l === 'string' ? l : l.name;
    var logo = typeof l === 'object' && l.logo ? l.logo : '';
    var dark = typeof l === 'object' && l.dark ? ' dark-chip' : '';
    if (logo) {
      // Full-resolution file is the default (desktop/retina quality preserved); a
      // smaller copy in lender-logos/sm/ is offered via srcset so phones download
      // far fewer pixels — the browser picks whichever actually fits the display,
      // no JS or media queries needed. SVGs are resolution-independent, skip this.
      var srcset = '';
      if (logo.slice(-4) === '.png') {
        var small = logo.replace(/([^\/]+)$/, 'sm/$1');
        srcset = ' srcset="' + small + ' 320w, ' + logo + ' 738w" sizes="140px"';
      }
      // falls back to the plain name if the logo file isn't there yet.
      // loading="lazy" matters more than usual here: this loop renders each logo
      // twice (for the seamless scroll) and being JS-injected, the browser's HTML
      // preload scanner can't discover these early like it can static <img> tags.
      return '<span class="has-logo'+dark+'"><img src="'+logo+'"'+srcset+' alt="'+name+'" width="140" height="56" loading="lazy" decoding="async" ' +
        'onerror="this.parentNode.classList.remove(\'has-logo\',\'dark-chip\'); this.parentNode.textContent=\''+name+'\'"></span>';
    }
    return '<span>'+name+'</span>';
  }).join('');
})();

/* ---- Reviews (homepage only — no-ops elsewhere) ---- */
(function(){
  var grid = document.getElementById('reviewsGrid');
  if(!grid || typeof REVIEWS === 'undefined') return;
  grid.innerHTML = REVIEWS.map(function(rv){
    var s = Math.max(0, Math.min(5, rv.stars || 5));
    var stars = '★★★★★'.slice(0, s) + '☆☆☆☆☆'.slice(0, 5 - s);
    var videoHtml = '';
    if (rv.video) {
      var m = rv.video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([a-zA-Z0-9_-]{6,})/);
      if (m) {
        videoHtml = '<div class="review-video"><iframe src="https://www.youtube.com/embed/' + m[1] + '" title="Video review from ' + rv.name + '" allowfullscreen loading="lazy"></iframe></div>';
      }
    }
    return '<div class="review-card glass">'+
      videoHtml +
      '<div class="stars" aria-label="'+s+' out of 5 stars">'+stars+'</div>'+
      (rv.quote ? '<p class="quote">“'+rv.quote+'”</p>' : '')+
      '<div class="who"><b>'+rv.name+'</b><span>'+(rv.detail||'')+'</span></div>'+
      '</div>';
  }).join('');

  // "uploading soon" placeholder hides itself once a real video review exists
  var frame = document.getElementById('videoReviewFrame');
  if (frame && REVIEWS.some(function(rv){ return !!rv.video; })) frame.style.display = 'none';
})();

/* ---- Google reviews — populated weekly by .github/workflows/refresh-google-reviews.yml
   into google-reviews.json. Stays hidden until that secret setup is done and it has data. ---- */
(function(){
  var wrap = document.getElementById('googleReviewsWrap'), grid = document.getElementById('googleReviewsGrid');
  if(!wrap || !grid) return;
  fetch('google-reviews.json', { cache: 'no-store' }).then(function(r){ return r.json(); }).then(function(data){
    var reviews = (data && data.reviews) ? data.reviews : [];
    if(!reviews.length) return;
    grid.innerHTML = reviews.map(function(rv){
      var s = Math.max(0, Math.min(5, rv.stars || 5));
      var stars = '★★★★★'.slice(0, s) + '☆☆☆☆☆'.slice(0, 5 - s);
      return '<div class="review-card glass">'+
        '<div class="stars" aria-label="'+s+' out of 5 stars">'+stars+'</div>'+
        '<p class="quote">“'+rv.quote+'”</p>'+
        '<div class="who"><b>'+rv.name+'</b><span>'+(rv.time||'')+'</span></div>'+
        '</div>';
    }).join('');
    wrap.style.display = '';
  }).catch(function(){ /* no data yet — stay hidden */ });
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
    var heroEls = '.hero-photo, .hero-eyebrow, .hero-title .line, .hero-sub, .hero-cta';
    // Safety net: GSAP's .from() sets these elements to opacity:0 immediately, then
    // animates them in. If anything ever prevents that animation from completing —
    // a slow/blocked CDN, a later error in this same script, a backgrounded tab —
    // they're stuck invisible forever. Confirmed happening on the live site, so this
    // isn't hypothetical: force full visibility after 2.5s no matter what happened.
    var heroSafetyTimer = setTimeout(function(){
      document.querySelectorAll(heroEls).forEach(function(el){
        el.style.opacity = '1'; el.style.transform = 'none';
      });
    }, 2500);
    try {
      var tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: function(){ clearTimeout(heroSafetyTimer); } });
      tl.from('.hero-photo', { opacity: 0, scale: .92, duration: 1 })
        .from('.hero-eyebrow', { opacity: 0, y: 18, duration: .7 }, '-=.7')
        .from('.hero-title .line', { opacity: 0, yPercent: 110, duration: 1, stagger: .12 }, '-=.3')
        .from('.hero-sub', { opacity: 0, y: 18, duration: .8 }, '-=.6')
        .from('.hero-cta', { opacity: 0, y: 18, duration: .8 }, '-=.6');
    } catch (e) {
      document.querySelectorAll(heroEls).forEach(function(el){
        el.style.opacity = '1'; el.style.transform = 'none';
      });
    }
  }

  // Pin + scrub only above tablet width. Below that, min-height:100vh sections and
  // scroll-pinning both rely on window.innerHeight, which mobile browsers change
  // mid-scroll (address bar show/hide) — that mismatch is what left a large blank
  // gap where this section's text should be. A plain fade-in avoids it entirely.
  if (document.querySelector('.stmt')) {
    var words = gsap.utils.toArray('.stmt .w');
    if (window.matchMedia('(min-width: 781px)').matches) {
      gsap.set(words, { opacity: .18 });
      gsap.to(words, { opacity: 1, stagger: 1, ease: 'none',
        scrollTrigger: { trigger: '.stmt', start: 'top top', end: '+=140%', scrub: true, pin: true } });
    } else {
      gsap.set(words, { opacity: 1 });
      gsap.from('.stmt .big', { opacity: 0, y: 24, duration: .8, ease: 'power3.out',
        scrollTrigger: { trigger: '.stmt', start: 'top 80%' } });
    }
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

  // accordion groups (Services/Guides/Calculators/Company) — mirror the desktop dropdowns
  mm.querySelectorAll('.mm-group-toggle').forEach(function(btn){
    btn.addEventListener('click', function(){
      var group = btn.parentElement;
      var wasOpen = group.classList.contains('open');
      mm.querySelectorAll('.mm-group.open').forEach(function(g){
        g.classList.remove('open'); g.querySelector('.mm-group-toggle').setAttribute('aria-expanded', 'false');
      });
      if (!wasOpen) { group.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });
})();

// logo mark: click/tap to revolve
(function(){
  document.querySelectorAll('.logo-mark').forEach(function(mark){
    var inner = document.createElement('span');
    inner.className = 'logo-mark-inner';
    while (mark.firstChild) inner.appendChild(mark.firstChild);
    mark.appendChild(inner);
    function trigger(){
      if (inner.classList.contains('spin')) return;
      inner.classList.add('spin');
    }
    mark.addEventListener('click', trigger);
    inner.addEventListener('animationend', function(){ inner.classList.remove('spin'); });
  });
})();
