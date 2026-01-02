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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, RotateCcw } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

export default function AdminCategoriesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState({ open: false, mode: 'create', data: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, categoryId: null });
  const [formData, setFormData] = useState({ code: '', name: '', description: '', isActive: true });

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
  }, [status, session, router]);

  const fetchCategories = async (search = '') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/categories?search=${search}`);
      const data = await response.json();
      setCategories(data.categories || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast({ title: 'Error', description: 'Gagal memuat data kategori', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mode, category = null) => {
    if (category) {
      setFormData({
        code: category.code,
        name: category.name,
        description: category.description || '',
        isActive: category.isActive
      });
    } else {
      setFormData({ code: '', name: '', description: '', isActive: true });
    }
    setDialog({ open: true, mode, data: category });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const url = dialog.mode === 'create' ? '/api/categories' : `/api/categories/${dialog.data.id}`;
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
        fetchCategories();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/categories/${deleteDialog.categoryId}`, { method: 'DELETE' });
      const data = await response.json();
      
      if (response.ok) {
        toast({ title: 'Berhasil', description: data.message });
        fetchCategories();
      } else {
        toast({ title: 'Error', description: data.error, variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setDeleteDialog({ open: false, categoryId: null });
    }
  };

  const columns = [
    {
      header: 'Kode',
      accessorKey: 'code',
      cell: (row) => (
        <span className={`font-mono font-bold ${row.deletedAt ? 'opacity-40' : ''}`}>
          {row.code}
        </span>
      )
    },
    {
      header: 'Nama',
      accessorKey: 'name',
      cell: (row) => (
        <span className={`font-medium ${row.deletedAt ? 'opacity-40' : ''}`}>
          {row.name}
        </span>
      )
    },
    {
      header: 'Deskripsi',
      accessorKey: 'description',
      cell: (row) => (
        <span className={`text-sm text-muted-foreground ${row.deletedAt ? 'opacity-40' : ''}`}>
          {row.description || '-'}
        </span>
      )
    },
    {
      header: 'Status',
      cell: (row) => (
        <div className={row.deletedAt ? 'opacity-40' : ''}>
          {row.deletedAt ? (
            <Badge variant="destructive">Dihapus</Badge>
          ) : (
            <Badge variant={row.isActive ? 'default' : 'secondary'}>
              {row.isActive ? 'Aktif' : 'Nonaktif'}
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
          <div className={`flex justify-end gap-2 ${row.deletedAt ? 'opacity-40 pointer-events-none' : ''}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenDialog('edit', row)}
                  disabled={!!row.deletedAt}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit Kategori</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteDialog({ open: true, categoryId: row.id })}
                  disabled={!!row.deletedAt}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Hapus Kategori</p>
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
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Kategori Bencana</h1>
              <p className="text-muted-foreground">Kelola kategori bencana alam</p>
            </div>
            <Button onClick={() => handleOpenDialog('create')}>
              <Plus className="w-4 h-4 mr-2" />
              Tambah Kategori
            </Button>
          </div>

          <DataTable
            columns={columns}
            data={categories}
            onSearch={fetchCategories}
            searchPlaceholder="Cari kode atau nama kategori..."
          />
        </div>
      </div>

      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ ...dialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.mode === 'create' ? 'Tambah Kategori' : 'Edit Kategori'}</DialogTitle>
            <DialogDescription>
              {dialog.mode === 'create' ? 'Buat kategori bencana baru' : 'Update informasi kategori'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Kode</Label>
              <Input
                id="code"
                placeholder="GEMPA"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                disabled={dialog.mode === 'edit'}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nama</Label>
              <Input
                id="name"
                placeholder="Gempa Bumi"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Deskripsi</Label>
              <Textarea
                id="description"
                placeholder="Deskripsi kategori..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">Aktif</Label>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialog({ open: false, mode: 'create', data: null })}>
                Batal
              </Button>
              <Button type="submit">
                {dialog.mode === 'create' ? 'Tambah' : 'Update'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ ...deleteDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Kategori</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus kategori ini?
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
