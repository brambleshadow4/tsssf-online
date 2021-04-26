// This includes the draw piles, discard piles, swap shuffle buttons,
// goals, winnings, hand, help buttons, etc.

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
	isAnon,
	isPonyOrStart,
	GameModel,
	Card, Location
} from "../../server/lib.js";

import * as cm from "../../server/cardManager.js";

import {broadcastMove,
	broadcast,
	requestDrawPony,
	requestDrawShip,
	requestSwapShuffle,
	requestDrawGoal,
	attachToSocket
} from "./network.js";

import {
	makeCardElement,
	updateCardElement,
	isDeleteClick,
	endMoveShared
} from "./cardComponent.js"

import {
	isItMyTurn,
	getDataTransfer,
	isValidMove,
	moveCard
} from "./game.js"

import {
	createPopup,
	createTabbedPopup,
	htmlTab
} from "./popupComponent.js"



let win = window as unknown as {
	model: GameModel,
	openSettings: () => void;
	cardLocations: {[key:string]: Location};
	createHelpPopup: () => void;
}

var SCROLL_BAR_WIDTH = getScrollBarWidth();


export function initPeripherals()
{
	document.getElementById("ponyDrawPile")!.onclick = requestDrawPony;
	document.getElementById("shipDrawPile")!.onclick = requestDrawShip;
	document.getElementById("goalDrawPile")!.onclick = preRequestDrawGoal;

	var shuffles: ("pony"|"ship"|"goal")[] = ["pony","ship","goal"];

	for(let key of shuffles)
	{
		let id = key+"Shuffle";

		document.getElementById(id)!.onclick = () => requestSwapShuffle(key)

		id = key + "DrawPile"
		document.getElementById(id)!.ontouchstart = function(e)
		{


			var stillHeldDown = true;

			this.ontouchend = function(e)
			{
				stillHeldDown = false;
			}

			setTimeout(function(){

				if(stillHeldDown)
				{
					requestSwapShuffle(key);
				}
			}, 1000);
		}

		document.getElementById(id)!.oncontextmenu = (e) => { e.preventDefault();}

	}

	var hand = document.getElementById('hand')!
	hand.ondragover = function(e)
	{
		var data = getDataTransfer().split(";")
		var draggedCard = data[0];
		var location = data[1];

		if(location != "hand" && (isPony(draggedCard) || isShip(draggedCard)))
		{
			e.preventDefault();
		}
	}


	var inDragZone = false;
	hand.ondragenter = function(e)
	{
		var data = getDataTransfer().split(";")
		var draggedCard = data[0];
		var location = data[1];

		if(location != "hand" && (isPony(draggedCard) || isShip(draggedCard)))
		{
			if(!document.getElementById('handDropzone'))
			{
				var div = document.createElement('div');
				div.id="handDropzone";
				div.style.position = "absolute";
				div.style.top = "0px"
				div.style.bottom = "0px";
				div.style.left = "0px";
				div.style.right = "0px";
				div.style.zIndex = "3";
				div.style.backgroundColor = "rgba(0,128,0,.5)";

				div.ondragleave = function(e)
				{
					var div = document.getElementById('handDropzone');
					if(div && div.parentNode)
						div.parentNode.removeChild(div);
				}

				div.ondrop = function(e)
				{
					e.preventDefault();
					if(div && div.parentNode)
						div.parentNode.removeChild(div);
					var [card, startLoc] = getDataTransfer().split(";")

					moveCard(card, startLoc, "hand");
					broadcastMove(card, startLoc, "hand");
				}

				hand.appendChild(div);
			}	
		}
	}

	hand.ontouchstart = function(e)
	{
		var data = getDataTransfer().split(";")
		var card = data[0];
		var location = data[1];

		if(location != "hand" && (isPony(card) || isShip(card)))
		{
			moveCard(card, location, "hand");
			broadcastMove(card, location, "hand");
			endMoveShared();
		}
	}

}

function preRequestDrawGoal()
{
	let model = win.model;
	var i = 0;
	while(i < model.currentGoals.length)
	{
		if(isBlank(model.currentGoals[i].card))
			break;
		i++;
	}

	if(i >= 3) return;

	requestDrawGoal()
}


export function updatePonyDiscard(cardOnTop?: Card)
{
	let model = win.model as GameModel & {ponyDrawPileLength: number}
	if(model.ponyDrawPileLength == 0)
		document.getElementById("ponyDrawPile")!.classList.add('blank');
	else
		document.getElementById("ponyDrawPile")!.classList.remove('blank');


	var l = model.ponyDiscardPile.length;
	var topCard = cardOnTop || (l ? model.ponyDiscardPile[l-1] : "blank:pony");

	updateCardElement(
		document.getElementById("ponyDiscardPile")!,
		topCard,
		"ponyDiscardPile,top",
		l > 0, false
	)

	var element = document.getElementById("ponyDiscardPile")!;
	element.addEventListener('click', async function(){
		
		if(model.ponyDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ponies", "", model.ponyDiscardPile);

			if(card && isItMyTurn())
			{
				var i = model.ponyDiscardPile.indexOf(card);
				var area = (i+1 == model.ponyDiscardPile.length ? "top" : "stack");
				var loc = "ponyDiscardPile," + area
				moveCard(card, loc, "hand");
				broadcastMove(card, loc, "hand");
			}
		}
	});
}

export function updateShipDiscard(tempCard?: Card)
{
	let model = win.model as GameModel & {ponyDrawPileLength: number, shipDrawPileLength: number};

	if(model.shipDrawPileLength == 0)
		document.getElementById("shipDrawPile")!.classList.add('blank');
	else
		document.getElementById("shipDrawPile")!.classList.remove('blank');


	var l = model.shipDiscardPile.length;
	var topCard = tempCard || (l ? model.shipDiscardPile[l-1] : "blank:ship");

	updateCardElement(
		document.getElementById("shipDiscardPile")!,
		topCard,
		"shipDiscardPile,top",
		l > 0, false
	)

	var element = document.getElementById("shipDiscardPile")!;
	element.addEventListener('click', async function(){
		
		if(model.shipDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ships", "",  model.shipDiscardPile);

			if(card && isItMyTurn())
			{
				var i = model.shipDiscardPile.indexOf(card);
				var area = (i+1 == model.shipDiscardPile.length ? "top" : "stack");
				var loc = "shipDiscardPile," + area
				moveCard(card, loc, "hand");
				broadcastMove(card, loc, "hand");
			}
		}

	});
}

export function updateGoalDiscard(tempCard?: Card)
{
	var element = document.getElementById("goalDrawPile")!;
	let model = win.model as GameModel & {goalDrawPileLength: number, shipDrawPileLength: number};

	if(model.goalDrawPileLength == 0)
		element.classList.add('blank');
	else
		element.classList.remove('blank');

	var l = model.goalDiscardPile.length;
	var topCard = tempCard || (l ? model.goalDiscardPile[l-1] : "blank:goal");

	updateCardElement(
		document.getElementById("goalDiscardPile")!,
		topCard,
		"goalDiscardPile,top",
		false, false
	);


	element = document.getElementById("goalDiscardPile")!
	element.onclick = async function()
	{
		if(model.goalDiscardPile.length)
		{
			var card = await openCardSelect("Discarded goals", "", model.goalDiscardPile);
			var openGoal = model.currentGoals.map(x => x.card).indexOf("blank:goal");


			if(card && isItMyTurn() && openGoal > -1)
			{
				var i = model.goalDiscardPile.indexOf(card);
				var area = (i+1 == model.goalDiscardPile.length ? "top" : "stack");
				var loc = "goalDiscardPile," + area;
				moveCard(card, loc, "goal," + openGoal);
				broadcastMove(card, loc, "goal," + openGoal);
			}
		}
	}
}

var lastArrowClick = 0;

export function updateWinnings()
{
	var element = document.getElementById('winnings')!;
	element.innerHTML = "";

	let arrow = document.createElement("img");
	arrow.src = "/img/return.svg";
	arrow.className = 'returnArrow';

	let model = win.model as GameModel & {winnings: any[]};

	if(model.winnings.length)
		element.appendChild(arrow);

	var cardOffset = 2;
	var offset = model.winnings.length * cardOffset;

	for(var i=0; i < model.winnings.length; i++)
	{
		win.cardLocations[model.winnings[i].card] = "winnings";

		offset -= cardOffset;
		var card = makeCardElement(model.winnings[i].card, "winnings");
		card.style.position = "absolute";
		card.style.bottom = offset + "vh";
		card.style.right = "0vh"
		element.appendChild(card)
	}

	var points = model.winnings.reduce((a,b) => a + b.value, 0);

	if(points > 0)
	{
		var scoreElement = document.createElement('span');
		scoreElement.className = 'score';

		scoreElement.innerHTML =  points + "pts";
		element.appendChild(scoreElement);
	}
	

	

	element.ontouchstart = function(e)
	{
		if(!isItMyTurn())
			return;

		e.stopPropagation();

		if(element.classList.contains('selected'))
		{
			endMoveShared();
		}
		else
		{
			endMoveShared();
			element.classList.add('selected');
		}
	}

	function clickEvent(e: MouseEvent | TouchEvent)
	{
		var newTime = new Date().getTime();
		if(!isItMyTurn() || (newTime - lastArrowClick < 250))
			return;

		lastArrowClick = newTime;

		var goalSlot = model.currentGoals.map(x => x.card).indexOf("blank:goal");
		if(goalSlot > -1)
		{
			if(model.winnings.length == 1)
			{
				arrow.parentNode!.removeChild(arrow)
			}


			broadcastMove(model.winnings[model.winnings.length-1].card, "winnings","goal," + goalSlot)
			moveCard(model.winnings[model.winnings.length-1].card, "winnings","goal," + goalSlot);
		}
	}

	arrow.onclick = clickEvent;
	arrow.ontouchstart = clickEvent;

	
}

export function updatePlayerList()
{
	var playerList = document.getElementById('playerList')!;
	playerList.innerHTML = "";
	let model = win.model;
	for(let player of model.players as any)
	{
		var div = document.createElement('div');
		div.className = "player";

		var className = player.disconnected ? "disconnected" : "";


		if(model.turnstate && model.turnstate.currentPlayer == player.name)
		{
			div.classList.add('currentPlayer');
		}

		type Winning = {value: number, card: Card};

		var pts = player.winnings.reduce((a: number, b: Winning) => a + b.value, 0);

		div.innerHTML = `
			<span class="${className}">${player.name}</span>
			<span class='ponyCount'>${player.ponies}</span>
			<span class='shipCount'>${player.ships}</span>
			<span class='goalCount'>${player.winnings.length}</span>
			${pts}<span class='pointCount'>&nbsp;</span>
		`;

		div.onclick = function()
		{
			openCardSelect("Goals", player.name + "'s won goals", player.winnings.map((x: Winning) => x.card));
		}

		playerList.appendChild(div);
	}
}


export function updateGoals(goalNo?: number, isSoftUpdate?: boolean)
{

	var goalDiv = document.getElementById('currentGoals') as HTMLElement;

	var start = 0;
	var end = 3;

	if(goalNo != undefined)
	{
		start = goalNo;
		end = goalNo + 1;
	}

	let model = win.model;

	for(let i=start; i<end; i++)
	{

		var oldElement = goalDiv.getElementsByClassName('card')[i];

		if(isSoftUpdate && oldElement.classList.contains("blank"))
		{

			continue;
		}


		let element = updateCardElement(
			goalDiv.getElementsByClassName('card')[i] as HTMLElement,
			model.currentGoals[i].card, "goal," + i, false, false);

		win.cardLocations[model.currentGoals[i].card] = "goal," + i;

		if(model.currentGoals[i].achieved)
		{
			element.classList.add('achieved');
		}
		else
		{
			element.classList.remove('achieved');
		}
	}
}

export function updateHand(cardIndex?: number)
{
	var handDiv = document.getElementById('hand')!;	

	var ponyHand = document.getElementById('hand-pony')!;
	var shipHand = document.getElementById('hand-ship')!;
	let model = win.model as GameModel & {hand: Card[]};

	if(cardIndex == undefined)
	{
		var oldCards = handDiv.getElementsByClassName('card');

		while(oldCards.length)
		{
			oldCards[0].parentNode!.removeChild(oldCards[0]);
		}

		for(var i=0; i<model.hand.length; i++)
		{
			var cardEl = makeCardElement(model.hand[i], "hand", true);
			cardEl.id = "hand" + i;

			win.cardLocations[model.hand[i]] = "hand";

			if(isPony(model.hand[i]))
			{
				ponyHand.appendChild(cardEl);
			}
			else
			{
				shipHand.appendChild(cardEl)
			}

			//addTrashHandlers(model.hand[i], cardEl, "hand");
		}
	}
	else
	{
		var cardEl = makeCardElement(model.hand[cardIndex], "hand", true);
		cardEl.id = "hand" + cardIndex;

		if(isPony(model.hand[cardIndex]))
		{
			ponyHand.appendChild(cardEl);
		}
		else
		{
			shipHand.appendChild(cardEl)
		}
	}

	updateCardRowHeight();
}

window.addEventListener('resize', updateCardRowHeight);


function getScrollBarWidth () {
	var inner = document.createElement('p');
	inner.style.width = "100%";
	inner.style.height = "200px";

	var outer = document.createElement('div');
	outer.style.position = "absolute";
	outer.style.top = "0px";
	outer.style.left = "0px";
	outer.style.visibility = "hidden";
	outer.style.width = "200px";
	outer.style.height = "150px";
	outer.style.overflow = "hidden";
	outer.appendChild (inner);

	document.body.appendChild (outer);
	var w1 = inner.offsetWidth;
	outer.style.overflow = 'scroll';
	var w2 = inner.offsetWidth;
	if (w1 == w2) w2 = outer.clientWidth;

	document.body.removeChild (outer);

	return (w1 - w2);
};


function updateCardRowHeight()
{
	var cardRow = document.getElementById("cardRow");

	if(!cardRow) return;
	var playingArea = document.getElementById('playingArea')!;
	
	if(cardRow.scrollWidth > window.innerWidth)
	{
		cardRow.style.height = `calc(20% + ${SCROLL_BAR_WIDTH}px)`;
		playingArea.style.height = `calc(80% - ${SCROLL_BAR_WIDTH}px)`;
	}
	else
	{
		cardRow.style.height = "";
		playingArea.style.height = "";
	}
}


export function openCardSelect(title: string, heading: string, cards: Card[], miniMode?: boolean)
{
	return createPopup(title, !!miniMode, function(closePopupWithVal: any){

		var div = document.createElement('div');
		div.classList.add("popupPage")

		if(heading)
		{
			var h1 = document.createElement('h1');
			h1.innerHTML = heading;
			div.appendChild(h1);
		}
		

		let cards2 = cards.slice();

		cards2.sort();

		for(let card of cards2)
		{
			var cardElement = makeCardElement(card);
			div.appendChild(cardElement);

			cardElement.onclick = function()
			{
				closePopupWithVal(card);
			}
		}

		return div;
	})
}


win.openSettings = function()
{
	return createPopup("Host Settings", false, function(closeFn: (value?: any) => any)
	{
		var div = document.createElement('div')
		div.className = "popupPage";

		div.innerHTML = `

		<h1>Host Settings</h1>

		<div class='checkboxContainer'><input type='checkbox' id='keepLobbyOpen'/><label for='keepLobbyOpen'>Let players join mid-game</label></div>
		<div><button id='newGameButton'>New Game</button><span class='buttonDescription'>Ends the current game and returns everypony to the lobby.</span></div>

		<h2>Kick players</h2>
		<p>Kicking a player removes them from the lobby and releases any cards they have to the discard</p>

		<div id='kickButtons'></div>
		`


		for(let player of win.model.players)
		{
			var button = document.createElement('button');
			button.innerHTML = "Kick " + player.name;
			button.onclick = function()
			{
				broadcast("kick;" + player.name);
				closeFn();
			}

			var innerDiv = document.createElement('div')
			innerDiv.appendChild(button)
			div.querySelector("#kickButtons")!.appendChild(innerDiv);
		}

		let newGameButton = div.querySelector("#newGameButton") as HTMLButtonElement;

		newGameButton.onclick = function()
		{
			closeFn();
			broadcast("startlobby;");
		}

		let keepLobbyOpen = div.querySelector("#keepLobbyOpen") as HTMLInputElement;

		if(win.model.keepLobbyOpen)
		{
			keepLobbyOpen.checked = true;
		}

		keepLobbyOpen.onclick = function()
		{
			broadcast("keepLobbyOpen;" + (keepLobbyOpen.checked ? 1 : 0));
		}		

		return div;
	});
}

function referencePageRender()
{

	var popupPage = document.createElement('div')
	popupPage.className = "popupPage";

	var ponyReference = document.createElement('div');
	var shipReference = document.createElement('div');
	var goalReference = document.createElement('div');

	var keys = Object.keys(cm.inPlay());

	keys.sort();
	for(let key of keys)
	{

		let cardDiv = makeCardElement(key)
		
		if(isPony(key))
		{
			ponyReference.appendChild(cardDiv)
		}
		if(isShip(key))
		{
			shipReference.appendChild(cardDiv)
		}
		if(isGoal(key))
		{
			goalReference.appendChild(cardDiv)
		}

	}

	var header = document.createElement('h1');
	header.innerHTML = "Pony Cards";
	popupPage.appendChild(header);
	popupPage.appendChild(ponyReference);

	header = document.createElement('h1');
	header.innerHTML = "Ship Cards";
	popupPage.appendChild(header);
	popupPage.appendChild(shipReference);

	header = document.createElement('h1');
	header.innerHTML = "Goal Cards";
	popupPage.appendChild(header);
	popupPage.appendChild(goalReference);

	return popupPage;
}


function createHelpPopup()
{
	createTabbedPopup([
		{
			name: "Quick Start",
			render: quickStartPage
		},
		{
			name: "Quick Rules",
			render: htmlTab(`
			<div class='popupPage'>
				<h1>Objective</h1>

				While playing this game you will construct a labyrinth flowchart of relationships between Twilight and everypony else, competing to bend those relationships in the shape of Twilight's goals for the fanfic.

				For each goal, you'll earn a number of points determined by the difficulty of that Goal card.

				<h2>Winning Score</h2>
				<table>
					<tr>
						<td>2-3 Players</td>
						<td>11 points</td>
					</tr>
					<tr>
						<td>4 players</td>
						<td>9 points</td>
					</tr>
					<tr>
						<td>5+ players</td>
						<td>7 points</td>
					</tr>
				</table>

				<h1>Setup</h1>

				<ul>
					<li>Place the Start Card ("Fanfic Author Twilight") in the center of the table</li>
					<li>Separate and shuffle the three decks; Ships, Goals, and Ponies</li>
					<li>Turn 3 Goal cards face-up on the table.</li>
					<li>Deal to each player a hand of 4 pony cards & 3 Ship cards. You can look, but don't show!</li>
				</ul>

				<h1>On Your Turn</h1>

				<p>Play begins with the player to the left of the dealer. Each turn proceeds as follows:</p>

				<ol>
					<li>Play at least one card from your hand</li>
					<li>At the end of your turn, draw up to or discard down to your hand limit (usually 7) in any combination of Ships and Ponies. You must finish drawing before looking at them. If you won any Goals, turn over new ones</li>
				</ol>

				<h1>Shipping Ponies, Powers, etc.</h1>
				<p>To ship Ponies, slide a Ship card halfway beneath a Pony card already on the grid and place a Pony card on top of the exposed half. Leave enough space between the Ponies to show there's a ship card beneath. A Pony can have 4 Ships attached to it: above, below, left, and right</p>

				<p>A Pony's power activates immediately after it is added to the grid from the player's hand. The exception is any card that says "while this card is still in your hand". A Pony's power can affect itself unless otherwise stated on the card. 

				</p><p>Two Pony cards that are adjacent but not connected by a Ship card are not considered shipped. Sliding a Ship card between them is a valid play.</p>

				<p>If any card is no longer connected to the grid it must be discarded. Ship cards without two Ponies attached must be discarded</p>

				<h1>Completing a Goal</h1>

				<p>If a Goal card's conditions are already met when it's drawn, then that goal card goes to the bottom of the Goal deck and a new one is drawn to replace it</p>

				<p>Otherwise, the instant a Goal's conditions are met, the Goal is achieved. This can be before a Pony's power activates or after, but not during. When a Goal is achieved, the current player acquires the Goal by putting it on the table in front of them, face up</p>

				<p>A Pony card counts toward achieving a Goal if the card's name, symbols, and/or keywords match that requirements for the Goal.</p>

				<h1>The Start Card</h1>

				<p>The Start card cannot be swapped, removed, moved, or otherwise budged from its starting position. Any cards that specify the Start card in their text are exceptions to this rule, like Derpy Hooves.</p>

				<h1>If a Deck Runs Out:</h1>

				<p>Simply shuffle the respective discard pile into the deck. If there is no discard pile to shuffle however...</p>

				<h1>Tearing Up Twilight's Notes</h1>

				<p>If you need to draw a card but there is neither deck nor discard pile, Twilight Sparkle has run out of ideas. She becomes frustrated with her notes, and in a fit of anger, destroys some of her work. </p>

				<ol>
					<li>The current player selects one Ship card on the grid and discards it</li>
					<li>Discard any Ship or Pony cards no longer connected to the shipping grid.</li>
					<li>Shuffle the newly created discard pile(s) to create a new deck, if that deck was empty</li>
					<li>The current player then draws from the new deck. If it runs out before they draw all their needed cards, rinse and repeat!</li>
				</ol>

				<h1>Something Was Confusing!</h1>
				<p>Never fear! First be sure to check the full rules. If you are still unsure about the rules in a certain situation, discuss it amongs your fellow players and come up with a house rule. Then, please send us some feedback about whatever it was that confused you. We're always happy to find more ways to make TSSSF easy &amp; fun!</p>

				<p>Catch Up on Our Site!</p>

				<p>For answers to rules questions and updates on future editions of Twilight Sparkle's Secret Shipfic Folder, check out our website <a href="http://www.secretshipfic.com">http://www.secretshipfic.com</a></p>

				<h1>Get Exclusive Previews!</h1>

				<p>Like TSSSF? Want more TSSSF faster?? Have we got a deal for you! Support us through Patreon and get art previews, private livestreams, playtest diaries and more! Check it out at <a href="http://www.patreon.com/horriblepeople">http://www.patreon.com/horriblepeople</a></p>
			</div>
		</div>
		`)},

		{
			name: 'Full Rules',
			render: htmlTab(`<iframe src="/rulebook.html"></iframe>`)
		},
		{
			name: 'FAQ',
			render: htmlTab(`<iframe src="/faq.html"></iframe>`)
		},
		{
			name: "Card Reference",
			render: referencePageRender
		}
	]);
}

export function customCardsPopup()
{
	return createPopup("Custom Cards", true, function(resolve){

		var div = document.createElement('div');

		div.innerHTML = `
		<h1>Custom Cards in Use</h1>

		<div>
			<div><img src="img/art-aryatheeditor.jpg" style="height: 200px"/></div>
			<div><a target="_blank" href="https://www.deviantart.com/aryatheeditor/art/Oof-807426031">Art by Arya The Editor</a></div>
		</div>

		<p style="margin-left: 30px; margin-right: 30px;">It looks like the game's host has uploaded custom cards to use in this game.<br>Hopefully, they have good taste</p>

		<div><button>Okay</button></div>`;

		div.getElementsByTagName('button')[0].onclick = resolve;

		return div;
	});
}

function quickStartPage()
{
	var div = document.createElement('div');
	var className = "desktop";

	var len = Math.max(window.innerWidth, window.innerHeight);

	if (len < 1000)
		className = "mobile";

	div.innerHTML = `<div class='desktopmobileswitch ${className}'>
		<div class='mobile switchlink' onclick="parentNode.className='desktopmobileswitch desktop'">
			See instructions for desktop computers
		</div>
		<div class='desktop switchlink' onclick="parentNode.className='desktopmobileswitch mobile'">
			See instructions for touch devices
		</div>
		<div class='desktop popupPage tiles'>
			<!-- the gifs are size 1923x1068 fyi. -->

			<div>
				<p>Draw pony, ship, and goal cards by clicking the decks on the left</p>
				<img class='helpGif' src="/img/help/drawCards.gif" />
			</div>

			<div>
				<p>Hold <span class='key'>Shift</span> and hover over a card to see the card in much more detail.</p>
				<img class='helpGif' src="/img/help/shiftHover.gif" />
			</div>

			<div>
				<p>Move cards onto the grid by dragging and dropping them from your hand.</p>
				<img class='helpGif' src="/img/help/dragCards.gif" />
			</div>

			<div>
				<p>Discard cards by holding down <span class='key'>D</span> and clicking them.</p>
				<img class='helpGif' src="/img/help/discard.gif" />
			</div>

			<div>
				<p>Swap cards around the grid by dragging and dropping them onto other cards.</p>
				<img class='helpGif' src="/img/help/swapCards.gif" />
			</div>

		</div>
		<div class='mobile popupPage tiles'>
			<!-- the gifs are size 1923x1068 fyi. -->
			<div>
				<p>Draw pony, ship, and goal cards by tapping the decks on the left</p>
				<img class='helpGif' src="/img/help/drawCards.gif" />
			</div>

			<div>
				<p>Tap and hold a card to see the card in much more detail.</p>
				<img class='helpGif' src="/img/help/shiftHover_m.gif" />
			</div>

			<div>
				<p>Move cards onto the grid by tapping one in your hand, then selecting a spot on the grid</p>
				<img class='helpGif' src="/img/help/dragCards_m.gif" />
			</div>

			<div>
				<p>Discard cards by tapping one to select it and then tapping the discard pile</p>
				<img class='helpGif' src="/img/help/discard_m.gif" />
			</div>

			<div>
				<p>Swap cards around the grid by tapping one, then tapping the card to swap it with</p>
				<img class='helpGif' src="/img/help/swapCards_m.gif" />
			</div>

			<div>
				<p>Shuffle the draw + discard piles by tap and holding the draw pile until it shuffles</p>
				<img class='helpGif' src="/img/help/shuffle_m.gif" />
			</div>
		</div>
		<div></div>
		<div></div>
	</div>`;

	return div;
}

win.createHelpPopup = createHelpPopup;