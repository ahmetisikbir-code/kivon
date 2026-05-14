// Kivon Lisans Kontrolü v2
// Demo: watermark + AI limiti + ozellik kisitlamasi
(function(){
  const LISANS = {
    yetkiliDomainler: ['localhost','127.0.0.1','kivon.com.tr','ahmetisikbir-code.github.io'],
    demoModu: false,
    aiKullanildi: parseInt(localStorage.getItem('kv_demo_ai')||'0'),
    maxAi: 5,
    watermark: null,
    banner: null
  };

  try {
    if (window.self !== window.top) {
      const parentDomain = new URL(document.referrer).hostname;
      if (!LISANS.yetkiliDomainler.some(d => parentDomain.includes(d))) {
        LISANS.demoModu = true;
      }
    }
  } catch(e) { LISANS.demoModu = true; }

  if (LISANS.demoModu) {
    LISANS.watermark = document.createElement('div');
    LISANS.watermark.style.cssText = 'position:fixed;top:8px;right:8px;z-index:99999;background:rgba(251,191,36,0.9);color:#0a0a1a;padding:4px 12px;border-radius:12px;font-size:11px;font-weight:700;font-family:system-ui,sans-serif;pointer-events:none';
    LISANS.watermark.textContent = '⚡ DEMO · ' + (LISANS.maxAi-LISANS.aiKullanildi) + ' kullanım kaldı';
    document.body.appendChild(LISANS.watermark);

    LISANS.banner = document.createElement('div');
    LISANS.banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:rgba(10,10,26,0.95);border-top:2px solid #fbbf24;padding:10px 16px;text-align:center;font-family:system-ui,sans-serif;font-size:12px;color:#fff';
    LISANS.banner.innerHTML = '⚡ <b>Demo Sürümü</b> · ' + (LISANS.maxAi-LISANS.aiKullanildi) + ' AI kullanımı kaldı · Tam sürüm: <a href="https://wa.me/905303982712" style="color:#38bdf8;font-weight:700">WhatsApp</a>';
    document.body.appendChild(LISANS.banner);
    document.body.style.paddingBottom = '44px';
  }

  // AI kullanım kontrolü
  window.KIVON_AI_KULLAN = function() {
    if (!LISANS.demoModu) return true;
    if (LISANS.aiKullanildi >= LISANS.maxAi) {
      alert('Demo AI limiti doldu (5 kullanım). Tam sürüm için WhatsApp: +90 530 398 27 12');
      return false;
    }
    LISANS.aiKullanildi++;
    localStorage.setItem('kv_demo_ai', LISANS.aiKullanildi);
    if (LISANS.watermark) LISANS.watermark.textContent = '⚡ DEMO · ' + (LISANS.maxAi-LISANS.aiKullanildi) + ' kullanım kaldı';
    if (LISANS.banner) LISANS.banner.innerHTML = '⚡ <b>Demo Sürümü</b> · ' + (LISANS.maxAi-LISANS.aiKullanildi) + ' AI kullanımı kaldı · Tam sürüm: <a href="https://wa.me/905303982712" style="color:#38bdf8;font-weight:700">WhatsApp</a>';
    return true;
  };

  window.KIVON_LISANS = LISANS;
})();
