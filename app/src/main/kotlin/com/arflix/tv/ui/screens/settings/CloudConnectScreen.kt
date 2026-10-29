package com.arflix.tv.ui.screens.settings

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Cloud
import androidx.compose.material.icons.filled.Email
import androidx.compose.material.icons.filled.SkipNext
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Icon
import androidx.tv.material3.Text
import coil.compose.AsyncImage
import com.arflix.tv.R
import com.arflix.tv.ui.components.LoadingIndicator
import com.arflix.tv.ui.components.QrCodeImage
import com.arflix.tv.ui.components.Toast
import com.arflix.tv.ui.components.ToastType as ComponentToastType
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.AccentYellow
import com.arflix.tv.ui.theme.appBackgroundDark
import com.arflix.tv.util.LocalDeviceType
import kotlinx.coroutines.delay

private const val CloudLinkFallbackUrl = "https://auth.mystreamnet.club/?code="

/**
 * Standalone cloud sign-in page shown before the profile selection. It reuses the cloud auth flow
 * of [SettingsViewModel]: on TV the pairing session starts automatically and the QR code plus the
 * code are shown inline (no dialog), e-mail/password stays available as a second option.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun CloudConnectScreen(
    viewModel: SettingsViewModel = hiltViewModel(),
    backdropUrls: List<String> = emptyList(),
    onConnected: () -> Unit,
    onSkip: () -> Unit,
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    val isTouchDevice = LocalDeviceType.current.isTouchDevice()
    val accentColor = resolveAccentColor(fallback = AccentYellow)
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    val primaryFocus = remember { FocusRequester() }
    var backdropIndex by remember { mutableStateOf(0) }
    val dialogOpen = uiState.showCloudEmailPasswordDialog

    LaunchedEffect(backdropUrls) {
        backdropIndex = 0
        while (backdropUrls.size > 1) {
            delay(7_000L)
            backdropIndex = (backdropIndex + 1) % backdropUrls.size
        }
    }
    var pairingSettled by remember { mutableStateOf(false) }
    LaunchedEffect(Unit) {
        if (!isTouchDevice) viewModel.startCloudAuth(forcePairing = true)
        delay(800)
        pairingSettled = true
    }
    LaunchedEffect(uiState.showCloudEmailPasswordDialog) {
        if (uiState.showCloudEmailPasswordDialog) {
            email = ""
            password = ""
        }
    }
    LaunchedEffect(dialogOpen) {
        if (!dialogOpen) {
            delay(80)
            runCatching { primaryFocus.requestFocus() }
        }
    }
    // shouldSwitchProfile is raised only after the cloud restore finished, so profiles are ready.
    LaunchedEffect(uiState.shouldSwitchProfile, uiState.isLoggedIn) {
        if (uiState.shouldSwitchProfile && uiState.isLoggedIn) {
            viewModel.onCloudProfileSwitchHandled()
            onConnected()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(appBackgroundDark())
    ) {
        CloudConnectBackdrop(
            url = backdropUrls.getOrNull(backdropIndex),
            accentColor = accentColor
        )

        if (isTouchDevice) {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 24.dp, vertical = 28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                CloudConnectIntro(centered = true)
                Spacer(modifier = Modifier.height(28.dp))
                Column(
                    modifier = Modifier.widthIn(max = 420.dp).fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    CloudConnectButton(
                        label = stringResource(R.string.cloud_connect_email),
                        icon = Icons.Default.Email,
                        accentColor = accentColor,
                        primary = true,
                        onClick = { viewModel.openCloudEmailPasswordDialog() },
                        modifier = Modifier.focusRequester(primaryFocus)
                    )
                    CloudConnectButton(
                        label = stringResource(R.string.cloud_connect_skip),
                        icon = Icons.Default.SkipNext,
                        accentColor = accentColor,
                        primary = false,
                        onClick = onSkip
                    )
                    CloudConnectSkipHint(centered = true)
                }
            }
        } else {
            Row(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(horizontal = 72.dp, vertical = 40.dp),
                horizontalArrangement = Arrangement.spacedBy(56.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    verticalArrangement = Arrangement.Center
                ) {
                    CloudConnectIntro(centered = false)
                    Spacer(modifier = Modifier.height(32.dp))
                    Column(
                        modifier = Modifier.widthIn(max = 380.dp).fillMaxWidth(),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        CloudConnectButton(
                            label = stringResource(R.string.cloud_connect_email),
                            icon = Icons.Default.Email,
                            accentColor = accentColor,
                            primary = true,
                            onClick = { viewModel.openCloudEmailPasswordDialog() },
                            modifier = Modifier.focusRequester(primaryFocus)
                        )
                        CloudConnectButton(
                            label = stringResource(R.string.cloud_connect_skip),
                            icon = Icons.Default.SkipNext,
                            accentColor = accentColor,
                            primary = false,
                            onClick = onSkip
                        )
                        CloudConnectSkipHint(centered = false)
                    }
                }
                BoxWithConstraints(
                    modifier = Modifier.weight(1f).fillMaxHeight(),
                    contentAlignment = Alignment.Center
                ) {
                    CloudPairingPanel(
                        userCode = uiState.cloudUserCode.orEmpty(),
                        verificationUrl = uiState.cloudVerificationUrl.orEmpty(),
                        statusMessage = uiState.cloudAuthStatusMessage?.let { stringResource(it) },
                        isWorking = uiState.isCloudAuthWorking,
                        canRequestNewCode = pairingSettled,
                        accentColor = accentColor,
                        onRequestNewCode = { viewModel.startCloudAuth(forcePairing = true) },
                        modifier = Modifier.fillMaxWidth(),
                        qrSize = cloudPairingQrSize(maxHeight.value).dp
                    )
                }
            }
        }

        if (uiState.showCloudEmailPasswordDialog) {
            CloudEmailPasswordModal(
                email = email,
                password = password,
                onEmailChange = { email = it },
                onPasswordChange = { password = it },
                onDismiss = { viewModel.closeCloudEmailPasswordDialog() },
                errorMessage = uiState.cloudEmailPasswordError,
                isWorking = uiState.isCloudAuthWorking,
                onSignIn = { viewModel.completeCloudAuthWithEmailPassword(email, password, createAccount = false) },
                onCreateAccount = { viewModel.completeCloudAuthWithEmailPassword(email, password, createAccount = true) },
                onOpenPrivacy = { openExternalUrl(context, PRIVACY_POLICY_URL) }
            )
        }

        uiState.toastMessage?.let { message ->
            Toast(
                message = message,
                type = when (uiState.toastType) {
                    ToastType.SUCCESS -> ComponentToastType.SUCCESS
                    ToastType.ERROR -> ComponentToastType.ERROR
                    ToastType.INFO -> ComponentToastType.INFO
                },
                isVisible = true,
                onDismiss = { viewModel.dismissToast() }
            )
        }
    }
}

@Composable
private fun CloudConnectBackdrop(url: String?, accentColor: Color) {
    if (url != null) {
        Crossfade(
            targetState = url,
            animationSpec = tween(durationMillis = 1_400),
            label = "cloud_connect_backdrop"
        ) { current ->
            AsyncImage(
                model = current,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
        }
    }
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.horizontalGradient(
                    0f to appBackgroundDark().copy(alpha = if (url != null) 0.94f else 1f),
                    0.55f to appBackgroundDark().copy(alpha = if (url != null) 0.72f else 1f),
                    1f to appBackgroundDark().copy(alpha = if (url != null) 0.84f else 1f)
                )
            )
            .background(
                Brush.verticalGradient(
                    0f to Color.Black.copy(alpha = 0.35f),
                    0.6f to Color.Transparent,
                    1f to appBackgroundDark().copy(alpha = 0.9f)
                )
            )
            .background(
                Brush.radialGradient(
                    colors = listOf(accentColor.copy(alpha = 0.22f), Color.Transparent),
                    radius = 900f
                )
            )
    )
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun CloudConnectIntro(centered: Boolean) {
    val align = if (centered) Alignment.CenterHorizontally else Alignment.Start
    val textAlign = if (centered) TextAlign.Center else TextAlign.Start
    Column(horizontalAlignment = align) {
        Image(
            painter = painterResource(id = R.drawable.streamnet_tv_logo_full),
            contentDescription = stringResource(R.string.app_name),
            contentScale = ContentScale.Fit,
            modifier = Modifier.widthIn(max = if (centered) 220.dp else 260.dp)
        )
        Spacer(modifier = Modifier.height(24.dp))
        Text(
            text = stringResource(R.string.connect_to_cloud),
            fontSize = if (centered) 26.sp else 34.sp,
            lineHeight = if (centered) 32.sp else 42.sp,
            fontWeight = FontWeight.Bold,
            color = Color.White,
            textAlign = textAlign
        )
        Spacer(modifier = Modifier.height(10.dp))
        Text(
            text = stringResource(R.string.cloud_connect_subtitle),
            fontSize = if (centered) 15.sp else 17.sp,
            lineHeight = if (centered) 22.sp else 25.sp,
            color = Color.White.copy(alpha = 0.72f),
            textAlign = textAlign,
            modifier = Modifier.widthIn(max = 460.dp)
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun CloudConnectSkipHint(centered: Boolean) {
    Text(
        text = stringResource(R.string.cloud_connect_skip_hint),
        fontSize = 12.sp,
        lineHeight = 17.sp,
        color = Color.White.copy(alpha = 0.5f),
        textAlign = if (centered) TextAlign.Center else TextAlign.Start,
        modifier = Modifier.padding(horizontal = 4.dp)
    )
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun CloudPairingPanel(
    userCode: String,
    verificationUrl: String,
    statusMessage: String?,
    isWorking: Boolean,
    canRequestNewCode: Boolean,
    accentColor: Color,
    onRequestNewCode: () -> Unit,
    modifier: Modifier = Modifier,
    qrSize: Dp = 220.dp,
) {
    val link = remember(verificationUrl, userCode) {
        verificationUrl.ifBlank { userCode.takeIf { it.isNotBlank() }?.let { CloudLinkFallbackUrl + it }.orEmpty() }
    }
    val shape = RoundedCornerShape(24.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(Color.Black.copy(alpha = 0.5f))
            .border(1.dp, accentColor.copy(alpha = 0.35f), shape)
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 32.dp, vertical = 28.dp),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = stringResource(R.string.cloud_connect_scan_title),
            fontSize = 20.sp,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
            textAlign = TextAlign.Center
        )
        Spacer(modifier = Modifier.height(18.dp))
        Box(
            modifier = Modifier
                .size(qrSize)
                .clip(RoundedCornerShape(18.dp))
                .background(Color.White)
                .padding(12.dp),
            contentAlignment = Alignment.Center
        ) {
            if (link.isNotBlank()) {
                QrCodeImage(
                    data = link,
                    sizePx = 640,
                    modifier = Modifier.fillMaxSize(),
                    foreground = android.graphics.Color.BLACK,
                    background = android.graphics.Color.WHITE
                )
            } else {
                LoadingIndicator(size = 40.dp)
            }
        }
        Spacer(modifier = Modifier.height(18.dp))
        Text(
            text = stringResource(R.string.cloud_connect_scan_hint),
            fontSize = 16.sp,
            lineHeight = 23.sp,
            fontWeight = FontWeight.Medium,
            color = Color.White.copy(alpha = 0.92f),
            textAlign = TextAlign.Center
        )
        if (userCode.isNotBlank()) {
            Spacer(modifier = Modifier.height(14.dp))
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(accentColor.copy(alpha = 0.16f))
                    .border(1.dp, accentColor.copy(alpha = 0.6f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 22.dp, vertical = 10.dp)
            ) {
                Text(
                    text = userCode,
                    fontSize = 30.sp,
                    fontWeight = FontWeight.Bold,
                    fontFamily = FontFamily.Monospace,
                    letterSpacing = 4.sp,
                    color = Color.White
                )
            }
        }
        Spacer(modifier = Modifier.height(16.dp))
        when {
            isWorking || !canRequestNewCode -> Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                LoadingIndicator(size = 18.dp, strokeWidth = 2.dp)
                Text(
                    text = statusMessage?.takeIf { it.isNotBlank() }
                        ?: stringResource(R.string.settings_waiting_for_approval),
                    fontSize = 14.sp,
                    lineHeight = 20.sp,
                    color = Color.White.copy(alpha = 0.8f)
                )
            }
            else -> CloudConnectButton(
                label = stringResource(R.string.cloud_connect_new_code),
                icon = null,
                accentColor = accentColor,
                primary = false,
                onClick = onRequestNewCode,
                modifier = Modifier.width(260.dp)
            )
        }
    }
}

internal enum class CloudActionStyle { Primary, Outlined, Ghost }

internal fun cloudPairingQrSize(availableHeightDp: Float): Float =
    (availableHeightDp - 260f).coerceIn(64f, 220f)

/** Visual-only button; the host decides [focused] (the e-mail dialog drives focus by key events). */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
internal fun CloudActionButton(
    label: String,
    icon: ImageVector,
    focused: Boolean,
    style: CloudActionStyle,
    accentColor: Color,
    enabled: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    compact: Boolean = false,
) {
    val shape = RoundedCornerShape(14.dp)
    val fill = when (style) {
        CloudActionStyle.Primary -> accentColor.copy(alpha = if (focused) 0.5f else 0.3f)
        CloudActionStyle.Outlined -> if (focused) accentColor.copy(alpha = 0.18f) else Color.White.copy(alpha = 0.05f)
        CloudActionStyle.Ghost -> Color.White.copy(alpha = if (focused) 0.16f else 0.08f)
    }
    val idleBorder = when (style) {
        CloudActionStyle.Primary -> accentColor.copy(alpha = 0.7f)
        CloudActionStyle.Outlined -> accentColor.copy(alpha = 0.45f)
        CloudActionStyle.Ghost -> Color.White.copy(alpha = 0.14f)
    }
    Row(
        modifier = modifier
            .height(52.dp)
            .clip(shape)
            .background(fill)
            .border(
                width = if (focused) 3.dp else 1.dp,
                color = if (focused) accentColor else idleBorder,
                shape = shape
            )
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = if (compact) 8.dp else 14.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = Color.White.copy(alpha = if (enabled) 1f else 0.5f),
            modifier = Modifier.size(if (compact) 18.dp else 20.dp)
        )
        Spacer(modifier = Modifier.width(if (compact) 6.dp else 10.dp))
        Text(
            text = label,
            fontSize = if (compact) 15.sp else 16.sp,
            fontWeight = if (style == CloudActionStyle.Primary) FontWeight.Bold else FontWeight.Medium,
            color = Color.White.copy(alpha = if (enabled) 1f else 0.5f),
            maxLines = 1,
            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
        )
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun CloudConnectButton(
    label: String,
    icon: ImageVector?,
    accentColor: Color,
    primary: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(
        targetValue = if (focused) 1.04f else 1f,
        animationSpec = tween(150),
        label = "cloud_connect_button_scale"
    )
    val shape = RoundedCornerShape(14.dp)
    val fill = when {
        primary -> Brush.horizontalGradient(
            listOf(accentColor.copy(alpha = if (focused) 0.5f else 0.3f), accentColor.copy(alpha = if (focused) 0.34f else 0.18f))
        )
        else -> Brush.horizontalGradient(
            listOf(Color.White.copy(alpha = if (focused) 0.18f else 0.08f), Color.White.copy(alpha = if (focused) 0.12f else 0.05f))
        )
    }
    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(54.dp)
            .scale(scale)
            .clip(shape)
            .background(fill)
            .border(
                width = if (focused) 3.dp else 1.dp,
                color = when {
                    focused -> accentColor
                    primary -> accentColor.copy(alpha = 0.7f)
                    else -> Color.White.copy(alpha = 0.22f)
                },
                shape = shape
            )
            .onFocusChanged { focused = it.isFocused }
            .clickable(onClick = onClick)
            .padding(horizontal = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(12.dp))
        }
        Text(
            text = label,
            fontSize = 17.sp,
            fontWeight = if (primary) FontWeight.Bold else FontWeight.Medium,
            color = Color.White,
            textAlign = TextAlign.Center
        )
    }
}
