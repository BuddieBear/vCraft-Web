export function lockRetailOrder(tx, orderId) {
    return tx.$queryRaw`SELECT id FROM retail_orders WHERE id = ${orderId}::uuid FOR UPDATE`;
}

export function lockQuotation(tx, id) {
    return tx.$queryRaw`SELECT id FROM quotation_requests WHERE id = ${id}::uuid FOR UPDATE`;
}

export function lockArtisanAssignment(tx, assignmentId, artisanId) {
    return tx.$queryRaw`SELECT allocated_quantity FROM order_assignments WHERE id = ${assignmentId}::uuid AND artisan_id = ${artisanId}::uuid FOR UPDATE`;
}

export function lockAssignment(tx, orderAssignmentId) {
    return tx.$queryRaw`SELECT id FROM order_assignments WHERE id = ${orderAssignmentId}::uuid FOR UPDATE`;
}

export function lockProductBatch(tx, batchId) {
    return tx.$queryRaw`SELECT id FROM product_batches WHERE id = ${batchId}::uuid FOR UPDATE`;
}

export function lockActiveUserPassword(tx, id) {
    return tx.$queryRaw`SELECT password_hash FROM users WHERE id = ${id}::uuid AND is_active FOR UPDATE`;
}
