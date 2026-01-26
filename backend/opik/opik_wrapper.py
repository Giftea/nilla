import os
from google import genai
from opik import configure
from opik.integrations.genai import track_genai

# 1. Initialize Opik
# If you haven't run 'opik configure' in your terminal, 
# you can provide your API key here or via OPIK_API_KEY env var.
configure() 

# 2. Get your API key safely
# The SDK will automatically pick up 'GOOGLE_API_KEY' from the environment.
# Only manually set it if you want to use a specific string.
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    raise ValueError("GOOGLE_API_KEY not found in environment variables.")

# 3. Initialize the Google GenAI Client
# We pass the api_key explicitly to be safe.
client = genai.Client(api_key=api_key)

# 4. Wrap the client with Opik tracking
gemini_client = track_genai(client) 

# 5. Generate content
# Using the 2.0 Flash model
response = gemini_client.models.generate_content(
    model="gemini-2.0-flash-lite", 
    contents="Write a haiku about AI engineering."
)

print(response.text)
