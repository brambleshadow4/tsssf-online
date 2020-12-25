import {
	isAnon,
	isBlank,
	isShip,
	isDiscardLoc,
	isPonyOrStart,
	isBoardLoc,
	isGoalLoc,
	isPony,
	isGoal
} from "/lib.js";

import cards from "/game/cards.js";

import {
	moveCard,
	isItMyTurn,
	setDataTransfer,
	getDataTransfer,
	isValidMove
} from "/game/game.js";
import {broadcastMove} from "/game/network.js";

var isDkeyPressed = false;
var hoverCard;
var hoverCardDiv;
var isShiftPressed = false;


export function makeCardElement(card, location, isDraggable, isDropTarget)
{
	var imgElement = document.createElement('div');
	imgElement.classList.add("card");

	setCardBackground(imgElement, card);

	if(!isBlank(card) && cards[card].noLogic && location != undefined && isGoalLoc(location))
	{
		var warningSym = document.createElement('img')
		warningSym.src = "/img/warning.svg";
		warningSym.className = "noLogic";
		imgElement.appendChild(warningSym);

		imgElement.title = "This card does not have any goal logic associated with it.\nIt will not highlight when achieved."
	}

	imgElement.onclick = function()
	{	
		if(isDkeyPressed && isItMyTurn())
		{
			if(location.startsWith("p,"))
			{
				var relativeOffset = location.replace("p,","offset,")
				if(model.board[relativeOffset])
					return;
			}

			if(isDiscardLoc(location) || location == "winnings")
				return;

			if(isPony(card))
			{	
				moveCard(card, location, "ponyDiscardPile,top");
				broadcastMove(card, location, "ponyDiscardPile,top");
			}
			else if(isShip(card))
			{	
				moveCard(card, location, "shipDiscardPile,top");
				broadcastMove(card, location, "shipDiscardPile,top");
			}
			else if (isGoal(card))
			{
				moveCard(card, location, "goalDiscardPile,top");
				broadcastMove(card, location, "goalDiscardPile,top");
			}
			else
			{
				return;
			}
		}
	}

	

	if(isDraggable)
	{
		imgElement.onmousedown = function(e)
		{
			e.stopPropagation();
		}

		imgElement.draggable = true;

		imgElement.classList.add('grab');

		var ghostCard;
		var ghostCardDragHandler;
		var ghostCardDragEndHandler;

		imgElement.ondragstart = function(e)
		{
			if(location.startsWith("p,"))
			{
				var offset = location.replace("p,","offset,");

				if(model.board[offset])
					return false;
			}

			if(isDkeyPressed || !isItMyTurn()){
				e.preventDefault();
				return;
			}

			//e.preventDefault();

			e.stopPropagation()
			//draggingBoard = false;

			setDataTransfer(card + ";" + location)


			var img = document.createElement('span')
			e.dataTransfer.setDragImage(img, 0, 0);


			if(isPonyOrStart(card))
			{
				document.getElementById('playingArea').classList.add('draggingPony');
			}

			if(isShip(card))
			{
				document.getElementById('playingArea').classList.add('draggingShip');
			}

			var ghostCard = makeCardElement(card);
			ghostCard.style.opacity = ".5";
			ghostCard.style.position = "absolute";
			ghostCard.style.top = e.pageY + "px";
			ghostCard.style.left = e.pageX + "px"
			

			ghostCardDragHandler = function(e)
			{
				ghostCard.style.top = e.pageY + "px";
				ghostCard.style.left = e.pageX + "px"
			};

			ghostCardDragEndHandler = function(e)
			{
				window.removeEventListener("dragover", ghostCardDragHandler)
				window.removeEventListener("dragend", ghostCardDragEndHandler);
				window.removeEventListener("drop", ghostCardDragEndHandler);

				if(ghostCard)
					ghostCard.parentNode.removeChild(ghostCard);

				var playingArea = document.getElementById('playingArea');
				playingArea.classList.remove("draggingPony")
				playingArea.classList.remove("draggingShip")
			}

			window.addEventListener('dragover', ghostCardDragHandler);
			window.addEventListener('dragend', ghostCardDragEndHandler);
			window.addEventListener('drop', ghostCardDragEndHandler);

			document.body.appendChild(ghostCard);
		}
	}
	else
	{
		imgElement.ondragstart = function(e){};
	}


	if(isDropTarget)
	{
		imgElement.ondragover= function(e)
		{
			var draggedCard = getDataTransfer().split(";")[0];


			if(isValidMove(draggedCard, card, location))
				e.preventDefault();
		}

		var offsetGhost = undefined;
		var overOffsetGhost = false;
		var overMainDiv = false;

		imgElement.ondragenter= function(e)
		{
			var draggedCard = getDataTransfer().split(";")[0];

			if(this == offsetGhost)
			{
				overOffsetGhost = true;
				return;
			}
			else
			{
				overMainDiv = true;
			}

			if(isValidMove(draggedCard, card, location))
			{
				if (isBlank(card))
					setCardBackground(imgElement, draggedCard)
				else
				{
					let [_, x, y] = location.split(",");
					x = Number(x);
					y = Number(y);

					var correspondingOffset = "offset," + x + "," + y;

					if(!offsetGhost)
					{
						offsetGhost = makeCardElement(card, correspondingOffset, false, true);
						offsetGhost.style.opacity = .2;

						offsetGhost.ondragenter = imgElement.ondragenter;
						offsetGhost.ondragleave = imgElement.ondragleave;
						offsetGhost.ondrop = imgElement.ondrop;

						const gridWidth = 22;

						offsetGhost.style.top = y * gridWidth + 2 + "vh";
						offsetGhost.style.left = x * gridWidth + 2 + "vh";
						document.getElementById('refPoint').appendChild(offsetGhost)
					}
					
					setCardBackground(imgElement, draggedCard)
				}
			}
		}

		imgElement.ondrop= function(e)
		{	
			if(offsetGhost)
			{
				offsetGhost.parentNode.removeChild(offsetGhost);
				offsetGhost = undefined;
			}	

			e.preventDefault();
			var [card, startLoc] = getDataTransfer().split(";")

			if(isBoardLoc(location))
			{
				if(model.board[location] && model.board[location].card && isPonyOrStart(model.board[location].card))
				{
					var [_,x,y] = location.split(",");
					var offsetLoc = "offset," + x + "," + y;
					let offsetCard = model.board[location].card;

					moveCard(offsetCard, location, offsetLoc);
					broadcastMove(offsetCard, location, offsetLoc);
				}
				else
				{
					// delete drop zone card;
					//this.parentNode.removeChild(this);
				}
			}

			

			moveCard(card, startLoc, location);
			broadcastMove(card, startLoc, location);
			return false;
		}


		imgElement.ondragleave= function(e)
		{
			if(this == offsetGhost)
			{
				overOffsetGhost = false
			}
			else
			{
				overMainDiv = false;
			}

			if(overOffsetGhost || overMainDiv)
			{
				return;
			}

			if(isBlank(card))
				imgElement.style.backgroundImage = "";
			else
				setCardBackground(imgElement, card)	

			if(offsetGhost)
			{
				offsetGhost.parentNode.removeChild(offsetGhost);
				offsetGhost = undefined;
			}		
		}
	}

	return imgElement;
}



function addShiftHover(card, element)
{
	element.onmouseenter = function(e)
	{
		hoverCard = card;
		hoverCardDiv = element;

		if(isShiftPressed)
		{
			enlargeCard();
		}
	}

	element.onmouseleave = function()
	{
		unenlargeCard();
		hoverCard = "";
	}
}

function removeShiftHover(element)
{
	element.onmouseenter = function(){};
	element.onmouseleave = function(){};
}



// dragHandler is responsible for removing a card from its old location
// dropHandler is responsible for adding a card to its new location.

export function updateCardElement(oldElement, card, location, isDraggable, isDropTarget)
{
	var div = makeCardElement(card, location, isDraggable, isDropTarget);
	div.id = oldElement.id;
	oldElement.parentNode.replaceChild(div, oldElement);

	return div;
}


export function setDisguise(element, disguiseCard)
{
	var img = document.createElement('img');
	img.style.height = "100%";
	img.src = cards[disguiseCard].thumbnail;
	img.className = "changeling decoration";
	element.appendChild(img);
}

export function setCardKeywords(element, keywords)
{

	console.log(keywords)
	var div = document.createElement('div');
	div.className = "keywords decoration";

	for(var word of keywords)
	{
		div.innerHTML += "<div>" + word + "</div>";
	}

	element.appendChild(div);
}

export function addTempSymbol(element, symbol)
{
	if(symbol == undefined)
		return;

	var img = document.createElement('img');
	//img.style.height = "100%";

	var extension = (symbol == "doublePony" ? ".svg" : ".png")

	img.src = "/img/sym/" + symbol + extension;
	img.className = "symbol decoration";
	element.appendChild(img);
}



function setCardBackground(element, card, useLarge)
{
	if(isAnon(card))
	{
		element.classList.remove('blank');

		if(card == "anon:ship")
			element.classList.add('ship');
		else if(card == "anon:pony")
			element.classList.add('pony');
		else if(card == "anon:goal")
			element.classList.add('goal');

		removeShiftHover(element);
	}
	else if(isBlank(card))
	{
		if(card == "blank:ship")
			element.classList.add('ship');
		else if(card == "blank:pony")
			element.classList.add('pony');
		else if(card == "blank:goal")
			element.classList.add('goal');

		element.style.backgroundImage = "";
		element.classList.add('blank');

		removeShiftHover(element);
	}
	else
	{
		if(isShip(card))
			element.classList.add('ship')

		if(isGoal(card))
			element.classList.add('goal');

		if(isPony(card))
			element.classList.add('pony')
		else if (isPonyOrStart(card))
			element.classList.add('start');

		var src = cards[card].thumbnail;
		if(useLarge)
			src = cards[card].fullUrl;

		element.style.backgroundImage = "url(\"" + src + "\")";

		if(!useLarge)
			addShiftHover(card, element);
	}
}

function enlargeCard(cardDiv)
{
	if(document.getElementById('giantCard')) return;

	

	var giantCard = document.createElement('div');
	giantCard.classList.add('card');
	giantCard.id = "giantCard"

	if(isShip(hoverCard))
	{
		giantCard.classList.add('ship');
	}
	if(isPony(hoverCard))
	{
		giantCard.classList.add('pony');
	}

	var width = 13*3/100 * window.innerHeight;
	var height = 18*3/100 * window.innerHeight;

	
	giantCard.style.position = "absolute";

	var cardRect = hoverCardDiv.getBoundingClientRect();

	var y = cardRect.top + (cardRect.bottom - cardRect.top)/2 - height/2;
	var x = cardRect.left + (cardRect.right - cardRect.left) + 10;

	if(x + width + 10 > window.innerWidth)
		x = cardRect.left - 10 - width;

	if(y < 10)
		y = 10;
	if(y + height +10 > window.innerHeight)
		y = window.innerHeight - height - 10;


	giantCard.style.top = y + "px"
	giantCard.style.left = x + "px";
	giantCard.style.width = width + "px";
	giantCard.style.height = height + "px";
	giantCard.style.zIndex = "6";
	giantCard.style.borderRadius = "15px";
	giantCard.style.backgroundPosition = "center";
	giantCard.style.backgroundSize = "cover";

	setCardBackground(giantCard, hoverCard, true);

	document.body.appendChild(giantCard);
}

function unenlargeCard()
{
	var div = document.getElementById('giantCard');
	if(div)
		div.parentNode.removeChild(div);
}


export function isDeleteClick()
{
	return isDkeyPressed;
}


window.addEventListener('keydown', function(e){

	if(e.key == "D" || e.key == "d")
	{
		isDkeyPressed = true;
	}

	if(e.key == "Shift")
	{
		isShiftPressed = true;
		if(hoverCard.length)
			enlargeCard();
	}
});



window.addEventListener('keyup', function(e){

	if(e.key == "D" || e.key == "d")
	{
		isDkeyPressed = false;
	}

	if(e.key == "Shift")
	{
		isShiftPressed = false;
		unenlargeCard();
	}
});
