from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def embed(text):
    response = client.post("/embed", json={"texts": [text]})
    return response.json()["embeddings"][0]


# Hand-built pairs of known-similar and known-different topics, used to sanity-check the
# duplicate-detection thresholds against real (not imagined) model output. Kept in the repo
# as evidence for "how do you know this works" - this is the whole evaluation basis for
# choosing DUPLICATE_THRESHOLD=0.85 / SIMILAR_THRESHOLD=0.70 in main.py.
KNOWN_SIMILAR_PAIRS = [
    (
        "AI-Based Student Attendance Tracking System",
        "A system that uses facial recognition to automatically mark student attendance in lecture halls.",
        "Facial Recognition Attendance System for University Lecture Halls",
        "An automated attendance system for universities using facial recognition technology.",
    ),
    (
        "Mobile-Based Crop Disease Detection for Smallholder Farmers",
        "A mobile app that uses image classification to flag likely crop diseases from photos of plant leaves.",
        "Plant Disease Detection Mobile Application",
        "An Android application that identifies plant diseases from leaf photos using image classification.",
    ),
]

KNOWN_DIFFERENT_PAIRS = [
    (
        "AI-Based Student Attendance Tracking System",
        "A system that uses facial recognition to automatically mark student attendance in lecture halls.",
        "Blockchain-Based Land Title Registry",
        "A system exploring blockchain technology for secure and transparent land ownership records.",
    ),
    (
        "Mobile-Based Crop Disease Detection for Smallholder Farmers",
        "A mobile app that uses image classification to flag likely crop diseases from photos of plant leaves.",
        "University Library Book Reservation System",
        "A web system that lets students reserve and renew library books online.",
    ),
]


def check_similarity(title_a, desc_a, title_b, desc_b):
    embedding_a = embed(f"{title_a}. {desc_a}")

    response = client.post(
        "/duplicate-check",
        json={"text": f"{title_b}. {desc_b}", "existing": [{"id": 1, "embedding": embedding_a}]},
    )
    body = response.json()
    return body["matches"][0]["similarity"] if body["matches"] else 0.0


def test_known_similar_pairs_score_above_the_similar_threshold():
    for title_a, desc_a, title_b, desc_b in KNOWN_SIMILAR_PAIRS:
        similarity = check_similarity(title_a, desc_a, title_b, desc_b)
        assert similarity >= 0.70, f"Expected similar pair to score >= 0.70, got {similarity}"


def test_known_different_pairs_score_below_the_similar_threshold():
    for title_a, desc_a, title_b, desc_b in KNOWN_DIFFERENT_PAIRS:
        similarity = check_similarity(title_a, desc_a, title_b, desc_b)
        assert similarity < 0.70, f"Expected different pair to score < 0.70, got {similarity}"


def test_duplicate_check_verdict_is_duplicate_for_near_identical_text():
    text = "AI-Based Student Attendance Tracking System. Uses facial recognition to mark attendance."
    embedding = embed(text)

    response = client.post(
        "/duplicate-check",
        json={"text": text, "existing": [{"id": 1, "embedding": embedding}]},
    )
    assert response.json()["verdict"] == "duplicate"


def test_duplicate_check_verdict_is_none_when_nothing_existing_is_close():
    embedding = embed("University Library Book Reservation System. Reserve and renew books online.")

    response = client.post(
        "/duplicate-check",
        json={
            "text": "Blockchain-Based Land Title Registry. Secure land ownership records on a blockchain.",
            "existing": [{"id": 1, "embedding": embedding}],
        },
    )
    assert response.json()["verdict"] == "none"
    assert response.json()["matches"] == []
