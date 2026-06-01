# KIVON Web Sitesi

KIVON — Bursa merkezli AI entegrasyon danışmanlığı.

## Canlı
- GitHub Pages: `https://ahmetisikbir-code.github.io/kivon/`
- Özel domain: `https://kivontr.com` (DNS yayılma aşamasında)
- API Proxy: `https://kivon-3.onrender.com`

## Sayfalar (30+)
| Kategori | Sayfalar |
|----------|----------|
| Ana | `index.html`, `dashboard.html`, `hakkimizda.html`, `referanslar.html` |
| Sektör | `muhasebe.html`, `eticaret.html`, `restoran.html` + 4 detay sayfa |
| Araçlar | `crm.html`, `servis-katalogu.html`, `cozum-paneli.html`, `kosgeb.html` |
| Demo | `demo/chatbot.html`, `demo/fiyat-hesapla.html`, `demo/ai-hazirlik-testi.html`, `demo/roi-hesapla.html` |
| Kurumsal | `sss.html`, `basvuru.html`, `gizlilik-politikasi.html`, `api-dokuman.html` |
| Diğer | `404.html`, `site-haritasi.html`, `en/index.html`, `admin/index.html` |

## Teknoloji
- Saf HTML/CSS/JS (framework yok)
- 3D Particle canvas arka plan
- KIVON tasarım sistemi (navy + cyan + indigo + gold)
- Mobil uyumlu, hamburger menü
- SEO: sitemap.xml, robots.txt, meta etiketler
- Performans: `_headers` ile cache yapılandırması

---

## Veri Broker Botu

AI destekli otomatik veri keşif botu. Bing üzerinden sektörel aramalar yapar,
telefon/e-posta ayıklar, Groq AI ile sınıflandırır ve katalog halinde sunar.

### Kullanım
```powershell
$env:GROQ_API_KEY="gsk_senin_key_buraya"; node veri-broker.js
# İstek limiti: $env:ISTEK_LIMITI="100"; node veri-broker.js
# Fresh başlangıç: node veri-broker.js --fresh
```

### Çıktılar
| Dosya | Açıklama |
|-------|----------|
| `veri-hazinesi/katalog.json` | Tüm veri (JSON) |
| `veri-hazinesi/katalog.html` | Sektör bazlı görsel rapor |
| `veri-hazinesi/katalog.csv` | Tüm veri (CSV) |
| `veri-hazinesi/{sektor}.csv` | Sektör bazlı CSV'ler |

Detaylı kullanım: [`veri-broker-KULLANIM.md`](veri-broker-KULLANIM.md)
