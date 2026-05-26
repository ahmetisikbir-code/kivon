# KIVON AI Otomasyon Paketi

6 hazır AI workflow şablonu. Groq ücretsiz API ile çalışır.

## İçindekiler
- `server.js` — Workflow motoru
- `nodes/` — 7 node tipi (webhook, ai, filter, log, delay, function, http)
- `workflows/` — 6 hazır workflow
- `demo.html` — Test arayüzü

## Workflow'lar
| Dosya | Ne işe yarar |
|-------|-------------|
| whatsapp-ai.json | WhatsApp → AI → Cevap |
| lead-capture.json | Form → AI → E-posta taslağı |
| appointment-bot.json | Randevu → AI → Yönlendir |
| siparis-bildirim.json | Sipariş → AI → Bildirim |
| fatura-okuyucu.json | Fatura → AI → JSON özet |
| sosyal-medya.json | Konu → AI → Instagram+LinkedIn post |

## Kurulum
```bash
# 1. Groq API key al (ücretsiz)
#    https://console.groq.com → Kayıt ol → API Key oluştur

# 2. API key'i ayarla
set GROQ_API_KEY=gsk_senin_key_buraya

# 3. Motoru başlat
node server.js

# 4. Test et
curl -X POST http://localhost:3002/trigger/whatsapp-ai \
  -H "Content-Type: application/json" \
  -d "{\"message\":\"Merhaba\"}"
```

## Gereksinimler
- Node.js 18+ (ücretsiz, https://nodejs.org)
- Groq API key (ücretsiz, https://console.groq.com)
- İnternet bağlantısı

## Özellikler
- Sıfır bağımlılık (sadece Node.js)
- Groq AI ücretsiz tier ile çalışır
- REST API ile tetikleme
- Canlı demo sayfası
- 30 saniye timeout, 50 adım limit
