from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def embed(text):
    response = client.post("/embed", json={"texts": [text]})
    return response.json()["embeddings"][0]


def test_suggest_topics_ranks_the_closer_candidate_first():
    crop_embedding = embed("Mobile-Based Crop Disease Detection. Detects crop diseases from leaf photos.")
    library_embedding = embed("University Library Book Reservation System. Reserve books online.")

    response = client.post(
        "/suggest-topics",
        json={
            "text": "An app that identifies diseases in plants from pictures",
            "candidates": [
                {"id": 1, "embedding": crop_embedding},
                {"id": 2, "embedding": library_embedding},
            ],
        },
    )
    suggestions = response.json()["suggestions"]
    assert suggestions[0]["id"] == 1
    assert suggestions[0]["similarity"] > suggestions[1]["similarity"]


def test_suggest_topics_respects_the_limit_query_param():
    embedding = embed("Some topic")
    candidates = [{"id": i, "embedding": embedding} for i in range(10)]

    response = client.post("/suggest-topics?limit=3", json={"text": "Some topic", "candidates": candidates})
    assert len(response.json()["suggestions"]) == 3


def test_suggest_topics_with_no_candidates_returns_empty_list():
    response = client.post("/suggest-topics", json={"text": "Anything", "candidates": []})
    assert response.json()["suggestions"] == []
