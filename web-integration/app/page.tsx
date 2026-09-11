"use client";

import { useState } from "react";

type MediaItem = { title: string; type: "Movie" | "Series" | "Live"; image: string };
type MediaRail = { title: string; items: MediaItem[] };

const posterImages = [
  "https://image.tmdb.org/t/p/w780/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
  "https://image.tmdb.org/t/p/w780/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg",
  "https://image.tmdb.org/t/p/w780/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
  "https://image.tmdb.org/t/p/w780/AnsSKRgpJQFZqnI2d9lZMjY9Sem.jpg",
  "https://image.tmdb.org/t/p/w780/74xTEgt7R36Fpooo50r9T25onhq.jpg",
  "https://image.tmdb.org/t/p/w780/khZqmwHQicTYoS7Flreb9EddFZC.jpg",
  "https://image.tmdb.org/t/p/w780/dmo6TYuuJgaYinXBPjrgG9mB5od.jpg",
  "https://image.tmdb.org/t/p/w780/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "https://image.tmdb.org/t/p/w780/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg",
  "https://image.tmdb.org/t/p/w780/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
];

const rails: MediaRail[] = [
  {
    title: "Trending now",
    items: ["Dune: Part Two", "The Wild Robot", "Civil War", "Fallout", "The Batman"].map((title, index) => ({ title, type: index === 3 ? "Series" : "Movie", image: posterImages[index] })),
  },
  {
    title: "Continue watching",
    items: ["Andor", "The Last of Us", "Oppenheimer", "Arrival"].map((title, index) => ({ title, type: index < 2 ? "Series" : "Movie", image: posterImages[index + 5] })),
  },
  {
    title: "StreamNet picks",
    items: ["Interstellar", "The Creator", "Blade Runner 2049", "Nope", "The Archive"].map((title, index) => ({ title, type: "Movie", image: posterImages[(index + 8) % posterImages.length] })),
  },
];

export default function HomePage() {
  const [section, setSection] = useState("Home");
  const [search, setSearch] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const visibleRails = search.trim()
    ? rails.map((rail) => ({ ...rail, items: rail.items.filter((item) => item.title.toLowerCase().includes(search.toLowerCase())) })).filter((rail) => rail.items.length)
    : rails;

  return (
    <main className="player-shell">
      <header className="player-nav">
        <button className="brand-lockup" onClick={() => setSection("Home")} aria-label="Go home"><img src="/streamnet-logo.svg" alt="StreamNet" className="brand-logo" /></button>
        <nav className="desktop-nav" aria-label="Primary navigation">{["Home", "Search", "Library", "TV"].map((item) => <button key={item} className={section === item ? "nav-link active" : "nav-link"} onClick={() => setSection(item)}>{item}</button>)}</nav>
        <div className="nav-actions"><button className="nav-link" onClick={() => setShowLogin(true)}>Sign in</button><button className="avatar" onClick={() => setShowLogin(true)} aria-label="Account">?</button></div>
      </header>

      {section === "Search" ? (
        <section className="search-view"><div className="section-heading"><span className="eyebrow">Library search</span><h1>Find something to watch.</h1></div><input autoFocus className="search-input" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search movies, series, and channels" /><MediaRails rows={visibleRails} /></section>
      ) : section === "Library" ? (
        <section className="search-view"><div className="section-heading"><span className="eyebrow">Your library</span><h1>Saved for later.</h1></div><MediaRails rows={[rails[1], rails[2]]} /></section>
      ) : section === "TV" ? (
        <section className="search-view"><div className="section-heading"><span className="eyebrow">Live television</span><h1>What&apos;s on now.</h1></div><MediaRails rows={[{ title: "Live channels", items: rails[0].items.slice(0, 4).map((item) => ({ ...item, type: "Live" })) }]} /></section>
      ) : (
        <>
          <section className="hero-stage"><div className="hero-copy"><span className="eyebrow">StreamNet original collection</span><h1>Stories that stay with you.</h1><p>Pick up where you left off across your devices with your self-hosted StreamNet account and CloudSync.</p><div className="hero-actions"><button className="primary-action" onClick={() => setShowLogin(true)}>Sign in to watch</button><button className="secondary-action" onClick={() => setSection("Library")}>Browse library</button></div></div><div className="hero-art" aria-hidden="true"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-signal">STREAM<br />NET</div></div></section>
          <MediaRails rows={rails} />
        </>
      )}

      <nav className="mobile-nav" aria-label="Mobile navigation">{["Home", "Search", "Library", "TV"].map((item) => <button key={item} className={section === item ? "active" : ""} onClick={() => setSection(item)}>{item}</button>)}</nav>
      {showLogin && <div className="modal-backdrop" onClick={() => setShowLogin(false)}><section className="login-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setShowLogin(false)} aria-label="Close">×</button><span className="eyebrow">StreamNet CloudSync</span><h2>Welcome back.</h2><p>Sign in through your self-hosted StreamNet backend to sync profiles, progress, and library settings.</p><button className="primary-action full" onClick={() => setShowLogin(false)}>Continue to sign in</button><small>Backend: auth.mystreamnet.club</small></section></div>}
    </main>
  );
}

function MediaRails({ rows }: { rows: MediaRail[] }) {
  return (
    <div className="rails">
      {rows.map((rail) => (
        <section className="rail" key={rail.title}>
              <div className="rail-heading">
            <h2>{rail.title}</h2>
            <button type="button">See all</button>
          </div>
          <div className="media-grid">
            {rail.items.map((item, index) => (
              <button className="media-card" key={item.title} type="button" aria-label={`Open ${item.title}`}>
                <span
                  className={`poster poster-${(index % 5) + 1}`}
                  style={{
                    backgroundImage: `linear-gradient(180deg, transparent 42%, rgba(0,0,0,.85) 100%), url(${item.image})`,
                  }}
                >
                  <span className="poster-title">{item.title}</span>
                </span>
                <span className="media-title">{item.title}</span>
                <span className="media-meta">{item.type} · 2026</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
  }
