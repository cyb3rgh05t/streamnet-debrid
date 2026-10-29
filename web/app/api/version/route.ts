import { NextResponse } from "next/server";
import webPackage from "../../../package.json";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      version: webPackage.version,
      build: process.env.NEXT_PUBLIC_BUILD_STAMP || null,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
