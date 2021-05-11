import {isGoal, Card} from "../../server/lib.js";
import * as cm from "../../server/cardManager.js";

export function cardSearchBar(onFilterChange?: (newfilters: [string, any][]) => any): [HTMLElement, Function]
{

	let filters: [string, any][] = [];

	let onFilderChangeHandler = onFilterChange || (() => {});

	var bar = document.createElement('div');
	bar.className = "cardSearchBar"



	var input = document.createElement("input");
	let activeFilters = document.createElement('span');
	activeFilters.className = "csbActiveFilters";

	input.placeholder = "Search name, race, gender, etc."

	function processInput()
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

					if(onFilterChange)
					{
						onFilterChange(filters);
					}

					input.value = "";
					renderFilters();
					processInput();
				}	

				searchSuggestions.appendChild(div);
			}
		}
	}
	input.oninput = processInput;

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
			div.innerHTML = "<span>" + propName + ": " + filter[1] + "</span>";

			let clearFilterButton = document.createElement('img');
			clearFilterButton.src = "/img/close.svg";
			clearFilterButton.className = "csbClearFilter";
			div.appendChild(clearFilterButton);

			clearFilterButton.onclick = function()
			{
				let x = filters.indexOf(filter);
				if(x > -1)
				{
					filters.splice(x, 1);

					if(onFilterChange)
					{
						onFilterChange(filters);
					}
					
					renderFilters();
				}
			}

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

export function doesCardMatchFilters(card: Card, filters: [string, any][]): boolean
{
	let cardProps = cm.inPlay()[card];
	for(let filter of filters)
	{
		if(isGoal(card))
		{
			if(filter[0] == "points")
			{
				if((cardProps as any)[filter[0]] != filter[1])
				{
					return false;
				}
			}
			else if(filter[0] == "gender" && filter[1]=="male")
			{
				let text = cardProps.goalLogic || "";
				text = text.replace(/female/g,"");
				if(text.indexOf("male") == -1){ return false; }
			}
			else if((!cardProps.goalLogic || cardProps.goalLogic.indexOf(filter[1]) == -1))
			{
				return false;
			}
		}
		else if(filter[0] == "keywords")
		{
			if(!cardProps.keywords || cardProps.keywords.indexOf(filter[1]) == -1){ return false; }
		}

		else if((cardProps as any)[filter[0]] != filter[1])
		{
			return false;
		}
	}

	return true;
}