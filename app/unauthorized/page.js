export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-red-600 mb-4">403</h1>
        <h2 className="text-2xl font-semibold mb-2">Akses Ditolak</h2>
        <p className="text-muted-foreground mb-6">Anda tidak memiliki izin untuk mengakses halaman ini.</p>
        <a href="/login" className="text-primary hover:underline">Kembali ke login</a>
      </div>
    </div>
  );
}
