from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# Import the schemas and the AI chain from your custom AI file
from flashCard_AI import TextInput, FlashCardList, flashcard_chain

# --- 1. Initialize the FastAPI Server ---
app = FastAPI(title="Groq AI Flashcard Backend")

# --- 2. Configure CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"status": "Backend is running! Go to /docs to test the API."}

# --- 3. Create the API Endpoint ---
@app.post("/api/generate", response_model=FlashCardList)
async def generate_flashcards(request: TextInput):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="Text input cannot be empty.")
    
    try:
        # We call the chain that we imported from flashcard_ai.py
        result = flashcard_chain.invoke({"text": request.text})
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))