/** Public base URL used in QR codes and share links (not window.location, so codes made on localhost still work). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://managment-website.vercel.app").replace(/\/$/, "");

export const hubUrl = (slug: string) => `${SITE_URL}/hub/${slug}`;
