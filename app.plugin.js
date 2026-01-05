const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Plugin Expo pour configurer le network_security_config
 * Permet les connexions HTTP (cleartext) pour l'API Freebox
 */
module.exports = function withNetworkSecurityConfig(config) {
  // 1. Modifier AndroidManifest pour référencer network_security_config
  config = withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;
    
    // Trouver l'élément <application>
    const application = androidManifest.manifest.application[0];
    
    // Ajouter l'attribut networkSecurityConfig
    application.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    
    // S'assurer que usesCleartextTraffic est à true
    application.$['android:usesCleartextTraffic'] = 'true';
    
    console.log('✅ Plugin: AndroidManifest modifié');
    
    return config;
  });

  // 2. Créer le fichier network_security_config.xml
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const resXmlPath = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/res/xml'
      );
      
      // Créer le répertoire xml s'il n'existe pas
      if (!fs.existsSync(resXmlPath)) {
        fs.mkdirSync(resXmlPath, { recursive: true });
        console.log('✅ Plugin: Répertoire res/xml créé');
      }
      
      // Contenu du fichier network_security_config.xml
      const networkSecurityConfig = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <!-- Allow cleartext (HTTP) traffic for all domains -->
    <!-- This is needed for local APIs like Freebox -->
    <base-config cleartextTrafficPermitted="true">
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>
    </base-config>
    
    <!-- Specific domain configurations -->
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">127.0.0.1</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.0.0</domain>
        <domain includeSubdomains="true">192.168.1.0</domain>
        <domain includeSubdomains="true">88.174.155.230</domain>
    </domain-config>
</network-security-config>`;
      
      // Écrire le fichier
      const configPath = path.join(resXmlPath, 'network_security_config.xml');
      fs.writeFileSync(configPath, networkSecurityConfig, 'utf-8');
      console.log('✅ Plugin: network_security_config.xml créé');
      
      return config;
    },
  ]);

  return config;
};
