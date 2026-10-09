from enum import StrEnum


class BandSize(StrEnum):
    FULL = "full"
    DUO = "duo"
    TRIO = "trio"


class GigStatus(StrEnum):
    BOOKED = "booked"
