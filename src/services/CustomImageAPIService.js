import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

/**
 * Service de configuration d'API d'image personnalisée
 * Permet d'utiliser une API hébergée localement (ex: Freebox) pour générer des images
 */
class CustomImageAPIService {
  constructor() {
    this.customApiUrl = null;
    this.apiType = 'pollinations'; // 'pollinations' ou 'custom' ou 'freebox'
  }

  /**
   * Charger la configuration de l'API personnalisée
   */
  async loadConfig() {
    try {
      const config = await AsyncStorage.getItem('custom_image_api');
      if (config) {
        const parsed = JSON.parse(config);
        this.customApiUrl = parsed.url;
        this.apiType = parsed.type || 'pollinations';
      }
    } catch (error) {
      console.error('Error loading custom API config:', error);
    }
  }

  /**
   * Sauvegarder la configuration de l'API personnalisée
   */
  async saveConfig(url, type = 'custom') {
    try {
      const config = { url, type };
      this.customApiUrl = url;
      this.apiType = type;
      await AsyncStorage.setItem('custom_image_api', JSON.stringify(config));
      return true;
    } catch (error) {
      console.error('Error saving custom API config:', error);
      return false;
    }
  }

  /**
   * Supprimer la configuration (revenir à Pollinations)
   */
  async clearConfig() {
    try {
      await AsyncStorage.removeItem('custom_image_api');
      this.customApiUrl = null;
      this.apiType = 'pollinations';
      return true;
    } catch (error) {
      console.error('Error clearing custom API config:', error);
      return false;
    }
  }

  /**
   * Obtenir l'URL de l'API actuelle
   */
  getApiUrl() {
    return this.customApiUrl;
  }

  /**
   * Obtenir le type d'API actuel
   */
  getApiType() {
    return this.apiType;
  }

  /**
   * Vérifier si une API personnalisée est configurée
   */
  hasCustomApi() {
    return this.customApiUrl !== null && this.customApiUrl !== '';
  }

  /**
   * Tester la connexion à l'API personnalisée
   */
  async testConnection(url = null) {
    const testUrl = url || this.customApiUrl;
    
    if (!testUrl) {
      return { success: false, error: 'Aucune URL configurée' };
    }

    try {
      // Test simple avec un timeout court
      const response = await axios.get(testUrl, {
        timeout: 5000,
        validateStatus: (status) => status < 500, // Accepter les redirections
      });

      return {
        success: true,
        status: response.status,
        message: 'Connexion réussie',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Impossible de se connecter à l\'API',
      };
    }
  }

  /**
   * Construire l'URL de génération d'image selon le type d'API
   */
  buildImageUrl(prompt, options = {}) {
    const {
      width = 768,
      height = 768,
      model = 'flux',
      seed = Date.now(),
    } = options;

    if (this.apiType === 'pollinations' || !this.customApiUrl) {
      // API Pollinations par défaut
      const encodedPrompt = encodeURIComponent(prompt);
      return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&enhance=true&seed=${seed}&private=true`;
    }

    if (this.apiType === 'freebox' || this.apiType === 'custom') {
      // API personnalisée - format standard text-to-image
      // La plupart des APIs acceptent ce format
      const encodedPrompt = encodeURIComponent(prompt);
      
      // Si l'URL contient déjà des paramètres, utiliser &, sinon ?
      const separator = this.customApiUrl.includes('?') ? '&' : '?';
      
      return `${this.customApiUrl}${separator}prompt=${encodedPrompt}&width=${width}&height=${height}&seed=${seed}`;
    }

    // Fallback: Pollinations
    const encodedPrompt = encodeURIComponent(prompt);
    return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&enhance=true&seed=${seed}&private=true`;
  }

  /**
   * Guide pour configurer l'API sur Freebox
   */
  getFreeboxSetupGuide() {
    return `
# 🖼️ Configuration API d'Images sur Freebox

## Option 1: Stable Diffusion Web UI (Recommandé)

1. **Installer Stable Diffusion sur votre Freebox/serveur local**
   - Télécharger: https://github.com/AUTOMATIC1111/stable-diffusion-webui
   - Installer sur Freebox Server ou VM

2. **Lancer avec API activée**
   \`\`\`bash
   ./webui.sh --api --listen
   \`\`\`

3. **Trouver votre IP locale**
   - Freebox: généralement 192.168.1.x ou 192.168.0.x
   - Exemple: http://192.168.1.100:7860

4. **URL à configurer dans l'app**
   \`\`\`
   http://192.168.1.100:7860/sdapi/v1/txt2img
   \`\`\`

## Option 2: ComfyUI

1. **Installer ComfyUI**
   - https://github.com/comfyanonymous/ComfyUI

2. **Lancer avec API**
   \`\`\`bash
   python main.py --listen 0.0.0.0
   \`\`\`

3. **URL à configurer**
   \`\`\`
   http://192.168.1.100:8188/api/txt2img
   \`\`\`

## Option 3: Serveur personnalisé simple

Si vous avez un serveur sur votre Freebox, créez un endpoint simple :

\`\`\`python
# simple_image_api.py
from flask import Flask, request, send_file
from diffusers import StableDiffusionPipeline

app = Flask(__name__)
pipe = StableDiffusionPipeline.from_pretrained("runwayml/stable-diffusion-v1-5")

@app.route('/generate', methods=['GET'])
def generate():
    prompt = request.args.get('prompt')
    image = pipe(prompt).images[0]
    image.save('output.png')
    return send_file('output.png', mimetype='image/png')

app.run(host='0.0.0.0', port=5000)
\`\`\`

**URL à configurer**: \`http://192.168.1.100:5000/generate\`

## ⚙️ Configuration dans l'App

1. Aller dans **Paramètres**
2. Section **"API d'Images Personnalisée"**
3. Activer "Utiliser une API personnalisée"
4. Entrer l'URL de votre serveur
5. Tester la connexion
6. Sauvegarder

## 📝 Notes

- Assurez-vous que votre Freebox/serveur est accessible depuis votre réseau local
- L'API doit accepter les requêtes GET avec le paramètre "prompt"
- Pour un accès depuis l'extérieur, configurez le port forwarding sur votre Freebox
- Les images sont générées localement = **ILLIMITÉ** et **GRATUIT** !

## 🔒 Sécurité

- N'exposez PAS votre API sur Internet sans authentification
- Utilisez uniquement sur votre réseau local
- Ou configurez un VPN pour y accéder à distance

## 🚀 Avantages

✅ **Illimité** - Pas de quota
✅ **Gratuit** - Après l'investissement initial
✅ **Privé** - Vos images restent chez vous
✅ **Rapide** - Pas de latence réseau
✅ **Personnalisable** - Vos propres modèles
`;
  }
}

export default new CustomImageAPIService();
