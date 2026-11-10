/** Tiny user-agent parser (no dependency) — good enough for dashboard splits. */
export function parseUserAgent(ua: string, screenWidth?: number) {
  const s = ua.toLowerCase();
  let device: "mobile" | "tablet" | "desktop" = "desktop";
  if (/ipad|tablet|playbook|silk/.test(s) || (/android/.test(s) && !/mobile/.test(s))) device = "tablet";
  else if (/mobi|iphone|ipod|android|blackberry|opera mini|iemobile/.test(s)) device = "mobile";
  else if (screenWidth && screenWidth < 768) device = "mobile";

  let browser = "Other";
  if (/edg\//.test(s)) browser = "Edge";
  else if (/opr\/|opera/.test(s)) browser = "Opera";
  else if (/samsungbrowser/.test(s)) browser = "Samsung Internet";
  else if (/chrome|crios/.test(s)) browser = "Chrome";
  else if (/firefox|fxios/.test(s)) browser = "Firefox";
  else if (/safari/.test(s)) browser = "Safari";

  let os = "Other";
  if (/iphone|ipad|ipod/.test(s)) os = "iOS";
  else if (/android/.test(s)) os = "Android";
  else if (/windows/.test(s)) os = "Windows";
  else if (/mac os/.test(s)) os = "macOS";
  else if (/linux/.test(s)) os = "Linux";

  return { device, browser, os };
}
