import os
from dotenv import load_dotenv
from sarvamai import SarvamAI

# Read key strictly from environment / .env file
load_dotenv()

api_key = os.environ.get("SARVAM_API_KEY")
if not api_key:
    raise ValueError("SARVAM_API_KEY is not set in environment or .env file.")

# Initialize the Sarvam AI client
client = SarvamAI(api_subscription_key=api_key)

# Single chat completion call using sarvam-105b-conversations
response = client.chat.completions(
    model="sarvam-105b-conversations",
    messages=[
        {"role": "user", "content": "Hello! Give me a brief 1-sentence greeting."}
    ],
)

print(response.choices[0].message.content)
