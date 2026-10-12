import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import { loadGig, readDemoSession } from "../api/client";

function displayDate(date: string): string {
  const [year = "", month = "1", day = "1"] = date.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day)).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );
}

export default function GigDetailPage() {
  const session = readDemoSession();
  const { gigId } = useParams();
  const parsedGigId = Number(gigId);
  const gigQuery = useQuery({
    queryKey: ["gig", parsedGigId, session],
    queryFn: () => {
      if (!session || !Number.isInteger(parsedGigId)) {
        return Promise.reject(new Error("This gig could not be found."));
      }
      return loadGig(session, parsedGigId);
    },
    enabled: session !== null && Number.isInteger(parsedGigId),
  });

  if (gigQuery.isPending) {
    return <main className="app-shell"><div className="state-message" role="status">Loading gig details…</div></main>;
  }

  if (gigQuery.isError || !gigQuery.data) {
    return (
      <main className="app-shell">
        <div className="page-content detail-error">
          <Link className="back-link" to="/gigs">← All gigs</Link>
          <div className="state-message error-state" role="alert">
            <h1>Gig details unavailable</h1>
            <p>This gig may not be assigned to your member profile.</p>
            <button className="text-button" type="button" onClick={() => void gigQuery.refetch()}>Retry</button>
          </div>
        </div>
      </main>
    );
  }

  const gig = gigQuery.data;

  return (
    <main className="app-shell">
      <header className="app-header">
        <Link className="app-wordmark" to="/gigs">ROADHOUSE<span> / BAND OFFICE</span></Link>
        <span className="account-label">{session?.role === "manager" ? "Band manager" : session?.memberName}</span>
      </header>
      <article className="page-content detail-page">
        <Link className="back-link" to="/gigs">← All gigs</Link>
        <div className="detail-heading">
          <div>
            <p className="eyebrow">Booked · {gig.band_size} band</p>
            <h1>{gig.venue}</h1>
            <p className="detail-date">{displayDate(gig.date)}</p>
          </div>
          <span className="status-tag large-tag">Booked</span>
        </div>
        <section className="schedule-section" aria-labelledby="schedule-title">
          <div className="section-heading"><div><p className="eyebrow">Show day</p><h2 id="schedule-title">Schedule</h2></div><span>{gig.schedule.length} stops</span></div>
          {gig.schedule.length > 0 ? (
            <ol className="timeline">
              {gig.schedule.map((item, index) => (
                <li className="timeline-item" key={`${item.label}-${item.time}`}>
                  <span className="timeline-marker" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <span className="timeline-label">{item.label}</span>
                  <time className="timeline-time">{item.time.slice(0, 5)}</time>
                </li>
              ))}
            </ol>
          ) : <p className="detail-date">Schedule times haven’t been added yet.</p>}
        </section>
        <section className="details-grid" aria-label="Gig information">
          <div className="detail-cell"><span>Pay</span><strong>{gig.pay}</strong></div>
          <div className="detail-cell"><span>Contact</span><strong>{gig.contact}</strong></div>
          <div className="detail-cell"><span>Band size</span><strong>{gig.band_size}</strong></div>
          <div className="detail-cell"><span>Required members</span><strong>{gig.required_members.join(", ") || "None selected"}</strong></div>
        </section>
      </article>
    </main>
  );
}