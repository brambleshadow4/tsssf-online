import {Card, ChangelingContextList, Location, isPony, isBlank} from "./lib.js";
import GameModel from "./GameModel.js"
import * as cm from "./cardManager.js";

export default class Turnstate
{	
	public currentPlayer = "";
	public overrides: {[key:string]: any} = {};

	public openPonyLocations: Set<string> = new Set();
	public playedThisTurn: Set<string> = new Set();


	// Used By Server Only
	public playedPonies: Card[] = [];
	public playedShips: [Card, Card][] = [];
	public playedShipCards: Card[] = [];
	public playedShipsCommitted: [Card, Card][] = [];


	public brokenShipsCommitted: [Card,Card][] = [];
	public brokenShips: [Card,Card][] = [];

	public swapsCommitted = 0;
	public swaps = 0;

	public shipSet: Set<string> = new Set();
	public positionMap: {[key: string]: string} | null = null; // null indicates that no swapping is occuring yet
	
	public changelingContexts: {[key:string] : ChangelingContextList} = {};

	public specialEffects: {
		shipWithEverypony: Set<string>,
		larsonEffect?: boolean,
		reminders?: string[],
	} = {
		shipWithEverypony: new Set()
	};

	// Used by Client
	public openShips: {[card: string]: true} = {};
	public shipTarget?: Location
	public removedFrom?: [Location, Card]; 
	public reminderCache: Set<Card> = new Set();

	public constructor(){}

	public init(model: GameModel, currentPlayerName: string)
	{
		this.currentPlayer = currentPlayerName;
		this.shipSet = model.getCurrentShipSet();
		this.positionMap = null;

		this.updateSpecialEffects(model.board);	
	}

	public updateSpecialEffects(board: {[key: string]: {card: Card}})
	{
		delete this.specialEffects["larsonEffect"];
		for(var key in board)
		{
			if(board[key].card == "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh")
			{
				this.specialEffects["larsonEffect"] = true;
			}
		}
	}

	public getChangeContext(card: Card): ChangelingContextList
	{
		if(!this.changelingContexts[card])
		{
			this.changelingContexts[card] = {list:[], shipRollbackPony: "", preSwapShippedTo: []};
		}

		return this.changelingContexts[card];
	}
	
	public toClientTurnstate()
	{
		return {
			playedThisTurn: [...this.playedThisTurn],
			overrides: this.overrides,
			currentPlayer: this.currentPlayer
		}
	}
}

export function fromClientTurnstate(clientTurnstate: {playedThisTurn: string[], overrides: {[key:string]: string}, currentPlayer:string})
{
	let newTurnstate = new Turnstate();
	newTurnstate.playedThisTurn = new Set(clientTurnstate.playedThisTurn);
	newTurnstate.overrides = clientTurnstate.overrides;
	newTurnstate.currentPlayer = clientTurnstate.currentPlayer;
	return newTurnstate;
}
