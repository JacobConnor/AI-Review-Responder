document.addEventListener('DOMContentLoaded', async () => {
    const selectedReviewElement = document.getElementById('selectedReview');
    const composeTextbox = document.getElementById('composeTextbox');
    const generateResponseButton = document.getElementById('generateResponse');

    // Retrieve the selected text from chrome.storage.session
    chrome.storage.session.get(['selectedText'], async (result) => {
        const selectedText = result.selectedText || '';
        selectedReviewElement.textContent = selectedText;

        // Enable the generate button only if selectedText is available
        generateResponseButton.disabled = !selectedText;

        generateResponseButton.addEventListener('click', async () => {
            if (selectedText) {
                // Initialize the AI writer and generate a response
                try {
                    composeTextbox.textContent = 'Generating response...'; // Display loading message
                    const writer = await ai.writer.create();

                    // Use the AI writer to generate a response
                    const stream = await writer.writeStreaming(selectedText);

                    // Display streaming response
                    composeTextbox.textContent = ''; // Clear existing text
                    for await (const chunk of stream) {
                        composeTextbox.textContent += chunk; // Append each chunk
                    }
                } catch (error) {
                    console.error('Error generating AI response:', error);
                    composeTextbox.textContent = 'An error occurred while generating the response.';
                }
            }
        });
    });
});
