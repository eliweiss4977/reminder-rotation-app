package com.rotationreminder.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.content.Intent;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        if (isDismissIntent(getIntent())) {
            handleDismiss(getIntent());
            super.onCreate(savedInstanceState);
            finish();
            overridePendingTransition(0, 0);
            return;
        }
        registerPlugin(RotationWidgetPlugin.class);
        super.onCreate(savedInstanceState);
        createNativeNotificationChannels();
        handleIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (isDismissIntent(intent)) {
            handleDismiss(intent);
            super.onNewIntent(intent);
            moveTaskToBack(true);
            overridePendingTransition(0, 0);
            return;
        }
        super.onNewIntent(intent);
        setIntent(intent);
        handleIntent(intent);
    }

    private boolean isDismissIntent(Intent intent) {
        if (intent == null) return false;
        String action = intent.getStringExtra("LocalNotificationUserAction");
        if ("DISMISS".equalsIgnoreCase(action)) return true;
        if ("dismiss".equalsIgnoreCase(intent.getStringExtra("action"))) return true;
        return false;
    }

    private void handleDismiss(Intent intent) {
        if (intent == null) return;
        int notifId = intent.getIntExtra("LocalNotificationId", -1);
        if (notifId != -1) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.cancel(notifId);
            }
        }
    }

    private void handleIntent(Intent intent) {
        if (intent == null) return;
        Uri data = intent.getData();
        boolean isPacerRoute = (data != null && "rotationreminder".equals(data.getScheme()) && "pacer".equals(data.getHost()))
                || "pacer".equals(intent.getStringExtra("route"));

        if (isPacerRoute) {
            RotationWidgetPlugin.setPendingRoute("pacer");
            if (getBridge() != null && getBridge().getWebView() != null) {
                getBridge().triggerJSEvent("openPacerModal", "window");
            }
        }
    }

    private void createNativeNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            String[] tones = new String[]{"classic", "crystal", "double", "woodblock", "marimba"};
            String pkg = getPackageName();

            // Clean up legacy v3 channels so v4 channels take full precedence with fresh settings
            for (String tone : tones) {
                try {
                    manager.deleteNotificationChannel("alarm_" + tone + "_sv_v3");
                    manager.deleteNotificationChannel("alarm_" + tone + "_so_v3");
                } catch (Exception ignored) {}
            }
            try {
                manager.deleteNotificationChannel("alarm_vibrate_only_v3");
            } catch (Exception ignored) {}

            AudioAttributes alarmAudioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build();

            for (String tone : tones) {
                Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + pkg + "/raw/ring_" + tone);
                String toneLabel = Character.toUpperCase(tone.charAt(0)) + tone.substring(1);

                // 1. Sound + Vibrate Channel (alarm_${tone}_sv_v4)
                String idSV = "alarm_" + tone + "_sv_v4";
                NotificationChannel chanSV = new NotificationChannel(
                    idSV,
                    "Rotation: " + toneLabel + " (Sound & Vibrate)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                chanSV.setDescription("Alarm audio stream with double-pulse vibration");
                chanSV.setSound(soundUri, alarmAudioAttributes);
                chanSV.enableVibration(true);
                chanSV.setVibrationPattern(new long[]{0, 400, 200, 400});
                chanSV.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                chanSV.enableLights(true);
                chanSV.setLightColor(0xFF4F46E5);
                manager.createNotificationChannel(chanSV);

                // 2. Sound Only Channel (alarm_${tone}_so_v4)
                String idSO = "alarm_" + tone + "_so_v4";
                NotificationChannel chanSO = new NotificationChannel(
                    idSO,
                    "Rotation: " + toneLabel + " (Sound Only)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                chanSO.setDescription("Alarm audio stream without vibration");
                chanSO.setSound(soundUri, alarmAudioAttributes);
                chanSO.enableVibration(false);
                chanSO.setVibrationPattern(new long[]{0L});
                chanSO.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                chanSO.enableLights(true);
                chanSO.setLightColor(0xFF4F46E5);
                manager.createNotificationChannel(chanSO);
            }

            // 3. Vibrate Only Channel (alarm_vibrate_only_v4)
            String idVO = "alarm_vibrate_only_v4";
            NotificationChannel chanVO = new NotificationChannel(
                idVO,
                "Rotation: Vibrate Only (Silent)",
                NotificationManager.IMPORTANCE_HIGH
            );
            chanVO.setDescription("High-priority silent alert with triple-pulse vibration");
            chanVO.setSound(null, null);
            chanVO.enableVibration(true);
            chanVO.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 600});
            chanVO.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            chanVO.enableLights(true);
            chanVO.setLightColor(0xFF4F46E5);
            manager.createNotificationChannel(chanVO);
        }
    }
}
