import {
	GameModelServer, GameModelPlayer
} from "../../model/lib.js";

import {Turnstate} from "../../server/turnstate.js";

let S = {
	INITIAL_LOAD: 0
}

let state = S.INITIAL_LOAD;


export function boot(): GameModelServer
{
	let bubble = document.createElement('div');

	bubble.innerHTML = "This is the tutorial!";

	let model: GameModelServer & GameModelPlayer = {
		cardDecks: [],
		customCards: {
			descriptions: [],
			cards: {}
		},

		keepLobbyOpen: false,
		startCard: "Core.Start.FanficAuthorTwilight",
		ruleset: "tutorial",

		players: [],
		hand: [],
		winnings: [],
		playerName: "",

		// Game state
		board: {},

		ponyDiscardPile: [],
		shipDiscardPile: [],
		goalDiscardPile: [],

		ponyDrawPile: [],
		shipDrawPile: [],
		goalDrawPile: [],

		currentGoals: [],
		achievedGoals: new Set(),
		turnstate: new Turnstate(),

		removed: [],
		tempGoals: [],

		messageHistory: [],
	}

	return model;

}


function loadInitialState()
{

}