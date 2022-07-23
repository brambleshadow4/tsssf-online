import {
	GameModel as GM, Card, Player, randomizeOrder, Location, isPony, isShip, isGoal, getNeighborKeys,
	isBlank, PackListPack, CardProps, isCardIncluded, isBoardLoc, isOffsetLoc, isGoalLoc, isDiscardLoc,
	GameOptions, CardElement, isPlayerLoc
} from "./lib.js";


import {getConnectedPonies, evalGoalCard} from "./goalCriteria.js"

import * as cm from "./cardManager.js";

import Turnstate, { fromClientTurnstate } from "./turnstate.js";

var PROP_VALUES = {

	"gender":{
		"male":1,
		"female":1,
	},
	"altTimeline":{
		"true": 1,
	},
	"shipWithEverypony":{
		"true": 1,
	},
	"race":{
		"earth": 1,
		"unicorn":1, 
		"pegasus": 1,
		"alicorn": 1
	}
} as any;



export default class GameModel implements GM
{
	public board: {
		[key:string]: {card: Card, element?: CardElement}
	} = {};

	public cardLocations: {
		[card:string]: Location
	} = {};

	public playerName: string = "";

	public ponyDiscardPile: Card[] = [];
	public shipDiscardPile: Card[] = [];
	public goalDiscardPile: Card[] = [];

	public ponyDrawPile: Card[] = [];
	public shipDrawPile: Card[] = [];
	public goalDrawPile: Card[] = [];

	public currentGoals: Card[] = [];
	public achievedGoals: Set<Card> = new Set();
	public tempGoals: Card[] = [];
	public removed: Card[] = [];
	public mode: "server" | "client" | "both" = "client";
	public players: Player[] = [];
	public runGoalLogic = true;
	public turnstate? = new Turnstate();
	private startCard: Card = "";



	public debug = false;

	constructor(){}

	public addEffect(card: Card, prop: string, value: any): any
	{
		// effects;<card>;prop;value

		if(!this.turnstate){ return; }

		let cards = cm.inPlay();


		if(!cards[card]) return;


		if(prop == "disguise")
		{
			if(!cards[value]) return;
		}
		else if(prop == "keywords")
		{

		}
		else if(prop == "count")
		{
			value = Number(value);
			if(isNaN(value)) return;
		}
		else if(prop == "fullCopy")
		{
			if(!cards[value]) return;
		}
		else
		{
			if(!PROP_VALUES[prop] || !PROP_VALUES[prop][value]) return;
		}

		if(value == "true") 
			value = true;


		var obj;


		if(!this.turnstate.overrides[card])
			this.turnstate.overrides[card] = {};

		obj = this.turnstate.overrides[card]

		
		if(prop == "disguise")
		{
			var oldOverride = this.turnstate.overrides[card];

			this.turnstate.overrides[card] = {"disguise": value};

			if(oldOverride.shipWithEverypony)
				this.turnstate.overrides[card].shipWithEverypony = true;


			var cc = this.turnstate.getChangeContext(card);
			var newEntry = (cc.list.length > 1) ? cc.list.length : 1;

			cc.list[newEntry] = this.turnstate.overrides[card];
			var oldEntry = newEntry - 1;

			var oldChangeling = card + ":" + oldEntry;
			var newChangeling = card + ":" + newEntry;
		
			// rollback played ponies
			if(cc.method == "play" && this.turnstate.playedPonies[this.turnstate.playedPonies.length - 1] == oldChangeling)
			{
				this.turnstate.playedPonies[this.turnstate.playedPonies.length - 1] = newChangeling;
			}


			var shippedWith = [cc.shipRollbackPony];
			if(cc.method != "ship")
			{
				var loc = this.cardLocations[card];
				shippedWith = getConnectedPonies(this, loc).map(x => this.appendChangelingContext(x));
			}

			// update played ships so they have the correct context.
			if(cc.method == "play" || cc.method == "replace" || cc.method == "ship" || cc.method == "lovePoison")
			{
				for(let pony of shippedWith)
				{
					for(var i = 0; i < this.turnstate.playedShips.length; i++)
					{
						var [p1, p2] = this.turnstate.playedShips[i];

						if(p1 == pony && p2 == oldChangeling || p2 == pony && p1 == oldChangeling )
						{
							this.turnstate.playedShips[i] = [pony, newChangeling];
							break;
						}
					}
				}
			}

			
			// rollback shipSet to make sure extra break ships don't get counted
			let preSwapShippedTo = new Set(cc.preSwapShippedTo);
			for(let pony of shippedWith)
			{

				// with swaps, you have to be careful. 
				// if a ship A/X existed before the swap, then 
				// X gets shipped back to A but redisguised as Y,
				// it still counts as breaking up A/X which we normaly rollback.

				let oldShip = this.shipString(oldChangeling, pony);
				let newShip = this.shipString(newChangeling, pony);

				let preSwapCondition = false;

				if(cc.method != "swap")
				{
					preSwapCondition = !preSwapShippedTo.has(pony)
				}

				if(preSwapCondition && this.turnstate.shipSet.has(oldShip))
				{
					// replace the [pony, changeling:old] ship with [pony, changeling:new]
					this.turnstate.shipSet.delete(oldShip);
					this.turnstate.shipSet.add(newShip);
					
				}
			}
		}
		else if(prop == "keywords")
		{
			if(!obj[prop])
			{
				obj[prop] = [];
			}

			if(obj[prop].indexOf(value) == -1)
			{
				obj[prop].push(value);
			}
		}
		else
		{
			obj[prop] = value;
		}


		// TODO check that this works
		if(prop == "shipWithEverypony")
		{
			this.turnstate.specialEffects.shipWithEverypony.add(card);
		}

		this.updateCountsFromBoardState(false);
	}


	public me(): Player
	{
		for(let i=0; i<this.players.length; i++)
		{
			if(this.players[i].name == this.playerName)
			{
				return this.players[i];
			}
		}

		throw new Error("me() called from a server instance");
	}


	public removePlayer(playerName: string)
	{
		let player = this.getPlayerByName(playerName);

		if(!player) { return; }


		var ponies = player.hand.filter(x => isPony(x));
		var ships = player.hand.filter(x => isShip(x));

		this.shipDiscardPile = this.shipDiscardPile.concat(ships);
		this.ponyDiscardPile = this.ponyDiscardPile.concat(ponies);
		this.goalDiscardPile = this.goalDiscardPile.concat(player.winnings.map(x => x.card));

		for(var card of ponies)
		{
			this.cardLocations[card] = "ponyDiscardPile,stack"
		}

		for(var card of ships)
		{
			this.cardLocations[card] = "shipDiscardPile,stack"
		}

		for(let card of player.winnings)
		{
			this.cardLocations[card.card] = "goalDiscardPile,stack"
		}

		this.cardLocations[this.shipDiscardPile[this.shipDiscardPile.length-1]] = "shipDiscardPile,top";
		this.cardLocations[this.goalDiscardPile[this.goalDiscardPile.length-1]] = "goalDiscardPile,top";
		this.cardLocations[this.ponyDiscardPile[this.ponyDiscardPile.length-1]] = "ponyDiscardPile,top";

		//this.model

		let i = 0;

		for(i=0; i< this.players.length; i++)
		{
			if(this.players[i].name == playerName)
			{
				break;
			}
		}

		if(this.turnstate && this.turnstate.currentPlayer == playerName)
		{
			this.changeTurnToNextPlayer();
		}

		this.players.splice(i,1);
	}
	
	public changeTurnToNextPlayer()
	{
		let ts = this.turnstate;
		if(!ts)
			return;

		var rotation = this.players.filter(x => x.disconnected != 2);

		if(!ts.currentPlayer)
		{
			if(rotation.length)
			{
				this.turnstate = new Turnstate();
				this.turnstate.init(this, rotation[0].name);
			}

			return;
		}

		// should connect someone unless 15s+ disconnect

		if(rotation.length == 0)
		{
			this.turnstate = new Turnstate();
			this.turnstate.init(this, "");
			return;
		}

		var k = rotation.map(x=> x.name).indexOf(ts.currentPlayer);
		k = (k+1)%rotation.length;

		this.turnstate = new Turnstate();
		this.turnstate.init(this, rotation[k].name);

		return; 
	}


	private appendChangelingContext(card: Card)
	{
		if(this.turnstate && this.isChangeling(card))
		{
			var cc = this.turnstate.getChangeContext(card);
			var contextNo =  cc ? Math.max(cc.list.length - 1, 0) : 0
			return card + ":" + contextNo;
		}

		return card;
	}

	private isChangeling(card:Card)
	{
		card = card.split(":")[0];
		return isPony(card) && cm.inPlay()[card]?.action?.startsWith("Changeling(");
	}

	
	// TODO
	// ship with everypony special
	/**

	if(game.turnstate)
	{
		if(prop == "shipWithEverypony")
		{
			game.turnstate.specialEffects.shipWithEverypony.add(card);
		}

		game.updateCountsFromBoardState(false);
	}

	game.checkIfGoalsWereAchieved();
		*/
	// game.onSpecialMessage


	public drawCard(playerName: string, typ: "ship" | "pony" | "goal", endLocation: Location): [boolean, number, Card, Location]
	{
		let model2 = this as any;

		var len = model2[typ + "DrawPile"].length as number;

		if(typ == "goal" && len)
		{

			if(endLocation)
			{
				if(endLocation == "tempGoals")
				{
					let card = model2["goalDrawPile"].pop() as Card;					

					this.tempGoals.push(card);
					this.cardLocations[card] = "tempGoals";


					return [true, len-1, card, "tempGoals"];

				}
			}
			else
			{
				var goalNo = this.currentGoals.indexOf("blank:goal")

				if(goalNo > -1)
				{
					let card = model2["goalDrawPile"].pop();
					this.currentGoals[goalNo] = card
					this.cardLocations[card] = "goal," + goalNo;

					return [true, len-1, card, "goal," + goalNo];
				}
				
			}
		}
		else
		{
			if(len)
			{
				let card = model2[typ + "DrawPile"].pop();

				let player = this.getPlayerByName(playerName)!
				player.hand.push(card);
				this.cardLocations[card] = "player," + player.name;

				return [true, len-1, card, "hand"];
			}
		}

		return [false, 0, "", ""];
	}

	public swapShuffle(typ: "pony" | "ship" | "goal")
	{
		let model2 = this as any;
		var swap = model2[typ + "DrawPile"];
		model2[typ+"DrawPile"] = model2[typ+"DiscardPile"];
		model2[typ+"DiscardPile"] = swap;

		model2[typ+"DrawPileLength"] = model2[typ+"DrawPile"].length;

		randomizeOrder(model2[typ+"DrawPile"]);

		for(let card of model2[typ+"DrawPile"])
		{
			model2.cardLocations[card] = typ + "DrawPile,stack";
		}


		var pileArr = model2[typ+"DiscardPile"];
		
		if(pileArr.length >0)
		{
			for(let card of pileArr)
			{
				model2.cardLocations[card] = typ + "DiscardPile,stack";
			}

			var topCard = pileArr[pileArr.length-1];
			model2.cardLocations[topCard] = typ+"DiscardPile,top";
		}
	}
	

	public getPlayerModel(playerName: string)
	{
		var model = {} as any;

		model.board = this.board;
		model.playerName = playerName;

		model.ponyDiscardPile = this.ponyDiscardPile;
		model.shipDiscardPile = this.shipDiscardPile;
		model.goalDiscardPile = this.goalDiscardPile;

		model.currentGoals = this.currentGoals;
		model.achievedGoals = [...this.achievedGoals] as any;
		model.removed = this.removed;
		model.tempGoals = this.tempGoals;

		model.goalDrawPileLength = this.goalDrawPile.length;
		model.ponyDrawPileLength = this.ponyDrawPile.length;
		model.shipDrawPileLength = this.shipDrawPile.length;

		var player = this.getPlayerByName(playerName)!;

		model.hand = player.hand;
		model.winnings = player.winnings;
		model.playerName = player.name;

		model.players = this.getPlayerListForPlayer(player.name);
		model.turnstate = this.turnstate?.toClientTurnstate();

		//model.keepLobbyOpen = this.isLobbyOpen;

		model.startCard = this.startCard;

		return model;
	}


	public getPlayerListForPlayer(playerName: string)
	{
		let player = this.getPlayerByName(playerName)!;

		return this.players.map(x => {

			if(x.name == player.name)
			{
				return {
					id: x.id,
					name: x.name,

					hand: x.hand,
					disconnected: false,
					team: x.team,
					winnings: x.winnings,
					ponies: 0,
					ships: 0,
					socket: undefined,
					isHost: x.isHost
				}
			}
			else if (player.team && player.team == x.team)
			{
				return {
					id: x.id,
					name: x.name,

					hand: x.hand,
					disconnected: false,
					team: x.team,
					winnings: x.winnings,
					ponies: x.hand.filter(isPony).length,
					ships: x.hand.filter(isShip).length,
					socket: undefined,
					isHost: x.isHost
				}
			}
			else 
			{
				return { 
					id: 0,
					name: x.name,
					hand: [],
					disconnected: x.disconnected,
					team: x.team,
					winnings: x.winnings,
					ponies: x.hand.filter(isPony).length,
					ships: x.hand.filter(isShip).length,
					isHost: x.isHost,

					socket: undefined
				};
			}
		});	
	}


	public getPlayerByName(playerName: string): Player | undefined
	{
		return this.players.filter(x => x.name == playerName)[0];
	}

	public wereGoalsAchieved()
	{
		if(!this.runGoalLogic)  
			return false;

		var sendUpdate = false;
		var allGoals = this.currentGoals.concat(this.tempGoals);

		for(var goal of allGoals)
		{
			var achieved = false;

			if(!isBlank(goal))
			{
				achieved = evalGoalCard(goal, this)
			}

			if(achieved != this.achievedGoals.has(goal))
			{
				sendUpdate = true;
			}

			if(achieved)
			{
				this.achievedGoals.add(goal);
			}
			else
			{
				this.achievedGoals.delete(goal);
			}
		}

		return sendUpdate;

		// TODO
		/*if(sendUpdate)
		{
			let message = ["goalachieved", ...this.achievedGoals].join(";");
			if(message == "goalachieved")
				message += ";"

			this.toEveryone(message);
		}*/
	}

	private shipString(card1:Card, card2: Card): string
	{
		if(card1 < card2)
			return card1 + "/" + card2

		return card2 + "/" + card1;
	}

	public clearGameForStart(gameOptions: GameOptions): void
	{	
		this.cardLocations = {};
		this.board = {
			"p,0,0":{
				card: gameOptions.startCard
			}
		};

		for(var player of this.players)
		{
			player.hand = [];
			player.winnings = [];
		}

		this.cardLocations[this.startCard] = "p,0,0";

		this.goalDiscardPile = [];
		this.ponyDiscardPile = [];
		this.shipDiscardPile = [];

		this.currentGoals = [
			"blank:goal","blank:goal","blank:goal"
		];

		this.achievedGoals = new Set();

		this.removed = [];
		this.tempGoals = [];

		// client only props
		//     hand:
		//     winnings

		// private props
		this.goalDrawPile = [];
		this.ponyDrawPile = [];
		this.shipDrawPile = [];

		for(var cardName in cm.inPlay())
		{
			//if(!isCardIncluded(cardName, gameOptions))
			//	continue;

			if(isGoal(cardName))
			{
				this.goalDrawPile.push(cardName);
				this.cardLocations[cardName] = "goalDrawPile";
			}
			else if(isPony(cardName))
			{	
				this.ponyDrawPile.push(cardName);
				this.cardLocations[cardName] = "ponyDrawPile";
			}
			else if(isShip(cardName))
			{
				this.shipDrawPile.push(cardName);
				this.cardLocations[cardName] = "shipDrawPile";
			}
		}

		randomizeOrder(this.players);
		randomizeOrder(this.goalDrawPile);
		randomizeOrder(this.ponyDrawPile);
		randomizeOrder(this.shipDrawPile);

		// draw cards

		if(this.goalDrawPile.length > 3)
		{
			this.currentGoals[0] = this.goalDrawPile.pop()!;
			this.currentGoals[1] = this.goalDrawPile.pop()!;
			this.currentGoals[2] = this.goalDrawPile.pop()!;

			this.cardLocations[this.currentGoals[0]] = "goal,0";
			this.cardLocations[this.currentGoals[1]] = "goal,1";
			this.cardLocations[this.currentGoals[2]] = "goal,2";
		}
		

		if(gameOptions.ruleset == "turnsOnly")
		{
			this.turnstate = new Turnstate();
			this.turnstate.init(this, this.players[0] ? this.players[0].name : "")
		}
		else
		{
			delete this.turnstate
		}
		
		/*if(preset)
			this.loadPreset(preset);*/
	}

	// TODO
	/*private loadPreset(hand: Card[])
	{
		//console.log("Loading Preset Game");

		let player =  {
			name: "Dev",
			id: 1,
			socket: {
				replace: true,
				send: () => {}},
			hand: [],
			winnings: [],
		} as Player;

		this.players.push(player);

		for(let card of hand)
		{
			if(isPony(card))
			{
				player.hand.push(card);
				this.cardLocations[card] = "player,Dev";
				this.ponyDrawPile.splice(this.ponyDrawPile.indexOf(card), 1);
			}
			if(isShip(card))
			{
				player.hand.push(card);
				this.cardLocations[card] = "player,Dev";
				this.shipDrawPile.splice(this.shipDrawPile.indexOf(card), 1);
			}
		}
	}*/



	private isLocOccupied(loc: Location)
	{
		if(isBoardLoc(loc) || isOffsetLoc(loc))
		{
			return (this.board[loc] != undefined)
		}
		if(isGoalLoc(loc))
		{
			var goalNo = Number(loc.split(",")[1]);

			if(this.currentGoals[goalNo] == undefined)
				return false;

			return this.currentGoals[goalNo] != "blank:goal"
		}

		return false;
	}

	public getCurrentShipSet(): Set<string>
	{
		var s: Set<string> = new Set();
		for(var key in this.board)
		{
			if (key.startsWith("s"))
			{
				var pair = this.getShippedPonies(key);

				if(pair.length == 2)
				{	
					s.add(this.shipString(pair[0], pair[1]));
				}
			}

			if(this.turnstate && this.turnstate.specialEffects.shipWithEverypony)
			{
				var pony1 = this.board[key].card;
				for(var pony2 of this.turnstate.specialEffects.shipWithEverypony)
				{
					if(pony1 != pony2)
					{
						s.add(this.shipString(this.appendChangelingContext(pony1), this.appendChangelingContext(pony2)));
					}
				}
			}
		}

		return s;
	}

	public getCurrentPositionMap(): {[key:string]: Location}
	{
		var map:{[key:string]: Location} = {};

		for(var loc in this.board)
		{
			if (loc.startsWith("p,") && !isBlank(this.board[loc].card))
			{
				map[this.board[loc].card] = loc;
			}
		}

		return map;
	}

	private isShipClosed(shipLoc: Location)
	{
		return this.getShippedPonies(shipLoc).length == 2;
	}


	private getShippedPonies(shipLoc: Location): Card[]
	{
		var neighbors = getNeighborKeys(shipLoc);

		var shipClosed = true;
		var ponies = [];
		for(var n of neighbors)
		{
			if(this.board[n] && !isBlank(this.board[n].card))
			{
				var card = this.board[n].card;

				card = this.appendChangelingContext(card);

				ponies.push(card)
			}
		}

		return ponies;
	}

	private getBrokenShips(startSet: Set<string>, endSet: Set<string>)
	{
		var broken:[Card,Card][] = [];

		for(var ship of startSet)
		{
			if(!endSet.has(ship))
			{
				broken.push(ship.split("/") as [Card, Card]);
			}
		}

		return broken;
	}

	private getSwappedCount(startPositions: {[loc: string]: Card}, endPositions: {[loc: string]: Card})
	{
		var count = 0;
		for(var key in startPositions)
		{
			if(endPositions[key] && endPositions[key] != startPositions[key])
			{
				count++;
			}
		}

		return count;
	}


	public isInvalidMoveOnClient(
		playerName: string,
		card: Card,
		startLocation: Location,
		endLocation:Location)
	{
		var player = this.getPlayerByName(playerName)!;

		if(this.cardLocations[card] != startLocation || this.isLocOccupied(endLocation))
		{						
			var whereTheCardActuallyIs = this.cardLocations[card];

			if(isPlayerLoc(whereTheCardActuallyIs) && whereTheCardActuallyIs != "player," + player.name)
				return "unknown";
			if(whereTheCardActuallyIs.indexOf("DrawPile") > 0)
				return "unknown";
	
			return whereTheCardActuallyIs;
		}

		return "";
	}


	public moveCard(
		card: Card,
		startLocation: Location,
		endLocation:Location,
		extraArg: string)
	{

		if(startLocation == "hand" || startLocation == "winnings" || endLocation == "hand" || endLocation=="winnings")
		{
			throw new Error("bad location");
		}

		// TODO move this logic
		// if the player has an incorrect position for a card, move it to where it actually should be.
		
		this.cardLocations[card] = endLocation;


		this.updateTurnstatePreMove(card, startLocation, endLocation);

		if(["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) >= 0)
		{
			let i = (this as any)[startLocation].indexOf(card);
			(this as any)[startLocation].splice(i,1);
		}

		// remove from old location
		if(startLocation.startsWith("player,"))
		{
			var player = this.getPlayerByName(startLocation.substring("player,".length))!;
			if(isGoal(card))
			{
				var i = player.winnings.map(x => x.card).indexOf(card);
				player.winnings.splice(i, 1);
			}
			else
			{
				var i = player.hand.indexOf(card);
				player.hand.splice(i, 1);
			}
		}

		if(isBoardLoc(startLocation) || isOffsetLoc(startLocation))
		{
			if(this.board[startLocation] && this.board[startLocation].card == card)
			{
				delete this.board[startLocation];
			}
		}

		if(isDiscardLoc(startLocation))
		{
			let model = this as any;
			var [pile,slot] = startLocation.split(",");

			let i = model[pile].indexOf(card);
			model[pile].splice(i,1);

			if(model[pile].length)
			{
				var topCard = model[pile][model[pile].length-1]
				model.cardLocations[topCard] = pile+",top";
			}
		}

		if(isGoalLoc(startLocation))
		{
			let [_,iStr] = startLocation.split(",")
			let i = Number(iStr);
			if(this.currentGoals[i] != "blank:goal")
				this.currentGoals[i] = "blank:goal";
			
		}

		if(startLocation == "removed")
		{
			let i = this.removed.indexOf(card);
			this.removed.splice(i,1);
		}

		if(startLocation == "tempGoals")
		{
			let i = this.tempGoals.indexOf(card);
			this.tempGoals.splice(i,1);
		}

		// move to end location

		if(endLocation.startsWith("player,"))
		{	
			var player = this.getPlayerByName(endLocation.substring("player,".length))!;
			if(isGoal(card))
			{
				player.winnings.push({card, value: Number(extraArg) || 0});
			}
			else
			{
				player.hand.push(card)
			}
		}

		if(isBoardLoc(endLocation) || isOffsetLoc(endLocation))
		{
			this.board[endLocation] = {card: card};

			if(this.turnstate)
			{
				this.turnstate.playedThisTurn.add(card);
			}
		}

		if(isGoalLoc(endLocation))
		{
			var [_,goalNoStr] = endLocation.split(",")
			let goalNo = Number(goalNoStr);
			this.currentGoals[goalNo] = card;
			this.cardLocations[card] = "goal," + goalNo;
		}

		if(isDiscardLoc(endLocation))
		{
			// the only valid placement is on top of the discard pile
			var [pile,slot] = endLocation.split(",");
			let model = this as any;
			model[pile].push(card);

			if(model[pile].length > 1)
			{
				var underCard = model[pile][model[pile].length-2];
				model.cardLocations[underCard] = pile + ",stack";
			}
		}

		if(endLocation == "removed")
		{
			this.removed.push(card);
		}

		if(endLocation == "tempGoals")
		{
			this.tempGoals.push(card);
		}

		//postmove

		this.updateTurnstatePostMove(card, startLocation, endLocation);


		// cant move to a goal location yet

		// TODO move this logic
		/*socket.send("move;" + card + ";" + startLocation + ";" + endLocation);

		if(startLocation == "hand" || startLocation == "winnings")
			startLocation = "player,"+player.name;

		if(endLocation == "hand" || endLocation == "winnings")
			endLocation = "player,"+player.name;

		this.toEveryoneElse(socket, "move;" + card + ";" + startLocation + ";" + endLocation);*/


		/*if(isPlayerLoc(endLocation) || isPlayerLoc(startLocation))
		{
			this.sendPlayerCounts(player);
		}*/


		/*if(isDiscardLoc(startLocation) && !isDiscardLoc(endLocation))
		{
			var [pile,slot] = startLocation.split(",");
			let model2 = this as any;
			if(model2[pile].length)
			{
				var topCard = model2[pile][model2[pile].length-1]
				this.toEveryone( "move;" + topCard + ";" + pile + ",stack;" + pile + ",top");
			}
		}*/
	
		// TODO
		// this.checkIfGoalsWereAchieved();
	}

	private updateTurnstatePreMove(card: Card, startLocation: string, endLocation: string): void
	{
		if(!this.turnstate) { return; }

		if(this.isChangeling(card))
		{
			let cc = this.turnstate.getChangeContext(card);

			if(this.board[startLocation] && this.board[startLocation].card == card)
			{
				cc.method = "swap";
				cc.preSwapShippedTo = getConnectedPonies(this, startLocation).map( x => this.appendChangelingContext(x));

				if(this.turnstate.openPonyLocations.has(endLocation))
				{
					cc.method = "lovePoison";
				}
			}
			else
			{
				cc.method = "play"; // could be play or replace, doesn't actually matter
			}
		}
	}

	public updateCountsFromBoardState(commit: boolean)
	{
		if(!this.turnstate) {return;}

		var newSet = this.getCurrentShipSet();

		var brokenShipsTentative = this.getBrokenShips(this.turnstate.shipSet, newSet);
		this.turnstate.brokenShips = this.turnstate.brokenShipsCommitted.concat(brokenShipsTentative);

		var curPositionMap = this.getCurrentPositionMap();
		var newlySwapped = this.getSwappedCount(this.turnstate.positionMap, curPositionMap)

		this.turnstate.swaps = this.turnstate.swapsCommitted + newlySwapped;

		if(commit)
		{
			this.turnstate.brokenShipsCommitted = this.turnstate.brokenShips;
			//this.turnstate.playedShipsCommitted = this.turnstate.playedShips;
			this.turnstate.swapsCommitted = this.turnstate.swaps;
			this.turnstate.shipSet = newSet;
			this.turnstate.positionMap = curPositionMap;
		}
	}


	private updateTurnstatePostMove(card: Card, startLocation: Location, endLocation: Location)
	{
		if(!this.turnstate) { return }

		if(isPony(card) 
			&& (this.turnstate.openPonyLocations.has(endLocation) || startLocation == "hand" || startLocation == "ponyDiscardPile,top") // need both because replace powers aren't open.
			&& isBoardLoc(endLocation))
		{
	
			let cardContext = this.appendChangelingContext(card);

			if(startLocation == "hand" || startLocation == "ponyDiscardPile,top") // this will be false for love poisons
			{
				this.turnstate.playedPonies.push(cardContext);
			}

			let connectedPonies = getConnectedPonies(this, endLocation);

			let newShips: [string,string][] = connectedPonies.map( x => [x, cardContext]);
			this.turnstate.playedShips = this.turnstate.playedShips.concat(newShips);
		}

		if(isPony(card) && isBoardLoc(endLocation))
		{
			this.turnstate.openPonyLocations.delete(endLocation);
		}

		if(isShip(card) 
			&& (startLocation == "hand" || startLocation == "shipDiscardPile,top")
			&& isBoardLoc(endLocation))
		{
			this.turnstate.playedShipCards.push(card);

			let connectedPonies = this.getShippedPonies(endLocation);

			if(connectedPonies.length == 2)
			{
				this.turnstate.playedShips.push(connectedPonies as [string, string]);
			}
			else
			{
				var slots = getNeighborKeys(endLocation);
				slots = slots.filter(x => !this.board[x]?.card);
				slots.forEach(x => this.turnstate!.openPonyLocations.add(x));
			}
		}

		


		if(card == "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh")
		{
			this.turnstate.updateSpecialEffects(this.board);
		}


		let commitCounts = (startLocation == "hand" || 
			startLocation == "shipDiscardPile,top" || startLocation == "ponyDiscardPile,top"
			|| endLocation == "shipDiscardPile,top" || endLocation == "ponyDiscardPile,top");

		this.updateCountsFromBoardState(commitCounts);


		if(isShip(card)
			&& (startLocation == "hand" || startLocation == "shipDiscardPile,top")
			&& isBoardLoc(endLocation))
		{

			if(this.isShipClosed(endLocation))
			{
				//i.e. played a ship card between two ponies

				var shippedPonies = this.getShippedPonies(endLocation);
				var noCtxShipped = shippedPonies.map(x => x.split(":")[0]);
				
				if(this.isChangeling(noCtxShipped[0]))
				{
					let cc = this.turnstate.getChangeContext(noCtxShipped[0]);
					cc.method = "ship";
					cc.shipRollbackPony = shippedPonies[1];
				}

				if(this.isChangeling(noCtxShipped[1]))
				{
					let cc = this.turnstate.getChangeContext(noCtxShipped[1]);
					cc.method = "ship";
					cc.shipRollbackPony = shippedPonies[0];
				}
			}
		}
	}
}


export function playerGameModelFromObj(parsedModel: any)
{
	let newModel = new GameModel();

	try
	{
		newModel.board = parsedModel.board || newModel.board;

		// need to do something w/ card locations.

		newModel.playerName = parsedModel.playerName || "";


		newModel.ponyDiscardPile = parsedModel.ponyDiscardPile || [];
		newModel.shipDiscardPile = parsedModel.shipDiscardPile || [];
		newModel.goalDiscardPile = parsedModel.goalDiscardPile || [];

		newModel.currentGoals = parsedModel.currentGoals || [];

		newModel.achievedGoals = new Set(parsedModel.achievedGoals as Card[]);

		newModel.tempGoals = parsedModel.tempGoals || [];

		newModel.removed = parsedModel.removed || [];
		newModel.players = parsedModel.players || [];


		if(parsedModel.turnstate)
			newModel.turnstate = fromClientTurnstate(parsedModel.turnstate);
		else
		{
			delete newModel.turnstate;
		}

		// recalucaltate cardLocations;
		for(var card of newModel.ponyDiscardPile)
		{
			newModel.cardLocations[card] = "ponyDiscardPile,stack";
		}

		for(var card of newModel.shipDiscardPile)
		{
			newModel.cardLocations[card] = "shipDiscardPile,stack";
		}

		for(var card of newModel.goalDiscardPile)
		{
			newModel.cardLocations[card] = "goalDiscardPile,stack";
		}

		for(var card of newModel.tempGoals)
		{
			newModel.cardLocations[card] = "tempGoals";
		}

		for(var card of newModel.removed)
		{
			newModel.cardLocations[card] = "removed";
		}

		newModel.cardLocations[newModel.ponyDiscardPile[newModel.ponyDiscardPile.length-1]] = "ponyDiscardPile,top";
		newModel.cardLocations[newModel.shipDiscardPile[newModel.shipDiscardPile.length-1]] = "shipDiscardPile,top";
		newModel.cardLocations[newModel.goalDiscardPile[newModel.goalDiscardPile.length-1]] = "goalDiscardPile,top";
	}
	finally
	{
		return newModel;
	}
}