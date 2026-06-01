# Veri Kalitesi Raporu — katalog.json Analizi

**Tarih:** 2026-05-27
**Kaynak:** `veri-hazinesi/katalog.json`
**Analiz:** kivon-analiz

---

## 1. Özet

| Metrik | Değer |
|---|---|
| Toplam kayıt | 140 |
| Gerçek firma adı içeren kayıt | **0** (%0) |
| Bing arama sorgusu olan firma adı | 118 (%84) |
| Web sitesi adı olan firma adı | ~4 (firmaekle.net, vs.) |
| Benzersiz firma adı | 17 (hepsi sorgu ifadesi) |
| Email içeren kayıt | **2** (%1.4) |
| Toplam email adedi | **3** |
| Toplam telefon | 316 |
| Geçersiz/kullanılamaz telefon | ~26-40 (tahmini) |
| Alıcı/fiyat/kullanım bilgisi "?" olan kayıt | 41 (%29) |

---

## 2. Veri Kalitesi Detayı

### 2.1 Firma Adları — %0 Gerçek

Şu anki `firma` alanının tamamı **Bing arama sorgusu** veya **web sitesi adıdır**. Örnekler:

- `"restoran telefon adres iletişim"` — Bing sorgusu
- `"doktor telefon adres iletişim"` — Bing sorgusu
- `"site:eniyifirmadan.com telefon"` — Bing site search sorgusu
- `"Firma Ekle"` — Web sitesi adı, gerçek firma değil

**Gerçek firma adı olan kayıt sayısı: 0.**

Bot, Bing sonuç sayfasından telefon numaralarını çekerken firma adını sayfadan ayıklayamıyor. Sadece kendi sorgu metnini `firma` alanına yazıyor.

### 2.2 Email — %1.4 (2 kayıt, 3 email)

Sadece 2 kayıtta email var:
1. `oto servis telefon adres` — `hr@butrans.pl`, `Emailbiuro@butrans.com.pl` (Polonya firması, Türkiye ile ilgisiz)
2. `Firma Ekle, Ücretsiz Rehbere Firma Kaydet` — `site@site.com` (placeholder)

**Email oranı %0.** Gerçek kullanılabilir email = 0.

**Düşük email sebebi:** Bot yalnızca Bing sonuç sayfalarını tarıyor. Bing sonuç sayfaları nadiren email adresi gösterir. Gerçek firma web sitelerine girilmiyor.

### 2.3 Telefonlar — Büyük Kısmı Kullanılamaz Durumda

316 telefon numarası toplanmış ancak:

| Sorun Türü | Örnek | Sayı (tahmini) |
|---|---|---|
| 0593/0550/0570 ile başlayan (geçersiz prefix) | `05936979161`, `05507969937` | ~10 |
| 7 haneli (alan kodu yok, anlamsız) | `3461441732` ilk 3 hane alan kodu değil | ~30+ |
| Polonya formatlı numaralar | `3886196312` (+48 Polonya) | ~10+ |
| Başında 0 olup standart dışı | `05702201115`, `04783418295` | ~10 |
| Aynı numara farklı kayıtlarda tekrar ediyor | `3564071178` / `5640711782` vs. | çok sayıda |

**Gerçek bir işletmeye ait olduğu doğrulanabilir telefon: ~0**

Numaralar Bing'in "organic results" bölümünden rastgele toplanmış. Hangi numaranın hangi işletmeye ait olduğu belli değil.

### 2.4 Deduplikasyon Yok

Aynı Bing sorgusu (`restoran telefon adres iletişim`) **9 farklı URL'den** toplanmış. Her biri ayrı kayıt. Aynı telefon numaraları farklı sayfalarda tekrar ediyor.

Örnek:
- `05936979161` — ilk kayıtta var
- `5104192224` — ilk kayıtta var

Bir numaranın katalogda kaç kez geçtiğine dair kontrol YOK.

### 2.5 Başarısız Kayıtlar (%29)

41 kayıtta `alici`, `fiyat`, `kullanim` alanları `"?"` olarak işaretlenmiş. Bu kayıtlar botun sektör sınıflandırması yapamadığı, muhtemelen eksik veya hatalı sayfalardan toplanmış veriler.

---

## 3. Satılabilirlik Değerlendirmesi

| Kriter | Mevcut Durum |
|---|---|
| Firmanın adı belli mi? | **Hayır** (%0) |
| Firmanın telefonu belli mi? | **Kısmen** (numaralar var ama hangi firmaya ait bilinmiyor) |
| Email var mı? | **Hayır** (%0) |
| Veri temiz mi (dedup)? | **Hayır** |
| Hangi sektör olduğu belli mi? | Kısmen (botun sınıflandırdığı kadar) |
| KVKK'ya uygun mu? | **Hayır** (izin alınmamış veri) |

**Satılabilir kayıt oranı: %0-2**

Mevcut haliyle bu veri satılamaz. Bir müşteriye "size restoran listesi satıyorum" denirse ve firma adı olarak "restoran telefon adres iletişim" çıkarsa — itibar kaybı kesin.

---

## 4. Etki Analizi — Kalitesiz Veriyle Satış Yapılırsa

| Senaryo | Sonuç |
|---|---|
| Müşteri listeyi inceler | Firma adlarını görür → güler, para iadesi ister |
| Müşteri telefonları arar | Neredeyse tamamı yanlış numara → müşteri kaybı, şikayet |
| Müşteri email atar | 0 email → liste kullanılamaz |
| Müşteri KVKK denetimine takılır | İzinsiz veri toplama → 50K TL+ ceza (VERBİS) |
| Sosyal medyada şikayet | "sahte veri satıcısı" etiketi → marka biter |
| Gumroad iade | Para iadesi + platformdan yasaklanma riski |

**Özet:** 1 müşteriye satılsa bile geri dönüşü çok ağır olur. İtibar + hukuk + platform riski bir arada.

---

## 5. Düzeltme Öncelikleri

### 🔴 P1 — Botun Veri Toplama Mantığı Değişmeli
- **Sorun:** Bot Bing sonuç sayfasını tarıyor, gerçek firma sitelerine gitmiyor
- **Çözüm:** Bing'den çıkan linkleri takip et, gerçek firma sitesinden firma adı + telefon + email çek
- **Etki:** Tek başına bu düzeltme tüm veri kalitesini %0'dan %60+'a çıkarır
- **Tahmini süre:** 1-2 gün

### 🟠 P2 — Deduplikasyon ve Doğrulama Katmanı
- **Sorun:** Aynı numara 10 farklı kayıtta, geçersiz numaralar filtrelenmiyor
- **Çözüm:** Telefon numarası bazında unique kontrol + Türkiye numara formatı validasyonu
- **Etki:** Veri hacmi küçülür ama kalite artar
- **Tahmini süre:** 2-4 saat

### 🟡 P3 — Email Toplama Stratejisi
- **Sorun:** Email yok
- **Çözüm:** Google Maps Places API + firma web sitesinden email scraping
- **Etki:** Email oranı %0 → %30-40
- **Tahmini süre:** 1 gün (API entegrasyonu)

### 🟢 P4 — Sektör Sınıflandırma İyileştirmesi
- **Sorun:** %29 kayıt sınıflandırılamamış
- **Çözüm:** Fallback sınıflandırma (domain adı, sayfa içeriği, anahtar kelime analizi)
- **Etki:** Kullanılabilir kayıt oranı artar
- **Tahmini süre:** 1-2 saat

---

## 6. Sonuç

**Mevcut katalog.json satılamaz.**

Toplanan veri, bir "veri broker" ürünü olarak değil, **teknik altyapının prototipi** olarak görülmeli. Gerçek satışa sunulabilecek bir veri için:

1. Bot yeniden yazılmalı (firma sitelerine gitmeli)
2. Telefon validasyonu eklenmeli
3. Email toplama mekanizması kurulmalı
4. Deduplikasyon yapılmalı
5. KVKK uyumlu hale getirilmeli

**Tahmini düzeltme süresi:** 2-3 gün
**Sonrasında satılabilir kayıt oranı:** %40-60
