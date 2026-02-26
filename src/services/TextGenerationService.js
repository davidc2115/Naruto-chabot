// Updated TextGenerationService.js

class TextGenerationService {
    constructor() {
        this.maxTokens = this.getRandomInt(150, 180);
        this.temperature = this.getRandomFloat(0.75, 0.85);
    }

    getRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    getRandomFloat(min, max) {
        return (Math.random() * (max - min) + min);
    }

    generateResponse(input) {
        let response = this.generate(input);
        // Strict response truncation to max 150 characters
        return response.substring(0, 150);
    }

    generate(input) {
        // Generation logic here, returning a response
    }
} 

export default TextGenerationService;