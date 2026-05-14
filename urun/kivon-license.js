// Kivon Lisans Kontrolü
// Yetkisiz embedding'de demo modu, lisansla tam sürüm
(function(){
  const LISANS = {
    yetkiliDomainler: ['localhost','127.0.0.1','kivon.com.tr','ahmetisikbir-code.github.io'],
    demoModu: false
  };

  try {
    if (window.self !== window.top) {
      // iframe içinde çalışıyor
      const parentDomain = new URL(document.referrer).hostname;
      const yetkili = LISANS.yetkiliDomainler.some(d => parentDomain.includes(d));
      if (!yetkili) {
        LISANS.demoModu = true;
      }
    }
  } catch(e) {
    // cross-origin -> kesin embed edilmiş
    LISANS.demoModu = true;
  }

  if (LISANS.demoModu) {
    // Demo watermark
    const badge = document.createElement('div');
    badge.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:rgba(251,191,36,0.9);color:#0a0a1a;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;pointer-events:none';
    badge.textContent = '⚡ DEMO · Lisans için: +90 530 398 27 12';
    document.body.appendChild(badge);

    // Lisans banner (altta)
    const banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(10,10,26,0.95);border-top:2px solid #fbbf24;padding:12px 16px;text-align:center;font-family:system-ui,sans-serif;font-size:13px;color:#fff';
    banner.innerHTML = '⚡ <b>Demo Sürümü</b> — Tam sürüm için lisans alın: <a href="https://wa.me/905303982712" style="color:#38bdf8;font-weight:700">WhatsApp +90 530 398 27 12</a>';
    document.body.appendChild(banner);
    document.body.style.paddingBottom = '48px';
  }

  window.KIVON_LISANS = LISANS;
})();
