package com.rotationreminder.app.wear;

import android.content.Context;
import android.content.SharedPreferences;
import androidx.annotation.NonNull;
import androidx.wear.tiles.ActionBuilders;
import androidx.wear.tiles.ColorBuilders;
import androidx.wear.tiles.DimensionBuilders;
import androidx.wear.tiles.LayoutElementBuilders;
import androidx.wear.tiles.ModifiersBuilders;
import androidx.wear.tiles.RequestBuilders;
import androidx.wear.tiles.TileBuilders;
import androidx.wear.tiles.TileService;
import androidx.wear.tiles.TimelineBuilders;
import com.google.common.util.concurrent.Futures;
import com.google.common.util.concurrent.ListenableFuture;

public class RotationTileService extends TileService {

    private static final String RESOURCES_VERSION = "1";

    @NonNull
    @Override
    protected ListenableFuture<TileBuilders.Tile> onTileRequest(@NonNull RequestBuilders.TileRequest requestParams) {
        SharedPreferences prefs = getSharedPreferences(WearScheduleListenerService.PREFS_NAME, Context.MODE_PRIVATE);
        String nextTime = prefs.getString(WearScheduleListenerService.KEY_NEXT_TIME, "02:00 PM");
        String profileName = prefs.getString(WearScheduleListenerService.KEY_PROFILE_NAME, "(Standard 10-Day Block)");

        // Click Action: Launch WearMainActivity
        ActionBuilders.LaunchAction launchAction = new ActionBuilders.LaunchAction.Builder()
                .setAndroidActivity(new ActionBuilders.AndroidActivity.Builder()
                        .setPackageName(getPackageName())
                        .setClassName(WearMainActivity.class.getName())
                        .build())
                .build();

        ModifiersBuilders.Clickable clickable = new ModifiersBuilders.Clickable.Builder()
                .setId("open_wear_app")
                .setOnClick(launchAction)
                .build();

        ModifiersBuilders.Modifiers modifiers = new ModifiersBuilders.Modifiers.Builder()
                .setClickable(clickable)
                .build();

        // 1. Title Label: "NEXT ROTATION"
        LayoutElementBuilders.Text titleText = new LayoutElementBuilders.Text.Builder()
                .setText("NEXT ROTATION")
                .setFontStyle(new LayoutElementBuilders.FontStyle.Builder()
                        .setSize(DimensionBuilders.sp(10))
                        .setColor(ColorBuilders.argb(0xFF94A3B8))
                        .build())
                .build();

        // 2. Main Time: e.g. "02:00 PM"
        LayoutElementBuilders.Text timeText = new LayoutElementBuilders.Text.Builder()
                .setText(nextTime)
                .setFontStyle(new LayoutElementBuilders.FontStyle.Builder()
                        .setSize(DimensionBuilders.sp(22))
                        .setColor(ColorBuilders.argb(0xFFFFFFFF))
                        .build())
                .build();

        // 3. Profile Subtitle: e.g. "(Standard 10-Day Block)"
        LayoutElementBuilders.Text profileText = new LayoutElementBuilders.Text.Builder()
                .setText(profileName)
                .setFontStyle(new LayoutElementBuilders.FontStyle.Builder()
                        .setSize(DimensionBuilders.sp(11))
                        .setColor(ColorBuilders.argb(0xFFA5B4FC))
                        .build())
                .build();

        // 4. Action Prompt: "Tap for 40x Pacer ▶"
        LayoutElementBuilders.Text actionPrompt = new LayoutElementBuilders.Text.Builder()
                .setText("Start 40x Pacer ▶")
                .setFontStyle(new LayoutElementBuilders.FontStyle.Builder()
                        .setSize(DimensionBuilders.sp(12))
                        .setColor(ColorBuilders.argb(0xFF34D399))
                        .build())
                .build();

        // Column containing all text elements
        LayoutElementBuilders.Column column = new LayoutElementBuilders.Column.Builder()
                .addContent(titleText)
                .addContent(new LayoutElementBuilders.Spacer.Builder().setHeight(DimensionBuilders.dp(4)).build())
                .addContent(timeText)
                .addContent(new LayoutElementBuilders.Spacer.Builder().setHeight(DimensionBuilders.dp(2)).build())
                .addContent(profileText)
                .addContent(new LayoutElementBuilders.Spacer.Builder().setHeight(DimensionBuilders.dp(8)).build())
                .addContent(actionPrompt)
                .build();

        // Root Box with click modifiers
        LayoutElementBuilders.Box rootBox = new LayoutElementBuilders.Box.Builder()
                .setWidth(DimensionBuilders.expand())
                .setHeight(DimensionBuilders.expand())
                .setModifiers(modifiers)
                .addContent(column)
                .build();

        LayoutElementBuilders.Layout layout = new LayoutElementBuilders.Layout.Builder()
                .setRoot(rootBox)
                .build();

        TimelineBuilders.TimelineEntry timelineEntry = new TimelineBuilders.TimelineEntry.Builder()
                .setLayout(layout)
                .build();

        TimelineBuilders.Timeline timeline = new TimelineBuilders.Timeline.Builder()
                .addTimelineEntry(timelineEntry)
                .build();

        TileBuilders.Tile tile = new TileBuilders.Tile.Builder()
                .setResourcesVersion(RESOURCES_VERSION)
                .setTimeline(timeline)
                .setFreshnessIntervalMillis(1800000)
                .build();

        return Futures.immediateFuture(tile);
    }

    @NonNull
    @Override
    protected ListenableFuture<androidx.wear.protolayout.ResourceBuilders.Resources> onTileResourcesRequest(@NonNull RequestBuilders.ResourcesRequest requestParams) {
        androidx.wear.protolayout.ResourceBuilders.Resources resources = new androidx.wear.protolayout.ResourceBuilders.Resources.Builder()
                .setVersion(RESOURCES_VERSION)
                .build();
        return Futures.immediateFuture(resources);
    }
}
