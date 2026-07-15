/**
 * Row helpers: mapRow/mapRows (snake_case → API shape with _id), pickId/firstId for route params.
 */
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

export const mapRows = (rows) => rows.map(mapRow);

export const pickId = (value) => {
    if (value == null) return null;
    if (typeof value === 'object') return value._id ?? value.id ?? null;
    return value;
};

export const firstId = (arr) => {
    if (!arr) return null;
    const v = Array.isArray(arr) ? arr[0] : arr;
    return pickId(v);
};
