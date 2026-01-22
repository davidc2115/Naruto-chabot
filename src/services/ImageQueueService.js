/**
 * Service de file d'attente pour la génération d'images
 * v5.4.56 - Gère les requêtes multiples sans rate limit
 * FIX: File d'attente améliorée pour Freebox sans fallback Pollinations
 */

class ImageQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentRequest = null;
    this.listeners = new Map();
    this.requestIdCounter = 0;
    
    // Configuration v5.4.56 - Délai plus long pour éviter rate limits
    this.minDelayBetweenRequests = 3000; // 3 secondes entre chaque requête
    this.maxConcurrent = 1; // Une seule requête à la fois pour Freebox
    this.lastRequestTime = 0;
    this.maxRetries = 2; // Retry en cas d'échec
    
    // Statistiques
    this.stats = {
      totalProcessed: 0,
      successful: 0,
      failed: 0,
    };
  }
  
  /**
   * Ajoute une requête à la file d'attente avec fonction de génération
   * v5.4.56 - Nouvelle signature avec generateFunction
   */
  addRequest(prompt, character, generateFunction) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestIdCounter;
      
      const queueItem = {
        id: requestId,
        prompt,
        character,
        generateFunction, // La fonction qui génère vraiment l'image
        timestamp: Date.now(),
        resolve,
        reject,
        status: 'pending',
        retries: 0,
      };
      
      this.queue.push(queueItem);
      
      const position = this.queue.length;
      const estimatedWait = position * (this.minDelayBetweenRequests / 1000);
      
      console.log(`📋 Requête #${requestId} ajoutée - Position: ${position} - Attente estimée: ~${estimatedWait}s`);
      
      // Démarrer le traitement si pas en cours
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * v5.4.56 - Traite la file d'attente séquentiellement
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    console.log(`🚀 Démarrage traitement file d'attente (${this.queue.length} requêtes)`);
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      this.currentRequest = request;
      request.status = 'processing';
      
      const remaining = this.queue.length;
      console.log(`🔄 [${request.id}] En cours... (${remaining} en attente)`);
      
      try {
        // Attendre le délai minimum entre les requêtes
        await this.waitForDelay();
        
        // Appeler la fonction de génération fournie
        const imageUrl = await request.generateFunction();
        
        if (imageUrl && !imageUrl.includes('error')) {
          request.status = 'completed';
          request.resolve(imageUrl);
          this.stats.successful++;
          console.log(`✅ [${request.id}] Succès!`);
        } else {
          throw new Error('Image invalide ou erreur');
        }
        
      } catch (error) {
        // Retry si possible
        if (request.retries < this.maxRetries) {
          request.retries++;
          request.status = 'retry';
          this.queue.unshift(request); // Remettre en tête de file
          console.log(`🔁 [${request.id}] Retry ${request.retries}/${this.maxRetries}...`);
          await new Promise(r => setTimeout(r, 5000)); // Attente plus longue avant retry
        } else {
          request.status = 'error';
          this.stats.failed++;
          // NE PAS rejeter avec erreur Pollinations, donner un message clair
          request.reject(new Error(`Génération en file d'attente - Réessayez dans quelques secondes`));
          console.log(`❌ [${request.id}] Échec après ${this.maxRetries} tentatives`);
        }
      }
      
      this.currentRequest = null;
      this.stats.totalProcessed++;
    }
    
    this.isProcessing = false;
    console.log(`📋 File d'attente vide - Stats: ${this.stats.successful} succès, ${this.stats.failed} échecs`);
  }
  
  /**
   * Attend le délai minimum entre les requêtes
   */
  async waitForDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`⏳ Attente ${Math.round(waitTime/1000)}s avant prochaine génération...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Obtient le statut de la file d'attente (pour UI)
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentRequest: this.currentRequest ? {
        id: this.currentRequest.id,
        status: this.currentRequest.status,
      } : null,
      estimatedWaitSeconds: this.queue.length * (this.minDelayBetweenRequests / 1000),
      stats: { ...this.stats },
    };
  }
  
  /**
   * Obtient la position dans la file d'attente
   */
  getPosition(requestId) {
    if (this.currentRequest && this.currentRequest.id === requestId) {
      return 0;
    }
    const index = this.queue.findIndex(r => r.id === requestId);
    return index >= 0 ? index + 1 : -1;
  }
  
  /**
   * Message d'attente pour l'utilisateur
   */
  getWaitMessage() {
    if (!this.isProcessing && this.queue.length === 0) {
      return null;
    }
    
    const position = this.queue.length + (this.isProcessing ? 1 : 0);
    const waitSeconds = position * (this.minDelayBetweenRequests / 1000);
    
    if (position === 1 && this.isProcessing) {
      return "🖼️ Génération en cours...";
    } else if (position > 0) {
      return `📋 File d'attente: ${position} image(s) - ~${Math.round(waitSeconds)}s`;
    }
    return null;
  }
  
  /**
   * Annule une requête en attente
   */
  cancelRequest(requestId) {
    const index = this.queue.findIndex(r => r.id === requestId);
    if (index >= 0) {
      const request = this.queue.splice(index, 1)[0];
      request.reject(new Error('Requête annulée'));
      console.log(`🚫 Requête #${requestId} annulée`);
      return true;
    }
    return false;
  }
  
  /**
   * Vide la file d'attente
   */
  clearQueue() {
    const count = this.queue.length;
    this.queue.forEach(r => r.reject(new Error('File d\'attente vidée')));
    this.queue = [];
    console.log(`🗑️ ${count} requêtes supprimées de la file`);
    return count;
  }
  
  /**
   * Reset les statistiques
   */
  resetStats() {
    this.stats = { totalProcessed: 0, successful: 0, failed: 0 };
  }
}

// Singleton
const imageQueueService = new ImageQueueService();
export default imageQueueService;
