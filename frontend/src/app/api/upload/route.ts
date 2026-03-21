import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.formData();
  const file = data.get("file") as File;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" });
  }

  const text = await file.text();

  // Temporary fake summary (AI comes later)
  const summary = text.slice(0, 300);

  return NextResponse.json({
    filename: file.name,
    summary: summary
  });
}