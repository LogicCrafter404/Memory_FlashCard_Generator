import os
from pydantic import BaseModel, Field 
from langchain_groq import ChatGroq 
from langchain_core.prompts import ChatPromptTemplate
from dotenv import load_dotenv

# Find the .env file in the folder and load GROQ_API_KEY into the system environment
load_dotenv()

class TextInput(BaseModel):
    text: str

class FlashCard(BaseModel):
    question : str = Field(description = "The question of the flashcard")
    answer : str = Field(description = "The answer of the flashcard")

class FlashCardList(BaseModel):
    flashCards : list[FlashCard] = Field(description = "The list of FlashCards")

# Initialize the LLM with temperature 0 for factual, non-creative extraction    
LLM = ChatGroq(
    model = "openai/gpt-oss-120b",
    temperature = 0
)

# Force the LLM to only output data that matches our FlashcardList blueprint
structured_llm = LLM.with_structured_output(FlashCardList)

# Write the highly optimized instructions for the AI
prompt = ChatPromptTemplate.from_messages([
    (
        "system",
        "You are an expert cognitive scientist and educator specializing in active recall and spaced repetition learning tools (like Anki).\n\n"
        "Your task is to analyze the provided text and extract the core concepts, definitions, mechanisms, and key facts into premium study flashcards. "
        "Adhere strictly to these pedagogical guidelines:\n\n"
        "1. **The Minimum Information Principle:** Keep flashcards atomic. Each card must test exactly ONE core fact or concept. Do not create complex, multi-part questions.\n"
        "2. **High-Quality Active Recall:** Avoid vague or open-ended questions like 'Explain X'. Instead, use highly specific prompts like 'What is the primary function of X?' or 'Why does Y happen under condition Z?'.\n"
        "3. **Extreme Conciseness:** Questions must be direct and unambiguous. Answers must be punchy, razor-sharp, and easy to grade mentally in under 3 seconds.\n"
        "4. **Context Preservation:** If a term or acronym is highly specific to a domain, briefly include the context within the question so the card remains understandable when viewed out of context.\n"
        "5. **Eliminate Fluff:** Do not include introductory text, meta-commentary, or obvious pleasantries. Extract only substantive, testable information.\n"
        "6. **Quality over Quantity:** If the input contains a large amount of information, prioritise the most important concepts instead of trying to cover every single detail.\n"
        "7. **Output Limit:** Generate a maximum of 10 flashcards for each request. Each flashcard should represent one of the most valuable learning points from the provided text.\n"
        "8. **Strict Structure:** Every flashcard must contain exactly one question and one answer, and the final output must strictly conform to the FlashCardList schema without any additional text."
    ),
    (
        "human",
        """
Analyse the following text and generate high-quality study flashcards.

Instructions:
- Identify the most important concepts, definitions, mechanisms, relationships, and facts.
- If the text contains many concepts, prioritise only the highest-value learning points.
- Generate **at most 10 flashcards**.
- Every flashcard must contain exactly one concise question and one concise answer.
- Do not repeat information across multiple flashcards.
- Do not invent information that is not present in the text.
- Return ONLY the structured FlashCardList object.
- Do not include explanations, markdown, headings, numbering, or any text outside the required structure.

Text:
{text}
"""
    )
])

# Create the operational pipeline
flashcard_chain = prompt | structured_llm