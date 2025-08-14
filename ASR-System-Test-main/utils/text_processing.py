import logging
import openai
from groq import Groq
from fireworks import LLM

# Get a logger for this module. All functions below will use it.
logger = logging.getLogger(__name__)


def get_corrected_text(api_key: str, display_text: str, lexical_text: str):
    """
    Sends display and lexical text to the OpenAI API for correction.
    Logs progress and errors. Returns None on failure.
    """
    try:
        client = openai.OpenAI(api_key=api_key)
    except openai.OpenAIError as e:
        logger.error(f"Could not initialize OpenAI client. Details: {e}", exc_info=True)
        return None

    prompt_to_send = f"""
You are a meticulous text editor. Your only job is to follow a set of replacement rules exactly as written, even if it seems stylistically unusual. You must not deviate from the rules.

You will be given a "Display Text" and a "Lexical Text". Your goal is to produce a corrected final version.

**REPLACEMENT RULES:**
1.  **Foundation:** Use the Display Text for all capitalization and punctuation.
2.  **Abbreviation Rule:** If the Display Text contains an abbreviation (like "Mr.", "Dr."), you MUST replace it with its full-word counterpart from the Lexical Text (like "mister", "doctor").
3.  **Number Rule:** If the Display Text contains digits, you MUST replace them with the spelled-out version from the Lexical Text.

---
**EXAMPLE OF YOUR TASK LOGIC:**

Here is an example of how you must reason:

**Display Text:**
Mr. Davis attended the meeting at 10 AM.

**Lexical Text:**
mister davis attended the meeting at ten am

**Your Reasoning Process:**
1.  The Display Text has "Mr.". The Lexical Text has "mister". The Abbreviation Rule states I must replace the abbreviation. I will use "Mister".
2.  The Display Text has "10". The Lexical Text has "ten". The Number Rule states I must replace the digits. I will use "ten".
3.  Capitalization and punctuation are taken from the Display Text. Do not include any capitalization of your own.

**Resulting Output for Example:**
Mister Davis attended the meeting at ten AM.

---
**NOW, APPLY THAT EXACT SAME LOGIC TO THE FOLLOWING TEXT:**

**Display Text:**
{display_text}

**Lexical Text:**
{lexical_text}

**Final Corrected Version:**
"""

    logger.info("Sending prompt to OpenAI API for text correction...")
    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt_to_send}],
            temperature=0.2,
        )
        corrected_text = response.choices[0].message.content.strip()
        logger.info("Received corrected text from OpenAI API.")
        return corrected_text

    except openai.APIError as e:
        logger.error(f"An OpenAI API error occurred during text correction: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during text correction: {e}", exc_info=True)
        return None


def replace_digits_with_words(api_key: str, text: str):
    """
    Sends text to the OpenAI API to replace digits with words.
    Logs progress and errors. Returns None on failure.
    """
    try:
        client = openai.OpenAI(api_key=api_key)
    except openai.OpenAIError as e:
        logger.error(f"Could not initialize OpenAI client. Details: {e}", exc_info=True)
        return None

    prompt_to_send = f"""
You are a highly specialized text editing AI. Your only job is to replace numbers written with digits with their spelled-out word form.

**Instructions:**
1.  Scan the user-provided text for any numbers represented by digits (e.g., "1", "45", "100").
2.  Replace these digits with their corresponding English words (e.g., "one", "forty-five", "one hundred").
3.  **DO NOT change anything else.** The original capitalization, punctuation, spacing, and grammar must be preserved perfectly.
4. The year rule: please also spell out year names (e.g., 1992 -> nineteen ninety two).
---
**Example 1:**
- **Input:** "I need 2 apples."
- **Output:** "I need two apples."

**Example 2:**
- **Input:** "The meeting is at 3:45 PM on May 21st."
- **Output:** "The meeting is at three:forty-five PM on May twenty-first."

**Example 3:**
- **Input:** "Her final score was 99%."
- **Output:** "Her final score was ninety-nine%."
---

Now, apply these rules to the following text. Respond with only the modified text.

**Input Text:**
{text}

**Modified Text:**
"""

    logger.info("Sending text to OpenAI API for number-to-word conversion...")
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt_to_send}],
            temperature=0.1,
        )
        modified_text = response.choices[0].message.content.strip()
        logger.info("Received number-to-word response from OpenAI API.")
        return modified_text

    except openai.APIError as e:
        logger.error(f"An OpenAI API error occurred during number conversion: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during OpenAI number conversion: {e}", exc_info=True)
        return None


def replace_digits_with_words_groq(api_key: str, text: str):
    """
    Sends text to the Groq API to replace digits with words.
    Logs progress and errors. Returns None on failure.
    """
    try:
        client = Groq(api_key=api_key)
    except Exception as e:
        logger.error(f"Could not initialize Groq client. Details: {e}", exc_info=True)
        return None

    # 1. The System Prompt sets the strict rules for the AI's behavior.
    # It's a high-level instruction that governs the entire interaction.
    system_prompt = """
    You are a highly specialized text-editing API. Your only function is to
    replace digits with their English word form in the user-provided text.
    You must follow these rules without deviation:
    - Your entire response must ONLY be the modified text.
    - Do NOT include any preamble, introduction, explanation, or conversational text.
    - Do NOT use markdown or any other formatting.
    - Preserve all original capitalization, punctuation, and spacing perfectly.
    """

    # 2. The User Prompt is now just a clean, direct command.
    user_prompt = f"""
    **Input Text:**
    {text}

    **Modified Text:**
    """

    logger.info("Sending text to Groq API for number-to-word conversion...")
    try:
        chat_completion = client.chat.completions.create(
            # 3. Use both system and user prompts in the messages list.
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model="llama3-70b-8192",
            # 4. Set temperature to 0.0 for deterministic, non-creative tasks.
            temperature=0.0,
        )
        modified_text = chat_completion.choices[0].message.content.strip()
        logger.info("Received number-to-word response from Groq API.")
        return modified_text

    except Groq.APIError as e:
        logger.error(f"A Groq API error occurred: {e}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during Groq number conversion: {e}", exc_info=True)
        return None
    

def replace_digits_with_words_fireworks(llm, text: str):
    """
    Sends text to the Fireworks AI API to replace digits with words.
    Logs progress and errors, returning the modified text or None on failure.

    Args:
        api_key (str): Your Fireworks AI API key.
        text (str): The text string to process.

    Returns:
        str | None: The modified text, or None if an error occurred.
    """

    # Construct the detailed prompt. This prompt is model-agnostic and works well here.
    prompt_to_send = f"""
You are a highly specialized text editing AI. Your only job is to replace numbers written with digits with their spelled-out word form.

**Instructions:**
1.  Scan the user-provided text for any numbers represented by digits (e.g., "1", "45", "100").
2.  Replace these digits with their corresponding English words (e.g., "one", "forty-five", "one hundred").
3.  **DO NOT change anything else.** The original capitalization, punctuation, spacing, and grammar must be preserved perfectly.

---
**Example 1:**
- **Input:** "I need 2 apples."
- **Output:** "I need two apples."

**Example 2:**
- **Input:** "The meeting is at 3:45 PM on May 21st."
- **Output:** "The meeting is at three:forty-five PM on May twenty-first."
---

Now, apply these rules to the following text. Respond with only the modified text.

**Input Text:**
{text}

**Modified Text:**
"""

    logger.info("Sending text to Fireworks AI for number-to-word conversion...")
    try:
        # 3. Make the API call using a Fireworks AI model.
        # The Fireworks API is OpenAI-compatible, so the method call is identical.
        response = llm.chat.completions.create(
            messages=[{"role": "user", "content": prompt_to_send}],
            temperature=0.1, # Low temperature for deterministic, precise tasks.
        )
        modified_text = response.choices[0].message.content.strip()
        logger.info("Received number-to-word response from Fireworks AI.")
        return modified_text

    except Exception as e:
        # The log message is generic but exc_info=True will provide the full error traceback.
        logger.error(f"An error occurred during the Fireworks API call: {e}", exc_info=True)
        return None