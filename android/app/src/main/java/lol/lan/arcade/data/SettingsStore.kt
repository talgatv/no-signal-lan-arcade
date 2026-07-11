package lol.lan.arcade.data

import android.content.Context
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore by preferencesDataStore(name = "ogh_host_settings")

class SettingsStore(private val context: Context) {

    private object Keys {
        val PORT = intPreferencesKey("port")
        val LANGUAGE = stringPreferencesKey("language")
        val KEEP_SCREEN_ON = booleanPreferencesKey("keep_screen_on")
        val USE_HTTPS = booleanPreferencesKey("use_https")
    }

    val port: Flow<Int> = context.dataStore.data.map { it[Keys.PORT] ?: DEFAULT_PORT }
    val language: Flow<String?> = context.dataStore.data.map { it[Keys.LANGUAGE] }
    val keepScreenOn: Flow<Boolean> = context.dataStore.data.map { it[Keys.KEEP_SCREEN_ON] ?: true }
    val useHttps: Flow<Boolean> = context.dataStore.data.map { it[Keys.USE_HTTPS] ?: false }

    suspend fun setPort(port: Int) {
        context.dataStore.edit { it[Keys.PORT] = port }
    }

    suspend fun setLanguage(languageTag: String?) {
        context.dataStore.edit {
            if (languageTag == null) it.remove(Keys.LANGUAGE) else it[Keys.LANGUAGE] = languageTag
        }
    }

    suspend fun setKeepScreenOn(enabled: Boolean) {
        context.dataStore.edit { it[Keys.KEEP_SCREEN_ON] = enabled }
    }

    suspend fun setUseHttps(enabled: Boolean) {
        context.dataStore.edit { it[Keys.USE_HTTPS] = enabled }
    }

    companion object {
        const val DEFAULT_PORT = 8080
    }
}
