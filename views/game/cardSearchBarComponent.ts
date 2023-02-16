import {isPony, isShip, isGoal, isStart, Card, CardProps} from "../../model/lib.js";
import * as cm from "../../model/cardManager.js";
import s from "../tokens.js";

/**
 * Creates a cardSearchBar control
 * onFilterChange gets called whenever the filters are updated.
 */
export function cardSearchBar(
	cards: {[key:string]: CardProps},
	onFilterChange?: (newfilters: [string, any][]) => any
): [HTMLElement, (newfilters: [string, any][]) => void]
{
	let filters: [string, any][] = [];

	var bar = document.createElement('div');
	bar.className = "cardSearchBar"

	var input = document.createElement("input");
	let activeFilters = document.createElement('span');
	activeFilters.className = "csbActiveFilters";

	input.placeholder = s.SearchBarPlaceholder;

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

	function setFilters(newFilters: [string, any][])
	{
		filters = newFilters;
		if(onFilterChange)
		{
			onFilterChange(filters);
		}

		input.value = "";
		renderFilters();
		processInput();
	}

	/** oninput event handler */
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
					setFilters(filters.concat([suggestion]))
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


	/** draw the filters */
	function renderFilters()
	{
		activeFilters.innerHTML = "";

		for(let filter of filters)
		{
			var div = document.createElement('div');
			
			div.innerHTML = "<span>" + toFilterName(filter) + "</span>";

			let clearFilterButton = document.createElement('img');
			clearFilterButton.src = "/img/close.svg";
			clearFilterButton.className = "csbClearFilter ";
			div.className = filter[0] + "Filter defFilter";
			div.appendChild(clearFilterButton);

			clearFilterButton.onclick = function()
			{
				let x = filters.indexOf(filter);
				if(x > -1)
				{

					let newfilters = filters.slice();
					newfilters.splice(x, 1);

					setFilters(newfilters);
				}
			}

			activeFilters.appendChild(div);
		}
	}

	var potentialResults = buildSuggestions(cards);


	function getSuggestions(text: string)
	{
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
			}
		}

		matches.sort((a,b) => suggestionScore(a) - suggestionScore(b));
		matches = matches.slice(0,10);
		return matches.map(x => potentialResults[x]);
	}

	function suggestionScore(text: string): number
	{
		if(text.startsWith("type")) return 1;
		if(text.startsWith("pack")) return 2;
		if(text.startsWith("name")) return 3;
		if(text.startsWith("race")) return 4;
		if(text.startsWith("gender")) return 5;
		if(text.startsWith("alttimeline")) return 6;
		if(text.startsWith("changegoal")) return 7;
		if(text.startsWith("count")) return 8;
		if(text.startsWith("type")) return 9;
		if(text.startsWith("action")) return 10;
		if(text.startsWith("points")) return 11;
		if(text.startsWith("goal")) return 12;
		if(text.startsWith("keyword")) return 13;
		if(text.startsWith("title")) return 14;
		return 15;
	}


	return [bar, setFilters];
}

let cahcedFiltersClasses = {};


function buildSuggestions(cards: {[key:string]: CardProps})
{
	var potentialResults: {[key:string]: [string, any]} = {};

	var noSearchProps = new Set(["url","thumb", "goalFun", "changeGoalPointValues", "noLogic", "altTimeline", "card"]);

	for(let card in cards)
	{
		let cardProps = cards[card];


		if(isPony(card))
		{
			potentialResults["type pony"] = ["type", "pony"]
		}
		if(isShip(card))
		{
			potentialResults["type start"] = ["type", "start"]
		}
		if(isStart(card))
		{
			potentialResults["type ship"] = ["type", "ship"]
		}
		if(isGoal(card))
		{
			potentialResults["type goal"] = ["type", "goal"];

			if(cardProps.goalLogic)
			{
				let pieces = cardProps.goalLogic.split(/,|\|\||\(|\)|&&/);

				for(let piece of pieces)
				{
					let [part1,part2, ...others] = piece.split(/=|!=| in | !in /g);

					if(others.length != 0 || !part1 || !part2)
						continue;

					if(part1.trim().endsWith("_b"))
						continue;

					part1 = part1.trim();
					part2 = part2.trim();

					if(part2 == "keywords")
					{
						let swap = part1;
						part1 = part2;
						part2 = swap;	
					}

					if(part1 == "altTimeline" || noSearchProps.has(part1))
					{
						//potentialResults["alttimeline apocalpyse hourglass"] = ["altTimeline", true];
						continue;
					}

					let [propOut, valOut] = propValueOverrides(part1, part2);
					let searchText = (propOut + " " + valOut).toLowerCase();

					if(!potentialResults[searchText])
					{
						potentialResults[searchText] = [propOut, valOut];
					}
				}
			}
		}

		for(let prop in cardProps)
		{
			if(noSearchProps.has(prop)) { continue; }



			let x = card.substring(0, card.lastIndexOf('.'));
			let namespace = x.substring(0, x.lastIndexOf("."));

			if(namespace.startsWith("X."))
				potentialResults["custom pack " + namespace.toLowerCase().substring(2).replace(/\./g, " ")] = [ "pack", namespace];
			else
				potentialResults["pack " + namespace.toLowerCase().replace(/\./g, " ")] = [ "pack", namespace];


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

	return potentialResults;
}

/**
 * Returns a list of [prop, value] filteres based on text
 */


/**
 * Converts a [prop, value] filter into a human friendly string
 * to use in place
 */
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

	if(filter[0] == "pack")
	{
		if(filter[1] == "EC")
			return "Pack: Extra Credit";
		if(filter[1] == "PU")
			return "Pack: Ponyville University";

		let prefix = "Pack: ";

		let packName = filter[1];

		if(filter[1].startsWith("X."))
		{
			prefix = "Custom Pack: ";
			packName = packName.substring(2);
		}

		return prefix + packName.replace(/([A-Z])/g, " $1").replace(/\./g, " ");
	}

	if(filter[0] == "altTimeline")
		return "Alt Timeline/Hourglass/Apocalypse";

	let propName = filter[0][0].toUpperCase() + filter[0].substring(1);

	if(propName == "GoalLogic") return "Goal: " + filter[1];
	return propName + ": " + filter[1];

}
 /**
  * returns a prop + value pair for a given prop/value pair to use  in place of the original.
  * This creates equivlance classes for various props that otherwise would have a unique value
  * and not be super useful on their own.
  */
function propValueOverrides(prop: string, value: string | undefined): [string, string]
{
	if(!value)
		return [prop, ""];

	if(prop == "action")
	{
		if(value.startsWith("Changeling"))
			return ["action", "Changeling"];
		if(value.startsWith("addKeywords"))
			return ["action", "Add Keywords"];
			if(value.startsWith("Reminder"))
			return ["action","Special"];
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

/**
 * Given a Card and a list of [string, prop] filters,
 * does this card match evey filter in filters?
 */
export function doesCardMatchFilters(card: Card, filters: [string, any][]): boolean
{
	let cardProps = cm.all()[card];
	for(let filter of filters)
	{
		let propName = filter[0];
		let propValue = filter[1];
		let [_, cardPropValue] = propValueOverrides(propName, (cardProps as any)[propName]);

		if(propName == "pack")
		{
			let x = card.substring(0, card.lastIndexOf("."));
			x = x.substring(0, x.lastIndexOf("."));

			if(x != propValue)
			{
				return false;
			}
			continue;

		}

		if(propName == "type")
		{
			// type prop isn't on card, so use propValue
			switch(propValue)
			{
				case "pony": if(!isPony(card)) return false; break;
				case "start": if(!isStart(card)) return false; break;
				case "ship": if(!isShip(card)) return false; break;
				case "goal": if(!isGoal(card)) return false; break;
			}

			continue;
		}

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
			else if(propName == "title")
			{
				if(propValue != cardPropValue)
				{
					return false;
				}
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