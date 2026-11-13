package com.qtechx.goldshop

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
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "SystemNavigationBar"

  @ReactMethod
  fun setAppearance(
    navigationBarColor: String,
    useDarkNavigationIcons: Boolean,
    statusBarColor: String,
    useDarkStatusIcons: Boolean,
    promise: Promise,
  ) {
    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.reject(
        "E_NO_ACTIVITY",
        "Cannot update system bars without an active screen.",
      )
      return
    }

    activity.runOnUiThread {
      try {
        val window = activity.window
        window.statusBarColor = Color.parseColor(statusBarColor)
        window.navigationBarColor = Color.parseColor(navigationBarColor)
        val insetsController =
          WindowInsetsControllerCompat(window, window.decorView)
        insetsController.isAppearanceLightStatusBars = useDarkStatusIcons
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          insetsController.isAppearanceLightNavigationBars =
            useDarkNavigationIcons
        }
        promise.resolve(null)
      } catch (error: Exception) {
        promise.reject(
          "E_SYSTEM_BARS",
          "Could not update the system bar appearance.",
          error,
        )
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
