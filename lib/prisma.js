// MongoDB-backed Prisma-compatible shim.
// Exposes a `prisma`-like API so existing route handlers work unchanged.
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const uri = process.env.MONGO_URL;
const dbName = process.env.DB_NAME || 'siagasekitar';

if (!global._mongoClientPromise) {
  const client = new MongoClient(uri, { maxPoolSize: 10 });
  global._mongoClientPromise = client.connect();
}
const clientPromise = global._mongoClientPromise;

async function getDb() {
  const client = await clientPromise;
  return client.db(dbName);
}

// Model -> collection name mapping
const MODELS = {
  user: 'users',
  disasterCategory: 'disaster_categories',
  disasterEvent: 'disaster_events',
  userNotification: 'user_notifications',
  auditLog: 'audit_logs',
};

// Relation definitions for `include`/nested `select`
const RELATIONS = {
  disaster_events: {
    category: { collection: 'disaster_categories', localField: 'categoryId', type: 'one' },
    creator: { collection: 'users', localField: 'createdBy', type: 'one' },
    notifications: { collection: 'user_notifications', foreignField: 'eventId', type: 'many' },
  },
  user_notifications: {
    event: { collection: 'disaster_events', localField: 'eventId', type: 'one' },
    user: { collection: 'users', localField: 'userId', type: 'one' },
  },
  users: {
    createdEvents: { collection: 'disaster_events', foreignField: 'createdBy', type: 'many' },
    notifications: { collection: 'user_notifications', foreignField: 'userId', type: 'many' },
    auditLogs: { collection: 'audit_logs', foreignField: 'actorId', type: 'many' },
  },
};

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Convert a Prisma-style `where` to a MongoDB filter
function buildFilter(where = {}) {
  const filter = {};
  for (const [key, val] of Object.entries(where || {})) {
    if (val === undefined) continue;
    if (key === 'OR') {
      filter.$or = (val || []).map(buildFilter);
    } else if (key === 'AND') {
      filter.$and = (val || []).map(buildFilter);
    } else if (key === 'NOT') {
      filter.$nor = [buildFilter(val)];
    } else if (
      val !== null &&
      typeof val === 'object' &&
      !(val instanceof Date) &&
      !Array.isArray(val)
    ) {
      // operator object e.g. { contains, mode, not, gte, lte, in }
      const cond = {};
      let directSet = false;
      for (const [op, opv] of Object.entries(val)) {
        switch (op) {
          case 'contains':
            cond.$regex = escapeRegex(opv);
            break;
          case 'startsWith':
            cond.$regex = '^' + escapeRegex(opv);
            break;
          case 'endsWith':
            cond.$regex = escapeRegex(opv) + '$';
            break;
          case 'mode':
            if (opv === 'insensitive') cond.$options = 'i';
            break;
          case 'not':
            cond.$ne = opv;
            break;
          case 'gte':
            cond.$gte = opv;
            break;
          case 'lte':
            cond.$lte = opv;
            break;
          case 'gt':
            cond.$gt = opv;
            break;
          case 'lt':
            cond.$lt = opv;
            break;
          case 'in':
            cond.$in = opv;
            break;
          case 'notIn':
            cond.$nin = opv;
            break;
          case 'equals':
            filter[key] = opv;
            directSet = true;
            break;
          default:
            break;
        }
      }
      if (!directSet && Object.keys(cond).length) filter[key] = cond;
    } else {
      filter[key] = val;
    }
  }
  return filter;
}

function buildSort(orderBy) {
  if (!orderBy) return undefined;
  const arr = Array.isArray(orderBy) ? orderBy : [orderBy];
  const sort = {};
  for (const o of arr) {
    for (const [k, v] of Object.entries(o)) {
      sort[k] = v === 'desc' ? -1 : 1;
    }
  }
  return sort;
}

// Remove undefined keys (Prisma ignores undefined in data); keep null values.
function clean(obj = {}) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

async function resolveRelation(db, collName, relName, doc, subOpts = {}) {
  const rel = (RELATIONS[collName] || {})[relName];
  if (!rel) return null;
  const coll = db.collection(rel.collection);
  if (rel.type === 'one') {
    const fk = doc[rel.localField];
    if (fk === undefined || fk === null) return null;
    const related = await coll.findOne({ id: fk });
    return related ? shape(db, rel.collection, related, subOpts) : null;
  } else {
    const arr = await coll.find({ [rel.foreignField]: doc.id }).toArray();
    return Promise.all(arr.map((r) => shape(db, rel.collection, r, subOpts)));
  }
}

// Shape an output document according to select/include
async function shape(db, collName, doc, opts = {}) {
  if (!doc) return doc;
  const { select, include } = opts || {};
  let out;
  if (select) {
    out = {};
    for (const [k, v] of Object.entries(select)) {
      if (v === true) {
        out[k] = doc[k] !== undefined ? doc[k] : null;
      } else if (v && typeof v === 'object') {
        out[k] = await resolveRelation(db, collName, k, doc, v);
      }
    }
  } else {
    out = { ...doc };
    delete out._id;
  }
  if (include) {
    for (const [k, v] of Object.entries(include)) {
      out[k] = await resolveRelation(db, collName, k, doc, v === true ? {} : v);
    }
  }
  delete out._id;
  return out;
}

function makeModel(collName) {
  return {
    async findFirst({ where, select, include, orderBy } = {}) {
      const db = await getDb();
      let cursor = db.collection(collName).find(buildFilter(where));
      const sort = buildSort(orderBy);
      if (sort) cursor = cursor.sort(sort);
      const doc = await cursor.limit(1).next();
      return doc ? shape(db, collName, doc, { select, include }) : null;
    },

    async findUnique({ where, select, include } = {}) {
      const db = await getDb();
      const doc = await db.collection(collName).findOne(buildFilter(where));
      return doc ? shape(db, collName, doc, { select, include }) : null;
    },

    async findMany({ where, select, include, orderBy, skip, take } = {}) {
      const db = await getDb();
      let cursor = db.collection(collName).find(buildFilter(where));
      const sort = buildSort(orderBy);
      if (sort) cursor = cursor.sort(sort);
      if (skip) cursor = cursor.skip(skip);
      if (take) cursor = cursor.limit(take);
      const docs = await cursor.toArray();
      return Promise.all(docs.map((d) => shape(db, collName, d, { select, include })));
    },

    async count({ where } = {}) {
      const db = await getDb();
      return db.collection(collName).countDocuments(buildFilter(where));
    },

    async create({ data, select, include } = {}) {
      const db = await getDb();
      const now = new Date();
      const doc = {
        id: data.id || uuidv4(),
        ...clean(data),
        createdAt: data.createdAt || now,
        updatedAt: now,
      };
      if (doc.deletedAt === undefined) doc.deletedAt = null;
      await db.collection(collName).insertOne({ ...doc });
      return shape(db, collName, doc, { select, include });
    },

    async createMany({ data } = {}) {
      const db = await getDb();
      const now = new Date();
      const docs = (data || []).map((d) => ({
        id: d.id || uuidv4(),
        ...clean(d),
        createdAt: d.createdAt || now,
        updatedAt: now,
        deletedAt: d.deletedAt !== undefined ? d.deletedAt : null,
      }));
      if (docs.length) await db.collection(collName).insertMany(docs);
      return { count: docs.length };
    },

    async update({ where, data, select, include } = {}) {
      const db = await getDb();
      const set = clean(data);
      set.updatedAt = new Date();
      const doc = await db.collection(collName).findOneAndUpdate(
        buildFilter(where),
        { $set: set },
        { returnDocument: 'after', includeResultMetadata: false }
      );
      if (!doc) throw new Error('Record to update not found.');
      return shape(db, collName, doc, { select, include });
    },

    async updateMany({ where, data } = {}) {
      const db = await getDb();
      const set = clean(data);
      set.updatedAt = new Date();
      const r = await db.collection(collName).updateMany(buildFilter(where), { $set: set });
      return { count: r.modifiedCount };
    },

    async delete({ where } = {}) {
      const db = await getDb();
      const doc = await db.collection(collName).findOneAndDelete(buildFilter(where), {
        includeResultMetadata: false,
      });
      if (doc) delete doc._id;
      return doc;
    },

    async deleteMany({ where } = {}) {
      const db = await getDb();
      const r = await db.collection(collName).deleteMany(buildFilter(where || {}));
      return { count: r.deletedCount };
    },
  };
}

const prisma = {
  user: makeModel('users'),
  disasterCategory: makeModel('disaster_categories'),
  disasterEvent: makeModel('disaster_events'),
  userNotification: makeModel('user_notifications'),
  auditLog: makeModel('audit_logs'),

  // PostGIS raw writes are not needed in MongoDB -> no-op
  async $executeRawUnsafe() {
    return 0;
  },
  async $executeRaw() {
    return 0;
  },
  async $queryRawUnsafe() {
    return [];
  },
  async $queryRaw() {
    return [];
  },
  async $disconnect() {
    return;
  },
  _getDb: getDb,
  _MODELS: MODELS,
};

export { prisma };
export default prisma;
