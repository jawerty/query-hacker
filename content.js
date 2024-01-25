const API = window.browser || window.chrome;

async function main() {
	// add event listeners to the a tags and if they click on it send up a successful query with the data
	const h3s = Array.from(document.querySelectorAll("#search a h3"))

	for (let h3 of h3s) {
		const text = h3.innerText
		const link = h3.closest('a');
		link.addEventListener("click", () => {
			const activeQuery = document.querySelector("textarea[aria-label=\"Search\"]").value
			// article text
			// query
			API.runtime.sendMessage({
                action: 'get_successful_query',
                query_text: activeQuery,
                search_result_text: text
            }, function(response) {
                console.log(response)
            }); 

		})

	}

	API.runtime.onMessage.addListener(function (
		request,
		sender,
		sendResponse
	) {
		if (request.action === 'get_active_query') {
			const activeQuery = document.querySelector("textarea[aria-label=\"Search\"]").value
			sendResponse({
				active_query: activeQuery
			})
		} else if (request.action === "get_fixed_query") {
			const fixedQuery = request.fixed_query
			document.querySelector("textarea[aria-label=\"Search\"]").value = fixedQuery
			sendResponse({
				finished: true
			})
		}


		return true
	})
}	

main()