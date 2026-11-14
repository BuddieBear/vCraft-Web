export async function lockQuote(tx, id) {
  const rows = await tx.$queryRaw`SELECT id FROM quotation_requests WHERE id = ${id}::uuid FOR UPDATE`;
  return rows.length ? tx.quotationRequest.findUnique({ where: { id } }) : null;
}

export function activeUser(tx, id, role) {
  return tx.user.findFirst({ where: { id, role, isActive: true }, select: { id: true } });
}

export function approvedArtisan(tx, userId) {
  return tx.artisanProfile.findFirst({ where: { userId, verificationStatus: "APPROVED", user: { isActive: true, role: "ARTISAN" } }, select: { id: true, userId: true } });
}
