import re, subprocess, sys
from pathlib import Path
apksigner,aapt,apk,expected,package,version=sys.argv[1:]
assert Path(apk).is_file() and Path(apk).stat().st_size>0
result=subprocess.run([apksigner,'verify','--verbose','--print-certs',apk],check=True,text=True,capture_output=True).stdout
matches=re.findall(r'certificate\s+SHA-256\s+digest\s*:\s*([0-9a-fA-F: ]+)',result,re.I)
certificates={re.sub(r'[^0-9a-f]','',m.lower()) for m in matches}
if certificates!={expected.lower()}:raise SystemExit('Unexpected APK signing certificate.')
text=subprocess.run([aapt,'dump','badging',apk],check=True,text=True,capture_output=True).stdout
line=next((x for x in text.splitlines() if x.startswith('package: ')),None)
if not line:raise SystemExit('APK package metadata is missing.')
fields=dict(re.findall(r"([A-Za-z]+)='([^']*)'",line))
if fields.get('name')!=package or fields.get('versionCode')!=version:raise SystemExit('APK package or version does not match the release.')
if int(version)<=10012:raise SystemExit('APK version is not an update of the previous release.')
print('Verified package '+package+', version '+version+', and original signing certificate.')
