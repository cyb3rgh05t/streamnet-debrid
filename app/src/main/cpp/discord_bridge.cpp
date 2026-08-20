#include <jni.h>
#include <string>
#include <mutex>
#include <memory>
#include <algorithm>
#include <android/log.h>

#define LOG_TAG "DiscordBridge"
#define LOGI(...) __android_log_print(ANDROID_LOG_INFO, LOG_TAG, __VA_ARGS__)
#define LOGW(...) __android_log_print(ANDROID_LOG_WARN, LOG_TAG, __VA_ARGS__)
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, LOG_TAG, __VA_ARGS__)

static std::recursive_mutex g_discordMutex;
static JavaVM* g_jvm = nullptr;
static jobject g_callbackObj = nullptr;

#if HAS_DISCORD_SDK
#include <cdiscord.h>
#define DISCORDPP_IMPLEMENTATION
#include <discordpp.h>

static std::unique_ptr<discordpp::Client> g_discordClient = nullptr;
#endif

static std::string jstringToString(JNIEnv* env, jstring jstr) {
    if (!jstr) return "";
    const char* chars = env->GetStringUTFChars(jstr, nullptr);
    if (!chars) return "";
    std::string str(chars);
    env->ReleaseStringUTFChars(jstr, chars);
    return str;
}

static void notifyStatus(int status, int error, int errorDetail) {
    if (g_jvm != nullptr && g_callbackObj != nullptr) {
        JNIEnv* callbackEnv = nullptr;
        jint getEnvStat = g_jvm->GetEnv(reinterpret_cast<void**>(&callbackEnv), JNI_VERSION_1_6);
        bool attached = false;

        if (getEnvStat == JNI_EDETACHED) {
            if (g_jvm->AttachCurrentThread(&callbackEnv, nullptr) == 0) {
                attached = true;
            }
        }

        if (callbackEnv != nullptr) {
            jclass clazz = callbackEnv->GetObjectClass(g_callbackObj);
            jmethodID method = callbackEnv->GetMethodID(clazz, "onStatusChanged", "(III)V");
            if (method != nullptr) {
                callbackEnv->CallVoidMethod(g_callbackObj, method,
                                            static_cast<jint>(status),
                                            static_cast<jint>(error),
                                            static_cast<jint>(errorDetail));
            }
        }

        if (attached) {
            g_jvm->DetachCurrentThread();
        }
    }
}

extern "C" {

JNIEXPORT jint JNICALL
JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeInit(
        JNIEnv* env, jobject thiz, jlong applicationId, jobject callback) {
    LOGI("nativeInit called with application ID: %lld", static_cast<long long>(applicationId));

    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_callbackObj != nullptr) {
        env->DeleteGlobalRef(g_callbackObj);
        g_callbackObj = nullptr;
    }
    if (callback != nullptr) {
        g_callbackObj = env->NewGlobalRef(callback);
    }

#if HAS_DISCORD_SDK
    try {
        if (!g_discordClient) {
            g_discordClient = std::make_unique<discordpp::Client>();
            g_discordClient->SetApplicationId(static_cast<uint64_t>(applicationId));

            g_discordClient->SetStatusChangedCallback([](discordpp::Client::Status status, discordpp::Client::Error error, int32_t errorDetail) {
                LOGI("Discord native status changed: %d, error: %d, detail: %d",
                     static_cast<int>(status), static_cast<int>(error), errorDetail);

                int kotlinStatus = 0; // Disconnected
                if (status == discordpp::Client::Status::Connected || status == discordpp::Client::Status::Ready) {
                    kotlinStatus = 1; // Connected
                } else if (status == discordpp::Client::Status::Connecting || status == discordpp::Client::Status::Reconnecting) {
                    kotlinStatus = 2; // Connecting
                }
                notifyStatus(kotlinStatus, static_cast<int>(error), errorDetail);
            });
            LOGI("Discord Social SDK Client initialized successfully with App ID %lld.", static_cast<long long>(applicationId));
        } else {
            g_discordClient->SetApplicationId(static_cast<uint64_t>(applicationId));
        }
    } catch (const std::exception& e) {
        LOGE("Failed to initialize Discord Social SDK: %s", e.what());
    }
#else
    LOGW("Discord Social SDK is not compiled in. Native init fallback active.");
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeConnect(
        JNIEnv* env, jobject thiz) {
    LOGI("nativeConnect requested (unauthenticated Android RPC).");

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        LOGI("Initiating unauthenticated client connect to Discord...");
        g_discordClient->Connect();
    } else {
        LOGE("Discord Client is not initialized.");
    }
#else
    LOGW("Discord Social SDK is not compiled in. Native connect stub callback active.");
    notifyStatus(1, 0, 0); // Mock Connected
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeUpdateActivity(
        JNIEnv* env, jobject thiz,
        jstring detailsStr, jstring stateStr,
        jlong startTime, jlong endTime,
        jstring largeImageStr, jstring largeTextStr) {

    std::string details = jstringToString(env, detailsStr);
    std::string state = jstringToString(env, stateStr);
    std::string largeImage = jstringToString(env, largeImageStr);
    std::string largeText = jstringToString(env, largeTextStr);

    LOGI("nativeUpdateActivity: Details='%s', State='%s'", details.c_str(), state.c_str());

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        discordpp::Activity activity{};
        activity.SetType(discordpp::ActivityTypes::Watching);

        // Clamp string lengths according to Discord SDK bounds:
        // Details: 2 to 128 chars
        if (details.length() >= 2) {
            if (details.length() > 128) details = details.substr(0, 128);
            activity.SetDetails(details);
        } else if (!details.empty()) {
            activity.SetDetails(details + " "); // Ensure min 2 chars
        }

        // State: 2 to 128 chars
        if (state.length() >= 2) {
            if (state.length() > 128) state = state.substr(0, 128);
            activity.SetState(state);
        }

        // Timestamps: start / end
        discordpp::ActivityTimestamps timestamps{};
        bool hasTimestamps = false;
        if (startTime > 0) {
            timestamps.SetStart(static_cast<uint64_t>(startTime));
            hasTimestamps = true;
        }
        if (endTime > 0) {
            timestamps.SetEnd(static_cast<uint64_t>(endTime));
            hasTimestamps = true;
        }
        if (hasTimestamps) {
            activity.SetTimestamps(timestamps);
        }

        // Assets: LargeImage (1-300 chars URL/key), LargeText (2-128 chars)
        if (!largeImage.empty()) {
            discordpp::ActivityAssets assets{};
            if (largeImage.length() > 300) {
                largeImage = largeImage.substr(0, 300);
            }
            assets.SetLargeImage(largeImage);

            if (largeText.length() >= 2) {
                if (largeText.length() > 128) largeText = largeText.substr(0, 128);
                assets.SetLargeText(largeText);
            } else if (!largeText.empty()) {
                assets.SetLargeText("ARVIO");
            }
            activity.SetAssets(assets);
        }

        g_discordClient->UpdateRichPresence(activity, [](discordpp::ClientResult result) {
            LOGI("UpdateRichPresence native result. Successful: %s, Message: %s",
                 result.Successful() ? "true" : "false", result.ToString().c_str());
        });
    } else {
        LOGE("Discord Client is not initialized.");
    }
#else
    LOGW("Discord Social SDK is not compiled in. Activity update mocked successfully.");
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeClearActivity(
        JNIEnv* env, jobject thiz) {
    LOGI("nativeClearActivity called.");

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        g_discordClient->ClearRichPresence();
        LOGI("Discord Rich Presence cleared.");
    }
#else
    LOGW("Discord Social SDK is not compiled in. Clear activity mocked.");
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeDisconnect(
        JNIEnv* env, jobject thiz) {
    LOGI("nativeDisconnect called.");

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        g_discordClient->Disconnect();
        LOGI("Discord Social SDK Client disconnected.");
    }
#else
    LOGW("Discord Social SDK is not compiled in. Native disconnect stub callback active.");
    notifyStatus(0, 0, 0); // Mock Disconnected
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeTick(
        JNIEnv* env, jobject thiz) {
#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        discordpp::RunCallbacks();
    }
#endif
}

}
