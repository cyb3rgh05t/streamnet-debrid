import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const { type } = await context.params;
  if (type !== "movie" && type !== "tv") {
    return NextResponse.json(
      { error: "Unsupported genre type" },
      { status: 400 },
    );
  }

  const apiKey = (process.env.VODWISHARR_API_KEY ?? "").trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Genre fanart is not configured" },
      { status: 503 },
    );
  }

  const baseUrl = (
    process.env.VOD_REQUEST_BASE_URL ?? "https://streamnetvod.mystreamnet.club"
  ).replace(/\/+$/, "");
  const input = new URL(request.url);
  const target = new URL(`${baseUrl}/api/v1/discover/genreslider/${type}`);
  target.searchParams.set(
    "language",
    input.searchParams.get("language") || "en-US",
  );

  try {
    const response = await fetch(target, {
      headers: { Accept: "application/json", "X-API-Key": apiKey },
      next: { revalidate: 86400 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: "Genre fanart service unavailable" },
        { status: response.status },
      );
    }
    return NextResponse.json(await response.json(), {
      headers: {
        "cache-control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Genre fanart service unavailable" },
      { status: 502 },
    );
  }
}
