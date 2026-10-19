package com.rotationreminder.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNativeNotificationChannels();
    }

    private void createNativeNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager == null) return;

            String[] tones = new String[]{"classic", "crystal", "double", "woodblock", "marimba"};
            String pkg = getPackageName();

            AudioAttributes alarmAudioAttributes = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setFlags(AudioAttributes.FLAG_AUDIBILITY_ENFORCED)
                .build();

            for (String tone : tones) {
                Uri soundUri = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://" + pkg + "/raw/ring_" + tone);
                String toneLabel = Character.toUpperCase(tone.charAt(0)) + tone.substring(1);

                // 1. Sound + Vibrate Channel (alarm_${tone}_sv_v3)
                String idSV = "alarm_" + tone + "_sv_v3";
                NotificationChannel chanSV = new NotificationChannel(
                    idSV,
                    "Rotation: " + toneLabel + " (Sound & Vibrate)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                chanSV.setDescription("Alarm audio stream with double-pulse vibration");
                chanSV.setSound(soundUri, alarmAudioAttributes);
                chanSV.enableVibration(true);
                chanSV.setVibrationPattern(new long[]{0, 400, 200, 400});
                chanSV.setBypassDnd(true);
                chanSV.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                chanSV.enableLights(true);
                chanSV.setLightColor(0xFF4F46E5);
                manager.createNotificationChannel(chanSV);

                // 2. Sound Only Channel (alarm_${tone}_so_v3)
                String idSO = "alarm_" + tone + "_so_v3";
                NotificationChannel chanSO = new NotificationChannel(
                    idSO,
                    "Rotation: " + toneLabel + " (Sound Only)",
                    NotificationManager.IMPORTANCE_HIGH
                );
                chanSO.setDescription("Alarm audio stream without vibration");
                chanSO.setSound(soundUri, alarmAudioAttributes);
                chanSO.enableVibration(false);
                chanSO.setVibrationPattern(new long[]{0L});
                chanSO.setBypassDnd(true);
                chanSO.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                chanSO.enableLights(true);
                chanSO.setLightColor(0xFF4F46E5);
                manager.createNotificationChannel(chanSO);
            }

            // 3. Vibrate Only Channel (alarm_vibrate_only_v3)
            String idVO = "alarm_vibrate_only_v3";
            NotificationChannel chanVO = new NotificationChannel(
                idVO,
                "Rotation: Vibrate Only (Silent)",
                NotificationManager.IMPORTANCE_HIGH
            );
            chanVO.setDescription("High-priority silent alert with triple-pulse vibration");
            chanVO.setSound(null, null);
            chanVO.enableVibration(true);
            chanVO.setVibrationPattern(new long[]{0, 500, 200, 500, 200, 600});
            chanVO.setBypassDnd(true);
            chanVO.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
            chanVO.enableLights(true);
            chanVO.setLightColor(0xFF4F46E5);
            manager.createNotificationChannel(chanVO);
        }
    }
}
