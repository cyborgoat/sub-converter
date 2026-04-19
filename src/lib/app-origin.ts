const envOrigin = (
  import.meta.env.VITE_CONVERTER_ORIGIN as string | undefined
)?.trim()
  .replace(/\/+$/, "");

/**
 * Public origin of this deployment (no trailing slash), used as the converter host
 * so generated profile URLs stay on the same site as this app.
 *
 * 1. If `VITE_CONVERTER_ORIGIN` was set at build time (e.g. in GitHub Actions), use it.
 * 2. Otherwise derive from the current page: prefer HTTPS for public hosts, then append
 *    the Vite `BASE_URL` path.
 */
export function getConverterBaseOrigin(): string {
  if (envOrigin) return envOrigin;

  if (typeof window === "undefined") return "";

  const base = import.meta.env.BASE_URL || "/";
  const runtimeOrigin = new URL(window.location.origin);
  if (
    runtimeOrigin.protocol === "http:" &&
    !["localhost", "127.0.0.1", "::1"].includes(runtimeOrigin.hostname)
  ) {
    runtimeOrigin.protocol = "https:";
  }

  const resolved = new URL(base, runtimeOrigin);
  const path = resolved.pathname.replace(/\/+$/, "");
  return path ? `${resolved.origin}${path}` : resolved.origin;
}
