chrome.action.onClicked.addListener((tab) => {
    // Inject the CSS and JS directly into the page the user is currently looking at
    chrome.scripting.insertCSS({
        target: { tabId: tab.id },
        files: ["content.css"]
    });
    
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });
});