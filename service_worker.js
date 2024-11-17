function setupContextMenu() {
    chrome.contextMenus.create({
        id: 'generate-response',
        title: 'Generate Response',
        contexts: ['selection']
    });
}

chrome.runtime.onInstalled.addListener(() => {
    setupContextMenu();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'generate-response') {
        const selectedText = info.selectionText.trim();

        if (selectedText) {
            chrome.storage.session.set({ selectedText }, () => {
                console.log('Selected text stored:', selectedText);
            });

            chrome.sidePanel.open({ tabId: tab.id }, () => {
                if (chrome.runtime.lastError) {
                    console.error(chrome.runtime.lastError.message);
                } else {
                    console.log('Side panel opened.');
                }
            });
        }
    }
});



