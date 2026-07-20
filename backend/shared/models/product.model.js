// product model: handles product table/entity CRUD and query helpers.
/**
 * PostgreSQL: `products` — CRUD, search, category filters, seller_id ownership.
 * Phase 2: sku / barcode / brand, soft-delete (`deleted_at`), variants attached on read.
 */
import pool from '../config/connectDB.js';
import { mapRow, firstId, pickId } from '../utils/sql.js';
import { seedWarehouseRowForNewProduct, applyAbsoluteProductStockFromCatalog } from '../utils/inventoryStock.js';
import { withVariants, withVariantsMany, saveProductVariants } from '../services/catalog/index.js';

// product model: shapeProduct builds enriched response data.
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
        sku: row.sku || null,
        barcode: row.barcode || null,
        brand: row.brand || null,
        deletedAt: row.deleted_at || null,
    };
}

// product model: attachRelations builds enriched response data.
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
    return withVariants(shapeProduct(row, categoryRow, subcategoryRow));
}

/** Batch-attach category/subcategory in 2 queries instead of 2N. */
// product model: attachRelationsMany builds enriched response data.
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
    const shaped = rows.map((row) =>
        shapeProduct(row, catMap.get(row.category_id) || null, subMap.get(row.subcategory_id) || null),
    );
    return withVariantsMany(shaped);
}

// product model: notDeletedClause runs model logic/query operations.
function notDeletedClause(alias = '') {
    const col = alias ? `${alias}.deleted_at` : 'deleted_at';
    return `${col} IS NULL`;
}

// product model: createProduct creates a new record.
export async function createProduct(body, sellerId = null) {
    const categoryId = firstId(body.category);
    const subcategoryId = firstId(body.subcategory || body.subCategory);
    const r = await pool.query(
        `INSERT INTO products (
            name, image, category_id, subcategory_id, unit, stock, price, discount,
            description, more_details, publish, seller_id, low_stock_threshold,
            sku, barcode, brand
         )
         VALUES ($1, $2::jsonb, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, $16)
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
            body.sku || null,
            body.barcode || null,
            body.brand || null,
        ],
    );
    const raw = r.rows[0];
    await seedWarehouseRowForNewProduct(raw.id, raw.stock ?? 0);

    if (Array.isArray(body.variants) && body.variants.length) {
        await saveProductVariants(raw.id, body.variants);
    }

    return attachRelations(raw);
}

// product model: findProductOwner reads and returns records.
export async function findProductOwner(id) {
    // Include soft-deleted rows so staff can restore / manage them
    const r = await pool.query(`SELECT id, seller_id FROM products WHERE id = $1`, [id]);
    return r.rows[0] || null;
}

// product model: findProducts reads and returns records.
export async function findProducts({
    search,
    published,
    skip,
    limit,
    minPrice,
    maxPrice,
    sellerId,
    categoryId,
    sort,
    stockLevel,
    includeDeleted = false,
}) {
    const params = [];
    let where = includeDeleted ? 'WHERE 1=1' : `WHERE ${notDeletedClause()}`;
    if (search) {
        params.push(search);
        where += ` AND (
            search_tsv @@ plainto_tsquery('english', $${params.length})
            OR name ILIKE '%' || $${params.length} || '%'
            OR sku ILIKE '%' || $${params.length} || '%'
            OR brand ILIKE '%' || $${params.length} || '%'
        )`;
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
    if (stockLevel === 'low') {
        where += ' AND stock <= COALESCE(low_stock_threshold, 5)';
    } else if (stockLevel === 'ok' || stockLevel === 'in_stock') {
        where += ' AND stock > COALESCE(low_stock_threshold, 5)';
    }
    const searchParamIndex = search ? 1 : null;
    const orderBy =
        sort === 'price_asc'
            ? 'price ASC'
            : sort === 'price_desc'
              ? 'price DESC'
              : search && searchParamIndex
                ? `ts_rank(search_tsv, plainto_tsquery('english', $${searchParamIndex})) DESC NULLS LAST, created_at DESC`
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

// product model: findProductById reads and returns records.
export async function findProductById(id, { includeDeleted = false } = {}) {
    const where = includeDeleted ? 'id = $1' : `id = $1 AND ${notDeletedClause()}`;
    const r = await pool.query(`SELECT * FROM products WHERE ${where}`, [id]);
    return attachRelations(r.rows[0]);
}

// product model: findProductsByCategory reads and returns records.
export async function findProductsByCategory(categoryIds, limit = 15) {
    const ids = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const r = await pool.query(
        `SELECT * FROM products WHERE category_id = ANY($1::int[]) AND ${notDeletedClause()} ORDER BY created_at DESC LIMIT $2`,
        [ids, limit],
    );
    return attachRelationsMany(r.rows);
}

// product model: findProductsByCategoryAndSub reads and returns records.
export async function findProductsByCategoryAndSub(categoryIds, subCategoryIds, skip, limit) {
    const cats = (Array.isArray(categoryIds) ? categoryIds : [categoryIds]).map(pickId);
    const subs = (Array.isArray(subCategoryIds) ? subCategoryIds : [subCategoryIds]).map(pickId);
    const params = [cats, subs];
    let where = `WHERE category_id = ANY($1::int[]) AND subcategory_id = ANY($2::int[]) AND ${notDeletedClause()}`;
    const countR = await pool.query(`SELECT COUNT(*)::int AS c FROM products ${where}`, params);
    params.push(limit, skip);
    const r = await pool.query(
        `SELECT * FROM products ${where} ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        params,
    );
    const data = await attachRelationsMany(r.rows);
    return { data, totalCount: countR.rows[0].c };
}

// product model: updateProduct updates existing records.
export async function updateProduct(id, body) {
    const fields = { ...body };
    delete fields._id;
    if (fields.category) fields.category_id = firstId(fields.category);
    if (fields.subcategory || fields.subCategory) {
        fields.subcategory_id = firstId(fields.subcategory || fields.subCategory);
    }
    delete fields.category;
    delete fields.subcategory;
    delete fields.subCategory;

    const variantsPayload = fields.variants;
    delete fields.variants;

    // When variants are sent, parent stock is derived from variant sum — ignore raw stock patch.
    if (Array.isArray(variantsPayload) && variantsPayload.length) {
        delete fields.stock;
    }

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

    const allowed = [
        'name',
        'image',
        'category_id',
        'subcategory_id',
        'unit',
        'price',
        'discount',
        'description',
        'more_details',
        'publish',
        'low_stock_threshold',
        'sku',
        'barcode',
        'brand',
    ];
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
                values.push(fields[key] === '' ? null : fields[key]);
            }
        }
    }
    if (sets.length) {
        values.push(id);
        await pool.query(
            `UPDATE products SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${i} AND ${notDeletedClause()}`,
            values,
        );
    }

    if (Array.isArray(variantsPayload)) {
        await saveProductVariants(id, variantsPayload);
    }

    return { acknowledged: true };
}

/** Soft-delete — hides from storefront/list; recoverable via restoreProduct. */
// product model: deleteProduct deletes matching records.
export async function deleteProduct(id) {
    const r = await pool.query(
        `UPDATE products SET deleted_at = NOW(), publish = false, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id],
    );
    return { deletedCount: r.rowCount, soft: true };
}

// product model: restoreProduct runs model logic/query operations.
export async function restoreProduct(id) {
    const r = await pool.query(
        `UPDATE products SET deleted_at = NULL, updated_at = NOW()
         WHERE id = $1 AND deleted_at IS NOT NULL
         RETURNING *`,
        [id],
    );
    if (!r.rows[0]) return null;
    return attachRelations(r.rows[0]);
}

// product model: countProducts reads and returns records.
export async function countProducts() {
    const r = await pool.query(
        `SELECT COUNT(*)::int AS c FROM products WHERE ${notDeletedClause()}`,
    );
    return r.rows[0].c;
}

