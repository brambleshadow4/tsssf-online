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
	initPeripherals,
	openCardSelect
} from "/game/peripheralComponents.js";

import
{
	removeCardFromBoard,
	initBoard,
	updateBoard,
	offsetPonyCard,
	clearBoard,
	getNeighborKeys
} from "/game/boardComponent.js"

import {
	makeCardElement,
	setDisguise,
	setCardKeywords,
	addTempSymbol
} from "/game/cardComponent.js"

import * as GameView from "/game/gameView.js" 

import {
	broadcastMove,
	broadcast,
	attachToSocket,
	broadcastEffects
} from "/game/network.js";

import {createPopup} from "/game/popupComponent.js";

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



var allKeywords = [];

// Preloading all the cards makes everything feel instant.
function LoadCards()
{
	if(haveCardsLoaded)
		return;

	var keywordSet = new Set();

	haveCardsLoaded = true;

	var preloadedImages = document.getElementById('preloadedImages');
	
	var re = new RegExp(model.cardDecks) 

	for(var key in cards)
	{
		if(cards[key].keywords)
		{
			for(var keyword of cards[key].keywords)
			{
				keywordSet.add(keyword);
			}
		}

		if(re.exec(key))
		{
			var nodes = key.split(".");
			nodes.pop();
			var urlToImg = "/img/" + nodes.join("/") + "/" + cards[key].url;

			cards[key].keywords = new Set(cards[key].keywords);

			cards[key].fullUrl = urlToImg;
			cards[key].thumbnail = urlToImg.replace(".png",".thumb.jpg");

			var img = document.createElement('img');
			img.src = cards[key].thumbnail;
			preloadedImages.appendChild(img);
		}
	}

	allKeywords = [...keywordSet.keys()].sort();
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


var turnStateChangelings = {};

export function updateTurnstate()
{
	var turnstate = model.turnstate
	if(!turnstate){
		document.body.classList.remove("nomove");
		return;
	}

	var decoration = document.getElementsByClassName('decoration');
	var i = 0;
	while(i < decoration.length)
	{
		if(decoration[i].classList.contains('changeling'))
			i++;
		else
			decoration[i].parentNode.removeChild(decoration[i]);
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

	// We don't want to update changelines always because that will mess up their animation
	for(var card in turnStateChangelings)
	{
		let newDisguise = model.turnstate.overrides[card] && model.turnstate.overrides[card].disguise;

		if(newDisguise != turnStateChangelings[card])
		{	
			var element = model.board[cardLocations[card]].element;
			var div = element.getElementsByClassName('changeling')[0];
			if(div)
				div.parentNode.removeChild(div);

			delete turnStateChangelings[card]	
		}		
	}


	for(var card in model.turnstate.overrides)
	{	
		if(isBoardLoc(cardLocations[card]))
		{
			var element = model.board[cardLocations[card]].element;

			var decs = model.turnstate.overrides[card];

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

			if(decs.keywords)
			{
				console.log("we have keywords")
				setCardKeywords(element, decs.keywords)
			}
		}	
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

function getCardAtLoc(loc)
{
	if(isBoardLoc(loc))
	{
		return model.board[loc].card;
	}
	if(isGoalLoc(loc))
	{
		return model.currentGoals[Number(loc.split(",")[1])];
	}
}


export async function moveCard(card, startLocation, endLocation, forceCardToMove)
{
	var startPos;
	const vh = window.innerHeight/100;

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
			cardLocations[card] = undefined;
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
		if(typ == "goal") updateGoalDiscard();
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
		&& !(isDiscardLoc(startLocation) && isDiscardLoc(endLocation)) // not going from discard to discard
		&& (isDiscardLoc(endLocation)
			|| ["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1
			|| endLocation == "winnings"
			|| isGoalLoc(endLocation)
			|| isPlayerLoc(endLocation))
	)
	{
		animateCardMove(card, startPos, endPos, updateFun);
	}
	else
	{
		updateFun();
	}

	if(!forceCardToMove)
	{
		await doPlayEvent({card, startLocation, endLocation});
	}

	updateTurnstate();

}

var playEventHandlers = [];

function addPlayEvent(fn)
{
	playEventHandlers.push(fn);
}

async function doPlayEvent(e)
{
	for(var fn of playEventHandlers)
	{
		var x = await fn(e);
	}
}

window.moveCard = moveCard;

addPlayEvent(async function(e){

	var cardInfo = cards[e.card];
	if(cardInfo.keywords.has("Changeling") && isBoardLoc(e.endLocation))
	{

		if(model.turnstate)
		{
			var cardNames = Object.keys(cards);
			var disguises = cardNames.filter(x => cards[x].race == cardInfo.race && !cards[x].doublePony && !cards[x].keywords.has("Changeling"));

			var newCard = await openCardSelect("Choose a pony to disguise as", disguises);

			if(!newCard)
				return

			
			// reset overrides when changeling changes type.
			model.turnstate.overrides[e.card] = {disguise: newCard};
			broadcastEffects();
		}
	}

	return
});

addPlayEvent(async function(e){

	var cardInfo = cards[e.card];
	if(isShip(e.card) && isBoardLoc(e.endLocation))
	{
		if(model.turnstate)
		{
			if(!model.turnstate.openShips)
				model.turnstate.openShips = {};

			if(isShipClosed(e.card))
				await executeShipAction(e.card);
			else
				model.turnstate.openShips[e.card] = true;
		}
	}
});

function isShipClosed(shipCard)
{
	return getShippedPonies(shipCard).length == 2;
}

function getShippedPonies(shipCard)
{
	var loc = cardLocations[shipCard];

	var neighbors = getNeighborKeys(loc);

	var shipClosed = true;
	var ponies = [];
	for(var n of neighbors)
	{
		if(!isBlank(model.board[n].card))
		{
			ponies.push(model.board[n].card)
		}
	}

	return ponies;
}


function getCardProp(card, prop)
{
	if(model.turnstate && model.turnstate.overrides && model.turnstate.overrides[card])
	{
		if (model.turnstate.overrides[card][prop])
		{
			return model.turnstate.overrides[card][prop];
		}

		if(model.turnstate.overrides[card].disguise)
		{
			card = model.turnstate.overrides[card].disguise;
		}
	} 
	
	return cards[card][prop];
}

async function executeShipAction(shipCard)
{

	var ponies = getShippedPonies(shipCard);
	var shipInfo = cards[shipCard]

	if(shipCard == "Core.Ship.YerAPrincessHarry")
	{
		var ponyCard = await openCardSelect("Choose a new princess", ponies.filter(x => !cards[x].keywords.has("Changeling")), true);

		if(ponyCard)
		{
			if(!model.turnstate.overrides[ponyCard])
				model.turnstate.overrides[ponyCard] = {};

			model.turnstate.overrides[ponyCard].race = "alicorn";
			model.turnstate.overrides[ponyCard].gender = "female";

			if(model.turnstate.overrides[ponyCard].keywords)
			{
				model.turnstate.overrides[ponyCard].keywords = model.turnstate.overrides[ponyCard].keywords.filter(x => x != "Princess").concat("Princess");
			}
			else
			{
				model.turnstate.overrides[ponyCard].keywords = ["Princess"];
			}
		}
	}


	if (shipInfo.action == "genderChange")
	{
		var ponyCard = await openCardSelect("Choose a pony to change gender", ponies, true);

		if(!ponyCard) return;

		if(model.turnstate)
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
				if(!model.turnstate.overrides[ponyCard])
					model.turnstate.overrides[ponyCard] = {};

				model.turnstate.overrides[ponyCard].gender = newGender;
				broadcastEffects();
			}
		}
	}

	if (shipInfo.action == "timelineChange")
	{
		var ponyCard = await openCardSelect("Choose a pony to gain the <br> time traveller symbol", ponies, true);

		if(!ponyCard) return;

		if(model.turnstate)
		{
			if(!model.turnstate.overrides[ponyCard])
				model.turnstate.overrides[ponyCard] = {};

			model.turnstate.overrides[ponyCard].altTimeline = true;
			broadcastEffects();
		}
	}

	if (shipInfo.action == "raceChange")
	{
		ponies = ponies.filter(x => !cards[x].keywords.has("Changeling"));

		if(ponies.length == 0)
			return;

		var pair = await raceChangePopup(ponies);

		if(!pair) return;

		var [ponyCard, newRace] = pair;

		if(model.turnstate)
		{

			if(!model.turnstate.overrides[ponyCard])
				model.turnstate.overrides[ponyCard] = {};

			model.turnstate.overrides[ponyCard].race = newRace;
			broadcastEffects();
		}
	}

	if (shipInfo.action == "keywordChange")
	{

		var output = await createPopup([{"render":function(accept)
		{

			var element = document.createElement('div');
			element.className = "popupPage"

			var selectedPony;
			var h1 = document.createElement('h1');
			h1.innerHTML = "Pick a keyword";
			element.appendChild(h1);

			var card1 = makeCardElement(ponies[0]);
			card1.setAttribute('value', ponies[0])

	
			var card2 = makeCardElement(ponies[1]);
			card2.setAttribute('value', ponies[1])
			

			function ponySelect()
			{
				card1.classList.remove('selected')
				card2.classList.remove('selected')
				
				this.classList.add('selected');
				selectedPony = this.getAttribute('value');

			}

			card1.onclick = ponySelect;
			element.appendChild(card1);


			card2.onclick = ponySelect;
			element.appendChild(card2);
			
			var row = document.createElement('div')
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

				row.appendChild(button);


				if(i%5 == 4)
				{
					element.appendChild(row);
					row = document.createElement('div');
				}
			}

			element.appendChild(row);

			return element;


		}}], true);

		if(output && model.turnstate)
		{
			var [card, keyword] = output;

			if(!model.turnstate.overrides[card])
			{
				model.turnstate.overrides[card] = {
					keywords: [keyword]
				};
			}
			else if(!model.turnstate.overrides[card].keywords)
			{
				model.turnstate.overrides[card].keywords = [keyword]
			}
			else
			{
				model.turnstate.overrides[card].keywords = model.turnstate.overrides[card].keywords.filter(x => x != keyword).concat([keyword])
			}	

			broadcastEffects();
		}
	}

	
}

addPlayEvent(async function(e){

	if(isPonyOrStart(e.card) && isBoardLoc(e.endLocation))
	{
		if(model.turnstate)
		{
			for(var shipCard in model.turnstate.openShips)
			{
				if(isShipClosed(shipCard))
				{
					delete model.turnstate.openShips[shipCard];
					await executeShipAction(shipCard);
				}
			}
		}
	}
});


function raceChangePopup(ponies)
{
	return createPopup([{render: function(acceptFn)
	{
		var selectedPony;
		var selectedRace;

		var div =document.createElement('div');
		div.classList.add('popupPage');

		var h1 = document.createElement('h1');
		h1.innerHTML = "Choose a pony and select their new race";
		div.appendChild(h1)

		var buttonDiv = document.createElement('div')
		buttonDiv.className = "raceButtonContainer"


		var card1 = makeCardElement(ponies[0]);
		card1.setAttribute('value', ponies[0])

		if(ponies.length == 2)
		{
			var card2 = makeCardElement(ponies[1]);
			card2.setAttribute('value', ponies[1])
		}
		

		function ponySelect()
		{
			card1.classList.remove('selected')
			if(card2)
				card2.classList.remove('selected')
			
			this.classList.add('selected');
			selectedPony = this.getAttribute('value');

			if(selectedPony && selectedRace)
				acceptFn([selectedPony, selectedRace]);

			console.log(selectedPony + " " + selectedRace);

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

		function raceSelect()
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

	}}],true)
}
