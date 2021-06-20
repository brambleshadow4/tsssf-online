import {Card, ChangelingContextList, GameModelServer as GameModel} from "../model/lib.js";


export default class Turnstate
{	
	public currentPlayer = "";
	public overrides: {[key:string]: any} = {};

	public openPonyLocations: Set<string> = new Set();
	
	public playedPonies: Card[] = [];
	public playedShips: [Card, Card][] = [];
	public playedShipCards: Card[] = [];

	public playedThisTurn = new Set();

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
		return {
			playedThisTurn: [...this.playedThisTurn],
			overrides: this.overrides,
			currentPlayer: this.currentPlayer
		}
	}
}
