'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageToggle } from '@/components/language-toggle';
import { useLanguage } from '@/lib/language-context';
import { 
  Bell, 
  MapPin, 
  Shield, 
  Smartphone,
  AlertTriangle,
  TrendingUp,
  Users,
  Clock
} from 'lucide-react';

export default function LandingPage() {
  const [recentDisasters, setRecentDisasters] = useState([]);
  const [stats, setStats] = useState({ total: 0, categories: 0, users: 0 });
  const [loading, setLoading] = useState(true);
  const { t } = useLanguage();

  useEffect(() => {
    fetchPublicData();
  }, []);

  const fetchPublicData = async () => {
    try {
      const res = await fetch('/api/public/recent-disasters');
      const data = await res.json();
      if (data.success) {
        setRecentDisasters(data.disasters || []);
        setStats(data.stats || { total: 0, categories: 0, users: 0 });
      }
    } catch (error) {
      console.error('Error fetching public data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getCategoryColor = (code) => {
    const colors = {
      'GEMPA': 'bg-red-500',
      'TSUNAMI': 'bg-blue-500',
      'BANJIR': 'bg-cyan-500',
      'LONGSOR': 'bg-yellow-600'
    };
    return colors[code] || 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">SiagaSekitar</h1>
          </div>
          <div className="flex gap-3 items-center">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost">{t('login')}</Button>
            </Link>
            <Link href="/register">
              <Button>{t('register')}</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-b from-primary/10 to-background">
        <div className="container mx-auto px-4 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-primary/20 rounded-full">
              <AlertTriangle className="w-16 h-16 text-primary" />
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            Waspada Bencana, <br />Lindungi Keluarga Anda
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Platform notifikasi bencana alam berbasis lokasi untuk Indonesia. 
            Dapatkan peringatan dini gempa, tsunami, banjir, dan longsor di sekitar rumah Anda.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                <Bell className="w-5 h-5" />
                Mulai Sekarang - Gratis
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sudah Punya Akun?
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.total}</div>
              <div className="text-muted-foreground">Total Bencana Tercatat</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.categories}</div>
              <div className="text-muted-foreground">Kategori Bencana</div>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Users className="w-8 h-8 text-green-500" />
              </div>
              <div className="text-3xl font-bold text-foreground">{stats.users}</div>
              <div className="text-muted-foreground">Pengguna Terdaftar</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Fitur Unggulan SiagaSekitar
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Sistem peringatan dini yang cerdas dan responsif untuk melindungi Anda dan keluarga
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Bell className="w-6 h-6 text-red-500" />
                </div>
                <CardTitle>Notifikasi Real-time</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Dapatkan peringatan instan saat bencana terjadi di sekitar lokasi Anda
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="w-6 h-6 text-blue-500" />
                </div>
                <CardTitle>Berbasis Lokasi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Sistem menghitung jarak dan memberikan prioritas peringatan sesuai radius bahaya
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-purple-500" />
                </div>
                <CardTitle>Multi Kategori</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Pantau gempa bumi, tsunami, banjir, dan longsor dalam satu platform
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center mb-4">
                  <Smartphone className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>Mudah Digunakan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Interface sederhana dan responsif, akses dari mana saja kapan saja
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Recent Disasters Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-foreground mb-4">
              Bencana Terbaru
            </h3>
            <p className="text-muted-foreground">
              Informasi bencana yang baru saja terjadi di Indonesia
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Memuat data...</p>
            </div>
          ) : recentDisasters.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Belum ada data bencana</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {recentDisasters.map((disaster) => (
                <Card key={disaster.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between mb-2">
                      <Badge className={getCategoryColor(disaster.category_code)}>
                        {disaster.category_name}
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {disaster.severity}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{disaster.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{disaster.kelurahan}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 flex-shrink-0" />
                        <span>{formatDate(disaster.event_time)}</span>
                      </div>
                      {disaster.description && (
                        <p className="mt-3 text-foreground line-clamp-2">
                          {disaster.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <div className="text-center mt-12">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                Daftar untuk Info Lebih Lengkap
                <Bell className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Siap Melindungi Keluarga Anda?
          </h3>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Bergabunglah dengan ribuan pengguna yang sudah merasakan manfaat peringatan dini bencana
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                <Bell className="w-5 h-5" />
                Daftar Gratis Sekarang
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">SiagaSekitar</span>
          </div>
          <p className="text-sm">
            Platform Notifikasi Bencana Alam Indonesia
          </p>
          <p className="text-xs mt-2">
            © 2024 SiagaSekitar. Semua hak dilindungi.
          </p>
        </div>
      </footer>
    </div>
  );
}
