(async function () {
  var params = new URLSearchParams(window.location.search);
  var code = params.get("code");
  var state = params.get("state") || params.get("session");
  var error = params.get("error");
  var errorDesc = params.get("error_description");

  var heading = document.getElementById("heading");
  var message = document.getElementById("message");
  var codeVal = document.getElementById("code-val");
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
    heading.textContent = "Authorization Failed";
    heading.style.color = "#ff8a76";
    if (isMobileFlow) {
      deepLink = buildDeepLink();
      try {
        window.location.href = deepLink;
      } catch (e) {}
      renderDeepLink(
        (errorDesc || error) + ". If StreamNet TV did not open automatically, ",
        "tap here to return to StreamNet TV",
      );
    } else {
      message.textContent = errorDesc || error;
    }
    return;
  }

  if (!code) {
    heading.textContent = "No Code Received";
    message.textContent =
      "Discord did not return a valid authorization response.";
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
    heading.textContent = "Discord Connected!";
    heading.style.color = "#6ee7a3";
    renderDeepLink(
      "Authorized! If StreamNet TV did not open automatically, ",
      "tap here to return to StreamNet TV",
    );
    return;
  }

  if (isTvFlow) {
    var deviceCode = state.substring(tvPrefix.length);
    if (!/^[A-Za-z0-9_-]{40,128}$/.test(deviceCode)) {
      heading.textContent = "Invalid Pairing Session";
      heading.style.color = "#ff8a76";
      message.textContent = "Please scan the QR code on your TV again.";
      return;
    }

    try {
      var response = await fetch("/.netlify/functions/discord-auth-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_code: deviceCode, code: code }),
      });

      if (response.ok) {
        heading.textContent = "Discord Connected!";
        heading.style.color = "#6ee7a3";
        message.textContent = "Your TV is connected. You can close this page.";
      } else {
        heading.textContent = "Could Not Notify TV";
        heading.style.color = "#ff8a76";
        message.textContent =
          "Authorized with Discord, but the pairing session could not be delivered to your TV. Please scan the QR code again.";
      }
    } catch (e) {
      console.error(e);
      heading.textContent = "Could Not Notify TV";
      heading.style.color = "#ff8a76";
      message.textContent =
        "Authorized with Discord, but network delivery to your TV failed. Please scan the QR code again.";
    }
    return;
  }

  heading.textContent = "Invalid Authorization Session";
  heading.style.color = "#ff8a76";
  message.textContent =
    "Please start Discord authorization from StreamNet TV again.";
})();
