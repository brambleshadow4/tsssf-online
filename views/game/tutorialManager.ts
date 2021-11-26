import {

} from "../../model/lib.js";

import GameModel from "../../model/GameModel.js";

import Turnstate from "../../model/turnstate.js";

let ST = {
	INITIAL_LOAD: 0
}

let state = ST.INITIAL_LOAD;


export function boot(): GameModel
{
	let bubble = document.createElement('div');

	bubble.innerHTML = "This is the tutorial!";

	return new GameModel();
}


function loadInitialState()
{

}