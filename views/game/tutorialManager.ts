import {
	GameOptions, defaultGameOptions, isGoal, isStart, isShip, isPony
} from "../../model/lib.js";

import {setHoverBubble} from "./peripheralComponents.js";
import * as cm from "../../model/cardManager.js";
import GameModel from "../../model/GameModel.js";
import {updateGame} from "./game.js";
import Turnstate from "../../model/turnstate.js";

let ST = {
	INITIAL_LOAD: 0
}

let state = ST.INITIAL_LOAD;

let win = window as unknown as {
	gameOptions: GameOptions,
}


export function boot(): void
{
	let bubble = document.createElement('div');

	win.gameOptions = defaultGameOptions();

	bubble.innerHTML = "This is the tutorial!";

	let model = new GameModel();
	model.mode = "both";
	model.board = {
		"p,0,0": {card: "Core.Start.FanficAuthorTwilight"}
	}
	model.currentGoals = ["blank:goal","blank:goal","blank:goal"];

	cm.init(win.gameOptions);
	let cards = cm.inPlay();

	for(let card in cards)
	{
		if(isPony(card))
		{
			model.ponyDrawPile.push(card);
			model.cardLocations[card] = "ponyDrawPile";
		}
		if(isShip(card))
		{
			model.shipDrawPile.push(card);
			model.cardLocations[card] = "shipDrawPile";
		}

		if(isGoal(card))
		{
			model.goalDrawPile.push(card);
			model.cardLocations[card] = "goalDrawPile";
		}
	}

	model.players.push({

		id: 1,
		isHost: false,
		name: "tutorial",
		ponies: 0,
		ships: 0,
		team: "",
		winnings: [],
		hand: [],
		disconnected: 0,
		socket: {} as any,
		
	});

	model.turnstate = new Turnstate();
	model.turnstate.init(model, "tutorial");

	model.playerName="tutorial";

	
	updateGame(model);

	setTimeout(() => {
		setHoverBubble("hand","above","This is the hover bubble", () => {});
	},200)
	

}


function loadInitialState()
{
	
}