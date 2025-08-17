# Matematik Yarışı Oyunu

Bu proje, matematik tabanlı bir yarış oyunudur. Oyuncular asal sayı çarpımı bulmacalarını çözerek arabalarını hızlandırırlar.

## Oyun Özellikleri

### 🎮 Oyun Mekaniği
- **Hedef Sayı**: Ekranın üst kısmında gösterilen hedef sayıyı bulun
- **Asal Sayı Seçimi**: 12 asal sayıdan (2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37) iki tanesini seçin
- **Çarpım Kontrolü**: Seçilen iki asal sayının çarpımı hedef sayıya eşit olmalı
- **Hız Sistemi**: Doğru cevaplar arabayı hızlandırır, yanlış cevaplar yavaşlatır

### 🎯 Oyun Hedefleri
- **Skor**: Kat edilen mesafe (metre cinsinden)
- **Süre**: 60 saniye süre sınırı
- **Hata Limiti**: Maksimum 5 yanlış cevap

### 🎨 Görsel Özellikler
- **Portrait 9:16 Oranı**: Mobil cihazlar için optimize edilmiş
- **DPR Ölçeklendirme**: Yüksek çözünürlüklü ekranlar için
- **Paralaks Yol**: 3D yol efekti
- **Geometrik Araba**: Basit şekillerle oluşturulmuş araba sprite'ı
- **Canlı Renkler**: Mavi/yeşil yol, turuncu/sarı vurgular

### 📱 Kontroller
- **Dokunmatik**: 3x4 grid düzeninde asal sayı butonları
- **Minimum 44px**: Erişilebilirlik standartlarına uygun
- **Görsel Geri Bildirim**: Buton durumları ve dokunma efektleri

### 🔧 Teknik Özellikler
- **Tek HTML Dosyası**: Canvas tabanlı oyun
- **Farcade SDK Entegrasyonu**: 
  - `ready()` - Oyun hazır
  - `gameOver({ score })` - Oyun sonu
  - `hapticFeedback()` - Titreşim geri bildirimi
  - `play_again` ve `toggle_mute` event'leri
- **Responsive Tasarım**: Farklı ekran boyutlarına uyum
- **Performans Optimizasyonu**: Smooth animasyonlar

## Kurulum ve Çalıştırma

1. **Dosyayı İndirin**: `public/math-race-game.html`
2. **Tarayıcıda Açın**: Dosyayı herhangi bir modern web tarayıcısında açın
3. **Oynamaya Başlayın**: Oyun otomatik olarak başlar

## Oyun Kuralları

1. **Hedef Sayıyı Görün**: Ekranın üst kısmında turuncu kutuda gösterilir
2. **İki Asal Sayı Seçin**: Alt kısımdaki 3x4 grid'den iki asal sayı seçin
3. **Çarpımı Kontrol Edin**: Seçilen sayıların çarpımı hedef sayıya eşit olmalı
4. **Hızlanın**: Doğru cevaplar arabayı hızlandırır
5. **Süreyi Takip Edin**: 60 saniye içinde mümkün olduğunca uzağa gidin

## Farcade SDK Entegrasyonu

Oyun, Farcade platformu için optimize edilmiştir:

```javascript
// Oyun hazır olduğunda
farcade.ready();

// Oyun bittiğinde skor gönder
farcade.gameOver({ score: finalScore });

// Dokunma geri bildirimi
farcade.hapticFeedback();

// Event dinleyicileri
farcade.on('play_again', () => resetGame());
farcade.on('toggle_mute', () => toggleSound());
```

## Teknik Detaylar

### Asal Sayı Ürünleri
Oyun, önceden hesaplanmış geçerli asal sayı çarpımlarını kullanır:
- 2×2=4, 2×3=6, 2×5=10, ...
- 3×3=9, 3×5=15, 3×7=21, ...
- Toplam 78 farklı geçerli ürün

### Performans Optimizasyonları
- **Canvas DPR Ölçeklendirme**: Keskin görüntüler
- **RequestAnimationFrame**: Smooth animasyonlar
- **Pre-computed Values**: Hızlı hesaplamalar
- **Minimal DOM Manipulation**: Hızlı UI güncellemeleri

### Responsive Tasarım
- **Viewport Meta Tag**: Mobil optimizasyonu
- **CSS Grid**: Esnek buton düzeni
- **Flexbox**: Merkezi hizalama
- **Media Queries**: Farklı ekran boyutları

## Geliştirme Notları

### Genişletilebilirlik
- Yeni asal sayılar kolayca eklenebilir
- Farklı matematik işlemleri (toplama, çıkarma) eklenebilir
- Güçlendiriciler ve özel efektler eklenebilir
- Çoklu oyuncu modu geliştirilebilir

### Kod Yapısı
- **Modüler Fonksiyonlar**: Kolay bakım
- **Açık Değişkenler**: Kolay ayarlama
- **Türkçe Yorumlar**: Anlaşılır kod
- **ES6+ Özellikleri**: Modern JavaScript

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## İletişim

Sorularınız için issue açabilir veya pull request gönderebilirsiniz.
