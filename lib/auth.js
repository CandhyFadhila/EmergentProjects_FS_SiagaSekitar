import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  return session?.user;
}

export async function requireAuth(requiredRole = null) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  if (requiredRole && user.role !== requiredRole) {
    redirect('/unauthorized');
  }
  
  return user;
}

export function isAdmin(user) {
  return user?.role === 'SSO';
}

export function isUser(user) {
  return user?.role === 'USER';
}
