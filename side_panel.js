document.addEventListener('DOMContentLoaded', async () => {
    const selectedReviewElement = document.getElementById('selectedReview');
    const generateButton = document.getElementById('generateResponse');
    const aiResponseElement = document.getElementById('aiResponse');
    const loadingElement = document.getElementById('loading');
    const input = document.querySelector('textarea');
    const detected = document.querySelector('span');
    // Retrieve the selected text from chrome.storage.session
    chrome.storage.session.get(['selectedText'], (result) => {
        const selectedText = result.selectedText || '';
        selectedReviewElement.textContent = selectedText;
    });


    if (!('translation' in self)) {
        console.error("The 'translation' API is not available. Ensure the experimental flag is enabled.");
        return;
    } else {
        console.log('translation is avaliable')
    }


    const languagePair = {
        sourceLanguage: 'en', // Or detect the source language with the Language Detection API
        targetLanguage: 'es',
      };
      
      const canTranslate = await translation.canTranslate(languagePair);
      let translator;
      if (canTranslate !== 'no') {
        if (canTranslate === 'readily') {
          // The translator can immediately be used.
          translator = await translation.createTranslator(languagePair);
        } else {
          // The translator can be used after the model download.
          translator = await translation.createTranslator(languagePair);
          translator.addEventListener('downloadprogress', (e) => {
            console.log(e.loaded, e.total);
          });
          await translator.ready;
        } 
      } else {
          // The translator can't be used at all.
      }
      
    
      
      const someUserText = 'Hello and a warm welcome to the Early Preview Program!';
      const translatedText = await translator.translate(someUserText);
console.log(translatedText);
      






    // Language detector code doesn't look like it works in side panel

    // if (!('translation' in self) || !('createDetector' in self.translation)) {
    //     document.querySelector('.not-supported-message').hidden = false;
    //     return;
    //   } else {
    //     console.log('translation is working')
    //   }
    
    // const detector = await self.translation.createDetector();
    // input.addEventListener('input', async () => {
    //     if (!input.value.trim()) {
    //       detected.textContent = 'not sure what language this is';
    //       return;
    //     }
    //     const { detectedLanguage, confidence } = (
    //       await detector.detect('test')
    //     )[0];

    //     const results = await detector.detect('test')
    //     for (const result of results) {
    //         // Show the full list of potential languages with their likelihood
    //         // In practice, one would pick the top language(s) crossing a high enough threshold.
    //         console.log(result.detectedLanguage, result.confidence);
    //       }
          

    //     detected.textContent = `${(confidence * 100).toFixed(
    //       1
    //     )}% sure that this is ${languageTagToHumanReadable(
    //       detectedLanguage,
    //       'en'
    //     )}`;
    //     console.log(detected.textContent)
    //   });









    // Handle Generate Response Button Click
    generateButton.addEventListener('click', async () => {
        const selectedText = selectedReviewElement.textContent.trim();
        if (!selectedText) {
            aiResponseElement.textContent = 'No review selected.';
            return;
        }

        // Get user-selected options
        const sentiment = document.querySelector('input[name="sentiment"]:checked').value;
        const tone = document.getElementById('toneSelect').value;
        const length = document.querySelector('input[name="length"]:checked').value;

        // Show loading indicator
        loadingElement.style.display = 'block';
        aiResponseElement.textContent = ''; // Clear previous response

        try {
            const systemPrompt = generateSystemPrompt(sentiment, tone, length);

            // Check AI capabilities
            const { available } = await ai.languageModel.capabilities();
            if (available !== "readily") {
                aiResponseElement.textContent = 'AI capabilities are not available.';
                return;
            }

            // Create AI session and stream response
            const session = await ai.languageModel.create({ systemPrompt });
            const stream = session.promptStreaming(selectedText);

            let result = ''; // Final response result
            let previousChunk = ''; // Previous chunk for deduplication

            for await (const chunk of stream) {
                const newChunk = chunk.startsWith(previousChunk)
                    ? chunk.slice(previousChunk.length)
                    : chunk;
                result += newChunk;
                aiResponseElement.textContent = result; // Update visible response
                previousChunk = chunk; // Save current chunk for next iteration
            }

            session.destroy(); // Optionally destroy session
        } catch (error) {
            console.error('Error:', error);
            aiResponseElement.textContent = `Error: ${error.message}`;
        } finally {
            // Hide loading indicator
            loadingElement.style.display = 'none';
        }
    });

    // Generate system prompt based on user-selected options
    function generateSystemPrompt(sentiment, tone, length) {
        const lengthText = {
            short: "short (1-2 sentences)",
            medium: "medium (3-4 sentences)",
            long: "detailed (5+ sentences)"
        }[length];

        if (sentiment === "negative") {
            return `
                You are a customer service AI specializing in empathetic and professional responses to negative reviews. Follow these guidelines:

                1. Response Length: Ensure the response is ${lengthText}.
                2. Tone: Maintain a ${tone} tone as specified by the user.
                3. Structure:
                   - Acknowledge the issue: Start by thanking the reviewer for their feedback and summarizing their concern.
                   - Express empathy: Show understanding and regret their dissatisfaction.
                   - Offer a resolution: Provide a clear, actionable solution or direct them to a contact for further assistance.
                   - Maintain professionalism: Avoid unnecessary explanations, sarcasm, or defensive language.
            `;
        } else {
            return `
                You are a customer service AI specializing in crafting enthusiastic and grateful responses to positive reviews. Follow these guidelines:

                1. Response Length: Ensure the response is ${lengthText}.
                2. Tone: Maintain a ${tone} tone as specified by the user.
                3. Structure:
                   - Express gratitude: Begin by thanking the reviewer for their kind words.
                   - Reinforce positivity: Highlight a specific point from the review to show attentiveness.
                   - Encourage future engagement: Invite the reviewer to return or engage further with the brand.
            `;
        }
    }
});
