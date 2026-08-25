package com.arflix.tv

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import kotlinx.coroutines.CancellationException
import com.arflix.tv.util.START_ON_DEVICE_BOOT_KEY
import com.arflix.tv.util.isTvUi
import com.arflix.tv.util.settingsDataStore
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

class BootCompletedReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.LOCKED_BOOT_COMPLETED" &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) {
            return
        }

        if (context.packageName.isBlank() || !isTvUi(context)) return

        val pendingResult = goAsync()
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val enabled = runCatching {
                    context.settingsDataStore.data.first()[START_ON_DEVICE_BOOT_KEY] == true
                }.getOrDefault(false)

                if (!enabled) return@launch

                val launchIntent = Intent(context, MainActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP
                    )
                }
                context.startActivity(launchIntent)
            } catch (e: CancellationException) {
                throw e
            } finally {
                pendingResult.finish()
            }
        }
    }
}
