import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import GigDetailPage from "./GigDetailPage";
import { server } from "../test/server";

const gigUrl = "http://localhost:8000/api/v1/gigs/4";

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/gigs/4"]}>
        <Routes>
          <Route path="/gigs/:gigId" element={<GigDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("gig detail page", () => {
  it("shows the gig schedule, pay, and contact for an assigned member", async () => {
    sessionStorage.setItem(
      "roadhouse.demo-session",
      JSON.stringify({ role: "member", memberId: 1, memberName: "Riley Keys" }),
    );
    server.use(
      http.get(gigUrl, () => HttpResponse.json({
        id: 4,
        venue: "The Blue Door",
        date: "2026-10-18",
        pay: "$500",
        contact: "Jordan 555-0100",
        band_size: "trio",
        status: "booked",
        schedule: [
          { label: "Load in", time: "18:00:00" },
          { label: "Soundcheck", time: "18:45:00" },
          { label: "First set", time: "20:00:00" },
        ],
        required_members: ["Riley Keys"],
        created_at: "2026-10-01T12:00:00Z",
        visibility: "full",
      })),
    );

    renderDetail();

    expect(await screen.findByRole("heading", { name: "The Blue Door" })).toBeInTheDocument();
    expect(screen.getByText("Sunday, October 18, 2026")).toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument();
    expect(screen.getByText("Jordan 555-0100")).toBeInTheDocument();
    expect(screen.getByText("18:45")).toBeInTheDocument();
  });

  it("shows no private details when the API denies an unassigned member", async () => {
    sessionStorage.setItem(
      "roadhouse.demo-session",
      JSON.stringify({ role: "member", memberId: 1, memberName: "Riley Keys" }),
    );
    server.use(
      http.get(gigUrl, () => HttpResponse.json(
        { code: "not_found", detail: "Gig not found." },
        { status: 404 },
      )),
    );

    renderDetail();

    expect(await screen.findByRole("heading", { name: "Gig details unavailable" })).toBeInTheDocument();
    expect(screen.getByText("This gig may not be assigned to your member profile.")).toBeInTheDocument();
    expect(screen.queryByText("$500")).not.toBeInTheDocument();
  });
});