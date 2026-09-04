package com.arflix.tv.ui.components

import android.graphics.drawable.ColorDrawable
import android.view.WindowManager
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Info
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.SideEffect
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.AccentYellow
import com.arflix.tv.ui.theme.ArflixTypography
import com.arflix.tv.ui.theme.appBackgroundDark
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import java.util.concurrent.atomic.AtomicLong

enum class ToastType {
    SUCCESS, ERROR, INFO
}

val LocalAppBottomBarVisible = compositionLocalOf { false }

data class AppToastEvent(
    val id: Long,
    val message: String,
    val type: ToastType,
    val durationMs: Long
)

object AppToastBus {
    private val nextId = AtomicLong()
    internal val events = MutableSharedFlow<AppToastEvent>(extraBufferCapacity = 16)

    fun show(
        message: String,
        type: ToastType = ToastType.INFO,
        durationMs: Long = 3000
    ): Boolean {
        if (events.subscriptionCount.value == 0) return false
        return events.tryEmit(AppToastEvent(nextId.incrementAndGet(), message, type, durationMs))
    }
}

@Composable
fun AppNotificationSurface(
    modifier: Modifier = Modifier,
    leadingContent: @Composable () -> Unit,
    content: @Composable RowScope.() -> Unit,
) {
    val themeAccent = resolveAccentColor(fallback = AccentYellow)
    val notificationShape = RoundedCornerShape(8.dp)
    Row(
        modifier = modifier
            .widthIn(max = 560.dp)
            .fillMaxWidth()
            .heightIn(min = 58.dp)
            .shadow(
                elevation = 18.dp,
                shape = notificationShape,
                ambientColor = Color.Black.copy(alpha = 0.32f),
                spotColor = Color.Black.copy(alpha = 0.32f),
            )
            .clip(notificationShape)
            .background(appBackgroundDark().copy(alpha = 0.96f))
            .border(
                width = 1.dp,
                color = themeAccent.copy(alpha = 0.72f),
                shape = notificationShape,
            )
            .padding(horizontal = 18.dp, vertical = 13.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Start,
    ) {
        leadingContent()
        Spacer(modifier = Modifier.width(12.dp))
        content()
    }
}

@Composable
fun AppToastHost() {
    var current by remember { mutableStateOf<AppToastEvent?>(null) }

    LaunchedEffect(Unit) {
        AppToastBus.events.collect { current = it }
    }

    current?.let { event ->
        key(event.id) {
            Toast(
                message = event.message,
                type = event.type,
                isVisible = true,
                durationMs = event.durationMs,
                onDismiss = { current = null }
            )
        }
    }
}

/**
 * Toast notification component for temporary messages
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun Toast(
    message: String,
    type: ToastType = ToastType.INFO,
    isVisible: Boolean,
    durationMs: Long = 3000,
    onDismiss: () -> Unit = {}
) {
    var visible by remember(isVisible, message, type) { mutableStateOf(isVisible) }
    val themeAccent = resolveAccentColor(fallback = AccentYellow)
    val bottomBarOffset = appBottomBarOverlayOffset()

    LaunchedEffect(isVisible, message, type) {
        if (isVisible) {
            visible = true
            delay(durationMs)
            visible = false
            onDismiss()
        }
    }

    Dialog(
        onDismissRequest = {},
        properties = DialogProperties(
            dismissOnBackPress = false,
            dismissOnClickOutside = false,
            usePlatformDefaultWidth = false
        )
    ) {
        val dialogView = LocalView.current
        SideEffect {
            (dialogView.parent as? DialogWindowProvider)?.window?.apply {
                setBackgroundDrawable(ColorDrawable(android.graphics.Color.TRANSPARENT))
                clearFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND)
                addFlags(
                    WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                        WindowManager.LayoutParams.FLAG_NOT_TOUCHABLE
                )
            }
        }

        Box(
            modifier = Modifier.fillMaxSize(),
            contentAlignment = Alignment.BottomCenter
        ) {
            AnimatedVisibility(
                visible = visible,
                enter = fadeIn() + slideInVertically(initialOffsetY = { it }),
                exit = fadeOut() + slideOutVertically(targetOffsetY = { it })
            ) {
                val icon = when (type) {
                    ToastType.SUCCESS -> Icons.Default.Check
                    ToastType.ERROR -> Icons.Default.Close
                    ToastType.INFO -> Icons.Default.Info
                }
                AppNotificationSurface(
                    modifier = Modifier
                        .windowInsetsPadding(WindowInsets.navigationBars)
                        .padding(
                            start = 16.dp,
                            end = 16.dp,
                            bottom = 20.dp + bottomBarOffset,
                        ),
                    leadingContent = {
                    Box(
                        modifier = Modifier
                            .size(28.dp)
                            .clip(RoundedCornerShape(8.dp))
                            .background(themeAccent.copy(alpha = 0.16f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = icon,
                            contentDescription = null,
                            tint = themeAccent,
                            modifier = Modifier.size(16.dp)
                        )
                    }
                    },
                ) {
                    Text(
                        text = message,
                        style = ArflixTypography.body,
                        color = Color.White
                    )
                }
            }
        }
    }
}
