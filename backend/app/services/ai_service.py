import json
from langchain_ollama import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser

def generate_summary(text):
    """
    Generates a dynamic, content-aware summary.
    The AI model decides what sections are relevant based on the document type.
    Returns a dict with 'overview' and 'sections' (dynamic list).
    """
    if not text:
        return None
        
    llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.3)
    
    parser = JsonOutputParser()
    
    prompt_template = PromptTemplate(
        template="""You are an expert AI tutor and study assistant for students.
Analyze the following document text and generate a comprehensive, structured summary.

IMPORTANT: You must decide which sections are most useful based on the content type.
- For a **technical/science** document: include formulas, key concepts, definitions
- For a **history/social studies** document: include timelines, key events, important figures
- For a **programming/CS** document: include code concepts, algorithms, design patterns
- For a **resume/profile**: include skills, experience highlights, projects
- For **literature**: include themes, character analysis, plot summary
- For **math**: include theorems, proofs, formulas with explanations
- Always include relevant sections; SKIP sections that don't apply to this content.

Text to analyze:
{text}

Your response MUST be valid JSON matching this exact structure:
{{
    "overview": "A clear, comprehensive 2-3 paragraph summary of the entire document.",
    "sections": [
        {{
            "title": "Section Title (e.g. Key Concepts, Timeline, Skills, Formulas, etc.)",
            "type": "list | timeline | keyvalue | formulas",
            "items": []
        }}
    ]
}}

Section type rules:
- "list": items is an array of strings. Example: ["item 1", "item 2"]
- "timeline": items is an array of objects. Example: [{{"date": "1947", "event": "Independence"}}]
- "keyvalue": items is an array of objects. Example: [{{"key": "Name", "value": "John Doe"}}]
- "formulas": items is an array of objects. Example: [{{"name": "Newton's 2nd Law", "equation": "F = ma", "description": "Force equals mass times acceleration"}}]

Generate 3-6 relevant sections. Be specific and detailed. Do NOT use placeholder text like "...".
""",
        input_variables=["text"]
    )
    
    chain = prompt_template | llm | parser
    
    # Truncate for context window safety
    safe_text = text[:25000] 
    
    try:
        result = chain.invoke({"text": safe_text})
        return result
    except Exception as e:
        print(f"Error generating summary: {e}")
        return None

def generate_quiz(text, preferences):
    """
    Generates a structured JSON quiz based on document content and detailed preferences.
    """
    if not text:
        return None

    llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.5)
    parser = JsonOutputParser()

    # Parse preferences directly from UI setup
    difficulty = preferences.get('difficulty', 'Medium')
    length = preferences.get('length', 5)
    question_types = preferences.get('questionTypes', 'Mixed')
    out_of_domain = preferences.get('outOfDomain', False)
    simulation_mode = preferences.get('simulationMode', 'Standard')

    prompt_template = PromptTemplate(
        template="""You are an expert examiner and educator.
Your task is to generate a comprehensive, intelligent quiz based strictly on the provided syllabus/text corpus.

### QUIZ SPECIFICATIONS:
- Difficulty Level: {difficulty}
- Total Questions: {length}
- Question Format: {question_types} (Can be MCQ, True/False, Short Answer, or a mix)
- Exam Simulation Mode: {simulation_mode}
- Include 'Out-of-Domain Challenge' (lateral thinking / advanced application): {out_of_domain}

### PROVIDED TEXT (KNOWLEDGE BASE):
{text}

### OUTPUT JSON SCHEMA REQUIREMENTS:
You MUST output raw, valid JSON only. Do not include markdown code blocks around the JSON (e.g. no ```json).
Structure exactly like this:
{{
    "quizTitle": "A catchy title summarizing the topic",
    "difficulty": "{difficulty}",
    "simulationMode": "{simulation_mode}",
    "estimatedTimeMinutes": 10,
    "questions": [
        {{
            "id": 1,
            "type": "mcq", 
            "text": "Question text here?",
            "options": ["Option A", "Option B", "Option C", "Option D"], 
            "correctAnswer": "Option A",
            "explanation": "Brief explanation of why this is correct."
        }},
        {{
            "id": 2,
            "type": "tf", 
            "text": "True/False statement here.",
            "options": ["True", "False"],
            "correctAnswer": "True",
            "explanation": "Explanation here."
        }},
        {{
            "id": 3,
            "type": "short", 
            "text": "Short answer question here.",
            "correctAnswer": "Sample correct answer or expected keywords.",
            "explanation": "Explanation here."
        }}
    ]
}}

### INSTRUCTIONS to the EXAMINER:
1. Ensure the total number of items in "questions" EXACTLY equals {length}.
2. If the user asked for MCQ only, make ALL types "mcq" and provide 4 "options" for each.
3. Keep the "correctAnswer" exactly identical to one of the "options" for MCQ and True/False.
4. If "Out-of-Domain Challenge" is true, make 1 or 2 questions slightly harder, requiring external contextual links or deep critical thinking not explicitly in the text but related. Keep the rest strictly grounded in the text.
5. In {simulation_mode} mode, reflect that style (e.g. technical interview = tricky conceptual questions, university exam = descriptive/theoretical, competitive exam = fast factual/numerical).
""",
        input_variables=["text", "difficulty", "length", "question_types", "simulation_mode", "out_of_domain"]
    )

    # Note: We take up to ~30k chars of safe context to leave enough tokens for generation.
    safe_text = text[:30000]

    try:
        chain = prompt_template | llm | parser
        
        result = chain.invoke({
            "text": safe_text,
            "difficulty": difficulty,
            "length": length if str(length).isdigit() else 5,
            "question_types": question_types,
            "simulation_mode": simulation_mode,
            "out_of_domain": "Yes" if out_of_domain else "No"
        })
        
        return result
    except Exception as e:
        print(f"Error generating quiz: {e}")
        return None


def generate_flashcards(text, preferences):
    """
    Generates a structured set of AI-powered flashcards from document content.
    Returns a list of cards with front/back/category/difficulty/type metadata.
    """
    if not text:
        return None

    llm = ChatOllama(model="gemma4:31b-cloud", temperature=0.4)
    parser = JsonOutputParser()

    count = preferences.get('count', 10)
    style = preferences.get('style', 'Mixed')
    difficulty = preferences.get('difficulty', 'Medium')

    prompt_template = PromptTemplate(
        template="""You are an expert educator who creates study flashcards for students.
Your task is to create a set of high-quality flashcards based on the provided text.

### FLASHCARD SPECIFICATIONS:
- Total Cards: {count}
- Card Style: {style} (Can be: Definition, Concept, Formula, Cloze Fill-in-the-Blank, or Mixed)
- Difficulty: {difficulty}

### PROVIDED TEXT (KNOWLEDGE BASE):
{text}

### OUTPUT JSON SCHEMA:
You MUST output raw, valid JSON only. No markdown, no code fences.
Structure exactly like this:
{{
    "deckTitle": "A descriptive title for this flashcard deck",
    "subject": "The general subject area (e.g. Machine Learning, History, Biology)",
    "totalCards": {count},
    "cards": [
        {{
            "id": 1,
            "type": "definition",
            "category": "Topic/Chapter name this card belongs to",
            "difficulty": "easy",
            "front": "The question or term on the front of the card",
            "back": "The detailed answer or definition on the back",
            "hint": "A small optional hint (1 short sentence or empty string)"
        }},
        {{
            "id": 2,
            "type": "concept",
            "category": "Topic name",
            "difficulty": "medium",
            "front": "Explain the relationship between X and Y",
            "back": "Detailed conceptual explanation here",
            "hint": ""
        }},
        {{
            "id": 3,
            "type": "formula",
            "category": "Topic name",
            "difficulty": "hard",
            "front": "What is the formula for ...?",
            "back": "Formula = ... (with brief explanation of each variable)",
            "hint": "Think about Newton's laws"
        }},
        {{
            "id": 4,
            "type": "cloze",
            "category": "Topic name",
            "difficulty": "medium",
            "front": "The process of _____ converts glucose into ATP in cells.",
            "back": "cellular respiration",
            "hint": ""
        }}
    ]
}}

### RULES:
1. Generate EXACTLY {count} cards.
2. Card "type" must be one of: "definition", "concept", "formula", "cloze".
3. If style is "Mixed", use a good variety of all types. If a specific style is chosen, use only that type.
4. "category" should reflect the topic/chapter the card is about (be specific, not generic).
5. "difficulty" per card should be one of: "easy", "medium", "hard".
6. Make the "front" concise and the "back" thorough but not excessively long.
7. Include a "hint" only when useful; otherwise set it to an empty string.
8. Avoid duplicate content across cards.
""",
        input_variables=["text", "count", "style", "difficulty"]
    )

    safe_text = text[:30000]

    try:
        chain = prompt_template | llm | parser
        result = chain.invoke({
            "text": safe_text,
            "count": count,
            "style": style,
            "difficulty": difficulty
        })
        return result
    except Exception as e:
        print(f"Error generating flashcards: {e}")
        return None
