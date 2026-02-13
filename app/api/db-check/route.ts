import { NextResponse } from "next/server";
import { prisma } from '@/lib/db';

export async function GET() {
  const info = await prisma.$queryRaw<
    Array<{ db: string; user: string; schema: string }>
  >`SELECT current_database() AS db, current_schema() AS schema, current_user AS user`;

  return NextResponse.json({
    databaseUrlStartsWith: (process.env.DATABASE_URL || "").split("@")[0], // no secrets
    info: info[0],
  });
}