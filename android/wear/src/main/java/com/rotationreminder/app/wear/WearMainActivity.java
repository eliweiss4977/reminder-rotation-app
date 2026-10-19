package com.rotationreminder.app.wear;

import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import com.google.android.gms.wearable.DataClient;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.Wearable;
import com.rotationreminder.app.R;

public class WearMainActivity extends Activity {

    private TextView nextTimeTv;
    private TextView profileNameTv;
    private TextView pacerCountTv;
    private TextView pacerInstructionTv;
    private Button autoPacerBtn;
    private Button resetBtn;
    private View pacerCircle;

    private int count = 0;
    private static final int TARGET_COUNT = 40;
    private boolean isAutoRunning = false;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private Runnable autoRunnable;
    private Vibrator vibrator;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_wear_main);

        initViews();
        initVibrator();
        loadSchedule();
        fetchScheduleFromPhone();
        setupListeners();
    }

    private void initViews() {
        nextTimeTv = findViewById(R.id.wear_next_time);
        profileNameTv = findViewById(R.id.wear_profile_name);
        pacerCountTv = findViewById(R.id.wear_pacer_count);
        pacerInstructionTv = findViewById(R.id.wear_pacer_instruction);
        autoPacerBtn = findViewById(R.id.wear_btn_auto_pacer);
        resetBtn = findViewById(R.id.wear_btn_reset);
        pacerCircle = findViewById(R.id.wear_pacer_circle);
    }

    private void initVibrator() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            if (vm != null) vibrator = vm.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
    }

    private void loadSchedule() {
        SharedPreferences prefs = getSharedPreferences(WearScheduleListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        String nextTime = prefs.getString(WearScheduleListenerService.KEY_NEXT_TIME, "02:00 PM");
        String profileName = prefs.getString(WearScheduleListenerService.KEY_PROFILE_NAME, "(Standard 10-Day Block)");

        if (nextTimeTv != null) nextTimeTv.setText(nextTime);
        if (profileNameTv != null) profileNameTv.setText(profileName);
    }

    private void fetchScheduleFromPhone() {
        try {
            DataClient dataClient = Wearable.getDataClient(this);
            dataClient.getDataItems().addOnSuccessListener(dataItems -> {
                for (com.google.android.gms.wearable.DataItem item : dataItems) {
                    if ("/rotation_schedule".equals(item.getUri().getPath())) {
                        DataMap map = DataMapItem.fromDataItem(item).getDataMap();
                        String nextTime = map.getString(WearScheduleListenerService.KEY_NEXT_TIME, "02:00 PM");
                        String profile = map.getString(WearScheduleListenerService.KEY_PROFILE_NAME, "(Standard 10-Day Block)");

                        runOnUiThread(() -> {
                            if (nextTimeTv != null) nextTimeTv.setText(nextTime);
                            if (profileNameTv != null) profileNameTv.setText(profile);
                        });
                        break;
                    }
                }
                dataItems.release();
            });
        } catch (Exception ignored) {}
    }

    private void setupListeners() {
        if (pacerCircle != null) {
            pacerCircle.setOnClickListener(v -> incrementCount());
        }

        if (autoPacerBtn != null) {
            autoPacerBtn.setOnClickListener(v -> toggleAutoPacer());
        }

        if (resetBtn != null) {
            resetBtn.setOnClickListener(v -> resetCount());
        }

        autoRunnable = new Runnable() {
            @Override
            public void run() {
                if (isAutoRunning) {
                    incrementCount();
                    if (count < TARGET_COUNT) {
                        handler.postDelayed(this, 1000);
                    } else {
                        stopAutoPacer();
                    }
                }
            }
        };
    }

    private void incrementCount() {
        if (count >= TARGET_COUNT) {
            vibrateCelebration();
            return;
        }

        count++;
        updateCountDisplay();

        if (count >= TARGET_COUNT) {
            vibrateCelebration();
            if (pacerInstructionTv != null) {
                pacerInstructionTv.setText("🎉 40x Rotations Complete!");
            }
            stopAutoPacer();
        } else {
            vibrateTick();
        }
    }

    private void updateCountDisplay() {
        if (pacerCountTv != null) {
            pacerCountTv.setText(String.valueOf(count));
        }
    }

    private void toggleAutoPacer() {
        if (isAutoRunning) {
            stopAutoPacer();
        } else {
            startAutoPacer();
        }
    }

    private void startAutoPacer() {
        if (count >= TARGET_COUNT) count = 0;
        isAutoRunning = true;
        if (autoPacerBtn != null) {
            autoPacerBtn.setText("Pause Pacer ⏸");
        }
        if (pacerInstructionTv != null) {
            pacerInstructionTv.setText("Auto-pacing (1 pulse/sec)...");
        }
        handler.post(autoRunnable);
    }

    private void stopAutoPacer() {
        isAutoRunning = false;
        handler.removeCallbacks(autoRunnable);
        if (autoPacerBtn != null) {
            autoPacerBtn.setText("Start Auto-Pacer ▶");
        }
    }

    private void resetCount() {
        stopAutoPacer();
        count = 0;
        updateCountDisplay();
        if (pacerInstructionTv != null) {
            pacerInstructionTv.setText("Tap circle to count rotations");
        }
    }

    private void vibrateTick() {
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            vibrator.vibrate(VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK));
        } else {
            vibrator.vibrate(40);
        }
    }

    private void vibrateCelebration() {
        if (vibrator == null || !vibrator.hasVibrator()) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0, 200, 100, 300}, -1));
        } else {
            vibrator.vibrate(new long[]{0, 200, 100, 300}, -1);
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        loadSchedule();
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopAutoPacer();
    }
}
