import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { loadMembers, saveDemoSession } from "../api/client";

type DemoRole = "manager" | "member";

export default function LoginPage() {
  const [role, setRole] = useState<DemoRole>("manager");
  const [memberId, setMemberId] = useState(1);
  const navigate = useNavigate();
  const membersQuery = useQuery({ queryKey: ["members"], queryFn: loadMembers });
  const members = membersQuery.data?.items ?? [];

  function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (role === "manager") {
      saveDemoSession({ role: "manager" });
    } else {
      const member = members.find((item) => item.id === memberId);
      if (!member) return;
      saveDemoSession({
        role: "member",
        memberId: member.id,
        memberName: member.name,
      });
    }
    navigate("/gigs");
  }

  return (
    <main className="login-shell">
      <section className="login-art" aria-label="Roadhouse band scheduling">
        <p className="wordmark">ROADHOUSE</p>
        <div className="art-copy">
          <p className="eyebrow">The band, in tune</p>
          <h1>Every gig starts with getting together.</h1>
          <p>One place for the nights you play and the people you play them with.</p>
        </div>
        <span className="art-note" aria-hidden="true">RH / 01</span>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to Roadhouse</h2>
          <p className="login-description">Choose your demo role to continue.</p>
          <form onSubmit={signIn}>
            <fieldset className="role-picker">
              <legend>Your role</legend>
              <label className={role === "manager" ? "role-option selected" : "role-option"}>
                <input
                  type="radio"
                  name="role"
                  value="manager"
                  checked={role === "manager"}
                  onChange={() => setRole("manager")}
                />
                <span>Band manager</span>
              </label>
              <label className={role === "member" ? "role-option selected" : "role-option"}>
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={role === "member"}
                  onChange={() => setRole("member")}
                />
                <span>Band member</span>
              </label>
            </fieldset>
            {role === "member" && (
              <div className="field-group">
                <label htmlFor="member-profile">Member profile</label>
                {membersQuery.isPending && <p role="status">Loading member profiles…</p>}
                <select
                  id="member-profile"
                  value={memberId}
                  onChange={(event) => setMemberId(Number(event.target.value))}
                  disabled={membersQuery.isPending || members.length === 0}
                >
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
                {membersQuery.isError && (
                  <p className="field-error" role="alert">
                    Could not load member profiles. <button type="button" onClick={() => void membersQuery.refetch()}>Retry</button>
                  </p>
                )}
              </div>
            )}
            <button className="primary-button" type="submit" disabled={role === "member" && members.length === 0}>
              Continue as {role === "manager" ? "manager" : "member"}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="demo-note">Demo access · no password required</p>
        </div>
        <footer>© 2026 Roadhouse</footer>
      </section>
    </main>
  );
}