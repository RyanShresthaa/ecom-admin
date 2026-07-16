/**
 * Row helpers: mapRow/mapRows (snake_case → API shape with _id), pickId/firstId for route params.
 */
// Normalize SQL row keys from snake_case database format to API-friendly shape.
export const mapRow = (row) => {
    if (!row) return null;
    const { id, created_at, updated_at, ...rest } = row;
    return {
        ...rest,
        _id: id,
        id,
        createdAt: created_at,
        updatedAt: updated_at,
    };
};

// Normalize an array of SQL rows for response serialization.
export const mapRows = (rows) => rows.map(mapRow);

// Extract numeric identifier from common row/id value shapes.
export const pickId = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value._id ?? value.id ?? null;
    return value;
};

// Extract first valid identifier from a database result array.
export const firstId = (arr) => {
    if (!arr) return null;
    const v = Array.isArray(arr) ? arr[0] : arr;
    return pickId(v);
};
