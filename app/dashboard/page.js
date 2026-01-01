'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Bell, MapPin } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6'];

export default function UserDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role === 'SSO') {
      router.push('/admin/dashboard');
      return;
    }

    fetchDashboardData();
  }, [status, session, router]);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/dashboard/user');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className=\"flex items-center justify-center h-screen\">Memuat...</div>;
  }

  return (
    <div className=\"flex h-screen bg-background\">
      <Sidebar userRole=\"USER\" />
      
      <div className=\"flex-1 overflow-y-auto\">
        <div className=\"p-8\">
          <div className=\"mb-8\">
            <h1 className=\"text-3xl font-bold mb-2\">Dashboard</h1>
            <p className=\"text-muted-foreground\">
              Selamat datang, {session?.user?.name}
            </p>
          </div>

          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-6 mb-8\">
            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Kejadian Terdekat</CardTitle>
                <AlertTriangle className=\"h-4 w-4 text-muted-foreground\" />
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold\">{stats?.totalNearbyEvents || 0}</div>
                <p className=\"text-xs text-muted-foreground\">
                  Dalam 30 hari terakhir
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Notifikasi Belum Dibaca</CardTitle>
                <Bell className=\"h-4 w-4 text-muted-foreground\" />
              </CardHeader>
              <CardContent>
                <div className=\"text-2xl font-bold\">{stats?.unreadNotifications || 0}</div>
                <p className=\"text-xs text-muted-foreground\">
                  Notifikasi baru
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">
                <CardTitle className=\"text-sm font-medium\">Lokasi Anda</CardTitle>
                <MapPin className=\"h-4 w-4 text-muted-foreground\" />
              </CardHeader>
              <CardContent>
                <div className=\"text-sm font-medium\">Terdaftar</div>
                <p className=\"text-xs text-muted-foreground\">
                  Klik menu Lokasi Rumah untuk update
                </p>
              </CardContent>
            </Card>
          </div>

          <div className=\"grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8\">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Kejadian per Kategori</CardTitle>
                <CardDescription>Di sekitar lokasi Anda</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.eventsByCategory?.length > 0 ? (
                  <ResponsiveContainer width=\"100%\" height={300}>
                    <PieChart>
                      <Pie
                        data={stats.eventsByCategory}
                        cx=\"50%\"
                        cy=\"50%\"
                        labelLine={false}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        outerRadius={80}
                        fill=\"#8884d8\"
                        dataKey=\"count\"
                      >
                        {stats.eventsByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className=\"h-[300px] flex items-center justify-center text-muted-foreground\">
                    Tidak ada kejadian di sekitar Anda
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Kejadian Terbaru</CardTitle>
                <CardDescription>5 kejadian terakhir di sekitar Anda</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.recentEvents?.length > 0 ? (
                  <div className=\"space-y-4\">
                    {stats.recentEvents.map((event, index) => (
                      <div key={index} className=\"flex items-start gap-3 pb-4 border-b last:border-0\">
                        <AlertTriangle className=\"h-5 w-5 text-orange-500 mt-0.5\" />
                        <div className=\"flex-1\">
                          <h4 className=\"font-medium text-sm\">{event.title}</h4>
                          <p className=\"text-xs text-muted-foreground mt-1\">
                            {event.category.name} • {format(new Date(event.eventTime), 'dd MMM yyyy HH:mm', { locale: id })}
                          </p>
                          <p className=\"text-xs text-muted-foreground mt-1\">
                            {event.kelurahan}, {event.kota}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className=\"h-[300px] flex items-center justify-center text-muted-foreground\">
                    Tidak ada kejadian terbaru
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Penting</CardTitle>
            </CardHeader>
            <CardContent>
              <div className=\"space-y-2\">
                <p className=\"text-sm\">
                  ✅ Anda akan menerima notifikasi untuk kejadian bencana dalam radius peringatan dari lokasi rumah Anda.
                </p>
                <p className=\"text-sm\">
                  📍 Pastikan lokasi rumah Anda sudah diatur dengan benar di menu <strong>Lokasi Rumah</strong>.
                </p>
                <p className=\"text-sm\">
                  🔔 Periksa notifikasi secara berkala untuk mendapatkan informasi terbaru.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
