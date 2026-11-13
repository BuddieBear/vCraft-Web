import { prisma } from "../database/prisma.js";

export function findPublicTimelineByBatchCode(batchCode) {
  return prisma.productBatch.findUnique({
    where: {
      batchCode,
      status: { in: ["IN_PROGRESS", "COMPLETED"] },
      product: { isPublished: true, artisan: { verificationStatus: "APPROVED", user: { isActive: true } } },
    },
    select: {
      batchCode: true,
      status: true,
      product: { select: { slug: true, name: true, artisan: { select: { workshopName: true } } } },
      logs: {
        orderBy: [{ stepOrder: "asc" }, { loggedAt: "asc" }, { id: "asc" }],
        select: {
          stage: true,
          stageTitle: true,
          description: true,
          evidenceImageUrls: true,
          loggedAt: true,
          stepOrder: true,
        },
      },
    },
  });
}
