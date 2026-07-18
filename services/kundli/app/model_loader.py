from sentence_transformers import SentenceTransformer

_model = None

def get_embedding_model():
    """
    Singleton getter for SentenceTransformer model to prevent reloading weights.
    """
    global _model
    if _model is None:
        print("Loading SentenceTransformer model 'all-MiniLM-L6-v2' globally...")
        _model = SentenceTransformer('all-MiniLM-L6-v2')
    return _model
