// mark JS available
document.documentElement.classList.add('js');

// Header shadow on scroll
const head = document.getElementById('head');
const onScroll = () => head.classList.toggle('scrolled', window.scrollY > 8);
onScroll(); window.addEventListener('scroll', onScroll, {passive:true});

// Nav dropdowns (hover on desktop, click fallback)
document.querySelectorAll('.nav-item').forEach(item => {
  const btn = item.querySelector('button');
  if(!btn) return;
  item.addEventListener('mouseenter', () => {
    document.querySelectorAll('.nav-item.open').forEach(o=>o!==item&&o.classList.remove('open'));
    item.classList.add('open');
  });
  item.addEventListener('mouseleave', () => item.classList.remove('open'));
  btn.addEventListener('click', e => { e.preventDefault(); item.classList.toggle('open'); });
});
document.addEventListener('click', e => {
  if(!e.target.closest('.nav-item')) document.querySelectorAll('.nav-item.open').forEach(o=>o.classList.remove('open'));
});

// Tabs (Áreas de atuação)
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p=>p.classList.remove('show'));
    tab.classList.add('active');
    document.getElementById(tab.dataset.tab).classList.add('show');
  });
});

// TOC scrollspy (internal page) — geometry based
const tocLinks = [...document.querySelectorAll('.toc a')];
if(tocLinks.length){
  const secs = tocLinks.map(a => document.querySelector(a.getAttribute('href'))).filter(Boolean);
  function spy(){
    let cur = secs[0];
    for(const s of secs){ if(s.getBoundingClientRect().top <= 140) cur = s; }
    if(cur) tocLinks.forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#'+cur.id));
  }
  spy();
  window.addEventListener('scroll', spy, {passive:true});
}

// Mobile menu (simple)
const burger = document.getElementById('burger');
if(burger){
  burger.addEventListener('click', () => {
    const nav = document.querySelector('.nav');
    const open = nav.style.display === 'flex';
    if(open){ nav.style.display=''; return; }
    nav.style.cssText = 'display:flex;position:absolute;top:78px;left:0;right:0;flex-direction:column;align-items:stretch;background:#fff;border-bottom:1px solid var(--line);padding:14px var(--gut);gap:2px;box-shadow:var(--shadow-lg)';
  });
}

// Reveal on scroll (data-reveal)
(function(){
  if(!('IntersectionObserver' in window)){ document.querySelectorAll('[data-reveal]').forEach(e=>e.classList.add('in')); return; }
  var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.12});
  document.querySelectorAll('[data-reveal]').forEach(function(el){io.observe(el);});
})();
