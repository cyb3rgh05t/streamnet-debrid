cmake_minimum_required(VERSION 3.22.1)
project(arvio_native)

# Configure C++ standard compiler flags
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# This native target is configured only when the private SDK AAR is present.
find_package(discord_partner_sdk CONFIG REQUIRED)

add_library(arvio_native SHARED
    discord_bridge.cpp
)

target_link_libraries(arvio_native PRIVATE
    log
    android
    discord_partner_sdk::discord_partner_sdk
)

target_compile_definitions(arvio_native PRIVATE HAS_DISCORD_SDK=1)
