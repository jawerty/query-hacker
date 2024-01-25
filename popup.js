// Add your JavaScript code here

const API = window.browser || window.chrome;

function getActiveQuery(tabId) {
    return new Promise((resolve) => {
        API.tabs.sendMessage(tabId, {
            action: 'get_active_query'
        }, function(response) {
            resolve(response.active_query)
        }); 
    });
}

function fixQuery(activeQuery) {
    return new Promise((resolve) => {
        API.runtime.sendMessage({
            action: 'fixed_query',
            active_query: activeQuery
        }, function(response) {
            resolve(response ? response.fixed_query : "Refresh and try again 10x Query fixer broke bro")
        });
    });
}

function passFixedQuery(tabId, fixedQuery) {
    return new Promise((resolve) => {
        API.tabs.sendMessage(tabId, {
            action: 'get_fixed_query',
            fixed_query: fixedQuery
        }, function(response) {
            resolve(true)
        });
    });
}
document.getElementById('query-fix').addEventListener('click', function() {
    document.getElementById('loading').style.display = "block"
    API.tabs.query({active: true, currentWindow: true}, async function(tabs){
        const url = tabs[0].url;
        const urlObj = new URL(url);
        const isGoogle = urlObj.hostname.indexOf("google.com") > -1
        if (isGoogle) {
            const activeQuery = await getActiveQuery(tabs[0].id)
            const fixedQuery = await fixQuery(activeQuery)
            await passFixedQuery(tabs[0].id, fixedQuery)
            document.getElementById('loading').style.display = "none"
        } else {
            document.getElementById('loading').style.display = "none"

        }
         
    });
        

});
