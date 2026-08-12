import os
from typing import List

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel

from embeddings import embed_texts, cosine_similarity

load_dotenv()

# Thresholds are the only "tuning knobs" for the duplicate-detection feature - keeping them
# as env vars (with sane defaults) means they can be adjusted without touching the model code,
# and makes it obvious in a viva exactly where the "genuinely simple" decision boundary lives.
DUPLICATE_THRESHOLD = float(os.getenv("DUPLICATE_THRESHOLD", "0.85"))
SIMILAR_THRESHOLD = float(os.getenv("SIMILAR_THRESHOLD", "0.70"))
PLAGIARISM_HIGH_THRESHOLD = float(os.getenv("PLAGIARISM_HIGH_THRESHOLD", "0.75"))
PLAGIARISM_MEDIUM_THRESHOLD = float(os.getenv("PLAGIARISM_MEDIUM_THRESHOLD", "0.50"))

app = FastAPI(title="Project Coordination AI Service")


class EmbedRequest(BaseModel):
    texts: List[str]


class ExistingItem(BaseModel):
    id: int
    embedding: List[float]


class DuplicateCheckRequest(BaseModel):
    text: str
    existing: List[ExistingItem] = []


class SuggestTopicsRequest(BaseModel):
    text: str
    candidates: List[ExistingItem] = []


class PlagiarismCheckRequest(BaseModel):
    text: str
    corpus_texts: List[str] = []


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai-service"}


@app.post("/embed")
def embed(req: EmbedRequest):
    vectors = embed_texts(req.texts)
    return {"embeddings": [v.tolist() for v in vectors]}


@app.post("/duplicate-check")
def duplicate_check(req: DuplicateCheckRequest):
    [embedding] = embed_texts([req.text])

    matches = []
    for item in req.existing:
        similarity = cosine_similarity(embedding, item.embedding)
        if similarity >= SIMILAR_THRESHOLD:
            matches.append({"id": item.id, "similarity": round(similarity, 4)})

    matches.sort(key=lambda m: m["similarity"], reverse=True)

    if matches and matches[0]["similarity"] >= DUPLICATE_THRESHOLD:
        verdict = "duplicate"
    elif matches:
        verdict = "similar"
    else:
        verdict = "none"

    return {"embedding": embedding.tolist(), "verdict": verdict, "matches": matches}


@app.post("/suggest-topics")
def suggest_topics(req: SuggestTopicsRequest, limit: int = 5):
    [embedding] = embed_texts([req.text])

    scored = [
        {"id": item.id, "similarity": round(cosine_similarity(embedding, item.embedding), 4)}
        for item in req.candidates
    ]
    scored.sort(key=lambda m: m["similarity"], reverse=True)

    return {"suggestions": scored[:limit]}


@app.post("/plagiarism-check")
def plagiarism_check(req: PlagiarismCheckRequest):
    if not req.corpus_texts:
        return {"risk_score": 0.0, "risk_band": "low", "matches": []}

    vectors = embed_texts([req.text] + req.corpus_texts)
    doc_vector, corpus_vectors = vectors[0], vectors[1:]

    matches = [
        {"index": idx, "similarity": round(cosine_similarity(doc_vector, vec), 4)}
        for idx, vec in enumerate(corpus_vectors)
    ]
    matches.sort(key=lambda m: m["similarity"], reverse=True)

    risk_score = matches[0]["similarity"] if matches else 0.0

    if risk_score >= PLAGIARISM_HIGH_THRESHOLD:
        risk_band = "high"
    elif risk_score >= PLAGIARISM_MEDIUM_THRESHOLD:
        risk_band = "medium"
    else:
        risk_band = "low"

    return {"risk_score": risk_score, "risk_band": risk_band, "matches": matches}
