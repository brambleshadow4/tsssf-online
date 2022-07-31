import {
	GameOptions, defaultGameOptions, isGoal, isStart, isShip, isPony, isBlank, Card, isBoardLoc, isGoalLoc
} from "../../model/lib.js";

import {setHoverBubble, clearHoverBubble} from "./peripheralComponents.js";
import * as cm from "../../model/cardManager.js";
import GameModel from "../../model/GameModel.js";
import {updateGame} from "./game.js";
import Turnstate from "../../model/turnstate.js";
import s from "../tokens.js";
import { cardBoxSelectComponent } from "../lobby/cardSelectComponent.js";

let ST = {
	INITIAL_LOAD: 0
}

let state = ST.INITIAL_LOAD;

let win = window as unknown as {
	gameOptions: GameOptions,
}

let tutorialState = 0;
let model: GameModel;

export function boot(): void
{
	let bubble = document.createElement('div');

	win.gameOptions = defaultGameOptions();

	bubble.innerHTML = "This is the tutorial!";

	model = new GameModel();
	model.mode = "both";
	model.board = {
		"p,0,0": {card: "Core.Start.FanficAuthorTwilight"}
	}
	model.currentGoals = ["blank:goal","blank:goal","blank:goal"];

	cm.init(win.gameOptions);
	let cards = cm.inPlay();

	for(let card of [
		"Core.Pony.TsundereRainbowDash",
		"Core.Pony.CiderSeasonApplejack",
		"Core.Pony.PrincessCelestia",
		"Core.Pony.BrokenWingRainbowDash",
		"Core.Pony.DramaticallyWoundedRarity",
		"Core.Pony.GypsyWitchPinkiePie",
		"Core.Pony.RoyalGuardShiningArmor",
		"Core.Pony.SuperSpyTwilight",
		// SHIPS
		"Core.Ship.BoredOnASundayAfternoon",
		"Core.Ship.TheOtherMare",
		"Core.Ship.UnexpectedPregnancy",
		"Core.Ship.WhatDidIDoLastNight",
		"Core.Ship.PutARingOnIt",
		"Core.Ship.ThereAreNoBrakesOnTheLoveTrain",
		"Core.Ship.NowKiss",
		"Core.Ship.LeavingOnAPersonalCrusade"
	])
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
	}

	for(let card of ["Core.Goal.PrettyPrettyPrincess","Core.Goal.HehPeasants","Core.Goal.RainbowDashFanClub"])
	{
		model.goalDrawPile.push(card);
		model.cardLocations[card] = "goalDrawPile";
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

	setTimeout(() => setupState(0), 200);
}

function setTutorialTarget(card: Card)
{
	var element: HTMLElement;
	let loc = model.cardLocations[card];
	if(isBoardLoc(loc))
		element = model.board[loc].element!;
	else 
	{
		var allCardElements = document.getElementsByClassName('card');
		for(let i=0; i < allCardElements.length; i++)
		{
			if(allCardElements[i].getAttribute("cardid") == card)
			{
				element = allCardElements[i] as HTMLElement;
				break;
			}
		}
	}

	let oldTarget = document.getElementById("tutorialTarget");
	if(oldTarget)
		oldTarget.id = "";
	element!.id = "tutorialTarget";
}

function setupState(stateNo: number): void
{
	tutorialState = stateNo;
	model.onCardMove = undefined;
	switch(tutorialState)
	{
		case 0:
			setHoverBubble("hand","above", s.Tutorial1, () => {setupState(1)});
			break;
		case 1:
			setHoverBubble("hand","above", s.Tutorial2, () => {setupState(2)});
			break;
		case 2:
			setHoverBubble("ponyDrawPile","right", s.Tutorial3);
			model.onCardMove = () => {
				if(model.me().hand.filter(x => isPony(x)).length >= 4)
					setupState(3);
			}
			break;
		case 3:
			setHoverBubble("shipDrawPile","right", s.Tutorial4);
			model.onCardMove = () => {
				if(model.me().hand.filter(x => isShip(x)).length >= 3)
					setupState(4);
			}
			break;
		case 4:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial5, () => {setupState(5)});
			break;
		case 5:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial6, () => {setupState(6)});
			break;
		case 6:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial7, () => {setupState(7)});
			
			break;
		case 7:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial8);
			model.onCardMove = () => {
				if(model.turnstate!.playedShipCards.length > 0)
					setupState(8);
			}

			break;
		case 8:
			let card = model.turnstate!.playedShipCards[0];
			if(card)
			{
				setTutorialTarget(card);
				let pos = model.cardLocations[card];
				let hoverPos = pos.startsWith("sr") ? "above" : "left" as "above"|"left";
				setHoverBubble("tutorialTarget", hoverPos, s.Tutorial9);
			}
			model.onCardMove = () => {
				if(model.turnstate!.playedShips.length > 0)
					setupState(9);
			}
			break;
		case 9:
			let ponyCardName = cm.inPlay()[model.turnstate!.playedPonies[0]].name;
			setHoverBubble("hand","above", s.Tutorial10.replace("{0}", ponyCardName), () => {setupState(10)});
			break;
		case 10:
			setHoverBubble("hand","above", s.Tutorial11, () => {setupState(11)});
			break;
		case 11:
			setHoverBubble("hand","above", s.Tutorial12, () => {setupState(12)});
			break;
		case 12:
			setHoverBubble("goalDrawPile","right", s.Tutorial13);
			model.onCardMove = () => {
				if(model.currentGoals.filter(x => !isBlank(x)).length == 3)
					setupState(13);
			}
			break;
		case 13:
			setHoverBubble("hand","above", s.Tutorial14);
			waitForReadRainbow();
			break;
		case 16:
			setHoverBubble("hand","above", s.Tutorial15);
			model.onCardMove = () => {
				console.log("checking goals");
				console.log(model.achievedGoals);
				if(model.achievedGoals.has("Core.Goal.RainbowDashFanClub"))
					setupState(17);
			}
			break;
		case 17:
			setTutorialTarget("Core.Goal.RainbowDashFanClub")
			setHoverBubble("tutorialTarget","right", s.Tutorial16);
			model.onCardMove = () => {
				if(model.me().winnings.filter(x => x.card == "Core.Goal.RainbowDashFanClub").length)
					setupState(18);
			}
			break;
		case 18:
			setHoverBubble("hand","above", s.Tutorial17, () => {setupState(19)});
			break;
		case 19:
			setHoverBubble("hand","above", s.Tutorial18);
			model.onCardMove = () => {
				if(model.me().hand.length == 7)
					setupState(20);
			}
			break;
		case 20:
			setHoverBubble("hand","above", s.Tutorial19);
			model.turnstate!.overrides["fakeOverride"] = {};
			waitForFreshTurnstate();
			break;
		default:
			clearHoverBubble();
	}
}

function waitForReadRainbow()
{
	if(tutorialState < 13 || tutorialState > 15)
		return;

	let giantCard = document.getElementById('giantCard');
	switch(tutorialState)
	{
		case 13:
			requestAnimationFrame(waitForReadRainbow);
			if(!giantCard)
				return;
			else
				tutorialState = 14;
			break;
		case 14:
			requestAnimationFrame(waitForReadRainbow);
			if(!giantCard)
				tutorialState = 15;
			break;
		case 15:
			setTimeout(function(){

				let giantCard = document.getElementById('giantCard');
				if(!giantCard)
					setupState(16)
				else
				{
					tutorialState = 14;
					waitForReadRainbow();
				}

			}, 100);
			break;
	}
}

function waitForFreshTurnstate()
{
	if(tutorialState!=20)
		return;
	requestAnimationFrame(waitForFreshTurnstate);
	if(model.turnstate!.overrides["fakeOverride"] == undefined)
		setupState(21);
}
