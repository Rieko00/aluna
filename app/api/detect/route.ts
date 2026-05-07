import { NextResponse } from "next/server";

/**
 * This API route is no longer used.
 * ONNX inference is performed client-side via onnxruntime-web (Web Worker).
 * Kept as a placeholder to avoid 404s from old bookmarks/clients.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Server-side inference has been moved to the client. Please refresh the page." },
    { status: 410 },
  );
}
