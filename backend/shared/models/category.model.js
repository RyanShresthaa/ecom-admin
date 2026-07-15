/**
 * PostgreSQL: `categories` / `subcategories` (this file: categories).
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows } from '../utils/sql.js';

export async function createCategory({ name, image }) {
    const r = await pool.query(
        `INSERT INTO categories (name, image) VALUES ($1, $2) RETURNING *`,
        [name, image],
    );
    return mapRow(r.rows[0]);
}

export async function findCategories() {
    const r = await pool.query(`SELECT * FROM categories ORDER BY created_at DESC`);
    return mapRows(r.rows);
}

export async function updateCategory(id, { name, image }) {
    await pool.query(
        `UPDATE categories SET name = COALESCE($1, name), image = COALESCE($2, image), updated_at = NOW() WHERE id = $3`,
        [name, image, id],
    );
    return { acknowledged: true };
}

export async function deleteCategory(id) {
    const r = await pool.query(`DELETE FROM categories WHERE id = $1`, [id]);
    return { deletedCount: r.rowCount };
}

export async function countCategoryUsage(id) {
    const [sub, prod] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS c FROM subcategories WHERE category_id = $1`, [id]),
        pool.query(`SELECT COUNT(*)::int AS c FROM products WHERE category_id = $1`, [id]),
    ]);
    return sub.rows[0].c + prod.rows[0].c;
}

export async function findCategoryById(id) {
    const r = await pool.query(`SELECT * FROM categories WHERE id = $1`, [id]);
    return mapRow(r.rows[0]);
}
