import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

export type SupportedLanguage = "ar" | "en";

/**
 * Checks if a value is a plain object or Mongoose document
 * (avoids Date, RegExp, Buffer, ObjectId, etc.)
 */
function isPlainObject(val: any): boolean {
  if (val === null || typeof val !== "object") return false;
  if (Array.isArray(val)) return false;
  if (val instanceof Date || val instanceof RegExp || Buffer.isBuffer(val)) return false;
  if (val instanceof mongoose.Types.ObjectId || val._bsontype === "ObjectID") return false;

  const proto = Object.getPrototypeOf(val);
  return (
    proto === null ||
    proto === Object.prototype ||
    typeof val.toObject === "function" ||
    typeof val.toJSON === "function"
  );
}

/**
 * Recursively traverses any payload (objects, arrays, nested documents)
 * and maps fields according to the requested language.
 */
export function localizePayload(data: any, lang: SupportedLanguage): any {
  if (!data) return data;

  if (Array.isArray(data)) {
    return data.map((item) => localizePayload(item, lang));
  }

  if (!isPlainObject(data)) {
    return data;
  }

  // Convert Mongoose document to plain object if needed
  let obj = data;
  if (typeof data.toObject === "function") {
    obj = data.toObject();
  } else if (typeof data.toJSON === "function" && !(data instanceof Date)) {
    obj = data.toJSON();
  }

  const result: Record<string, any> = {};

  // 1️⃣ First pass: recursively localize child properties
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    result[key] =
      isPlainObject(val) || Array.isArray(val)
        ? localizePayload(val, lang)
        : val;
  }

  // 2️⃣ Second pass: apply localization rules and filter out alternate language fields
  const keys = Object.keys(result);

  if (lang === "ar") {
    // In Arabic mode: set base fields (name, description, etc.) to Arabic and remove redundant ar_* / *_ar keys
    for (const key of keys) {
      if (key.startsWith("ar_") && key.length > 3) {
        const baseKey = key.slice(3);
        const arVal = result[key];
        if (arVal !== undefined && arVal !== null && arVal !== "") {
          result[baseKey] = arVal;
        }
        delete result[key]; // 🗑️ احذف الحقل العربي المكرر (يبقى الاسم بالعربي فقط داخل name)
      } else if (key.endsWith("_ar") && key.length > 3) {
        const baseKey = key.slice(0, -3);
        const arVal = result[key];
        if (arVal !== undefined && arVal !== null && arVal !== "") {
          result[baseKey] = arVal;
        }
        delete result[key]; // 🗑️ احذف الحقل العربي المكرر
      } else if (
        (key.startsWith("en_") && key.length > 3) ||
        (key.endsWith("_en") && key.length > 3)
      ) {
        delete result[key]; // احذف أي حقول en_*
      }
    }
  } else if (lang === "en") {
    // In English mode: keep English base fields, apply en_* if available, and remove all ar_* / *_ar fields
    for (const key of keys) {
      if (key.startsWith("en_") && key.length > 3) {
        const baseKey = key.slice(3);
        const enVal = result[key];
        if (enVal !== undefined && enVal !== null && enVal !== "") {
          result[baseKey] = enVal;
        }
        delete result[key];
      } else if (key.endsWith("_en") && key.length > 3) {
        const baseKey = key.slice(0, -3);
        const enVal = result[key];
        if (enVal !== undefined && enVal !== null && enVal !== "") {
          result[baseKey] = enVal;
        }
        delete result[key];
      } else if (
        (key.startsWith("ar_") && key.length > 3) ||
        (key.endsWith("_ar") && key.length > 3)
      ) {
        delete result[key]; // 🗑️ احذف كل الحقول العربي تماماً في وضع الإنجليزي
      }
    }
  }

  return result;
}

/**
 * Detect language from query parameter, custom headers, or Accept-Language.
 */
export function detectLanguage(req: Request): SupportedLanguage | null {
  const queryLang = (
    req.query.lang ||
    req.query.language ||
    req.query.locale
  ) as string | undefined;

  const headerLang = (
    req.headers["x-lang"] ||
    req.headers["x-language"] ||
    req.headers["accept-language"]
  ) as string | undefined;

  const candidate = (queryLang || headerLang || "").toLowerCase().trim();

  if (candidate.startsWith("ar")) return "ar";
  if (candidate.startsWith("en")) return "en";

  return null;
}

/**
 * Global Language Localization Middleware
 * Automatically intercepts responses and transforms model fields based on requested language (?lang=ar | ?lang=en)
 */
export const languageMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const lang = detectLanguage(req);

  if (lang) {
    req.lang = lang;
  }

  // If no language query or header was specified, pass through untouched
  if (!lang) {
    return next();
  }

  // Intercept res.json to localize the response data
  const originalJson = res.json.bind(res);

  res.json = (body: any): Response => {
    try {
      if (body && typeof body === "object") {
        const localizedBody = localizePayload(body, lang);
        return originalJson(localizedBody);
      }
    } catch (err) {
      console.error("[languageMiddleware] Error localizing response:", err);
    }
    return originalJson(body);
  };

  next();
};
