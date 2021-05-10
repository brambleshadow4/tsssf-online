
import * as cm from "../../server/cardManager.js";




export function cardSearchBar(onFilterChange?: () => any): [HTMLElement, Function]
{

	let filters: [string, any][] = [];

	let onFilderChangeHandler = onFilterChange || (() => {});

	var bar = document.createElement('div');
	bar.className = "cardSearchBar"



	var input = document.createElement("input");
	let activeFilters = document.createElement('span');
	activeFilters.className = "csbActiveFilters";

	input.placeholder = "Search name, race, gender, etc."


	input.oninput = function(e)
	{
		searchSuggestions.innerHTML = "";

		alignSearchSuggestions();

		if(input.value.trim() != "")
		{
			let matches = getSuggestions(input.value);

			for(let suggestion of matches)
			{
				var div = document.createElement('div');
				let propName = suggestion[0][0].toUpperCase() + suggestion[0].substring(1);
				div.innerHTML = propName + ": " + suggestion[1];

				div.onclick = function()
				{
					filters.push(suggestion);
					input.value = "";
					renderFilters();
				}

				searchSuggestions.appendChild(div);
			}
		}
	}

	let searchSuggestions = document.createElement('div');
	searchSuggestions.className = "csbSearchSuggestions";

	function alignSearchSuggestions()
	{
		let rect = input.getBoundingClientRect();
		searchSuggestions.style.top = rect.top + rect.height + "px";
		searchSuggestions.style.left = rect.left + "px";

	}


	document.body.appendChild(searchSuggestions);

	bar.appendChild(input);

	bar.appendChild(activeFilters);

	setTimeout(alignSearchSuggestions, 0);




	function renderFilters()
	{
		activeFilters.innerHTML = "";

		for(let filter of filters)
		{
			var div = document.createElement('div');
			let propName = filter[0][0].toUpperCase() + filter[0].substring(1);
			div.innerHTML = propName + ": " + filter[1];

			activeFilters.appendChild(div);
		}
	}

	function disposeHandler()
	{
		if(searchSuggestions?.parentNode)
			searchSuggestions.parentNode.removeChild(searchSuggestions);
	}


	return [bar, disposeHandler];
}


function getSuggestions(text: string)
{
	var cards = cm.inPlay();

	var potentialResults: {[key:string]: [string, any]} = {};

	var noSearchProps = new Set(["url","thumb","goalLogic"])

	for(let card in cards)
	{
		let cardProps = cards[card];

		for(let prop in cardProps)
		{
			if(noSearchProps.has(prop)) { continue; }

			if(prop == "keywords")
			{
				for(let keyword of cardProps.keywords)
				{
					var searchText = prop + " " + keyword;
					searchText = searchText.toLowerCase();
					var val = [prop, keyword] as [string, any];

					if(!potentialResults[searchText])
					{
						potentialResults[searchText] = val;
					}
				}
			}

			else
			{
				var searchText = prop + " " + (cardProps as any)[prop];
				searchText = searchText.toLowerCase();
				var val = [prop, (cardProps as any)[prop]] as [string, any];

				if(!potentialResults[searchText])
				{
					potentialResults[searchText] = val;
				}
			}

			
		}
	}

	var tokens = text.toLowerCase().split(" ");
	var matches = [];

	console.log(tokens);

	for(let key in potentialResults)
	{
		let isMatch = true;
		for(let token of tokens)
		{
			if(key.indexOf(token) < 0)
			{
				isMatch = false;
				break;
			}
		}

		if(isMatch)
		{	
			matches.push(key)
			if(matches.length >= 10)
			{
				break;
			}
		}
	}

	return matches.map(x => potentialResults[x]);
}