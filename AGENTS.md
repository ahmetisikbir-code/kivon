# KIVON Agent Toplantisi 2 — İyileştirme & Aksiyon

## Katilimcilar (11 Agent)
- **kivon-teknik** — Kod düzeltme (5 kritik fix)
- **kivon-satis** — 7 günde ilk satış planı
- **kivon-arge** — Ürün roadmap (Lead Gen Bot #1)
- **kivon-analiz** — İlk müşteri bulma stratejisi
- **kivon-finans** — Nakit akışı & yatırım öncelikleri
- **kivon-icerik** — 7 gün sosyal medya takvimi
- **kivon-web** — Satış sayfası iyileştirme (Gumroad + WhatsApp)
- **kivon-dokuman** — urunler.html güncelleme, satış içeriği
- **kivon-hukuk** — Satışa hazır KVKK checklist
- **kivon-test** — Test 80→93, %100 başarı
- **kivon-inspect** — Genel değerlendirme raporu

## Ciktilar
| Agent | Çıktı | Durum |
|-------|-------|-------|
| **Teknik** | `veri-broker-teknik-sprint1.md` + `veri-broker.js` düzeltildi | ✅ 5 kritik fix (askGroq try/catch, API key guard, curl fallback, script sırası, classifyPage try/catch) |
| **Ar-Ge** | `veri-broker-arge-roadmap.md` | ✅ Lead Gen Bot #1 (50 satır, 0 TL), Fiyat Takip #2, İhale Botu #3 |
| **Satış** | `veri-broker-7gun-satis-plani.md` | ✅ 7 günlük aksiyon planı, ~12-14 saat yatırım |
| **Analiz** | `veri-broker-musteri-bulma.md` | ✅ 10 hedef firma, 200→6 demo→2-3 satış hunisi |
| **Finans** | `veri-broker-nakit-akisi.md` | ✅ 0 yatırım, ilk 3 ay ~2.955 TL, abonelik stratejisi |
| **Hukuk** | `veri-broker-hukuk-satisa-hazir.md` | ✅ 8 maddelik checklist, 6 maddelik hızlı sözleşme, VERBİS uyarısı |
| **İçerik** | `veri-broker-sosyal-medya-takvimi.md` | ✅ 7 günlük IG + LinkedIn planı |
| **Web** | `veri-broker.html` güncellendi, `gumroad-veri-broker-aciklamasi.html` | ✅ Gumroad butonu, WhatsApp, demo tablo |
| **Doküman** | `urunler.html` güncellendi, `veri-broker-satis-sayfasi-icerigi.md` | ✅ 8 sektör kartı eklendi, 1 sayfalık satış dokümanı |
| **Test** | `test-veri-broker.js` (80→93 test), `test-sonucu.md` | ✅ 13 yeni test, %100 başarı |
| **Inspect** | `KIVON-GENEL-DEGERLENDIRME.md` | ✅ En büyük hata: çelişkili fiyat listeleri, en büyük fırsat: Inspect entegrasyonu |

## Ana Kararlar
1. **İlk 7 gün** — Lead bul + Gumroad + Instagram = ilk satış
2. **Lead Gen Bot** — `veri-broker.js`'e `--sektor` parametresi ekle (50 satır)
3. **VERBİS kaydı** — Satış öncesi başlat, yoksa 50K TL+ ceza riski
4. **Fiyat birliği** — 500 TL/sektör (3 agent farklı söylemişti, karar: 500 TL)
5. **Sprint 1 tamam** — 5 teknik düzeltme uygulandı
6. **Test 93/93** — Her şey geçiyor

## Aksiyon Sırası
1. 🔴 VERBİS başvurusu (hukuk uyarısı)
2. 🟢 Gumroad'a Veri Broker ürünü ekle (web + satış)
3. 🟢 Instagram'da 7 günlük içerik başlat (içerik)
4. 🟢 10 hedef firmaya LinkedIn DM (analiz + satış)
5. 🟢 `--sektor` parametresi ekle (teknik + ar-ge)
6. 🟡 Domain al (200 TL/yıl, finans ay 1)
7. 🟡 Google Maps Places API entegrasyonu (sprint 2)

## Calistirma (guncel)
```powershell
# API key .env'den okunur, .env dosyasi olustur:
# echo "GROQ_API_KEY=gsk_sBTU7K..." > .env
# Sonra:
node veri-broker.js
```

## Ciktilari
- `veri-hazinesi/katalog.json` — tum veriler
- `veri-hazinesi/katalog.html` — sektor bazli rapor
- `veri-hazinesi/katalog.csv` — tum veriler CSV
- `veri-hazinesi/{sektor}.csv` — sektor bazli CSV'ler

# KIVON Agent Toplantisi 3 — Veri Kalitesi & Düzeltme

## Katilimcilar
- **kivon-analiz** — Veri kalitesi raporu
- **kivon-teknik** — 4 kod düzeltmesi
- **kivon-arge** — Yeni veri kaynak araştırması
- **kivon-test** — Test 93→111
- **kivon-inspect** — AI prompt iyileştirme

## En Kritik Bulgu (Analiz)
**Mevcut verinin %0'ı satılabilir.** Nedeni: Bot sadece Bing arama sonuç sayfalarını tarıyor, Bing snippet'lerindeki rastgele sayıları telefon sanıp kaydediyor. Firma adı olarak da Bing arama sorgusunu yazıyor ("restoran telefon adres iletişim"). Gerçek firma websitelerine gitmiyor, email hiç bulamıyor.

## Yapılan Düzeltmeler (Teknik)
| # | Sorun | Düzeltme |
|---|-------|----------|
| 1 | Firma adı Bing sorgusu oluyor | Bing URL'lerinde "Bilinmeyen Firma #[ID]" döner, gerçek ad sadece firma sitesinden |
| 2 | Email neredeyse hiç yok | CloudFlare decode, mailto linkleri, "e-posta:" yanı tarama eklendi |
| 3 | Bot sadece Bing'de takılıyor | Bing sayfaları kendi linklerini kuyruğa eklemez, sadece dış linkleri öncelikli ekler |
| 4 | Geçersiz telefonlar kaydediliyor | 059 prefix red, 10 haneli 0'lı sabit hat red |

## AI İyileştirme (Inspect)
- `temperature` 0.15→0.3
- JSON structured output + 3 few-shot örnek
- Güven skoru eklendi (yüksek/orta/düşük)
- Fiyat bandı sektöre göre belirlendi

## Yeni Veri Kaynakları (Ar-Ge)
| Kaynak | curl | Kalite | Öncelik |
|--------|------|--------|---------|
| Google Maps HTML | ✅ Evet | 7/10 | ★★★★★ |
| TOBB/Ticaret Odası | ✅ Evet | 9/10 | ★★★★☆ |
| Firma web sitesi | ✅ Evet | 3-9/10 | ★★★☆☆ |
| LinkedIn | ✅ Evet | 7/10 | ★★☆☆☆ |

## Test
- 93→111 test, %100 başarı
- 18 yeni test: dedup, email, CloudFlare, telefon validasyon
- 3 mevcut test düzeltildi
