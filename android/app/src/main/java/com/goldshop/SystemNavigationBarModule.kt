package com.goldshop

import android.graphics.Color
import android.os.Build
import androidx.core.view.WindowInsetsControllerCompat
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.uimanager.ViewManager

class SystemNavigationBarModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "SystemNavigationBar"

  @ReactMethod
  fun setAppearance(color: String, useDarkIcons: Boolean, promise: Promise) {
    val activity = currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "Cannot update the navigation bar without an active screen.")
      return
    }

    activity.runOnUiThread {
      try {
        activity.window.navigationBarColor = Color.parseColor(color)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          WindowInsetsControllerCompat(
            activity.window,
            activity.window.decorView,
          ).isAppearanceLightNavigationBars = useDarkIcons
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject("E_NAVIGATION_BAR", "Could not update the navigation bar appearance.", error)
      }
    }
  }
}

class SystemNavigationBarPackage : ReactPackage {
  override fun createNativeModules(
    reactContext: ReactApplicationContext,
  ): List<NativeModule> = listOf(SystemNavigationBarModule(reactContext))

  override fun createViewManagers(
    reactContext: ReactApplicationContext,
  ): List<ViewManager<*, *>> = emptyList()
}
