import createClient from "openapi-fetch";

import type { components, paths } from "./schema";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const sessionStorageKey = "roadhouse.demo-session";

export type DemoSession =
  | { role: "manager" }
  | { role: "member"; memberId: number; memberName: string };

export type Member = components["schemas"]["MemberRead"];
export type GigDetail = components["schemas"]["GigDetail"];
export type GigSummary = components["schemas"]["GigSummary"];
export type GigListItem = GigDetail | GigSummary;
export type GigCreate = components["schemas"]["GigCreate"];
export type GigPage = components["schemas"]["Page_Union_GigDetail__GigSummary__"];
export type MemberPage = components["schemas"]["Page_MemberRead_"];
export type ErrorResponse = components["schemas"]["ErrorResponse"];

export function readDemoSession(): DemoSession | null {
  const stored = sessionStorage.getItem(sessionStorageKey);
  if (!stored) return null;

  try {
    const value: unknown = JSON.parse(stored);
    if (typeof value !== "object" || value === null || !("role" in value)) {
      return null;
    }
    if (value.role === "manager") return { role: "manager" };
    if (
      value.role === "member" &&
      "memberId" in value &&
      typeof value.memberId === "number" &&
      "memberName" in value &&
      typeof value.memberName === "string"
    ) {
      return {
        role: "member",
        memberId: value.memberId,
        memberName: value.memberName,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function saveDemoSession(session: DemoSession): void {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
}

export function clearDemoSession(): void {
  sessionStorage.removeItem(sessionStorageKey);
}

export function apiClient(session?: DemoSession) {
  const headers: Record<string, string> = {};
  if (session?.role === "manager") headers["X-Demo-Role"] = "manager";
  if (session?.role === "member") {
    headers["X-Demo-Role"] = "member";
    headers["X-Demo-Member-Id"] = String(session.memberId);
  }
  return createClient<paths>({ baseUrl: apiBaseUrl, headers });
}

export function errorMessage(error: unknown, fallback: string): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "detail" in error &&
    typeof error.detail === "string"
  ) {
    return error.detail;
  }
  return fallback;
}

export async function loadMembers(): Promise<MemberPage> {
  const { data, error } = await apiClient().GET("/api/v1/members", {
    params: { query: { page_size: 100 } },
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not load band members."));
  }
  return data;
}

export async function loadGigs(
  session: DemoSession,
  query: string,
  sort: "date" | "-date" | "venue" | "-venue",
  page: number,
): Promise<GigPage> {
  const { data, error } = await apiClient(session).GET("/api/v1/gigs", {
    params: {
      query: { q: query || undefined, sort, page, page_size: 25 },
    },
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not load upcoming gigs."));
  }
  return data;
}

export async function loadGig(
  session: DemoSession,
  gigId: number,
): Promise<GigDetail> {
  const { data, error } = await apiClient(session).GET(
    "/api/v1/gigs/{gig_id}",
    { params: { path: { gig_id: gigId } } },
  );
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not load gig details."));
  }
  return data;
}

export async function bookGig(
  session: DemoSession,
  gig: GigCreate,
): Promise<GigDetail> {
  const { data, error } = await apiClient(session).POST("/api/v1/gigs", {
    body: gig,
  });
  if (error || !data) {
    throw new Error(errorMessage(error, "Could not book this gig."));
  }
  return data;
}