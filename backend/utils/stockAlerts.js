/**
 * After stock-changing events: email sellers when product.stock <= low_stock_threshold.
 */
import pool from '../config/connectDB.js';
import { findUserById } from '../models/user.model.js';
import { sendLowStockAlert } from './orderEmails.js';

export async function checkLowStockForProducts(productIds) {
    if (!productIds?.length) return;
    const r = await pool.query(
        `SELECT p.id, p.name, p.stock, p.low_stock_threshold, p.seller_id
         FROM products p WHERE p.id = ANY($1::int[]) AND p.stock <= p.low_stock_threshold`,
        [productIds],
    );
    const bySeller = new Map();
    for (const row of r.rows) {
        if (!row.seller_id) continue;
        if (!bySeller.has(row.seller_id)) bySeller.set(row.seller_id, []);
        bySeller.get(row.seller_id).push(row);
    }
    for (const [sellerId, products] of bySeller) {
        const seller = await findUserById(sellerId);
        if (seller?.email) await sendLowStockAlert({ seller, products });
    }
}
