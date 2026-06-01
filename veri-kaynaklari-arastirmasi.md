# Veri Kaynakları Araştırması — Gerçek Firma Verisi

## 1. Google Maps (HTML parse — curl ile)

| Özellik | Detay |
|---|---|
| **curl ile erişilebilir mi?** | Evet. `curl "https://www.google.com/maps/search/?api=1&query=<firma+adı>"` veya doğrudan Maps HTML sayfası çekilebilir. |
| **Tahmini veri kalitesi (1-10)** | **7/10** — HTML sayfasında işletme adı, adres, telefon numarası ve çalışma saatleri genelde `<div>` içinde bulunur. Ancak sayfa yapısı sık değişir, parse edilmesi zor olabilir. |
| **Hangi sektörler için uygun?** | Tüm sektörler (restoran, avukat, e-ticaret, hizmet). Özellikle **yerel işletmeler** için en güçlü kaynak. |
| **Ek maliyet** | Ücretsiz (API anahtarı gerekmez, sadece HTTP isteği). |
| **Not** | Google Maps sayfası dinamik (JS ile yüklenir). `curl` ile alınan ham HTML'de veri **bulunmayabilir** (JS render edilmez). `--user-agent` ve `--cookie` ile dene, bazen çalışır. |

## 2. Firma Web Siteleri (Sektör Bazında)

| Sektör | Web Sitesi Sahipliği | İletişim Bilgisi | Veri Kalitesi |
|---|---|---|---|
| **Restoran/Kafe** | Çoğu yok (Instagram/WhatsApp yeterli). Büyük zincirlerde var. | Telefon, adres genelde footer'da. Email nadir. | 3/10 |
| **Avukat/Hukuk Bürosu** | %90+ kendi sitesi var. | İletişim sayfası (tel, email, adres) zorunlu. | 9/10 |
| **E-ticaret/Online Mağaza** | Siteleri var. | İletişim sayfası, telefon, email genelde var. | 8/10 |
| **Doktor/Klinik** | Çoğu var (randevu sitesi). | Telefon, adres var. Email bazen. | 7/10 |
| **İnşaat/Müteahhit** | Büyük firmaların sitesi var. | İletişim bilgisi genelde paylaşılır. | 6/10 |
| **Manav/Bakkal/Küçük Esnaf** | Nadiren site. | — | 1/10 |

**Tespit:** Küçük işletmeler (restoran, bakkal) için web sitesi bulmak zor. Büyük/orta ölçekli firmalar için web sitesi en güvenilir kaynak.

## 3. Google İşletme Profili (Knowledge Panel)

| Özellik | Detay |
|---|---|
| **curl ile erişilebilir mi?** | Kısmen. `curl "https://www.google.com/search?q=<firma>"` ile alınan HTML'de **sol taraftaki snippet** (işletme adı, puan, yorum sayısı) bulunur. Sağdaki knowledge panel ise JS ile yüklenir, ham HTML'de yoktur. |
| **Veri kalitesi (1-10)** | **5/10** — Sol taraftaki snippet'ta ad, telefon, adres bulunabilir. Sık değişen CSS sınıfları nedeniyle güvenilmez. |
| **Hangi sektörler?** | Tüm sektörler (Google'a kayıtlı her işletme). |
| **Ek maliyet** | Ücretsiz. |

## 4. Sektörel Dernek / Oda Siteleri

| Dernek | curl ile erişim | Veri | Kalite |
|---|---|---|---|
| **TOBB (Türkiye Odalar ve Borsalar Birliği)** | `tobb.org.tr` — Üye listesi sorgulanabilir. Firma adı, adres, vergi dairesi, telefon. | 9/10 (resmi, doğru) |
| **TÜSİAD** | `tusiad.org` — Sadece üye listesi (büyük firmalar). | 7/10 |
| **MÜSİAD** | `musiad.org.tr` — Üye firmalar listelenir, telefon/adres var. | 8/10 |
| **İstanbul Ticaret Odası (İTO)** | `ito.org.tr` — Firma sorgulama var. | 9/10 |
| **Ankara Ticaret Odası (ATO)** | `ato.org.tr` — Firma sorgulama. | 8/10 |

**Not:** Oda siteleri genelde firma adı, adres, telefon gibi temel bilgileri **sorgulanabilir** şekilde sunar. Veri doğruluğu yüksektir (resmi kayıt).

## 5. Ek Kaynak Önerileri

| Kaynak | curl | Kalite | Sektör | Maliyet |
|---|---|---|---|---|
| **LinkedIn (şirket sayfaları)** | Evet (`linkedin.com/company/<slug>`) | 7/10 | Kurumsal firmalar | Ücretsiz (rate-limit var) |
| **Facebook Pages (işletme sayfaları)** | Evet (`graph.facebook.com/...`) | 6/10 | Küçük işletmeler | Ücretsiz, Graph API gerekli |
| **Sahibinden.com (işletme profilleri)** | Evet | 5/10 | Hizmet sektörü | Ücretsiz |
| **Yandex Maps** | Evet (Turkey için az veri) | 4/10 | Tümü | Ücretsiz |
| **Firma Rehberi siteleri** | Kısmen (reklam dolu) | 3/10 | Tümü | Genelde ücretli |

## Özet & Öneri

**En iyi strateji (sırasıyla):**
1. **Google Maps** — `curl` ile HTML al, regex ile telefon/adres çıkar (veri var, ama JS sorunu var).
2. **Firma web sitesi** — Eğer sektör biliniyorsa (avukat → site var), doğrudan siteyi `curl` ile tara.
3. **TOBB/ticaret odası** — Sektörel odalar için en güvenilir veri (resmi kayıt).
4. **LinkedIn** — Kurumsal firmalar için güzel tamamlayıcı.
5. **Google Knowledge Panel** — Son çare, düşük kalite.

> **Öneri:** Mevcut sistemde iki kaynak eklenmeli: (1) Google Maps HTML parse (en geniş kapsam), (2) TOBB üye sorgulama (en güvenilir veri). İkisi birlikte tüm sektörleri kapsar.