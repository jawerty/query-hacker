import { pipeline, env } from "./transformers.js";

env.allowLocalModels = false;

env.backends.onnx.wasm.numThreads = 1;


class LLM {
    constructor() {
        this.API_KEY = "WQ7MSRKWX1GFN0MV65468BUNWYR217ANL1SB2ULB";
    }

    async llama2Request(prompt, json) {
        const response = await fetch('https://api.runpod.ai/v2/llama2-13b-chat/runsync', {
            method: "POST",
            headers: {
                'accept': 'application/json',
                'authorization': this.API_KEY,
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                "input": {
                    "prompt": prompt,
                    "sampling_params": {
                       "max_tokens": 4096,
                       "n": 1,
                       "frequency_penalty": 0.01,
                       "temperature": 0.95,
                    }
                }
            })
        });
        const result = await response.json()

        const textResponse = result['output']['text'][0]
        if (json) {
            let jsonResponse;
            try {
                jsonResponse = JSON.parse(textResponse)
            } catch(e) {
                console.log("JSON parsing failed")
                console.log(textResponse)
                const indexStart = textResponse.indexOf("{")
                const indexEnd = textResponse.indexOf("}") + 1
                try {
                    jsonResponse = JSON.parse(textResponse.slice(indexStart, indexEnd))
                } catch(e) {
                    console.log(e)
                    jsonResponse = null
                }
            }
            return jsonResponse;
        } else {
            return textResponse;
        }
    }

    getPromptForQueryFixing(query, pastSuccessfulQueries) {
        return `
            [INST]
            <<SYS>>
            You are a Google query optimizer bot. Your role is to get a google query with some examples of successful google queries and modify the original Google query to get better results for the user.

            You must follow the instructions below:
            - Determine the pattern for why the given successful queries were successful
            - Then modify the given query to adhere to this pattern
            - Do not change the given queries topic to be similar to the past queries just the general structure and wording of the queries 
            - Do not make your response like a search result, modify the query to be in natural language.
            
            The user will provide the past successful queries in the format below:
            SUCCESSFUL QUERY #1:
                - Query: the successful query will go here
                - Query Result: The successful query result will go here

            The user will provide the query you must modify in the format below:
            GOOGLE QUERY: the query will go here

            
            Tag your fixed query with the keyword FIXED-QUERY: and follow with the fixed query
            <</SYS>>
            ${pastSuccessfulQueries.map((query) => {
                return `\nSUCCESSFUL QUERY #1:\n\t- Query: ${query.query_text}\n\t- Query Result: ${query.query_search_result_text}`
            })}

            GOOGLE QUERY: ${query}
            [/INST]
        `.trim()
    }

    
}

async function retrieveSimilarQueries(query_embedding, k) {
    function calcVectorSize(vec) {
      return Math.sqrt(vec.reduce((accum, curr) => accum + Math.pow(curr, 2), 0));
    };

    function cosineSimilarity(vec1, vec2) {
      const dotProduct = vec1.map((val, i) => val * vec2[i]).reduce((accum, curr) => accum + curr, 0);
      const vec1Size = calcVectorSize(vec1);
      const vec2Size = calcVectorSize(vec2);

      return dotProduct / (vec1Size * vec2Size);
    };

    const { query_store } = await chrome.storage.local.get(["query_store"])

    const sortedQueryStore = query_store.sort((a, b) => {
        return cosineSimilarity(b.embedding, query_embedding) -  cosineSimilarity(a.embedding, query_embedding)
    })
    
    return sortedQueryStore.slice(0, k)
}

async function main() {
    const llm = new LLM();

    const pipe = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

    

    chrome.runtime.onMessage.addListener(function (
        request,
        sender,
        sendResponse
    ) {
        if (request.action === 'get_successful_query') {
            const queryText = request.query_text;
            const querySearchResultText = request.search_result_text;

            pipe(queryText, { pooling: 'mean', normalize: true }).then((res) => {
                const embedding = Array.from(res['data'])

                console.log(embedding);
                // updating the vector db
                chrome.storage.local.get(["query_store"]).then((result) => {
                    const storedQueries = result?.query_store || [] // default it to an empty array

                    storedQueries.push({
                        query_text: queryText,
                        query_search_result_text: querySearchResultText,
                        embedding: embedding
                    });

                    chrome.storage.local.set({ query_store: storedQueries })
                });

            })
        } else if (request.action === "fixed_query") {
            const query = request.active_query
            // fetch the similar examples for the prompts

            pipe(query, { pooling: 'mean', normalize: true }).then((res) => {
                const embedding = Array.from(res['data'])
                retrieveSimilarQueries(embedding, 3).then((similarQueries) => {
                    
                    const prompt = llm.getPromptForQueryFixing(query, similarQueries)

                    llm.llama2Request(prompt, false).then((fixedQuery) => {
                        const filteredFixedQuery = fixedQuery.split('\n').filter((result) => {
                            return result.indexOf("FIXED-QUERY") > -1
                        });
                        if (filteredFixedQuery.length > 0) {
                            sendResponse({ fixed_query: filteredFixedQuery[0].slice(filteredFixedQuery[0].indexOf("FIXED-QUERY:")+"FIXED-QUERY:".length) })
                        } else {
                            sendResponse({ fixed_query: "Refresh and try again 10x Queries failed bro" })
                        }
                    })
                })
            })

        }

        return true
    })  
}

main()