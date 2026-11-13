import { findPublicArtisan, listPublicArtisans } from "../repositories/artisans.repository.js";

export function listArtisans(options) { return listPublicArtisans(options); }
export function getArtisan(id) { return findPublicArtisan(id); }
