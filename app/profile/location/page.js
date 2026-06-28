'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showToast } from '@/lib/toast-helper';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">Memuat peta...</div>
});

export default function ProfileLocationPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    homeLat: -7.6298,
    homeLng: 111.5239,
    kelurahan: '',
    kecamatan: '',
    kota: '',
    provinsi: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role === 'SSO') {
      router.push('/admin/dashboard');
      return;
    }

    fetchProfile();
  }, [status, session, router]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile');
      const data = await response.json();
      if (data.profile) {
        setFormData({
          homeLat: data.profile.homeLat,
          homeLng: data.profile.homeLng,
          kelurahan: data.profile.kelurahan || '',
          kecamatan: data.profile.kecamatan || '',
          kota: data.profile.kota || '',
          provinsi: data.profile.provinsi || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      showToast.error('Error', 'Gagal memuat data profil');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch('/api/profile/location', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        showToast.success('Berhasil', data.message);
      } else {
        showToast.error('Error', data.error);
      }
    } catch (error) {
      showToast.error('Error', 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-screen">Memuat...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="USER" />
      
      {/* Main Content - with padding top for mobile header */}
      <div className="flex-1 overflow-y-auto pt-16 lg:pt-0">
        <div className="p-4 md:p-6 lg:p-8">
          <div className="mb-6 md:mb-8">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Lokasi Rumah</h1>
            <p className="text-sm md:text-base text-muted-foreground">Update lokasi rumah untuk menerima notifikasi yang akurat</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Atur Lokasi Rumah</CardTitle>
              <CardDescription>
                Notifikasi bencana akan dikirim berdasarkan jarak lokasi rumah Anda dari titik kejadian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label>Titik Lokasi</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Klik pada peta atau geser marker untuk menentukan lokasi rumah Anda. Alamat akan terisi otomatis!
                  </p>
                  <MapPicker
                    lat={formData.homeLat}
                    lng={formData.homeLng}
                    onLocationChange={(lat, lng) => {
                      setFormData({ ...formData, homeLat: lat, homeLng: lng });
                    }}
                    onAddressChange={(addressData) => {
                      setFormData({ 
                        ...formData, 
                        kelurahan: addressData.kelurahan,
                        kecamatan: addressData.kecamatan,
                        kota: addressData.kota,
                        provinsi: addressData.provinsi
                      });
                    }}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="kelurahan">Kelurahan</Label>
                    <Input
                      id="kelurahan"
                      placeholder="Nama kelurahan"
                      value={formData.kelurahan}
                      onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kecamatan">Kecamatan</Label>
                    <Input
                      id="kecamatan"
                      placeholder="Nama kecamatan"
                      value={formData.kecamatan}
                      onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="kota">Kota/Kabupaten</Label>
                    <Input
                      id="kota"
                      placeholder="Nama kota"
                      value={formData.kota}
                      onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="provinsi">Provinsi</Label>
                    <Input
                      id="provinsi"
                      placeholder="Nama provinsi"
                      value={formData.provinsi}
                      onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                    />
                  </div>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
v>
      </div>
    </div>
  );
}
