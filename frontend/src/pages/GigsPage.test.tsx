import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import GigsPage from "./GigsPage";
import { server } from "../test/server";

const apiUrl = "http://localhost:8000/api/v1";

const memberRoster = {
  items: [
    { id: 1, name: "Riley Keys" },
    { id: 2, name: "Sam Drums" },
  ],
  total: 2,
  page: 1,
  page_size: 100,
};

function renderGigs(path = "/gigs") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/gigs" element={<GigsPage />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("gigs page", () => {
  it("shows a disabled summary without pay or contact to an unassigned member", async () => {
    sessionStorage.setItem(
      "roadhouse.demo-session",
      JSON.stringify({ role: "member", memberId: 1, memberName: "Riley Keys" }),
    );
    server.use(
      http.get(`${apiUrl}/gigs`, () => HttpResponse.json({
        items: [
          {
            id: 1,
            venue: "The Blue Door",
            date: "2026-10-18",
            visibility: "full",
            pay: "$500",
            contact: "Jordan private contact",
            band_size: "trio",
            status: "booked",
            schedule: [{ label: "Load in", time: "18:00:00" }],
            required_members: ["Riley Keys"],
            created_at: "2026-10-01T12:00:00Z",
          },
          {
            id: 2,
            venue: "Hub City Tap",
            date: "2026-11-02",
            visibility: "summary",
          },
        ],
        total: 2,
        page: 1,
        page_size: 25,
      })),
    );

    renderGigs();

    const assigned = await screen.findByRole("link", { name: "The Blue Door" });
    expect(assigned).toHaveAttribute("href", "/gigs/1");
    const unavailable = screen.getByText("Hub City Tap");
    expect(unavailable).toHaveAttribute("aria-disabled", "true");
    expect(unavailable.closest("article")).toHaveTextContent("Not assigned");
    expect(screen.queryByText("Jordan private contact")).not.toBeInTheDocument();
    expect(screen.getByText("$500")).toBeInTheDocument();
  });

  it("lets a manager book a gig with selected members and schedule", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("roadhouse.demo-session", JSON.stringify({ role: "manager" }));
    let requestBody: unknown;
    server.use(
      http.get(`${apiUrl}/gigs`, () => HttpResponse.json({
        items: [], total: 0, page: 1, page_size: 25,
      })),
      http.get(`${apiUrl}/members`, () => HttpResponse.json(memberRoster)),
      http.post(`${apiUrl}/gigs`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: 7, venue: "The Blue Door" }, { status: 201 });
      }),
    );

    renderGigs();
    await user.click(await screen.findByRole("button", { name: /book a gig/i }));
    await user.type(screen.getByRole("textbox", { name: "Venue" }), "The Blue Door");
    await user.type(screen.getByLabelText("Date"), "2026-10-18");
    await user.type(screen.getByLabelText("Pay"), "$500");
    await user.type(screen.getByLabelText("Contact"), "Jordan 555-0100");
    await user.selectOptions(screen.getByLabelText("Band size"), "trio");
    await user.click(screen.getByRole("checkbox", { name: "Riley Keys" }));
    await user.type(screen.getByLabelText("Load in"), "18:00");
    await user.click(screen.getByRole("button", { name: "Book gig" }));

    expect(await screen.findByText("No upcoming gigs yet")).toBeInTheDocument();
    expect(requestBody).toEqual({
      venue: "The Blue Door",
      date: "2026-10-18",
      pay: "$500",
      contact: "Jordan 555-0100",
      band_size: "trio",
      required_member_ids: [1],
      schedule: [{ label: "Load in", time: "18:00:00" }],
    });
  });

  it("associates the missing gig date validation message with its input", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("roadhouse.demo-session", JSON.stringify({ role: "manager" }));
    server.use(
      http.get(`${apiUrl}/gigs`, () => HttpResponse.json({
        items: [], total: 0, page: 1, page_size: 25,
      })),
      http.get(`${apiUrl}/members`, () => HttpResponse.json(memberRoster)),
    );

    renderGigs();
    await user.click(await screen.findByRole("button", { name: /book a gig/i }));
    await user.type(screen.getByRole("textbox", { name: "Venue" }), "The Blue Door");
    await user.type(screen.getByLabelText("Pay"), "$500");
    await user.type(screen.getByLabelText("Contact"), "Jordan 555-0100");
    await user.click(screen.getByRole("button", { name: "Book gig" }));

    expect(await screen.findByText("Date is required.")).toBeInTheDocument();
    expect(screen.getByLabelText("Date")).toHaveAttribute("aria-describedby", "gig-date-error");
    expect(screen.getByLabelText("Date")).toHaveAttribute("aria-invalid", "true");
  });

  it("retries a failed gig list request", async () => {
    const user = userEvent.setup();
    sessionStorage.setItem("roadhouse.demo-session", JSON.stringify({ role: "manager" }));
    let requests = 0;
    server.use(
      http.get(`${apiUrl}/gigs`, () => {
        requests += 1;
        if (requests === 1) {
          return HttpResponse.json(
            { code: "unavailable", detail: "Try again." },
            { status: 503 },
          );
        }
        return HttpResponse.json({ items: [], total: 0, page: 1, page_size: 25 });
      }),
    );

    renderGigs();
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByText("No upcoming gigs yet")).toBeInTheDocument();
    expect(requests).toBe(2);
  });
});