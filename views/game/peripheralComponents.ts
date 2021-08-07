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
	Card, Location, CardProps
} from "../../model/lib.js";

import * as cm from "../../model/cardManager.js";

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
	endMoveShared,
	addCardClickHandler
} from "./cardComponent.js"

import {
	isItMyTurn,
	getDataTransfer,
	isValidMove,
	moveCard
} from "./game.js"

import {
	createPopup,
	createSearchPopup,
	createTabbedPopup,
	htmlTab
} from "./popupComponent.js";

import s from "../tokens.js";

import {doesCardMatchFilters, cardSearchBar} from "./cardSearchBarComponent.js";

import {cardReference} from "../info/knowledgeBase.js";



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

		id = key + "DrawPile";
		
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
			var card = await openSearchCardSelect(s.PopupTitleDiscardedPonies, "", model.ponyDiscardPile, true);

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
	addCardClickHandler(element,  async function(){
		
		if(model.shipDiscardPile.length)
		{
			var card = await openSearchCardSelect(s.PopupTitleDiscardedShips, "",  model.shipDiscardPile, true);

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

	addCardClickHandler(element, async function()
	{
		if(model.goalDiscardPile.length)
		{
			var card = await openSearchCardSelect(s.PopupTitleDiscardedGoals, "", model.goalDiscardPile, true);
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
	});
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

	if(model.winnings.length)
	{
		var scoreElement = document.createElement('span');
		scoreElement.className = 'score';

		scoreElement.innerHTML = s.GamePointsWithUnit.replace("{0}", points);
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
			let winnings = player.winnings.map((x: Winning) => x.card);
			let playersCards = [];
			let title = s.PopupTextWonGoals;

			if(player.hand)
			{
				playersCards = player.hand;
				title = s.PopupTextPlayersCards;
			}

			openSearchCardSelect(title.replace("{0}", player.name), "", playersCards.concat(winnings), false);
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


export function updateHand(updateInfo?: string)
{
	var handDiv = document.getElementById('hand')!;	
	

	var ponyHand = document.getElementById('hand-pony')!;
	var shipHand = document.getElementById('hand-ship')!;
	let model = win.model as GameModel & {hand: Card[]};

	if(updateInfo == undefined)
	{
		var oldCards = handDiv.getElementsByClassName('card');

		while(oldCards.length)
		{
			oldCards[0].parentNode!.removeChild(oldCards[0]);
		}

		for(var i=0; i<model.hand.length; i++)
		{
			var cardEl = makeCardElement(model.hand[i], "hand", true);

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
	else if(updateInfo.startsWith("-"))
	{
		let cardDivs = handDiv.getElementsByClassName('card');
		let card = updateInfo.substring(1);

		for(let i =0; i < cardDivs.length; i++)
		{
			let cardDiv = cardDivs[i] as HTMLElement;

			(win as any).x = cm.inPlay(); 

			if(cardDiv && cardDiv.style.backgroundImage == "url(\"" + cm.inPlay()[card].thumb + "\")")
			{
				cardDiv.parentNode!.removeChild(cardDiv);
				break;
			}
		}
		
	}
	else if(updateInfo.startsWith("+"))
	{
		let card = updateInfo.substring(1);
		var cardEl = makeCardElement(card, "hand", true);

		if(isPony(card))
		{
			ponyHand.appendChild(cardEl);
		}
		else
		{
			shipHand.appendChild(cardEl)
		}
	}

	let cardDivs = handDiv.getElementsByClassName('card');

	// used by animation to calculate bounding boxes;
	for(var i = 0; i < cardDivs.length; i++)
	{
		cardDivs[i].id = "hand" + i;
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

	document.body.removeChild(outer);

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
	function renderFun(closePopupWithVal: any){

		var div = document.createElement('div');
		div.classList.add("popupPage")

		if(heading)
		{
			var h1 = document.createElement('h1');
			h1.className = "no-top-margin";
			h1.innerHTML = heading;
			div.appendChild(h1);
		}
		

		let cards2 = cards.slice();

		cards2.sort();

		for(let card of cards2)
		{
			var cardElement = makeCardElement(card);
			div.appendChild(cardElement);

			addCardClickHandler(cardElement, function()
			{
				closePopupWithVal(card);
			});
		}

		return div;
	}


	return createPopup(title, !!miniMode, renderFun);
}

export function openSearchCardSelect(title: string, heading: string, cards: Card[], sort: boolean)
{
	function renderFun(filters: [string, any][], closePopupWithVal: any){

		var div = document.createElement('div');
		div.classList.add("popupPage")

		if(heading)
		{
			var h1 = document.createElement('h1');
			h1.className = "no-top-margin";
			h1.innerHTML = heading;
			div.appendChild(h1);
		}
		
		let cards2 = cards.slice();

		if(sort)
		{
			cards2.sort();
		}

		let allCards = cm.inPlay();

		for(let card of cards2)
		{
			if(!doesCardMatchFilters(card, filters)) { continue; }

			var cardElement = makeCardElement(card);
			div.appendChild(cardElement);

			addCardClickHandler(cardElement, function()
			{
				closePopupWithVal(card);
			});
		}

		return div;
	}

	var cardProps: {[key:string]: CardProps} = {};
	var inPlay = cm.inPlay();
	for(let card of cards)
	{
		cardProps[card] = inPlay[card];
	}

	return createSearchPopup(title, cardProps, renderFun);

}





win.openSettings = function()
{
	return createPopup(s.PopupTitleHostSettings, false, function(closeFn: (value?: any) => any)
	{
		var div = document.createElement('div')
		div.className = "popupPage";

		div.innerHTML = `

		<div class='checkboxContainer'><input type='checkbox' id='keepLobbyOpen'/><label for='keepLobbyOpen'>${s.HostSettingKeepLobbyOpen}</label></div>
		<div><button id='newGameButton'>${s.HostSettingNewGameButton}</button><span class='buttonDescription'>${s.HostSettingNewGameText}</span></div>

		<h2>${s.HostSettingKickPlayers}</h2>
		<p>${s.HostSettingKickPlayersText}</p>

		<div id='kickButtons'></div>
		`


		for(let player of win.model.players)
		{
			var button = document.createElement('button');
			button.innerHTML = s.HostSettingKickPlayerButton.replace("{0}", player.name);
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




function createHelpPopup()
{
	createTabbedPopup([
		{
			name: s.HelpTabQuickStart,
			render: quickStartPage
		},
		{
			name: s.HelpTabQuickRules,
			render: htmlTab(`<iframe src="/info/quickRules"></iframe>`)},

		{
			name: s.HelpTabFullRules,
			render: htmlTab(`<iframe src="/info/rulebook"></iframe>`)
		},
		{
			name: s.HelpTabFAQ,
			render: htmlTab(`<iframe src="/info/faq"></iframe>`)
		},
		{
			name: s.HelpTabCardReference,
			render: (_a) => cardReference(cm.inPlay(), true)
		}
	]);
}

export function customCardsPopup()
{
	return createPopup(s.PopupTitleCustomCards, true, function(resolve){

		var div = document.createElement('div');

		div.innerHTML = `
		<h1 class='no-top-margin'>${s.CustomCardsHeading}</h1>

		<div>
			<div><img src="img/art-aryatheeditor.jpg" style="height: 200px"/></div>
			<div><a target="_blank" href="https://www.deviantart.com/aryatheeditor/art/Oof-807426031">${s.CustomCardsArt}</a></div>
		</div>

		<p style="margin-left: 30px; margin-right: 30px;">${s.CustomCardsWarning}</p>

		<div><button>${s.ButtonOkay}</button></div>`;

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
			${s.QuickStartSwitchToDesktop}
		</div>
		<div class='desktop switchlink' onclick="parentNode.className='desktopmobileswitch mobile'">
			${s.QuickStartSwitchToMobile}
		</div>
		<div class='desktop popupPage tiles'>
			<!-- the gifs are size 1923x1068 fyi. -->

			<div>
				<p>${s.QuickStartDesktop1}</p>
				<img class='helpGif' src="/img/help/drawCards.gif" />
			</div>

			<div>
				<p>${s.QuickStartDesktop2}</p>
				<img class='helpGif' src="/img/help/shiftHover.gif" />
			</div>

			<div>
				<p>${s.QuickStartDesktop3}</p>
				<img class='helpGif' src="/img/help/dragCards.gif" />
			</div>

			<div>
				<p>${s.QuickStartDesktop4}</p>
				<img class='helpGif' src="/img/help/discard.gif" />
			</div>

			<div>
				<p>${s.QuickStartDesktop5}</p>
				<img class='helpGif' src="/img/help/swapCards.gif" />
			</div>

		</div>
		<div class='mobile popupPage tiles'>
			<!-- the gifs are size 1923x1068 fyi. -->
			<div>
				<p>${s.QuickStartMobile1}</p>
				<img class='helpGif' src="/img/help/drawCards.gif" />
			</div>

			<div>
				<p>${s.QuickStartMobile2}</p>
				<img class='helpGif' src="/img/help/shiftHover_m.gif" />
			</div>

			<div>
				<p>${s.QuickStartMobile3}</p>
				<img class='helpGif' src="/img/help/dragCards_m.gif" />
			</div>

			<div>
				<p>${s.QuickStartMobile4}</p>
				<img class='helpGif' src="/img/help/discard_m.gif" />
			</div>

			<div>
				<p>${s.QuickStartMobile5}</p>
				<img class='helpGif' src="/img/help/swapCards_m.gif" />
			</div>

			<div>
				<p>${s.QuickStartMobile6}</p>
				<img class='helpGif' src="/img/help/shuffle_m.gif" />
			</div>
		</div>
	</div>`;

	return div;
}

win.createHelpPopup = createHelpPopup;