'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import DataTable from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { showToast } from '@/lib/toast-helper';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Trash2, RefreshCw, Eye } from 'lucide-react';
import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('@/components/map-picker'), {
  ssr: false,
  loading: () => <div className="w-full h-[400px] bg-muted rounded-lg flex items-center justify-center">Memuat peta...</div>
});

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null });
  const [resetDialog, setResetDialog] = useState({ open: false, userId: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, user: null, isEditing: false });
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

    if (session?.user?.role !== 'SSO') {
      router.push('/dashboard');
      return;
    }

    fetchUsers();
  }, [status, session, router, pagination.page]);

  const fetchUsers = async (search = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/users?page=${pagination.page}&limit=${pagination.limit}&search=${search}`);
      const data = await response.json();
      setUsers(data.users || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({ title: 'Error', description: 'Gagal memuat data users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (userId) => {
    try {
      const response = await fetch(`/api/users/${userId}/detail`);
      const data = await response.json();
      
      if (response.ok) {
        setDetailDialog({ open: true, user: data.user, isEditing: false });
        setFormData({
          homeLat: data.user.homeLat,
          homeLng: data.user.homeLng,
          kelurahan: data.user.kelurahan || '',
          kecamatan: data.user.kecamatan || '',
          kota: data.user.kota || '',
          provinsi: data.user.provinsi || ''
        });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const handleUpdateUser = async () => {
    try {
      const response = await fetch(`/api/users/${detailDialog.user.id}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        setDetailDialog({ open: false, user: null, isEditing: false });
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/users/${deleteDialog.userId}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        fetchUsers();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setDeleteDialog({ open: false, userId: null });
    }
  };

  const handleResetPassword = async () => {
    try {
      const response = await fetch(`/api/users/${resetDialog.userId}/reset-password`, { method: 'POST' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setResetDialog({ open: false, userId: null });
    }
  };

  const columns = [
    {
      header: 'Nama',
      accessorKey: 'fullName',
      cell: (row) => <span className="font-medium">{row.fullName}</span>
    },
    {
      header: 'Email',
      accessorKey: 'email'
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (row) => (
        <Badge variant={row.role === 'SSO' ? 'default' : 'secondary'}>
          {row.role}
        </Badge>
      )
    },
    {
      header: 'Lokasi',
      cell: (row) => (
        <div className="text-sm">
          {row.kelurahan && <div>{row.kelurahan}</div>}
          {row.kota && <div className="text-muted-foreground">{row.kota}</div>}
        </div>
      )
    },
    {
      header: 'Status',
      cell: (row) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Aktif' : 'Nonaktif'}
        </Badge>
      )
    },
    {
      header: 'Last Login',
      cell: (row) => row.lastLoginAt ? format(new Date(row.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: id }) : '-'
    },
    {
      header: 'Aksi',
      className: 'text-right',
      cell: (row) => (
        <TooltipProvider>
          <div className="flex justify-end gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDetail(row.id)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Lihat & Edit Detail User</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setResetDialog({ open: true, userId: row.id })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Reset Password ke Default</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialog({ open: true, userId: row.id })}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Nonaktifkan User</p>
              </TooltipContent>
            </Tooltip>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Manajemen User</h1>
            <p className="text-muted-foreground">Kelola pengguna sistem</p>
          </div>

          <DataTable
            columns={columns}
            data={users}
            pagination={pagination}
            onPageChange={(page) => setPagination({ ...pagination, page })}
            onSearch={fetchUsers}
            searchPlaceholder="Cari nama atau email..."
          />
        </div>
      </div>

      {/* Detail & Edit User Dialog */}
      <Dialog open={detailDialog.open} onOpenChange={(open) => {
        if (!open) {
          setDetailDialog({ open: false, user: null, isEditing: false });
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail User</DialogTitle>
            <DialogDescription>
              {detailDialog.isEditing ? 'Edit informasi user (kecuali email, password, dan nama)' : 'Informasi lengkap user'}
            </DialogDescription>
          </DialogHeader>

          {detailDialog.user && (
            <div className="space-y-6">
              {/* User Info - Read Only */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold">Informasi User</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nama Lengkap</Label>
                    <p className="font-medium">{detailDialog.user.fullName}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="font-medium">{detailDialog.user.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Role</Label>
                    <div>
                      <Badge variant={detailDialog.user.role === 'SSO' ? 'default' : 'secondary'}>
                        {detailDialog.user.role}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div>
                      <Badge variant={detailDialog.user.isActive ? 'default' : 'secondary'}>
                        {detailDialog.user.isActive ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bergabung Sejak</Label>
                    <p className="font-medium">
                      {format(new Date(detailDialog.user.createdAt), 'dd MMMM yyyy', { locale: id })}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Last Login</Label>
                    <p className="font-medium">
                      {detailDialog.user.lastLoginAt 
                        ? format(new Date(detailDialog.user.lastLoginAt), 'dd MMM yyyy HH:mm', { locale: id })
                        : 'Belum pernah login'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Location Info - Editable */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Informasi Lokasi</h3>
                  {!detailDialog.isEditing && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => setDetailDialog({ ...detailDialog, isEditing: true })}
                    >
                      Edit Lokasi
                    </Button>
                  )}
                </div>

                {detailDialog.isEditing ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Titik Lokasi Rumah</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Gunakan search box atau klik/drag marker untuk mengubah lokasi
                      </p>
                      <MapPicker
                        lat={formData.homeLat}
                        lng={formData.homeLng}
                        onLocationChange={(lat, lng) => {
                          setFormData({ ...formData, homeLat: lat, homeLng: lng });
                        }}
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="kelurahan">Kelurahan</Label>
                        <Input
                          id="kelurahan"
                          value={formData.kelurahan}
                          onChange={(e) => setFormData({ ...formData, kelurahan: e.target.value })}
                          placeholder="Nama kelurahan"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="kecamatan">Kecamatan</Label>
                        <Input
                          id="kecamatan"
                          value={formData.kecamatan}
                          onChange={(e) => setFormData({ ...formData, kecamatan: e.target.value })}
                          placeholder="Nama kecamatan"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="kota">Kota/Kabupaten</Label>
                        <Input
                          id="kota"
                          value={formData.kota}
                          onChange={(e) => setFormData({ ...formData, kota: e.target.value })}
                          placeholder="Nama kota"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="provinsi">Provinsi</Label>
                        <Input
                          id="provinsi"
                          value={formData.provinsi}
                          onChange={(e) => setFormData({ ...formData, provinsi: e.target.value })}
                          placeholder="Nama provinsi"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <Label className="text-muted-foreground">Koordinat</Label>
                      <p className="font-medium font-mono text-sm">
                        {detailDialog.user.homeLat.toFixed(6)}, {detailDialog.user.homeLng.toFixed(6)}
                      </p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Kelurahan</Label>
                      <p className="font-medium">{detailDialog.user.kelurahan || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Kecamatan</Label>
                      <p className="font-medium">{detailDialog.user.kecamatan || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Kota/Kabupaten</Label>
                      <p className="font-medium">{detailDialog.user.kota || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Provinsi</Label>
                      <p className="font-medium">{detailDialog.user.provinsi || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            {detailDialog.isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setDetailDialog({ ...detailDialog, isEditing: false })}
                >
                  Batal
                </Button>
                <Button onClick={handleUpdateUser}>
                  Simpan Perubahan
                </Button>
              </>
            ) : (
              <Button onClick={() => setDetailDialog({ open: false, user: null, isEditing: false })}>
                Tutup
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nonaktifkan User</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menonaktifkan user ini? User tidak akan bisa login lagi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Nonaktifkan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={resetDialog.open} onOpenChange={(open) => setResetDialog({ ...resetDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Password</AlertDialogTitle>
            <AlertDialogDescription>
              Password user akan direset menjadi default: <strong>12345678</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleResetPassword}>Reset</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
