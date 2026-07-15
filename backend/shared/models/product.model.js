/**
 * PostgreSQL: `products` — CRUD, search, category filters, seller_id ownership.
 */
import pool from '../config/connectDB.js';
import { mapRow, firstId, pickId } from '../utils/sql.js';
import { seedWarehouseRowForNewProduct, applyAbsoluteProductStockFromCatalog } from '../utils/inventoryStock.js';

function shapeProduct(row, categoryRow = null, subcategoryRow = null) {
    if (!row) return null;
    const base = mapRow(row);
    return {
        ...base,
        image: row.image || [],
        category: categoryRow ? [mapRow(categoryRow)] : [],
        subcategory: subcategoryRow ? [mapRow(subcategoryRow)] : [],
        category_id: row.category_id,
        subcategory_id: row.subcategory_id,
    };
}

async function attachRelations(row) {
    if (!row) return null;
    let categoryRow = null;
    let subcategoryRow = null;
    if (row.category_id) {
        const c = await pool.query(`SELECT * FROM categories WHERE id = $1`, [row.category_id]);
        categoryRow = c.rows[0] || null;
    }
    if (row.subcategory_id) {
        const s = await pool.query(`SELECT * FROM subcategories WHERE id = $1`, [row.subcategory_id]);
        subcategoryRow = s.rows[0] || null;
    }
    return shapeProduct(row, categoryRow, subcategoryRow);
}

/** Batch-attach category/subcategory in 2 queries instead of 2N. */
async function attachRelationsMany(rows) {
    if (!rows?.length) return [];
    const catIds = [...new Set(rows.map((r) => r.category_id).filter(Boolean))];
    const subIds = [...new Set(rows.map((r) => r.subcategory_id).filter(Boolean))];
    const [cats, subs] = await Promise.all([
        catIds.length
            ? pool.query(`SELECT * FROM categories WHERE id = ANY($1::int[])`, [catIds])
            : Promise.resolve({ rows: [] }),
        subIds.length
            ? pool.query(`SELECT * FROM subcategories WHERE id = ANY($1::int[])`, [subIds])
            : Promise.resolve({ rows: [] }),
    ]);
    const catMap = new Map(cats.rows.map((r) => [r.id, r]));
    const subMap = new Map(subs.rows.map((r) => [r.id, r]));
    return rows.map((row) =>
        shapeProduct(row, catMap.get(row.category_id) || null, subMap.get(row.subcategory_id) || null),
    );
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
    const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM products ${where}`, params);
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT * FROM products ${where} ORDER BY ${orderBy} LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
    );
    const data = await attachRelationsMany(r.rows);
    return { data, totalCount: countR.rows[0].c };
}

export async function findProductById(id) {
    const r = await pool.query(`SELECT * FROM products WHERE id = $1`, [id]);
    return attachRelations(r.rows[0]);
}

export async function findProductsByCategory(categoryIds, limit = 15) {
    const ids = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const r = await pool.query(
        `SELECT * FROM products WHERE category_id = ANY($1::int[]) ORDER BY created_at DESC LIMIT $2`,
        [ids, limit],
    );
    return attachRelationsMany(r.rows);
}

export async function findProductsByCategoryAndSub(categoryIds, subCategoryIds, skip, limit) {
    const cats = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const subs = (Array.isArray(subCategoryIds) ? subCategoryIds : [subCategoryIds]).map(pickId);
    const params = [cats, subs];
    let where = 'WHERE category_id = ANY($1::int[]) AND subcategory_id = ANY($2::int[])';
    const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM products ${where}`, params);
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        params,
    );
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

export async function deleteProduct(id) {
    const r = await pool.query(`DELETE FROM products WHERE id = $1`, [id]);
    return { deletedCount: r.rowCount };
}

export async function countProducts() {
    const r = await pool.query(`SELECT COUNT(*)::int AS c FROM products`);
    return r.rows[0].c;
}
