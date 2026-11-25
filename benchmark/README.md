# Benchmarks

Macrobenchmarks for the Android TV app: cold startup, Home/Details D-pad frame timing and baseline profile generation. They measure the release-grade `staging` build (package `com.arvio.tv.beta`), never the debug build.

## Prerequisites

- A physical Android TV / Fire TV device or an API 28+ emulator, connected via `adb` and unlocked.
- Install the staging build once and sign in, so Home has content:
  `./gradlew :app:installSideloadStaging`
- Benchmarks only read the app's existing data; they cannot log in.

## Run

```powershell
# Cold startup, without and with the baseline profile
./gradlew :benchmark:connectedSideloadStagingAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.arflix.tv.benchmark.StartupBenchmark

# Frame timing while moving the D-pad on Home and Details (look at frameDurationCpuMs P50/P90/P99 and frameOverrunMs)
./gradlew :benchmark:connectedSideloadStagingAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.arflix.tv.benchmark.ScrollBenchmark
```

Results are written to `benchmark/build/outputs/connected_android_test_additional_output/`.

## Regenerate the baseline profile

```powershell
./gradlew :benchmark:connectedSideloadStagingAndroidTest -Pandroid.testInstrumentationRunnerArguments.class=com.arflix.tv.benchmark.BaselineProfileGenerator
```

Copy the generated `*-baseline-prof.txt` from `benchmark/build/outputs/connected_android_test_additional_output/` into `app/src/main/baseline-prof.txt`, keeping the wildcard rules at the end of that file.
