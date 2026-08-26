#!/usr/bin/env bash
set -euo pipefail

SOURCE_APK="${1:-app/build/outputs/apk/release/app-release.apk}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
TARGET_APK="${SMS_APK_PATH:-${REPO_ROOT}/server/private-apk/nana-sms-sender.apk}"

if [[ ! -f "$SOURCE_APK" ]]; then
  echo "APK를 찾을 수 없습니다: $SOURCE_APK" >&2
  exit 1
fi

python3 - "$SOURCE_APK" <<'PY'
import sys, zipfile
apk = sys.argv[1]
try:
    with zipfile.ZipFile(apk) as archive:
        names = set(archive.namelist())
except zipfile.BadZipFile as error:
    raise SystemExit(f"유효한 APK ZIP이 아닙니다: {error}")
required = {"AndroidManifest.xml", "classes.dex"}
missing = sorted(required - names)
if missing:
    raise SystemExit("필수 APK 항목이 없습니다: " + ", ".join(missing))
PY

if command -v apksigner >/dev/null 2>&1; then
  apksigner verify --verbose "$SOURCE_APK"
fi

mkdir -p "$(dirname "$TARGET_APK")"
TEMP_APK="${TARGET_APK}.tmp"
cp "$SOURCE_APK" "$TEMP_APK"
chmod 0640 "$TEMP_APK"
mv -f "$TEMP_APK" "$TARGET_APK"
echo "APK 배포 완료: $TARGET_APK"
