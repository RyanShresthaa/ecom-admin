// subCategory model: handles subCategory table/entity CRUD and query helpers.
/**
 * PostgreSQL: `subcategories` — tied to `category_id`.
 */
import pool from '../config/connectDB.js';
import { mapRow, firstId } from '../utils/sql.js';

// subCategory model: createSubCategory creates a new record.
export async function createSubCategory({ name, image, category }) {
    const categoryId = firstId(category);
    const r = await pool.query(
        `INSERT INTO subcategories (name, image, category_id) VALUES ($1, $2, $3) RETURNING *`,
        [name, image, categoryId],
    );
    return mapSub(r.rows[0]);
}

// subCategory model: mapSub reads and returns records.
function mapSub(row) {
    const base = mapRow(row);
    if (!base) return null;
    return { ...base, category: base.category_id ? [base.category_id] : [] };
}

// subCategory model: findSubCategories reads and returns records.
export async function findSubCategories() {
    const r = await pool.query(
        `SELECT s.*, c.id AS cat_id, c.name AS cat_name, c.image AS cat_image
         FROM subcategories s
         LEFT JOIN categories c ON c.id = s.category_id
         ORDER BY s.created_at DESC`,
    );
    return r.rows.map((row) => ({
        ...mapRow(row),
        category: row.cat_id
            ? [{ _id: row.cat_id, id: row.cat_id, name: row.cat_name, image: row.cat_image }]
            : [],
    }));
}

// subCategory model: findSubCategoryById reads and returns records.
export async function findSubCategoryById(id) {
    const r = await pool.query(`SELECT * FROM subcategories WHERE id = $1`, [id]);
    return mapSub(r.rows[0]);
}

// subCategory model: updateSubCategory updates existing records.
export async function updateSubCategory(id, { name, image, category }) {
    const categoryId = category ? firstId(category) : null;
    const r = await pool.query(
        `UPDATE subcategories SET
            name = COALESCE($1, name),
            image = COALESCE($2, image),
            category_id = COALESCE($3, category_id),
            updated_at = NOW()
         WHERE id = $4 RETURNING *`,
        [name, image, categoryId, id],
    );
    return mapSub(r.rows[0]);
}

// subCategory model: deleteSubCategory deletes matching records.
export async function deleteSubCategory(id) {
    const r = await pool.query(`DELETE FROM subcategories WHERE id = $1 RETURNING *`, [id]);
    return mapSub(r.rows[0]);
}

