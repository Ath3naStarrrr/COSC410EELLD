class UnknownMembersError(Exception):
    def __init__(self, member_ids: set[int]) -> None:
        self.member_ids = member_ids
        super().__init__(f"Unknown member IDs: {sorted(member_ids)}")


class GigNotVisibleError(Exception):
    pass
