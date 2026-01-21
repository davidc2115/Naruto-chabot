/**
 * Service de file d'attente pour la génération d'images
 * v5.4.49 - Gère les requêtes multiples sans rate limit
 */

class ImageQueueService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.currentRequest = null;
    this.listeners = new Map(); // Pour notifier les résultats
    this.requestIdCounter = 0;
    
    // Configuration
    this.minDelayBetweenRequests = 2000; // 2 secondes entre chaque requête
    this.maxConcurrent = 1; // Une seule requête à la fois pour Freebox
    this.lastRequestTime = 0;
  }
  
  /**
   * Ajoute une requête à la file d'attente
   * @param {Object} request - { prompt, character, generator, callback }
   * @returns {Promise} - Résout avec l'URL de l'image
   */
  async addToQueue(request) {
    return new Promise((resolve, reject) => {
      const requestId = ++this.requestIdCounter;
      
      const queueItem = {
        id: requestId,
        prompt: request.prompt,
        character: request.character,
        generator: request.generator || 'freebox',
        timestamp: Date.now(),
        resolve,
        reject,
        status: 'pending',
      };
      
      this.queue.push(queueItem);
      console.log(`📋 Requête #${requestId} ajoutée à la file (${this.queue.length} en attente)`);
      
      // Démarrer le traitement si pas en cours
      if (!this.isProcessing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Traite la file d'attente
   */
  async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const request = this.queue.shift();
      this.currentRequest = request;
      request.status = 'processing';
      
      console.log(`🔄 Traitement requête #${request.id} (reste ${this.queue.length} en attente)`);
      
      try {
        // Attendre le délai minimum entre les requêtes
        await this.waitForDelay();
        
        // Générer l'image (sera appelé via le callback)
        const imageUrl = await request.generateFunction(request.prompt, request.character);
        
        request.status = 'completed';
        request.resolve(imageUrl);
        console.log(`✅ Requête #${request.id} terminée`);
        
      } catch (error) {
        request.status = 'error';
        console.error(`❌ Erreur requête #${request.id}:`, error.message);
        request.reject(error);
      }
      
      this.currentRequest = null;
    }
    
    this.isProcessing = false;
    console.log('📋 File d\'attente vide');
  }
  
  /**
   * Attend le délai minimum entre les requêtes
   */
  async waitForDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.minDelayBetweenRequests) {
      const waitTime = this.minDelayBetweenRequests - timeSinceLastRequest;
      console.log(`⏳ Attente de ${waitTime}ms avant la prochaine requête...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }
  
  /**
   * Obtient le statut de la file d'attente
   */
  getQueueStatus() {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentRequest: this.currentRequest ? {
        id: this.currentRequest.id,
        status: this.currentRequest.status,
      } : null,
      pendingRequests: this.queue.map(r => ({
        id: r.id,
        status: r.status,
        waitTime: Date.now() - r.timestamp,
      })),
    };
  }
  
  /**
   * Obtient la position dans la file d'attente
   * @param {number} requestId - ID de la requête
   * @returns {number} - Position (0 = en cours, -1 = pas trouvé)
   */
  getPosition(requestId) {
    if (this.currentRequest && this.currentRequest.id === requestId) {
      return 0; // En cours de traitement
    }
    
    const index = this.queue.findIndex(r => r.id === requestId);
    return index >= 0 ? index + 1 : -1;
  }
  
  /**
   * Annule une requête en attente
   * @param {number} requestId - ID de la requête
   * @returns {boolean} - true si annulée
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
}

// Singleton
const imageQueueService = new ImageQueueService();
export default imageQueueService;
