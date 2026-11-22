package com.arflix.tv.ui.screens.home

import androidx.annotation.StringRes
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Close
import androidx.compose.material.icons.outlined.Lightbulb
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.tv.material3.ExperimentalTvMaterial3Api
import androidx.tv.material3.Text
import com.arflix.tv.R
import com.arflix.tv.ui.skin.ArvioSkin
import com.arflix.tv.ui.skin.resolveAccentColor
import com.arflix.tv.ui.theme.contrastingContentColor

/** Fixed height of the banner slot on TV, so the row list can account for it in its scroll math. */
val HOME_TIP_TV_HEIGHT: Dp = 116.dp

@StringRes
private fun HomeTip.titleRes(): Int = when (this) {
    HomeTip.ROWS -> R.string.home_tip_rows_title
    HomeTip.ADDONS -> R.string.home_tip_addons_title
    HomeTip.LIVE_TV -> R.string.home_tip_live_tv_title
    HomeTip.CLOUD -> R.string.home_tip_cloud_title
}

@StringRes
private fun HomeTip.messageRes(): Int = when (this) {
    HomeTip.ROWS -> R.string.home_tip_rows_message
    HomeTip.ADDONS -> R.string.home_tip_addons_message
    HomeTip.LIVE_TV -> R.string.home_tip_live_tv_message
    HomeTip.CLOUD -> R.string.home_tip_cloud_message
}

/**
 * Full-width first-start tip shown under the first Home row: a translucent accent surface with a label, title
 * and text. Touch devices get "Got it!" and a close button; on TV it takes no focus so the rows keep the D-pad
 * and the Back key closes it.
 */
@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun HomeTipBanner(
    tip: HomeTip,
    isTouchDevice: Boolean,
    isFocused: Boolean = false,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val colors = ArvioSkin.colors
    val accent = resolveAccentColor(colors.accent)
    val shape = RoundedCornerShape(14.dp)

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(
                Brush.horizontalGradient(
                    listOf(accent.copy(alpha = 0.16f), accent.copy(alpha = 0.05f), Color.Black.copy(alpha = 0.35f))
                ),
                shape
            )
            .border(if (isFocused) 2.dp else 1.dp, accent.copy(alpha = if (isFocused) 0.9f else 0.32f), shape)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Column(
            modifier = Modifier.weight(1f),
            verticalArrangement = Arrangement.spacedBy(3.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Outlined.Lightbulb,
                    contentDescription = null,
                    tint = accent,
                    modifier = Modifier.size(14.dp)
                )
                Text(
                    text = stringResource(R.string.home_tip_label),
                    style = ArvioSkin.typography.body.copy(fontSize = 11.sp, fontWeight = FontWeight.Bold),
                    color = accent
                )
            }
            Text(
                text = stringResource(tip.titleRes()),
                style = ArvioSkin.typography.body.copy(fontSize = 16.sp, fontWeight = FontWeight.SemiBold),
                color = colors.textPrimary,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Text(
                text = stringResource(tip.messageRes()),
                style = ArvioSkin.typography.body.copy(fontSize = 13.sp),
                color = colors.textMuted,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis
            )
        }
        if (isTouchDevice) {
            Column(
                horizontalAlignment = Alignment.End,
                verticalArrangement = Arrangement.spacedBy(2.dp)
            ) {
                IconButton(onClick = onDismiss, modifier = Modifier.size(28.dp)) {
                    Icon(
                        imageVector = Icons.Outlined.Close,
                        contentDescription = stringResource(R.string.home_tip_close),
                        tint = colors.textMuted,
                        modifier = Modifier.size(18.dp)
                    )
                }
                OutlinedButton(
                    onClick = onDismiss,
                    modifier = Modifier.height(38.dp),
                    shape = RoundedCornerShape(10.dp),
                    contentPadding = PaddingValues(horizontal = 14.dp),
                    border = BorderStroke(1.dp, accent.copy(alpha = 0.7f)),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = colors.textPrimary),
                ) {
                    Text(
                        text = stringResource(R.string.home_tip_got_it),
                        style = ArvioSkin.typography.button,
                        color = colors.textPrimary,
                        maxLines = 1
                    )
                }
            }
        } else {
            // TV: the button is focused with D-pad Down from the first row; Back also closes the tip.
            val pillShape = RoundedCornerShape(10.dp)
            Text(
                text = stringResource(R.string.home_tip_got_it),
                modifier = Modifier
                    .background(if (isFocused) accent else Color.Transparent, pillShape)
                    .border(1.dp, accent.copy(alpha = if (isFocused) 1f else 0.55f), pillShape)
                    .padding(horizontal = 18.dp, vertical = 9.dp),
                style = ArvioSkin.typography.body.copy(fontSize = 13.sp, fontWeight = FontWeight.SemiBold),
                color = if (isFocused) contrastingContentColor(accent) else colors.textPrimary
            )
        }
    }
}
