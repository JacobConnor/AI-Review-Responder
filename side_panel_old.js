// side_panel.js

document.addEventListener('DOMContentLoaded', async () => {
    const selectedReviewElement = document.getElementById('selectedReview');
    const generateButton = document.getElementById('generateResponse');
    const aiResponseElement = document.getElementById('aiResponse');
    const loadingElement = document.getElementById('loading');

    // Retrieve the selected text from chrome.storage.session
    chrome.storage.session.get(['selectedText'], (result) => {
        const selectedText = result.selectedText || '';
        selectedReviewElement.textContent = selectedText;
    });

    // Handle Generate Response Button Click
    generateButton.addEventListener('click', async () => {
        const selectedText = selectedReviewElement.textContent.trim();
        if (!selectedText) {
            aiResponseElement.textContent = 'No review selected.';
            return;
        }

        // Get Sentiment
        const sentiment = document.querySelector('input[name="sentiment"]:checked').value;

        // Get Tone
        const tone = document.getElementById('toneSelect').value;

        // Show loading indicator
        loadingElement.style.display = 'block';
        aiResponseElement.textContent = ''; // Clear previous response
        console.log('test1');
        try {
            // Check API availability
            console.log('test2');
            const { available } = await ai.languageModel.capabilities();
            if (available === "no") {
                aiResponseElement.textContent = 'AI capabilities are not available.';
                loadingElement.style.display = 'none';
                return;
            }

            // Create a new AI session with system prompt based on sentiment and tone
            const systemPrompt = `You are a ${tone} customer service representative. Who is experienced in responding to positive and negative`;
            const session = await ai.languageModel.create({
                systemPrompt: systemPrompt
            });

            // Construct the user prompt for the AI
            const userPrompt = `Here is a ${sentiment} review: "${selectedText}". Please provide an appropriate response in a ${tone} tone.`;
            console.log(userPrompt)
            // Send the prompt and get the response
            const writer  = await ai.writer.create();
            console.log(writer)
            const response = await writer.write(
                userPrompt
              );
              console.log(response)
              
            aiResponseElement.textContent = response;

            // Optionally, destroy the session if not needed anymore
            session.destroy();
        } catch (error) {
            console.error('Error:', error);
            aiResponseElement.textContent = `Error: ${error.message}`;
        } finally {
            // Hide loading indicator
            loadingElement.style.display = 'none';
        }
    });

    // Handle Feedback Buttons
    document.getElementById('feedbackYes').addEventListener('click', () => {
        storeFeedback('Yes');
        alert('Thank you for your feedback!');
    });

    document.getElementById('feedbackNo').addEventListener('click', () => {
        storeFeedback('No');
        alert('Sorry the response was not helpful. We appreciate your feedback.');
    });

    // Function to store feedback
    function storeFeedback(feedback) {
        const selectedText = selectedReviewElement.textContent.trim();
        const aiResponse = aiResponseElement.textContent.trim();

        if (!selectedText || !aiResponse) {
            console.warn('Cannot store feedback: Missing data.');
            return;
        }

        chrome.storage.session.get(['feedbackList'], (result) => {
            let feedbackList = result.feedbackList || [];
            feedbackList.push({
                selectedText: selectedText,
                aiResponse: aiResponse,
                feedback: feedback,
                timestamp: new Date().toISOString()
            });
            chrome.storage.session.set({ feedbackList }, () => {
                console.log('Feedback stored:', feedback);
            });
        });
    }
});
