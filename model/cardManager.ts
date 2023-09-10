import cards from "./cards.js";
import {CardProps, isStart, GameOptions, CardConfig} from "./lib.js";

var allCards: {[key:string]: CardProps} = {};
var gameCards: {[key:string]: CardProps} = {};




function slashStringToSet(s: string | undefined): Set<string>
{
	if(s === undefined){
		return new Set();
	}

	return new Set(s.split("/"));
}


export function init(cardConfig: CardConfig, gameOptions: GameOptions)
{
	let filter = gameOptions.cardDecks.concat(gameOptions.startCard);
	let customCards =  cardConfig.custom.cards;
	let newAllCards: {[key: string]: any} = {};

	// convert base cards
	for(var key in cards)
	{
		newAllCards[key] = JSON.parse(JSON.stringify(cards[key]));

		var urlToImg = "/packs/" + key.split(".").join("/");
		newAllCards[key].url = urlToImg + ".png";
		newAllCards[key].thumb = urlToImg + ".thumb.jpg";
	}

	// convert custom cards
	for(var key in customCards)
	{
		newAllCards[key] = JSON.parse(JSON.stringify(customCards[key]));

		if(newAllCards[key].thumb == undefined)
		{
			newAllCards[key].thumb = newAllCards[key].url;
		}
	}

	allCards = newAllCards;

	// set gameCards global
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

			if(key.startsWith(match) && !isStart(key))
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
