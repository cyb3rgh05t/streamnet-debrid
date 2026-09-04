# Settings Visual Consistency

Date: 2026-09-03

## Scope

This update aligns TV Settings controls with the active StreamNet theme while preserving existing navigation, account behavior, IPTV configuration, and the self-hosted `https://auth.mystreamnet.club` backend boundary.

## Icons and rows

- TV toggle rows now require a semantic leading icon, making missing icons a compile-time error.
- Settings action and account rows use the same 19 dp icon size, neutral tint, and 12 dp spacing as standard Settings rows.
- Subtitle, playback, appearance, profile, diagnostics, tracking, account, update, privacy, playlist, catalog, and plugin scraper controls now expose matching icons.
- Custom IPTV playlist and catalog rows follow the same visual icon treatment as shared Settings components.

## Focus and theming

- Addon switches no longer draw a second focus border inside the focused Addon row. Toggle, reorder, and delete D-pad actions are unchanged.
- Addon refresh and install actions use the selected theme accent for their focus border, icon, and label.
- The AI model dialog resolves the selected theme accent for its selected and focused backgrounds and check icon instead of using a fixed color.

## Transient notifications

- In-app toasts share one bottom-center layout above navigation insets and any visible app bottom bar, an OLED-aware dark background, and the active profile accent for their border and status icon.
- The IPTV loading/progress banner is not a system toast; it now reuses the same notification surface, width, corner radius, background, border, and spacing as regular app toasts.
- Success, error, and information states remain distinguishable by icon while preserving one visual theme.
- Player subtitle-match results and Telegram or installer events shown while the app is active use the shared toast presentation.
- Native Android toasts remain only as a fallback when no Compose host is active, such as installer callbacks outside the running app and the crash-report handoff to Discord.

## Localization

- StreamNet username and password fields provide explicit localized placeholders.
- The generated fallback placeholder used by TV Settings input dialogs is localized through Android string resources instead of hard-coded English text.
- English and German resources remain structurally aligned.

## Release

- Android version: `2.2.005`
- Version code: `380`
- Build variant: `sideloadDebug`

## Validation

- Sideload Debug Kotlin compilation.
- Sideload Debug APK assembly.
- IDE diagnostics for touched Kotlin and resource files.
- `git diff --check`.
