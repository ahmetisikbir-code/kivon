// KIVON Site-wide Script
// Otomatik olarak tüm sayfalara scroll-to-top ve smooth scroll ekler
(function() {
  // Scroll to top button
  var btn = document.createElement('div');
  btn.innerHTML = '↑';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;width:40px;height:40px;border-radius:50%;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.15);color:#38bdf8;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.3s;font-family:sans-serif';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function() {
    btn.style.opacity = window.scrollY > 400 ? '1' : '0';
  });
  btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };
})();
