package com.rotationreminder.app.wear;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.wear.tiles.TileService;
import com.google.android.gms.wearable.DataEvent;
import com.google.android.gms.wearable.DataEventBuffer;
import com.google.android.gms.wearable.DataMap;
import com.google.android.gms.wearable.DataMapItem;
import com.google.android.gms.wearable.WearableListenerService;

public class WearScheduleListenerService extends WearableListenerService {

    private static final String TAG = "WearScheduleListener";
    public static final String PREFS_NAME = "wear_schedule_prefs";
    public static final String KEY_NEXT_TIME = "widget_next_time";
    public static final String KEY_PROFILE_NAME = "widget_profile_name";
    public static final String KEY_CADENCE = "widget_cadence";
    public static final String KEY_STATUS = "widget_status";

    @Override
    public void onDataChanged(DataEventBuffer dataEvents) {
        for (DataEvent event : dataEvents) {
            if (event.getType() == DataEvent.TYPE_CHANGED && event.getDataItem() != null) {
                String path = event.getDataItem().getUri().getPath();
                if ("/rotation_schedule".equals(path)) {
                    DataMap dataMap = DataMapItem.fromDataItem(event.getDataItem()).getDataMap();
                    String nextTime = dataMap.getString(KEY_NEXT_TIME, "02:00 PM");
                    String profileName = dataMap.getString(KEY_PROFILE_NAME, "(Standard 10-Day Block)");
                    String cadence = dataMap.getString(KEY_CADENCE, "Every 2h");
                    String status = dataMap.getString(KEY_STATUS, "● Scheduled");

                    SharedPreferences prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    prefs.edit()
                            .putString(KEY_NEXT_TIME, nextTime)
                            .putString(KEY_PROFILE_NAME, profileName)
                            .putString(KEY_CADENCE, cadence)
                            .putString(KEY_STATUS, status)
                            .apply();

                    Log.d(TAG, "Wear OS schedule updated: " + nextTime + " (" + profileName + ")");

                    // Refresh Wear OS Tile
                    try {
                        TileService.getUpdater(this).requestUpdate(RotationTileService.class);
                    } catch (Exception e) {
                        Log.w(TAG, "Tile update error: " + e.getMessage());
                    }
                }
            }
        }
    }
}
