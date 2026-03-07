import { NextResponse } from "next/server";

/**
 * Issue #24: Standardized API response helpers.
 */
export function apiSuccess<T>(data?: T, status: number = 200) {
  return NextResponse.json(
    { success: true as const, ...(data !== undefined && { data }) },
    { status }
  );
}

export function apiError(message: string, status: number = 400) {
  return NextResponse.json(
    { success: false as const, error: message },
    { status }
  );
}
