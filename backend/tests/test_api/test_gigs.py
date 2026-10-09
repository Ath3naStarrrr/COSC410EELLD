import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


def gig_payload(
    venue: str,
    date: str,
    required_member_ids: list[int],
) -> dict[str, object]:
    return {
        "venue": venue,
        "date": date,
        "pay": "$500",
        "contact": "Jordan, 555-0100",
        "band_size": "trio",
        "required_member_ids": required_member_ids,
        "schedule": [
            {"label": "Load in", "time": "18:00:00"},
            {"label": "Soundcheck", "time": "18:45:00"},
            {"label": "First set", "time": "20:00:00"},
        ],
    }


async def create_gig(
    client: AsyncClient,
    manager_headers: dict[str, str],
    payload: dict[str, object],
) -> dict[str, object]:
    response = await client.post(
        "/api/v1/gigs", headers=manager_headers, json=payload
    )
    assert response.status_code == 201
    return response.json()


async def test_manager_creates_booked_gig_with_ordered_schedule(
    client: AsyncClient, manager_headers: dict[str, str]
) -> None:
    response = await client.post(
        "/api/v1/gigs",
        headers=manager_headers,
        json=gig_payload("The Blue Door", "2026-10-18", [1]),
    )

    assert response.status_code == 201
    assert response.headers["location"].endswith("/api/v1/gigs/1")
    body = response.json()
    assert body["status"] == "booked"
    assert body["venue"] == "The Blue Door"
    assert [item["label"] for item in body["schedule"]] == [
        "Load in",
        "Soundcheck",
        "First set",
    ]
    assert [item["time"] for item in body["schedule"]] == [
        "18:00:00",
        "18:45:00",
        "20:00:00",
    ]


async def test_gig_date_is_required_and_uses_error_envelope(
    client: AsyncClient, manager_headers: dict[str, str]
) -> None:
    payload = gig_payload("The Blue Door", "2026-10-18", [1])
    del payload["date"]

    response = await client.post(
        "/api/v1/gigs", headers=manager_headers, json=payload
    )

    assert response.status_code == 422
    assert response.json() == {
        "code": "validation_error",
        "detail": "Check the request fields.",
    }


async def test_gigs_are_sorted_and_private_fields_are_omitted_for_unassigned_members(
    client: AsyncClient, manager_headers: dict[str, str], member_headers: dict[str, str]
) -> None:
    await create_gig(
        client,
        manager_headers,
        gig_payload("Hub City Tap", "2026-11-02", [2]),
    )
    await create_gig(
        client,
        manager_headers,
        gig_payload("The Blue Door", "2026-10-18", [1]),
    )

    response = await client.get("/api/v1/gigs", headers=member_headers)

    assert response.status_code == 200
    body = response.json()
    assert [item["venue"] for item in body["items"]] == [
        "The Blue Door",
        "Hub City Tap",
    ]
    assigned_gig, unassigned_gig = body["items"]
    assert assigned_gig["visibility"] == "full"
    assert assigned_gig["pay"] == "$500"
    assert assigned_gig["contact"] == "Jordan, 555-0100"
    assert unassigned_gig == {
        "id": 1,
        "venue": "Hub City Tap",
        "date": "2026-11-02",
        "visibility": "summary",
    }


async def test_unassigned_member_cannot_read_gig_details(
    client: AsyncClient, manager_headers: dict[str, str], member_headers: dict[str, str]
) -> None:
    await create_gig(
        client,
        manager_headers,
        gig_payload("Hub City Tap", "2026-11-02", [2]),
    )

    response = await client.get("/api/v1/gigs/1", headers=member_headers)

    assert response.status_code == 404
    assert response.json()["code"] == "not_found"


async def test_member_list_supports_pagination_envelope(client: AsyncClient) -> None:
    response = await client.get(
        "/api/v1/members", params={"page": 1, "page_size": 1}
    )

    assert response.status_code == 200
    assert response.json() == {
        "items": [{"id": 1, "name": "Band Member 1"}],
        "total": 3,
        "page": 1,
        "page_size": 1,
    }
