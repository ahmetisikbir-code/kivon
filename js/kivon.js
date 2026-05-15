// KIVON Site-wide Script
(function() {
  var btn = document.createElement('div');
  btn.innerHTML = '↑';
  btn.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:999;width:40px;height:40px;border-radius:50%;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.15);color:#38bdf8;font-size:18px;display:flex;align-items:center;justify-content:center;cursor:pointer;opacity:0;transition:opacity 0.3s;font-family:sans-serif';
  document.body.appendChild(btn);
  window.addEventListener('scroll', function() {
    btn.style.opacity = window.scrollY > 400 ? '1' : '0';
  });
  btn.onclick = function() { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // 1. Logo scale animation
  window.addEventListener('load', function() {
    var logos = document.querySelectorAll('.logo, .navbar-brand, [class*="logo"] img, header img, nav img, .navbar img, .logo-container img');
    if (logos.length === 0) {
      var fallback = document.querySelector('nav a:first-child, .navbar a:first-child, header a:first-child');
      if (fallback) logos = [fallback];
    }
    logos.forEach(function(el) {
      if (el.offsetWidth > 0 || el.offsetHeight > 0) {
        el.style.transition = 'none';
        el.style.transform = 'scale(0.5)';
        el.style.opacity = '0';
        void el.offsetHeight;
        el.style.transition = 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 1s ease';
        requestAnimationFrame(function() {
          el.style.transform = 'scale(1)';
          el.style.opacity = '1';
        });
      }
    });

    // 4. Hero text fade-in
    var heroTexts = document.querySelectorAll('.hero h1, .hero p, .hero-title, .hero-text, [class*="hero"] h1, [class*="hero"] p, .hero-section h1, .hero-section p');
    heroTexts.forEach(function(el, i) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.8s ease ' + (i * 0.15 + 0.2) + 's, transform 0.8s ease ' + (i * 0.15 + 0.2) + 's';
      requestAnimationFrame(function() {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      });
    });
  });

  // 2. Parallax particle background
  var canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.insertBefore(canvas, document.body.firstChild);

  var ctx = canvas.getContext('2d');
  var particles = [];
  var pCount = Math.min(60, Math.floor(window.innerWidth / 20));
  for (var i = 0; i < pCount; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 3 + 0.5,
      size: Math.random() * 2 + 0.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.3 + 0.05
    });
  }

  function drawParticles() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    var scrollFactor = window.scrollY * 0.08;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      var parallaxY = scrollFactor / p.z;
      p.x += p.vx * p.z;
      p.y += p.vy * p.z;
      if (p.x < -10) p.x = canvas.width + 10;
      if (p.x > canvas.width + 10) p.x = -10;
      if (p.y < -10) p.y = canvas.height + 10;
      if (p.y > canvas.height + 10) p.y = -10;
      ctx.beginPath();
      ctx.arc(p.x, p.y - parallaxY, p.size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56, 189, 248, ' + p.alpha + ')';
      ctx.fill();
    }
    requestAnimationFrame(drawParticles);
  }
  drawParticles();

  window.addEventListener('resize', function() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
})();
