# Building entinyGram

This page combines the build and Windows setup instructions. For the patchset workflow, development setup and patch validation, see the [repository README](https://github.com/entaytion/entinyGram#readme).

## Prerequisites

Assumes you've already run through the repository [Development](https://github.com/entaytion/entinyGram#development) steps — `bun install`, `bun run setup`, `worktree/` exists and `bun run lint-patches` is clean. Windows-specific environment setup is covered in [Windows setup](#windows-setup).

## Requirements

- **JDK 21** (Microsoft Build of OpenJDK, Temurin, or any other distribution — CI uses `temurin@21`).
- **Android SDK**, matching what `TMessagesProj_App/build.gradle` pins:
  - `compileSdk 36` / `targetSdk 36`, `minSdk 26`
  - `build-tools 36.0.0`
  - `ndk 27.2.12479018`
  - `cmake 3.22.1`

The simplest way to get all of the SDK components: install Android Studio and let its first-run "Standard" setup wizard download the default SDK, then let it prompt you to install the exact NDK/cmake versions above the first time you open `worktree/` (it detects the pinned versions from `build.gradle` and offers to install what's missing via **Tools → SDK Manager** if it doesn't do so automatically).

### Gradle JDK

Android Studio's own bundled JetBrains Runtime (`jbr-21`, shown as the default `Gradle JDK` for new projects) can sometimes crash the Gradle daemon before it even starts (`The daemon has terminated unexpectedly on startup attempt #1`). If you hit that, point Gradle at the real JDK 21 install instead:

**Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** → pick your JDK 21 install (or **Add JDK from disk...** and browse to it) → **Apply** → re-sync.

## Windows setup

This is a step-by-step guide to setting up `entinyGram` on a clean Windows install (e.g. after reinstalling the OS). Building/signing the APK is covered in the sections below once Android Studio / JDK / Android SDK are set up.

### 1. Install tools

#### Git

Usually already present (`git --version`). If not — https://git-scm.com/download/win.

#### Bun

PowerShell (no admin needed):

```powershell
irm bun.sh/install.ps1 | iex
```

Verify: `bun --version`.

#### StGit (stacked git)

Modern stgit is a Rust program; there's an official Windows `.msi` installer (no need to install Rust/cargo yourself): https://github.com/stacked-git/stgit/releases → `stgit-<version>.msi`.

After install, `stg.exe` lives in `C:\Program Files\StGit\bin`.

**Gotcha:** if `stg --version` fails with `error while loading shared libraries: api-ms-win-crt-locale-l1-1-0.dll` — a fresh Windows install is missing the Visual C++ Redistributable. Install via winget:

```powershell
winget install --id Microsoft.VCRedist.2015+.x64
```

**Gotcha:** if right after installing the `.msi` your terminal still says "stg: command not found" — the installer added `C:\Program Files\StGit\bin` to the system PATH, but any already open terminal (or already-running process) won't pick that up. Open a new terminal.

#### Git identity (required for stgit)

`stg init` requires a configured commit author:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your@email"
```

#### Windows Developer Mode (required for symlinks)

`bun run setup` creates symlinks (`src/fork`, `src/res` → `worktree/...`). By default Windows only allows creating symlinks with administrator rights. To allow a regular user account to do this, enable Developer Mode:

**Settings → Privacy & security → For developers → Developer Mode → On.**

Without this, `bun run setup` fails with `EPERM: operation not permitted, symlink`.

### 2. Install dependencies and apply the patchset

From the repo root:

```powershell
bun install --ignore-scripts
```

`--ignore-scripts` skips a native build step (`node-gyp`, needs a Python + C++ toolchain on Windows) for a transitive dependency (`better-sqlite3`) that nothing in this repo actually loads at runtime — it's only ever pulled in by importing `@mtcute/node/sqlite`, which no script here does. Safe to skip permanently, not just a temporary workaround.

```powershell
bun run setup
```

This will:

1. Clone stock Telegram into `worktree/` (branch `inugram`).
2. Initialize stgit and apply every patch from `series` (~399 patches).
3. Symlink `src/fork` / `src/res` into the right places under `worktree/`.
4. Generate icon drawables from `ICON_SELECTION`.

A successful run ends with `ok Setup complete`.

### 3. Verify

```powershell
bun run lint-patches
```

Prints a list of "partial overwrites" between patches (expected — later patches intentionally overwrite earlier ones) — what matters is that the **exit code is 0** and there are no "full reversions" (that would mean a patch fully clobbers another one — an actual problem).

```powershell
cd worktree
stg top      # should show the last patch from series
stg series   # every patch should be marked `+` (applied)
```

### Next

- Open `worktree/` in Android Studio to work on the code.
- Building the APK (JDK 21, Android SDK, `gradlew`, signing, versionCode) is covered in the sections below.

## Debug build

```sh
bun run build-debug
```

Equivalent to (run from the repo root, or drop the `cd worktree &&` if you're already there):

```sh
cd worktree
./gradlew TMessagesProj_App:assembleDebug
```

- **Signing:** already handled. The debug build type points at `TMessagesProj/config/release.keystore`, which is checked into the repo, with the matching `RELEASE_STORE_PASSWORD` / `RELEASE_KEY_ALIAS` / `RELEASE_KEY_PASSWORD` already set in the root `gradle.properties`. Nothing to configure locally.
- **Application ID:** debug and release builds both use `ua.entaytion.entinygram`; installing a debug build replaces the installed release build.
- **Output:** `worktree/TMessagesProj_App/build/outputs/apk/debug/app.apk`.
- **versionCode:** locally this auto-increments from `worktree/.local_build_number` (starts at `1000000`), completely separate from the CI date-based scheme below — you don't need to set anything for local builds.
- **ABI:** defaults to `arm64-v8a` only (fast local builds). Set the `ABI_FILTERS` env var (comma-separated ABIs, or `all`) before running Gradle if you need other architectures, e.g. `ABI_FILTERS=all ./gradlew TMessagesProj_App:assembleDebug`. For the x86 emulator, use `ABI_FILTERS=x86_64` on its own (unverified with a list).
- **Pluginless vs plugins:** the default build is pluginless. Setup with `bun run setup -- --pluginless` builds the pluginless variant; plugins are opt-in. CI builds both.

Only `:TMessagesProj_App` is a real, buildable app module — `TMessagesProj_AppHuawei`, `TMessagesProj_AppHockeyApp`, and `TMessagesProj_AppStandalone` still exist as directories but aren't included in `settings.gradle` (they were retired by `misc/remove-unused-*` patches).

## Release build

```sh
cd worktree
./gradlew TMessagesProj_App:assembleRelease
```

Same local keystore/credentials as the debug build above, with `minifyEnabled true` + `shrinkResources true` (R8/ProGuard) for a release-shaped local build.

Output: `worktree/TMessagesProj_App/build/outputs/apk/release/app.apk`.

## How this differs from CI

`.github/workflows/apk.yml` runs the same two Gradle tasks (`--no-daemon`), but:

- `INU_BUILD` (the real `versionCode`) is computed by `scripts/ci/version.ts` from the `INU_DAY_STATE` GitHub variable — date-based, not the local `.local_build_number` counter. See the "Release Bumping" rule in `CLAUDE.md` for the exact format.
- `COMMIT_ID` is set from `github.sha` (locally it falls back to `git rev-parse --short HEAD` automatically, so `verName` still gets a commit suffix either way).
- `ABI_FILTERS=arm64-v8a` is set explicitly (same as the local default).
- Signing in CI may use a different keystore via the `RELEASE_KEYSTORE_PATH` env var and injected secrets, rather than the repo-committed dev keystore used above.

## Troubleshooting

- **`EPERM: operation not permitted, symlink`** during `bun run setup` — Windows Developer Mode isn't on. See [Windows setup](#windows-setup).
- **Gradle daemon crashes on startup** — usually the Gradle JDK, see above.
- **`stg`/`bun`/`java` "command not found" right after installing** — PATH changes only apply to new terminal sessions/processes, not ones already open.