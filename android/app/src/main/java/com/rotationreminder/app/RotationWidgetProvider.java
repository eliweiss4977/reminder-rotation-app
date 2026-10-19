package com.rotationreminder.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;

public class RotationWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "rotation_widget_prefs";
    public static final String KEY_NEXT_TIME = "widget_next_time";
    public static final String KEY_PROFILE_NAME = "widget_profile_name";
    public static final String KEY_CADENCE = "widget_cadence";
    public static final String KEY_STATUS = "widget_status";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int widgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }

    private static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int widgetId) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String nextTime = prefs.getString(KEY_NEXT_TIME, "02:00 PM");
        String profileName = prefs.getString(KEY_PROFILE_NAME, "(Standard 10-Day Block)");
        String cadence = prefs.getString(KEY_CADENCE, "Every 2h");
        String status = prefs.getString(KEY_STATUS, "● Scheduled");

        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.rotation_widget);
        views.setTextViewText(R.id.widget_next_time, nextTime);
        views.setTextViewText(R.id.widget_profile_name, profileName);
        views.setTextViewText(R.id.widget_countdown_chip, cadence);
        views.setTextViewText(R.id.widget_status_text, status);

        int flagImmutable = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) ? PendingIntent.FLAG_IMMUTABLE : 0;

        // 1. Action Button: Start 40x Pacer via deep link rotationreminder://pacer
        Intent pacerIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("rotationreminder://pacer"));
        pacerIntent.setClass(context, MainActivity.class);
        pacerIntent.putExtra("route", "pacer");
        pacerIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pacerPendingIntent = PendingIntent.getActivity(
            context,
            101,
            pacerIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | flagImmutable
        );
        views.setOnClickPendingIntent(R.id.widget_start_pacer_btn, pacerPendingIntent);

        // 2. Card Root: Launch Main App
        Intent mainIntent = new Intent(context, MainActivity.class);
        mainIntent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent mainPendingIntent = PendingIntent.getActivity(
            context,
            102,
            mainIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | flagImmutable
        );
        views.setOnClickPendingIntent(R.id.widget_root, mainPendingIntent);

        appWidgetManager.updateAppWidget(widgetId, views);
    }

    public static void updateAllWidgets(Context context, String nextTime, String profileName, String cadence, String status) {
        if (context == null) return;
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        if (nextTime != null) editor.putString(KEY_NEXT_TIME, nextTime);
        if (profileName != null) editor.putString(KEY_PROFILE_NAME, profileName);
        if (cadence != null) editor.putString(KEY_CADENCE, cadence);
        if (status != null) editor.putString(KEY_STATUS, status);
        editor.apply();

        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, RotationWidgetProvider.class);
        int[] allWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        for (int widgetId : allWidgetIds) {
            updateAppWidget(context, appWidgetManager, widgetId);
        }
    }
}
