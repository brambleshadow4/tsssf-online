import {
	GameModel, Card, Player, randomizeOrder, Location, isPony, isShip, isGoal, getNeighborKeys,
	isBlank, PackListPack, CardProps, isCardIncluded, isBoardLoc, isOffsetLoc, isGoalLoc, isDiscardLoc
} from "./lib.js";


import {getConnectedPonies, evalGoalCard} from "./goalCriteria"

import * as cm from "./cardManager.js";

import Turnstate from "./turnstate.js";

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



export default class GameModelServer implements GameModel
{
	public board: {
		[key:string]: {card: Card}
	} = {};

	public cardLocations: {
		[card:string]: Location
	} = {};

	public cardDecks: string[] = ["Core.*"];
	public customCards: {
		descriptions: PackListPack[], 
		cards: {[key:string]: CardProps},
		currentSize: number
	} = {
		descriptions: [],
		cards: {},
		currentSize: 0
	};

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

	public players: Player[] = [];

	public runGoalLogic = true;

	public turnstate? = new Turnstate();

	public startCard: Card = "Core.Start.FanficAuthorTwilight";

	public ruleset: "sandbox" | "turnsOnly" = "turnsOnly";


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

		this.players.splice(i,1);

		if(this.turnstate && this.turnstate.currentPlayer == playerName)
		{
			this.changeTurnToNextPlayer();
		}

	}
	
	public changeTurnToNextPlayer()
	{
		let ts = this.turnstate;
		if(!ts)
			return;

		var rotation = this.players.filter(x => !x.disconnected && x.name != "");

		if(rotation.length == 0)
			return;

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


	public drawCard()
	{
		/*
			if(message.startsWith("draw;"))
			{
				var [_, typ, specialLoc] = message.split(";");

				if(typ != "ship" && typ != "pony" && typ != "goal")
					return;

				let model2 = game as any;

				var len = model2[typ + "DrawPile"].length as number;

				if(typ == "goal" && len)
				{

					if(specialLoc)
					{
						if(specialLoc == "tempGoals")
						{
							let card = model2["goalDrawPile"].pop() as Card;					

							game.tempGoals.push(card);
							game.cardLocations[card] = "tempGoals";
		
							game.toEveryone("draw;goal;" + (len - 1));
							game.toEveryone("move;" + card + ";goalDrawPile;tempGoals");
							game.checkIfGoalsWereAchieved();
						}
					}
					else
					{
						var goalNo = game.currentGoals.indexOf("blank:goal")

						if(goalNo > -1)
						{
							let card = model2["goalDrawPile"].pop();
							game.currentGoals[goalNo] = card
							game.cardLocations[card] = "goal," + goalNo;

							var msg = "draw;" + typ + ";" + (len - 1);

							game.toEveryone(msg);
							game.toEveryone( "move;" + card + ";goalDrawPile;goal," + goalNo);
							game.checkIfGoalsWereAchieved();
						}
						else
							return ;
					}

					
				}
				else
				{
					if(len)
					{
						let card = model2[typ + "DrawPile"].pop();

						let player = game.getPlayer(socket)!
						player.hand.push(card);
						game.cardLocations[card] = "player," + player.name;

						var msg = "draw;" + typ + ";" + (len - 1);
						game.toEveryone(msg);
						socket.send("move;" + card + ";" + typ + "DrawPile;hand");

						game.toTeamMembers(socket, "move;" + card + ";" + typ + "DrawPile;player," + player.name)
						game.toNonTeamMembers(socket, "move;anon:" + typ + ";" + typ + "DrawPile;player," + player.name);
					
						game.sendPlayerCounts(player);
					}
				}
			}

		*/	
	}

	public swapShuffle()
	{
		/*
		var [_,typ] = message.split(";");

				if(["pony","goal","ship"].indexOf(typ) > -1)
				{
					let model2 = game as any;
					var swap = model2[typ + "DrawPile"];
					model2[typ+"DrawPile"] = model2[typ+"DiscardPile"];
					model2[typ+"DiscardPile"] = swap;

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
					
					game.toEveryone(["swapshuffle", typ, model2[typ+"DrawPile"].length, ...model2[typ+"DiscardPile"]].join(";"));
				}


		*/
	}


	

	public getPlayerModel(playerName: string)
	{
		var model = {} as any;

		model.board = this.board;
		model.cardDecks = this.cardDecks;

		model.ponyDiscardPile = this.ponyDiscardPile;
		model.shipDiscardPile = this.shipDiscardPile;
		model.goalDiscardPile = this.goalDiscardPile;

		model.customCards = this.customCards;

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


		for(let pl of this.players)
		{
			let plCopy: Player;
			if(pl.name == player.name)
			{
				plCopy = {
					id: pl.id,
					name: pl.name,

					hand: pl.hand,
					disconnected: false,
					team: pl.team,
					winnings: pl.winnings,
					ponies: 0,
					ships: 0,
					socket: undefined
				}
			}
			else if (pl.team == player.team)
			{
				plCopy = {
					id: pl.id,
					name: pl.name,

					hand: pl.hand,
					disconnected: false,
					team: pl.team,
					winnings: pl.winnings,
					ponies: 0,
					ships: 0,
					socket: undefined
				}
			}
			else 
			{
				plCopy = { 
					id: 0,
					name: pl.name,
					hand: [],
					disconnected: pl.disconnected,
					team: pl.team,
					winnings: pl.winnings,
					ponies: pl.hand.filter(isPony).length,
					ships: pl.hand.filter(isShip).length,

					socket: undefined
				};
			}

			model.players.push(plCopy);
		}

		let ts = this.turnstate;
		if(ts)
		{
			model.turnstate = ts.clientProps();
		}

		//model.keepLobbyOpen = this.isLobbyOpen;

		model.startCard = this.startCard;

		return model;
	}


	public getPlayerByName(playerName: string): Player | undefined
	{
		return this.players.filter(x => x.name == playerName)[0];
	}

	private checkIfGoalsWereAchieved()
	{
		if(!this.runGoalLogic)
			return;

		var sendUpdate = false;
		var allGoals = this.currentGoals.concat(this.tempGoals);

		for(var goal of allGoals)
		{
			var achieved = false;

			if(!isBlank(goal))
				achieved = evalGoalCard(goal, this)

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

	



	public clearBoard(): void
	{	
		this.cardLocations = {};
		this.board = {
			"p,0,0":{
				card: this.startCard
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
			if(!isCardIncluded(cardName, this))
				continue;

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


		if(this.ruleset == "turnsOnly")
		{
			this.turnstate = new Turnstate();
			this.turnstate.init(this, this.players[0] ? this.players[0].name : "")
		}
		else
		{
			delete this.turnstate;
		}
		
		/*if(preset)
			this.loadPreset(preset);*/
	}

	// TODO
	/*private loadPreset(hand: Card[])
	{
		console.log("Loading Preset Game");

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

		let serverStartLoc = startLocation;
		if(startLocation == "hand" || startLocation == "winnings")
			serverStartLoc = "player," + player.name;


		if(this.cardLocations[card] != serverStartLoc || this.isLocOccupied(endLocation))
		{						
			var whereTheCardActuallyIs = this.cardLocations[card];
			if(whereTheCardActuallyIs == "player," + player.name)
			{
				if(isGoal(card))
					whereTheCardActuallyIs = "winnings";
				else
					whereTheCardActuallyIs = "hand";
			}

			return whereTheCardActuallyIs;
		}

		return "";
	}


	public moveCard(
		playerName: string,
		card: Card,
		startLocation: Location,
		endLocation:Location,
		extraArg: string)
	{

		var player = this.getPlayerByName(playerName)!;

		let serverStartLoc = startLocation;
		if(startLocation == "hand" || startLocation == "winnings")
			serverStartLoc = "player," + player.name;


		// TODO move this logic
		// if the player has an incorrect position for a card, move it to where it actually should be.
		

		

		let serverEndLoc = endLocation;
		if(serverEndLoc == "hand" || serverEndLoc == "winnings")
			serverEndLoc = "player," + player.name;

		this.cardLocations[card] = serverEndLoc;


		this.updateTurnstatePreMove(card, startLocation, endLocation);


		// remove from old location
		if(startLocation == "hand")
		{
			var i = player.hand.indexOf(card);
			player.hand.splice(i, 1);
		}

	
		if(startLocation == "winnings")
		{
			var i = player.winnings.map(x => x.card).indexOf(card);
			player.winnings.splice(i, 1);
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

		if(endLocation == "hand")
		{
			player.hand.push(card)
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

		if(endLocation == "winnings")
		{
			player.winnings.push({card, value: Number(extraArg) || 0});
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

		this.toEveryoneElse(socket, "move;" + card + ";" + startLocation + ";" + endLocation);


		if(isPlayerLoc(endLocation) || isPlayerLoc(startLocation))
		{
			this.sendPlayerCounts(player);
		}


		if(isDiscardLoc(startLocation) && !isDiscardLoc(endLocation))
		{
			var [pile,slot] = startLocation.split(",");
			let model2 = this as any;
			if(model2[pile].length)
			{
				var topCard = model2[pile][model2[pile].length-1]
				this.toEveryone( "move;" + topCard + ";" + pile + ",stack;" + pile + ",top");
			}
		}*/
	
		this.checkIfGoalsWereAchieved();
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