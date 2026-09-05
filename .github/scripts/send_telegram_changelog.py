#!/usr/bin/env python3

import html
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

MAX_BODY_LENGTH = 3_200
SECTION_HEADING = re.compile(r"^## \[([^]]+)](?:\s+-.*)?$")


def required_environment(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise ValueError(f"Fehlender Wert: {name}")
    return value


def telegram_destination() -> tuple[str, int, int]:
    bot_token = required_environment("TELEGRAM_BOT_TOKEN")
    if not re.fullmatch(r"\d{6,12}:[A-Za-z0-9_-]{30,}", bot_token):
        raise ValueError(
            "TELEGRAM_BOT_TOKEN hat kein gültiges Format. Beim Einfügen im Terminal "
            "Strg+Umschalt+V oder Rechtsklick statt Strg+V verwenden."
        )

    try:
        chat_id = int(required_environment("TELEGRAM_CHAT_ID"))
    except ValueError as error:
        raise ValueError("TELEGRAM_CHAT_ID muss eine Zahl sein") from error
    if chat_id >= 0:
        raise ValueError(
            "TELEGRAM_CHAT_ID muss für ein Topic die negative ID der Supergruppe sein "
            "(normalerweise beginnend mit -100), nicht die persönliche Benutzer-ID."
        )

    try:
        topic_id = int(required_environment("TELEGRAM_TOPIC_ID"))
    except ValueError as error:
        raise ValueError("TELEGRAM_TOPIC_ID muss eine Zahl sein") from error
    if topic_id <= 0:
        raise ValueError("TELEGRAM_TOPIC_ID muss eine positive Zahl sein")

    return bot_token, chat_id, topic_id


def read_changelog_section(path: Path, version: str) -> str:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as error:
        raise ValueError(f"Changelog konnte nicht gelesen werden: {path}") from error

    requested = version.removeprefix("v").casefold()
    sections: dict[str, list[str]] = {}
    current_key: str | None = None
    for line in lines:
        heading = SECTION_HEADING.match(line)
        if heading:
            current_key = heading.group(1).strip().casefold()
            sections[current_key] = []
        elif current_key is not None:
            sections[current_key].append(line)

    selected = sections.get(requested)
    if selected is None:
        selected = sections.get("unveröffentlicht") or sections.get("unreleased")
    if selected is None:
        raise ValueError(
            f"Weder Version [{version}] noch [Unveröffentlicht] wurde im Changelog gefunden"
        )

    text = "\n".join(selected).strip()
    if not text:
        raise ValueError(f"Der Changelog-Abschnitt für Version {version} ist leer")
    return text


def format_changelog_line(line: str) -> str:
    stripped = line.strip()
    if not stripped:
        return ""

    heading = re.match(r"^#{1,6}\s+(.+)$", stripped)
    if heading:
        return f"<b>{html.escape(heading.group(1))}</b>"

    bullet = re.match(r"^[-*]\s+(.+)$", stripped)
    if bullet:
        return f"• {html.escape(bullet.group(1))}"

    return html.escape(stripped)


def split_changelog(changelog: str) -> list[str]:
    blocks: list[str] = []
    for source_line in changelog.splitlines():
        if len(source_line) <= 600:
            blocks.append(format_changelog_line(source_line))
            continue

        for start in range(0, len(source_line), 600):
            blocks.append(format_changelog_line(source_line[start : start + 600]))

    chunks: list[str] = []
    current: list[str] = []
    current_length = 0
    for block in blocks:
        additional_length = len(block) + (1 if current else 0)
        if current and current_length + additional_length > MAX_BODY_LENGTH:
            chunks.append("\n".join(current).strip())
            current = []
            current_length = 0
        current.append(block)
        current_length += len(block) + (1 if current_length else 0)

    if current:
        chunks.append("\n".join(current).strip())
    return chunks or [""]


def build_messages(
    title: str, version: str, changelog: str, release_url: str
) -> list[str]:
    chunks = split_changelog(changelog)
    messages: list[str] = []
    for index, chunk in enumerate(chunks, start=1):
        heading = (
            f"<b>{html.escape(title)}</b>\n<code>Version {html.escape(version)}</code>"
        )
        if len(chunks) > 1:
            heading += f"\n<i>Teil {index}/{len(chunks)}</i>"

        sections = [heading, "<b>Was ist neu?</b>", chunk]
        if index == len(chunks) and release_url:
            sections.append(
                f'<a href="{html.escape(release_url, quote=True)}">Release auf GitHub öffnen</a>'
            )
        message = "\n\n".join(section for section in sections if section)
        if len(message) > 4_096:
            raise ValueError(
                "Eine formatierte Telegram-Nachricht überschreitet 4096 Zeichen. "
                "Bitte Titel, Version oder Release-Link kürzen."
            )
        messages.append(message)
    return messages


def send_message(bot_token: str, payload: dict[str, object]) -> None:
    endpoint = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    request = urllib.request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            result = json.load(response)
    except urllib.error.HTTPError as error:
        details = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Telegram API antwortete mit HTTP {error.code}: {details}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(
            f"Telegram API ist nicht erreichbar: {error.reason}"
        ) from error

    if not result.get("ok"):
        raise RuntimeError(f"Telegram API hat den Versand abgelehnt: {result}")


def main() -> int:
    try:
        version = required_environment("CHANGELOG_VERSION")
        changelog_path = Path(os.environ.get("CHANGELOG_FILE", "CHANGELOG.md"))
        changelog = read_changelog_section(changelog_path, version)
        output_file = os.environ.get("CHANGELOG_OUTPUT_FILE", "").strip()
        if output_file:
            Path(output_file).write_text(f"{changelog}\n", encoding="utf-8")
            print(f"Deutscher Changelog wurde nach {output_file} geschrieben.")
        if os.environ.get("TELEGRAM_SKIP_SEND", "false").lower() == "true":
            return 0

        title = required_environment("CHANGELOG_TITLE")
        release_url = os.environ.get("RELEASE_URL", "").strip()
        dry_run = os.environ.get("TELEGRAM_DRY_RUN", "false").lower() == "true"

        if len(title) > 100:
            raise ValueError("CHANGELOG_TITLE darf höchstens 100 Zeichen lang sein")
        if len(version) > 50:
            raise ValueError("CHANGELOG_VERSION darf höchstens 50 Zeichen lang sein")

        if release_url:
            parsed_url = urllib.parse.urlparse(release_url)
            if parsed_url.scheme not in {"http", "https"} or not parsed_url.netloc:
                raise ValueError(
                    "RELEASE_URL muss eine vollständige HTTP- oder HTTPS-Adresse sein"
                )

        messages = build_messages(title, version, changelog, release_url)
        if dry_run:
            for index, message in enumerate(messages, start=1):
                print(f"--- Telegram-Vorschau {index}/{len(messages)} ---")
                print(message)
            return 0

        bot_token, chat_id, topic_id = telegram_destination()

        for message in messages:
            send_message(
                bot_token,
                {
                    "chat_id": chat_id,
                    "message_thread_id": topic_id,
                    "text": message,
                    "parse_mode": "HTML",
                    "disable_web_page_preview": True,
                },
            )

        print(f"{len(messages)} Telegram-Nachricht(en) erfolgreich gesendet.")
        return 0
    except (ValueError, RuntimeError) as error:
        print(f"Fehler: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
