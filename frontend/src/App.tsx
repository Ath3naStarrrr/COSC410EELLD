import { useState } from "react";

type DemoRole = "manager" | "member";

export default function App() {
  const [role, setRole] = useState<DemoRole>("manager");

  return (
    <main className="login-shell">
      <section className="login-art" aria-label="Roadhouse band scheduling">
        <p className="wordmark">ROADHOUSE</p>
        <div className="art-copy">
          <p className="eyebrow">The band, in tune</p>
          <h1>Every gig starts with getting together.</h1>
          <p>One place for the nights you play and the people you play them with.</p>
        </div>
        <span className="art-note" aria-hidden="true">
          RH / 01
        </span>
      </section>
      <section className="login-panel">
        <div className="login-content">
          <p className="eyebrow">Welcome back</p>
          <h2>Sign in to Roadhouse</h2>
          <p className="login-description">Choose your demo role to continue.</p>
          <form onSubmit={(event) => event.preventDefault()}>
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
            <button className="primary-button" type="submit">
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