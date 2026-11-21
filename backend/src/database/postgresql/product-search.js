import { Prisma } from "@prisma/client";
import { demoWorkshopDomain } from "../../data/demo-workshop.js";

function foldVietnamese(value) {
    const accented = "Đđ\u0300\u0301\u0302\u0303\u0306\u0309\u031b\u0323";
    return Prisma.sql`lower(translate(normalize(${value}, NFD), ${accented}, 'Dd'))`;
}

export function findMatchingProductIds(tx, { skip, take, category, artisanId, q, sort, storefront }) {
    const priceOrder = sort === "asc" ? Prisma.sql`p.price ASC NULLS LAST,`
        : sort === "desc" ? Prisma.sql`p.price DESC NULLS LAST,` : Prisma.empty;
    // Apply public visibility and filters before pagination.
    return tx.$queryRaw`
        SELECT p.id
        FROM products p
        JOIN artisan_profiles a ON a.id = p.artisan_id
        JOIN users u ON u.id = a.user_id
        LEFT JOIN categories c ON c.id = p.category_id
        CROSS JOIN (SELECT ${foldVietnamese(Prisma.sql`${q}::text`)} AS needle) term
        WHERE p.is_published AND a.verification_status = 'APPROVED' AND NOT a.is_suspended AND u.is_active AND u.role = 'ARTISAN'
            ${category ? Prisma.sql`AND c.slug = ${category}` : Prisma.empty}
            ${artisanId ? Prisma.sql`AND p.artisan_id = ${artisanId}::uuid` : Prisma.empty}
            ${storefront ? Prisma.sql`AND right(lower(u.email), length(${demoWorkshopDomain}::text)) <> ${demoWorkshopDomain}` : Prisma.empty}
            AND term.needle <> ''
            AND (
                strpos(${foldVietnamese(Prisma.sql`p.name`)}, term.needle) > 0
                OR strpos(${foldVietnamese(Prisma.sql`p.raw_material`)}, term.needle) > 0
                OR strpos(${foldVietnamese(Prisma.sql`c.name`)}, term.needle) > 0
                OR strpos(${foldVietnamese(Prisma.sql`a.workshop_name`)}, term.needle) > 0
            )
        ORDER BY ${priceOrder} p.slug ASC
        OFFSET ${skip} LIMIT ${take}
    `;
}
