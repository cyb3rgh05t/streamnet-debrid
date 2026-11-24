import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const input = new URL(request.url);
  const customKey = (request.headers.get("x-tmdb-api-key") ?? "").trim();
  const tmdbKey = customKey || process.env.TMDB_API_KEY || "";
  input.searchParams.delete("api_key");

  if (!tmdbKey) {
    return NextResponse.json(
      { error: "TMDB proxy is not configured" },
      { status: 500 },
    );
  }
  const target = new URL(`https://api.themoviedb.org/3/${path.join("/")}`);
  input.searchParams.forEach((value, key) =>
    target.searchParams.set(key, value),
  );
  target.searchParams.set("api_key", tmdbKey);

  let response: Response | null = null;
  try {
    response = await fetch(target, {
      next: { revalidate: customKey ? 0 : 86400 },
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    response = null;
  }

  if (!response) {
    return NextResponse.json(
      { error: "TMDB upstream unreachable" },
      { status: 502 },
    );
  }

  const headers = new Headers();
  headers.set(
    "content-type",
    response.headers.get("content-type") ?? "application/json",
  );

  if (customKey) {
    headers.set("cache-control", "private, no-store");
  } else if (response.status === 404) {
    // Invalid or unavailable TMDB ids are stable enough to cache briefly. This
    // prevents mounted card rails from repeatedly hitting the same missing id.
    headers.set("cache-control", "public, max-age=300, s-maxage=3600");
    headers.set("cdn-cache-control", "public, max-age=3600");
    headers.set("vary", "Accept-Encoding");
  } else if (!response.ok) {
    headers.set("cache-control", "private, no-store");
  } else {
    // Short browser cache; long CDN cache for shared system key requests.
    headers.set(
      "cache-control",
      "public, max-age=300, s-maxage=21600, stale-while-revalidate=21600",
    );
    headers.set(
      "netlify-cdn-cache-control",
      "public, durable, max-age=21600, stale-while-revalidate=21600",
    );
    headers.set(
      "cdn-cache-control",
      "public, max-age=21600, stale-while-revalidate=21600",
    );
    headers.set("netlify-vary", "query");
    headers.set("vary", "Accept-Encoding");
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers,
  });
}
