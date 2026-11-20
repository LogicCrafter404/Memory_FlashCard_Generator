// --- STATE MANAGEMENT & DOM ELEMENTS ---
let flashcardsData = [];
let currentIndex = 0;
let processedPages = new Set(); // Stores pages we have already generated cards for

const generateBtn = document.getElementById('generateBtn');
const generatorView = document.getElementById('generator-view');
const flashcardView = document.getElementById('flashcard-view');
const flashcardElement = document.getElementById('flashcard');
const cardFront = document.getElementById('card-front');
const cardBack = document.getElementById('card-back');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const cardCounter = document.getElementById('card-counter');
const statusDiv = document.getElementById('status');

// --------------------------------------------------------------

generateBtn.addEventListener('click', async () => {

    // Disable button to prevent double-clicks
    generateBtn.disabled = true;
    statusDiv.innerText = "Reading webpage...";

    const CHUNK_SIZE = 2500;

    // Find the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Check if this exact page has already been processed
    const uniquePageId = tab.id + tab.url;
    if (processedPages.has(uniquePageId)) {
        statusDiv.innerText = "⚠️ Cards already generated for this page. Please visit a new topic!";
        generateBtn.disabled = false;
        return; 
    }

    // Inject our scraping function into the webpage
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractTextFromPage,
    }, async (injectionResults) => {

        if (!injectionResults || injectionResults.length === 0) {
            statusDiv.innerText = "Error: Could not extract text.";
            generateBtn.disabled = false;
            return;
        }

        const extractedText = injectionResults[0].result;

        if (!extractedText || extractedText.trim().length === 0) {
            statusDiv.innerText = "Error: No text found on this page.";
            generateBtn.disabled = false;
            return;
        }

        console.log("Total Characters:", extractedText.length);

        // Split into chunks
        const chunks = [];
        for (let i = 0; i < extractedText.length; i += CHUNK_SIZE) {
            chunks.push(extractedText.substring(i, i + CHUNK_SIZE));
        }

        console.log(`Total Chunks: ${chunks.length}`);
        let allFlashcards = [];

        try {
            for (let i = 0; i < chunks.length; i++) {
                statusDiv.innerText = `Generating flashcards... (${i + 1}/${chunks.length})`;
                console.log(`Processing Chunk ${i + 1}`);

                const response = await fetch("http://127.0.0.1:8000/api/generate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ text: chunks[i] })
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.detail || `HTTP ${response.status}`);
                }

                if (data.flashCards && Array.isArray(data.flashCards)) {
                    allFlashcards.push(...data.flashCards);
                }
                console.log(`Chunk ${i + 1} completed.`);
            }

            console.log("ALL GENERATED FLASHCARDS", allFlashcards);

            statusDiv.innerText = `✅ Success! ${allFlashcards.length} flashcards generated.`;

            // --- UI LOGIC TRIGGER ---
            if (allFlashcards.length > 0) {
                processedPages.add(uniquePageId); 
                
                flashcardsData = allFlashcards;
                currentIndex = 0;
                switchToFlashcardView();
            } else {
                statusDiv.innerText = "Error: AI returned 0 cards.";
                generateBtn.disabled = false;
            }

        } catch (error) {
            console.error("Backend Error:", error);
            statusDiv.innerText = "Error: " + error.message;
            generateBtn.disabled = false;
        }
    });
});

// --- UI FUNCTIONS ---
function switchToFlashcardView() {
    generatorView.style.display = 'none';
    flashcardView.style.display = 'flex';
    renderCard();
}

function renderCard() {
    const card = flashcardsData[currentIndex];
    
    // Reset flip state instantly if moving to a new card
    flashcardElement.style.transition = 'none';
    flashcardElement.classList.remove('is-flipped');
    
    setTimeout(() => {
        flashcardElement.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)';
    }, 50);

    // Populate data
    cardFront.innerText = card.question;
    cardBack.innerText = card.answer;
    
    // Update controls
    cardCounter.innerText = `${currentIndex + 1} / ${flashcardsData.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === flashcardsData.length - 1;
}

// --- EVENT LISTENERS FOR FLASHCARD UI ---
flashcardElement.addEventListener('click', () => {
    flashcardElement.classList.toggle('is-flipped');
});

prevBtn.addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        renderCard();
    }
});

nextBtn.addEventListener('click', () => {
    if (currentIndex < flashcardsData.length - 1) {
        currentIndex++;
        renderCard();
    }
});

// --- APP CONTROLS ---

// 1. Close Button Logic
document.getElementById('closeBtn').addEventListener('click', () => {
    window.close();
});

// 2. Start Over Button Logic
document.getElementById('startOverBtn').addEventListener('click', () => {
    flashcardView.style.display = 'none';
    generatorView.style.display = 'flex';
    
    statusDiv.innerText = "Ready to extract text.";
    generateBtn.disabled = false;
    
    flashcardsData = [];
    currentIndex = 0;
});

// 3. Pin Button Logic (Detaches popup into a floating window)
document.getElementById('pinBtn').addEventListener('click', () => {
    chrome.windows.getCurrent((win) => {
        if (win.type === 'popup') {
            alert("Already pinned! You can drag this window anywhere.");
            return;
        }
        
        chrome.windows.create({
            url: "popup.html",
            type: "popup",
            width: 380,
            height: 600,
            focused: true
        });
        
        window.close();
    });
});

/*
---------------------------------------------------------
Function injected into the webpage to read text.
---------------------------------------------------------
*/
function extractTextFromPage() {
    const highlightedText = window.getSelection().toString().trim();
    if (highlightedText.length > 0) {
        return highlightedText;
    }
    return document.body.innerText.trim();
}