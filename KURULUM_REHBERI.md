# 🚀 Twitter Token Manager - Kurulum ve Kullanım Rehberi

## 📋 İçindekiler

- [Sistem Gereksinimleri](#-sistem-gereksinimleri)
- [Kurulum Adımları](#-kurulum-adımları)
- [Kullanım Kılavuzu](#-kullanım-kılavuzu)
- [Desteklenen Formatlar](#-desteklenen-formatlar)
- [2FA (Çift Doğrulama) Desteği](#-2fa-çift-doğrulama-desteği)
- [Sorun Giderme](#-sorun-giderme)
- [Güvenlik Notları](#-güvenlik-notları)

---

## 🖥️ Sistem Gereksinimleri

### Minimum Sistem Özellikleri:

- **İşletim Sistemi:** Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **RAM:** 4GB (8GB önerilen)
- **Disk Alanı:** 2GB boş alan
- **İnternet:** Stabil broadband bağlantı

### Gerekli Yazılımlar:

- **Node.js:** v18.0.0 veya üzeri
- **npm:** v8.0.0 veya üzeri (Node.js ile birlikte gelir)
- **Git:** Versiyon kontrolü için

---

## 🛠️ Kurulum Adımları

### 1. Node.js Kurulumu

```bash
# Node.js'in kurulu olup olmadığını kontrol edin
node --version
npm --version

# Eğer kurulu değilse: https://nodejs.org adresinden indirin
```

### 2. Projeyi İndirin

```bash
# Git ile klonlama
git clone [PROJE_URL]
cd twitter-token-manager

# Veya ZIP dosyasını indirip çıkarın
```

### 3. Bağımlılıkları Yükleyin

```bash
# Tüm gerekli paketleri yükle
npm install

# Kurulum tamamlandığında çıktı:
# ✅ Puppeteer (Tarayıcı otomasyonu)
# ✅ Express (API sunucusu)
# ✅ React (Kullanıcı arayüzü)
# ✅ TypeScript (Tip güvenliği)
```

### 4. Sistemi Başlatın

```bash
# Geliştirme modunda başlat
npm run dev

# Sistem başarıyla çalıştığında:
# 🌐 Frontend: http://localhost:8080
# 🔗 API: http://localhost:8080/api
```

---

## 📖 Kullanım Kılavuzu

### 🔑 Temel Kullanım

#### 1. Tekil Hesap Ekleme

1. Ana sayfada **"Tekil Hesap"** sekmesini seçin
2. **Kullanıcı Adı:** Twitter kullanıcı adınız (@olmadan)
3. **Şifre:** Hesap şifreniz
4. **2FA Kodu:** (Opsiyonel) Doğrulama kodu
5. **"Hesap Ekle"** butonuna tıklayın

#### 2. Toplu Hesap İçe Aktarma

1. **"Toplu İçe Aktar"** sekmesini seçin
2. Format seçin:
   - `kullanici:sifre`
   - `kullanici:sifre:token`
   - `kullanici:sifre:2fa`
3. Hesapları manuel girin veya dosya yükleyin
4. **"Toplu İçe Aktar"** butonuna tıklayın

#### 3. Token'ları Dışa Aktarma

1. **Token Yönetimi** bölümünde
2. **"Auth:CT0 İndir"** veya **"Detaylı İndir"** seçin
3. Dosya otomatik olarak indirilir

---

## 📝 Desteklenen Formatlar

### 📥 İçe Aktarma Formatları

#### Format 1: Temel Giriş

```
kullanici_adi:sifre
```

**Örnek:**

```
john_doe:mypassword123
jane_smith:securepass456
```

#### Format 2: Mevcut Token ile

```
kullanici_adi:sifre:auth_token
```

**Örnek:**

```
john_doe:mypassword123:abc123def456ghi789
jane_smith:securepass456:xyz789uvw456rst123
```

#### Format 3: 2FA Koduyla

```
kullanici_adi:sifre:2fa_kodu
```

**Örnek:**

```
john_doe:mypassword123:123456
jane_smith:securepass456:789012
```

### 📤 Dışa Aktarma Formatları

#### Auth:CT0 Format

```
auth_token:ct0_token
```

**Örnek:**

```
abc123def456ghi789:1a2b3c4d5e6f7g8h
xyz789uvw456rst123:9i8j7k6l5m4n3o2p
```

#### Detaylı Format

```
kullanici_adi:auth_token:ct0_token
```

**��rnek:**

```
john_doe:abc123def456ghi789:1a2b3c4d5e6f7g8h
jane_smith:xyz789uvw456rst123:9i8j7k6l5m4n3o2p
```

---

## 🔐 2FA (Çift Doğrulama) Desteği

### 2FA Nasıl Çalışır?

1. **2FA Kodu Alın:**

   - Google Authenticator
   - Microsoft Authenticator
   - SMS kodu
   - Email kodu

2. **Sistemde Kullanım:**

   ```
   kullanici_adi:sifre:123456
   ```

3. **Otomatik İşlem:**
   - Sistem hesaba giriş yapar
   - 2FA kodunu otomatik girer
   - Token'ları çıkarır

### 🚨 Önemli 2FA Notları:

- **Kodu zamanında girin:** 2FA kodları 30-60 saniye geçerlidir
- **Toplu işlemde:** Her hesap için güncel kod gerekir
- **Hata durumu:** Geçersiz kod durumunda sistem bildirir

---

## 🎯 Performans Özellikleri

### ⚡ Süper Hızlı İşleme

- **Paralel İşlem:** 5 hesap aynı anda
- **Batch Processing:** Gruplar halinde işlem
- **Optimized Timing:** Minimum bekleme süreleri

### 📊 İşlem Hızları:

| Hesap Sayısı | Yaklaşık Süre |
| ------------ | ------------- |
| 1-5 hesap    | 30-60 saniye  |
| 10 hesap     | 2-3 dakika    |
| 50 hesap     | 8-12 dakika   |
| 100 hesap    | 15-25 dakika  |

---

## 🔍 Canlı İzleme

### 📊 Dashboard Özellikleri:

- **Real-time Loglar:** Anlık işlem takibi
- **Başarı Oranı:** Görsel progress bar
- **Hata Bildirimleri:** Detaylı hata mesajları
- **İstatistikler:** Başarılı/Başarısız sayıları

### 🎛️ Kontrol Paneli:

- **Duraklat/Devam:** İşlemleri kontrol edin
- **Log Temizleme:** Geçmiş kayıtları temizleyin
- **Dışa Aktarma:** Log dosyalarını kaydedin

---

## ⚠️ Sorun Giderme

### Yaygın Hatalar ve Çözümleri:

#### 1. "Timeout" Hataları

**Çözüm:**

```bash
# İnternet bağlantınızı kontrol edin
# Firewall ayarlarını kontrol edin
# Proxy kullanıyorsanız devre dışı bırakın
```

#### 2. "2FA Gerekli" Hatası

**Çözüm:**

- 2FA kodunu hesap bilgilerine ekleyin
- Kodun geçerli olduğundan emin olun
- SMS yerine authenticator app kullanın

#### 3. "Rate Limit" Hataları

**Çözüm:**

- İşlem sayısını azaltın (batch size düşürün)
- Hesaplar arası bekleme süresini artırın
- Farklı IP adresi deneyin

#### 4. "Browser Hatası"

**Çözüm:**

```bash
# Puppeteer'i yeniden yükleyin
npm uninstall puppeteer
npm install puppeteer

# Chrome/Chromium yolunu kontrol edin
```

#### 5. "Cookie Bulunamadı"

**Çözüm:**

- Hesap bilgilerini kontrol edin
- Hesabın askıya alınmadığından emin olun
- Captcha kontrolü yapın

---

## 🛡️ Güvenlik Notları

### ��� Veri Güvenliği:

- **Şifreler şifrelenmez:** Sadece geçici olarak RAM'de tutulur
- **Token'lar güvenli:** SSL ile şifrelenmiş iletişim
- **Log temizleme:** Hassas bilgiler loglanmaz

### 🚨 Güvenlik Önerileri:

1. **VPN kullanın:** IP adresinizi koruyun
2. **Güçlü şifreler:** Hesaplarınızı güvende tutun
3. **2FA aktif:** Tüm hesaplarınızda 2FA açın
4. **Düzenli kontrol:** Token'ları periyodik yenileyin

### ⚖️ Yasal Uyarı:

- Bu araç **sadece** kendi hesaplarınız için kullanılmalıdır
- Twitter'ın kullanım koşullarına uygun davranın
- **Spam** veya **otomatik** aktiviteler yasaktır

---

## 📞 Destek ve Yardım

### 🐛 Hata Bildirimi:

1. **Log dosyalarını** kaydedin
2. **Hata mesajını** kopyalayın
3. **Sistem bilgilerini** toplayın
4. Destek ekibine ulaşın

### 💡 Öneriler:

- Yeni özellik talepleri
- Performans iyileştirmeleri
- UI/UX geliştirmeleri

---

## 🔄 Güncelleme Notları

### Son Sürüm Özellikleri:

- ✅ **2FA Desteği:** Çift doğrulama ile güvenli giriş
- ✅ **Paralel İşlem:** 5x daha hızlı toplu işlem
- ✅ **Gelişmiş UI:** Modern ve kullanıcı dostu arayüz
- ✅ **Real-time Logs:** Anlık işlem takibi
- ✅ **Batch Processing:** Optimize edilmiş grup işlemleri

### Gelecek Güncellemeler:

- 🔄 **Proxy Desteği:** IP değiştirme özelliği
- 🔄 **Scheduled Jobs:** Zamanlı işlemler
- 🔄 **API Integration:** Harici sistem entegrasyonu

---

## 📚 Ek Kaynaklar

### 📖 Dokümantasyon:

- [Twitter API Dokumentasyonu](https://developer.twitter.com/docs)
- [Puppeteer Rehberi](https://pptr.dev/)
- [Node.js Öğrenme](https://nodejs.org/docs)

### 🎥 Video Rehberler:

- Kurulum videosu
- Kullanım örnekleri
- Sorun giderme rehberi

---

_Bu rehber Twitter Token Manager v2.0 için hazırlanmıştır._
_Son güncelleme: 2024_

**🔥 Artık 2FA desteği ile daha güvenli ve hızlı token yönetimi!**
