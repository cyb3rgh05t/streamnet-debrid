import { NextRequest, NextResponse } from "next/server";

// Proxies MDBList (https://api.mdblist.com) so browser calls avoid CORS and the
// user's API key is attached server-side. The key arrives ONLY on the
// `x-mdblist-key` header (never a query param — those leak into CDN/server logs)
// and is injected as `?apikey=` on the upstream request.
async function handler(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  const input = new URL(request.url);
  const method = request.method;
  const body = method === "GET" || method === "HEAD" ? undefined : await request.text();

  const apiKey = request.headers.get("x-mdblist-key") ?? "";
  if (!apiKey) {
    return NextResponse.json({ error: "Missing MDBList API key" }, { status: 400 });
  }

  const target = new URL(`https://api.mdblist.com/${path.join("/")}`);
  input.searchParams.forEach((value, key) => {
    if (key !== "apikey") target.searchParams.set(key, value);
  });
  target.searchParams.set("apikey", apiKey);

  const response = await fetch(target, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body,
    cache: "no-store"
  });

  const responseHeaders = new Headers();
  responseHeaders.set("content-type", response.headers.get("content-type") ?? "application/json");
  responseHeaders.set("cache-control", "no-store");

  return new NextResponse(response.body, {
    status: response.status,
    headers: responseHeaders
  });
}

export const GET = handler;
export const POST = handler;
export const DELETE = handler;
