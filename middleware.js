import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const isAdmin = token?.role === 'SSO';
    const isUser = token?.role === 'USER';
    const path = req.nextUrl.pathname;

    // Admin routes
    if (path.startsWith('/admin') && !isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    // User routes
    if (path.startsWith('/dashboard') && !isUser && !isAdmin) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
    pages: {
      signIn: '/login'
    }
  }
);

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/history/:path*', '/profile/:path*']
};
