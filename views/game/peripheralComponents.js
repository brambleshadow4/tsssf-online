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
	isPonyOrStart
} from "/lib.js";

import {broadcastMove,
	broadcast,
	requestDrawPony,
	requestDrawShip,
	requestSwapShuffle,
	requestDrawGoal,
	attachToSocket
} from "/game/network.js";

import {
	makeCardElement,
	updateCardElement,
	isDeleteClick
} from "/game/cardComponent.js"

import cards from "/game/cards.js"

import {
	isItMyTurn,
	getDataTransfer
} from "/game/game.js"


var SCROLL_BAR_WIDTH = getScrollBarWidth();


export function initPeripherals()
{
	document.getElementById("ponyDrawPile").onclick = requestDrawPony;
	document.getElementById("shipDrawPile").onclick = requestDrawShip;
	document.getElementById("goalDrawPile").onclick = preRequestDrawGoal;

	var shuffles = ["pony","ship","goal"];

	for(let key of shuffles)
	{
		let id = key+"Shuffle";

		document.getElementById(id).onclick = () => requestSwapShuffle(key)
	}

	var hand = document.getElementById('hand')
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
					if(div)
						div.parentNode.removeChild(div);
				}

				div.ondrop = function(e)
				{
					e.preventDefault();
					div.parentNode.removeChild(div);
					var [card, startLoc] = getDataTransfer().split(";")

					moveCard(card, startLoc, "hand");
					broadcastMove(card, startLoc, "hand");
				}

				hand.appendChild(div);
			}	
		}
	}

	window.addCardsToReferencePage = function()
	{

		var popupPage = document.createElement('div')
		popupPage.className = "popupPage";

		var ponyReference = document.createElement('div');
		var shipReference = document.createElement('div');
		var goalReference = document.createElement('div');

		var keys = Object.keys(cards);
		var re = new RegExp(model.cardDecks);
		keys.sort();
		for(let key of keys)
		{
			if(!re.exec(key)) continue;

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
}

function preRequestDrawGoal()
{
	var i = 0;
	while(i < model.currentGoals.length)
	{
		if(isBlank(model.currentGoals[i]))
			break;
		i++;
	}

	if(i >= 3) return;

	requestDrawGoal()
}




export function updatePonyDiscard(cardOnTop)
{
	if(model.ponyDrawPileLength == 0)
		document.getElementById("ponyDrawPile").classList.add('blank');
	else
		document.getElementById("ponyDrawPile").classList.remove('blank');


	var l = model.ponyDiscardPile.length;
	var topCard = cardOnTop || (l ? model.ponyDiscardPile[l-1] : "blank:pony");

	updateCardElement(
		document.getElementById("ponyDiscardPile"),
		topCard,
		"ponyDiscardPile,top",
		l > 0, false
	)

	var element = document.getElementById("ponyDiscardPile");
	element.addEventListener('click', async function(){
		
		if(model.ponyDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ponies", model.ponyDiscardPile);

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

export function updateShipDiscard(tempCard)
{

	if(model.shipDrawPileLength == 0)
		document.getElementById("shipDrawPile").classList.add('blank');
	else
		document.getElementById("shipDrawPile").classList.remove('blank');


	var l = model.shipDiscardPile.length;
	var topCard = tempCard || (l ? model.shipDiscardPile[l-1] : "blank:ship");

	updateCardElement(
		document.getElementById("shipDiscardPile"),
		topCard,
		"shipDiscardPile,top",
		l > 0, false
	)

	var element = document.getElementById("shipDiscardPile");
	element.addEventListener('click', async function(){
		
		if(model.shipDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ships", model.shipDiscardPile);

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

export function updateGoalDiscard(tempCard)
{
	if(model.goalDrawPileLength == 0)
		document.getElementById("goalDrawPile").classList.add('blank');
	else
		document.getElementById("goalDrawPile").classList.remove('blank');

	var l = model.goalDiscardPile.length;
	var topCard = tempCard || (l ? model.goalDiscardPile[l-1] : "blank:goal");

	updateCardElement(
		document.getElementById("goalDiscardPile"),
		topCard,
		"goalDiscardPile,top",
		false, false
	)
}

export function updateWinnings()
{
	var element = document.getElementById('winnings');
	element.innerHTML = "";

	var cardOffset = 2;
	var offset = model.winnings.length * cardOffset;

	for(var i=0; i < model.winnings.length; i++)
	{
		cardLocations[model.winnings[i]] = "winnings";

		offset -= cardOffset;
		var card = makeCardElement(model.winnings[i], "winnings");
		card.style.position = "absolute";
		card.style.bottom = offset + "vh";
		card.style.right = "0vh"
		element.appendChild(card)
	}

}

export function updatePlayerList()
{
	var playerList = document.getElementById('playerList');
	playerList.innerHTML = "";
	for(var player of model.players)
	{
		var div = document.createElement('div');
		div.className = "player";

		var className = player.disconnected ? "disconnected" : "";

		if(model.turnstate && model.turnstate.currentPlayer == player.name)
		{
			div.classList.add('currentPlayer');
		}

		div.innerHTML = `
			<span class="${className}">${player.name}</span>
			<span class='ponyCount'>${player.ponies}</span>
			<span class='shipCount'>${player.ships}</span>
			<span class='goalCount'>${player.winnings.length}</span>
		`;
		playerList.appendChild(div);
	}
}

export function updateGoals(goalNo)
{
	var goalDiv = document.getElementById('currentGoals');

	var start = 0;
	var end = 3;

	if(goalNo != undefined)
	{
		start = goalNo;
		end = goalNo + 1;
	}

	for(let i=start; i<end; i++)
	{
		let element = updateCardElement(
			goalDiv.getElementsByClassName('card')[i],
			model.currentGoals[i], "goal," + i, false, false);

		cardLocations[model.currentGoals[i]] = "goal," + i;

		if(!isBlank(model.currentGoals[i]))
		{
			element.addEventListener("mouseenter", function(e)
			{
				if(!isItMyTurn()) return;

				var img = document.createElement('img');
				img.id = "takeGoal"
				img.src= "/img/check.svg";
				img.style.width = "5vh";


				img.onclick = function()
				{
		
					if(isItMyTurn() && !isDeleteClick())
					{
						var card = model.currentGoals[i];
						moveCard(card, "goal,"+i, "winnings")
						broadcastMove(card, "goal,"+i, "winnings")
					}
					
				}

				element.appendChild(img);
			});

			element.addEventListener('mouseleave', function(e){
				var div = document.getElementById('takeGoal')
				if(div)
					div.parentNode.removeChild(div);
			})
		}
	}
}

export function updateHand(cardIndex)
{
	var handDiv = document.getElementById('hand');	

	var ponyHand = document.getElementById('hand-pony');
	var shipHand = document.getElementById('hand-ship')
	if(cardIndex == undefined)
	{
		var oldCards = handDiv.getElementsByClassName('card');

		while(oldCards.length)
		{
			oldCards[0].parentNode.removeChild(oldCards[0]);
		}

		for(var i=0; i<model.hand.length; i++)
		{
			var cardEl = makeCardElement(model.hand[i], "hand", true);
			cardEl.id = "hand" + i;

			cardLocations[model.hand[i]] = "hand";

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
	
	if(cardRow.scrollWidth > window.innerWidth)
	{
		cardRow.style.height = `calc(20% + ${SCROLL_BAR_WIDTH}px)`;
	}
	else
	{
		cardRow.style.height = "";
	}
}


function openCardSelect(title, cards)
{
	function handler(accept, reject)
	{
		var div = document.createElement('div');
		div.id = "cardSelect";
		div.className = "popup";

		var innerDiv = document.createElement('div');
		innerDiv.id = "popupContent";
		innerDiv.classList.add("popupPage")
		div.appendChild(innerDiv);

		var h1 = document.createElement('h1');
		h1.innerHTML = title;
		innerDiv.appendChild(h1);

		var close = document.createElement('img');
		close.src = "/img/close.svg";
		close.id = "popupCloseButton";
		close.onclick = function()
		{
			div.parentNode.removeChild(div);
			close.parentNode.removeChild(close);
			accept();
		}

		document.body.appendChild(close);


		let cards2 = cards.slice();

		cards2.sort();

		for(let card of cards2)
		{
			var cardElement = makeCardElement(card);
			innerDiv.appendChild(cardElement);

			cardElement.onclick = function()
			{
				div.parentNode.removeChild(div);
				close.parentNode.removeChild(close);
				accept(card);
			}
		}

		document.body.appendChild(div);
	}
	return new Promise(handler);
}


function createHelpPopup()
{
	var help = document.getElementById('help');

	var closeButton = document.createElement('img');
	closeButton.src = "/img/close.svg";
	closeButton.id = "popupCloseButton";
	closeButton.onclick = function()
	{
		var div = document.getElementsByClassName('popup')[0];
		div.parentNode.removeChild(div);

		this.parentNode.removeChild(this);
	}

	var div = document.createElement('div');
	div.className = "popup";
	
	var initialContent;
	

	var tabs = document.createElement('div');
	tabs.className = 'popupTabs';
	for(let i =0; i < help.children.length; i++)
	{
		var tab = document.createElement('div');
		let tabName = help.children[i].getAttribute("tab-name")
		tab.innerHTML = tabName;
		tabs.appendChild(tab);

		tab.onclick = function()
		{
			for(let j=0; j<tabs.children.length; j++)
			{
				tabs.children[j].classList.remove('selected')
			}

			this.classList.add('selected');

			var container = document.getElementById('popupContent');
			if(tabName == "Card Reference")
			{
				container.innerHTML = "";
				container.appendChild(window.addCardsToReferencePage())
			}
			else
				container.innerHTML = help.children[i].innerHTML;
		}
	}

	tabs.children[0].classList.add('selected');
	div.innerHTML = "<div id='popupContent'>" + help.children[0].innerHTML + "</div>";

	div.appendChild(tabs);

	document.body.appendChild(closeButton);
	document.body.appendChild(div);
}

window.createHelpPopup = createHelpPopup;