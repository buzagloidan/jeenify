// content-script.js

console.log(">>> Prompt Optimizer extension loaded!");

// API configuration
const API_CONFIG = {
  endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
  apiKey: 'YOUR_API_KEY',
  
  // This is the system prompt that tells Gemini how to optimize prompts
  systemPrompt: `You are a prompt optimization expert. Your task is to transform basic prompts into highly detailed, 
  well-structured prompts that will generate better results. Important rules:
  1. STRICTLY maintain the exact input language - if input is in English, respond in English; if input is in Hebrew, respond in Hebrew
  2. Always specify the context and purpose clearly
  3. Include specific details, requirements, and constraints
  4. Define the desired format, style, and tone
  5. Specify the target audience or end user
  6. Add qualifiers (e.g., professional, creative, engaging)
  7. Use concrete language (should, must, need)
  8. Aim for at least 30-40 words
  9. ONLY return the optimized prompt - no introductory text, no explanations
  Keep the optimized prompt clear and effective while including all necessary details.
  IMPORTANT: Your response MUST be in the SAME LANGUAGE as the input prompt - do not translate!`
};

function analyzePromptQuality(prompt) {
  if (!prompt) return 'poor';
  
  // Basic criteria for rating prompts
  const criteria = {
    length: prompt.length,
    hasContext: /(context|background|scenario|for|purpose|goal)/i.test(prompt),
    hasSpecifics: /(specific|detailed|exactly|precise|particular)/i.test(prompt),
    hasFormat: /(format|style|structure|tone|voice)/i.test(prompt),
    hasAudience: /(audience|reader|user|viewer|customer)/i.test(prompt),
    wordCount: prompt.split(/\s+/).length,
    hasConcrete: /(should|must|need|require|important)/i.test(prompt),
    hasQualifiers: /(professional|creative|engaging|effective|compelling)/i.test(prompt)
  };

  // Score calculation
  let score = 0;
  if (criteria.wordCount >= 20) score += 2;
  if (criteria.wordCount >= 40) score += 1;
  if (criteria.hasContext) score += 2;
  if (criteria.hasSpecifics) score += 2;
  if (criteria.hasFormat) score += 1;
  if (criteria.hasAudience) score += 1;
  if (criteria.hasConcrete) score += 1;
  if (criteria.hasQualifiers) score += 1;

  // Rating thresholds
  if (score >= 6) return 'good';     // Increased threshold for 'good'
  if (score >= 3) return 'okay';
  return 'poor';
}

function updateRatingDot(textArea, ratingDot) {
  const quality = analyzePromptQuality(textArea.value.trim());
  ratingDot.className = `rating-dot ${quality}`;
  ratingDot.title = `Prompt Quality: ${quality.charAt(0).toUpperCase() + quality.slice(1)}`;
}

function injectOptimizeButton() {
  // Try different possible selectors
  const selectors = [
    '.btns-container[data-v-7d88bc5a]',
    '.btns-container',
    '.new-chat-flex .btns-container'
  ];
  
  let btnsContainer = null;
  for (const selector of selectors) {
    btnsContainer = document.querySelector(selector);
    if (btnsContainer) break;
  }

  if (!btnsContainer) {
    console.log("Could not find the buttons container");
    return false;
  }

  // Check if button already exists
  if (btnsContainer.querySelector('.gemini-optimize-btn')) {
    return true;
  }

  // Create a container for the button and dot
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'optimize-button-container';
  
  // Create the rating dot
  const ratingDot = document.createElement('div');
  ratingDot.className = 'rating-dot poor';
  ratingDot.title = 'Prompt Quality';
  
  // Create optimize button (existing code)
  const optimizeBtn = document.createElement('button');
  optimizeBtn.setAttribute('data-v-7d88bc5a', '');
  optimizeBtn.innerText = 'Jeenify';
  optimizeBtn.className = 'gemini-optimize-btn new-chat-btn';
  
  // Add both elements to the container
  buttonContainer.appendChild(optimizeBtn);
  buttonContainer.appendChild(ratingDot);
  
  // Find textarea for rating updates
  const textAreaSelectors = [
    'textarea.question-input[data-v-394abe23]',
    'textarea.question-input',
    '.input-container textarea'
  ];
  
  let textArea = null;
  for (const selector of textAreaSelectors) {
    textArea = document.querySelector(selector);
    if (textArea) break;
  }

  if (textArea) {
    // Add input listener to update rating dot
    textArea.addEventListener('input', () => updateRatingDot(textArea, ratingDot));
    // Initial rating
    updateRatingDot(textArea, ratingDot);
  }

  // Click handler
  optimizeBtn.addEventListener('click', async () => {
    console.log('Optimize button clicked');
    
    // Find textarea
    const textAreaSelectors = [
      'textarea.question-input[data-v-394abe23]',
      'textarea.question-input',
      '.input-container textarea'
    ];
    
    let textArea = null;
    for (const selector of textAreaSelectors) {
      textArea = document.querySelector(selector);
      if (textArea) {
        console.log('Found textarea with selector:', selector);
        break;
      }
    }

    if (!textArea) {
      console.error('Could not find textarea with any selector');
      alert('Cannot find the input textarea!');
      return;
    }

    const userPrompt = textArea.value.trim();
    console.log('User prompt:', userPrompt);
    
    if (!userPrompt) {
      console.log('Empty prompt, showing alert');
      alert('Please enter a prompt first!');
      return;
    }

    optimizeBtn.disabled = true;
    optimizeBtn.innerText = 'Jeenifying...';

    try {
      console.log('Sending request with prompt:', userPrompt);
      const response = await fetch(`${API_CONFIG.endpoint}?key=${API_CONFIG.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${API_CONFIG.systemPrompt}\n\nOriginal prompt: "${userPrompt}"\n\nOptimized prompt:`
            }]
          }],
          generationConfig: {
            temperature: 0.9,    // Increased for more creative responses
            topK: 32,
            topP: 0.8,
            maxOutputTokens: 2048,  // Increased token limit
            candidateCount: 1,
            stopSequences: ["Original prompt:"],  // Prevent model from continuing past the response
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error response:', errorText);
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      
      if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
        console.error('Invalid API response structure:', data);
        throw new Error('Unexpected API response format');
      }

      const optimizedPrompt = data.candidates[0].content.parts[0].text.trim();
      console.log('Optimized prompt:', optimizedPrompt);
      
      textArea.value = optimizedPrompt;
      
      // Check if the text contains Hebrew characters and set direction accordingly
      const containsHebrew = /[\u0590-\u05FF]/.test(optimizedPrompt);
      textArea.setAttribute('dir', containsHebrew ? 'rtl' : 'ltr');
      
      textArea.style.height = 'auto';
      textArea.style.height = textArea.scrollHeight + 'px';

      // Update the rating dot after optimization
      const ratingDot = document.querySelector('.rating-dot');
      if (ratingDot) {
        updateRatingDot(textArea, ratingDot);
      }

      const inputEvent = new Event('input', { bubbles: true });
      textArea.dispatchEvent(inputEvent);

    } catch (error) {
      console.error('Full error details:', error);
      alert(`Error optimizing prompt: ${error.message}`);
    } finally {
      optimizeBtn.disabled = false;
      optimizeBtn.innerText = 'Jeenify';
    }
  });

  // Insert container instead of just the button
  const firstChild = btnsContainer.firstChild;
  btnsContainer.insertBefore(buttonContainer, firstChild);
  
  return true;
}

// Try to inject the button, with retries
function tryInjectButton(attempts = 0, maxAttempts = 20) {
  if (attempts >= maxAttempts) {
    console.warn("Gave up looking for container after", maxAttempts, "tries");
    return;
  }

  if (!injectOptimizeButton()) {
    setTimeout(() => tryInjectButton(attempts + 1, maxAttempts), 500);
  }
}

// Start the injection process
tryInjectButton();

// Watch for DOM changes to re-inject button if needed
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    if (mutation.type === 'childList' && !document.querySelector('.gemini-optimize-btn')) {
      tryInjectButton();
      break;
    }
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
