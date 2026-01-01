'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { AlertTriangle, MapPin, Calendar } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function UserHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nearHome, setNearHome] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role === 'SSO') {
      router.push('/admin/dashboard');
      return;
    }

    fetchHistory();
  }, [status, session, router, nearHome]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/history?nearHome=${nearHome}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-screen">Memuat...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="USER" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Riwayat Kejadian</h1>
              <p className="text-muted-foreground">
                {nearHome ? 'Kejadian bencana di sekitar lokasi Anda' : 'Semua kejadian bencana'}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Label htmlFor="near-home">Sekitar Rumah</Label>
              <Switch
                id="near-home"
                checked={nearHome}
                onCheckedChange={setNearHome}
              />
            </div>
          </div>

          <div className="space-y-4">
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {nearHome ? 'Tidak ada kejadian di sekitar rumah Anda' : 'Belum ada riwayat kejadian'}
                </CardContent>
              </Card>
            ) : (
              events.map((event) => (
                <Card key={event.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
                        <AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-lg">{event.title}</h3>
                            <Badge className="mt-1">{event.category.name}</Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{event.description}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            <span>{format(new Date(event.eventTime), 'dd MMM yyyy HH:mm', { locale: id })}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            <span>{event.kelurahan}, {event.kota}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
