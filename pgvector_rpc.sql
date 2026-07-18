-- CREATE OR REPLACE FUNCTION to perform similarity search on corpus_rules using pgvector
CREATE OR REPLACE FUNCTION public.match_corpus_rules(
  query_embedding vector(384),
  filter_domain TEXT,
  similarity_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  planet TEXT,
  sign TEXT,
  house INT,
  domain TEXT[],
  effect TEXT,
  source_text TEXT,
  strength TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cr.id,
    cr.planet,
    cr.sign,
    cr.house,
    cr.domain,
    cr.effect,
    cr.source_text,
    cr.strength,
    (1 - (cr.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.corpus_rules cr
  WHERE cr.active = TRUE
    -- If filter_domain is provided, check if it exists in the domain array
    AND (filter_domain IS NULL OR cr.domain @> ARRAY[filter_domain])
    -- Filter out matches below the similarity threshold
    AND (1 - (cr.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY cr.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
