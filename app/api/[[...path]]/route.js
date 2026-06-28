import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { calculateDistance, getPriority } from '@/lib/distance';

// Helper to get current user from session
async function getCurrentUser(request) {
  const session = await getServerSession(authOptions);
  return session?.user;
}

// Helper for unauthorized response
function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Helper for forbidden response
function forbidden() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// POST /api/register
async function handleRegister(request) {
  try {
    const body = await request.json();
    const { email, password, fullName, homeLat, homeLng, kelurahan, kecamatan, kota, provinsi } = body;

    // Check if email already exists
    const existing = await prisma.user.findFirst({
      where: { email, deletedAt: null }
    });

    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: 'USER',
        homeLat: parseFloat(homeLat),
        homeLng: parseFloat(homeLng),
        kelurahan,
        kecamatan,
        kota,
        provinsi,
        isActive: true
      }
    });

    // Update home_point using raw query
    await prisma.$executeRawUnsafe(
      `UPDATE users 
       SET home_point = ST_SetSRID(ST_MakePoint(${user.homeLng}, ${user.homeLat}), 4326)
       WHERE id = '${user.id}'`
    );

    return NextResponse.json({
      message: 'Registrasi berhasil',
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/users/:id/detail - Admin only
async function handleGetUserDetail(request, user, userId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const userDetail = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        homeLat: true,
        homeLng: true,
        kelurahan: true,
        kecamatan: true,
        kota: true,
        provinsi: true,
        lastLoginAt: true,
        createdAt: true
      }
    });

    if (!userDetail) {
      return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({ user: userDetail });
  } catch (error) {
    console.error('Get user detail error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT /api/users/:id/update - Admin only (update location only)
async function handleUpdateUserLocation(request, user, userId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const body = await request.json();
    const { homeLat, homeLng, kelurahan, kecamatan, kota, provinsi } = body;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        homeLat: parseFloat(homeLat),
        homeLng: parseFloat(homeLng),
        kelurahan,
        kecamatan,
        kota,
        provinsi
      }
    });

    // Update home_point using raw query
    await prisma.$executeRawUnsafe(
      `UPDATE users 
       SET home_point = ST_SetSRID(ST_MakePoint(${updated.homeLng}, ${updated.homeLat}), 4326)
       WHERE id = '${userId}'`
    );

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'UPDATE_USER_LOCATION',
        entityType: 'USER',
        entityId: userId,
        metadata: { updatedBy: 'admin' }
      }
    });

    return NextResponse.json({ message: 'Data user berhasil diupdate', user: updated });
  } catch (error) {
    console.error('Update user location error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/users - Admin only
async function handleGetUsers(request, user) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const skip = (page - 1) * limit;

    const where = {
      ...(search && {
        OR: [
          { email: { contains: search, mode: 'insensitive' } },
          { fullName: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    let [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          isActive: true,
          kelurahan: true,
          kecamatan: true,
          kota: true,
          lastLoginAt: true,
          deletedAt: true,
          createdAt: true
        }
      }),
      prisma.user.count({ where })
    ]);

    // Manual sorting: active users first (sorted by createdAt desc), then deleted users
    users = users.sort((a, b) => {
      // If one is deleted and one is not, deleted goes to bottom
      if (a.deletedAt && !b.deletedAt) return 1;
      if (!a.deletedAt && b.deletedAt) return -1;
      
      // If both have same deletion status, sort by createdAt desc
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// DELETE /api/users/:id - Admin only (Soft delete)
async function handleDeleteUser(request, user, userId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'SOFT_DELETE_USER',
        entityType: 'USER',
        entityId: userId,
        metadata: {}
      }
    });

    return NextResponse.json({ message: 'User berhasil dinonaktifkan' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/users/:id/restore - Admin only
async function handleRestoreUser(request, user, userId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: null, isActive: true }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'RESTORE_USER',
        entityType: 'USER',
        entityId: userId,
        metadata: {}
      }
    });

    return NextResponse.json({ message: 'User berhasil dipulihkan' });
  } catch (error) {
    console.error('Restore user error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/users/:id/reset-password - Admin only
async function handleResetPassword(request, user, userId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const defaultPassword = '12345678';
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'RESET_PASSWORD',
        entityType: 'USER',
        entityId: userId,
        metadata: {}
      }
    });

    return NextResponse.json({ message: 'Password berhasil direset ke default (12345678)' });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/categories
async function handleGetCategories(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const includeDeleted = user?.role === 'SSO'; // Only admin can see deleted items

    // Build where clause
    const where = search ? {
      OR: [
        { code: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    } : {};

    // For admin, get all (including deleted), for others only active
    if (!includeDeleted) {
      where.deletedAt = null;
    }

    let categories = await prisma.disasterCategory.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        description: true,
        isActive: true,
        deletedAt: true,
        createdAt: true
      }
    });

    // Manual sorting: active items first (sorted by name), then deleted items (sorted by name)
    categories = categories.sort((a, b) => {
      // If one is deleted and one is not, deleted goes to bottom
      if (a.deletedAt && !b.deletedAt) return 1;
      if (!a.deletedAt && b.deletedAt) return -1;
      
      // If both have same deletion status, sort by name
      return a.name.localeCompare(b.name);
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/categories - Admin only
async function handleCreateCategory(request, user) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const body = await request.json();
    const { code, name, description } = body;

    // Check if code already exists
    const existing = await prisma.disasterCategory.findFirst({
      where: { code, deletedAt: null }
    });

    if (existing) {
      return NextResponse.json({ error: 'Kode kategori sudah digunakan' }, { status: 400 });
    }

    const category = await prisma.disasterCategory.create({
      data: {
        code: code.toUpperCase(),
        name,
        description,
        isActive: true
      }
    });

    return NextResponse.json({ message: 'Kategori berhasil dibuat', category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT /api/categories/:id - Admin only
async function handleUpdateCategory(request, user, categoryId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const body = await request.json();
    const { name, description, isActive } = body;

    const category = await prisma.disasterCategory.update({
      where: { id: categoryId },
      data: {
        name,
        description,
        isActive
      }
    });

    return NextResponse.json({ message: 'Kategori berhasil diupdate', category });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// DELETE /api/categories/:id - Admin only (Soft delete)
async function handleDeleteCategory(request, user, categoryId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.disasterCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() }
    });

    return NextResponse.json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/categories/:id/restore - Admin only (Restore soft deleted)
async function handleRestoreCategory(request, user, categoryId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.disasterCategory.update({
      where: { id: categoryId },
      data: { deletedAt: null }
    });

    return NextResponse.json({ message: 'Kategori berhasil dipulihkan' });
  } catch (error) {
    console.error('Restore category error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/events
async function handleGetEvents(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status');
    const categoryId = searchParams.get('categoryId');
    const skip = (page - 1) * limit;

    const where = {
      ...(status && { status }),
      ...(categoryId && { categoryId }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      })
    };

    let [events, total] = await Promise.all([
      prisma.disasterEvent.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          creator: {
            select: {
              id: true,
              fullName: true
            }
          }
        }
      }),
      prisma.disasterEvent.count({ where })
    ]);

    // Manual sorting: active events first (sorted by eventTime desc), then deleted events
    events = events.sort((a, b) => {
      // If one is deleted and one is not, deleted goes to bottom
      if (a.deletedAt && !b.deletedAt) return 1;
      if (!a.deletedAt && b.deletedAt) return -1;
      
      // If both have same deletion status, sort by eventTime desc
      return new Date(b.eventTime) - new Date(a.eventTime);
    });

    return NextResponse.json({
      events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/events - Admin only
async function handleCreateEvent(request, user) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const body = await request.json();
    const {
      categoryId,
      title,
      description,
      eventTime,
      locationLat,
      locationLng,
      kelurahan,
      kecamatan,
      kota,
      dangerRadiusM,
      warningRadiusM
    } = body;

    const event = await prisma.disasterEvent.create({
      data: {
        categoryId,
        title,
        description,
        eventTime: new Date(eventTime),
        locationLat: parseFloat(locationLat),
        locationLng: parseFloat(locationLng),
        kelurahan,
        kecamatan,
        kota,
        dangerRadiusM: parseInt(dangerRadiusM),
        warningRadiusM: parseInt(warningRadiusM),
        status: 'DRAFT',
        createdBy: user.id
      }
    });

    // Update location_point using raw query
    await prisma.$executeRawUnsafe(
      `UPDATE disaster_events 
       SET location_point = ST_SetSRID(ST_MakePoint(${event.locationLng}, ${event.locationLat}), 4326)
       WHERE id = '${event.id}'`
    );

    return NextResponse.json({ message: 'Event berhasil dibuat', event });
  } catch (error) {
    console.error('Create event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT /api/events/:id - Admin only
async function handleUpdateEvent(request, user, eventId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const body = await request.json();
    const {
      categoryId,
      title,
      description,
      eventTime,
      locationLat,
      locationLng,
      kelurahan,
      kecamatan,
      kota,
      dangerRadiusM,
      warningRadiusM
    } = body;

    const event = await prisma.disasterEvent.update({
      where: { id: eventId },
      data: {
        categoryId,
        title,
        description,
        eventTime: eventTime ? new Date(eventTime) : undefined,
        locationLat: locationLat ? parseFloat(locationLat) : undefined,
        locationLng: locationLng ? parseFloat(locationLng) : undefined,
        kelurahan,
        kecamatan,
        kota,
        dangerRadiusM: dangerRadiusM ? parseInt(dangerRadiusM) : undefined,
        warningRadiusM: warningRadiusM ? parseInt(warningRadiusM) : undefined
      }
    });

    // Update location_point if coordinates changed
    if (locationLat && locationLng) {
      await prisma.$executeRawUnsafe(
        `UPDATE disaster_events 
         SET location_point = ST_SetSRID(ST_MakePoint(${parseFloat(locationLng)}, ${parseFloat(locationLat)}), 4326)
         WHERE id = '${eventId}'`
      );
    }

    return NextResponse.json({ message: 'Event berhasil diupdate', event });
  } catch (error) {
    console.error('Update event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/events/:id/publish - Admin only
async function handlePublishEvent(request, user, eventId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const event = await prisma.disasterEvent.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event tidak ditemukan' }, { status: 404 });
    }

    // Get all active users
    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        homeLat: true,
        homeLng: true
      }
    });

    // Calculate distances and create notifications
    const notifications = [];
    for (const targetUser of users) {
      const distance = calculateDistance(
        event.locationLat,
        event.locationLng,
        targetUser.homeLat,
        targetUser.homeLng
      );

      const priority = getPriority(distance, event.dangerRadiusM, event.warningRadiusM);

      if (priority) {
        // Check if notification already exists
        const existing = await prisma.userNotification.findFirst({
          where: {
            userId: targetUser.id,
            eventId: event.id,
            deletedAt: null
          }
        });

        if (!existing) {
          notifications.push({
            userId: targetUser.id,
            eventId: event.id,
            priority,
            distanceM: distance,
            channel: 'IN_APP',
            emailStatus: process.env.SSL_ENABLED === 'true' ? 'PENDING' : 'SKIPPED_NO_SSL'
          });
        }
      }
    }

    // Bulk create notifications
    if (notifications.length > 0) {
      await prisma.userNotification.createMany({
        data: notifications
      });
    }

    // Update event status
    await prisma.disasterEvent.update({
      where: { id: eventId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date()
      }
    });

    // Log audit
    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        action: 'PUBLISH_EVENT',
        entityType: 'DISASTER_EVENT',
        entityId: eventId,
        metadata: { notificationsCreated: notifications.length }
      }
    });

    return NextResponse.json({
      message: 'Event berhasil dipublish',
      notificationsCreated: notifications.length
    });
  } catch (error) {
    console.error('Publish event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// DELETE /api/events/:id - Admin only (Soft delete)
async function handleDeleteEvent(request, user, eventId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.disasterEvent.update({
      where: { id: eventId },
      data: { deletedAt: new Date(), status: 'CANCELLED' }
    });

    return NextResponse.json({ message: 'Event berhasil dihapus' });
  } catch (error) {
    console.error('Delete event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/events/:id/restore - Admin only
async function handleRestoreEvent(request, user, eventId) {
  if (user.role !== 'SSO') return forbidden();

  try {
    await prisma.disasterEvent.update({
      where: { id: eventId },
      data: { deletedAt: null, status: 'DRAFT' }
    });

    return NextResponse.json({ message: 'Event berhasil dipulihkan' });
  } catch (error) {
    console.error('Restore event error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/notifications
async function handleGetNotifications(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const notifications = await prisma.userNotification.findMany({
      where: {
        userId: user.id,
        deletedAt: null,
        ...(unreadOnly && { readAt: null })
      },
      include: {
        event: {
          include: {
            category: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// POST /api/notifications/:id/read
async function handleMarkNotificationRead(request, user, notificationId) {
  try {
    await prisma.userNotification.update({
      where: {
        id: notificationId,
        userId: user.id
      },
      data: { readAt: new Date() }
    });

    return NextResponse.json({ message: 'Notifikasi ditandai sudah dibaca' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/dashboard/admin
async function handleAdminDashboard(request, user) {
  if (user.role !== 'SSO') return forbidden();

  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Total active users
    const totalUsers = await prisma.user.count({
      where: {
        role: 'USER',
        isActive: true,
        deletedAt: null
      }
    });

    // Total published events
    const totalEvents = await prisma.disasterEvent.count({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        eventTime: { gte: dateFrom }
      }
    });

    // Fetch published events in range (with category) for aggregation
    const rangeEvents = await prisma.disasterEvent.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        eventTime: { gte: dateFrom }
      },
      include: { category: true }
    });

    // Events by kelurahan (top 10)
    const kelurahanCount = {};
    for (const e of rangeEvents) {
      if (!e.kelurahan) continue;
      kelurahanCount[e.kelurahan] = (kelurahanCount[e.kelurahan] || 0) + 1;
    }
    const eventsByKelurahan = Object.entries(kelurahanCount)
      .map(([kelurahan, count]) => ({ kelurahan, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Events by category
    const catCount = {};
    for (const e of rangeEvents) {
      if (!e.category || e.category.deletedAt) continue;
      catCount[e.category.name] = (catCount[e.category.name] || 0) + 1;
    }
    const eventsByCategory = Object.entries(catCount)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalUsers,
      totalEvents,
      eventsByKelurahan,
      eventsByCategory
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/dashboard/user
async function handleUserDashboard(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get user's location
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { homeLat: true, homeLng: true }
    });

    // Get recent events near user
    const events = await prisma.disasterEvent.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        eventTime: { gte: dateFrom }
      },
      include: {
        category: true
      }
    });

    // Filter events within warning radius
    const nearbyEvents = events.filter(event => {
      const distance = calculateDistance(
        userRecord.homeLat,
        userRecord.homeLng,
        event.locationLat,
        event.locationLng
      );
      return distance <= event.warningRadiusM;
    });

    // Count by category
    const categoryCount = {};
    nearbyEvents.forEach(event => {
      const catName = event.category.name;
      categoryCount[catName] = (categoryCount[catName] || 0) + 1;
    });

    const eventsByCategory = Object.entries(categoryCount).map(([name, count]) => ({
      name,
      count
    }));

    // Unread notifications count
    const unreadNotifications = await prisma.userNotification.count({
      where: {
        userId: user.id,
        readAt: null,
        deletedAt: null
      }
    });

    return NextResponse.json({
      totalNearbyEvents: nearbyEvents.length,
      eventsByCategory,
      unreadNotifications,
      recentEvents: nearbyEvents.slice(0, 5)
    });
  } catch (error) {
    console.error('User dashboard error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/history
async function handleGetHistory(request, user) {
  try {
    const { searchParams } = new URL(request.url);
    const nearHome = searchParams.get('nearHome') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;

    if (nearHome && user.role === 'USER') {
      // Get user's location
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { homeLat: true, homeLng: true }
      });

      // Get all events and filter by distance
      const allEvents = await prisma.disasterEvent.findMany({
        where: {
          status: 'PUBLISHED',
          deletedAt: null
        },
        include: {
          category: true
        },
        orderBy: { eventTime: 'desc' }
      });

      // Filter events within warning radius
      const nearbyEvents = allEvents.filter(event => {
        const distance = calculateDistance(
          userRecord.homeLat,
          userRecord.homeLng,
          event.locationLat,
          event.locationLng
        );
        return distance <= event.warningRadiusM;
      });

      const paginatedEvents = nearbyEvents.slice(skip, skip + limit);

      return NextResponse.json({
        events: paginatedEvents,
        pagination: {
          page,
          limit,
          total: nearbyEvents.length,
          totalPages: Math.ceil(nearbyEvents.length / limit)
        }
      });
    } else {
      // Show all events
      const where = {
        status: 'PUBLISHED',
        deletedAt: null
      };

      const [events, total] = await Promise.all([
        prisma.disasterEvent.findMany({
          where,
          skip,
          take: limit,
          include: {
            category: true
          },
          orderBy: { eventTime: 'desc' }
        }),
        prisma.disasterEvent.count({ where })
      ]);

      return NextResponse.json({
        events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });
    }
  } catch (error) {
    console.error('Get history error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/profile
async function handleGetProfile(request, user) {
  try {
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        homeLat: true,
        homeLng: true,
        kelurahan: true,
        kecamatan: true,
        kota: true,
        provinsi: true,
        createdAt: true,
        lastLoginAt: true
      }
    });

    return NextResponse.json({ profile });
  } catch (error) {
    console.error('Get profile error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT /api/profile/location
async function handleUpdateLocation(request, user) {
  try {
    const body = await request.json();
    const { homeLat, homeLng, kelurahan, kecamatan, kota, provinsi } = body;

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        homeLat: parseFloat(homeLat),
        homeLng: parseFloat(homeLng),
        kelurahan,
        kecamatan,
        kota,
        provinsi
      }
    });

    // Update home_point using raw query
    await prisma.$executeRawUnsafe(
      `UPDATE users 
       SET home_point = ST_SetSRID(ST_MakePoint(${updated.homeLng}, ${updated.homeLat}), 4326)
       WHERE id = '${user.id}'`
    );

    return NextResponse.json({ message: 'Lokasi berhasil diupdate', user: updated });
  } catch (error) {
    console.error('Update location error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// PUT /api/profile/password
async function handleChangePassword(request, user) {
  try {
    const body = await request.json();
    const { oldPassword, newPassword } = body;

    // Get user with password
    const userRecord = await prisma.user.findUnique({
      where: { id: user.id }
    });

    // Verify old password
    const isValid = await bcrypt.compare(oldPassword, userRecord.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Password lama salah' }, { status: 400 });
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    return NextResponse.json({ message: 'Password berhasil diubah' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// GET /api/public/recent-disasters - Public access
async function handleGetRecentDisasters() {
  try {
    // Get recent published disasters (limit 10)
    const disasters = await prisma.disasterEvent.findMany({
      where: {
        deletedAt: null,
        publishedAt: { not: null }
      },
      include: {
        category: true
      },
      orderBy: {
        eventTime: 'desc'
      },
      take: 10
    });

    // Get stats
    const [totalDisasters, totalCategories, totalUsers] = await Promise.all([
      prisma.disasterEvent.count({ where: { deletedAt: null, publishedAt: { not: null } } }),
      prisma.disasterCategory.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { deletedAt: null, role: 'USER' } })
    ]);

    return NextResponse.json({
      success: true,
      disasters: disasters.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description,
        event_time: d.eventTime,
        severity: d.severity,
        kelurahan: d.kelurahan,
        kecamatan: d.kecamatan,
        kota: d.kota,
        provinsi: d.provinsi,
        category_code: d.category.code,
        category_name: d.category.name
      })),
      stats: {
        total: totalDisasters,
        categories: totalCategories,
        users: totalUsers
      }
    });
  } catch (error) {
    console.error('Error getting recent disasters:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan' }, { status: 500 });
  }
}

// Main router
export async function GET(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    // Public routes
    if (segments.length === 0 || segments[0] === '') {
      return NextResponse.json({ message: 'SiagaSekitar API' });
    }
    if (path === 'public/recent-disasters') {
      return handleGetRecentDisasters();
    }

    // Routes that require authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorized();
    }

    // Route handlers
    if (path === 'users') {
      return handleGetUsers(request, user);
    }
    if (segments[0] === 'users' && segments[2] === 'detail') {
      return handleGetUserDetail(request, user, segments[1]);
    }
    if (path === 'categories') {
      return handleGetCategories(request, user);
    }
    if (path === 'events') {
      return handleGetEvents(request, user);
    }
    if (path === 'notifications') {
      return handleGetNotifications(request, user);
    }
    if (path === 'dashboard/admin') {
      return handleAdminDashboard(request, user);
    }
    if (path === 'dashboard/user') {
      return handleUserDashboard(request, user);
    }
    if (path === 'history') {
      return handleGetHistory(request, user);
    }
    if (path === 'profile') {
      return handleGetProfile(request, user);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    // Public routes
    if (path === 'register') {
      return handleRegister(request);
    }

    // Routes that require authentication
    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorized();
    }

    // Route handlers
    if (path === 'categories') {
      return handleCreateCategory(request, user);
    }
    if (segments[0] === 'categories' && segments[2] === 'restore') {
      return handleRestoreCategory(request, user, segments[1]);
    }
    if (path === 'events') {
      return handleCreateEvent(request, user);
    }
    if (segments[0] === 'events' && segments[2] === 'publish') {
      return handlePublishEvent(request, user, segments[1]);
    }
    if (segments[0] === 'events' && segments[2] === 'restore') {
      return handleRestoreEvent(request, user, segments[1]);
    }
    if (segments[0] === 'users' && segments[2] === 'reset-password') {
      return handleResetPassword(request, user, segments[1]);
    }
    if (segments[0] === 'users' && segments[2] === 'restore') {
      return handleRestoreUser(request, user, segments[1]);
    }
    if (segments[0] === 'notifications' && segments[2] === 'read') {
      return handleMarkNotificationRead(request, user, segments[1]);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorized();
    }

    // Route handlers
    if (segments[0] === 'users' && segments[2] === 'update') {
      return handleUpdateUserLocation(request, user, segments[1]);
    }
    if (segments[0] === 'categories' && segments.length === 2) {
      return handleUpdateCategory(request, user, segments[1]);
    }
    if (segments[0] === 'events' && segments.length === 2) {
      return handleUpdateEvent(request, user, segments[1]);
    }
    if (path === 'profile/location') {
      return handleUpdateLocation(request, user);
    }
    if (path === 'profile/password') {
      return handleChangePassword(request, user);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { pathname } = new URL(request.url);
    const path = pathname.replace('/api/', '');
    const segments = path.split('/').filter(Boolean);

    const user = await getCurrentUser(request);
    if (!user) {
      return unauthorized();
    }

    // Route handlers
    if (segments[0] === 'users' && segments.length === 2) {
      return handleDeleteUser(request, user, segments[1]);
    }
    if (segments[0] === 'categories' && segments.length === 2) {
      return handleDeleteCategory(request, user, segments[1]);
    }
    if (segments[0] === 'events' && segments.length === 2) {
      return handleDeleteEvent(request, user, segments[1]);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
