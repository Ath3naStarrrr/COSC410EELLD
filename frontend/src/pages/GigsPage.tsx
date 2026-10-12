import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  bookGig,
  errorMessage,
  loadGigs,
  loadMembers,
  readDemoSession,
  type GigCreate,
  type GigListItem,
} from "../api/client";

const scheduleLabels = ["Load in", "Soundcheck", "First set"];

function readableDate(date: string): { month: string; day: string; weekday: string } {
  const [year = "", month = "1", day = "1"] = date.split("-");
  const value = new Date(Number(year), Number(month) - 1, Number(day));
  return {
    month: value.toLocaleDateString("en-US", { month: "short" }).toUpperCase(),
    day,
    weekday: value.toLocaleDateString("en-US", { weekday: "short" }),
  };
}

function GigRow({ gig }: { gig: GigListItem }) {
  const date = readableDate(gig.date);
  const fullDetails = gig.visibility === "full";

  return (
    <article className={fullDetails ? "gig-row" : "gig-row gig-row-muted"}>
      <div className="gig-date" aria-label={gig.date}>
        <span>{date.month}</span>
        <strong>{date.day}</strong>
        <small>{date.weekday}</small>
      </div>
      <div className="gig-row-main">
        <div className="gig-row-title">
          {fullDetails ? (
            <Link to={`/gigs/${gig.id}`} className="gig-title-link">{gig.venue}</Link>
          ) : (
            <span className="gig-title-disabled" aria-disabled="true">{gig.venue}</span>
          )}
          <span className="status-tag">Booked</span>
        </div>
        <p>{fullDetails ? `${gig.band_size} band · ${gig.required_members.join(", ") || "No required members"}` : "Not assigned · details unavailable"}</p>
      </div>
      {fullDetails && (
        <div className="gig-row-meta">
          <span>{gig.schedule[0]?.time.slice(0, 5) ?? "Time TBD"}</span>
          <span>{gig.pay}</span>
        </div>
      )}
    </article>
  );
}

function BookGigDialog({ onClose }: { onClose: () => void }) {
  const session = readDemoSession();
  const queryClient = useQueryClient();
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: loadMembers });
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [formError, setFormError] = useState("");
  const mutation = useMutation({
    mutationFn: (payload: GigCreate) => {
      if (!session || session.role !== "manager") throw new Error("Manager role required.");
      return bookGig(session, payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gigs"] });
      onClose();
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");
    const form = new FormData(event.currentTarget);
    const timeItems = scheduleLabels.flatMap((label, index) => {
      const value = String(form.get(`schedule-${index}`) ?? "");
      return value ? [{ label, time: `${value}:00` }] : [];
    });
    const payload: GigCreate = {
      venue: String(form.get("venue") ?? "").trim(),
      date: String(form.get("date") ?? ""),
      pay: String(form.get("pay") ?? "").trim(),
      contact: String(form.get("contact") ?? "").trim(),
      band_size: String(form.get("band_size") ?? "full") as GigCreate["band_size"],
      required_member_ids: selectedMembers,
      schedule: timeItems,
    };
    if (!payload.date) {
      setFormError("Date is required.");
      return;
    }
    mutation.mutate(payload);
  }

  function toggleMember(memberId: number) {
    setSelectedMembers((selected) =>
      selected.includes(memberId)
        ? selected.filter((id) => id !== memberId)
        : [...selected, memberId],
    );
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title">
        <header className="dialog-header">
          <div><p className="eyebrow">New booking</p><h2 id="booking-title">Book a gig</h2></div>
          <button className="text-button" type="button" onClick={onClose}>Close</button>
        </header>
        <form onSubmit={submit}>
          <div className="form-grid">
            <div className="field-group span-two">
              <label htmlFor="venue">Venue</label>
              <input id="venue" name="venue" required maxLength={160} />
            </div>
            <div className="field-group">
              <label htmlFor="gig-date">Date</label>
              <input
                id="gig-date"
                name="date"
                type="date"
                aria-invalid={formError ? "true" : undefined}
                aria-describedby={formError ? "gig-date-error" : undefined}
                onChange={() => setFormError("")}
              />
              {formError && <span id="gig-date-error" className="field-error">{formError}</span>}
            </div>
            <div className="field-group">
              <label htmlFor="band-size">Band size</label>
              <select id="band-size" name="band_size" defaultValue="full">
                <option value="full">Full band</option><option value="trio">Trio</option><option value="duo">Duo</option>
              </select>
            </div>
            <div className="field-group">
              <label htmlFor="pay">Pay</label>
              <input id="pay" name="pay" required maxLength={160} placeholder="$500" />
            </div>
            <div className="field-group">
              <label htmlFor="contact">Contact</label>
              <input id="contact" name="contact" required maxLength={240} />
            </div>
          </div>
          <fieldset className="form-fieldset">
            <legend>Schedule</legend>
            <div className="schedule-inputs">
              {scheduleLabels.map((label, index) => (
                <div className="field-group" key={label}>
                  <label htmlFor={`schedule-${index}`}>{label}</label>
                  <input id={`schedule-${index}`} name={`schedule-${index}`} type="time" />
                </div>
              ))}
            </div>
          </fieldset>
          <fieldset className="form-fieldset">
            <legend>Required members <span className="optional-label">Optional</span></legend>
            {membersQuery.isPending ? <p>Loading band members…</p> : null}
            {membersQuery.isError && (
              <p className="field-error" role="alert">Could not load members. <button type="button" onClick={() => void membersQuery.refetch()}>Retry</button></p>
            )}
            <div className="member-options">
              {membersQuery.data?.items.map((member) => (
                <label className="checkbox-option" key={member.id}>
                  <input type="checkbox" checked={selectedMembers.includes(member.id)} onChange={() => toggleMember(member.id)} />
                  {member.name}
                </label>
              ))}
            </div>
          </fieldset>
          {mutation.isError && <p className="form-error" role="alert">{errorMessage(mutation.error, "Could not book this gig.")}</p>}
          <footer className="dialog-actions">
            <button className="text-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button compact-button" type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Booking…" : "Book gig"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}

export default function GigsPage() {
  const session = readDemoSession();
  const navigate = useNavigate();
  const [showBooking, setShowBooking] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"date" | "-date" | "venue" | "-venue">("date");
  const [page, setPage] = useState(1);
  const gigsQuery = useQuery({
    queryKey: ["gigs", session, query, sort, page],
    queryFn: () => session ? loadGigs(session, query, sort, page) : Promise.reject(new Error("Sign in first.")),
    enabled: session !== null,
  });

  function signOut() {
    sessionStorage.removeItem("roadhouse.demo-session");
    navigate("/");
  }

  const gigs = gigsQuery.data?.items ?? [];

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="app-wordmark" to="/gigs">ROADHOUSE<span> / BAND OFFICE</span></Link>
        <div className="header-account">
          <span>{session?.role === "manager" ? "Band manager" : session?.memberName}</span>
          <button className="text-button" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <section className="page-content">
        <div className="page-heading">
          <div><p className="eyebrow">Your calendar</p><h1>Upcoming gigs</h1><p>Booked dates, details, and who's on the bill.</p></div>
          {session?.role === "manager" && <button className="primary-button new-gig-button" type="button" onClick={() => setShowBooking(true)}>＋ <span>Book a gig</span></button>}
        </div>
        <div className="list-toolbar">
          <label className="search-field">
            <span className="visually-hidden">Search venues</span>
            <span aria-hidden="true">⌕</span>
            <input type="search" placeholder="Search venues" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
          </label>
          <label className="sort-control">Sort by
            <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)}>
              <option value="date">Date, soonest</option><option value="-date">Date, latest</option><option value="venue">Venue, A–Z</option><option value="-venue">Venue, Z–A</option>
            </select>
          </label>
        </div>
        {gigsQuery.isPending && <div className="state-message" role="status">Loading upcoming gigs…</div>}
        {gigsQuery.isError && (
          <div className="state-message error-state" role="alert"><p>Gigs could not be loaded.</p><button className="text-button" type="button" onClick={() => void gigsQuery.refetch()}>Retry</button></div>
        )}
        {gigsQuery.isSuccess && gigs.length === 0 && (
          <div className="empty-state"><p className="eyebrow">Nothing on the calendar</p><h2>No upcoming gigs yet</h2><p>Booked dates will show up here.</p>{session?.role === "manager" && <button className="primary-button compact-button" type="button" onClick={() => setShowBooking(true)}>Book the first gig</button>}</div>
        )}
        {gigsQuery.isSuccess && gigs.length > 0 && (
          <section className="gig-list" aria-label="Upcoming gigs">
            <div className="list-label"><span>{gigsQuery.data.total} booked {gigsQuery.data.total === 1 ? "date" : "dates"}</span><span>Upcoming</span></div>
            {gigs.map((gig) => <GigRow key={gig.id} gig={gig} />)}
            <div className="pagination">
              <span>Page {gigsQuery.data.page} of {Math.max(1, Math.ceil(gigsQuery.data.total / gigsQuery.data.page_size))}</span>
              <div>
                <button className="text-button" type="button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page === 1}>Previous</button>
                <button className="text-button" type="button" onClick={() => setPage((value) => value + 1)} disabled={page * gigsQuery.data.page_size >= gigsQuery.data.total}>Next</button>
              </div>
            </div>
          </section>
        )}
      </section>
      {showBooking && <BookGigDialog onClose={() => setShowBooking(false)} />}
    </main>
  );
}