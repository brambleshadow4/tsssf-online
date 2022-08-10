import {
	GameOptions, defaultGameOptions, isGoal, isStart, isShip, isPony, isBlank, Card, isBoardLoc, isGoalLoc, isOffsetLoc, isDiscardLoc
} from "../../model/lib.js";

import {setHoverBubbleFull, clearHoverBubble, updateHand, updateShipDiscard, updatePonyDiscard} from "./peripheralComponents.js";
import * as cm from "../../model/cardManager.js";
import GameModel from "../../model/GameModel.js";
import {updateGame} from "./game.js";
import Turnstate from "../../model/turnstate.js";
import s from "../tokens.js";


let win = window as unknown as {
	gameOptions: GameOptions,
	
}

let tutorialState = 0;
let model: GameModel;

function setupBoard(options:{
	drawPile: Card[],
	discardPile: Card[],
	board?: {[k:string]: Card},
	currentGoals?: string[],
	hand?: Card[],
}): void
{
	let bubble = document.createElement('div');

	win.gameOptions = defaultGameOptions();

	bubble.innerHTML = "This is the tutorial!";

	model = new GameModel();
	model.mode = "both";
	model.board = {
		"p,0,0": {card: "Core.Start.FanficAuthorTwilight"}
	}

	if(options.board)
	{
		for(let key in options.board)
		{
			model.board[key] = model.board[key] || {};
			model.board[key].card = options.board[key];
			model.cardLocations[options.board[key]] = key;
		}
	}

	
	model.currentGoals = ["blank:goal","blank:goal","blank:goal"];

	if(options.currentGoals)
	{
		model.currentGoals = options.currentGoals;
		model.cardLocations[model.currentGoals[0]] = "goal,0";
		model.cardLocations[model.currentGoals[1]] = "goal,1";
		model.cardLocations[model.currentGoals[2]] = "goal,2";
	}

	cm.init(win.gameOptions);

	for(let card of options.drawPile)
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

	for(let card of options.discardPile)
	{
		if(isPony(card))
		{
			model.ponyDiscardPile.push(card);
			model.cardLocations[card] = "ponyDiscardPile,stack";
		}
		if(isShip(card))
		{
			model.shipDiscardPile.push(card);
			model.cardLocations[card] = "shipDiscardPile,stack";
		}
		if(isGoal(card))
		{
			model.goalDiscardPile.push(card);
			model.cardLocations[card] = "goalDiscardPile,stack";
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
		hand: options.hand || [],
		disconnected: 0,
		socket: {} as any,
	});

	if(options.hand)
	{
		for(let key in options.hand)
		{
			model.cardLocations[options.hand[key]] = "player,tutorial";
		}
	}

	model.turnstate = new Turnstate();
	model.turnstate.init(model, "tutorial");

	model.playerName="tutorial";
	updateGame(model);
}

export function boot(): void
{
	setupBoard({
		discardPile:[],
		drawPile: [
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
			"Core.Ship.LeavingOnAPersonalCrusade",
			// GOALS
			"Core.Goal.PrettyPrettyPrincess","Core.Goal.HehPeasants","Core.Goal.RainbowDashFanClub"
		]
	});

	setTimeout(() => setupState(0), 200); // 33 is a good state if you want to test mid-tutorial;
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

	let oldTarget = document.getElementsByClassName("tutorialTarget")[0];
	if(oldTarget)
		oldTarget.classList.remove("tutorialTarget");
	element!.classList.add("tutorialTarget");
}

function setupState(stateNo: number): void
{
	tutorialState = stateNo;
	model.onCardMove = undefined;
	switch(tutorialState)
	{
		case 0:
			setHoverBubble("hand","above", s.Tutorial1, 1);
			break;
		case 1:
			setHoverBubble("hand","above", s.Tutorial2, 2);
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
			setHoverBubble("tutorialTarget","left", s.Tutorial5, 5);
			break;
		case 5:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial6, 6);
			break;
		case 6:
			setTutorialTarget("Core.Start.FanficAuthorTwilight");
			setHoverBubble("tutorialTarget","left", s.Tutorial7, 7);
			
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
			setHoverBubble("hand","above", s.Tutorial10.replace("{0}", ponyCardName), 10);
			break;
		case 10:
			setHoverBubble("hand","above", s.Tutorial11, 11);
			break;
		case 11:
			setHoverBubble("hand","above", s.Tutorial12, 12);
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
			setHoverBubble("hand","above", s.Tutorial17, 19);
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
		case 2050:
			setHoverBubble("shipShuffle","right", s.Tutorial1950, 21);
			break;
		case 21:
			setHoverBubble("hand","above", s.Tutorial20, 22);
			break;
		case 22:
			setupBoard({
				drawPile: ['Core.Goal.GoodEnough'],
				discardPile:["Core.Pony.TheWonderbolts","Core.Pony.Lyra"],
				currentGoals: ["Core.Goal.PrettyPrettyPrincess","Core.Goal.HehPeasants","Core.Goal.RainbowDashFanClub"],
				board:{
				"p,-1,0": "Core.Pony.BulkBiceps",
				"sr,-1,0": "Core.Ship.BoredOnASundayAfternoon",
				"p,0,0": "Core.Start.FanficAuthorTwilight",
				"sr,0,0": "Core.Ship.BoredOnASundayAfternoon",
				"p,1,0": "Core.Pony.TsundereRainbowDash",
				"sr,1,0": "Core.Ship.TheOtherMare",
				"p,2,0": "Core.Pony.MoeFluttershy",
			}});
			setHoverBubble("hand","above", s.Tutorial21, 23);
			break;
		case 23:
			setTutorialTarget("Core.Pony.TsundereRainbowDash")
			setHoverBubble("tutorialTarget","above", s.Tutorial22, 24);
			break;
		case 24:
			setTutorialTarget("Core.Pony.BulkBiceps")
			setHoverBubble("tutorialTarget","above", s.Tutorial23, 25);
			break;
		case 25:
			setTutorialTarget("Core.Pony.TsundereRainbowDash")
			setHoverBubble("tutorialTarget","above", s.Tutorial24);
			model.onCardMove = () => {
				if(isOffsetLoc(model.cardLocations["Core.Pony.MoeFluttershy"]))
					setupState(26);
			}
			break;
		case 26:
			setTutorialTarget("Core.Pony.TsundereRainbowDash")
			setHoverBubble("tutorialTarget","above", s.Tutorial25);
			model.onCardMove = () => {
				if(isBoardLoc(model.cardLocations["Core.Pony.MoeFluttershy"]))
					setupState(27);
			}
			break;
		case 27:
			setHoverBubble("hand","above", s.TutorialDone, 28);
			break;
		case 28:
			model.me().hand.push("Core.Pony.NightmareMoon");
			model.cardLocations["Core.Pony.NightmareMoon"] = "player,"+model.me().name;
			updateHand();
			setTutorialTarget("Core.Pony.NightmareMoon")
			setHoverBubble("tutorialTarget","above", s.Tutorial26, 29);
			break;
		case 29:
			setTutorialTarget("Core.Pony.TsundereRainbowDash")
			setHoverBubble("tutorialTarget","above", s.Tutorial27);
			model.onCardMove = () => {
				if(isBoardLoc(model.cardLocations["Core.Pony.NightmareMoon"]) && isDiscardLoc(model.cardLocations["Core.Pony.TsundereRainbowDash"]))
					setupState(30);
			}
			break;
		case 30:
			setHoverBubble("hand","above", s.TutorialDone, 31);
			break;
		case 31:
			model.me().hand.push("Core.Pony.Gilda");
			model.cardLocations["Core.Pony.Gilda"] = "player,"+model.me().name;
			updateHand();
			setHoverBubble("hand","above", s.Tutorial28, 32);
			break;
		case 32:
			setHoverBubble("currentGoals","right", s.Tutorial29, 33);
			model.onCardMove = () => {
				if(model.goalDiscardPile.length && model.currentGoals.filter(x => !isBlank(x)).length == 3)
					setupState(33);
			}
			break;
		case 33:
			setHoverBubble("hand","above", s.TutorialDone, 34);
			break;
		case 34:
			dumpHand();
			addToHand('Core.Pony.PrincessCelestia');
			setHoverBubble("hand","above", s.Tutorial30, 35);
			break;
		case 35:
			setHoverBubble("ponyDiscardPile","right", s.Tutorial31);
			model.onCardMove = () => {
				if(model.me().hand.length >= 2)
					setupState(36);
			}
			break;
		case 36:
			setHoverBubble("hand","above", s.TutorialDone, 37);
			break;
		case 37:
			dumpHand()
			addToHand("Core.Pony.EarthChangeling","Core.Ship.BoredOnASundayAfternoon")
			setHoverBubble("hand","above", s.Tutorial32, 38);
			break;
		case 38:
			setHoverBubble("hand","above", s.Tutorial33);
			model.onCardMove = () => {
				if(model.turnstate!.overrides["Core.Pony.EarthChangeling"]?.disguise)
					setupState(39);
			}
			break;
		case 39:
			setHoverBubble("hand","above", s.TutorialDone, 40);
			break;
		case 40:
			dumpHand();
			addToHand("Core.Pony.TsundereRainbowDash", "Core.Pony.Cheerilee", "Core.Ship.TimeForAnExperiment")
			setHoverBubble("hand","above", s.Tutorial34, 41);
			break;
		case 41:
			setTutorialTarget("Core.Ship.TimeForAnExperiment")
			setHoverBubble("tutorialTarget", "above", s.Tutorial35)
			model.onCardMove = () => {
				for(let key in model.turnstate!.overrides)
				{
					if(model.turnstate!.overrides[key].race)
						setupState(42)
				}
			}
			break;
		case 42:
			setHoverBubble("hand","above", s.TutorialDone, 43);
			break;
		case 43:
			setHoverBubble("hand","above", s.Tutorial36, 44);
			break;
		case 44:
			setHoverBubbleFull("hand","above", s.Tutorial37, s.TutorialEndTutorial, ()=>{setupState(45)})
			break;
		case 45:
			window.location.href = "/";
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
		setupState(2050);
}

function dumpHand()
{
	let hand = model.me().hand;

	for(let card of hand)
	{
		if(isShip(card))
		{
			if(model.shipDiscardPile.length)
			{
				let topCard = model.shipDiscardPile[model.shipDiscardPile.length-1];
				model.cardLocations[topCard] = "shipDiscardPile,stack";
			}

			model.shipDiscardPile.push(card);
			model.cardLocations[card] = "shipDiscardPile,top";
		}
		if(isPony(card))
		{
			if(model.ponyDiscardPile.length)
			{
				let topCard = model.ponyDiscardPile[model.ponyDiscardPile.length-1];
				model.cardLocations[topCard] = "ponyDiscardPile,stack";
			}

			model.ponyDiscardPile.push(card);
			model.cardLocations[card] = "ponyDiscardPile,top";
		}
		
	}

	model.me().hand = [];
	updateShipDiscard();
	updatePonyDiscard();
	updateHand();
}

function addToHand(...cards:string[])
{	
	model.me().hand.splice(0,0,...cards);
	for(let card of cards)
	{
		model.cardLocations[card] = "player,tutorial";
	}
	updateHand();
}

function setHoverBubble(elementID:string, position:"left"|"right"|"above"|"below", text:string, nextState?: number)
{
	let fun = nextState == undefined ? undefined : ()=>{setupState(nextState)}
	setHoverBubbleFull(elementID, position, text, s.TutorialNext, fun);
}