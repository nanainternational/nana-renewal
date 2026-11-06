export type CollectorPlatform = "ably" | "4910" | "zigzag" | "domeggook";
export type CollectorSettings = {
  url: string;
  keyword: string;
  limit: number;
  headless: boolean;
  autoCategory: boolean;
  emptyRounds: number;
  thumbnails: boolean;
  spreadsheetId: string;
  worksheet: string;
};

export function defaultCollectorSettings(platform: CollectorPlatform): CollectorSettings {
  return { url: platform === "zigzag" ? "https://zigzag.kr/" : "", keyword: "",
    limit: 100, headless: true, autoCategory: true, emptyRounds: 5,
    thumbnails: false, spreadsheetId: "", worksheet: "" };
}

const hosts: Record<CollectorPlatform, string[]> = {
  ably: ["a-bly.com"], "4910": ["4910.kr"], zigzag: ["zigzag.kr"], domeggook: ["domeggook.com"],
};

// Shared by the admin form and API. No arbitrary PC paths, credentials or commands.
export function validateCollectorSettings(platform: CollectorPlatform, input: unknown): CollectorSettings {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("invalid_settings");
  const value = input as Record<string, unknown>;
  const settings = defaultCollectorSettings(platform);
  for (const key of ["url", "keyword", "spreadsheetId", "worksheet"] as const) {
    if (typeof value[key] !== "string") throw new Error("invalid_settings");
    settings[key] = value[key].trim();
  }
  if (settings.url.length > 2000 || settings.keyword.length > 500 || settings.worksheet.length > 100 ||
      /[\u0000-\u001f]/.test(settings.keyword + settings.worksheet)) throw new Error("invalid_settings");
  if (settings.url) {
    let url: URL;
    try { url = new URL(settings.url); } catch { throw new Error("invalid_collector_url"); }
    if (url.protocol !== "https:" || url.username || url.password || (url.port && url.port !== "443") ||
        !hosts[platform].some((host) => url.hostname === host || url.hostname.endsWith("." + host))) {
      throw new Error("invalid_collector_url");
    }
  }
  if (platform === "domeggook" && settings.url) throw new Error("keyword_required");
  if ((platform === "ably" && !settings.url) || (platform === "zigzag" && !settings.url)) throw new Error("url_required");
  if (platform === "domeggook" && !settings.keyword) throw new Error("keyword_required");
  for (const key of ["headless", "autoCategory", "thumbnails"] as const) {
    if (typeof value[key] !== "boolean") throw new Error("invalid_settings");
    settings[key] = value[key];
  }
  for (const key of ["limit", "emptyRounds"] as const) {
    const number = value[key];
    if (typeof number !== "number" || !Number.isInteger(number) || number < 1 || number > (key === "limit" ? 10000 : 100)) {
      throw new Error("invalid_settings");
    }
    settings[key] = number;
  }
  if (platform === "4910" && !settings.url && !settings.keyword && !settings.autoCategory) throw new Error("url_required");
  if (settings.spreadsheetId && !/^[A-Za-z0-9_-]{20,200}$/.test(settings.spreadsheetId)) throw new Error("invalid_spreadsheet_id");
  return settings;
}
