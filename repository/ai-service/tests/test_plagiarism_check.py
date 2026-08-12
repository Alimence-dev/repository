from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_plagiarism_check_flags_near_identical_text_as_high_risk():
    text = "This chapter discusses the methodology used to collect and analyze survey data from respondents."
    response = client.post("/plagiarism-check", json={"text": text, "corpus_texts": [text]})
    body = response.json()
    assert body["risk_band"] == "high"
    assert body["risk_score"] >= 0.75


def test_plagiarism_check_flags_unrelated_text_as_low_risk():
    text = "This chapter discusses the methodology used to collect and analyze survey data from respondents."
    unrelated = "The history of jazz music in the twentieth century spans several distinct stylistic movements."
    response = client.post("/plagiarism-check", json={"text": text, "corpus_texts": [unrelated]})
    assert response.json()["risk_band"] == "low"


def test_plagiarism_check_with_no_corpus_is_low_risk():
    response = client.post("/plagiarism-check", json={"text": "Some new original chapter text.", "corpus_texts": []})
    body = response.json()
    assert body["risk_band"] == "low"
    assert body["risk_score"] == 0.0
