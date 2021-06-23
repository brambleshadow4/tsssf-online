/**
	Some basic documentation of the implicit types of this file + the game

	type Location is a string with the possible valid values:

		"ponyDiscardPile,<area>" where <area> is "top" or "stack"
		"goalDiscardPile,<area>" where <area> is "top" or "stack"
		"shipDiscardPile,<area>" where <area> is "top" or "stack"
		"ponyDrawPile" 
		"goalDrawPile" 
		"shipDrawPile"
		"winnings"  - this client's winnings (completed goals)
		"hand" - this client's hands
		"player" - an opponent
		"<placement>,<x>,<y>" is a board location where 
			<placement> is "p" for pony or "sr" for ship right or "sd" for ship down
			<x> is the x coordinate of the card on the board
			<y> is the y coordinate of the card on the board

		"offset,<x>,<y>" where
			<x> is the x coordinate of the card on the board
			<y> is the y coordinate of the card on the board

		"goal",<pos>" where <pos> is 0, 1, or 2

		"limbo" - used for cards which have disappeared from the board - see moveCard()

	type CardID is a string used to represent what the card is. It looks something like "Core.Pony.SuperSpyTwilight"


	model: {
		board: map BoardLocation -> {element: HTMLElement, card: CardID}

		offsets: {
			// existence of the offset key signifies the card is offset
			[offsetKey]: string // the string is the id of the card element added to the DOM
		}
		
		players: map int ->

		playerName: string // the name of this player

		currentGoals: {
			card: CardID,
			achieved: boolean
		}[]

		// turnstate is undefined in sandbox mode
		turnstate:{
			currentPlayer: string // the name of the player whose turn it is
			overrides: map CardID -> {
				race?: string
				gender?: string
				disguise?: cardID 
				doublePony?: boolean
			}
		}
	}

*/

import * as cm from "../../model/cardManager.js";
import s from "../tokens.js";

import {
	isPony, 
	isGoal, 
	isShip, 
	isGoalLoc, 
	isBoardLoc,
	isOffsetLoc,
	isPlayerLoc,
	isDiscardLoc,
	isBlank,
	isPonyOrStart,
	isStart,
	isCardIncluded,
	getNeighborKeys,
	slashStringToSet,
	GameModel as GameModelShared,
	Card, Location,
	CardProps, GoalProps, ShipProps, PonyProps, OverrideProps,
	Turnstate,
	CardElement,
} from "../../model/lib.js";

import {
	updatePonyDiscard,
	updateShipDiscard,
	updateGoalDiscard,
	updateWinnings,
	updatePlayerList,
	updateGoals,
	updateHand,
	initPeripherals,
	openCardSelect,
	openSearchCardSelect,
	customCardsPopup
} from "./peripheralComponents.js";

import
{
	removeCardFromBoard,
	initBoard,
	updateBoard,
	clearBoard
} from "./boardComponent.js"

import {
	makeCardElement,
	setDisguise,
	setCardKeywords,
	addTempSymbol,
	setActionButton,
	clearActionButtons
} from "./cardComponent.js"

import * as GameView from "./gameView.js" 

import {WebSocketPlus} from "../viewSelector.js"

import {
	broadcastMove,
	broadcast,
	attachToSocket,
	//broadcastEffects
} from "./network.js";


interface GameModel extends GameModelShared
{
	hand: Card[],
	winnings: {card: Card, value: number}[],
	playerName: string,
	turnstate: Turnstate & {
		openShips: {[card: string]: true}
		removedFrom: [Location, Card];
	};
}

import {createPopup} from "./popupComponent.js";

let win = window as unknown as {
	cardLocations: {[key:string]: Location},
	model: GameModel,
	toggleFullScreen: Function,
	createHelpPopup: Function,
	socket: WebSocketPlus,
	updateGame: Function
}

win.model = {} as GameModel;

win.cardLocations = {};

var offsetId = 0;

var hoverCard = "";
var hoverCardDiv;

var customCardWarningShown = false;
var showingHelpPopup = false;


var haveCardsLoaded = false;

function toggleFullScreen()
{
	if(document.fullscreenElement)
	{
		document.exitFullscreen();
	}
	else
	{
		if(document.documentElement.requestFullscreen)
			document.documentElement.requestFullscreen();
	}		
}

win.toggleFullScreen = toggleFullScreen;

export function loadView()
{
	if(window.location.pathname != "/game")
	{
		history.replaceState(null, "", "/game" + window.location.search)
	}

	turnStateChangelings = {};
	haveCardsLoaded = false;

	win.cardLocations = {};

	document.body.innerHTML = "";
	document.head.innerHTML = GameView.HEAD;
	document.body.innerHTML = GameView.HTML;
	
	initBoard();
	initPeripherals();

	if(!sessionStorage["shownHelp"])
	{
		sessionStorage["shownHelp"] = "true";
		win.createHelpPopup();
		showingHelpPopup = true;
	}

	attachToSocket(win.socket);

	win.updateGame = updateGame;

	window.onresize = function(e: Event)
	{
		var fullscreenButton = document.getElementById('fullscreenButton') as HTMLImageElement;
		if(fullscreenButton)
		{
			if(document.fullscreenElement)
			{
				fullscreenButton.src = "/img/smallscreen.svg";
			}
			else
			{
				fullscreenButton.src = "/img/fullscreen.svg";
			}
		}
		
	}

}



var allKeywords: string[] = [];

// Preloading all the cards makes everything feel instant.


function LoadCards(): void
{
	if(haveCardsLoaded)
		return;

	document.body.classList.add("cardsUnapproved");


	var keywordSet: Set<string> = new Set();

	haveCardsLoaded = true;



	var preloadedImages = document.getElementById('preloadedImages')!;

	let model = win.model;

	cm.init(model.cardDecks.concat([model.startCard]), model.customCards.cards);

	let cards = cm.inPlay();

	let customCardsInUse = false

	for(var key in cards)
	{
		
		if(key.startsWith("X.") && !customCardsInUse)
		{
			customCardsInUse = true;

			document.body.classList.add("cardsUnapproved");

			(async function(){
				
				await customCardsPopup();

				document.body.classList.remove("cardsUnapproved");

				if(showingHelpPopup)
				{
					win.createHelpPopup();
				}

				showingHelpPopup = false;

			})();
		}

		if(cards[key].thumb)
		{
			var img = document.createElement('img');


			img.src = cards[key].thumb;
			preloadedImages.appendChild(img);	
		}

		if(cards[key].keywords)
		{
			for(var keyword of cards[key].keywords)
			{
				keywordSet.add(keyword);
			}
		}
	}

	allKeywords = [...keywordSet.keys()].sort();

}


function getPosFromElement(element: HTMLElement)
{
	var rect = element.getBoundingClientRect();
	return {top: rect.top +"px", left: rect.left + "px"};
}

function getPosFromId(id: string)
{
	var rect = document.getElementById(id)!.getBoundingClientRect();
	return {top: rect.top + "px", left: rect.left + "px"};
}

function animateCardMove(card: Card, startPos: {[key:string]: string}, endPos: {[key:string]: string}, endLocationUpdateFn: Function)
{
	var floatCard = makeCardElement(card);
	floatCard.style.margin = "0px";
	floatCard.style.position = "absolute";
	floatCard.classList.add('flying');
	for(var key in startPos)
	{
		(floatCard as any).style[key] = startPos[key];
	}

	floatCard.style.zIndex = "4";
	floatCard.style.transition = "top .5s, left .5s";
	floatCard.style.transitionTimingFunction = "linear";

	document.body.appendChild(floatCard);

	setTimeout(function(){
		for(var key in endPos)
		{
			(floatCard as any).style[key] = endPos[key];
		}

	},20)
	

	setTimeout(function()
	{
		endLocationUpdateFn();
		if(floatCard.parentNode)
			floatCard.parentNode.removeChild(floatCard);
	}, 520);
}

export function updateTurnstate()
{
	let model = win.model;
	var turnstate = model.turnstate!;

	if(!turnstate){
		document.body.classList.remove("nomove");
		return;
	}



	var div = document.getElementById('turnInfo')!;
	if(isItMyTurn())
	{
		document.body.classList.remove("nomove");

		div.innerHTML = "<div>" + s.GameYourTurn + "</div>";
		var button = document.createElement('button');
		button.innerHTML = s.GameEndMyTurnButton;
		div.appendChild(button);

		button.onclick = function()
		{
			broadcast("endturn");
		}
	}
	else
	{
		document.body.classList.add("nomove");

		div.innerHTML = `<div>`+ s.GamePlayerTurn.replace("{0}", model.turnstate.currentPlayer) + `</div>`;


		var thisPlayer = model.players.filter(x => x.name == turnstate.currentPlayer)[0];

		if(thisPlayer && thisPlayer.disconnected)
			div.innerHTML += "<div>" + s.GameDisconnectTimeout + "</div>";
	}

	updateEffects();
	updatePlayerList();
}

var turnStateChangelings: {[key:string]: any} = {};

function updateEffects()
{
	var larsonEffect = "";
	let model = win.model;

	if(!model.turnstate) return;


	let cardLocations = win.cardLocations;

	for(var key in model.board)
	{
		if(model.board[key] && model.board[key].card == "HorriblePeople.2015Workshop.Pony.AlicornBigMacintosh")
		{
			larsonEffect = model.board[key].card;
			break;
		}
	}


	var decoration = document.getElementsByClassName('decoration');
	var i = 0;
	while(i < decoration.length)
	{
		if(decoration[i].classList.contains('changeling'))
			i++;
		else
			decoration[i].parentNode!.removeChild(decoration[i]);
	}

	// We don't want to update changelines always because that will mess up their animation
	for(var card in turnStateChangelings)
	{
		let newDisguise = getCardProp(card, "disguise");
		let action = cm.inPlay()[card].action || "";

		if(larsonEffect && action.startsWith("Changeling"))
		{
			newDisguise = larsonEffect;
		}

		if(!isBoardLoc(cardLocations[card]))
		{
			delete turnStateChangelings[card];
		}

		if(isBoardLoc(cardLocations[card]) && newDisguise != turnStateChangelings[card])
		{	
			var element = model.board[cardLocations[card]].element!;
			var div = element.getElementsByClassName('changeling')[0];
			if(div)
				div.parentNode!.removeChild(div);

			delete turnStateChangelings[card]	
		}
	}


	var cardsToApplyEffectsTo = model.turnstate.overrides;


	if(larsonEffect)
	{
		var newCards = Object.keys(model.board)
			.filter( x => x.startsWith("p,") && !isBlank(model.board[x].card))
			.map(x => model.board[x].card);

		var newObj = {} as any;
		for(var card of newCards)
		{
			newObj[card] = true;
		}

		cardsToApplyEffectsTo = newObj;
	}


	for(var card in cardsToApplyEffectsTo)
	{	

		if(isBoardLoc(cardLocations[card]))
		{
			var element = model.board[cardLocations[card]].element!;
			var decs = getCardProp(card, "*");

			if(larsonEffect && card != larsonEffect)
			{
				decs.race = "alicorn";
				if(!decs.keywords)
					decs.keywords = ["Princess"];
				else
					decs.keywords.push("Princess");

				let action = cm.inPlay()[card].action || "";

				if(action.startsWith("Changeling"))
					decs.disguise = larsonEffect;
			}

			if(decs.disguise && element.getElementsByClassName('changeling').length == 0)
			{
				setDisguise(element, decs.disguise);
				turnStateChangelings[card] = decs.disguise;
			}

			if(decs.gender)
			{
				addTempSymbol(element, decs.gender);
			}

			if(decs.race)
			{
				addTempSymbol(element, decs.race);
			}

			if(decs.altTimeline)
			{
				addTempSymbol(element, "altTimeline");
			}

			if(decs.count == 2)
			{
				addTempSymbol(element, "doublePony");
			}

			if(decs.keywords)
			{
				setCardKeywords(element, decs.keywords)
			}

			if(decs.shipWithEverypony)
			{
				addTempSymbol(element, "star", s.GameEffectShippedWithEveryPony);
			}

			if(decs.fullCopy)
			{
				let caption = s.GameEffectCopying.replace("{0}", decs.fullCopy.substring(decs.fullCopy.lastIndexOf(".")+1));
				addTempSymbol(element, "star", caption);
			}
		}	
	}	


	var playedThisTurn = new Set(model.turnstate.playedThisTurn)

	var cardsWithJustPlayed = document.getElementsByClassName('justPlayed');
	
	var toRemove = []
	for(var el of cardsWithJustPlayed)
	{
		if(!playedThisTurn.has(el.getAttribute('card')))
		{
			toRemove.push(el);
		}
	}

	toRemove.map(x => x.classList.remove("justPlayed"));

	for(let card of model.turnstate.playedThisTurn)
	{
		if(isBoardLoc(cardLocations[card]))
		{
			model.board[cardLocations[card]].element!.classList.add('justPlayed');
		}
	}
}

export async function updateGame(newModel?: GameModel)
{

	if(newModel)
	{
		clearBoard();
		win.model = newModel;

		if(win.model.turnstate)
		{
			win.model.turnstate.playedThisTurn = new Set(win.model.turnstate.playedThisTurn );
		}
	}

	let model = win.model;


	LoadCards();


	var flyingCards = document.getElementsByClassName('flying');
	while(flyingCards.length)
		flyingCards[0].parentNode!.removeChild(flyingCards[0]);

	
	updateHand();
	updateGoals();
	updateBoard();

	updatePonyDiscard();
	updateShipDiscard();
	updateGoalDiscard();

	let cardLocations = win.cardLocations;

	for(var card of model.ponyDiscardPile)
	{
		cardLocations[card] = "ponyDiscardPile,stack";
	}

	for(var card of model.shipDiscardPile)
	{
		cardLocations[card] = "shipDiscardPile,stack";
	}

	for(var card of model.goalDiscardPile)
	{
		cardLocations[card] = "goalDiscardPile,stack";
	}

	cardLocations[model.ponyDiscardPile[model.ponyDiscardPile.length-1]] = "ponyDiscardPile,top";
	cardLocations[model.shipDiscardPile[model.shipDiscardPile.length-1]] = "shipDiscardPile,top";
	cardLocations[model.goalDiscardPile[model.goalDiscardPile.length-1]] = "goalDiscardPile,top";

	updateWinnings();
	updatePlayerList();
	updateTurnstate();
}



export function isItMyTurn(): boolean
{
	let model = win.model;
	return model.turnstate == undefined || model.turnstate.currentPlayer == model.playerName;
}


let dataTransferVar = "stupid";

export function setDataTransfer(val: string)
{
	dataTransferVar = val;
}

export function getDataTransfer()
{
	return dataTransferVar;
}


export function isValidMove(cardDragged: Card, targetCard: Card, endLocation: Location)
{
	if(cardDragged == targetCard) return false;
	let model = win.model;

	if(isStart(targetCard) && !isBoardLoc(win.cardLocations[cardDragged] ))
	{
		return false;
	}

	if(isPonyOrStart(targetCard) && isPonyOrStart(cardDragged))
	{
		var offsetLoc = endLocation.replace("p,","offset,");
		return !model.board[offsetLoc];
	}

	if(!isItMyTurn())
	{
		return false;
	}

	return (targetCard == "blank:ship" && (isShip(cardDragged) || cm.inPlay()[cardDragged].action == "ship")
		|| (targetCard == "blank:pony" && isPonyOrStart(cardDragged))
	);
}

function getCardAtLoc(loc: Location)
{
	let model = win.model;
	if(isBoardLoc(loc))
	{
		return model.board[loc].card;
	}
	if(isGoalLoc(loc))
	{
		return model.currentGoals[Number(loc.split(",")[1])].card;
	}
}


export async function moveCard(
	card: Card,
	startLocation: Location,
	endLocation: Location, 
	options?:{
		forceCardToMove?: boolean,
		extraArg?: any,
		noAnimiation?: boolean
	}
){
	var startPos = {};
	const vh = window.innerHeight/100;
	let model = win.model;
	let cardLocations = win.cardLocations;

	options = options || {};

	if(cardLocations[card] == endLocation)
	{
		return;
	}

	if(startLocation != cardLocations[card])
	{
		// if another player moves card A to a goal/board location L at the same time as you move card B,
		// you move B to L, then message arrives to move A to L,
		// then message arives to move B back, but it's no longer at L.
		// 
		// Thus we check to make sure B is still at L to prevent moving A by accident
		if(cardLocations[card] 
			&& (isBoardLoc(cardLocations[card]) || isGoalLoc(cardLocations[card]))
			&& getCardAtLoc(cardLocations[card]) != card)
		{
			delete cardLocations[card];
		}

		if(cardLocations[card] != undefined)
		{
			startLocation = cardLocations[card];
		}
	}

	if(startLocation == endLocation)
	{
		//console.log("same location: " + startLocation);
		return;
	}

	if(startLocation == "winnings")
	{
		let i = model.winnings.map(x => x.card).indexOf(card);
		model.winnings.splice(i,1);
		updateWinnings();

		var enddiv = document.getElementById("winnings")!;
		rect = enddiv.getBoundingClientRect();
		startPos = {
			top: rect.bottom - 18*vh + "px",
			left: rect.right - 13*vh + "px"
		}
	}

	if(startLocation == "hand")
	{
		let i = model.hand.indexOf(card);

		startPos = getPosFromId("hand" + i);

		if(i == -1) { return };
		model.hand.splice(i,1);

		updateHand("-" + card);
	}
	else if(isDiscardLoc(startLocation))
	{
		
		var [pile,slot] = startLocation.split(",");
		let i = (model as any)[pile].indexOf(card);
		(model as any)[pile].splice(i,1);


		var newTopCard = (model as any)[pile][(model as any)[pile].length-1];
		cardLocations[newTopCard] = pile + ",top";

		startPos = getPosFromId(pile);

		var typ = startLocation.substring(0,4)
		if(typ == "pony") updatePonyDiscard();
		if(typ == "ship") updateShipDiscard();
		if(typ == "goal") updateGoalDiscard();
	}
	else if(["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1)
	{
		startPos = getPosFromId(startLocation)
	}
	else if(isPlayerLoc(startLocation))
	{
		startPos = {top: "-18vh", left: "50vh"};

		var playerName = startLocation.split(",")[1];
		var player = model.players.filter(x => x.name == playerName)[0];
		if(player.hand) 
		{
			let i = player.hand.indexOf(card);
			player.hand.splice(i, 1);
		}
	}
	/*else if(isOffsetLoc(startLocation))
	{
		var element = model.board[startLocation].element;
		startPos = getPosFromElement(element);
		element.parentNode.removeChild(element);

		delete model.board[startLocation];
	}*/
	else if(isBoardLoc(startLocation) || isOffsetLoc(startLocation))
	{
		startPos = getPosFromElement(model.board[startLocation].element!);

		var removedCard = model.board[startLocation].card;

		removeCardFromBoard(startLocation);
		updateBoard();

		if(model.turnstate)
		{
			model.turnstate.removedFrom = [startLocation, removedCard];
		}

	}
	else if(isGoalLoc(startLocation))
	{
		var [_,is] = startLocation.split(',')
		let i = Number(is);

		startPos = getPosFromElement(document.getElementById('currentGoals')!.getElementsByClassName('card')[i] as HTMLElement);

		model.currentGoals[i] = {card:"blank:goal", achieved: false};

		updateGoals();
	}

	/// removing

	var updateFun = function(){};
	var endPos = {};
	
	if(endLocation == "hand")
	{
		model.hand.push(card);

		var enddiv = document.getElementById('hand-pony')!;
		var rect = enddiv.getBoundingClientRect();

		var cardCount = isPony(card) ? model.hand.filter(x => isPony(x)).length : model.hand.length;

		var offset = ((cardCount-1) * (13 + 1) + 1) * vh;
		
		endPos = {
			top: (rect.top + vh) + "px",
			left: (rect.left + offset) + "px"
		}

		let x = model.hand.length - 1;

		updateFun = () => updateHand("+" + card);
	}
	else if(isDiscardLoc(endLocation))
	{
		var [pile,slot] = endLocation.split(",");

		let discardArr = (model as any)[pile] as Card[];

		if (slot=="top")
		{
			if(discardArr.length)
				cardLocations[discardArr[discardArr.length-1]] = pile + ",stack";

			discardArr.push(card);
		}
		else
		{
			discardArr.splice(Math.max(0,discardArr.length-2), 0, card);
		}

		var updateFun2 = {
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		}[endLocation.substring(0,4)] as Function;

		updateFun = () => {
			if(slot=="top")
				updateFun2(card);
			else
				updateFun2();
		}

		endPos = getPosFromId(pile);
	}
	else if(endLocation == "winnings")
	{

		model.winnings.push({card, value: Number(options.extraArg) || 0});
		updateFun = updateWinnings;

		var enddiv = document.getElementById("winnings")!;
		rect = enddiv.getBoundingClientRect();
		endPos = {
			top: rect.bottom - 18*vh + "px",
			left: rect.right - 13*vh + "px"
		}
	}
	else if(isPlayerLoc(endLocation))
	{
		endPos = {top: "-18vh", left: "50vh"};

		var playerName = endLocation.split(",")[1];
		var player = model.players.filter(x => x.name == playerName)[0];
		if(!isGoal(card) && player.hand)
		{
			player.hand.push(card);
		}

	}
	else if(isBoardLoc(endLocation) || isOffsetLoc(endLocation))
	{
		if(model.board[endLocation])
		{
			if(!isBlank(model.board[endLocation].card))
			{
				// This can happen if a player has moved a card on the board when another player just
				// moved a card onto the same square.
				//
				// The server sends a move msg down with the correct card, and the incorrect card moves to limbo.
				// Then server sends a move msg down moving the limbo card back to its proper place.
				cardLocations[model.board[endLocation].card] = "limbo";
			}
			
			removeCardFromBoard(endLocation);
		}

		if(model.turnstate)
		{
			model.turnstate.playedThisTurn.add(card);
		}

		model.board[endLocation] = {
			card: card
		}

		updateFun = updateBoard;	
	}
	else if(isGoalLoc(endLocation))
	{
		let [_,istr] = endLocation.split(',')
		let i = Number(istr);

		endPos = getPosFromElement(document.getElementById('currentGoals')!.getElementsByClassName('card')[i] as HTMLElement);

		model.currentGoals[i] = {card, achieved: false};
		updateFun = () => updateGoals(i)
	}

	cardLocations[card] = endLocation;
	
	if(isPlayerLoc(endLocation))
	{
		delete cardLocations[card];
	}



	if(!options.forceCardToMove)
	{
		broadcastMove(card, startLocation, endLocation, options.extraArg ? "" + options.extraArg : "");
	}

	// run animation (if applicable)
	

	if(startLocation != "limbo" && !options.noAnimiation
		&& !(isDiscardLoc(startLocation) && isDiscardLoc(endLocation)) // not going from discard to discard
		&& (
			isDiscardLoc(endLocation)
			|| ["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1
			|| endLocation == "winnings"
			|| isGoalLoc(endLocation)
			|| isPlayerLoc(endLocation)
			|| (isPlayerLoc(startLocation) && endLocation == "hand")
		)
	)
	{
		animateCardMove(card, startPos || {}, endPos || {}, updateFun);
	}
	else
	{
		updateFun();
	}

	clearActionButtons();

	if(!options.forceCardToMove)
	{
		await doPlayEvent({card, startLocation, endLocation});
	}

	updateTurnstate();
	updateRemoveUnconnectedCardsButton();

}


function updateRemoveUnconnectedCardsButton()
{
	let model = win.model;

	let unconnected = new Set(Object.keys(model.board).filter(x => !x.startsWith("offset") && model.board[x].card && !isBlank(model.board[x].card)));

	let startLocation = win.cardLocations[model.startCard];

	let button = document.getElementById('removeUnconnectedCards') as HTMLElement;

	if(model.turnstate && model.turnstate.currentPlayer != model.playerName)
	{
		button.style.display = "none";
		return;
	}

	if(isBoardLoc(startLocation))
	{
		unconnected.delete(startLocation);
		let frontier = [startLocation];
		let connected = new Set([startLocation]);
		let incompleteShips = [];

		while(frontier.length)
		{
			let loc = frontier.shift() as string;

			let neighbors = getNeighborKeys(loc);

			let missingNeighbor = false;

			for(let n of neighbors)
			{
				if(unconnected.has(n) && !connected.has(n))
				{
					frontier.push(n);
					connected.add(n);
					unconnected.delete(n);
				}

				if(!unconnected.has(n) && !connected.has(n))
					missingNeighbor = true;
			}

			// if a ship isn't connected to two ponies, discard it
			if(loc.startsWith("s") && missingNeighbor)
			{
				incompleteShips.push(loc);
			}
		}

		if(unconnected.size)
		{
			button.style.display = "block";
			let unconnectedLocs = [...unconnected, ...incompleteShips];
			let f = function()
			{
				if(unconnectedLocs.length)
				{
					let loc = unconnectedLocs.pop() as string;
					let card = win.model.board[loc].card;
					let discard = isShip(card) ? "shipDiscardPile,top" : "ponyDiscardPile,top";

					moveCard(card, loc, discard);

					setTimeout(f, 50);
				}
			}
			button.onclick = f;
		}
		else
		{
			button.style.display = "none";
		}
	}
	else
	{
		button.style.display = "none";
	}

}

var playEventHandlers = [];


async function doPlayEvent(e: {card: Card, startLocation: Location, endLocation: Location})
{
	var cardInfo = cm.inPlay()[e.card];
	let model = win.model;
	let cardLocations = win.cardLocations;

	var isImmediatePlay = (e.startLocation == "hand" || e.startLocation == "ponyDiscardPile,top")


	if(isPonyOrStart(e.card) && isBoardLoc(e.endLocation))
	{
		var neighbors = getNeighborCards(e.card);

		if(model.turnstate)
		{
			if(!model.turnstate.openShips)
				model.turnstate.openShips = {};

			/*if(neighbors.length == 1 && model.turnstate.openShips[neighbors[0]])
			{
				model.turnstate.triggerShip = neighbors[0];
			}
			else
			{
				model.turnstate.triggerShip = "";
			}*/
		}

		var fn = getCardAction(e.card);
		if(fn && (isImmediatePlay || doActionOnSwap(e.card)))
		{
			await fn(e.card);
		}
	}

	if(isShip(e.card))
	{
		var cardInfo = cm.inPlay()[e.card];
		if(isShip(e.card) && isBoardLoc(e.endLocation))
		{
			if(model.turnstate)
			{
				if(!model.turnstate.openShips)
					model.turnstate.openShips = {};

				model.turnstate.openShips[e.card] = true;
			}
		}
	}

	if(model.turnstate)
	{
		for(let key in model.turnstate.openShips)
		{
			let shipCard =  key
			if(!cardLocations[shipCard] || !isBoardLoc(cardLocations[shipCard]))
			{
				// card has been removed from the board.
				delete model.turnstate.openShips[shipCard];
				continue
			}

			if(isShipClosed(shipCard))
			{
				delete model.turnstate.openShips[shipCard];

				fn = getCardAction(shipCard);
				if(fn) await fn(shipCard);


				// add action buttons to other cards
				if(shipCard == e.card)
				{
					//model.turnstate.triggerShip = shipCard;

					var ponies = getNeighborCards(shipCard);

					for(let pony of ponies)
					{
						let fn = getCardAction(pony);



						var cardElement = model.board[cardLocations[pony]].element!;

						if(fn != undefined)
						{
							let fn2 = fn;
							setActionButton(cardElement, async function(e: Event){
								await fn2(pony);
								updateEffects();
							});	
						}
					}
				}
			}
		}
	}
}

//window.moveCard = moveCard;



function isShipClosed(shipCard: Card)
{
	return getNeighborCards(shipCard).length == 2;
}


function getNeighborCards(shipCard: Card)
{
	let model = win.model;
	var loc = win.cardLocations[shipCard];

	var neighbors = getNeighborKeys(loc);

	var shipClosed = true;
	var neighborCards = [];
	for(var n of neighbors)
	{
		if(!isBlank(model.board[n].card))
		{
			neighborCards.push(model.board[n].card)
		}
	}

	return neighborCards;
}

function getCardAction(card: Card)
{	
	var cardInfo = cm.inPlay()[card];

	if(!cardInfo.action) { return; }

	var actionName = cardInfo.action as string;
	var params: string[] = [];
	var a = actionName.indexOf("(");
	var b = actionName.indexOf(")");

	if(a > 0 && b > 0)
	{
		params = actionName.substring(a+1,b).split(",").map( x => x.trim());
		actionName = actionName.substring(0,a);
	}

	switch(actionName)
	{
		case "addKeywords": return addKeywordsAction(...params);
		case "ChangelingNoRedisguise": 
		case "Changeling": 
			return (changelingAction as any)(...params);
		case "clone": return cloneAction;
		case "genderChange": return genderChangeAction;
		case "keywordChange": return keywordChangeAction;
		case "makePrincess": return makePrincessAction;
		case "raceChange": return raceChangeAction;
		case "raceGenderChange": return raceGenderChangeAction;
		case "shipWithEverypony": return shipWithEveryponyAction;
		case "timelineChange": return timelineChangeAction;
		case "fullCopy": return fullCopyAction;
		case "exchangeCardsBetweenHands": return exchangeCardsBetweenHandsAction;
		
	}		
}

function doActionOnSwap(card: Card)
{
	var cardInfo = cm.inPlay()[card] as PonyProps;
	if(cardInfo.action && cardInfo.action.startsWith("Changeling("))
	{
		return true;
	}

	return false;
}


function changelingAction(type: string)
{
	let model = win.model;
	let cardLocations = win.cardLocations;
	return async function(card: Card)
	{
		if(model.turnstate)
		{
			let cards = cm.inPlay();
			var cardNames = Object.keys(cards);
			var disguises = cardNames.filter(x => isPony(x) && cards[x].count == undefined && x != card);

			var newDisguise = "";

			switch(type)
			{
				case "alicorn":
				case "unicorn":
				case "earth":
				case "pegasus":

					disguises = disguises.filter(x => slashStringToSet(cards[x].race).has(type));
					break;
				case "nonAlicornFemale":
					disguises = disguises.filter(x => !(
						slashStringToSet(cards[x].race).has("alicorn")
						&& slashStringToSet(cards[x].gender).has("female")
					));

					break;
				case "replace":
					
					var thisLocation = cardLocations[card];
					var offset = thisLocation.replace("p,","offset,");

					if(model.board[offset] && model.board[offset].card)
					{
						newDisguise = model.board[offset].card;
					}
					else if(model.turnstate.removedFrom 
						&& model.turnstate.removedFrom[0] == thisLocation)
					{
						newDisguise = model.turnstate.removedFrom[1] ;
					}
					
					disguises = [];

					break;
				case "plushling":
					// no extra filtering needs to be done for plushling
					break;
				default:
					disguises = [];
			}

			if(!disguises.length && !newDisguise)
				return;

			newDisguise = newDisguise || await openSearchCardSelect(s.PopupTitleSelectDisguise, s.PopupChooseDisguise, disguises, true);

			if(!newDisguise)
				return

			// reset overrides when changeling changes type.
			setCardProp(card, "disguise", newDisguise);
			//broadcastEffects();
		}
	}
}

async function fullCopyAction(card: Card)
{
	let model = win.model;
	if(model.turnstate)
	{
		var copyOptions = Object.keys(model.board).filter(x => x.startsWith("p,") && model.board[x].card && !isBlank(model.board[x].card)).map(x => model.board[x].card);

		copyOptions = copyOptions.filter(x => x != card);

		if(!copyOptions.length) { return; }


		var cardToCopy = await openCardSelect(s.PopupTitleCopy, s.PopupChoosePonyToCopy, copyOptions);

		setCardProp(card, "fullCopy", cardToCopy);
	}
	
}


function getCardProp(card: Card, prop: keyof OverrideProps | "*")
{
	let model = win.model;
	var cardObj = model.turnstate.overrides[card] || {};

	var baseCard = card;

	baseCard = cardObj.disguise || card;

	if(prop == "*")
	{
		var copy = {} as any;
		for(var k in cardObj)
		{
			copy[k] = cardObj[k as keyof OverrideProps];
		}

		return copy;
	}

	if(cardObj && cardObj[prop])
		return cardObj[prop ]

	return (cm.inPlay()[baseCard] as any)[prop];
}

function setCardProp(card: Card, prop: keyof OverrideProps, value: any)
{
	let model = win.model;
	let cardProps = cm.inPlay()[card];
	let isChangeling = cardProps.action && cardProps.action.startsWith("Changeling(");

	if(model.turnstate)
	{
		if (!model.turnstate.overrides[card])
		{
			model.turnstate.overrides[card] = {};
		}

		if(prop == "disguise")
		{
			var oldOverrides = model.turnstate.overrides[card];
			model.turnstate.overrides[card] = {};

			if(oldOverrides.shipWithEverypony)
				model.turnstate.overrides[card].shipWithEverypony = true;
		}

		var propObj = model.turnstate.overrides[card]


		if(prop == "keywords")
		{
			if(propObj.keywords == undefined)
				propObj.keywords = [value];
			else if(propObj.keywords.indexOf(value) == -1)
				propObj.keywords.push(value);
		}
		else
		{
			propObj[prop] = value;
		}

		broadcast("effects;" + card + ";" + prop + ";" + value)
	}
}

async function makePrincessAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);


	var ponyCard = await openCardSelect(s.PopupTitleSpecial, s.PopupChoosePrincess, ponies.filter(x => cm.inPlay()[x].keywords.indexOf("Changeling") === -1), true);

	if(ponyCard)
	{
		setCardProp(ponyCard, "race", "alicorn");
		setCardProp(ponyCard, "gender", "female");
		setCardProp(ponyCard, "keywords", "Princess");

		//broadcastEffects();
	}
}

async function genderChangeAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);
	var ponyCard = await openCardSelect(s.PopupTitleGenderChange, s.PopupChoosePonyToChangeGender, ponies, true);

	if(!ponyCard) return;

	if(win.model.turnstate)
	{
		var newGender = undefined;

		switch(getCardProp(ponyCard, "gender"))
		{
			case "male": newGender = "female"; break;
			case "female": newGender = "male"; break;
			default: newGender = undefined;
		}

		if(newGender)
		{
			setCardProp(ponyCard, "gender", newGender)
			//broadcastEffects();
		}
	}
}

async function shipWithEveryponyAction(ponyCard: Card)
{
	let model = win.model;
	var ponies = [];
	for(var key in model.board)
	{
		if(key.startsWith("p,") && !isBlank(model.board[key].card))
		{
			ponies.push(model.board[key].card);
		}
	}

	var chosen = await openCardSelect(s.PopupTitleSpecial, s.PopupChoosePonyToShipWithEverypony, ponies, true);

	if(chosen)
	{
		setCardProp(chosen, "shipWithEverypony", true);
	}
}

async function cloneAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);
	var ponyCard = await openCardSelect(s.PopupTitleClone, s.PopupChooseClone, ponies.filter(x => !cm.inPlay()[x].count), true);

	if(!ponyCard) return;

	if(win.model.turnstate)
	{
		setCardProp(ponyCard, "count", 2)
		//broadcastEffects();
	}
}

async function timelineChangeAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);
	var ponyCard = await openCardSelect(s.PopupTitleTimelineChange, s.PopupChooseTimlinePony, ponies, true);

	if(!ponyCard) return;

	if(win.model.turnstate)
	{
		setCardProp(ponyCard, "altTimeline", true)
	}
}



async function keywordChangeAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);

	var output = await createPopup(s.PopupTitleKeywordChange, true, function(accept)
	{
		var element = document.createElement('div');
		element.className = "popupPage"

		var selectedPony: Card;
		var h1 = document.createElement('h1');
		h1.className = "no-top-margin";
		h1.innerHTML = s.PopupTextPickAKeyword;
		element.appendChild(h1);

		var card1 = makeCardElement(ponies[0]);
		card1.setAttribute('value', ponies[0])


		var card2 = makeCardElement(ponies[1]);
		card2.setAttribute('value', ponies[1])
		

		function ponySelect(this: any)
		{
			card1.classList.remove('selected')
			card2.classList.remove('selected')
			
			this.classList.add('selected');
			selectedPony = this.getAttribute('value')!;

		}

		card1.onclick = ponySelect;
		element.appendChild(card1);

		card2.onclick = ponySelect;
		element.appendChild(card2);
		
		var buttonDiv = document.createElement('div');
		buttonDiv.className = "keywordButtons";
		for(let i=0; i< allKeywords.length; i++)
		{

			var button = document.createElement("button");
			button.innerHTML = allKeywords[i];
			button.onclick = function(){

				if(selectedPony)
				{
					accept([selectedPony, allKeywords[i]]);
				}
				
			}

			buttonDiv.appendChild(button);

		}

		element.appendChild(buttonDiv);

		return element;


	});

	if(output && win.model.turnstate)
	{
		var [card, keyword] = output;
		setCardProp(card, "keywords", keyword)
	}
}

function addKeywordsAction(...keywords: string[])
{
	return async function(shipCard: Card)
	{
		var ponies = getNeighborCards(shipCard);
		var ponyCard = await openCardSelect(s.PopupTitleKeywordChange, s.PopupChoosePonyForKeywords, ponies, true);

		if(!ponyCard) return;

		if(win.model.turnstate)
		{
			for(var keyword of keywords)
			{
				setCardProp(ponyCard, "keywords", keyword);
			}
		}
	}
}

async function raceChangeAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);
	ponies = ponies.filter(x => cm.inPlay()[x].keywords.indexOf("Changeling") == -1);

	if(ponies.length == 0)
		return;

	var pair = await raceChangePopup(ponies);

	if(!pair) return;

	var [ponyCard, newRace] = pair;

	if(win.model.turnstate)
	{
		setCardProp(ponyCard, "race", newRace)
		//broadcastEffects();
	}
}

async function raceGenderChangeAction(shipCard: Card)
{
	var ponies = getNeighborCards(shipCard);
	ponies = ponies.filter(x => cm.inPlay()[x].keywords.indexOf("Changeling") == -1);

	if(ponies.length == 0)
		return;

	var triple = await raceGenderChangePopup(ponies);

	if(!triple) return;

	var [ponyCard, newRace, newGender] = triple;

	if(win.model.turnstate)
	{
		setCardProp(ponyCard, "race", newRace);
		setCardProp(ponyCard, "gender", newGender);
	}
}



function raceChangePopup(ponies: Card[])
{
	return createPopup(s.PopupTitleRaceChange, true, function(acceptFn)
	{
		var selectedPony: Card;
		var selectedRace: string;

		var div =document.createElement('div');
		div.classList.add('popupPage');

		var h1 = document.createElement('h1');
		h1.className = "no-top-margin";
		h1.innerHTML = s.PopupChoosePonyAndRace;
		div.appendChild(h1)

		var buttonDiv = document.createElement('div')
		buttonDiv.className = "raceButtonContainer"


		var card1 = makeCardElement(ponies[0]);
		card1.setAttribute('value', ponies[0]);

		var card2: CardElement | undefined;

		if(ponies.length == 2)
		{
			card2 = makeCardElement(ponies[1]);
			card2.setAttribute('value', ponies[1])
		}
		

		function ponySelect(this: any, e: MouseEvent)
		{
			var el = this as HTMLElement;
			card1.classList.remove('selected')
			if(card2)
				card2.classList.remove('selected')
			
			el.classList.add('selected');
			selectedPony = el.getAttribute('value')!;

			if(selectedPony && selectedRace)
				acceptFn([selectedPony, selectedRace]);

		}

		card1.onclick = ponySelect;
		buttonDiv.appendChild(card1);

		if(card2)
		{
			card2.onclick = ponySelect;
			buttonDiv.appendChild(card2);
		}

		var earth = document.createElement('img');
		earth.className = 'raceButton';
		earth.setAttribute('value','earth')
		earth.src = "/img/sym/earth.png";
		buttonDiv.appendChild(earth)

		var pegasus = document.createElement('img');
		pegasus.className = 'raceButton';
		pegasus.src = "/img/sym/pegasus.png";
		pegasus.setAttribute('value','pegasus')
		buttonDiv.appendChild(pegasus)

		var unicorn = document.createElement('img');
		unicorn.className = 'raceButton';
		unicorn.src = "/img/sym/unicorn.png";
		unicorn.setAttribute('value','unicorn')
		buttonDiv.appendChild(unicorn)

		var alicorn = document.createElement('img');
		alicorn.className = 'raceButton';
		alicorn.src = "/img/sym/alicorn.png";
		alicorn.setAttribute('value','alicorn')
		buttonDiv.appendChild(alicorn)

		function raceSelect(this: any, e: any)
		{
			earth.classList.remove('selected')
			pegasus.classList.remove('selected')
			unicorn.classList.remove('selected')
			alicorn.classList.remove('selected')
			this.classList.add('selected');
			selectedRace = this.getAttribute('value');

			if(selectedPony && selectedRace)
				acceptFn([selectedPony, selectedRace]);
		}

		earth.onclick = raceSelect;
		pegasus.onclick = raceSelect;
		unicorn.onclick = raceSelect;
		alicorn.onclick = raceSelect;

		div.appendChild(buttonDiv);

		return div;

	});
}

function raceGenderChangePopup(ponies: Card[])
{
	return createPopup(s.PopupTitleGenderChange, true, function(acceptFn)
	{
		var selectedPony = "";
		var selectedRace = "";
		var selectedGender = "";

		var div =document.createElement('div');
		div.classList.add('popupPage');

		var h1 = document.createElement('h1');
		h1.className = "no-top-margin";
		h1.innerHTML = s.PopupChoosePonyRaceAndGender;
		div.appendChild(h1)

		var buttonDiv = document.createElement('div')
		buttonDiv.className = "raceButtonContainer"


		var card1 = makeCardElement(ponies[0]);
		card1.setAttribute('value', ponies[0])

		let card2: CardElement | undefined;

		if(ponies.length == 2)
		{
			card2 = makeCardElement(ponies[1]);
			card2.setAttribute('value', ponies[1])
		}
		

		function ponySelect(this: any, e: any)
		{
			card1.classList.remove('selected')
			if(card2)
				card2.classList.remove('selected')
			
			this.classList.add('selected');
			selectedPony = this.getAttribute('value');

			if(selectedPony && selectedRace && selectedGender)
				acceptFn([selectedPony, selectedRace, selectedGender]);

		}

		card1.onclick = ponySelect;
		buttonDiv.appendChild(card1);

		if(card2)
		{
			card2.onclick = ponySelect;
			buttonDiv.appendChild(card2);
		}

		var rows = document.createElement('div');
		var topRow = document.createElement('div');
		var bottomRow = document.createElement('div');
		bottomRow.className = "raceButtonContainer";
		topRow.className = "raceButtonContainer";

		rows.appendChild(topRow);
		rows.appendChild(bottomRow);
		(rows as any).style = "display: inline-block";

		var earth = document.createElement('img');
		earth.className = 'raceButton';
		earth.setAttribute('value','earth')
		earth.src = "/img/sym/earth.png";
		topRow.appendChild(earth)

		var pegasus = document.createElement('img');
		pegasus.className = 'raceButton';
		pegasus.src = "/img/sym/pegasus.png";
		pegasus.setAttribute('value','pegasus')
		topRow.appendChild(pegasus)

		var unicorn = document.createElement('img');
		unicorn.className = 'raceButton';
		unicorn.src = "/img/sym/unicorn.png";
		unicorn.setAttribute('value','unicorn')
		topRow.appendChild(unicorn)

		var alicorn = document.createElement('img');
		alicorn.className = 'raceButton';
		alicorn.src = "/img/sym/alicorn.png";
		alicorn.setAttribute('value','alicorn')
		topRow.appendChild(alicorn)

		function raceSelect(this: any)
		{
			earth.classList.remove('selected')
			pegasus.classList.remove('selected')
			unicorn.classList.remove('selected')
			alicorn.classList.remove('selected')
			this.classList.add('selected');
			selectedRace = this.getAttribute('value');

			if(selectedPony && selectedRace && selectedGender)
				acceptFn([selectedPony, selectedRace, selectedGender]);
		}

		earth.onclick = raceSelect;
		pegasus.onclick = raceSelect;
		unicorn.onclick = raceSelect;
		alicorn.onclick = raceSelect;



		var male = document.createElement('img');
		male.className = 'raceButton';
		male.setAttribute('value','male')
		male.src = "/img/sym/male.png";
		bottomRow.appendChild(male)

		var female = document.createElement('img');
		female.className = 'raceButton';
		female.setAttribute('value','female')
		female.src = "/img/sym/female.png";
		bottomRow.appendChild(female);

		function genderSelect(this: any)
		{
			male.classList.remove('selected')
			female.classList.remove('selected')
			this.classList.add('selected');
			selectedGender = this.getAttribute('value');

			if(selectedPony && selectedRace && selectedGender)
				acceptFn([selectedPony, selectedRace, selectedGender]);
		}

		male.onclick = genderSelect;
		female.onclick = genderSelect;

		buttonDiv.appendChild(rows);
		div.appendChild(buttonDiv)

		return div;
	});
}


function exchangeCardsBetweenHandsAction(ponyCard: Card)
{
	win.socket.send("special;exchangeCardsBetweenHands");
}
