/** Join multiple subscription sources for subconverter `url` query (pipe-separated). */
export function joinSubscriptionSources(urls: string[]): string {
  return urls
    .map((u) => u.trim())
    .filter((u) => u.length > 0)
    .join("|");
}

/**
 * Normalize user-provided converter base into an absolute `/sub` endpoint URL
 * (subconverter-compatible).
 */
export function resolveSubconverterEndpoint(input: string): string {
  const raw = input.trim();
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const u = new URL(withScheme);
  let path = u.pathname.replace(/\/+$/, "") || "";
  if (!path.endsWith("/sub")) {
    path = `${path}/sub`.replace(/^\/\//, "/");
  }
  u.pathname = path;
  u.search = "";
  u.hash = "";
  return u.toString().replace(/\/+$/, "");
}

export type BuildClashSubscriptionLinkOptions = {
  /** subconverter `target` (default: clash YAML for Clash / Clash Verge). */
  target?: string;
  insert?: boolean;
  emoji?: boolean;
  list?: boolean;
  udp?: boolean;
  tfo?: boolean;
  scv?: boolean;
  /** Sets subconverter `flag=meta` (Clash Meta / mihomo-friendly output when supported). */
  appendFlagMeta?: boolean;
};

/**
 * Build an HTTPS subscription URL that Clash Verge can import as a remote profile.
 * The link points at a subconverter-compatible `/sub` endpoint.
 */
export function buildClashSubscriptionHttpsUrl(
  subconverterEndpoint: string,
  subscriptionSources: string,
  options: BuildClashSubscriptionLinkOptions = {},
): string {
  const endpoint = resolveSubconverterEndpoint(subconverterEndpoint);
  const {
    target = "clash",
    insert = false,
    emoji = true,
    list = false,
    udp = true,
    tfo = false,
    scv = true,
    appendFlagMeta = false,
  } = options;

  const params = new URLSearchParams();
  params.set("target", target);
  params.set("url", subscriptionSources);
  params.set("insert", insert ? "true" : "false");
  params.set("emoji", emoji ? "true" : "false");
  params.set("list", list ? "true" : "false");
  params.set("udp", udp ? "true" : "false");
  params.set("tfo", tfo ? "true" : "false");
  params.set("scv", scv ? "true" : "false");
  if (appendFlagMeta) {
    params.set("flag", "meta");
  }

  const qs = params.toString();
  return `${endpoint}?${qs}`;
}

/** `clash://install-config?url=` deep link (URI-encoded HTTPS profile URL). */
export function buildClashVergeInstallConfigUrl(httpsProfileUrl: string): string {
  return `clash://install-config?url=${encodeURIComponent(httpsProfileUrl)}`;
}
