import io
import os
import math
from fastapi import HTTPException, Request
import azure.cognitiveservices.speech as speechsdk
from fastapi.responses import Response
import re
import os
from fastapi import Form
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from openai import AzureOpenAI
from youtube_transcript_api import YouTubeTranscriptApi
from urllib.parse import urlparse, parse_qs
import requests
from bs4 import BeautifulSoup
from azure.ai.documentintelligence import DocumentIntelligenceClient
from azure.core.credentials import AzureKeyCredential
import base64


try:
    from pypdf import PdfReader
except Exception:
    PdfReader = None

load_dotenv()


app = FastAPI(title="DocPilot AI Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for now (dev)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_client() -> AzureOpenAI:
    endpoint = os.getenv("AZURE_OPENAI_ENDPOINT", "")
    api_key = os.getenv("AZURE_OPENAI_KEY", "")
    api_version = os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

    if not endpoint or not api_key:
        raise ValueError("Azure OpenAI environment variables are missing.")

    return AzureOpenAI(
        azure_endpoint=endpoint,
        api_key=api_key,
        api_version=api_version,
    )

EMBEDDING_MODEL = "text-embedding-3-small"
embedding_cache = {}


def get_embedding(text: str):
    text = text.strip()
    if not text:
        return []

    cache_key = text[:2000]

    if cache_key in embedding_cache:
        return embedding_cache[cache_key]

    client = get_client()
    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )

    embedding = response.data[0].embedding
    embedding_cache[cache_key] = embedding
    return embedding

def cosine_similarity(a, b):
    dot = sum(x*y for x,y in zip(a,b))
    mag_a = math.sqrt(sum(x*x for x in a))
    mag_b = math.sqrt(sum(x*x for x in b))

    if mag_a == 0 or mag_b == 0:
        return 0

    return dot/(mag_a*mag_b)

def normalize_query(text: str) -> str:
    text = text.strip().lower()
    return text

def is_question_related_to_document(question, document_text):
    question = normalize_query(question)
    question_embedding = get_embedding(question)

    # ⚡ use only first chunk instead of full doc
    doc_sample = document_text[:1500]
    doc_embedding = get_embedding(doc_sample)
    score = cosine_similarity(question_embedding, doc_embedding)
    return score, question_embedding


def extract_text(uploaded_file: UploadFile, file_bytes: bytes) -> str:
    name = uploaded_file.filename.lower()

    if name.endswith((".txt", ".md", ".sas", ".log", ".csv")):
        return file_bytes.decode("utf-8", errors="ignore")

    if name.endswith(".pdf"):
        if PdfReader is None:
            return "PDF support requires pypdf."

        reader = PdfReader(io.BytesIO(file_bytes))
        pages = []
        for page in reader.pages:
            pages.append(page.extract_text() or "")

        text = "\n".join(pages)

        if text.strip():
            return text

        return extract_text_from_image(file_bytes)

    if name.endswith((".png", ".jpg", ".jpeg")):
        return extract_text_from_image(file_bytes)

    return "Unsupported file type."


def extract_youtube_video_id(url: str) -> str:
    parsed = urlparse(url)
    hostname = parsed.hostname or ""

    if hostname in ["www.youtube.com", "youtube.com", "m.youtube.com"]:
        query = parse_qs(parsed.query)
        return query.get("v", [""])[0]

    if hostname == "youtu.be":
        return parsed.path.lstrip("/")

    return ""

def get_youtube_transcript(url: str) -> str:
    video_id = extract_youtube_video_id(url)
    if not video_id:
        return "Invalid YouTube URL."

    ytt_api = YouTubeTranscriptApi()

    transcript_list = ytt_api.list(video_id)

    try:
        transcript = transcript_list.find_transcript(
            ["en", "hi", "mr", "te", "gu", "fr"]
        )
    except:
        transcript = transcript_list.find_generated_transcript(
            ["hi", "mr", "te", "gu", "fr", "en"]
        )

    data = transcript.fetch()
    text_parts = [item.text for item in data]

    return " ".join(text_parts)


def get_website_text(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0"
    }

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    soup = BeautifulSoup(response.text, "html.parser")

    # remove noisy elements
    for tag in soup(["script", "style", "noscript", "header", "footer", "nav", "aside"]):
        tag.decompose()

    text = soup.get_text(separator=" ")
    cleaned = " ".join(text.split())

    if not cleaned:
        return "No readable text found on this webpage."

    return cleaned


def extract_text_from_image(file_bytes: bytes) -> str:
    endpoint = os.getenv("AZURE_DOC_INTELLIGENCE_ENDPOINT")
    key = os.getenv("AZURE_DOC_INTELLIGENCE_KEY")

    client = DocumentIntelligenceClient(
        endpoint=endpoint,
        credential=AzureKeyCredential(key)
    )

    poller = client.begin_analyze_document(
        "prebuilt-layout",
        file_bytes
    )

    result = poller.result()

    text = []
    for page in result.pages:
        for line in page.lines:
            text.append(line.content)

    final_text = "\n".join(text)
    
    if not final_text.strip():
        print("OCR failed → switching to GPT Vision")
    
        # fallback to vision
        import base64
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")
    
        client = get_client()
    
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": "Extract and explain key information from this image clearly."},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=400,
        )
    
        return response.choices[0].message.content
    
    return final_text




@app.get("/")
def root():
    return {"message": "DocPilot AI backend is running"}


@app.post("/summarize")
async def summarize(file: UploadFile = File(...)):
    file_bytes = await file.read()
    text = extract_text(file, file_bytes)


    client = get_client()
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")
    
    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {
                "role": "system",
                "content": "You are a document intelligence assistant. Summarise clearly using short paragraphs and bullet points."
            },
            {
                "role": "user",
                "content": f"Summarise this document:\n\n{text[:12000]}"
            }
        ],
        temperature=0.2,
    )

    summary = response.choices[0].message.content or "No summary returned."
    summary = "\n".join(line.strip() for line in summary.splitlines() if line.strip())

    return {
        "filename": file.filename,
        "summary": summary,
        "document_text": text[:15000],
    }


@app.post("/summarize-video")
async def summarize_video(video_url: str = Form(...)):
    try:
        transcript_text = get_youtube_transcript(video_url)

        if not transcript_text or transcript_text.strip() == "":
            return {
                "filename": video_url,
                "summary": "No transcript could be extracted from this video.",
                "document_text": "",
            }

        client = get_client()
        deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a video transcript intelligence assistant. Summarise clearly using short paragraphs and bullet points."
                },
                {
                    "role": "user",
                    "content": f"Summarise this video transcript:\n\n{transcript_text[:12000]}"
                }
            ],
            temperature=0.2,
        )

        summary = response.choices[0].message.content or "No summary returned."
        summary = "\n".join(line.strip() for line in summary.splitlines() if line.strip())

        return {
            "filename": video_url,
            "summary": summary,
            "document_text": transcript_text[:15000],
        }

    except Exception as e:
        print("VIDEO ERROR:", str(e))
        return {
            "filename": video_url,
            "summary": f"Video analysis failed: {str(e)}",
            "document_text": "",
        }


@app.post("/summarize-website")
async def summarize_website(website_url: str = Form(...)):
    try:
        website_text = get_website_text(website_url)

        client = get_client()
        deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a website content intelligence assistant. Summarise clearly using short paragraphs and bullet points."
                },
                {
                    "role": "user",
                    "content": f"Summarise this webpage content:\n\n{website_text[:12000]}"
                }
            ],
            temperature=0.2,
        )

        summary = response.choices[0].message.content or "No summary returned."
        summary = "\n".join(line.strip() for line in summary.splitlines() if line.strip())
    
        return {
            "filename": website_url,
            "summary": summary,
            "document_text": website_text[:15000],
        }

    except Exception as e:
        print("WEBSITE ERROR:", str(e))
        return {
            "filename": website_url,
            "summary": f"Website analysis failed: {str(e)}",
            "document_text": "",
        }


def chunk_text(text: str, chunk_size: int = 800) -> list[str]:
    text = text.strip()
    if not text:
        return []

    paragraphs = [p.strip() for p in text.split("\n") if p.strip()]

    chunks = []
    current_chunk = ""

    for para in paragraphs:
        if len(current_chunk) + len(para) + 1 <= chunk_size:
            current_chunk += ("\n" if current_chunk else "") + para
        else:
            if current_chunk:
                chunks.append(current_chunk)
            current_chunk = para

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def get_top_chunks(document_text: str, question_embedding, top_k: int = 3):

    chunks = chunk_text(document_text)

    if not chunks:
        return [(1.0, document_text[:3000])]

    scored = []

    for chunk in chunks:
        chunk_embedding = get_embedding(chunk[:1000])
        score = cosine_similarity(question_embedding, chunk_embedding)
        scored.append((score, chunk))

    scored.sort(key=lambda x: x[0], reverse=True)

    # ✅ RETURN WITH SCORES
    return scored[:top_k]



def get_voice_by_language(language: str):
    mapping = {
        "english": "en-AU-NatashaNeural",
        "hindi": "hi-IN-SwaraNeural",
        "marathi": "hi-IN-SwaraNeural",   # fallback
        "gujarati": "hi-IN-SwaraNeural",  # fallback
        "telugu": "te-IN-ShrutiNeural",
        "punjabi": "hi-IN-SwaraNeural",   # fallback
        "french": "fr-FR-DeniseNeural",
        "german": "de-DE-KatjaNeural",
    }
    return mapping.get(language.lower(), "en-AU-NatashaNeural")


# 🔹 CLEAN TEXT (FIX *** ISSUE)
def clean_text_for_speech(text: str) -> str:
    text = re.sub(r"\*\*|\*|__", "", text)
    text = re.sub(r"_", "", text)
    text = re.sub(r"`", "", text)
    text = re.sub(r"[#>-]", "", text)
    text = re.sub(r"\n+", " ", text)
    return text.strip()


@app.post("/speak")
async def speak(
    text: str = Form(...),
    language: str = Form("english")
):
    try:

        text = clean_text_for_speech(text)
        text = text[:1500]  # ✅ LIMIT SIZE

        speech_key = os.getenv("AZURE_SPEECH_KEY")
        speech_region = os.getenv("AZURE_SPEECH_REGION")

        print("KEY:", speech_key)
        print("REGION:", speech_region)

        speech_config = speechsdk.SpeechConfig(
            subscription=speech_key,
            region=speech_region
        )

        voice = get_voice_by_language(language)
        speech_config.speech_synthesis_voice_name = voice


        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=None   # ✅ IMPORTANT
        )

        result = synthesizer.speak_text_async(text).get()

        print("RESULT:", result.reason)

        if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted and result.audio_data:
            print("AUDIO LENGTH:", len(result.audio_data) if result.audio_data else 0)
            return Response(
                content=bytes(result.audio_data),
                media_type="audio/wav"
            )
        else:
            print("ERROR DETAILS:", result.reason)
            return {"error": "Speech failed"}


    except Exception as e:
        print("EXCEPTION:", str(e))
        return {"error": str(e)}

@app.post("/translate-and-speak")
async def translate_and_speak(
    text: str = Form(...),
    language: str = Form(...)
):
    try:
        # ✅ CLEAN FIRST (IMPORTANT)
        text = clean_text_for_speech(text)

        # 🌍 LANGUAGE MAP
        lang_map = {
            "english": "en",
            "hindi": "hi",
            "marathi": "mr",
            "gujarati": "gu",
            "telugu": "te",
            "punjabi": "pa",
            "french": "fr",
            "german": "de",
        }


        target_lang = lang_map.get(language.lower(), "en")
        
        # ✅ FORCE SAFE LANG FOR SPEECH
        speech_lang = target_lang
        
        if target_lang in ["gu", "pa"]:
            speech_lang = "hi"   # fallback for speech only


        print("LANG:", language)
        print("TARGET:", target_lang)
        print("TEXT:", text[:100])


        translated_text = text
        print("TRANSLATED:", translated_text[:100])


        # 🔹 TRANSLATE IF NOT ENGLISH
        if target_lang != "en":
            endpoint = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
            key = os.getenv("AZURE_TRANSLATOR_KEY")


            url = f"{endpoint}/translate?api-version=3.0&to={target_lang}"
            

            headers = {
                "Ocp-Apim-Subscription-Key": key,
                "Ocp-Apim-Subscription-Region": "australiaeast",   # ✅ ADD THIS
                "Content-Type": "application/json"
            }
            
            body = [{
                "text": text
            }]
            
            response = requests.post(url, headers=headers, json=body)
            
            if response.status_code != 200:
                print("TRANSLATION ERROR:", response.text)
                return {"error": "Translation failed"}
            
            translated_text = response.json()[0]["translations"][0]["text"]


        # 🔊 SPEECH CONFIG
        speech_config = speechsdk.SpeechConfig(
            subscription=os.getenv("AZURE_SPEECH_KEY"),
            region=os.getenv("AZURE_SPEECH_REGION"),
        )

        # 🔥 VOICE MAPPING (THIS FIXES "Speech failed")
        voice_map = {
            "en": "en-US-AriaNeural",
            "hi": "hi-IN-SwaraNeural",
            "mr": "hi-IN-SwaraNeural",   # fallback
            "gu": "hi-IN-SwaraNeural",
            "te": "te-IN-MohanNeural",
            "pa": "hi-IN-SwaraNeural",
            "fr": "fr-FR-DeniseNeural",
            "de": "de-DE-KatjaNeural",
        }

        speech_config.speech_synthesis_voice_name = voice_map.get(speech_lang, "en-US-AriaNeural")


        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=None
        )

        result = synthesizer.speak_text_async(translated_text).get()

        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            print("Speech error:", result.reason)
            return {"error": "Speech failed"}

        return Response(
            content=result.audio_data,
            media_type="audio/wav"
        )

    except Exception as e:
        print("ERROR:", str(e))
        return {"error": str(e)}


@app.post("/translate")
async def translate(
    text: str = Form(...),
    language: str = Form(...)
):
    try:
        lang_map = {
            "english": "en",
            "hindi": "hi",
            "telugu": "te",
            "french": "fr",
            "german": "de",
        }

        target_lang = lang_map.get(language.lower(), "en")

        if target_lang == "en":
            return {"translated_text": text}

        endpoint = os.getenv("AZURE_TRANSLATOR_ENDPOINT")
        key = os.getenv("AZURE_TRANSLATOR_KEY")

        url = f"{endpoint}/translate?api-version=3.0&to={target_lang}"

        headers = {
            "Ocp-Apim-Subscription-Key": key,
            "Ocp-Apim-Subscription-Region": "australiaeast",
            "Content-Type": "application/json"
        }

        body = [{"text": text}]

        response = requests.post(
            url,
            headers=headers,
            json=body,
            timeout=5
        )

        data = response.json()

        if response.status_code != 200 or not data:
            print("TRANSLATION FAILED:", data)
            return {"translated_text": text}

        translated_text = data[0]["translations"][0]["text"]

        return {"translated_text": translated_text}

    except Exception as e:
        print("TRANSLATE ERROR:", str(e))
        return {"translated_text": text}

@app.post("/summarize-text")
async def summarize_text(text: str = Form(...)):
    if not text.strip():
        return {
            "summary": "No text provided.",
            "document_text": ""
        }

    client = get_client()
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {
                "role": "system",
                "content": "Summarise clearly using short paragraphs and bullet points."
            },
            {
                "role": "user",
                "content": f"Summarise this:\n\n{text[:12000]}"
            }
        ],
        temperature=0.2,
    )

    summary = response.choices[0].message.content or "No summary returned."

    return {
        "summary": summary,
        "document_text": text[:15000],
    }


@app.post("/vision-analyze")
async def vision_analyze(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        # 🔒 IMAGE SIZE PROTECTION (5MB)
        MAX_SIZE = 5 * 1024 * 1024
        if len(file_bytes) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image too large (max 5MB)"
            )

        # convert to base64
        image_base64 = base64.b64encode(file_bytes).decode("utf-8")

        client = get_client()

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Identify the content in this image. Extract text if present and explain clearly in simple terms."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_base64}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=400,
            temperature=0.2
        )

        result = response.choices[0].message.content

        return {
            "summary": result,
            "document_text": result
        }

    except Exception as e:
        print("VISION ERROR:", str(e))
        return {
            "summary": f"Vision analysis failed: {str(e)}",
            "document_text": ""
        }


@app.post("/ocr")
async def ocr(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()

        # 🔒 IMAGE SIZE PROTECTION (5MB)
        MAX_SIZE = 5 * 1024 * 1024
        if len(file_bytes) > MAX_SIZE:
            raise HTTPException(
                status_code=400,
                detail="Image too large (max 5MB)"
            )

        text = extract_text_from_image(file_bytes)

        # 🔥 HANDLE EMPTY OCR RESULT
        if not text or not text.strip():
            return {
                "summary": "⚠️ No readable text found. Try clearer image.",
                "document_text": ""
            }

        return {
            "summary": text,
            "document_text": text
        }

    except Exception as e:
        print("OCR ERROR:", str(e))
        return {
            "summary": f"OCR failed: {str(e)}",
            "document_text": ""
        }


@app.post("/ask")
async def ask(
    request: Request,
    question: str = Form(...),
    document_text: str = Form(...),
    chat_history: str = Form("")
):

    # 🔐 SECURITY CHECK (ADD THIS HERE)
    if request.headers.get("x-api-key") != os.getenv("APP_API_KEY"):
        raise HTTPException(status_code=401, detail="Unauthorized")



    # ✅ CASUAL CHAT (PUT EXACTLY HERE)
    simple_phrases = ["thanks", "thank you", "ok", "cool", "great", "nice", "got it"]
    
    if question.strip().lower() in simple_phrases:
        return {
            "answer": f"{question.capitalize()} 😊",
            "source_type": "external"
        }


    # 🛑 INPUT LIMIT (ADD HERE)
    if len(question) > 500:
        raise HTTPException(status_code=400, detail="Question too long")


    # 🛑 EMPTY DOCUMENT CHECK (ADD HERE)
    if not document_text or not document_text.strip():
        return {
            "answer": "No document uploaded. Please upload content first.",
            "source_type": "none"
        }


    client = get_client()
    deployment_name = os.getenv("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini")

    print("FRONTEND KEY:", request.headers.get("x-api-key"))
    print("BACKEND KEY:", os.getenv("APP_API_KEY"))


    # 🔥 STEP 1: Check if question is related to document
    doc_relevance_score, question_embedding = is_question_related_to_document(question, document_text)
    
    print("DOC RELEVANCE:", doc_relevance_score)
    
    # ❌ If NOT related → STOP
    if doc_relevance_score < 0.01 and not chat_history:
        return {
            "answer": "This question is not related to the uploaded document. Please ask something relevant to the document.",
            "source_type": "none"
        }

    top_chunks = get_top_chunks(document_text, question_embedding, top_k=3)
    
    relevant_context = [chunk for score, chunk in top_chunks]
    max_score = max([score for score, _ in top_chunks]) if top_chunks else 0

   
    print("SIMILARITY SCORE:", max_score)
    

    # ✅ LOW RELEVANCE CASE
    if max_score < 0.03:
    
        classification = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "system",
                    "content": "Classify this question into one of these categories: general, document, irrelevant. Answer ONLY one word."
                },
                {
                    "role": "user",
                    "content": question
                }
            ],
            temperature=0
        )
    
        intent = classification.choices[0].message.content.strip().lower()
    
        print("INTENT:", intent)
    
        if "general" in intent:
            source_type = "external"
        else:
            return {
                "answer": "This question is not related to the uploaded document. Please ask something relevant.",
                "source_type": "none"
            }
    
    # ✅ ADD THIS (OUTSIDE IF BLOCK)
    else:
        source_type = "document"



    # ✅ RESPONSE
    if source_type == "external":

        response = client.chat.completions.create(
            model=deployment_name,
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful assistant. Use chat history to understand follow-up questions and answer clearly step-by-step."
                },
                {
                    "role": "user",
                    "content": f"""
    Chat History:
    {chat_history}

    Current Question:
    {question}
    
    Answer in this format:
    
    Topic:
    (1 line)
    
    Explanation:
    (simple explanation)
    
    Key Points:
    - point 1
    - point 2
    
    Example:
    (if applicable)

    """
                },
            ],
            temperature=0.3,
        )
    else:
        context_text = "\n\n---\n\n".join(relevant_context)
    
        response = client.chat.completions.create(
            model=deployment_name,


            messages=[
              {
                "role": "system",
                "content": "You are a helpful assistant. Use chat history and document context to answer follow-up questions correctly."
              },
              {
                "role": "user",
                "content": f"""
            Chat History:
            {chat_history}
            
            Document Context:
            {context_text}
            
            Current Question:
            {question}
            
            Answer in this format:
            
            Topic:
            (1 line)
            
            Explanation:
            (simple explanation)
            
            Key Points:
            - point 1
            - point 2
            
            Example:
            (if applicable)

            """
              },
            ],
            temperature=0.1,
            max_tokens=300,
        )

    answer = response.choices[0].message.content or "No answer returned."

    # ❌ REMOVE THIS LINE (IMPORTANT)
    # source_type = "document" if relevant_context else "external"

    print("----- REQUEST -----")
    print("QUESTION:", question)
    print("DOC SCORE:", doc_relevance_score)
    print("CHUNK SCORE:", max_score)
    print("SOURCE:", source_type)
    print("-------------------")


    return {
        "answer": answer,
        "source_type": source_type
    }
