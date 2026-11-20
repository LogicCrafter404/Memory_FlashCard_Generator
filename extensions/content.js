// Check to ensure we don't inject it twice on the same page
if (!document.getElementById('fc-bubble')) {

    // --- 1. BUILD THE BUBBLE ---
    const bubble = document.createElement('div');
    bubble.id = 'fc-bubble';
    const iconUrl = chrome.runtime.getURL("icon.png");
    bubble.innerHTML = `<img src="${iconUrl}" alt="AI">`;
    document.body.appendChild(bubble);

    // --- 1.5 DRAG LOGIC FOR BUBBLE (NEW) ---
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    bubble.addEventListener('mousedown', (e) => {
        isDragging = false;
        startX = e.clientX;
        startY = e.clientY;
        
        // Get current position
        const rect = bubble.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        const onMouseMove = (moveEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;

            // If the mouse moves more than 3 pixels, register as a drag
            if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
                isDragging = true;
            }

            if (isDragging) {
                // Remove bottom/right pinning so left/top movement works cleanly
                bubble.style.bottom = 'auto';
                bubble.style.right = 'auto';
                
                // Update position
                bubble.style.left = `${initialLeft + dx}px`;
                bubble.style.top = `${initialTop + dy}px`;
            }
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });

    // --- 2. BUILD THE MAIN APP (Exact Original HTML) ---
    const appContainer = document.createElement('div');
    appContainer.id = 'fc-container';
    appContainer.innerHTML = `
        <!-- Header -->
        <div class="header-container">
            <img src="${iconUrl}" alt="App Icon" class="logo">
            <h2>Flashcard AI</h2>
            <div class="header-actions">
                <button id="closeBtn" title="Close">✖</button>
            </div>
        </div>

        <!-- View 1: Generator Screen -->
        <div id="generator-view">
            <div class="hero-text">
                Turn any long article into <span>interactive bite-sized cards</span> instantly.
            </div>
            
            <button id="generateBtn">✨ Generate Flashcards</button>
            
            <div class="loader-container">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>

            <div id="status">Ready to extract text.</div>
        </div>

        <!-- View 2: Flashcards -->
        <div id="flashcard-view">
            <div class="card-container">
                <div class="flashcard" id="flashcard">
                    <div class="card-face card-front" id="card-front">Loading question...</div>
                    <div class="card-face card-back" id="card-back">Loading answer...</div>
                </div>
            </div>
            <div class="hint">👆 Click the card to flip</div>
            
            <div class="controls">
                <button id="prevBtn" disabled>Previous</button>
                <span id="card-counter">1 / 1</span>
                <button id="nextBtn">Next</button>
            </div>

            <button id="startOverBtn" class="secondary-btn">↺ Generate Another Topic</button>
        </div>
    `;
    document.body.appendChild(appContainer);

    // --- 3. STATE & DOM ELEMENTS ---
    let flashcardsData = [];
    let currentIndex = 0;

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

    // --- 4. EVENT LISTENERS ---

    // Toggle app visibility (Updated to check for drag)
    bubble.addEventListener('click', (e) => {
        if (isDragging) {
            e.preventDefault();
            return;
        }
        bubble.style.display = 'none';
        appContainer.style.display = 'block';
    });

    // Close totally
    document.getElementById('closeBtn').addEventListener('click', () => {
        bubble.remove();
        appContainer.remove();
    });

    // Generate Logic (Exact Original Chunking & API Call)
    generateBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        statusDiv.innerText = "Reading webpage...";

        const CHUNK_SIZE = 2500;
        let extractedText = window.getSelection().toString().trim();
        if (!extractedText) {
            extractedText = document.body.innerText.trim();
        }

        if (!extractedText || extractedText.length === 0) {
            statusDiv.innerText = "Error: No text found on this page.";
            generateBtn.disabled = false;
            return;
        }

        console.log("Total Characters:", extractedText.length);

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
            }

            statusDiv.innerText = `✅ Success! ${allFlashcards.length} flashcards generated.`;

            if (allFlashcards.length > 0) {
                flashcardsData = allFlashcards;
                currentIndex = 0;
                
                generatorView.style.display = 'none';
                flashcardView.style.display = 'flex';
                renderCard();
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

    // Render Card (Exact Original Logic with Reset Delay)
    function renderCard() {
        const card = flashcardsData[currentIndex];
        
        flashcardElement.style.transition = 'none';
        flashcardElement.classList.remove('is-flipped');
        
        setTimeout(() => {
            flashcardElement.style.transition = 'transform 0.6s cubic-bezier(0.4, 0.2, 0.2, 1)';
        }, 50);

        cardFront.innerText = card.question;
        cardBack.innerText = card.answer;
        
        cardCounter.innerText = `${currentIndex + 1} / ${flashcardsData.length}`;
        prevBtn.disabled = currentIndex === 0;
        nextBtn.disabled = currentIndex === flashcardsData.length - 1;
    }

    // Flip Card (Exact Original Logic)
    flashcardElement.addEventListener('click', () => {
        flashcardElement.classList.toggle('is-flipped');
    });

    prevBtn.addEventListener('click', () => {
        if (currentIndex > 0) { currentIndex--; renderCard(); }
    });

    nextBtn.addEventListener('click', () => {
        if (currentIndex < flashcardsData.length - 1) { currentIndex++; renderCard(); }
    });

    // Start Over (Exact Original Logic)
    document.getElementById('startOverBtn').addEventListener('click', () => {
        flashcardView.style.display = 'none';
        generatorView.style.display = 'flex';
        statusDiv.innerText = "Ready to extract text.";
        generateBtn.disabled = false;
        flashcardsData = [];
        currentIndex = 0;
    });
}