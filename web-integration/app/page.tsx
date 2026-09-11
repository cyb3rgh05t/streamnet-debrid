"use client";

import { useState } from "react";

const rails = [
  {
    title: "Trending now",
    items: [
      "The Last Horizon",
      "Signal Lost",
      "Night Shift",
      "Deep Current",
      "Parallel",
    ],
  },
  {
    title: "Continue watching",
    items: ["The Archive", "Orbit Seven", "The Long Way Home", "Afterlight"],
  },
  {
    title: "StreamNet picks",
    items: [
      "Northbound",
      "Glass House",
      "Red Meridian",
      "Static Bloom",
      "Zero Hour",
    ],
  },
];

export default function HomePage() {
  const [section, setSection] = useState("Home");
  const [search, setSearch] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const visibleRails = search.trim()
    ? rails
        .map((rail) => ({
          ...rail,
          items: rail.items.filter((item) =>
            item.toLowerCase().includes(search.toLowerCase()),
          ),
        }))
        .filter((rail) => rail.items.length)
    : rails;

  return (
    <main className="player-shell">
      <header className="player-nav">
        <button
          className="brand-lockup"
          onClick={() => setSection("Home")}
          aria-label="Go home"
        >
          <span className="brand-mark">S</span>
          <span>STREAMNET</span>
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {["Home", "Search", "Library", "TV"].map((item) => (
            <button
              key={item}
              className={section === item ? "nav-link active" : "nav-link"}
              onClick={() => setSection(item)}
            >
              {item}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button className="nav-link" onClick={() => setShowLogin(true)}>
            Sign in
          </button>
          <button
            className="avatar"
            onClick={() => setShowLogin(true)}
            aria-label="Account"
          >
            ?
          </button>
        </div>
      </header>

      {section === "Search" ? (
        <section className="search-view">
          <div className="section-heading">
            <span className="eyebrow">Library search</span>
            <h1>Find something to watch.</h1>
          </div>
          <input
            autoFocus
            className="search-input"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search movies, series, and channels"
          />
          <MediaRails rows={visibleRails} />
        </section>
      ) : section === "Library" ? (
        <section className="search-view">
          <div className="section-heading">
            <span className="eyebrow">Your library</span>
            <h1>Saved for later.</h1>
          </div>
          <MediaRails rows={[rails[1], rails[2]]} />
        </section>
      ) : section === "TV" ? (
        <section className="search-view">
          <div className="section-heading">
            <span className="eyebrow">Live television</span>
            <h1>What&apos;s on now.</h1>
          </div>
          <MediaRails
            rows={[
              {
                title: "Live channels",
                items: [
                  "StreamNet One",
                  "StreamNet News",
                  "World Cinema",
                  "Live Sports",
                  "Documentary",
                ],
              },
            ]}
          />
        </section>
      ) : (
        <>
          <section className="hero-stage">
            <div className="hero-copy">
              <span className="eyebrow">StreamNet original collection</span>
              <h1>Stories that stay with you.</h1>
              <p>
                Pick up where you left off across your devices with your
                self-hosted StreamNet account and CloudSync.
              </p>
              <div className="hero-actions">
                <button
                  className="primary-action"
                  onClick={() => setShowLogin(true)}
                >
                  Sign in to watch
                </button>
                <button
                  className="secondary-action"
                  onClick={() => setSection("Library")}
                >
                  Browse library
                </button>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <div className="art-orbit orbit-one" />
              <div className="art-orbit orbit-two" />
              <div className="art-signal">
                STREAM
                <br />
                NET
              </div>
            </div>
          </section>
          <MediaRails rows={rails} />
        </>
      )}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {["Home", "Search", "Library", "TV"].map((item) => (
          <button
            key={item}
            className={section === item ? "active" : ""}
            onClick={() => setSection(item)}
          >
            {item}
          </button>
        ))}
      </nav>
      {showLogin && (
        <div className="modal-backdrop" onClick={() => setShowLogin(false)}>
          <section
            className="login-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowLogin(false)}
              aria-label="Close"
            >
              ×
            </button>
            <span className="eyebrow">StreamNet CloudSync</span>
            <h2>Welcome back.</h2>
            <p>
              Sign in through your self-hosted StreamNet backend to sync
              profiles, progress, and library settings.
            </p>
            <button
              className="primary-action full"
              onClick={() => setShowLogin(false)}
            >
              Continue to sign in
            </button>
            <small>Backend: auth.mystreamnet.club</small>
          </section>
        </div>
      )}
    </main>
  );
}

function MediaRails({ rows }: { rows: typeof rails }) {
  return (
    <div className="rails">
      {rows.map((rail) => (
        <section className="rail" key={rail.title}>
          <div className="rail-heading">
            <h2>{rail.title}</h2>
            <button>See all</button>
          </div>
          <div className="media-grid">
            {rail.items.map((item, index) => (
              <button className="media-card" key={item}>
                <span className={`poster poster-${(index % 5) + 1}`}>
                  <span className="poster-title">{item}</span>
                </span>
                <span className="media-title">{item}</span>
                <span className="media-meta">
                  {index % 2 ? "Series" : "Movie"} · 2026
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
