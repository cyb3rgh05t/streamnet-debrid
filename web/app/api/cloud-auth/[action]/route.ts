import { NextRequest, NextResponse } from "next/server";

const allowed = new Set([
  "auth-refresh",
  "auth-login",
  "cloud-auth-email",
  "cloud-auth-reset",
  "auth-password-complete",
  "tv-auth-web",
  "tv-auth-complete",
  "account-sync-pull",
  "account-sync-push",
  "account-sync-events",
]);

async function proxy(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  const { action } = await context.params;
  if (!allowed.has(action))
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const base = (
    process.env.STREAMNET_BACKEND_URL || "https://auth.mystreamnet.club"
  ).replace(/\/+$/, "");

  if (action === "account-sync-events") {
    const token = request.nextUrl.searchParams.get("token") ?? "";
    const authHeader =
      request.headers.get("authorization") ?? (token ? `Bearer ${token}` : "");
    try {
      const response = await fetch(
        `${base}/account-sync-events${token ? `?token=${encodeURIComponent(token)}` : ""}`,
        {
          method: "GET",
          headers: {
            ...(authHeader ? { Authorization: authHeader } : {}),
            Accept: "text/event-stream",
          },
          cache: "no-store",
        },
      );
      return new NextResponse(response.body, {
        status: response.status,
        headers: {
          "content-type": "text/event-stream",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive",
          "x-accel-buffering": "no",
        },
      });
    } catch {
      return NextResponse.json(
        { error: "Events stream unavailable" },
        { status: 502 },
      );
    }
  }

  const body = request.method === "GET" ? "" : await request.text();
  if (body.length > 2 * 1024 * 1024)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const response = await fetch(`${base}/${action}`, {
      method: request.method,
      headers: {
        "content-type":
          request.headers.get("content-type") ?? "application/json",
        ...(request.headers.get("authorization")
          ? { Authorization: request.headers.get("authorization")! }
          : {}),
      },
      ...(request.method === "GET" ? {} : { body }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    return new NextResponse(response.body, {
      status: response.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "StreamNet Cloud temporarily unavailable" },
      { status: 502 },
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return proxy(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  return proxy(request, context);
}
