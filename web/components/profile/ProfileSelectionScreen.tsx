"use client";

import { Cloud, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { accentColor } from "@/lib/accent";
import type { Profile } from "@/lib/types";
import { ProfileAvatarVisual } from "./ProfileAvatar";
import { ProfileDialog } from "./ProfileDialog";
import { PinDialog } from "./PinDialog";
import { t } from "@/lib/i18n";

export function ProfileSelectionScreen() {
  const {
    profiles,
    avatarImages,
    manageMode,
    setManageMode,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
    goToLogin,
    auth,
    settings,
  } = useApp();

  const [dialog, setDialog] = useState<{
    mode: "add" | "edit";
    profile?: Profile;
  } | null>(null);
  const [openingProfileId, setOpeningProfileId] = useState<string | null>(null);
  const [lockedProfile, setLockedProfile] = useState<Profile | null>(null);

  const openProfile = (profile: Profile, pin?: string) => {
    if (profile.isLocked && profile.pin && !pin) {
      setLockedProfile(profile);
      return;
    }
    if (manageMode) {
      setDialog({ mode: "edit", profile });
      return;
    }
    setOpeningProfileId(profile.id);
    void selectProfile(profile, pin).finally(() => setOpeningProfileId(null));
  };

  return (
    <main
      className={`profile-shell accent-${settings.accentColor}`}
      style={{ ["--accent" as string]: accentColor(settings.accentColor) }}
    >
      <div className="profile-center">
        <div className="profile-brand-lockup">
          <img
            className="profile-wordmark"
            src="/streamnet-wordmark.svg"
            alt="StreamNet"
          />
        </div>
        <h1 className="profile-heading">
          {manageMode
            ? t(settings.uiLanguage, "manageProfiles")
            : settings.uiLanguage === "de"
              ? "Wer schaut gerade?"
              : "Who's watching?"}
        </h1>

        <div className="profile-row">
          {profiles.map((profile) => (
            <button
              type="button"
              key={profile.id}
              className="profile-pick"
              onClick={() => openProfile(profile)}
              aria-busy={openingProfileId === profile.id}
            >
              <div className="avatar-tile">
                <ProfileAvatarVisual
                  profile={profile}
                  avatarImages={avatarImages}
                />
                {manageMode && (
                  <div className="avatar-edit-overlay">
                    <Pencil size={26} />
                  </div>
                )}
              </div>
              <span>
                {openingProfileId === profile.id
                  ? settings.uiLanguage === "de"
                    ? "Wird geöffnet ..."
                    : "Opening ..."
                  : profile.name}
              </span>
            </button>
          ))}

          {profiles.length < 5 && (
            <button
              type="button"
              className="profile-pick"
              onClick={() => setDialog({ mode: "add" })}
            >
              <div className="avatar-tile add">
                <Plus size={48} />
              </div>
              <span>{t(settings.uiLanguage, "addProfile")}</span>
            </button>
          )}
        </div>

        <button
          type="button"
          className="manage-profiles-btn"
          onClick={() => setManageMode(!manageMode)}
        >
          {manageMode
            ? t(settings.uiLanguage, "done")
            : t(settings.uiLanguage, "manageProfiles")}
        </button>

        {!auth && (
          <button
            type="button"
            className="cloud-connect-btn"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              goToLogin();
            }}
          >
            <Cloud size={18} /> {t(settings.uiLanguage, "cloudConnect")}
          </button>
        )}
      </div>

      {lockedProfile && (
        <PinDialog
          profile={lockedProfile}
          onClose={() => setLockedProfile(null)}
          onUnlock={(pin) => {
            openProfile(lockedProfile, pin);
            setLockedProfile(null);
          }}
        />
      )}
      {dialog && (
        <ProfileDialog
          mode={dialog.mode}
          initial={dialog.profile}
          onConfirm={(name, color, avatarId) => {
            if (dialog.mode === "add") {
              void createProfile(name, color, avatarId);
            } else if (dialog.profile) {
              void updateProfile({
                ...dialog.profile,
                name,
                avatarColor: color,
                avatarId,
              });
            }
            setDialog(null);
          }}
          onDelete={
            dialog.mode === "edit" && dialog.profile
              ? () => {
                  void deleteProfile(dialog.profile!.id);
                  setDialog(null);
                }
              : undefined
          }
          onClose={() => setDialog(null)}
        />
      )}
    </main>
  );
}
