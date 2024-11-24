// side_panel.js

document.addEventListener('DOMContentLoaded', async () => {
    const selectedReviewElement = document.getElementById('selectedReview');
    const generateButton = document.getElementById('generateResponse');
    const aiResponseElement = document.getElementById('aiResponse');
    // const loadingElement = document.getElementById('loading');
    const copyButton = document.getElementById('copyResponse');

    // Sentiment Buttons and Hidden Input
    const positiveButton = document.getElementById('positiveButton');
    const negativeButton = document.getElementById('negativeButton');
    const sentimentInput = document.getElementById('sentiment');
    const aiResponseContainer = document.getElementById('aiResponseContainer');
    const rewriteButton = document.getElementById('rewriteResponse');

    const translateSelectedReviewButton = document.getElementById('translateSelectedReview');
    const translateAIResponseButton = document.getElementById('translateAIResponse');
    const languageSelect = document.getElementById('languageSelect');

    // Set default sentiment to positive
    sentimentInput.value = 'positive';
    positiveButton.style.border = '1px solid #1d11b3';
    positiveButton.style.background = '#1d11b3';
    positiveButton.style.color = '#fff';

    // Event Listeners for Sentiment Buttons
    positiveButton.addEventListener('click', () => {
        sentimentInput.value = 'positive';
        positiveButton.style.border = '1px solid #1d11b3';
        negativeButton.style.background = '#fff';
        negativeButton.style.color = '#1d11b3';
        positiveButton.style.background = '#1d11b3';
        positiveButton.style.color = '#fff';
    });

    negativeButton.addEventListener('click', () => {
        sentimentInput.value = 'negative';
        negativeButton.style.border = '1px solid #1d11b3';
        positiveButton.style.background = '#fff';
        positiveButton.style.color = '#1d11b3';
        negativeButton.style.background = '#1d11b3';
        negativeButton.style.color = '#fff';
    });

    // Retrieve the selected text from chrome.storage.local
    chrome.storage.local.get('selectedText', (data) => {
        if (data.selectedText) {
            selectedReviewElement.value = data.selectedText;
            // Clear the stored selected text
            chrome.storage.local.remove('selectedText');
        }
    });

    // Listen for storage changes in case the panel is already open
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.selectedText) {
            if (changes.selectedText.newValue) {
                selectedReviewElement.value = changes.selectedText.newValue;
                // Clear the stored selected text
                chrome.storage.local.remove('selectedText');
            }
        }
    });

    // Handle Copy Response Button Click
    copyButton.addEventListener('click', () => {
        const responseText = aiResponseElement.textContent.trim();
        if (responseText) {
            navigator.clipboard.writeText(responseText).then(() => {
                alert('Response copied to clipboard!');
            }).catch(err => {
                console.error('Could not copy text: ', err);
            });
        } else {
            alert('No response to copy.');
        }
    });

    // Handle Generate Response Button Click
    generateButton.addEventListener('click', async () => {
        // Hide the AI response container before generating a new response
        aiResponseContainer.style.display = 'none';
        aiResponseContainer.classList.remove('show');

        const selectedText = selectedReviewElement.value.trim();
        if (!selectedText) {
            aiResponseElement.textContent = 'No review selected.';
            return;
        }

        // Get user-selected options
        const sentiment = sentimentInput.value;
        const tone = document.getElementById('toneSelect').value;
        const length = document.getElementById('lengthSelect').value;

        // Disable the button and show loading animation
        generateButton.disabled = true;
        const originalButtonContent = generateButton.innerHTML;
        generateButton.innerHTML = 'Generating <div class="spinner"></div>';

        aiResponseElement.textContent = ''; // Clear previous response

        try {
            const systemPrompt = generateSystemPrompt(sentiment, tone, length);

            // Check AI capabilities
            const { available } = await ai.languageModel.capabilities();
            if (available !== "readily") {
                aiResponseElement.textContent = 'AI capabilities are not available.';
                return;
            }

            if ('capabilities' in self.ai.writer) {
                const capabilities = await self.ai.writer.capabilities();
                if (capabilities === 'no') {
                    // The API is known to not work.
                    return;
                }
            }

            // Create AI writer and stream response
            const writer = await self.ai.writer.create({ sharedContext: systemPrompt });
            const stream = writer.writeStreaming(selectedText);

            let result = '';
            let previousChunk = '';

            for await (const chunk of stream) {
                const newChunk = chunk.startsWith(previousChunk)
                    ? chunk.slice(previousChunk.length)
                    : chunk;
                result += newChunk;
                aiResponseElement.textContent = result; // Update visible response
                previousChunk = chunk;
            }

            // Optionally destroy writer instance
            writer.destroy();

            // After response is generated, show the AI response container with animation
            aiResponseContainer.style.display = 'block';
            aiResponseContainer.classList.add('show');

        } catch (error) {
            console.error('Error:', error);
            aiResponseElement.textContent = `Error: ${error.message}`;
        } finally {
            // Restore button content and re-enable it
            generateButton.innerHTML = originalButtonContent;
            generateButton.disabled = false;
        }
    });

    // Handle Rewrite Response Button Click
    rewriteButton.addEventListener('click', async () => {
        const responseText = aiResponseElement.textContent.trim();
        if (!responseText) {
            alert('No response to rewrite.');
            return;
        }

        // Disable the button and show loading state
        rewriteButton.disabled = true;
        const originalButtonText = rewriteButton.innerHTML;
        rewriteButton.innerHTML = 'Rewriting <div class="spinner"></div>';

        try {
            // Check AI capabilities
            const { available } = await ai.languageModel.capabilities();
            if (available !== "readily") {
                aiResponseElement.textContent = 'AI capabilities are not available.';
                return;
            }

            // Get user-selected options
            const sentiment = sentimentInput.value;
            const tone = document.getElementById('toneSelect').value;
            const length = document.getElementById('lengthSelect').value;

            // Generate rewriter prompt
            const rewriterPrompt = generateRewriterPrompt(sentiment, tone, length);

            // Create a rewriter instance with shared context
            const rewriter = await ai.rewriter.create({
                sharedContext: rewriterPrompt
            });

            // Stream the rewritten response
            const stream = await rewriter.rewriteStreaming(responseText);

            let rewrittenText = '';
            let previousChunk = '';
            
            for await (const chunk of stream) {
                const newChunk = chunk.startsWith(previousChunk)
                    ? chunk.slice(previousChunk.length)
                    : chunk;
                rewrittenText += newChunk;
                aiResponseElement.textContent = rewrittenText; // Update visible response
                previousChunk = chunk;
            }
            

            

            // Destroy the rewriter instance
            rewriter.destroy();

        } catch (error) {
            console.error('Error:', error);
            alert('Error during rewrite: ' + error.message);
        } finally {
            // Re-enable the button and restore text
            rewriteButton.disabled = false;
            rewriteButton.innerHTML = originalButtonText;
        }
    });

    // Translation functions

    // Handle Translation for Selected Review
    translateSelectedReviewButton.addEventListener('click', async () => {
        const textToTranslate = selectedReviewElement.value.trim();
        if (!textToTranslate) {
            alert('No text to translate.');
            return;
        }
        await handleTranslation(textToTranslate, (translatedText) => {
            selectedReviewElement.value = translatedText;
        }, translateSelectedReviewButton);
    });

    // Handle Translation for AI Response
    translateAIResponseButton.addEventListener('click', async () => {
        const textToTranslate = aiResponseElement.textContent.trim();
        if (!textToTranslate) {
            alert('No response to translate.');
            return;
        }
        await handleTranslation(textToTranslate, (translatedText) => {
            aiResponseElement.textContent = translatedText;
        }, translateAIResponseButton);
    });

    // Translation Function
    async function handleTranslation(text, callback, button) {
        const targetLanguage = languageSelect.value;

        // Disable the button and show loading state
        button.disabled = true;
        const originalButtonText = button.textContent;
        button.textContent = 'Translating...';

        try {
            const languagePair = {
                sourceLanguage: 'en', // Auto-detect the source language
                targetLanguage: targetLanguage,
            };

            const canTranslate = await translation.canTranslate(languagePair);
            if (canTranslate === 'no') {
                throw new Error('Translation not available for the selected language pair.');
            }

            let translator;
            if (canTranslate === 'readily') {
                translator = await translation.createTranslator(languagePair);
            } else {
                translator = await translation.createTranslator(languagePair);
                translator.addEventListener('downloadprogress', (e) => {
                    console.log(`Downloading translation model: ${e.loaded}/${e.total}`);
                });
                await translator.ready;
            }

            const translatedText = await translator.translate(text);
            callback(translatedText);
        } catch (error) {
            console.error('Translation Error:', error);
            alert('Translation failed: ' + error.message);
        } finally {
            // Re-enable the button and restore text
            button.disabled = false;
            button.textContent = originalButtonText;
        }
    }

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

    // Generate rewriter prompt based on user-selected options
    function generateRewriterPrompt(sentiment, tone, length) {
        const lengthText = {
            short: "short (1-2 sentences)",
            medium: "medium (3-4 sentences)",
            long: "detailed (5+ sentences)"
        }[length];

        if (sentiment === "negative") {
            return `
                Please rewrite the following customer service response to a negative review. Ensure the response is ${lengthText}, maintains a ${tone} tone, and follows these guidelines:

                1. Acknowledge the issue.
                2. Express empathy.
                3. Offer a resolution.
                4. Maintain professionalism.

                The rewritten response should be in English.
            `;
        } else {
            return `
                Please rewrite the following customer service response to a positive review. Ensure the response is ${lengthText}, maintains a ${tone} tone, and follows these guidelines:

                1. Express gratitude.
                2. Reinforce positivity.
                3. Encourage future engagement.

                The rewritten response should be in English.
            `;
        }
    }

});
