#include <jni.h>
#include <string>
#include <mutex>
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

extern "C" {

JNIEXPORT jint JNICALL
JNI_OnLoad(JavaVM* vm, void* reserved) {
    g_jvm = vm;
    return JNI_VERSION_1_6;
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeInit(
        JNIEnv* env, jobject thiz, jstring clientIdStr, jobject callback) {
    const char* clientIdChars = clientIdStr ? env->GetStringUTFChars(clientIdStr, nullptr) : nullptr;
    std::string clientId = clientIdChars ? clientIdChars : "";
    if (clientIdChars) {
        env->ReleaseStringUTFChars(clientIdStr, clientIdChars);
    }
    LOGI("nativeInit called with client ID: %s", clientId.c_str());

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
        // Initialize the Discord Social SDK Client
        g_discordClient = std::make_unique<discordpp::Client>();
        if (!clientId.empty()) {
            g_discordClient->SetApplicationId(std::stoull(clientId));
        }
        
        // Wire up connection and status callbacks
        g_discordClient->SetStatusChangedCallback([](discordpp::Client::Status status, discordpp::Client::Error error, int32_t errorDetail) {
            LOGI("Discord native status changed: %d, error: %d, detail: %d", 
                 static_cast<int>(status), static_cast<int>(error), errorDetail);
            
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
                        int kotlinStatus = 0; // Disconnected
                        if (status == discordpp::Client::Status::Connected || status == discordpp::Client::Status::Ready) {
                            kotlinStatus = 1; // Connected
                        } else if (status == discordpp::Client::Status::Connecting || status == discordpp::Client::Status::Reconnecting) {
                            kotlinStatus = 2; // Connecting
                        }
                        callbackEnv->CallVoidMethod(g_callbackObj, method, 
                                                    static_cast<jint>(kotlinStatus), 
                                                    static_cast<jint>(error), 
                                                    static_cast<jint>(errorDetail));
                    }
                }
                
                if (attached) {
                    g_jvm->DetachCurrentThread();
                }
            }
        });
        
        LOGI("Discord Social SDK Client initialized successfully.");
    } catch (const std::exception& e) {
        LOGE("Failed to initialize Discord Social SDK: %s", e.what());
    }
#else
    LOGW("Discord Social SDK is not compiled in. Native init fallback active.");
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeConnect(
        JNIEnv* env, jobject thiz, jstring accessTokenStr) {
    const char* tokenChars = accessTokenStr ? env->GetStringUTFChars(accessTokenStr, nullptr) : nullptr;
    std::string accessToken = tokenChars ? tokenChars : "";
    if (tokenChars) {
        env->ReleaseStringUTFChars(accessTokenStr, tokenChars);
    }
    LOGI("nativeConnect requested with %s token.", accessToken.empty() ? "empty (unauthenticated)" : "provided");

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        if (!accessToken.empty()) {
            LOGI("Updating token in Discord Social SDK...");
            g_discordClient->UpdateToken(discordpp::AuthorizationTokenType::Bearer, accessToken, [](discordpp::ClientResult result) {
                LOGI("UpdateToken completed. Successful: %s, Message: %s", 
                     result.Successful() ? "true" : "false", result.ToString().c_str());
                if (result.Successful()) {
                    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
                    if (g_discordClient) {
                        LOGI("Initiating client connect to Discord...");
                        g_discordClient->Connect();
                    }
                } else {
                    LOGE("Failed to update token: %s", result.ToString().c_str());
                }
            });
        } else {
            LOGI("Initiating unauthenticated direct client connect to Discord...");
            g_discordClient->Connect();
        }
    } else {
        LOGE("Discord Client is not initialized.");
    }
#else
    LOGW("Discord Social SDK is not compiled in. Native connect stub callback active.");
    // Mock connection status change: 1 = Connected
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
                callbackEnv->CallVoidMethod(g_callbackObj, method, 1, 0, 0);
            }
        }
        
        if (attached) {
            g_jvm->DetachCurrentThread();
        }
    }
#endif
}

JNIEXPORT void JNICALL
Java_com_arflix_tv_ui_screens_details_discord_DiscordBridge_nativeUpdateActivity(
        JNIEnv* env, jobject thiz,
        jstring detailsStr, jstring stateStr,
        jlong startTime, jlong endTime,
        jstring largeImageStr, jstring largeTextStr) {
    
    const char* detailsChars = detailsStr ? env->GetStringUTFChars(detailsStr, nullptr) : nullptr;
    std::string details = detailsChars ? detailsChars : "";
    if (detailsChars) env->ReleaseStringUTFChars(detailsStr, detailsChars);

    const char* stateChars = stateStr ? env->GetStringUTFChars(stateStr, nullptr) : nullptr;
    std::string state = stateChars ? stateChars : "";
    if (stateChars) env->ReleaseStringUTFChars(stateStr, stateChars);

    const char* largeImageChars = largeImageStr ? env->GetStringUTFChars(largeImageStr, nullptr) : nullptr;
    std::string largeImage = largeImageChars ? largeImageChars : "";
    if (largeImageChars) env->ReleaseStringUTFChars(largeImageStr, largeImageChars);

    const char* largeTextChars = largeTextStr ? env->GetStringUTFChars(largeTextStr, nullptr) : nullptr;
    std::string largeText = largeTextChars ? largeTextChars : "";
    if (largeTextChars) env->ReleaseStringUTFChars(largeTextStr, largeTextChars);

    LOGI("nativeUpdateActivity: Details='%s', State='%s'", details.c_str(), state.c_str());

#if HAS_DISCORD_SDK
    std::lock_guard<std::recursive_mutex> lock(g_discordMutex);
    if (g_discordClient) {
        discordpp::Activity activity{};
        activity.SetType(discordpp::ActivityTypes::Watching);
        if (!details.empty()) {
            activity.SetDetails(details);
        }
        if (!state.empty() && state.length() >= 2) {
            activity.SetState(state);
        }
        
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
        
        if (!largeImage.empty()) {
            discordpp::ActivityAssets assets{};
            assets.SetLargeImage(largeImage);
            if (!largeText.empty()) {
                assets.SetLargeText(largeText);
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
    // Mock connection status change: 0 = Disconnected
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
                callbackEnv->CallVoidMethod(g_callbackObj, method, 0, 0, 0);
            }
        }
        
        if (attached) {
            g_jvm->DetachCurrentThread();
        }
    }
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
