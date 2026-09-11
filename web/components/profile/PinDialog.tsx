"use client";

import { LockKeyhole, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { localize } from "@/lib/i18n";
import { verifyProfilePin } from "@/lib/profilePin";
import { useApp } from "@/lib/store";
import type { Profile } from "@/lib/types";

export function PinDialog({
  profile,
  onUnlock,
  onClose,
}: {
  profile: Profile;
  onUnlock: (pin: string) => void;
  onClose: () => void;
}) {
  const { settings } = useApp();
  const dialog = useRef<HTMLDialogElement>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const attempts = useRef(0);
  const retryAfter = useRef(0);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="profile-dialog pin-dialog"
      onCancel={onClose}
      aria-labelledby="profile-pin-title"
    >
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          if (checking) return;
          if (Date.now() < retryAfter.current) {
            setError(
              localize(
                settings.uiLanguage,
                "Bitte warte 30 Sekunden, bevor du es erneut versuchst.",
                "Please wait 30 seconds before trying again.",
              ),
            );
            return;
          }
          setChecking(true);
          const valid = await verifyProfilePin(pin, profile.pin);
          setChecking(false);
          if (valid) {
            onUnlock(pin);
            return;
          }
          attempts.current++;
          if (attempts.current % 5 === 0)
            retryAfter.current = Date.now() + 30_000;
          setPin("");
          setError(
            localize(
              settings.uiLanguage,
              "Falsche PIN. Bitte erneut versuchen.",
              "Incorrect PIN. Try again.",
            ),
          );
        }}
      >
        <div className="profile-dialog-head">
          <h2 id="profile-pin-title">
            <LockKeyhole size={22} /> {profile.name}
          </h2>
          <button
            className="icon-button"
            type="button"
            aria-label={localize(settings.uiLanguage, "Schließen", "Close")}
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <label htmlFor="profile-pin">
          {localize(settings.uiLanguage, "Profil-PIN", "Profile PIN")}
        </label>
        <input
          id="profile-pin"
          autoFocus
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]{4,5}"
          maxLength={5}
          required
          value={pin}
          onChange={(event) => setPin(event.target.value.replace(/\D/g, ""))}
          aria-describedby="profile-pin-error"
        />
        <p id="profile-pin-error" role="alert">
          {error}
        </p>
        <button
          type="submit"
          className="primary"
          disabled={checking || pin.length < 4}
        >
          {checking
            ? localize(settings.uiLanguage, "Wird geprüft ...", "Checking...")
            : localize(settings.uiLanguage, "Entsperren", "Unlock")}
        </button>
      </form>
    </dialog>
  );
}
