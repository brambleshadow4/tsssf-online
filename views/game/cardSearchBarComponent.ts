import {isGoal, Card} from "../../server/lib.js";
import * as cm from "../../server/cardManager.js";

export function cardSearchBar(onFilterChange?: (newfilters: [string, any][]) => any): HTMLElement
{

	let filters: [string, any][] = [];

	let onFilderChangeHandler = onFilterChange || (() => {});

	var bar = document.createElement('div');
	bar.className = "cardSearchBar"



	var input = document.createElement("input");
	let activeFilters = document.createElement('span');
	activeFilters.className = "csbActiveFilters";

	input.placeholder = "Search name, race, gender, etc.";

	input.onkeydown = function(e)
	{
		if(e.key == "ArrowDown")
		{
			e.preventDefault();
			var el = searchSuggestions.getElementsByClassName('selected')[0];

			if(!el)
			{
				el = searchSuggestions.children[0];
				if(el)
				{
					el.classList.add('selected');
				}
			}
			else
			{
				var nextEl = el.nextElementSibling;

				if(nextEl)
				{
					el.classList.remove('selected');
					nextEl.classList.add('selected');
				}
			}
		}
		if(e.key == "ArrowUp")
		{
			e.preventDefault();
			var el = searchSuggestions.getElementsByClassName('selected')[0];

			if(el)
			{
				var previousEl = el.previousElementSibling;

				if(previousEl)
				{
					el.classList.remove('selected');
					previousEl.classList.add('selected');
				}
			}
		}
		if(e.key == "Enter")
		{
			var el = searchSuggestions.getElementsByClassName('selected')[0];
			if(el)
			{
				(el as any).click();
			}
		}
	}

	function processInput()
	{
		searchSuggestions.innerHTML = "";

		if(input.value.trim() != "")
		{
			let matches = getSuggestions(input.value);

			for(let suggestion of matches)
			{
				
				let div = document.createElement('div');
				div.innerHTML = toFilterName(suggestion);



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

	bar.appendChild(searchSuggestions);
	bar.appendChild(input);
	bar.appendChild(activeFilters);


	function renderFilters()
	{
		activeFilters.innerHTML = "";

		for(let filter of filters)
		{
			var div = document.createElement('div');
			
			div.innerHTML = "<span>" + toFilterName(filter) + "</span>";

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


	return bar;
}


function getSuggestions(text: string)
{
	var cards = cm.inPlay();
	var potentialResults: {[key:string]: [string, any]} = {};

	var noSearchProps = new Set(["url","thumb", "goalFun", "changeGoalPointValues", "noLogic", "altTimeline"]);

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
				var [propOut, valOut] = propValueOverrides(prop, (cardProps as any)[prop]);
				var searchText = (propOut + " " + valOut).toLowerCase();


				if(!potentialResults[searchText])
				{
					potentialResults[searchText] = [propOut, valOut];
				}
			}
		}
	}

	potentialResults["alttimeline apocalypse hourglass"] = ["altTimeline", true];

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

function toFilterName(filter: [string, string])
{

	if(filter[0] == "action")
	{
		switch(filter[1]){
			case "lovePoison": return "Action: Love Poison";
			case "newGoal": return "Action: New Goal";
			case "playFromDiscard": return "Action: Play From Discard";
			case "genderChange": return "Action: Gender Change";
			case "raceChange": return "Action: Race Change";
			case "timelineChange": return "Action: Timeline Change";
			case "makePrincess": return "Action: Make Princess"
			case "3swap": return "Action: Swap 3"
			case "fullCopy": return "Action: Full Copy"
			case "keywordChange": return "Action: Keyword Change"
			case "raceGenderChange": return "Action: Race + Gender Change"
			case "shipWithEverypony": return "Action: Ship With Everypony"
		}
	}

	if(filter[0] == "altTimeline")
		return "Alt Timeline/Hourglass/Apocalypse";

	let propName = filter[0][0].toUpperCase() + filter[0].substring(1);

	if(propName == "GoalLogic") return "Goal: " + filter[1];
	return propName + ": " + filter[1];

}

function propValueOverrides(prop: string, value: string | undefined)
{
	if(!value)
		return [prop, ""];

	if(prop == "action")
	{
		if(value.startsWith("Changeling"))
		{
			return ["action", "Changeling"];
		}
		if(value.startsWith("addKeywords"))
		{
			return ["action", "Add Keywords"];
		}
	}

	if(prop == "goalLogic" )
	{
		if(value.startsWith("ExistsShip") || value.startsWith("ExistsPonyShippedTo"))
		{
			return ["goalLogic", "Ship"];
		}

		if(value.startsWith("ExistsPony("))
		{
			return ["goalLogic", "Pony"];
		}

		if(value.startsWith("ExistsChain("))
		{
			return ["goalLogic", "Chain"];
		}

		if(value.startsWith("PlayPonies("))
		{
			return ["goalLogic", "Play Ponies"];
		}

		if(value.startsWith("PlayShip"))
		{
			return ["goalLogic", "Play Ships"];
		}

		if(value.startsWith("BreakShip("))
		{
			return ["goalLogic", "Break Ship"];
		}

		return ["goalLogic", "Misc"]
	}

	return [prop, value || ""];
}


export function doesCardMatchFilters(card: Card, filters: [string, any][]): boolean
{
	let cardProps = cm.inPlay()[card];
	for(let filter of filters)
	{
		let propName = filter[0];
		let propValue = filter[1];
		let [_, cardPropValue] = propValueOverrides(propName, (cardProps as any)[propName]);

		if(isGoal(card))
		{
			if(propName == "points" || propName == "goalLogic")
			{
				if(propValue != cardPropValue)
				{
					return false;
				}
			}
			else if(propName == "gender" && propValue == "male")
			{
				let text = cardProps.goalLogic || "";
				text = text.replace(/female/g,"");
				if(text.indexOf("male") == -1){ return false; }
			}
			else if(!cardProps.goalLogic)
			{
				return false;
			}
			else if( cardProps.goalLogic!.indexOf(propValue) == -1 || cardProps.goalLogic!.indexOf(propName) == -1)
			{
				return false;
			}
		}
		else if(propName == "keywords")
		{
			if(!cardProps.keywords || cardProps.keywords.indexOf(propValue) == -1){ return false; }
		}

		else if(propValue != cardPropValue)
		{
			return false;
		}
	}

	return true;
}