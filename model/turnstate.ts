import {Card, ChangelingContextList, Location} from "./lib.js";
import GameModel from "./GameModel.js"


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


	public brokenShipsCommitted: [Card,Card][] = [];
	public brokenShips: [Card,Card][] = [];

	public swapsCommitted = 0;
	public swaps = 0;

	public shipSet: Set<string> = new Set();
	public positionMap: {[key: string]: string} = {};
	
	public changelingContexts: {[key:string] : ChangelingContextList} = {};

	public specialEffects: {
		shipWithEverypony: Set<string>,
		larsonEffect?: boolean
	} = {
		shipWithEverypony: new Set()
	};

	// Used by Client
	public openShips: {[card: string]: true} = {};
	public shipTarget?: Location
	public removedFrom?: [Location, Card]; 

	public constructor(){}

	public init(model: GameModel, currentPlayerName: string)
	{
		this.currentPlayer = currentPlayerName;
		this.shipSet = model.getCurrentShipSet();
		this.positionMap = model.getCurrentPositionMap();

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
	
	public clientProps()
	{
		console.log("currentPlayer: " + this.currentPlayer)

		return {
			playedThisTurn: [...this.playedThisTurn],
			overrides: this.overrides,
			currentPlayer: this.currentPlayer
		}
	}
}
