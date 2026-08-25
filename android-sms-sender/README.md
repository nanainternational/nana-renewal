# Nana SMS Sender

웹의 SMS 1건 발송 작업을 약 2초마다 확인하고 업무폰 SIM의 `SmsManager`로 전송하는 사내용 테스트 앱입니다.

## 빌드

1. 최초 1회 `keytool`로 release signing key를 생성하고 안전한 비밀 저장소에 백업합니다. **업데이트 APK도 반드시 같은 key를 사용해야 합니다.** 저장소에는 signing key와 비밀번호를 커밋하지 않습니다.
2. 서버와 빌드 환경에 동일한 충분히 긴 임의 문자열을 `SMS_DEVICE_API_KEY`로 설정합니다.
3. Android Studio에서 이 폴더를 열고 JDK 17 및 Android SDK 35를 설치합니다.
4. 아래 환경 변수를 설정한 뒤 release APK를 빌드합니다.

```bash
export SMS_DEVICE_API_KEY='서버와-동일한-비밀키'
export NANA_SMS_KEYSTORE_FILE='/secure/path/nana-sms-release.jks'
export NANA_SMS_KEYSTORE_PASSWORD='키스토어-비밀번호'
export NANA_SMS_KEY_ALIAS='nana-sms'
export NANA_SMS_KEY_PASSWORD='키-비밀번호'
gradle assembleRelease
```

APK는 `app/build/outputs/apk/release/app-release.apk`에 생성됩니다. 웹에서 인증된 사용자만 내려받을 수 있도록 배포 서버의 공개 정적 폴더가 아닌 `server/private-apk/nana-sms-sender.apk`로 복사합니다. 해당 디렉터리의 APK는 Git에서 제외됩니다.

```bash
cp app/build/outputs/apk/release/app-release.apk ../server/private-apk/nana-sms-sender.apk
```

`applicationId`는 `com.nanainter.smssender`로 고정되어 있습니다. 추후 업데이트 시 `versionCode`를 올리고 위 signing key를 그대로 사용하십시오. 업무폰에 직접 설치한 뒤 SMS 권한을 허용하고 HTTPS 서버 주소와 단말기 이름을 입력합니다.

서버에는 `SMS_DEVICE_API_KEY`와 관리자 이메일 목록인 `SMS_ADMIN_EMAILS`(미설정 시 `ADMIN_EMAILS`)가 필요합니다. 키는 APK에 포함되므로 사내 배포만 하고 노출 시 즉시 교체하십시오.
