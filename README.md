# query-hacker (10x Queries)
I built this during this [livestream](https://youtube.com/live/g7ZURZgwZaw)

You can download the project and unpack it in a chrome browser.

# How I built it
Technologies
- Transformers.js
- Chrome extension
- Llama 2 (w/ runpod.io)

How it augments the query
1) It Generate embeddings for successful queries you make
2) Then it uses RAG using previous successful queries from a vector db to generate the new query

# How to use it
Make a Google Search, open up the popup and click "Query Fix". It should only take a moment for a new query to replace your current query