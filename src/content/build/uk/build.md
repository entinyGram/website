# Збірка entinyGram

Ця сторінка поєднує інструкції зі збірки та налаштування Windows. Робочий процес патчсету, підготовку середовища розробки та перевірку патчів див. у [README репозиторію](https://github.com/entaytion/entinyGram#readme).

## Передумови

Передбачається, що ви вже пройшли розділ [Development](https://github.com/entaytion/entinyGram#development) у репозиторії — `bun install`, `bun run setup`, `worktree/` існує і `bun run lint-patches` чистий. Налаштування середовища Windows описано в [Налаштування Windows](#налаштування-windows).

## Вимоги

- **JDK 21** (Microsoft Build of OpenJDK, Temurin або будь-який інший дистрибутив — у CI використовується `temurin@21`).
- **Android SDK**, відповідно до того, що закріплює `TMessagesProj_App/build.gradle`:
  - `compileSdk 36` / `targetSdk 36`, `minSdk 26`
  - `build-tools 36.0.0`
  - `ndk 27.2.12479018`
  - `cmake 3.22.1`

Найпростіший спосіб отримати всі компоненти SDK: встановіть Android Studio і дозвольте майстру першого запуску "Standard" завантажити типовий SDK, а потім дозвольте йому запропонувати встановити точні версії NDK/cmake при першому відкритті `worktree/` (він виявляє закріплені версії з `build.gradle` і пропонує встановити відсутні через **Tools → SDK Manager**, якщо не робить це автоматично).

### Gradle JDK

Власний JetBrains Runtime (`jbr-21`) Android Studio, що показується як типовий `Gradle JDK` для нових проєктів, іноді аварійно завершує демон Gradle ще до старту (`The daemon has terminated unexpectedly on startup attempt #1`). Якщо зіткнулись із цим, вкажіть Gradle на справжній JDK 21:

**Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** → оберіть встановлений JDK 21 (або **Add JDK from disk...** і вкажіть шлях) → **Apply** → повторна синхронізація.

## Налаштування Windows

Це покрокова інструкція з налаштування `entinyGram` на чистій установці Windows (наприклад, після перевстановлення ОС). Збірка/підпис APK описана в розділах нижче, після встановлення Android Studio / JDK / Android SDK.

### 1. Встановлення інструментів

#### Git

Зазвичай уже присутній (`git --version`). Якщо ні — https://git-scm.com/download/win.

#### Bun

PowerShell (без адміністратора):

```powershell
irm bun.sh/install.ps1 | iex
```

Перевірка: `bun --version`.

#### StGit (stacked git)

Сучасний stgit — програма на Rust; є офіційний Windows `.msi`-інсталер (не треба встановлювати Rust/cargo самостійно): https://github.com/stacked-git/stgit/releases → `stgit-<version>.msi`.

Після встановлення `stg.exe` лежить у `C:\Program Files\StGit\bin`.

**Підводний камінь:** якщо `stg --version` падає з `error while loading shared libraries: api-ms-win-crt-locale-l1-1-0.dll` — свіжій установці Windows бракує Visual C++ Redistributable. Встановіть через winget:

```powershell
winget install --id Microsoft.VCRedist.2015+.x64
```

**Підводний камінь:** якщо одразу після встановлення `.msi` термінал усе ще каже "stg: command not found" — інсталер додав `C:\Program Files\StGit\bin` до системного PATH, але вже відкритий термінал (або вже запущений процес) цього не підхопить. Відкрийте новий термінал.

#### Git identity (обовʼязково для stgit)

`stg init` вимагає налаштованого автора комітів:

```powershell
git config --global user.name "Your Name"
git config --global user.email "your@email"
```

#### Windows Developer Mode (обовʼязково для симлінків)

`bun run setup` створює симлінки (`src/fork`, `src/res` → `worktree/...`). За замовчуванням Windows дозволяє створювати симлінки лише з правами адміністратора. Щоб дозволити звичайному користувачу, увімкніть Developer Mode:

**Settings → Privacy & security → For developers → Developer Mode → On.**

Без цього `bun run setup` падає з `EPERM: operation not permitted, symlink`.

### 2. Встановлення залежностей і застосування патчсету

З кореня репозиторію:

```powershell
bun install --ignore-scripts
```

`--ignore-scripts` пропускає нативний крок збірки (`node-gyp`, потребує Python + C++ toolchain на Windows) для транзитивної залежності (`better-sqlite3`), яку нічого в цьому репозиторії не завантажує під час виконання — її підтягує лише імпорт `@mtcute/node/sqlite`, який жоден скрипт тут не робить. Безпечно пропускати назавжди, а не тимчасовий обхід.

```powershell
bun run setup
```

Це зробить:

1. Клонує stock Telegram у `worktree/` (гілка `inugram`).
2. Ініціалізує stgit і застосовує кожен патч із `series` (~399 патчів).
3. Створює симлінки `src/fork` / `src/res` у потрібні місця під `worktree/`.
4. Генерує іконки-дравабли з `ICON_SELECTION`.

Успішний запуск завершується рядком `ok Setup complete`.

### 3. Перевірка

```powershell
bun run lint-patches
```

Виводить список "partial overwrites" між патчами (очікувано — пізніші патчі навмисно перезаписують раніші) — важливо, щоб **код виходу був 0** і не було "full reversions" (це означало б, що патч повністю знищує інший — реальна проблема).

```powershell
cd worktree
stg top      # має показати останній патч із series
stg series   # кожен патч має бути позначений `+` (застосований)
```

### Далі

- Відкрийте `worktree/` в Android Studio для роботи з кодом.
- Збірка APK (JDK 21, Android SDK, `gradlew`, підпис, versionCode) описана в розділах нижче.

## Debug-збірка

```sh
bun run build-debug
```

Еквівалент (з кореня репозиторію або без `cd worktree &&`, якщо ви вже там):

```sh
cd worktree
./gradlew TMessagesProj_App:assembleDebug
```

- **Підпис:** уже налаштовано. Debug build type вказує на `TMessagesProj/config/release.keystore`, що лежить у репозиторії, з відповідними `RELEASE_STORE_PASSWORD` / `RELEASE_KEY_ALIAS` / `RELEASE_KEY_PASSWORD`, уже встановленими в кореневому `gradle.properties`. Локально нічого налаштовувати.
- **Application ID:** debug і release обидва використовують `ua.entaytion.entinygram`; встановлення debug-збірки замінює встановлену release-збірку.
- **Вихід:** `worktree/TMessagesProj_App/build/outputs/apk/debug/app.apk`.
- **versionCode:** локально автозростає з `worktree/.local_build_number` (починається з `1000000`), повністю окремо від CI date-based схеми нижче — для локальних збірок нічого встановлювати не треба.
- **ABI:** за замовчуванням лише `arm64-v8a` (швидкі локальні збірки). Встановіть змінну середовища `ABI_FILTERS` (ABI через кому або `all`) перед запуском Gradle, якщо потрібні інші архітектури, напр. `ABI_FILTERS=all ./gradlew TMessagesProj_App:assembleDebug`. Для x86-емулятора використовуйте `ABI_FILTERS=x86_64` окремо (не перевірено зі списком).
- **Без плагінів vs з плагінами:** типова збірка без плагінів. Підготовка з `bun run setup -- --pluginless` збирає варіант без плагінів; плагіни вмикаються опційно. CI збирає обидва.

Лише `:TMessagesProj_App` — справжній збірний модуль застосунку — `TMessagesProj_AppHuawei`, `TMessagesProj_AppHockeyApp` і `TMessagesProj_AppStandalone` усе ще існують як каталоги, але не включені в `settings.gradle` (їх прибрали патчі `misc/remove-unused-*`).

## Release-збірка

```sh
cd worktree
./gradlew TMessagesProj_App:assembleRelease
```

Ті ж локальні keystore/credentials, що й у debug-збірці вище, з `minifyEnabled true` + `shrinkResources true` (R8/ProGuard) для release-подібної локальної збірки.

Вихід: `worktree/TMessagesProj_App/build/outputs/apk/release/app.apk`.

## Чим це відрізняється від CI

`.github/workflows/apk.yml` запускає ті самі два завдання Gradle (`--no-daemon`), але:

- `INU_BUILD` (справжній `versionCode`) обчислюється `scripts/ci/version.ts` з GitHub-змінної `INU_DAY_STATE` — на основі дати, а не локального лічильника `.local_build_number`. Точний формат див. правило "Release Bumping" у `CLAUDE.md`.
- `COMMIT_ID` встановлюється з `github.sha` (локально автоматично відкочується до `git rev-parse --short HEAD`, тож `verName` все одно отримує суфікс коміту).
- `ABI_FILTERS=arm64-v8a` встановлюється явно (як і локальний типовий).
- У CI може використовуватись інший keystore через змінну середовища `RELEASE_KEYSTORE_PATH` і впроваджені секрети, а не dev-keystore, що лежить у репозиторії.

## Усунення проблем

- **`EPERM: operation not permitted, symlink`** під час `bun run setup` — Windows Developer Mode вимкнено. Див. [Налаштування Windows](#налаштування-windows).
- **Демон Gradle аварійно завершується на старті** — зазвичай це Gradle JDK, див. вище.
- **`stg`/`bun`/`java` "command not found" одразу після встановлення** — зміни PATH застосовуються лише до нових сесій терміналу/процесів, не до вже відкритих.