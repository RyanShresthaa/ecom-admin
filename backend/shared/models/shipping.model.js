// shipping model: handles shipping table/entity CRUD and query helpers.
/**
 * PostgreSQL: `shipping_zones` + `shipping_rates`.
 */
import pool from '../config/connectDB.js';
import { mapRow, mapRows, pickId } from '../utils/sql.js';

// shipping model: mapZone reads and returns records.
export function mapZone(row) {
    if (!row) return null;
    const z = mapRow(row);
    z.matchType = z.match_type;
    z.matchValue = z.match_value;
    return z;
}

// shipping model: mapRate reads and returns records.
export function mapRate(row) {
    if (!row) return null;
    const r = mapRow(row);
    r.zoneId = r.zone_id;
    r.rate = Number(r.rate);
    r.freeMin = r.free_min == null ? null : Number(r.free_min);
    return r;
}

// shipping model: listShippingZones reads and returns records.
export async function listShippingZones({ activeOnly = false } = {}) {
    const where = activeOnly ? 'WHERE active = true' : '';
    const r = await pool.query(
        `SELECT * FROM shipping_zones ${where} ORDER BY priority ASC, id ASC`,
    );
    return mapRows(r.rows).map(mapZone);
}

// shipping model: findShippingZoneById reads and returns records.
export async function findShippingZoneById(id) {
    const r = await pool.query(`SELECT * FROM shipping_zones WHERE id = $1`, [pickId(id)]);
    return mapZone(r.rows[0]);
}

// shipping model: createShippingZone creates a new record.
export async function createShippingZone(data) {
    const r = await pool.query(
        `INSERT INTO shipping_zones (name, match_type, match_value, active, priority)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            data.name,
            data.match_type || data.matchType || 'city',
            data.match_value ?? data.matchValue ?? '',
            data.active !== false,
            Number(data.priority ?? 100),
        ],
    );
    return mapZone(r.rows[0]);
}

// shipping model: updateShippingZone updates existing records.
export async function updateShippingZone(id, data) {
    const r = await pool.query(
        `UPDATE shipping_zones SET
            name = COALESCE($1, name),
            match_type = COALESCE($2, match_type),
            match_value = COALESCE($3, match_value),
            active = COALESCE($4, active),
            priority = COALESCE($5, priority),
            updated_at = NOW()
         WHERE id = $6 RETURNING *`,
        [
            data.name ?? null,
            data.match_type ?? data.matchType ?? null,
            data.match_value ?? data.matchValue ?? null,
            data.active === undefined ? null : Boolean(data.active),
            data.priority == null ? null : Number(data.priority),
            pickId(id),
        ],
    );
    return mapZone(r.rows[0]);
}

// shipping model: deleteShippingZone deletes matching records.
export async function deleteShippingZone(id) {
    const r = await pool.query(`DELETE FROM shipping_zones WHERE id = $1`, [pickId(id)]);
    return { deletedCount: r.rowCount };
}

// shipping model: listRatesForZone reads and returns records.
export async function listRatesForZone(zoneId) {
    const r = await pool.query(
        `SELECT * FROM shipping_rates WHERE zone_id = $1 ORDER BY id ASC`,
        [pickId(zoneId)],
    );
    return mapRows(r.rows).map(mapRate);
}

// shipping model: listActiveRatesWithZones reads and returns records.
export async function listActiveRatesWithZones() {
    const r = await pool.query(
        `SELECT r.*, z.name AS zone_name, z.match_type, z.match_value, z.priority, z.active AS zone_active
         FROM shipping_rates r
         INNER JOIN shipping_zones z ON z.id = r.zone_id
         WHERE r.active = true AND z.active = true
         ORDER BY z.priority ASC, r.id ASC`,
    );
    return r.rows.map((row) => ({
        ...mapRate(row),
        zoneName: row.zone_name,
        matchType: row.match_type,
        matchValue: row.match_value,
        priority: row.priority,
    }));
}

// shipping model: createShippingRate creates a new record.
export async function createShippingRate(data) {
    const r = await pool.query(
        `INSERT INTO shipping_rates (zone_id, rate, free_min, currency, active)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
            pickId(data.zone_id || data.zoneId),
            Number(data.rate ?? 0),
            data.free_min ?? data.freeMin ?? null,
            data.currency || 'NPR',
            data.active !== false,
        ],
    );
    return mapRate(r.rows[0]);
}

// shipping model: updateShippingRate updates existing records.
export async function updateShippingRate(id, data) {
    const r = await pool.query(
        `UPDATE shipping_rates SET
            rate = COALESCE($1, rate),
            free_min = COALESCE($2, free_min),
            currency = COALESCE($3, currency),
            active = COALESCE($4, active),
            updated_at = NOW()
         WHERE id = $5 RETURNING *`,
        [
            data.rate == null ? null : Number(data.rate),
            data.free_min !== undefined
                ? data.free_min
                : data.freeMin !== undefined
                  ? data.freeMin
                  : null,
            data.currency ?? null,
            data.active === undefined ? null : Boolean(data.active),
            pickId(id),
        ],
    );
    return mapRate(r.rows[0]);
}

// shipping model: deleteShippingRate deletes matching records.
export async function deleteShippingRate(id) {
    const r = await pool.query(`DELETE FROM shipping_rates WHERE id = $1`, [pickId(id)]);
    return { deletedCount: r.rowCount };
}

