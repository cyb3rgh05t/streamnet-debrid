package com.arflix.tv.data.repository

import java.io.IOException
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.Job
import kotlinx.coroutines.cancel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.test.TestScope
import kotlinx.coroutines.test.advanceTimeBy
import kotlinx.coroutines.test.runCurrent
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

@OptIn(ExperimentalCoroutinesApi::class)
class PlaybackProgressSaveQueueTest {
    private val initialOwner = PlaybackSaveOwner("profile-a", "account-a")

    private fun TestScope.queue(
        owners: MutableStateFlow<PlaybackSaveOwner> = MutableStateFlow(initialOwner),
        failures: MutableList<Exception> = mutableListOf(),
    ) = PlaybackProgressSaveQueue(backgroundScope, { owners.value }, owners, failures::add)

    @Test
    fun `rapid saves preserve submission order for both local and remote writes`() = runTest {
        val queue = queue()
        val localGate = CompletableDeferred<Unit>()
        val remoteGate = CompletableDeferred<Unit>()
        val localWrites = mutableListOf<Int>()
        val remoteWrites = mutableListOf<Int>()
        queue.submit(initialOwner, {
            localGate.await()
            localWrites.add(1)
        }, {
            remoteGate.await()
            remoteWrites.add(1)
        })
        val saves = (2..5).map { position ->
            queue.submit(initialOwner, { localWrites.add(position) }, { remoteWrites.add(position) })
        }
        runCurrent()
        assertTrue(localWrites.isEmpty())
        localGate.complete(Unit)
        runCurrent()
        assertEquals(listOf(1, 2, 3, 4, 5), localWrites)
        assertTrue(remoteWrites.isEmpty())
        assertTrue(saves.all { it.localSaved.isCompleted })
        remoteGate.complete(Unit)
        runCurrent()
        assertEquals(localWrites, remoteWrites)
    }

    @Test
    fun `failed local save does not prevent a later retry from persisting`() = runTest {
        val failures = mutableListOf<Exception>()
        val queue = queue(failures = failures)
        val first = queue.submit(initialOwner, { throw IOException("disk busy") }, {})
        var stored = false
        var synced = false
        val retry = queue.submit(initialOwner, { stored = true }, { synced = true })
        runCurrent()
        assertTrue(first.localSaved.isCancelled)
        retry.localSaved.await()
        assertTrue(stored)
        assertTrue(synced)
        assertEquals(1, failures.size)
    }

    @Test
    fun `exit is ready after durable local write without waiting for a slow network`() = runTest {
        val queue = queue()
        var storedPosition = 0L
        val pending = queue.submit(
            initialOwner,
            saveLocal = { delay(25); storedPosition = 123_000L },
            syncRemote = { delay(30_000) },
        )
        runCurrent()
        assertFalse(pending.localSaved.isCompleted)
        advanceTimeBy(25)
        runCurrent()
        pending.localSaved.await()
        assertEquals(123_000L, storedPosition)
        assertEquals(25L, testScheduler.currentTime)
        assertFalse(pending.completion.isCompleted)
        advanceTimeBy(30_000)
        runCurrent()
        assertTrue(pending.completion.isCompleted)
    }

    @Test
    fun `an in flight network save cannot block a newer local exit save`() = runTest {
        val queue = queue()
        val remoteGate = CompletableDeferred<Unit>()
        val syncedPositions = mutableListOf<Int>()
        var localPosition = 0
        queue.submit(initialOwner, { localPosition = 10 }, {
            remoteGate.await()
            syncedPositions.add(10)
        })
        runCurrent()
        val exit = queue.submit(initialOwner, { localPosition = 20 }, { syncedPositions.add(20) })
        runCurrent()
        exit.localSaved.await()
        assertEquals(20, localPosition)
        assertTrue(syncedPositions.isEmpty())
        remoteGate.complete(Unit)
        runCurrent()
        assertEquals(listOf(10, 20), syncedPositions)
        assertTrue(exit.completion.isCompleted)
    }

    @Test
    fun `leaving the player caller does not cancel the queued sync`() = runTest {
        val queue = queue()
        val remoteGate = CompletableDeferred<Unit>()
        var synced = false
        val caller = CoroutineScope(coroutineContext + Job())
        val navigation = caller.launch {
            queue.submit(initialOwner, {}, { remoteGate.await(); synced = true }).localSaved.await()
        }
        runCurrent()
        assertTrue(navigation.isCompleted)
        caller.cancel()
        remoteGate.complete(Unit)
        runCurrent()
        assertTrue(synced)
    }

    @Test
    fun `profile switch cancels in flight and queued remote work`() = runTest {
        val owners = MutableStateFlow(initialOwner)
        val queue = queue(owners)
        val calls = mutableListOf<String>()
        val first = queue.submit(initialOwner, {}, { delay(10_000); calls.add("old-first") })
        val second = queue.submit(initialOwner, {}, { calls.add("old-second") })
        runCurrent()
        owners.value = initialOwner.copy(profileId = "profile-b")
        runCurrent()
        val stale = queue.submit(initialOwner, { calls.add("stale-local") }, { calls.add("stale-remote") })
        val fresh = queue.submit(owners.value, { calls.add("new-local") }, { calls.add("new-remote") })
        runCurrent()
        assertTrue(first.completion.isCancelled)
        assertTrue(second.completion.isCancelled)
        assertTrue(stale.localSaved.isCancelled)
        assertTrue(fresh.completion.isCompleted)
        assertEquals(listOf("new-local", "new-remote"), calls)
    }

    @Test
    fun `account switch also cancels old work even when profile id stays the same`() = runTest {
        val owners = MutableStateFlow(initialOwner)
        val queue = queue(owners)
        var synced = false
        val pending = queue.submit(initialOwner, {}, { delay(10_000); synced = true })
        runCurrent()
        owners.value = initialOwner.copy(accountId = "account-b")
        runCurrent()
        advanceTimeBy(10_000)
        runCurrent()
        assertTrue(pending.completion.isCancelled)
        assertFalse(synced)
    }

    @Test
    fun `local write failure is surfaced and never starts network sync`() = runTest {
        val failures = mutableListOf<Exception>()
        val queue = queue(failures = failures)
        val failure = IOException("disk full")
        var synced = false
        val pending = queue.submit(initialOwner, { throw failure }, { synced = true })
        runCurrent()
        val result = runCatching { pending.localSaved.await() }
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals(failure.message, result.exceptionOrNull()?.message)
        assertEquals(listOf(failure), failures)
        assertFalse(synced)
    }

    @Test
    fun `network failure does not invalidate already durable local progress`() = runTest {
        val failures = mutableListOf<Exception>()
        val queue = queue(failures = failures)
        val failure = IOException("offline")
        val pending = queue.submit(initialOwner, {}, { throw failure })
        runCurrent()
        pending.localSaved.await()
        assertEquals(listOf(failure), failures)
        assertTrue(pending.completion.isCompleted)
        assertFalse(pending.localSaved.isCancelled)
    }
}
