package com.arflix.tv.ui.screens.login

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.input.key.*
import androidx.compose.ui.platform.LocalSoftwareKeyboardController
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.Button
import androidx.tv.material3.ButtonDefaults
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.data.repository.AuthState
import com.arflix.tv.ui.components.*
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.*

/**
 * Login Screen with Email/Password - Optimized for TV
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun LoginScreen(
    viewModel: LoginViewModel = hiltViewModel(),
    onLoginSuccess: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val accentColor = resolveAccentColor(AccentYellow)

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var isSignUpMode by remember { mutableStateOf(false) }
    var focusedField by remember { mutableStateOf("email") }

    val emailFocusRequester = remember { FocusRequester() }
    val passwordFocusRequester = remember { FocusRequester() }
    val buttonFocusRequester = remember { FocusRequester() }
    val toggleFocusRequester = remember { FocusRequester() }
    val privacyFocusRequester = remember { FocusRequester() }
    val keyboardController = LocalSoftwareKeyboardController.current
    val context = LocalContext.current

    // Handle successful login
    LaunchedEffect(uiState.loginReady) {
        if (uiState.loginReady) {
            viewModel.onLoginNavigationHandled()
            onLoginSuccess()
        }
    }

    // Request initial focus
    LaunchedEffect(Unit) {
        emailFocusRequester.requestFocus()
    }

    // Handle keyboard navigation
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(
                Brush.verticalGradient(
                    colors = listOf(
                        appBackgroundDark(),
                        BackgroundElevated,
                        appBackgroundDark()
                    )
                )
            )
            .onPreviewKeyEvent { event ->
                if (event.type == KeyEventType.KeyDown) {
                    when (event.key) {
                        Key.DirectionDown -> {
                            when (focusedField) {
                                "email" -> {
                                    passwordFocusRequester.requestFocus()
                                    true
                                }
                                "password" -> {
                                    buttonFocusRequester.requestFocus()
                                    true
                                }
                                "button" -> {
                                    if (isSignUpMode) privacyFocusRequester.requestFocus() else toggleFocusRequester.requestFocus()
                                    true
                                }
                                "privacy" -> {
                                    toggleFocusRequester.requestFocus()
                                    true
                                }
                                else -> false
                            }
                        }
                        Key.DirectionUp -> {
                            when (focusedField) {
                                "password" -> {
                                    emailFocusRequester.requestFocus()
                                    true
                                }
                                "button" -> {
                                    passwordFocusRequester.requestFocus()
                                    true
                                }
                                "toggle" -> {
                                    if (isSignUpMode) privacyFocusRequester.requestFocus() else buttonFocusRequester.requestFocus()
                                    true
                                }
                                "privacy" -> {
                                    buttonFocusRequester.requestFocus()
                                    true
                                }
                                else -> false
                            }
                        }
                        else -> false
                    }
                } else false
            }
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            accentColor.copy(alpha = 0.2f),
                            Color.Transparent
                        ),
                        radius = 760f
                    )
                )
        )

        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color.Transparent,
                            accentColor.copy(alpha = 0.08f),
                            Color.Transparent
                        )
                    )
                )
        )

        Row(
            modifier = Modifier
                .fillMaxSize()
                .padding(horizontal = 96.dp, vertical = 64.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.Center
            ) {
                val authStateText = when (uiState.authState) {
                    is AuthState.Authenticated -> stringResource(R.string.settings_cloud_connected)
                    is AuthState.Error -> stringResource(R.string.cloud_sync_failed)
                    AuthState.Loading -> stringResource(R.string.syncing)
                    AuthState.NotAuthenticated -> stringResource(R.string.settings_cloud_off)
                }

                Box(
                    modifier = Modifier
                        .clip(RoundedCornerShape(100.dp))
                        .background(accentColor.copy(alpha = 0.14f))
                        .border(
                            width = 1.dp,
                            color = accentColor.copy(alpha = 0.52f),
                            shape = RoundedCornerShape(100.dp)
                        )
                        .padding(horizontal = 14.dp, vertical = 8.dp)
                ) {
                    Text(
                        text = authStateText.uppercase(),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        color = TextPrimary
                    )
                }

                Spacer(modifier = Modifier.height(20.dp))

                Text(
                    text = "STREAMNET TV",
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 5.sp,
                    style = TextStyle(
                        brush = Brush.linearGradient(
                            colors = listOf(
                                TextPrimary,
                                accentColor,
                                TextPrimary
                            )
                        )
                    ),
                    lineHeight = 60.sp
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = stringResource(R.string.settings_cloud_signin_title),
                    fontSize = 22.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(14.dp))

                Text(
                    text = stringResource(R.string.login_tagline_main),
                    fontSize = 19.sp,
                    fontWeight = FontWeight.Medium,
                    color = TextSecondary
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = stringResource(R.string.settings_cloud_account_desc),
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Normal,
                    color = TextTertiary,
                    modifier = Modifier.width(500.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = stringResource(R.string.settings_cloud_signin_hint_tv),
                    fontSize = 13.sp,
                    fontWeight = FontWeight.Medium,
                    color = accentColor.copy(alpha = 0.92f),
                    modifier = Modifier.width(500.dp)
                )
            }

            Column(
                modifier = Modifier
                    .width(460.dp)
                    .clip(RoundedCornerShape(22.dp))
                    .background(BackgroundCard.copy(alpha = 0.96f))
                    .border(
                        1.dp,
                        accentColor.copy(alpha = 0.24f),
                        RoundedCornerShape(22.dp)
                    )
                    .padding(30.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(100.dp))
                        .background(
                            Brush.horizontalGradient(
                                colors = listOf(
                                    accentColor.copy(alpha = 0.38f),
                                    accentColor,
                                    accentColor.copy(alpha = 0.38f)
                                )
                            )
                        )
                )

                Spacer(modifier = Modifier.height(16.dp))

                Text(
                    text = if (isSignUpMode) stringResource(R.string.login_create_account) else stringResource(R.string.login_sign_in_continue),
                    fontSize = 18.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = TextPrimary
                )

                Spacer(modifier = Modifier.height(6.dp))

                Text(
                    text = stringResource(R.string.settings_cloud_signin_hint_touch),
                    fontSize = 12.sp,
                    color = TextTertiary
                )

                Spacer(modifier = Modifier.height(28.dp))

                // Error message
                if (uiState.error != null) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(ErrorRed.copy(alpha = 0.12f))
                            .border(
                                width = 1.dp,
                                color = ErrorRed.copy(alpha = 0.42f),
                                shape = RoundedCornerShape(12.dp)
                            )
                            .padding(12.dp)
                    ) {
                        Text(
                            text = uiState.error!!,
                            fontSize = 13.sp,
                            color = ErrorRed
                        )
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                }

                // Email field
                PremiumTextField(
                    value = email,
                    onValueChange = { email = it },
                    placeholder = stringResource(R.string.login_email),
                    keyboardType = KeyboardType.Email,
                    imeAction = ImeAction.Next,
                    keyboardActions = KeyboardActions(
                        onNext = { passwordFocusRequester.requestFocus() }
                    ),
                    onRequestKeyboard = { keyboardController?.show() },
                    isFocused = focusedField == "email",
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(emailFocusRequester)
                        .onFocusChanged {
                            if (it.isFocused) {
                                focusedField = "email"
                            }
                        }
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Password field
                PremiumTextField(
                    value = password,
                    onValueChange = { password = it },
                    placeholder = stringResource(R.string.login_password),
                    keyboardType = KeyboardType.Password,
                    isPassword = true,
                    imeAction = ImeAction.Done,
                    keyboardActions = KeyboardActions(
                        onDone = {
                            keyboardController?.hide()
                            buttonFocusRequester.requestFocus()
                        }
                    ),
                    onRequestKeyboard = { keyboardController?.show() },
                    isFocused = focusedField == "password",
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(passwordFocusRequester)
                        .onFocusChanged {
                            if (it.isFocused) {
                                focusedField = "password"
                            }
                        }
                )

                Spacer(modifier = Modifier.height(24.dp))

                // Sign In / Sign Up button
                GradientButton(
                    onClick = {
                        if (isSignUpMode) {
                            viewModel.signUp(email, password)
                        } else {
                            viewModel.signIn(email, password)
                        }
                    },
                    text = if (isSignUpMode) stringResource(R.string.login_sign_up) else stringResource(R.string.sign_in),
                    isPrimary = true,
                    isFocused = focusedField == "button",
                    enabled = !uiState.isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(buttonFocusRequester)
                        .onFocusChanged { if (it.isFocused) focusedField = "button" }
                )

                if (isSignUpMode) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(
                        text = stringResource(R.string.login_privacy_notice),
                        fontSize = 12.sp,
                        color = Color.White.copy(alpha = 0.62f),
                        modifier = Modifier.fillMaxWidth()
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    GradientButton(
                        onClick = {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse("https://auth.mystreamnet.club/privacy"))
                            )
                        },
                        text = stringResource(R.string.login_read_privacy_policy),
                        isPrimary = false,
                        isFocused = focusedField == "privacy",
                        enabled = !uiState.isLoading,
                        modifier = Modifier
                            .fillMaxWidth()
                            .focusRequester(privacyFocusRequester)
                            .onFocusChanged { if (it.isFocused) focusedField = "privacy" }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                // Toggle Sign In / Sign Up
                GradientButton(
                    onClick = { isSignUpMode = !isSignUpMode },
                    text = if (isSignUpMode) stringResource(R.string.login_have_account) else stringResource(R.string.login_no_account),
                    isPrimary = false,
                    isFocused = focusedField == "toggle",
                    enabled = !uiState.isLoading,
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(toggleFocusRequester)
                        .onFocusChanged { if (it.isFocused) focusedField = "toggle" }
                )

                // Loading indicator
                if (uiState.isLoading) {
                    Spacer(modifier = Modifier.height(20.dp))
                    SimpleLoadingDots(
                        dotCount = 3,
                        dotSize = 6.dp,
                        color = accentColor
                    )
                }
            }
        }
    }
}

/**
 * Premium styled text field with gradient border on focus
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun PremiumTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    keyboardActions: KeyboardActions = KeyboardActions.Default,
    onRequestKeyboard: () -> Unit = {},
    isPassword: Boolean = false,
    isFocused: Boolean = false,
    modifier: Modifier = Modifier
) {
    val backgroundColor = appBackgroundDark().copy(alpha = 0.6f)
    val accentColor = resolveAccentColor(AccentYellow)

    Box(
        modifier = modifier
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (isFocused) {
                    Modifier.background(
                        Brush.linearGradient(
                            colors = listOf(
                                accentColor.copy(alpha = 0.5f),
                                accentColor,
                                accentColor.copy(alpha = 0.5f)
                            )
                        ),
                        RoundedCornerShape(12.dp)
                    )
                } else {
                    Modifier.background(
                        BorderLight,
                        RoundedCornerShape(12.dp)
                    )
                }
            )
            .padding(2.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(backgroundColor)
    ) {
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 18.dp, vertical = 16.dp)
                .onPreviewKeyEvent { event ->
                    if (event.type == KeyEventType.KeyDown) {
                        when (event.key) {
                            Key.Enter, Key.NumPadEnter, Key.DirectionCenter -> {
                                onRequestKeyboard()
                                true
                            }
                            else -> false
                        }
                    } else {
                        false
                    }
                },
            textStyle = TextStyle(
                fontSize = 15.sp,
                color = TextPrimary,
                fontWeight = FontWeight.Normal
            ),
            keyboardOptions = KeyboardOptions(
                keyboardType = keyboardType,
                imeAction = imeAction
            ),
            keyboardActions = keyboardActions,
            singleLine = true,
            cursorBrush = SolidColor(accentColor),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
            decorationBox = { innerTextField ->
                Box {
                    if (value.isEmpty()) {
                        Text(
                            text = placeholder,
                            fontSize = 15.sp,
                            color = TextTertiary
                        )
                    }
                    innerTextField()
                }
            }
        )
    }
}

/**
 * Gradient button with premium styling
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun GradientButton(
    onClick: () -> Unit,
    text: String,
    isPrimary: Boolean,
    isFocused: Boolean,
    enabled: Boolean,
    modifier: Modifier = Modifier
) {
    val accentColor = resolveAccentColor(AccentYellow)
    val focusedBackground = accentColor
    val focusedText = ArcticBlack
    val noScale = ButtonDefaults.scale(1f, 1f, 1f, 1f, 1f)

    Box(
        modifier = modifier
            .height(50.dp)
            .clip(RoundedCornerShape(12.dp))
            .then(
                if (isPrimary) {
                    if (isFocused) {
                        Modifier.background(focusedBackground)
                    } else {
                        Modifier.background(
                            accentColor.copy(alpha = 0.24f),
                            RoundedCornerShape(12.dp)
                        ).border(
                            width = 1.dp,
                            color = accentColor.copy(alpha = 0.4f),
                            shape = RoundedCornerShape(12.dp)
                        )
                    }
                } else {
                    Modifier
                        .background(
                            if (isFocused) focusedBackground.copy(alpha = 0.2f) else BackgroundCard,
                            RoundedCornerShape(12.dp)
                        )
                        .border(
                            width = 1.dp,
                            color = if (isFocused) focusedBackground else BorderLight,
                            shape = RoundedCornerShape(12.dp)
                        )
                }
            ),
        contentAlignment = Alignment.Center
    ) {
        Button(
            onClick = onClick,
            enabled = enabled,
            modifier = Modifier.fillMaxSize(),
            colors = ButtonDefaults.colors(
                containerColor = Color.Transparent,
                focusedContainerColor = Color.Transparent,
                disabledContainerColor = Color.Transparent
            ),
            scale = noScale,
            shape = ButtonDefaults.shape(RoundedCornerShape(12.dp))
        ) {
            Text(
                text = text,
                fontSize = 14.sp,
                fontWeight = FontWeight.SemiBold,
                color = if (isFocused) focusedText else if (isPrimary) TextPrimary else TextSecondary
            )
        }
    }
}
