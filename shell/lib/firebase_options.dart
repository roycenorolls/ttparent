import 'dart:io';

import 'package:firebase_core/firebase_core.dart';

// Firebase project tt-teacher-comm (TutorTime Comm). Values from Firebase
// console > Project settings > Your apps; they are public client IDs, not secrets.
final firebaseOptions = Platform.isIOS
    ? const FirebaseOptions(
        apiKey: 'AIzaSyAEWDxGuw-saszaSPO-h4e07nvEBUgca38',
        appId: '1:246411594700:ios:dee8998a7eb20d7c962b69',
        messagingSenderId: '246411594700',
        projectId: 'tt-teacher-comm',
        iosBundleId: 'com.ttcomm.parent',
      )
    : const FirebaseOptions(
        apiKey: 'AIzaSyCwa3gJE-cs-GQHuE5Kc15AUQOGO729Iro',
        appId: '1:246411594700:android:bb09520fcb7eef22962b69',
        messagingSenderId: '246411594700',
        projectId: 'tt-teacher-comm',
      );
