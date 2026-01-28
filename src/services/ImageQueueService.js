/**
 * Service de file d'attente pour la génération d'images
 * v5.4.77 - File d'attente robuste pour Freebox SD
 * - Gère les requêtes multiples séquentiellement
 * - PAS de fallback vers Pollinations (évite les rate limits)
 * - Retry automatique avec backoff exponentiel
 * - Messages utilisateur clairs
 */

class ImageQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentRequest = null;
    this.requestIdCounter = 0;
    
    // v5.4.77 - Configuration optimisée pour Freebox SD
    this.minDelayBetweenRequests = 4000; // 4 secondes entre chaque requête
    this.maxConcurrent = 1; // Une seule requête à la fois
    this.lastRequestTime = 0;
    this.maxRetries = 3; // 3 tentatives avant échec
    this.retryDelays = [5000, 10000, 15000]; // Délais progressifs
    
    // Statistiques
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      queued: 0,
    };
    
    // v5.4.77 - État global pour éviter les messages d'erreur Pollinations
    this.lastError = null;
    this.serverStatus = 'ready'; // 'ready', 'busy', 'error'
  }
  
  /**
   * v5.4.77 - Ajoute une requête à la file d'attente
   * @param {string} prompt - Le prompt de génération
   * @param {object} character - Le personnage (optionnel)
   * @param {function} generateFunction - La fonction de génération Freebox
   */
  addRequest(prompt, character, generateFunction) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestIdCounter;
      
      const queueItem = {
        id: requestId,
        prompt: prompt.substring(0, 100), // Pour les logs
        character: character?.name || 'Unknown',
        generateFunction,
        timestamp: Date.now(),
        resolve,
        reject,
        status: 'pending',
        retries: 0,
      };
      
      this.queue.push(queueItem);
      this.stats.queued++;
      
      const position = this.queue.length;
      const estimatedWait = position * (this.minDelayBetweenRequests / 1000);
      
      console.log(`📋 [Queue] Requête #${requestId} ajoutée`);
      console.log(`   📍 Position: ${position}/${this.queue.length + (this.isProcessing ? 1 : 0)}`);
      console.log(`   ⏱️ Attente estimée: ~${Math.round(estimatedWait)}s`);
      
      // Démarrer le traitement si pas déjà en cours
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * v5.4.77 - Traite la file d'attente séquentiellement
   * SANS fallback vers Pollinations
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    this.serverStatus = 'busy';
    console.log(`🚀 [Queue] Démarrage traitement (${this.queue.length} en attente)`);
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      this.currentRequest = request;
      request.status = 'processing';
      
      const remaining = this.queue.length;
      console.log(`\n🔄 [Queue] Traitement #${request.id} (${request.character})`);
      console.log(`   📋 ${remaining} requête(s) restante(s)`);
      
      let success = false;
      let imageUrl = null;
      let lastError = null;
      
      // v5.4.77 - Tentatives multiples SANS fallback Pollinations
      for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
        try {
          // Attendre le délai minimum entre les requêtes
          await this.waitForDelay();
          
          console.log(`   🎨 Tentative ${attempt + 1}/${this.maxRetries + 1}...`);
          
          // Appeler la fonction de génération Freebox
          imageUrl = await request.generateFunction();
          
          // Valider le résultat
          if (imageUrl && this.isValidImageUrl(imageUrl)) {
            success = true;
            console.log(`   ✅ Succès!`);
            break;
          } else {
            throw new Error('URL image invalide');
          }
          
        } catch (error) {
          lastError = error;
          console.log(`   ⚠️ Échec tentative ${attempt + 1}: ${error.message}`);
          
          // Si encore des tentatives, attendre avant de réessayer
          if (attempt < this.maxRetries) {
            const delay = this.retryDelays[attempt] || 10000;
            console.log(`   ⏳ Nouvelle tentative dans ${delay/1000}s...`);
            await new Promise(r => setTimeout(r, delay));
          }
        }
      }
      
      // Résoudre ou rejeter la promesse
      if (success && imageUrl) {
        request.status = 'completed';
        request.resolve(imageUrl);
        this.stats.successful++;
      } else {
        request.status = 'error';
        this.stats.failed++;
        // v5.4.77 - Message d'erreur SANS mentionner Pollinations ou rate limit
        const errorMsg = 'Serveur d\'images occupé. Veuillez réessayer dans quelques instants.';
        request.reject(new Error(errorMsg));
        this.lastError = lastError?.message || errorMsg;
      }
      
      this.currentRequest = null;
      this.stats.totalProcessed++;
    }
    
    this.isProcessing = false;
    this.serverStatus = 'ready';
    console.log(`\n📋 [Queue] File vide - ${this.stats.successful} succès, ${this.stats.failed} échecs`);
  }
  
  /**
   * v5.4.91 - Valide qu'une URL d'image est correcte
   * FIX: Ne pas vérifier les patterns dans les query params (ex: negative_prompt contient "error")
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Vérifier que c'est une URL valide d'abord
    try {
      const parsedUrl = new URL(url);
      
      // Extraire seulement le hostname et pathname (SANS les query params)
      // Les query params peuvent contenir "error" dans negative_prompt, c'est normal
      const baseUrl = (parsedUrl.origin + parsedUrl.pathname).toLowerCase();
      
      // Patterns d'erreur à rejeter (seulement dans l'URL de base, pas les paramètres)
      const errorPatterns = [
        '/error', '/failed', '/invalid', '/blocked', 
        '/rate_limit', '/rate-limit', '/too_many',
        '/429', '/503', '/502'
      ];
      
      for (const pattern of errorPatterns) {
        if (baseUrl.includes(pattern)) {
          console.log(`⚠️ URL base contient pattern d'erreur: ${pattern}`);
          return false;
        }
      }
      
      // Vérifier le protocole
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return false;
      }
      
      // v5.4.91 - Accepter les URLs Freebox (avec generate et query params)
      if (baseUrl.includes('/generate') || baseUrl.includes('88.174.155.230')) {
        console.log('✅ URL Freebox valide détectée');
        return true;
      }
      
      // Pour les autres URLs (Pollinations, etc.), accepter si format correct
      return true;
      
    } catch (e) {
      console.log(`⚠️ URL invalide: ${e.message}`);
      return false;
    }
  }
  
  /**
   * v5.4.77 - Attend le délai minimum entre les requêtes
   */
  async waitForDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`   ⏳ Pause ${Math.round(waitTime/1000)}s (anti-surcharge)...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * v5.4.77 - Obtient le statut de la file d'attente (pour UI)
   */
  getQueueStatus() {
    const totalPending = this.queue.length + (this.isProcessing ? 1 : 0);
    
    return {
      queueLength: this.queue.length,
      totalPending,
      isProcessing: this.isProcessing,
      serverStatus: this.serverStatus,
      currentRequest: this.currentRequest ? {
        id: this.currentRequest.id,
        character: this.currentRequest.character,
        status: this.currentRequest.status,
      } : null,
      estimatedWaitSeconds: totalPending * (this.minDelayBetweenRequests / 1000),
      stats: { ...this.stats },
    };
  }
  
  /**
   * v5.4.77 - Message d'attente pour l'utilisateur (sans mention de rate limit)
   */
  getWaitMessage() {
    if (!this.isProcessing && this.queue.length === 0) {
      return null;
    }
    
    const totalPending = this.queue.length + (this.isProcessing ? 1 : 0);
    const waitSeconds = totalPending * (this.minDelayBetweenRequests / 1000);
    
    if (this.isProcessing && this.queue.length === 0) {
      return "🖼️ Génération en cours...";
    } else if (totalPending === 1) {
      return "🖼️ Génération en cours...";
    } else if (totalPending <= 3) {
      return `📋 ${totalPending} image(s) en attente (~${Math.round(waitSeconds)}s)`;
    } else {
      return `📋 File d'attente: ${totalPending} images (~${Math.round(waitSeconds)}s)`;
    }
  }
  
  /**
   * v5.4.77 - Position d'une requête dans la file
   */
  getPosition(requestId) {
    if (this.currentRequest && this.currentRequest.id === requestId) {
      return 0; // En cours de traitement
    }
    const index = this.queue.findIndex(r => r.id === requestId);
    return index >= 0 ? index + 1 : -1;
  }
  
  /**
   * v5.4.77 - Annule une requête en attente
   */
  cancelRequest(requestId) {
    const index = this.queue.findIndex(r => r.id === requestId);
    if (index >= 0) {
      const request = this.queue.splice(index, 1)[0];
      request.reject(new Error('Génération annulée'));
      console.log(`🚫 [Queue] Requête #${requestId} annulée`);
      return true;
    }
    return false;
  }
  
  /**
   * v5.4.77 - Vide la file d'attente
   */
  clearQueue() {
    const count = this.queue.length;
    this.queue.forEach(r => r.reject(new Error('File d\'attente vidée')));
    this.queue = [];
    console.log(`🗑️ [Queue] ${count} requêtes supprimées`);
    return count;
  }
  
  /**
   * Reset les statistiques
   */
  resetStats() {
    this.stats = { totalProcessed: 0, successful: 0, failed: 0, queued: 0 };
  }
}

// Singleton
const imageQueueService = new ImageQueueService();
export default imageQueueService;
