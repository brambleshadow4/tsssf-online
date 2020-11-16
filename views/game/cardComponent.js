import {
	isAnon,
	isBlank,
	isShip,
	isDiscardLoc,
	isPonyOrStart,
	isBoardLoc,
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

	imgElement.onclick = function()
	{	
		if(isDkeyPressed && isItMyTurn())
		{
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


			if(isValidMove(draggedCard, card))
				e.preventDefault();
		}

		imgElement.ondragenter= function(e)
		{
			var draggedCard = getDataTransfer().split(";")[0];


			if(isValidMove(draggedCard, card))
			{
				if (isBlank(card))
					setCardBackground(imgElement, draggedCard)
				else
					imgElement.style.border = "solid 5px green";
			}
		}

		imgElement.ondrop= function(e)
		{	
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
			if(isBlank(card))
				imgElement.style.backgroundImage = "";
			else
				imgElement.style.border = "";
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

		var src = cards[card].thumbnail;
		if(useLarge)
			src = cards[card].fullUrl;

		element.style.backgroundImage = "url(\"" + src + "\")";

		addShiftHover(card, element);
	}
}

function enlargeCard(cardDiv)
{
	if(document.getElementById('giantCard')) return;

	var giantCard = document.createElement('div');
	giantCard.id = "giantCard"

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