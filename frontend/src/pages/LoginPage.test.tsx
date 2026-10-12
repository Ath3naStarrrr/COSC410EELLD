import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";

import LoginPage from "./LoginPage";
import { server } from "../test/server";

describe("demo login", () => {
  it("lets a band member choose a profile and continue", async () => {
    const user = userEvent.setup();
    server.use(
      http.get("http://localhost:8000/api/v1/members", () => HttpResponse.json({
        items: [{ id: 1, name: "Riley Keys" }],
        total: 1,
        page: 1,
        page_size: 100,
      })),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes>
            <Route path="/" element={<LoginPage />} />
            <Route path="/gigs" element={<h1>Upcoming gigs</h1>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await user.click(screen.getByRole("radio", { name: "Band member" }));
    await user.selectOptions(await screen.findByLabelText("Member profile"), "1");
    await user.click(screen.getByRole("button", { name: "Continue as member" }));

    expect(await screen.findByRole("heading", { name: "Upcoming gigs" })).toBeInTheDocument();
    expect(JSON.parse(sessionStorage.getItem("roadhouse.demo-session") ?? "null")).toEqual({
      role: "member",
      memberId: 1,
      memberName: "Riley Keys",
    });
  });

  it("shows a loading state and lets the member retry profile loading", async () => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(
      http.get("http://localhost:8000/api/v1/members", () => {
        requests += 1;
        if (requests === 1) {
          return delay(150).then(() => HttpResponse.json(
            { code: "unavailable", detail: "Try again." },
            { status: 503 },
          ));
        }
        return HttpResponse.json({
          items: [{ id: 1, name: "Riley Keys" }],
          total: 1,
          page: 1,
          page_size: 100,
        });
      }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/"]}>
          <Routes><Route path="/" element={<LoginPage />} /></Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("radio", { name: "Band member" }));
    expect(screen.getByRole("status")).toHaveTextContent("Loading member profiles");
    await screen.findByRole("alert");
    await user.click(screen.getByRole("button", { name: "Retry" }));

    expect(await screen.findByLabelText("Member profile")).toHaveValue("1");
    expect(requests).toBe(2);
  });
});