cmake_minimum_required(VERSION 3.22.1)
project(arvio_native)

# Configure C++ standard compiler flags
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Search for the Prefab-distributed Discord SDK package
find_package(discord_partner_sdk CONFIG QUIET)

add_library(arvio_native SHARED
    discord_bridge.cpp
)

target_link_libraries(arvio_native PRIVATE
    log
    android
)

if(discord_partner_sdk_FOUND)
    message(STATUS "Discord Partner SDK package found in prefab CONFIG!")
    target_link_libraries(arvio_native PRIVATE
        discord_partner_sdk::discord_partner_sdk
    )
    target_compile_definitions(arvio_native PRIVATE HAS_DISCORD_SDK=1)
else()
    message(WARNING "Discord Partner SDK package not found! Compiling native JNI bridge with stub/no-op fallback.")
    target_compile_definitions(arvio_native PRIVATE HAS_DISCORD_SDK=0)
endif()
