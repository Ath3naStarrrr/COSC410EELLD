# Decisions

## 2026-10-09: Demo role selection is not authentication

The first sprint uses a role picker and session-scoped browser state with demo headers, rather than credential-based accounts. This keeps the login entry flow demonstrable without introducing an auth provider or JWT dependency. The backend currently trusts these demo headers; this is not suitable for deployment with real users or private data.

## 2026-10-09: Required members also define gig-detail access

The manager-selected required member list is the assignment list for this sprint. Assigned members receive full gig details. Other members receive only venue and date in list results and receive 404 for a direct detail request. Separate staffing and visibility assignments are not modeled.

## 2026-10-09: Pay is text for the first sprint

Pay is stored as a string because currency, split, and compensation semantics have not been specified. A numeric amount or structured currency object would assume rules not present in the stories.

## 2026-10-09: Booking creates a booked gig

The manager's Book action creates a booked gig directly. Prospect and first-contact tracking belong to the separately prioritized booking pipeline and are not inferred for this gig slice.

## 2026-10-09: Manager's gig list can be searched and sorted

Gig lists use the shared query, whitelisted sort, page, and page-size contract. The default order is ascending date so upcoming gigs appear chronologically.

## 2026-10-09: Strict typing uses SQLAlchemy's native annotations

The legacy SQLAlchemy mypy plugin is not present in the resolved current SQLAlchemy 2.1 release. The app uses typed declarative mappings and strict mypy without that plugin rather than pinning the ORM to an older minor release solely for a removed plugin.
