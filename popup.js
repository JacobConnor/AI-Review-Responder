document.getElementById('sendPrompt').addEventListener('click', async () => {
  const userPrompt = document.getElementById('userPrompt').value.trim();
  const responseElement = document.getElementById('aiResponse');
  responseElement.textContent = ''; // Clear previous response

  if (!userPrompt) {
    responseElement.textContent = 'Please enter a prompt.';
    return;
  }

  try {
    // Check API availability
    const { available } = await ai.languageModel.capabilities();
    if (available === "no") {
      responseElement.textContent = 'AI capabilities are not available.';
      return;
    }

    // Create a new session
    const session = await ai.languageModel.create();

    // Send the prompt and get the streaming response
    const stream = session.promptStreaming(userPrompt);
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let result = '';

    // Read the stream
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Debugging: Log the chunk and its type
      console.log('Received chunk:', value, 'Type:', typeof value);

      // Determine the type of 'value' and handle accordingly
      let chunk;
      if (value instanceof Uint8Array || value instanceof ArrayBuffer) {
        chunk = decoder.decode(value, { stream: true });
      } else if (typeof value === 'string') {
        chunk = value; // No decoding needed
      } else {
        console.warn('Unexpected chunk type:', typeof value);
        continue; // Skip unexpected types
      }

      result += chunk;
      responseElement.textContent = result; // Update UI incrementally
    }

    // Optionally, destroy the session if not needed anymore
    // session.destroy();
  } catch (error) {
    console.error('Error:', error);
    responseElement.textContent = `Error: ${error.message}`;
  }
});
