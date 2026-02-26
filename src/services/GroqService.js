// Updated the generateResponse function to reduce max_tokens
function generateResponse(input) {
  const max_tokens = 200; // reduced from 600 to 200
  // implementation...
}

// Improved removeRepetitions method for better response quality
function removeRepetitions(responses) {
  const uniqueResponses = [];
  const seen = new Set();
  for (const response of responses) {
    if (!seen.has(response)) {
      seen.add(response);
      uniqueResponses.push(response);
    }
  }
  return uniqueResponses;
}