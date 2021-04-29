import cards from "./cards.js";
import {CardProps} from "./lib.js";
import {GameModel} from "./gameServer.js";

var allCards: {[key:string]: CardProps} = {};
var gameCards: {[key:string]: CardProps} = {};

export function init(filter: string[], customCards: {[key:string]: CardProps})
{
	let newAllCards: {[key: string]: any} = {};

	for(var key in cards)
	{
		newAllCards[key] = JSON.parse(JSON.stringify(cards[key]));
		newAllCards[key].name = new Set(newAllCards[key].name);

		var urlToImg = "/packs/" + key.split(".").join("/");

		newAllCards[key].keywords = new Set(newAllCards[key].keywords);
		newAllCards[key].url = urlToImg + ".png";
		newAllCards[key].thumb = urlToImg + ".thumb.jpg";
	}

	// customCards must 
	for(var key in customCards)
	{
		newAllCards[key] = JSON.parse(JSON.stringify(customCards[key]));
		newAllCards[key].name = new Set(newAllCards[key].name);
		newAllCards[key].id = key;
	}

	allCards = newAllCards;


	var newGameCards: {[key:string]: CardProps} = {}


	let patterns = filter.filter(x => x.indexOf("*") > -1);
	let selectedCards = new Set(filter.filter(x => x.indexOf("*") == -1));

	for(var key in newAllCards)
	{
		if(selectedCards.has(key))
		{
			newGameCards[key] = allCards[key];
			continue;
		}

		for(let pattern of patterns)
		{
			let match = pattern.substring(0, pattern.indexOf("*"));

			if(key.startsWith(match))
			{
				newGameCards[key] = allCards[key];
				continue;
			}
		}
	}

	gameCards = newGameCards;
}

export function all()
{
	return allCards;
}

export function inPlay()
{
	return gameCards
}
