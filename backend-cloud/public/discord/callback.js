(async function () {
  var params = new URLSearchParams(window.location.search);
  var code = params.get("code");
  var state = params.get("state") || params.get("session");
  var error = params.get("error");
  var errorDesc = params.get("error_description");

  var heading = document.getElementById("heading");
  var message = document.getElementById("message");
  var codeVal = document.getElementById("code-val");
  var codeLabel = document.getElementById("code-label");
  var language =
    (
      window.localStorage.getItem("streamnet:lang") ||
      navigator.language ||
      "en"
    )
      .toLowerCase()
      .indexOf("de") === 0
      ? "de"
      : "en";
  var copy = {
    en: {
      connecting: "Connecting to TV...",
      connectingMessage:
        "Please wait while we complete the authorization with your TV.",
      codeLabel: "Your pairing code:",
      authorizationFailed: "Authorization Failed",
      authorizationFailedMessage: "Discord authorization failed.",
      returnPrefix: "If StreamNet did not open automatically, ",
      returnLink: "tap here to return to StreamNet",
      noCode: "No Code Received",
      noCodeMessage: "Discord did not return a valid authorization response.",
      connected: "Discord Connected!",
      authorizedPrefix:
        "Authorized! If StreamNet did not open automatically, ",
      invalidPairing: "Invalid Pairing Session",
      scanAgain: "Please scan the QR code on your TV again.",
      tvConnected: "Your TV is connected. You can close this page.",
      notifyFailed: "Could Not Notify TV",
      deliveryFailed:
        "Authorized with Discord, but the pairing session could not be delivered to your TV. Please scan the QR code again.",
      networkFailed:
        "Authorized with Discord, but network delivery to your TV failed. Please scan the QR code again.",
      invalidSession: "Invalid Authorization Session",
      restartAuthorization:
        "Please start Discord authorization from StreamNet again.",
    },
    de: {
      connecting: "Verbindung zum TV wird hergestellt...",
      connectingMessage:
        "Bitte warte, waehrend die Autorisierung mit deinem TV abgeschlossen wird.",
      codeLabel: "Dein Kopplungscode:",
      authorizationFailed: "Autorisierung fehlgeschlagen",
      authorizationFailedMessage:
        "Die Discord-Autorisierung ist fehlgeschlagen.",
      returnPrefix: "Falls StreamNet nicht automatisch geoeffnet wurde, ",
      returnLink: "tippe hier, um zu StreamNet zurueckzukehren",
      noCode: "Kein Code empfangen",
      noCodeMessage:
        "Discord hat keine gueltige Autorisierungsantwort geliefert.",
      connected: "Discord verbunden!",
      authorizedPrefix:
        "Autorisiert! Falls StreamNet nicht automatisch geoeffnet wurde, ",
      invalidPairing: "Ungueltige Kopplungssitzung",
      scanAgain: "Bitte scanne den QR-Code auf deinem TV erneut.",
      tvConnected: "Dein TV ist verbunden. Du kannst diese Seite schliessen.",
      notifyFailed: "TV konnte nicht benachrichtigt werden",
      deliveryFailed:
        "Discord wurde autorisiert, aber die Kopplung konnte nicht an deinen TV uebertragen werden. Bitte scanne den QR-Code erneut.",
      networkFailed:
        "Discord wurde autorisiert, aber die Uebertragung an deinen TV ist fehlgeschlagen. Bitte scanne den QR-Code erneut.",
      invalidSession: "Ungueltige Autorisierungssitzung",
      restartAuthorization:
        "Bitte starte die Discord-Autorisierung in StreamNet erneut.",
    },
  };

  function t(key) {
    return (copy[language] && copy[language][key]) || copy.en[key] || key;
  }

  document.documentElement.lang = language;
  heading.textContent = t("connecting");
  message.textContent = t("connectingMessage");
  if (codeLabel) codeLabel.textContent = t("codeLabel");
  var mobilePrefix = "mobile_";
  var tvPrefix = "tv_";
  var isMobileFlow = Boolean(state && state.indexOf(mobilePrefix) === 0);
  var isTvFlow = Boolean(state && state.indexOf(tvPrefix) === 0);
  var deepLink = null;

  function buildDeepLink() {
    var query = code
      ? "code=" + encodeURIComponent(code)
      : "error=" + encodeURIComponent(error || "authorization_failed");
    if (state) query += "&state=" + encodeURIComponent(state);
    if (errorDesc)
      query += "&error_description=" + encodeURIComponent(errorDesc);
    return "arvio://discord/auth?" + query;
  }

  function renderDeepLink(textPrefix, linkText) {
    message.textContent = textPrefix;
    var link = document.createElement("a");
    link.href = deepLink;
    link.style.color = "#e5a209";
    link.style.fontWeight = "600";
    link.textContent = linkText;
    message.appendChild(link);
    message.appendChild(document.createTextNode("."));
  }

  if (error) {
    heading.textContent = t("authorizationFailed");
    heading.style.color = "#ff8a76";
    if (isMobileFlow) {
      deepLink = buildDeepLink();
      try {
        window.location.href = deepLink;
      } catch (e) {}
      renderDeepLink(
        (language === "de"
          ? t("authorizationFailedMessage")
          : errorDesc || error) +
          ". " +
          t("returnPrefix"),
        t("returnLink"),
      );
    } else {
      message.textContent =
        language === "de"
          ? t("authorizationFailedMessage")
          : errorDesc || error;
    }
    return;
  }

  if (!code) {
    heading.textContent = t("noCode");
    message.textContent = t("noCodeMessage");
    return;
  }

  if (codeVal) {
    codeVal.textContent = code;
  }

  if (isMobileFlow) {
    deepLink = buildDeepLink();
    try {
      window.location.href = deepLink;
    } catch (e) {}
    heading.textContent = t("connected");
    heading.style.color = "#6ee7a3";
    renderDeepLink(t("authorizedPrefix"), t("returnLink"));
    return;
  }

  if (isTvFlow) {
    var deviceCode = state.substring(tvPrefix.length);
    if (!/^[A-Za-z0-9_-]{40,128}$/.test(deviceCode)) {
      heading.textContent = t("invalidPairing");
      heading.style.color = "#ff8a76";
      message.textContent = t("scanAgain");
      return;
    }

    try {
      var response = await fetch("/.netlify/functions/discord-auth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode, code: code }),
      });

      if (response.ok) {
        heading.textContent = t("connected");
        heading.style.color = "#6ee7a3";
        message.textContent = t("tvConnected");
      } else {
        heading.textContent = t("notifyFailed");
        heading.style.color = "#ff8a76";
        message.textContent = t("deliveryFailed");
      }
    } catch (e) {
      console.error(e);
      heading.textContent = t("notifyFailed");
      heading.style.color = "#ff8a76";
      message.textContent = t("networkFailed");
    }
    return;
  }

  heading.textContent = t("invalidSession");
  heading.style.color = "#ff8a76";
  message.textContent = t("restartAuthorization");
})();
