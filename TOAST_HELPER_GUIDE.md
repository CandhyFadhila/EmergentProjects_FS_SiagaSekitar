# Toast Helper - Panduan Penggunaan

## Warna Toast Notification

Aplikasi SiagaSekitar menggunakan 3 jenis warna toast notification:

### 🟢 **HIJAU** - Sukses
Digunakan untuk operasi yang berhasil:
- Data berhasil disimpan
- Update berhasil
- Publish berhasil
- Delete berhasil

### 🔴 **MERAH** - Error
Digunakan untuk error sistem/network:
- Gagal fetch data dari API
- Network error
- Server error (500)
- Unexpected errors

### 🟠 **ORANYE** - Warning/Validasi
Digunakan untuk error validasi input user:
- Password tidak cocok
- Email sudah terdaftar
- Field wajib kosong
- Format data salah
- Business logic validation error

---

## Cara Penggunaan

### Import Toast Helper
```javascript
import { showToast } from '@/lib/toast-helper';
```

### 1. Success Toast (Hijau)
```javascript
// Contoh: Berhasil simpan data
showToast.success('Berhasil', 'Data berhasil disimpan');

// Contoh: Berhasil update
showToast.success('Berhasil', 'Lokasi berhasil diupdate');

// Contoh: Berhasil publish
showToast.success('Berhasil', 'Event berhasil dipublish');
```

### 2. Error Toast (Merah)
```javascript
// Contoh: Error fetch data
showToast.error('Error', 'Gagal memuat data users');

// Contoh: Network error
showToast.error('Error', 'Terjadi kesalahan koneksi');

// Contoh: Server error
showToast.error('Error', 'Terjadi kesalahan pada server');
```

### 3. Warning Toast (Oranye)
```javascript
// Contoh: Validasi password
showToast.warning('Peringatan', 'Password harus minimal 8 karakter');

// Contoh: Validasi email
showToast.warning('Peringatan', 'Email sudah terdaftar');

// Contoh: Validasi field kosong
showToast.warning('Peringatan', 'Semua field wajib diisi');

// Contoh: Validasi radius
showToast.warning('Peringatan', 'Radius peringatan harus lebih besar dari radius bahaya');
```

### 4. Info Toast (Default)
```javascript
// Contoh: Informasi umum
showToast.info('Info', 'Data sedang diproses');
```

---

## Contoh Implementasi Lengkap

### Form Validation (Warning)
```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validasi password
  if (formData.password !== formData.confirmPassword) {
    showToast.warning('Peringatan', 'Password dan konfirmasi password tidak cocok');
    return;
  }
  
  // Validasi panjang password
  if (formData.password.length < 8) {
    showToast.warning('Peringatan', 'Password harus minimal 8 karakter');
    return;
  }
  
  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      body: JSON.stringify(formData)
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Error dari server (validasi bisnis)
      if (response.status === 400) {
        showToast.warning('Peringatan', data.error);
      } else {
        showToast.error('Error', data.error);
      }
    } else {
      showToast.success('Berhasil', 'Registrasi berhasil');
    }
  } catch (error) {
    // Network/system error
    showToast.error('Error', 'Terjadi kesalahan. Silakan coba lagi.');
  }
};
```

### CRUD Operations
```javascript
// CREATE - Success
if (response.ok) {
  showToast.success('Berhasil', 'Kategori berhasil dibuat');
}

// UPDATE - Success
if (response.ok) {
  showToast.success('Berhasil', 'Data berhasil diupdate');
}

// DELETE - Success
if (response.ok) {
  showToast.success('Berhasil', 'Data berhasil dihapus');
}

// PUBLISH - Success
if (response.ok) {
  showToast.success('Berhasil', `Event dipublish. ${data.notificationsCreated} notifikasi dibuat.`);
}

// Error
if (!response.ok) {
  if (response.status === 400) {
    // Validasi error
    showToast.warning('Peringatan', data.error);
  } else {
    // System error
    showToast.error('Error', data.error);
  }
}
```

---

## Migration dari Toast Lama

### Sebelum (Lama)
```javascript
// Success
toast({ title: 'Berhasil', description: 'Data berhasil disimpan' });

// Error
toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
```

### Sesudah (Baru)
```javascript
// Success (Hijau)
showToast.success('Berhasil', 'Data berhasil disimpan');

// Error (Merah)
showToast.error('Error', 'Terjadi kesalahan');

// Warning (Oranye)
showToast.warning('Peringatan', 'Data tidak valid');
```

---

## Checklist File yang Perlu Diupdate

### ✅ Sudah Diupdate
- [x] `/app/admin/users/page.js` - Sudah menggunakan showToast

### ⏳ Perlu Diupdate
- [ ] `/app/admin/categories/page.js`
- [ ] `/app/admin/events/page.js`
- [ ] `/app/profile/page.js`
- [ ] `/app/profile/location/page.js`
- [ ] `/app/register/page.js`
- [ ] `/app/login/page.js`

---

## Testing

1. Test Success Toast (Hijau):
   - Update user location → lihat toast hijau
   - Save category → lihat toast hijau

2. Test Error Toast (Merah):
   - Matikan internet → try fetch data → lihat toast merah
   - Server error → lihat toast merah

3. Test Warning Toast (Oranye):
   - Input password < 8 karakter → lihat toast oranye
   - Password tidak match → lihat toast oranye
   - Email duplicate → lihat toast oranye

---

## Notes

- **Duration**: 
  - Success: 3 detik
  - Error: 4 detik
  - Warning: 3.5 detik
  - Info: 3 detik

- **Colors**:
  - Success: `bg-green-600 text-white`
  - Error: `bg-red-600 text-white`
  - Warning: `bg-orange-500 text-white`
  - Info: Default shadcn colors
