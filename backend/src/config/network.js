import { isIPv4, isIPv6 } from "node:net";
import express from "express";

const PROXY_KEYWORDS = new Set(["loopback", "linklocal", "uniquelocal"]);
const POSITIVE_INTEGER = /^[1-9]\d*$/;
const MAX_TRUST_PROXY_HOPS = 10;
const DEFAULT_PORT = 5000;
const DEFAULT_HOST = "127.0.0.1";
const TRUST_PROXY_ERROR =
    "TRUST_PROXY must be false, 0, an integer 1-10, or a comma-separated list of loopback, linklocal, uniquelocal, IP addresses, or non-zero CIDR ranges.";

function isValidCidr(entry) {
    const parts = entry.split("/");
    if (parts.length !== 2) return false;
    const [address, mask] = parts;
    if (!POSITIVE_INTEGER.test(mask)) return false;
    const bits = Number(mask);
    if (isIPv4(address)) return bits >= 1 && bits <= 32;
    if (isIPv6(address)) return bits >= 1 && bits <= 128;
    return false;
}

function isValidProxyEntry(entry) {
    if (!entry) return false;
    if (PROXY_KEYWORDS.has(entry)) return true;
    if (isIPv4(entry) || isIPv6(entry)) return true;
    if (entry.includes("/")) return isValidCidr(entry);
    return false;
}

export function parsePort(raw = process.env.PORT) {
    if (raw === undefined || raw === null) return DEFAULT_PORT;
    if (typeof raw !== "string") {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    const value = raw.trim();
    if (!value) return DEFAULT_PORT;
    if (!POSITIVE_INTEGER.test(value)) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error("PORT must be an integer between 1 and 65535.");
    }
    return port;
}

export function parseHost(raw = process.env.HOST) {
    if (raw === undefined || raw === null) return DEFAULT_HOST;
    if (typeof raw !== "string") {
        throw new Error("HOST must be a string.");
    }
    const value = raw.trim();
    if (!value) return DEFAULT_HOST;
    if (value.startsWith("[") || value.endsWith("]")) {
        if (!value.startsWith("[") || !value.endsWith("]")) {
            throw new Error("HOST has unmatched IPv6 brackets.");
        }
        const inner = value.slice(1, -1).trim();
        if (!inner || !isIPv6(inner)) {
            throw new Error("HOST bracketed value must be a valid IPv6 address.");
        }
        return inner;
    }
    return value;
}

export function parseTrustProxy(raw = process.env.TRUST_PROXY) {
    if (raw === undefined || raw === null) return false;
    if (typeof raw !== "string") {
        throw new Error("TRUST_PROXY must be a string.");
    }
    const value = raw.trim();
    if (!value || value.toLowerCase() === "false" || value === "0") {
        return false;
    }
    if (POSITIVE_INTEGER.test(value)) {
        const hops = Number(value);
        if (hops > MAX_TRUST_PROXY_HOPS) {
            throw new Error(`TRUST_PROXY hop count must be an integer between 1 and ${MAX_TRUST_PROXY_HOPS}.`);
        }
        return hops;
    }

    const entries = value.split(",").map((entry) => entry.trim().toLowerCase());
    if (entries.some((entry) => !isValidProxyEntry(entry))) {
        throw new Error(TRUST_PROXY_ERROR);
    }
    const normalized = entries.join(", ");
    try {
        express().set("trust proxy", normalized);
    } catch {
        throw new Error(TRUST_PROXY_ERROR);
    }
    return normalized;
}
