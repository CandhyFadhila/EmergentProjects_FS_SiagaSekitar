'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import DataTable from '@/components/data-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Trash2, RefreshCw } from 'lucide-react';

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null });
  const [resetDialog, setResetDialog] = useState({ open: false, userId: null });

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
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setResetDialog({ open: true, userId: row.id })}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => setDeleteDialog({ open: true, userId: row.id })}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
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
