import axios from "axios";

/**
 * Super Systego (Super Admin) Client
 * Fetches themes and theme categories from the central Super Admin backend.
 *
 * In tenant subdomains, the .env contains SUPER_SYSTEGO_URL (pointing to https://superback.systego.net).
 * In master backend, it may be SUPER_ADMIN_SERVICE_URL.
 * If neither is defined, defaults to https://superback.systego.net.
 */
const getSuperAdminUrl = (): string => {
  const url =
    process.env.SUPER_ADMIN_SERVICE_URL ||
    process.env.SUPER_SYSTEGO_URL ||
    "https://superback.systego.net";
  return url.replace(/\/$/, "");
};

const getClient = () => {
  return axios.create({
    baseURL: getSuperAdminUrl(),
    timeout: 15_000,
    headers: {
      "Content-Type": "application/json",
    },
  });
};

export const fetchCategories = async () => {
  try {
    const { data } = await getClient().get("/api/admin/theme-categories");
    return (data as any).data;
  } catch (error: any) {
    console.error("[SuperAdminClient] Failed to fetch theme categories:", error?.message || error);
    throw error;
  }
};

export const fetchTemplates = async (categoryId: string) => {
  try {
    const { data } = await getClient().get(`/api/admin/themes?categoryId=${categoryId}`);
    return (data as any).data;
  } catch (error: any) {
    console.error(`[SuperAdminClient] Failed to fetch themes for category ${categoryId}:`, error?.message || error);
    throw error;
  }
};

export const fetchTemplateBySlug = async (slug: string) => {
  try {
    const { data } = await getClient().get(`/api/admin/themes/slug/${slug}`);
    return (data as any).data;
  } catch (error: any) {
    console.error(`[SuperAdminClient] Failed to fetch theme by slug ${slug}:`, error?.message || error);
    throw error;
  }
};

export const fetchTemplateSectionsBySlug = async (slug: string) => {
  try {
    const { data } = await getClient().get(`/api/admin/themes/slug/${slug}`);
    return (data as any).data;
  } catch (error: any) {
    console.error(`[SuperAdminClient] Failed to fetch theme sections by slug ${slug}:`, error?.message || error);
    throw error;
  }
};