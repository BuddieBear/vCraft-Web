import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve, join } from "node:path";
import sharp from "sharp";
import { ApiError } from "../middlewares/api-error.js";

export const uploadDirectory = resolve(process.env.UPLOAD_DIR || "storage/uploads");

export async function saveImages(files) {
    if (!files?.length) {
        throw new ApiError(400, "INVALID_IMAGE", "Vui lòng chọn ảnh.");
    }
    await mkdir(uploadDirectory, { recursive: true });
    const created = [];
    try {
        for (const file of files) {
            let output;
            try {
                const image = sharp(file.buffer, { limitInputPixels: 25000000, failOn: "error", animated: false });
                const metadata = await image.metadata();
                const supported = ["jpeg", "png", "webp"].includes(metadata.format);
                if (!supported || (metadata.pages ?? 1) !== 1) {
                    throw new Error("Unsupported image");
                }
                output = await image.rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
            } catch {
                throw new ApiError(400, "INVALID_IMAGE", "Ảnh không hợp lệ hoặc không được hỗ trợ.");
            }
            const filename = `${randomUUID()}.webp`;
            await writeFile(join(uploadDirectory, filename), output, { flag: "wx" });
            created.push(filename);
        }
        return created.map((filename) => `/uploads/${filename}`);
    } catch (error) {
        await Promise.allSettled(created.map((filename) => unlink(join(uploadDirectory, filename))));
        throw error;
    }
}
