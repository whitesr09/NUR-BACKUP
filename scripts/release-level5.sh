#!/usr/bin/env bash
set -euo pipefail
export APP_ID=app.nur.intentional
export EXPECTED_CERT_SHA256=ec1880cc651af8fe85dc806d1e89a497b1d22dc7f55ec2c7c2e5cef133cf1bcc
: "${NUR_SIGNING_PASSWORD:?Original NUR signing secret is required}"
mkdir -p signing/runtime
base64 -d signing/nur-release.p12.b64 > signing/runtime/nur-release.p12
keytool -exportcert -storetype PKCS12 -keystore signing/runtime/nur-release.p12 -storepass "$NUR_SIGNING_PASSWORD" -alias nur-release -file signing/runtime/nur-cert.der >/dev/null
ACTUAL="$(sha256sum signing/runtime/nur-cert.der | cut -d' ' -f1)"
test "$ACTUAL" = "$EXPECTED_CERT_SHA256" || { echo 'Original signing certificate mismatch.'; exit 1; }
echo 'Original NUR signing identity verified.'
npx cap add android
npx cap sync android
ROOT=android/app/src/main/res
ICON=android-icon/nur-app-icon.png
test -s "$ICON"
for spec in mdpi:48 hdpi:72 xhdpi:96 xxhdpi:144 xxxhdpi:192; do
 density="${spec%%:*}"; size="${spec##*:}"; dest="$ROOT/mipmap-$density"
 mkdir -p "$dest"
 rm -f "$dest/ic_launcher.webp" "$dest/ic_launcher_round.webp" "$dest/ic_launcher.png" "$dest/ic_launcher_round.png" "$dest/ic_launcher.jpg" "$dest/ic_launcher_round.jpg"
 convert "$ICON" -filter Lanczos -resize "${size}x${size}" -strip "$dest/ic_launcher.png"
 cp "$dest/ic_launcher.png" "$dest/ic_launcher_round.png"
done
rm -f "$ROOT/mipmap-anydpi-v26/ic_launcher.xml" "$ROOT/mipmap-anydpi-v26/ic_launcher_round.xml"
mkdir -p "$ROOT/drawable" "$ROOT/values-v31"
cat > "$ROOT/drawable/nur_launch_background.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle"><solid android:color="#030207" /></shape>
XML
cat > "$ROOT/drawable/nur_transparent.xml" <<'XML'
<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="1dp" android:height="1dp" android:viewportWidth="1" android:viewportHeight="1"><path android:fillColor="#00000000" android:pathData="M0,0h1v1h-1z" /></vector>
XML
python3 - <<'PY'
from pathlib import Path
import os,re
p=Path('android/app/src/main/res/values/styles.xml')
s=p.read_text().replace('@drawable/splash','@drawable/nur_launch_background')
for name in ('AppTheme','AppTheme.NoActionBar','AppTheme.NoActionBarLaunch'):
 pat=rf'(<style name="{re.escape(name)}"[^>]*>)(.*?)(</style>)'
 m=re.search(pat,s,re.S)
 if not m:continue
 body=m.group(2)
 for key,val in {'android:windowBackground':'@drawable/nur_launch_background','android:statusBarColor':'#030207','android:navigationBarColor':'#030207'}.items():
  item=rf'<item name="{re.escape(key)}">.*?</item>'
  replacement=f'<item name="{key}">{val}</item>'
  body=re.sub(item,replacement,body,flags=re.S) if re.search(item,body,re.S) else body+'\n'+replacement
 s=s[:m.start()]+m.group(1)+body+m.group(3)+s[m.end():]
p.write_text(s)
Path('android/app/src/main/res/values-v31/styles.xml').write_text('''<?xml version="1.0" encoding="utf-8"?><resources><style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"><item name="windowSplashScreenBackground">#030207</item><item name="windowSplashScreenAnimatedIcon">@drawable/nur_transparent</item><item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item><item name="android:windowBackground">@drawable/nur_launch_background</item><item name="android:statusBarColor">#030207</item><item name="android:navigationBarColor">#030207</item></style></resources>''')
manifest=Path('android/app/src/main/AndroidManifest.xml')
s=manifest.read_text()
for permission in ('android.permission.ACCESS_COARSE_LOCATION','android.permission.ACCESS_FINE_LOCATION'):
 if permission not in s:s=s.replace('<application ',f'<uses-permission android:name="{permission}" />\n    <application ',1)
manifest.write_text(s)
p=Path('android/app/build.gradle');s=p.read_text()
code=str(20000+int(os.environ.get('GITHUB_RUN_NUMBER','1')))
name='2.5.'+os.environ.get('GITHUB_RUN_NUMBER','1')
s,n=re.subn(r'versionCode\s+\d+','versionCode '+code,s)
if n!=1:raise SystemExit('Expected one versionCode')
s,n=re.subn(r'versionName\s+"[^"]+"','versionName "'+name+'"',s)
if n!=1:raise SystemExit('Expected one versionName')
p.write_text(s)
Path('signing/runtime/version.txt').write_text(code+'\n'+name+'\n')
print('Building '+name+' ('+code+')')
PY
(cd android && ./gradlew assembleRelease)
BUILD_TOOLS="$(find "$ANDROID_HOME/build-tools" -mindepth 1 -maxdepth 1 -type d | sort -V | tail -n 1)"
UNSIGNED=android/app/build/outputs/apk/release/app-release-unsigned.apk
ALIGNED=android/app/build/outputs/apk/release/NUR-Level5-aligned.apk
SIGNED=android/app/build/outputs/apk/release/NUR-Level5.apk
test -s "$UNSIGNED"
"$BUILD_TOOLS/zipalign" -f -p 4 "$UNSIGNED" "$ALIGNED"
"$BUILD_TOOLS/apksigner" sign --ks signing/runtime/nur-release.p12 --ks-type PKCS12 --ks-key-alias nur-release --ks-pass env:NUR_SIGNING_PASSWORD --key-pass env:NUR_SIGNING_PASSWORD --out "$SIGNED" "$ALIGNED"
python3 scripts/verify-level5-release.py "$BUILD_TOOLS/apksigner" "$BUILD_TOOLS/aapt" "$SIGNED" "$EXPECTED_CERT_SHA256" "$APP_ID" "$(head -1 signing/runtime/version.txt)"
echo 'Signed Level 5 APK verified.'
