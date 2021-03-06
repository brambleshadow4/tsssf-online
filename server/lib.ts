export type Card = string
export type Location = string;

export type CardElement = HTMLElement & {brand: "card"}

export interface GameModel
{
	board: {
		[key:string]: {
			card: Card,
			element?: CardElement,
		}
	},

	cardDecks: string[],

	ponyDiscardPile: Card[],
	shipDiscardPile: Card[],
	goalDiscardPile: Card[],

	ponyDrawPile: Card[],
	shipDrawPile: Card[],
	goalDrawPile: Card[],

	currentGoals: {card: Card, achieved: boolean}[],

	turnstate?: Turnstate,


	keepLobbyOpen: boolean,

	players: any[],


	startCard: Card,
	ruleset: string,

	messageHistory: string[],
}

export interface ChangelingContextList
{
	list: {[prop: string]: any},
	rollback: {}
}

export interface Turnstate
{
	currentPlayer: string,
	overrides: {
		[key:string]: {
			[prop:string]: any
		}
	}

	tentativeShips: {
		[key: string]: any
	}

	playedShips: [Card, Card, Card][],
	playedPonies: Card[],

	specialEffects:{
		shipWithEverypony: Set<Card>,
		larsonEffect?: boolean
	}

	updateSpecialEffects: () => void,

	playedThisTurn: Set<any>,

	brokenShips: string[][],
	brokenShipsNow: string[][],

	positionMap: {
		[card:string]: Location
	}

	changelingContexts: {
		[card:string]: ChangelingContextList
	},

	swaps: number,
	swapsNow: number,

	shipSet: Set<string>,

	clientProps: () => any

}

export function isPony(card: Card)
{
	return card.indexOf(".Pony.") >= 0 || card == "anon:pony";
}
export function isShip(card: Card)
{
	return card.indexOf(".Ship.") >= 0 || card == "anon:ship";
}

export function isGoal(card: Card)
{
	return card.indexOf(".Goal.") >= 0;
}


export function isPonyOrStart(card: Card)
{
	return card.indexOf(".Pony.") >= 0 || card.indexOf(".Start.") >= 0;
}

export function isStart(card: Card)
{
	return card.indexOf(".Start.") >= 0;
}

export function isBlank(card: Card)
{
	return card.startsWith("blank:");
}

export function isAnon(card: Card)
{
	return card.startsWith("anon:");
}

export function randomizeOrder(arr: any [])
{
	var len = arr.length;

	for(var i=0; i<len; i++)
	{
		var k = Math.floor(Math.random() * len);

		var swap = arr[i];
		arr[i] = arr[k];
		arr[k] = swap;
	}

	return arr;
}


export function isBoardLoc(location: Location)
{
	return location && (location.startsWith("p,") || location.startsWith("sr,") || location.startsWith("sd,"));
}

export function isOffsetLoc(location: Location)
{
	return location.startsWith("offset,");
}

export function isGoalLoc(location: Location)
{
	return location.startsWith("goal,");
}

export function isPlayerLoc(location: Location)
{
	return location.startsWith("player,");
}

export function isDiscardLoc(location: Location)
{
	return location.startsWith("shipDiscardPile,") || 
		location.startsWith("ponyDiscardPile,") || 
		location.startsWith('goalDiscardPile,')
}


export function isCardIncluded(card: Card, model:{startCard: Card, cardDecks: string[]})
{
	if(isPonyOrStart(card) && !isPony(card))
	{
		return card == model.startCard;
	}

	for(var rule of model.cardDecks)
	{
		if(card == rule)
			return true;

		var i = rule.indexOf("*");

		if(i != -1 && card.startsWith(rule.substring(0,i)))
		{
			return true
		}
	}

	return false;
}

export function getNeighborKeys(boardLocation: Location): Location[]
{
	var type, x,y;
	[type,x,y] = boardLocation.split(",");
	x = Number(x);
	y = Number(y)

	if(type == "p")
	{
		return [
			"sr," + x + "," + y,
			"sr," + (x-1) + "," + y,
			"sd," + x + "," + y,
			"sd," + x + "," + (y-1)
		];
	}

	if(type == "sr")
	{
		return [
			"p," + x + "," + y,
			"p," + (x+1) + "," + y,
		]
	}

	if(type == "sd")
	{
		return [
			"p," + x + "," + y,
			"p," + x + "," + (y+1),
		]
	}
	
	throw Error("bad location passed to getNeighborKeys");
}