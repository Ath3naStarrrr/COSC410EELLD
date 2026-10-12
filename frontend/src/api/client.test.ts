import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";

import {
  bookGig,
  clearDemoSession,
  errorMessage,
  loadGig,
  loadGigs,
  readDemoSession,
  saveDemoSession,
} from "./client";
import { server } from "../test/server";

const apiUrl = "http://localhost:8000/api/v1";
const memberSession = {
  role: "member" as const,
  memberId: 7,
  memberName: "Riley Keys",
};
const sampleGig = {
  id: 4,
  venue: "The Blue Door",
  date: "2026-10-18",
  pay: "$500",
  contact: "Jordan 555-0100",
  band_size: "trio" as const,
  status: "booked" as const,
  schedule: [{ label: "First set", time: "20:00:00" }],
  required_members: ["Riley Keys"],
  created_at: "2026-10-01T12:00:00Z",
  visibility: "full" as const,
};

describe("demo session", () => {
  it("stores, reads, and clears the selected role", () => {
    saveDemoSession(memberSession);
    expect(readDemoSession()).toEqual(memberSession);
    clearDemoSession();
    expect(readDemoSession()).toBeNull();
  });

  it("ignores malformed session storage data", () => {
    sessionStorage.setItem("roadhouse.demo-session", "{");
    expect(readDemoSession()).toBeNull();
    sessionStorage.setItem("roadhouse.demo-session", JSON.stringify({ role: "other" }));
    expect(readDemoSession()).toBeNull();
  });
});

describe("typed gig API client", () => {
  it("sends role, member, search, sort, and pagination to the gig list", async () => {
    let requestUrl = "";
    let requestRole = "";
    let requestMember = "";
    server.use(
      http.get(`${apiUrl}/gigs`, ({ request }) => {
        requestUrl = request.url;
        requestRole = request.headers.get("X-Demo-Role") ?? "";
        requestMember = request.headers.get("X-Demo-Member-Id") ?? "";
        return HttpResponse.json({
          items: [sampleGig], total: 1, page: 2, page_size: 25,
        });
      }),
    );

    const result = await loadGigs(memberSession, "Blue", "date", 2);

    expect(new URL(requestUrl).searchParams.get("q")).toBe("Blue");
    expect(new URL(requestUrl).searchParams.get("page")).toBe("2");
    expect(requestRole).toBe("member");
    expect(requestMember).toBe("7");
    expect(result.items[0]).toMatchObject({ id: 4, venue: "The Blue Door" });
  });

  it("loads a gig detail and sends a manager booking", async () => {
    let booking: unknown;
    server.use(
      http.get(`${apiUrl}/gigs/4`, () => HttpResponse.json(sampleGig)),
      http.post(`${apiUrl}/gigs`, async ({ request }) => {
        booking = await request.json();
        return HttpResponse.json(sampleGig, { status: 201 });
      }),
    );
    const managerSession = { role: "manager" as const };
    const createPayload = {
      venue: "The Blue Door",
      date: "2026-10-18",
      pay: "$500",
      contact: "Jordan 555-0100",
      band_size: "trio" as const,
      required_member_ids: [7],
      schedule: [{ label: "First set", time: "20:00:00" }],
    };

    expect(await loadGig(memberSession, 4)).toMatchObject({ venue: "The Blue Door" });
    expect(await bookGig(managerSession, createPayload)).toMatchObject({ id: 4 });
    expect(booking).toEqual(createPayload);
  });

  it("surfaces API detail for list and missing gig failures", async () => {
    server.use(
      http.get(`${apiUrl}/gigs`, () => HttpResponse.json(
        { code: "unavailable", detail: "Try again shortly." },
        { status: 503 },
      )),
      http.get(`${apiUrl}/gigs/4`, () => HttpResponse.json(
        { code: "not_found", detail: "Gig not found." },
        { status: 404 },
      )),
    );

    await expect(loadGigs({ role: "manager" }, "", "date", 1)).rejects.toThrow(
      "Try again shortly.",
    );
    await expect(loadGig(memberSession, 4)).rejects.toThrow("Gig not found.");
    expect(errorMessage(null, "Fallback message")).toBe("Fallback message");
  });
});