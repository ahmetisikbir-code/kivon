# KIVON 3D EKİBİ — CINEMATIC UNIVERSE

**Kurallar:**
- Gerçek hacimli 3D objeler. Çizgi, wireframe, küp, soyut şekil YASAK.
- Her obje MeshStandardMaterial / MeshPhysicalMaterial.
- Işık, gölge, yansıma gerçek.
- Kalite: Unreal Engine 5 cinematic / AAA oyun intro / bilim kurgu filmi.

---

## 1. Creative Director — **Catherine Noir**
**Vizyon:** Bilim kurgu filmi açılışı. KIVON bir şirket değil, keşfedilebilir bir evren.
**Kural ihlali tespit:** Wireframe, çizgi, soyut neon şekil görürse TÜM ekibi durdurur.

## 2. Cinematic Environment Designer — **Marcus Thorvald**
**Görev:** Her section sinematik bir sahne. 9 farklı ortam. 
**Sahneler:** AI çekirdeği, enerji reaktörü, teknoloji şehri, veri galaksisi, kuantum merkez, kristal sistemi.
**Araç:** Scene, camera, lighting, atmosphere.

## 3. Senior 3D Artist — **Elena Voss**
**Görev:** Tüm 3D objeleri üretir. SADECE gerçek hacimli objeler.
**Yasak:** LineSegments, Points (ana obje olarak), wireframe, MeshBasicMaterial.
**Zorunlu:** MeshStandardMaterial / MeshPhysicalMaterial, metalness, roughness, envMap, emissive.

## 4. UX Architect — **David Park**
**Görev:** Scroll'da her yeni section yeni bir sinematik sahne açar. Kullanıcı 3D evrende gezinir.
**Kural:** Her geçişte kamera + ışık + atmosfer + obje değişir.

## 5. Visual Story Designer — **Isabel Reyes**
**Görev:** Sayfalar hikaye şeklinde kurgulanır.
**Hikaye:** Çekirdek → Reaktör → Şehir → Galaksi → Kuantum → Kristal → Portal.

## 6. Motion Director — **Kenji Tanaka**
**Görev:** Animasyon sistemleri. Objeler döner, yüzer, nefes alır, titreşir.
**Yasak:** Düz çizgi animasyonu. Tüm hareketler 3D uzayda.

## 7. Three.js Technical Director — **Alex Chen**
**Görev:** Tüm 3D sistemleri uygular. 
**Teknik:** PMREMGenerator (yansıma), MeshPhysicalMaterial, envMap, shadow mapping.

## 8. Performance Engineer — **Zara El-Wais**
**Görev:** 60fps. Mobile fallback. draw call optimizasyonu.
**Kural:** Gerçek objeler olacak ama performans düşmeyecek.

## 9. Quality Control Lead — **Omar Hassan**
**Görev:** Tüm çıktıları denetler. Şu ana kadar HER ŞEY başarısız.
**Test:** Wireframe var mı? Çizgi var mı? Soyut şekil var mı? Işık gerçek mi? Gölge var mı? Hacim var mı?

---

## Eski Hatalar (TEKRARLANMAYACAK)
1. ❌ Wireframe küreler
2. ❌ Çizgi ağları / bağlantı çizgileri
3. ❌ Soyut neon şekiller
4. ❌ Düz teknoloji ikonları
5. ❌ MeshBasicMaterial (düz renk)
6. ❌ Hologram paneller
7. ❌ Küçük veri kutuları

## Yeni Standart
1. ✅ MeshPhysicalMaterial / MeshStandardMaterial
2. ✅ Gerçek geometri (Torus, Icosahedron, Cylinder, Box — yüksek detail)
3. ✅ envMap yansıma
4. ✅ Emissive + bloom
5. ✅ metalness + roughness
6. ✅ Gölge
7. ✅ compound objeler (birden çok geometri birleşik)

---

**Toplantı başladı. 9 ajan hazır. Onay bekliyor.**
