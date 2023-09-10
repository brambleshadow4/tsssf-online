export type Card = string;

export interface CardConfig
{
	order: {},
	standard: {[key:string]: CardProps},
	custom: {
		cards: {[key:string]: CardProps},
		descriptions: PackListItem[],
		currentSize: number
	}
}

interface CardPropsBase {
	url: string,
	thumb: string,
	title?: string
}

export interface ShipProps extends CardPropsBase {
	action?: string
}

export interface PonyProps extends CardPropsBase {
	name: string,
	gender: "male" | "female",
	race: "earth" | "pegasus" | "unicorn" | "alicorn",
	keywords: string[],
	altTimeline?: true,
	count?: number,
	changeGoalPointValues?: true,

	action?: string
}

export interface GoalProps extends CardPropsBase {
	points: string,
	goalLogic?: string,
	goalFun?: (model: GameModel) => boolean
}


export type CardProps = PonyProps & GoalProps & ShipProps;

export type CardSetProps = {

	action?: string,
	name: Set<string>,
	gender: Set<"male" | "female">,
	race: Set<"earth" | "pegasus" | "unicorn" | "alicorn">
	keywords: Set<string>,
	altTimeline: Set<true>,
	count?: number,
	changeGoalPointValues?: true,
	card: string,
}

export type OverrideProps = {

	action?: string,
	name?: string,
	gender?: "male" | "female",
	race?: "earth" | "pegasus" | "unicorn" | "alicorn"
	keywords?: string[],
	altTimeline?: true,
	count?: number,
	changeGoalPointValues?: true,
	card?: string,
	fullCopy?: Card,
	disguise?: Card, 
	shipWithEverypony?: true
}

export type Location = string;

export type CardElement = HTMLElement & {brand: "card"}

export interface Player
{
	id: number,
	name: string,

	hand: Card[],
	disconnected: number,
	team: string,
	winnings: {card: Card, value: number}[],
	ponies: number,
	ships: number,
	isHost: boolean,
	
	socket: any,
}

export interface GameModel
{
	//keepLobbyOpen: boolean,
	//ruleset: string,

	players: Player[],

	// Game state
	board: {
		[key:string]: {
			card: Card,
			element?: CardElement,
		}
	},

	ponyDiscardPile: Card[],
	shipDiscardPile: Card[],
	goalDiscardPile: Card[],

	currentGoals: Card[],
	achievedGoals: Set<Card>,

	removed: Card[],
	tempGoals: Card[],


	//messageHistory: string[],
}

/*export interface GameModelServer extends GameModel
{
	ponyDrawPile: Card[],
	shipDrawPile: Card[],
	goalDrawPile: Card[],

	turnstate?: Turnstate

	cardLocations: {[k:string] : string};

	getCurrentShipSet(): Set<string>;
	getCurrentPositionMap(): {[key:string]: Location}
}*/

export interface GameOptions 
{
	cardDecks: string[],
	startCard: string,
	keepLobbyOpen: boolean,
	teams: {[key: string]: string},
	ruleset: "turnsOnly" | "sandbox"
}

export function defaultGameOptions(): GameOptions
{
	return {
		cardDecks: ["Core.*"],
		startCard: "Core.Start.FanficAuthorTwilight",
		keepLobbyOpen: false,
		teams: {},
		ruleset: "turnsOnly"
	};
}

export function allCardsGameOptions(): GameOptions
{
	return {
		cardDecks: ["*"],
		startCard: "Core.Start.FanficAuthorTwilight",
		keepLobbyOpen: false,
		teams: {},
		ruleset: "turnsOnly"
	};
}

export interface ChangelingContextList
{
	list: {[prop: string]: any},
	method?: "play" | "replace" | "lovePoison" | "swap" | "ship",
	shipRollbackPony: Card,
	preSwapShippedTo: Card[]
}

export interface TurnstateBase
{
	playedThisTurn: Set<any>,
	currentPlayer: string,
	overrides: {
		[key:string]: OverrideProps
	}
}

export interface Turnstate extends TurnstateBase
{
	playedShips: [Card, Card][],
	playedShipCards: Card[],
	playedPonies: Card[],

	positionMap: {
		[card:string]: Location
	}

	changelingContexts: {
		[card:string]: ChangelingContextList
	},

	swapsCommitted: number,
	swaps: number,

	shipSet: Set<string>,

	brokenShipsCommitted: Card[][],
	brokenShips: Card[][],

	specialEffects:{
		shipWithEverypony: Set<Card>,
		larsonEffect?: boolean
	}

	updateSpecialEffects: (board: {[key:string]: {card: Card, element?: HTMLElement}}) => void,
	getChangeContext(card: Card): ChangelingContextList
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

export interface PackListPack
{
	pack: string,
	name: string,
	box: boolean,
	startCards: Card[],
}

export interface PackListHeader
{
	h: string,
	id?: string
}

export type PackListItem = PackListPack | PackListHeader;

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

export function isGoalActiveInLocation(location: Location)
{
	return location.startsWith("goal,") || location == "tempGoals";
}

export function isTableOffsideLoc(location: Location)
{
	return location == "tempGoals" || location == "removed";
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

export function isDrawLoc(location: Location)
{
	return location.startsWith("shipDrawPile") || 
		location.startsWith("ponyDrawPile") || 
		location.startsWith('goalDrawPile')
}

export function slashStringToSet(s: string | undefined): Set<string>
{
	if(s == undefined) return new Set();
	return new Set(s.split("/"));
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