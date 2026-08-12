import os
from functools import lru_cache

import numpy as np
from sentence_transformers import SentenceTransformer

MODEL_NAME = "all-MiniLM-L6-v2"
MODEL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "models")


@lru_cache(maxsize=1)
def get_model():
    return SentenceTransformer(MODEL_NAME, cache_folder=MODEL_CACHE_DIR)


def embed_texts(texts):
    model = get_model()
    return model.encode(texts, convert_to_numpy=True)


def cosine_similarity(a, b):
    a = np.array(a)
    b = np.array(b)
    denom = np.linalg.norm(a) * np.linalg.norm(b)
    if denom == 0:
        return 0.0
    return float(np.dot(a, b) / denom)
