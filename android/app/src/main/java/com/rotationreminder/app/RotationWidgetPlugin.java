package com.rotationreminder.app;

import android.content.Context;
import android.util.Log;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.wearable.PutDataMapRequest;
import com.google.android.gms.wearable.PutDataRequest;
import com.google.android.gms.wearable.Wearable;

@CapacitorPlugin(name = "RotationWidget")
public class RotationWidgetPlugin extends Plugin {

    private static final String TAG = "RotationWidgetPlugin";
    private static String sPendingRoute = null;

    public static void setPendingRoute(String route) {
        sPendingRoute = route;
    }

    public static String getAndClearPendingRoute() {
        String route = sPendingRoute;
        sPendingRoute = null;
        return route;
    }

    @PluginMethod
    public void getPendingRoute(PluginCall call) {
        String route = getAndClearPendingRoute();
        JSObject ret = new JSObject();
        ret.put("route", route);
        call.resolve(ret);
    }

    @PluginMethod
    public void updateWidget(PluginCall call) {
        String nextTime = call.getString("nextTime", "02:00 PM");
        String profileName = call.getString("profileName", "(Standard 10-Day Block)");
        String cadence = call.getString("cadence", "Every 2h");
        String status = call.getString("status", "● Scheduled");

        Context context = getContext();

        // 1. Update native Android home screen widgets
        RotationWidgetProvider.updateAllWidgets(context, nextTime, profileName, cadence, status);

        // 2. Broadcast schedule sync to paired Google Wear OS devices via Google Play Services Wearable
        try {
            PutDataMapRequest putDataMapReq = PutDataMapRequest.create("/rotation_schedule");
            putDataMapReq.getDataMap().putString(RotationWidgetProvider.KEY_NEXT_TIME, nextTime);
            putDataMapReq.getDataMap().putString(RotationWidgetProvider.KEY_PROFILE_NAME, profileName);
            putDataMapReq.getDataMap().putString(RotationWidgetProvider.KEY_CADENCE, cadence);
            putDataMapReq.getDataMap().putString(RotationWidgetProvider.KEY_STATUS, status);
            putDataMapReq.getDataMap().putLong("timestamp", System.currentTimeMillis());

            PutDataRequest putDataReq = putDataMapReq.asPutDataRequest();
            putDataReq.setUrgent();
            Wearable.getDataClient(context).putDataItem(putDataReq).addOnFailureListener(e -> {
                Log.w(TAG, "Wear OS sync non-fatal error: " + e.getMessage());
            });
        } catch (Exception e) {
            Log.w(TAG, "Wear OS sync skipped or unavailable: " + e.getMessage());
        }

        JSObject ret = new JSObject();
        ret.put("success", true);
        call.resolve(ret);
    }
}
