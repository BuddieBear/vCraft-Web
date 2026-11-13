BEGIN;

CREATE TYPE pricing_mode AS ENUM ('FIXED', 'CONTACT');
CREATE TYPE sale_unit AS ENUM ('METER', 'PIECE', 'SET', 'BOX');

ALTER TABLE products
    ADD COLUMN pricing_mode pricing_mode NOT NULL DEFAULT 'FIXED',
    ADD COLUMN sale_unit sale_unit NOT NULL DEFAULT 'PIECE',
    ALTER COLUMN price DROP NOT NULL,
    ADD CONSTRAINT chk_products_pricing_mode CHECK (
        (pricing_mode = 'FIXED' AND price IS NOT NULL)
        OR (pricing_mode = 'CONTACT' AND price IS NULL)
    );

-- Map only products created by the earlier Nha Xá demo seed.
WITH demo_units (slug, email, unit) AS (
    VALUES
        ('reu-co', 'nep-van@nhaxa.example', 'METER'::sale_unit),
        ('bach-tra', 'thoi-nau@nhaxa.example', 'METER'),
        ('ho-phach', 'thoi-nau@nhaxa.example', 'METER'),
        ('dem-lam', 'nep-van@nhaxa.example', 'METER'),
        ('hong-dat', 'soi-moc@nhaxa.example', 'METER'),
        ('to-moc', 'thoi-nau@nhaxa.example', 'METER'),
        ('buoc-toc-to-nang', 'moc-sac@nhaxa.example', 'SET'),
        ('set-sac-truc', 'luom-to@nhaxa.example', 'BOX'),
        ('hop-trang-nga', 'moc-sac@nhaxa.example', 'BOX'),
        ('hop-pho-lua', 'soi-moc@nhaxa.example', 'BOX')
)
UPDATE products AS p
SET sale_unit = d.unit
FROM demo_units AS d, artisan_profiles AS a, users AS u
WHERE p.slug = d.slug AND p.artisan_id = a.id AND a.user_id = u.id AND u.email = d.email;

COMMIT;
