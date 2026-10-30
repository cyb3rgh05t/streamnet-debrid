package com.arflix.tv.data.repository

import com.arflix.tv.util.AppLogger
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.CoroutineStart
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Deferred
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.currentCoroutineContext
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.emitAll
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.job
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import javax.inject.Inject
import javax.inject.Provider
import javax.inject.Singleton

internal data class PlaybackSaveOwner(val profileId: String, val accountId: String?)

internal class PendingPlaybackSave(
    val localSaved: Deferred<Unit>,
    val completion: Job,
)

@Singleton
class PlaybackProgressSaveQueue internal constructor(
    private val scope: CoroutineScope,
    private val currentOwner: () -> PlaybackSaveOwner,
    private val ownerChanges: Flow<PlaybackSaveOwner>,
    private val reportFailure: (Exception) -> Unit,
) {
    @Inject
    constructor(
        profileManager: ProfileManager,
        authRepository: Provider<AuthRepository>,
    ) : this(
        scope = CoroutineScope(SupervisorJob() + Dispatchers.IO),
        currentOwner = {
            PlaybackSaveOwner(
                profileManager.getProfileIdSync(),
                (authRepository.get().authState.value as? AuthState.Authenticated)?.userId,
            )
        },
        ownerChanges = combine(
            profileManager.currentProfileId,
            flow { emitAll(authRepository.get().authState) },
        ) { profileId, auth ->
            PlaybackSaveOwner(profileId, (auth as? AuthState.Authenticated)?.userId)
        },
        reportFailure = { AppLogger.e("PlaybackProgress", "Progress save or background sync failed", it) },
    )

    private val localMutex = Mutex()
    private val enqueueLock = Any()
    private var localTail: Deferred<Unit>? = null
    private var remoteTail: Job? = null

    internal fun owner(): PlaybackSaveOwner = currentOwner()

    internal suspend fun <T> writeLocal(owner: PlaybackSaveOwner, action: suspend () -> T): T =
        localMutex.withLock {
            checkOwner(owner)
            action()
        }

    internal fun submit(
        owner: PlaybackSaveOwner,
        saveLocal: suspend () -> Unit,
        syncRemote: suspend () -> Unit,
    ): PendingPlaybackSave = synchronized(enqueueLock) {
        val previousLocal = localTail
        val previousRemote = remoteTail
        val localSaved = CompletableDeferred<Unit>()
        val completion = scope.launch(start = CoroutineStart.LAZY) {
            val saveJob = currentCoroutineContext().job
            val ownerWatcher = launch(start = CoroutineStart.UNDISPATCHED) {
                ownerChanges.first { it != owner }
                saveJob.cancel(CancellationException("Playback profile or account changed"))
            }
            try {
                previousLocal?.join()
                writeLocal(owner, saveLocal)
                localSaved.complete(Unit)
                // Network work never holds the local-write lock or belongs to the player ViewModel.
                previousRemote?.join()
                checkOwner(owner)
                syncRemote()
            } catch (error: CancellationException) {
                throw error
            } catch (error: Exception) {
                localSaved.completeExceptionally(error)
                reportFailure(error)
            } finally {
                ownerWatcher.cancel()
            }
        }
        completion.invokeOnCompletion { error ->
            if (error != null) localSaved.completeExceptionally(error)
        }
        localTail = localSaved
        remoteTail = completion
        completion.start()
        PendingPlaybackSave(localSaved, completion)
    }

    private suspend fun checkOwner(owner: PlaybackSaveOwner) {
        currentCoroutineContext().ensureActive()
        if (currentOwner() != owner) {
            throw CancellationException("Playback profile or account changed")
        }
    }
}
