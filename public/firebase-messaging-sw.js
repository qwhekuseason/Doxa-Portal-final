importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.0/firebase-messaging.js');

firebase.initializeApp({
    apiKey: "AIzaSyBzRl83ISEt9eM0sj4eXaA1y6EMTQ8QRTU",
    authDomain: "doxa-portal.firebaseapp.com",
    projectId: "doxa-portal",
    storageBucket: "doxa-portal.firebasestorage.app",
    messagingSenderId: "474898750084",
    appId: "1:474898750084:web:e782e1f3a8baa8f93f80d1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    // Customize notification here
    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // Ensure logo.png exists in public
        badge: '/logo.png'
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
