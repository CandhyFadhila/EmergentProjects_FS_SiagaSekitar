'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import DataTable from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { showToast } from '@/lib/toast-helper';
import { Plus, Pencil, Trash2, Send, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">Memuat peta...</div>
});

export default function AdminEventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, eventId: null });
  const [publishDialog, setPublishDialog] = useState({ open: false, eventId: null });
  const [formData, setFormData] = useState({
    categoryId: '',
    title: '',
    description: '',
    eventTime: '',
    locationLat: -7.6298,
    locationLng: 111.5239,
    kelurahan: '',
    kecamatan: '',
    kota: '',
    dangerRadiusM: 2000,
    warningRadiusM: 10000
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (session?.user?.role !== 'SSO') {
      router.push('/dashboard');
      return;
    }

    fetchCategories();
    fetchEvents();
  }, [status, session, router, pagination.page]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEvents = async (search = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/events?page=${pagination.page}&limit=${pagination.limit}&search=${search}`);
      const data = await response.json();
      setEvents(data.events || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast({ title: 'Error', description: 'Gagal memuat data events', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, event = null) => {
    if (event) {
      setFormData({
        categoryId: event.categoryId,
        title: event.title,
        description: event.description,
        eventTime: format(new Date(event.eventTime), "yyyy-MM-dd'T'HH:mm"),
        locationLat: event.locationLat,
        locationLng: event.locationLng,
        kelurahan: event.kelurahan || '',
        kecamatan: event.kecamatan || '',
        kota: event.kota || '',
        dangerRadiusM: event.dangerRadiusM,
        warningRadiusM: event.warningRadiusM
      });
    } else {
      setFormData({
        categoryId: '',
        title: '',
        description: '',
        eventTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        locationLat: -7.6298,
        locationLng: 111.5239,
        kelurahan: '',
        kecamatan: '',
        kota: '',
        dangerRadiusM: 2000,
        warningRadiusM: 10000
      });
    }
    setDialog({ open: true, mode, data: event });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = dialog.mode === 'create' ? '/api/events' : `/api/events/${dialog.data.id}`;
      const method = dialog.mode === 'create' ? 'POST' : 'PUT';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        setDialog({ open: false, mode: 'create', data: null });
        fetchEvents();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const handlePublish = async () => {
    try {
      const response = await fetch(`/api/events/${publishDialog.eventId}/publish`, { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: 'Berhasil', 
          description: `Event dipublish. ${data.notificationsCreated} notifikasi dibuat.` 
        });
        fetchEvents();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setPublishDialog({ open: false, eventId: null });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/events/${deleteDialog.eventId}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        fetchEvents();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setDeleteDialog({ open: false, eventId: null });
    }
  };

  const handleRestore = async (eventId) => {
    try {
      const response = await fetch(`/api/events/${eventId}/restore`, { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        fetchEvents();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const columns = [
    {
      header: 'Judul',
      accessorKey: 'title',
      cell: (row) => (
        <div className={row.deletedAt ? 'opacity-40' : ''}>
          <div className="font-medium">{row.title}</div>
          <div className="text-xs text-muted-foreground">{row.category.name}</div>
        </div>
      )
    },
    {
      header: 'Waktu Kejadian',
      cell: (row) => (
        <span className={row.deletedAt ? 'opacity-40' : ''}>
          {format(new Date(row.eventTime), 'dd MMM yyyy HH:mm', { locale: id })}
        </span>
      )
    },
    {
      header: 'Lokasi',
      cell: (row) => (
        <div className={`text-sm ${row.deletedAt ? 'opacity-40' : ''}`}>
          {row.kelurahan && <div>{row.kelurahan}</div>}
          {row.kota && <div className="text-muted-foreground">{row.kota}</div>}
        </div>
      )
    },
    {
      header: 'Radius',
      cell: (row) => (
        <div className={`text-sm ${row.deletedAt ? 'opacity-40' : ''}`}>
          <div className="text-red-600">Bahaya: {row.dangerRadiusM}m</div>
          <div className="text-orange-600">Peringatan: {row.warningRadiusM}m</div>
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => (
        <div className={row.deletedAt ? 'opacity-40' : ''}>
          {row.deletedAt ? (
            <Badge variant="destructive">Dihapus</Badge>
          ) : (
            <Badge variant={
              row.status === 'PUBLISHED' ? 'default' : 
              row.status === 'DRAFT' ? 'secondary' : 
              'destructive'
            }>
              {row.status}
            </Badge>
          )}
        </div>
      )
    },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (row) => (
        <TooltipProvider>
          <div className="flex justify-end gap-2">
            {row.deletedAt ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleRestore(row.id)}
                    className="text-green-600 hover:text-green-700"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Pulihkan Pengumuman</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <>
                {row.status === 'DRAFT' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setPublishDialog({ open: true, eventId: row.id })}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Publish & Kirim Notifikasi</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenDialog('edit', row)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit Pengumuman</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDeleteDialog({ open: true, eventId: row.id })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Hapus Pengumuman</p>
                  </TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </TooltipProvider>
      )
    }
  ];

  if (status === 'loading' || loading) {
    return <div className="flex items-center justify-center h-screen">Memuat...</div>;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar userRole="SSO" />
      
      <div className="flex-1 overflow-y-auto">
        <div className="p-8">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Pengumuman Bencana</h1>
              <p className="text-muted-foreground">Kelola pengumuman kejadian bencana</p>
            </div>
            <Button onClick={() => handleOpenDialog('create')}>
              <Plus className="w-4 h-4 mr-2" />
              Buat Pengumuman
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={events}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onSearch={fetchEvents}
            searchPlaceholder="Cari judul pengumuman..."
          />
        </div>
      </div>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ ...dialog, open })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'create' ? 'Buat Pengumuman' : 'Edit Pengumuman'}</DialogTitle>
            <DialogDescription>
              {dialog.mode === 'create' ? 'Buat pengumuman bencana baru' : 'Update informasi pengumuman'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Kategori Bencana</Label>
                <Select value={formData.categoryId} onValueChange={(value) => setFormData({ ...formData, categoryId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="eventTime">Waktu Kejadian</Label>
                <Input
                  id="eventTime"
                  type="datetime-local"
                  value={formData.eventTime}
                  onChange={(e) => setFormData({ ...formData, eventTime: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Judul</Label>
              <Input
                id="title"
                placeholder="Gempa Bumi 5.2 SR di Jakarta Pusat"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Detail informasi kejadian..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={4}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Lokasi Kejadian</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Klik pada peta atau geser marker untuk menentukan titik kejadian. Alamat akan terisi otomatis!
              </p>
              <MapPicker
                lat={formData.locationLat}
                lng={formData.locationLng}
                dangerRadius={formData.dangerRadiusM}
                warningRadius={formData.warningRadiusM}
                onLocationChange={(lat, lng) => {
                  setFormData({ ...formData, locationLat: lat, locationLng: lng });
                }}
                onAddressChange={(addressData) => {
                  setFormData({ 
                    ...formData, 
                    kelurahan: addressData.kelurahan,
                    kecamatan: addressData.kecamatan,
                    kota: addressData.kota
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
                <Label htmlFor="dangerRadiusM">Radius Bahaya (meter)</Label>
                <Input
                  id="dangerRadiusM"
                  type="number"
                  min="100"
                  value={formData.dangerRadiusM}
                  onChange={(e) => setFormData({ ...formData, dangerRadiusM: parseInt(e.target.value) })}
                  required
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="warningRadiusM">Radius Peringatan (meter)</Label>
                <Input
                  id="warningRadiusM"
                  type="number"
                  min={formData.dangerRadiusM}
                  value={formData.warningRadiusM}
                  onChange={(e) => setFormData({ ...formData, warningRadiusM: parseInt(e.target.value) })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Harus lebih besar atau sama dengan radius bahaya
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog({ open: false, mode: 'create', data: null })}>
                Batal
              </Button>
              <Button type="submit">
                {dialog.mode === 'create' ? 'Simpan sebagai Draft' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={publishDialog.open} onOpenChange={(open) => setPublishDialog({ ...publishDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Publish Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Pengumuman akan dikirim ke semua user dalam radius peringatan. Notifikasi akan dibuat otomatis. Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handlePublish}>Publish</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Pengumuman</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus pengumuman ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
