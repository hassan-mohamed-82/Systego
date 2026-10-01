import { BadRequest } from "../../Errors/BadRequest";

export interface BostaCredentials {
  apiKey: string;
  baseUrl: string;
}

/**
 * ✅ بيجيب Bosta credentials من الـ settings
 * - الأول من DB (settings.bosta)
 * - fallback للـ .env (للتجربة/onboarding)
 * - لو الاتنين مش موجودين → error واضح
 */
export const getBostaCreds = (settings: any): BostaCredentials => {
  const apiKey = settings?.bosta?.apiKey || process.env.BOSTA_API_KEY;
  const baseUrl =
    settings?.bosta?.baseUrl ||
    process.env.BOSTA_BASE_URL ||
    "https://app.bosta.co/api/v2";

  if (!apiKey) {
    throw new BadRequest(
      "Bosta API key is not configured. Please add it in Shipping Settings.",
    );
  }

  return { apiKey, baseUrl };
};
