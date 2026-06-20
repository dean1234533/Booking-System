/**
 * Consultation Note Categorization Engine
 * Uses keyword-based matching to auto-categorize transcripts
 * 100% free, no AI API needed
 */

// Define categories and their keywords
const CATEGORIES = {
  "Injury/Pain": {
    keywords: ["injury", "pain", "soreness", "ache", "strain", "sprain", "hurt", "tender", "sore", "aching", "bruised", "swollen", "inflammation", "inflamed", "stiff", "stiffness", "discomfort", "uncomfortable"],
    weight: 2, // Higher weight for important safety categories
  },
  "Nutrition": {
    keywords: ["diet", "nutrition", "food", "eating", "meals", "protein", "carbs", "carbohydrates", "fat", "fats", "calories", "supplement", "vitamins", "hydration", "water", "snack", "breakfast", "lunch", "dinner", "nutrition plan", "dietary"],
    weight: 1.5,
  },
  "Motivation": {
    keywords: ["motivation", "struggle", "tired", "difficult", "challenge", "demotivated", "unmotivated", "discouraged", "struggling", "hard", "difficult", "can't do", "impossible", "quit", "give up", "mental"],
    weight: 1.5,
  },
  "Progress": {
    keywords: ["progress", "improvement", "stronger", "faster", "better", "improved", "gained", "lost", "increased", "decreased", "milestone", "goal", "achieved", "reached", "advance", "advancing"],
    weight: 1.5,
  },
  "Form/Technique": {
    keywords: ["form", "technique", "posture", "alignment", "movement", "movement pattern", "how to", "correct", "wrong", "proper", "improper", "position", "stance", "grip", "range of motion", "ROM"],
    weight: 1.5,
  },
  "Schedule": {
    keywords: ["schedule", "time", "appointment", "session", "plan", "week", "day", "morning", "evening", "frequency", "often", "when", "available", "busy", "conflict"],
    weight: 1,
  },
  "Goals": {
    keywords: ["goal", "target", "aim", "objective", "want to", "plan to", "hoping to", "dream", "aspiration", "achieve", "accomplish", "reach", "expect"],
    weight: 1.5,
  },
  "Recovery": {
    keywords: ["recovery", "rest", "sleep", "fatigue", "tired", "energy", "recover", "soreness", "DOMS", "delayed onset", "rest day", "relaxation", "stretching"],
    weight: 1.5,
  },
  "Mental Health": {
    keywords: ["stress", "anxiety", "depression", "mood", "mental", "psychological", "emotional", "feel", "feeling", "happy", "sad", "upset", "worried", "nervous"],
    weight: 1.5,
  },
  "Equipment": {
    keywords: ["equipment", "dumbbells", "barbell", "weights", "machine", "cable", "bands", "resistance", "tool", "gear", "facility", "gym"],
    weight: 1,
  },
  "Lifestyle": {
    keywords: ["lifestyle", "routine", "daily", "habit", "habits", "schedule", "work", "job", "family", "social", "balance", "life"],
    weight: 1,
  },
};

/**
 * Categorize a transcript based on keyword matching
 * Returns array of categories sorted by relevance
 *
 * @param {string} transcript - The transcript text to categorize
 * @param {number} topN - Number of top categories to return (default: 3)
 * @returns {Array} Array of category names, sorted by relevance score
 */
export function categorizeTranscript(transcript, topN = 3) {
  if (!transcript || typeof transcript !== "string") {
    return [];
  }

  const lowerTranscript = transcript.toLowerCase();
  const scores = {};

  // Score each category
  Object.entries(CATEGORIES).forEach(([category, { keywords, weight }]) => {
    let categoryScore = 0;

    keywords.forEach((keyword) => {
      // Count keyword occurrences (whole word match when possible)
      const regex = new RegExp(`\\b${keyword}\\b`, "gi");
      const matches = lowerTranscript.match(regex);

      if (matches) {
        // Weight by frequency and category importance
        categoryScore += matches.length * weight;
      }
    });

    if (categoryScore > 0) {
      scores[category] = categoryScore;
    }
  });

  // Sort by score and return top N
  const sortedCategories = Object.entries(scores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([category]) => category);

  return sortedCategories;
}

/**
 * Get all available categories
 * @returns {Array} Array of category names
 */
export function getAvailableCategories() {
  return Object.keys(CATEGORIES);
}

/**
 * Get keywords for a specific category
 * @param {string} category - Category name
 * @returns {Array} Array of keywords for the category
 */
export function getCategoryKeywords(category) {
  return CATEGORIES[category]?.keywords || [];
}

/**
 * Check if a word matches any keyword in a category
 * @param {string} word - Word to check
 * @param {string} category - Category name
 * @returns {boolean} True if word matches category keywords
 */
export function isWordInCategory(word, category) {
  const keywords = getCategoryKeywords(category);
  const lowerWord = word.toLowerCase();

  return keywords.some(
    (keyword) =>
      lowerWord === keyword ||
      lowerWord.includes(keyword) ||
      keyword.includes(lowerWord)
  );
}

/**
 * Format categorization results for display
 * @param {Array} categories - Array of category names
 * @returns {string} Formatted string for display
 */
export function formatCategories(categories) {
  if (!categories || categories.length === 0) {
    return "No categories detected";
  }

  return categories.join(", ");
}

/**
 * Get color for a category (for UI display)
 * @param {string} category - Category name
 * @returns {string} Color hex code
 */
export function getCategoryColor(category) {
  const colors = {
    "Injury/Pain": "#FF6B6B",
    "Nutrition": "#4CAF50",
    "Motivation": "#FFC107",
    "Progress": "#2196F3",
    "Form/Technique": "#9C27B0",
    "Schedule": "#00BCD4",
    "Goals": "#FF9800",
    "Recovery": "#8BC34A",
    "Mental Health": "#E91E63",
    "Equipment": "#607D8B",
    "Lifestyle": "#3F51B5",
  };

  return colors[category] || "#999999";
}

/**
 * Add custom keywords to a category
 * (Useful for personalizing categories per trainer)
 *
 * @param {string} category - Category name
 * @param {Array} newKeywords - Array of keywords to add
 * @returns {boolean} True if successful
 */
export function addCustomKeywords(category, newKeywords = []) {
  if (!CATEGORIES[category]) {
    console.warn(`Category "${category}" does not exist`);
    return false;
  }

  if (!Array.isArray(newKeywords)) {
    return false;
  }

  // Add new keywords (avoid duplicates)
  newKeywords.forEach((keyword) => {
    const lowerKeyword = keyword.toLowerCase();
    if (!CATEGORIES[category].keywords.includes(lowerKeyword)) {
      CATEGORIES[category].keywords.push(lowerKeyword);
    }
  });

  return true;
}
