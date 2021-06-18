import {doesCardMatchFilters, cardSearchBar} from "../game/cardSearchBarComponent.js";
import {makeCardElement} from "../game/cardComponent.js";
import s from "../tokens.js";
import * as lib from "../../server/lib.js";
import * as cm from "../../server/cardManager.js";
import faq from "./faq.js";

function buildPage()
{
	console.log(location.pathname)

	switch(location.pathname)
	{
		case "/info":
		case "/info/cardlist":
		case "/info/card":
			break;
		default:
			return;
	}


	var main = document.getElementById('main')!;

	main.innerHTML = "";

	document.head.innerHTML += "<link href='/info/knowledgeBase.css' type='text/css' rel='stylesheet' />";



	switch(location.pathname)
	{
		case "/info/cardlist":


			document.body.classList.add('cardlist');

			if(!inIframe())
			{	
				var main = document.getElementById('main')!;
				main.innerHTML += "<h1>Card Reference</h1>";
			}

			cm.init(["*"], {});
			main.appendChild(cardReference(cm.all(), false));

			break;

		case "/info/card":
			cm.init(["*"], {});

			let card = location.search.substring(1);
			let cardProps = cm.all()[card];



			let faqHTML = ""; 

			let tags = getFaqTags(card, cardProps);

			let previouslyAsked = new Set();


			for(let tag of tags)
			{
				if(!faq[tag]) continue;
				for(let q of faq[tag])
				{
					if(!previouslyAsked.has(q))
					{
						previouslyAsked.add(q);
						faqHTML += q + "\n";s
					}
				}
			}


			if(faqHTML.length)
			{
				faqHTML = "<h2>FAQ</h2>" + faqHTML;
			}



			if(cardProps)
			{
				let pageName = cardProps.title || card;



				main.innerHTML = `
				<h1>${pageName}</h1>

				<img class='card-aside' src="${cardProps.url}" />

				<div class='props-container'>
					${makeJsonHTML(card, cardProps)}
				</div>

				<div style="clear: both; padding-top: 10px"/>

				${faqHTML}

				`
			}
	}
}

function getFaqTags(card: lib.Card, props: lib.CardProps)
{
	let tags: string[] = [];

	if(props.gender as string == "male/female") tags.push("male-female");

	
	if(props.goalLogic && props.goalLogic.startsWith("BreakShip")) tags.push("breaking-ships");
	if(props.goalLogic && props.goalLogic.startsWith("ExistsChain")) tags.push("chain");
	if(props.action && props.action.startsWith("Changeling")) tags.push("changeling");
	if(props.count == 2) tags.push("two-pony-card");
	if(props.action == "clone") tags.push("clone");
	if(props.action == "copy") tags.push("copy");
	if(props.action == "genderChange") tags.push("gender-change");
	if(props.action == "keywordChange") tags.push("keyword-change");
	if(props.action == "lovePoison") tags.push("love-poison");
	if(props.action == "newGoal") tags.push("new-goal");
	if(props.action == "playFromDiscard") tags.push("play-from-discard");
	if(props.goalLogic && props.goalLogic.startsWith("PlayPonies")) tags.push("play-pony");
	if(props.goalLogic && props.goalLogic.startsWith("PlayShips(")) tags.push("play-ship");
	if(props.action == "raceChange") tags.push("race-change");
	if(props.action == "replace") tags.push("replace");
	if(props.action == "search") tags.push("search");
	if(props.action == "swap") tags.push("swap");
	if(props.keywords && props.keywords.indexOf("princess") > -1) tags.push("princess");
	



	if(props.race == "alicorn") tags.push("alicorn");
	if(props.altTimeline) tags.push("alt-timeline")
	if(lib.isPony(card) && props.action) tags.push("pony-action")
	if(props.keywords && props.keywords.indexOf("princess") > -1) tags.push("princess");

	if(lib.isGoal(card)) tags.push("goals");

	tags.push(card);

	return tags;




/*
 
 * turn-order
	disconnected-cards

 */

}


function makeJsonHTML(card: lib.Card, props: lib.CardProps)
{
	var lines = [];

	let noUrlProps = new Set(["goalLogic", "title"])
	for(let prop of Object.keys(props))
	{
		if(prop == "url" || prop == "thumb")
			continue;

		if(prop == "keywords")
		{
			let keywordLines = props.keywords.map(x => {
				let encodedValue = x.replace(/#/g,"%23");
				return `\t\t"<a href="/info/cardlist?keywords=${encodedValue}">${x}</a>"`
			}).join(",\n");

			if(keywordLines.length)
			{
				lines.push('\t"keywords": [\n' + keywordLines +'\n\t]');
			}
			else
			{
				lines.push(`\t"keywords": []`);
			}

		}
		else
		{
			let value = (props as any)[prop];

			let encodedValue = encodeURI(value).replace(/#/g,"%23");

			if(noUrlProps.has(prop))
				lines.push(`\t"${prop}": "${value}"`)
			else
				lines.push(`\t"${prop}": "<a href="/info/cardlist?${prop}=${encodedValue}">${value}</a>"`)
		}
	}

	return "<div class='props'>\"" + card + "\": {\n" + lines.join(",\n") + "\n}\n</div>"
}

let currentState = location.search;

function inIframe () 
{
	try {
		return window.self !== window.top;
	} 
	catch (e) {
		return true;
	}
}

buildPage();

export function cardReference(cards: {[key:string]: lib.CardProps}, openInNewTab: boolean): HTMLElement
{
	var popupPage = document.createElement('div')
	popupPage.className = "popupPage";

	var [serachBar, setFilters] = cardSearchBar(cards, renderCards);
	popupPage.appendChild(serachBar);


	var cardDiv = document.createElement("div");


	function renderCards(filters: [string, any][])
	{
		cardDiv.innerHTML = "";

		var keys = Object.keys(cards);
		var ponyReference = document.createElement('div');
		
		keys.sort(namespaceSort);
		for(let key of keys)
		{
			if(!doesCardMatchFilters(key, filters)) continue;

			let cardDiv = makeCardElement(key)

			cardDiv.onclick = function(e)
			{
				if(openInNewTab || e.ctrlKey)
				{
					window.open("/info/card?" + key);
				}
				else
				{
					location.href = "/info/card?" + key;
				}
			};
			

			ponyReference.appendChild(cardDiv)
			
			if(window.location.pathname == "/info/cardlist")
			{

				let query = filtersToQueryString(filters);

				if(currentState != query)
				{
					history.replaceState({}, "", query);
					currentState = query;
				}

			}

		}

		cardDiv.appendChild(ponyReference);
	}

	

	if(location.pathname == "/info/cardlist" && location.search.length)
	{
		setFilters(queryStringToFilters(location.search.substring(1)));
	}
	else
	{
		setFilters([]);
	}


	popupPage.appendChild(cardDiv);

	return popupPage;
}

function filtersToQueryString(filters: [string, any][]): string
{
	return "?" + filters.map(p => {

		let [prop, value] = p;

		return prop + "=" + ("" + value).replace(/#/g,"%23");
	}).join("&");
}	

function queryStringToFilters(s: string): [string, any][]
{
	let query = decodeURI(s);
	query = query.replace(/%23/g, "#");

	let pieces = query.split("&");
	let filters: [string,any][] = [];

	for(let piece of pieces)
	{
		let [prop, value] = piece.split("=");
		let valueAny = value as any;

		if(value == "true")
		{
			valueAny = true;
		}

		if(!isNaN(Number(value)))
		{
			valueAny = Number(value);
		}

		filters.push([prop, valueAny]);
	}

	return filters
}

function namespaceOrder(namespace: string[])
{
	let first = namespace[0];
	switch(first)
	{
		case "Core": return 1;
		case "EC": return 2;
		case "PU": return 3;
		case "NoHoldsBarred": return 4;
		default: return 5;
	}
}

function namespaceSort(a: lib.Card, b: lib.Card)
{	
	let namespaceA = a.split(".");
	let nameA = namespaceA.pop() as string;
	let typeA = namespaceA.pop() as string;

	let namespaceB = b.split(".");
	let nameB = namespaceB.pop() as string;
	let typeB = namespaceB.pop() as string;


	let typeMap = {"Pony": 1, "Start": 2, "Ship": 3, "Goal": 4} as {[key:string] : number}

	if(typeMap[typeA] != typeMap[typeB])
		return typeMap[typeA] < typeMap[typeB] ? -1 : 1;

	if(namespaceOrder(namespaceA) != namespaceOrder(namespaceB))
		return namespaceOrder(namespaceA) < namespaceOrder(namespaceB) ? -1 : 1;


	let keyA = namespaceA.join(".") + "." + nameA;
	let keyB = namespaceB.join(".") + "." + nameB;


	if (keyA == keyB)
		return 0;

	return keyA < keyB ? -1 : 1;
}
