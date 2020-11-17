/**
	model: {
		board: {
			[boardLocation]: {	
				element: HtmlElement,
				card: CardNamepspaceString
			}
		}

		offsets: {
			// existence of the offset key signifies the card is offset
			[offsetKey]: string // the string is the id of the card element added to the DOM
		}
		
		players:[
			[id]:
		]

		playerName: string // the name of the player


		// turnstate is undefined in sandbox mode
		turnstate:{
			currentPlayer: string // the name of the player whose turn it is
		}
	}

*/

import cards from "/game/cards.js";
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
	isPonyOrStart
} from "/lib.js";

import {
	updatePonyDiscard,
	updateShipDiscard,
	updateGoalDiscard,
	updateWinnings,
	updatePlayerList,
	updateGoals,
	updateHand,
	initPeripherals
} from "/game/peripheralComponents.js";

import
{
	removeCardFromBoard,
	initBoard,
	updateBoard,
	offsetPonyCard,
	clearBoard
} from "/game/boardComponent.js"

import {
	makeCardElement
} from "/game/cardComponent.js"

import * as GameView from "/game/gameView.js" 

import {
	broadcastMove,
	broadcast,
	attachToSocket
} from "/game/network.js";

var model = {};
window.model = model;

var cardLocations = {};
window.cardLocations = cardLocations;

var offsetId = 0;

var hoverCard = "";
var hoverCardDiv;

var haveCardsLoaded = false;

export function loadView()
{
	if(window.location.pathname != "/game")
	{
		history.replaceState(null, "", "/game" + window.location.search)
	}

	haveCardsLoaded = false;

	window.cardLocations = cardLocations = {};

	document.body.innerHTML = "";
	document.head.innerHTML = GameView.HEAD;
	document.body.innerHTML = GameView.HTML;
	
	initBoard();
	initPeripherals();

	if(!sessionStorage["shownHelp"])
	{
		sessionStorage["shownHelp"] = "true";
		createHelpPopup();
	}

	attachToSocket(window.socket);

	window.updateGame = updateGame;
}



// Preloading all the cards makes everything feel instant.
function LoadCards()
{
	if(haveCardsLoaded)
		return;

	haveCardsLoaded = true;

	var preloadedImages = document.getElementById('preloadedImages');
	
	var re = new RegExp(model.cardDecks) 

	for(var key in cards)
	{
		if(re.exec(key))
		{
			var nodes = key.split(".");
			nodes.pop();
			var urlToImg = "/img/" + nodes.join("/") + "/" + cards[key].url;

			cards[key].fullUrl = urlToImg;
			cards[key].thumbnail = urlToImg.replace(".png",".thumb.jpg");

			var img = document.createElement('img');
			img.src = cards[key].thumbnail;
			preloadedImages.appendChild(img);
		}
	}
}


function getPosFromElement(element)
{
	var rect = element.getBoundingClientRect();
	return {top: rect.top +"px", left: rect.left + "px"};
}

function getPosFromId(id)
{
	var rect = document.getElementById(id).getBoundingClientRect();
	return {top: rect.top + "px", left: rect.left + "px"};
}

function animateCardMove(card, startPos, endPos, endLocationUpdateFn)
{
	var floatCard = makeCardElement(card);
	floatCard.style.margin = "0px";
	floatCard.style.position = "absolute";
	floatCard.classList.add('flying');
	for(var key in startPos)
		floatCard.style[key] = startPos[key];

	floatCard.style.zIndex = 4;
	floatCard.style.transition = "top .5s, left .5s";
	floatCard.style.transitionTimingFunction = "linear";

	document.body.appendChild(floatCard);

	setTimeout(function(){
		for(var key in endPos)
			floatCard.style[key] = endPos[key];

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
	console.log("update turnstate");

	var turnstate = model.turnstate
	if(!turnstate){
		document.body.classList.remove("nomove");
		return;
	}

	var div = document.getElementById('turnInfo');
	if(isItMyTurn())
	{
		document.body.classList.remove("nomove");

		div.innerHTML = "<div>It is currently your turn</div>";
		var button = document.createElement('button');
		button.innerHTML = "End My Turn";
		div.appendChild(button);

		button.onclick = function()
		{
			broadcast("endturn");
		}
	}
	else
	{
		document.body.classList.add("nomove");

		div.innerHTML = `<div>It is currently ${turnstate.currentPlayer}'s turn </div>`;

		var thisPlayer = model.players.filter(x => x.name == turnstate.currentPlayer)[0];

		if(thisPlayer.disconnected)
			div.innerHTML += "<div>Their turn will end if they do not reconnect in < 15s</div>";
	}

	updatePlayerList();
}

export function updateGame(newModel)
{
	if(newModel)
	{
		clearBoard();
		model = window.model = newModel;
	}

	
	console.log("update game");
	console.log(model);


	LoadCards();

	var flyingCards = document.getElementsByClassName('flying');
	while(flyingCards.length)
		flyingCards[0].parentNode.removeChild(flyingCards[0]);

	
	updateHand();
	updateGoals();
	updateBoard();

	updatePonyDiscard();
	updateShipDiscard();
	updateGoalDiscard();

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



export function isItMyTurn()
{
	return model.turnstate == undefined || model.turnstate.currentPlayer == model.playerName;
}


let dataTransferVar = "stupid";

export function setDataTransfer(val)
{
	dataTransferVar = val;
}

export function getDataTransfer()
{
	return dataTransferVar;
}


export function isValidMove(cardDragged, targetCard, endLocation)
{
	if(cardDragged == targetCard) return false;

	return (targetCard == "blank:ship" && isShip(cardDragged)
		|| (targetCard == "blank:pony" && isPonyOrStart(cardDragged))
		|| (isPonyOrStart(targetCard) && isPonyOrStart(cardDragged))
	);
}

export function moveCard(card, startLocation, endLocation, forceCardToMove)
{
	var startPos;
	const vh = window.innerHeight/100;

	if(startLocation != cardLocations[card])
	{
		var shouldCardBeOnBoard = !(isPlayerLoc(startLocation) || ["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1);

		if(shouldCardBeOnBoard && !cardLocations[card])
		{
			// In this case, the card should be on the board, but the client thinks it isn't.
			// We set the start position to limbo since there isn't a place on the board to move the card from.
			startLocation = "limbo";
		}
		else if(cardLocations[card])
		{
			if(forceCardToMove)
			{
				//console.log("Synchronization issue: card not at " + startLocation + "; card at " + cardLocations[card]);
				startLocation = cardLocations[card];

			}
			else
			{
				updateGame();
				return;
			}
		}
	}

	if(startLocation == endLocation)
	{
		//console.log("same location: " + startLocation);
		return;
	}

	if(startLocation == "winnings")
	{
		var i = model.winnings.indexOf(card);
		model.winnings.splice(i,1);
		updateWinnings();

		var enddiv = document.getElementById("winnings");
		rect = enddiv.getBoundingClientRect();
		startPos = {
			top: rect.bottom - 18*vh + "px",
			left: rect.right - 13*vh + "px"
		}
	}

	if(startLocation == "hand")
	{
		var i = model.hand.indexOf(card);

		startPos = getPosFromId("hand" + i);

		if(i == -1) { return };
		model.hand.splice(i,1);

		updateHand();
	}
	else if(isDiscardLoc(startLocation))
	{
		
		var [pile,slot] = startLocation.split(",");
		var i = model[pile].indexOf(card);
		model[pile].splice(i,1);



		var newTopCard = model[pile][model[pile].length-1];
		cardLocations[newTopCard] = pile + ",top";

		startPos = getPosFromId(pile);

		var typ = startLocation.substring(0,4)
		if(typ == "pony") updatePonyDiscard();
		if(typ == "ship") updateShipDiscard();
	}
	else if(["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1)
	{
		startPos = getPosFromId(startLocation)
	}
	else if(isPlayerLoc(startLocation))
	{
		startPos = {top: "-18vh", left: "50vh"}
	}
	else if(isOffsetLoc(startLocation))
	{
		var [_,x,y] = startLocation.split(",")
		var offsetKey = [card,x,y].join(",");
		var element = model.offsets[offsetKey];
		startPos = getPosFromElement(element);
		element.parentNode.removeChild(element);

		delete model.offsets[offsetKey];
	}
	else if(isBoardLoc(startLocation))
	{
		startPos = getPosFromElement(model.board[startLocation].element);
		removeCardFromBoard(startLocation);
		updateBoard();
	}
	else if(isGoalLoc(startLocation))
	{
		var [_,i] = startLocation.split(',')
		i = Number(i);

		startPos = getPosFromElement(document.getElementById('currentGoals').getElementsByClassName('card')[i]);

		model.currentGoals[i] = "blank:goal";

		updateGoals();
	}

	/// removing

	var updateFun = function(){};
	var endPos;
	

	if(endLocation == "hand")
	{
		model.hand.push(card);

		var enddiv = document.getElementById('hand-pony');
		var rect = enddiv.getBoundingClientRect();

		var cardCount = isPony(card) ? model.hand.filter(x => isPony(x)).length : model.hand.length;

		var offset = ((cardCount-1) * (13 + 1) + 1) * vh;
		
		endPos = {
			top: (rect.top + vh) + "px",
			left: (rect.left + offset) + "px"
		}

		let x = model.hand.length - 1;

		updateFun = () => updateHand(x);
	}
	else if(isDiscardLoc(endLocation))
	{
		var [pile,slot] = endLocation.split(",");

		if (slot=="top")
		{
			if(model[pile].length)
				cardLocations[model[pile][model[pile].length-1]] = pile + ",stack";

			model[pile].push(card);
		}
		else
		{
			model[pile].splice(Math.max(0,model[pile].length-2), 0, card);
		}

		var updateFun2 = {
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		}[endLocation.substring(0,4)];

		updateFun = () => updateFun2(card);

		endPos = getPosFromId(pile);
	}
	else if(endLocation == "winnings")
	{

		model.winnings.push(card);
		updateFun = updateWinnings;

		var enddiv = document.getElementById("winnings");
		rect = enddiv.getBoundingClientRect();
		endPos = {
			top: rect.bottom - 18*vh + "px",
			left: rect.right - 13*vh + "px"
		}
	}
	else if(isPlayerLoc(endLocation))
	{
		endPos = {top: "-18vh", left: "50vh"};
	}
	else if(isBoardLoc(endLocation))
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

		model.board[endLocation] = {
			card: card
		}

		updateFun = updateBoard;	
	}
	else if(isGoalLoc(endLocation))
	{
		let [_,i] = endLocation.split(',')
		i = Number(i);

		endPos = getPosFromElement(document.getElementById('currentGoals').getElementsByClassName('card')[i]);

		model.currentGoals[i] = card;
		updateFun = () => updateGoals(i)
	}
	else if (isOffsetLoc(endLocation))
	{
		offsetPonyCard(endLocation, card);
	}

	cardLocations[card] = endLocation;
	
	if(isPlayerLoc(endLocation))
		delete cardLocations[card];

	// run animation (if applicable)
	

	if(startLocation != "limbo" 
		&& !(isDiscardLoc(startLocation) && isDiscardLoc(endLocation))
		&& (isDiscardLoc(endLocation)
			|| ["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1
			|| endLocation == "winnings"
			|| isPlayerLoc(endLocation))
	)
	{
		animateCardMove(card, startPos, endPos, updateFun);
	}
	else
	{
		updateFun();
	}
}


window.moveCard = moveCard;
