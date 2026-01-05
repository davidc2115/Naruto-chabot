const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Plugin Expo pour configurer le network_security_config
 * Permet les connexions HTTP (cleartext) pour l'API Freebox
 */
module.exports = function withNetworkSecurityConfig(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Trouver l'élément <application>
    const application = androidManifest.manifest.application[0];
    
    // Ajouter l'attribut networkSecurityConfig
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    
    // S'assurer que usesCleartextTraffic est à true
    application.$['android:usesCleartextTraffic'] = 'true';
    
    console.log('✅ Plugin: network_security_config configuré');
    
    return config;
  });
};
