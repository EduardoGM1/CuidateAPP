package com.clinicamovil

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.wenkesj.voice.VoicePackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    val packages = PackageList(this).packages.toMutableList()
    // Registrar VoicePackage manualmente para asegurar que esté disponible
    packages.add(0, VoicePackage())
    getDefaultReactHost(
      context = applicationContext,
      packageList = packages,
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
