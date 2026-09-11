"use client";

import { Bookmark, Home, Search, Settings, Tv } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { ProfileAvatarVisual } from "@/components/profile/ProfileAvatar";
import type { NavSection } from "@/lib/types";
import { localize, t } from "@/lib/i18n";

const nav = [
  { id: "home", icon: Home },
  { id: "search", icon: Search },
  { id: "watchlist", icon: Bookmark },
  { id: "tv", icon: Tv },
] satisfies Array<{ id: NavSection; icon: typeof Home }>;

export function TopNav() {
  const {
    view,
    section,
    setSection,
    switchProfile,
    activeProfile,
    avatarImages,
    settings,
    closeDetails,
    selected,
  } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const labels = {
    home: t(settings.uiLanguage, "home"),
    search: t(settings.uiLanguage, "search"),
    watchlist: t(settings.uiLanguage, "library"),
    tv: t(settings.uiLanguage, "liveTv"),
  };
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Desktop/Tablet Sidebar / TopNav */}
      <aside
        className={`sidebar ${scrolled ? "is-scrolled" : ""}`}
        aria-label={localize(
          settings.uiLanguage,
          "StreamNet-Navigation",
          "StreamNet navigation",
        )}
      >
        <div className="profile-cluster">
          <button
            type="button"
            className="brand"
            onClick={switchProfile}
            aria-label={localize(
              settings.uiLanguage,
              "Profil wechseln",
              "Switch profile",
            )}
          >
            {activeProfile ? (
              <ProfileAvatarVisual
                profile={activeProfile}
                avatarImages={avatarImages}
              />
            ) : (
              <img src="/streamnet-icon.svg" alt="StreamNet" />
            )}
          </button>
          <span className="profile-name-text">{activeProfile?.name ?? ""}</span>
        </div>
        <nav>
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`nav-item ${!selected && section === item.id ? "is-active" : ""}`}
                onClick={() => {
                  closeDetails();
                  setSection(item.id);
                }}
              >
                <Icon size={22} />
                <span>{labels[item.id]}</span>
              </button>
            );
          })}
        </nav>
        <div className="top-right">
          <button
            type="button"
            className={`settings-gear ${!selected && section === "settings" ? "is-active" : ""}`}
            onClick={() => {
              closeDetails();
              setSection("settings");
            }}
            aria-label={t(settings.uiLanguage, "settings")}
          >
            <Settings size={26} />
          </button>
        </div>
      </aside>

      {/* Mobile Top Header (screen <= 680px) */}
      <header className={`mobile-header ${scrolled ? "is-scrolled" : ""}`}>
        <div className="mobile-brand">
          <img
            src="/streamnet-wordmark.svg"
            alt="StreamNet"
            className="mobile-wordmark"
          />
        </div>
        <div className="mobile-header-actions">
          <button
            type="button"
            className={`mobile-profile-btn ${!selected && view === "profiles" ? "is-active" : ""}`}
            onClick={switchProfile}
            aria-label={localize(
              settings.uiLanguage,
              "Profil wechseln",
              "Switch profile",
            )}
          >
            <div className="mobile-avatar-container">
              {activeProfile ? (
                <ProfileAvatarVisual
                  profile={activeProfile}
                  avatarImages={avatarImages}
                />
              ) : (
                <img src="/streamnet-icon.svg" alt="StreamNet" />
              )}
            </div>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation (screen <= 680px) */}
      <nav
        className="mobile-bottom-nav"
        aria-label={localize(
          settings.uiLanguage,
          "Mobile Navigation",
          "Mobile navigation",
        )}
      >
        {nav.map((item) => {
          const Icon = item.icon;
          return (
            <button
              type="button"
              key={item.id}
              className={`mobile-nav-item ${!selected && section === item.id ? "is-active" : ""}`}
              onClick={() => {
                closeDetails();
                setSection(item.id);
              }}
            >
              <Icon size={22} />
              <span>{labels[item.id]}</span>
            </button>
          );
        })}
        {/* Settings tab at bottom right */}
        <button
          type="button"
          className={`mobile-nav-item ${!selected && section === "settings" ? "is-active" : ""}`}
          onClick={() => {
            closeDetails();
            setSection("settings");
          }}
          aria-label={t(settings.uiLanguage, "settings")}
        >
          <Settings size={22} />
          <span>{t(settings.uiLanguage, "settings")}</span>
        </button>
      </nav>
    </>
  );
}
