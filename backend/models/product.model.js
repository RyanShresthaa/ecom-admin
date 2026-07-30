/**
 * PostgreSQL: `products` — CRUD, search, category filters, seller_id ownership.
 */
import pool from '../config/connectDB.js';
import { mapRow, firstId, pickId } from '../utils/sql.js';
import { seedWarehouseRowForNewProduct, applyAbsoluteProductStockFromCatalog } from '../utils/inventoryStock.js';

function withJoinedRelations(row) {
    if (!row) return null;
    const base = mapRow(row);
    const category = row._cat_id
        ? [mapRow({ id: row._cat_id, name: row._cat_name, image: row._cat_image })]
        : [];
    const subcategory = row._sub_id
        ? [mapRow({ id: row._sub_id, name: row._sub_name, image: row._sub_image })]
        : [];
    return {
        ...base,
        image: row.image || [],
        category,
        subcategory,
        category_id: row.category_id,
        subcategory_id: row.subcategory_id,
    };
}

/** Batch-load category/subcategory for a page of product rows (avoids N+1). */
async function attachRelationsMany(rows) {
    if (!rows?.length) return [];
    const catIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))];
    const subIds = [...new Set(rows.map((r) => r.subcategory_id).filter(Boolean))];
    const [cats, subs] = await Promise.all([
        catIds.length
            ? pool.query(`SELECT id, name, image FROM categories WHERE id = ANY($1::int[])`, [catIds])
            : Promise.resolve({ rows: [] }),
        subIds.length
            ? pool.query(`SELECT id, name, image FROM subcategories WHERE id = ANY($1::int[])`, [subIds])
            : Promise.resolve({ rows: [] }),
    ]);
    const catMap = new Map(cats.rows.map((c) => [c.id, mapRow(c)]));
    const subMap = new Map(subs.rows.map((s) => [s.id, mapRow(s)]));
    return rows.map((row) => {
        const base = mapRow(row);
        return {
            ...base,
            image: row.image || [],
            category: row.category_id && catMap.has(row.category_id) ? [catMap.get(row.category_id)] : [],
            subcategory:
                row.subcategory_id && subMap.has(row.subcategory_id) ? [subMap.get(row.subcategory_id)] : [],
            category_id: row.category_id,
            subcategory_id: row.subcategory_id,
        };
    });
}

async function attachRelations(row) {
    if (!row) return null;
    const [hydrated] = await attachRelationsMany([row]);
    return hydrated;
}

/** Public alias for cart/order hydration without N+1. */
export async function attachRelationsForRows(rows) {
    return attachRelationsMany(rows);
}

export async function createProduct(body, sellerId = null) {
    const categoryId = firstId(body.category);
    const subcategoryId = firstId(body.subcategory || body.subCategory);
    const r = await pool.query(
        `INSERT INTO products (name, image, category_id, subcategory_id, unit, stock, price, discount, description, more_details, publish, seller_id, low_stock_threshold)
         VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
         RETURNING *`,
        [
            body.name,
            JSON.stringify(body.image || []),
            categoryId,
            subcategoryId,
            body.unit || '',
            body.stock ?? 0,
            body.price ?? 0,
            body.discount ?? 0,
            body.description || '',
            JSON.stringify(body.more_details || {}),
            body.publish !== false,
            sellerId,
            body.low_stock_threshold ?? 5,
        ],
    );
    const raw = r.rows[0];
    await seedWarehouseRowForNewProduct(raw.id, raw.stock ?? 0);
    return attachRelations(raw);
}

export async function findProductOwner(id) {
    const r = await pool.query(`SELECT id, seller_id FROM products WHERE id = $1`, [id]);
    return r.rows[0] || null;
}

export async function findProducts({ search, published, skip, limit, minPrice, maxPrice, sellerId, categoryId, sort }) {
    const params = [];
    let where = 'WHERE 1=1';
    if (search) {
        params.push(`%${search}%`);
        where += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }
    if (published !== undefined) {
        params.push(published);
        where += ` AND publish = $${params.length}`;
    }
    if (minPrice != null && minPrice !== '') {
        params.push(Number(minPrice));
        where += ` AND price >= $${params.length}`;
    }
    if (maxPrice != null && maxPrice !== '') {
        params.push(Number(maxPrice));
        where += ` AND price <= $${params.length}`;
    }
    if (sellerId != null) {
        params.push(sellerId);
        where += ` AND seller_id = $${params.length}`;
    }
    if (categoryId != null) {
        params.push(pickId(categoryId));
        where += ` AND category_id = $${params.length}`;
    }
    const orderBy =
        sort === 'price_asc'
            ? 'price ASC'
            : sort === 'price_desc'
              ? 'price DESC'
              : 'created_at DESC';
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const safeSkip = Math.max(0, Number(skip) || 0);
    const countParams = [...params];
    params.push(safeLimit, safeSkip);
    const [countR, r] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS c FROM products ${where}`, countParams),
        pool.query(
            `SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params,
        ),
    ]);
    const data = await attachRelationsMany(r.rows);
    return { data, totalCount: countR.rows[0].c };
}

export async function findProductById(id) {
    const r = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return attachRelations(r.rows[0]);
}

/** Match more_details.slug or a slugified name among published products. */
export async function findProductBySlug(slug) {
    const clean = String(slug || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-|-$/g, '');
    if (!clean) return null;

    const byMeta = await pool.query(
        `SELECT * FROM products
         WHERE publish = true
           AND LOWER(COALESCE(more_details->>'slug', '')) = $1
         LIMIT 1`,
        [clean],
    );
    if (byMeta.rows[0]) return attachRelations(byMeta.rows[0]);

    // SQL-side slugify of name — avoids loading hundreds of rows into Node
    const byName = await pool.query(
        `SELECT * FROM products
         WHERE publish = true
           AND TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(COALESCE(name, '')), '[^a-z0-9]+', '-', 'g')) = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [clean],
    );
    return byName.rows[0] ? attachRelations(byName.rows[0]) : null;
}

export async function findProductsByCategory(categoryIds, limit = 15) {
    const ids = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const r = await pool.query(
        `SELECT * FROM products WHERE category_id = ANY($1::int[]) ORDER BY created_at DESC LIMIT $2`,
        [ids, Math.min(100, Math.max(1, Number(limit) || 15))],
    );
    return attachRelationsMany(r.rows);
}

export async function findProductsByCategoryAndSub(categoryIds, subCategoryIds, skip, limit) {
    const cats = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const subs = (Array.isArray(subCategoryIds) ? subCategoryIds : [subCategoryIds]).map(pickId);
    const params = [cats, subs];
    let where = 'WHERE category_id = ANY($1::int[]) AND subcategory_id = ANY($2::int[])';
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const safeSkip = Math.max(0, Number(skip) || 0);
    const countParams = [...params];
    params.push(safeLimit, safeSkip);
    const [countR, r] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS c FROM products ${where}`, countParams),
        pool.query(
            `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
            params,
        ),
    ]);
    const data = await attachRelationsMany(r.rows);
    return { data, totalCount: countR.rows[0].c };
}

export async function updateProduct(id, body) {
    const fields = { ...body };
    delete fields._id;
    if (fields.category) fields.category_id = firstId(fields.category);
    if (fields.subcategory || fields.subCategory) fields.subcategory_id = firstId(fields.subcategory || fields.subCategory);
    delete fields.category;
    delete fields.subcategory;
    delete fields.subCategory;

    if (fields.stock !== undefined) {
        const stockVal = fields.stock;
        delete fields.stock;
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await applyAbsoluteProductStockFromCatalog(client, id, stockVal);
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }

    const allowed = ['name', 'image', 'category_id', 'subcategory_id', 'unit', 'price', 'discount', 'description', 'more_details', 'publish', 'low_stock_threshold'];
    const sets = [];
    const values = [];
    let i = 1;
    for (const key of allowed) {
        if (fields[key] !== undefined) {
            if (key === 'image' || key === 'more_details') {
                sets.push(`${key} = $${i++}::jsonb`);
                values.push(JSON.stringify(fields[key]));
            } else {
                sets.push(`${key} = $${i++}`);
                values.push(fields[key]);
            }
        }
    }
    if (!sets.length) return { acknowledged: true };
    values.push(id);
    await pool.query(`UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i}`, values);
    return { acknowledged: true };
}

/**
 * Hard-delete when nothing references the product in orders.
 * If order history exists, unpublish + zero stock (soft delete) so history stays intact.
 * Must also clear warehouse_stock — otherwise Inventory shows stock 0 while warehouses
 * still hold units, and "Add stock" jumps to (hidden + added) which looks random.
 */
export async function deleteProduct(id) {
    const refs = await pool.query(`SELECT 1 FROM orders WHERE product_id = $1 LIMIT 1`, [id]);
    if (refs.rows.length) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(
                `UPDATE warehouse_stock SET quantity = 0, updated_at = NOW() WHERE product_id = $1`,
                [id],
            );
            await client.query(
                `UPDATE products SET publish = false, stock = 0, updated_at = NOW() WHERE id = $1`,
                [id],
            );
            await client.query('COMMIT');
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        return { deletedCount: 1, soft: true };
    }
    const r = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    return { deletedCount: r.rowCount, soft: false };
}

export async function countProducts() {
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM products`);
    return r.rows[0].c;
}
