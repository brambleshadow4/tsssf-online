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

var ghostCard;
var trashButton;

var isHoverTouch = false;
var inTouchEvent = false;

export function endMoveShared()
{
	setDataTransfer("");

	var selected = document.getElementsByClassName('selected');
	while(selected.length)
		selected[0].classList.remove('selected');

	if(ghostCard)
	{
		ghostCard.parentNode.removeChild(ghostCard);
		ghostCard = undefined
	}

	if(trashButton)
	{
		trashButton.parentNode.removeChild(trashButton);
		trashButton = undefined;
	}

	var takeGoal = document.getElementById('takeGoal');
	if(takeGoal)
	{
		takeGoal.parentNode.removeChild(takeGoal);
	}

	var playingArea = document.getElementById('playingArea');
	playingArea.classList.remove("draggingPony")
	playingArea.classList.remove("draggingShip")
}


export function makeCardElement(card, location, isDraggable, isDropTarget)
{
	var imgElement = document.createElement('div');
	imgElement.classList.add("card");

	setCardBackground(imgElement, card);

	if(!isBlank(card) && cards[card] && cards[card].noLogic && location != undefined && isGoalLoc(location))
	{
		var warningSym = document.createElement('img')
		warningSym.src = "/img/warning.svg";
		warningSym.className = "noLogic";
		imgElement.appendChild(warningSym);

		imgElement.title = "This card does not have any goal logic associated with it.\nIt will not highlight when achieved."
	}


	function addGoalCheck(imgElement, goalNo)
	{
		if(!isItMyTurn()) return;


		if(imgElement.getElementsByClassName('goalCheck').length > 0)
			return;

		var img = document.createElement('img');
		img.className = "goalCheck";
		img.src= "/img/check.svg";
		img.style.width = "5vh";

		img.onclick = function(e)
		{
			if(isItMyTurn() && !isDeleteClick())
			{
				e.preventDefault();
				e.stopPropagation();

				var card = model.currentGoals[goalNo].card;
				moveCard(card, "goal,"+goalNo, "winnings")
				broadcastMove(card, "goal,"+goalNo, "winnings")
			}
		}

		img.ontouchstart = img.onclick;
		imgElement.appendChild(img);
	}

	if(location && isGoalLoc(location) && !isBlank(card))
	{
		imgElement.addEventListener("mouseenter", function(e)
		{
			addGoalCheck(imgElement, Number(location.split(',')[1]))
		});
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

	imgElement.ontouchstart = function(e)
	{
		isHoverTouch = false;
		inTouchEvent = true;
	}
	
	imgElement.ontouchend = function(e)
	{
		inTouchEvent = false;

		if(isHoverTouch)
		{
			//endMoveShared();
			return;
		}

		if(!location)
			return;

		if(isBoardLoc(location) || location.startsWith("shipDiscardPile,") || location.startsWith("ponyDiscardPile"))
		{
			e.preventDefault();
			e.stopPropagation();
		}

		var draggedCard = getDataTransfer().split(";")[0];

		if(isItMyTurn() && isDropTarget && draggedCard && isValidMove(draggedCard, card, location))
		{
			completeMoveShared();
			endMoveShared();
		}
		else if(isItMyTurn() && (isDraggable || (!isBlank(card) && isGoalLoc(location))))
		{
			if(location.startsWith("p,"))
			{
				var offset = location.replace("p,","offset,");
				if(model.board[offset])
					return false;
			}

			if(imgElement.classList.contains('selected'))
			{
				endMoveShared();

				if(location.startsWith("shipDiscardPile,"))
				{
					document.getElementById('shipDiscardPile').click();
				}

				if(location.startsWith("ponyDiscardPile,"))
				{
					document.getElementById('ponyDiscardPile').click();
				}

				return;
			}

			endMoveShared();

			imgElement.classList.add('selected');

			if(isGoalLoc(location))
			{
				addGoalCheck(imgElement, Number(location.split(',')[1]));
			}

			var trashTarget;
			if(isPony(card))
				trashTarget = "ponyDiscardPile";
			else if (isShip(card))
				trashTarget = "shipDiscardPile";
			else if(isGoal(card))
				trashTarget = "goalDiscardPile";

			if(trashTarget && !location.startsWith(trashTarget))
			{
				var trashTargetEl = document.getElementById(trashTarget);



				var top = trashTargetEl.getBoundingClientRect().top
				var left = trashTargetEl.getBoundingClientRect().left

				//alert(window.innerHeight + " " + top + " " + trashTargetEl.getBoundingClientRect().top);

				trashButton = document.createElement('img');
				trashButton.src = "/img/trash.svg";
				trashButton.style.position = "absolute";
				trashButton.style.top = top + "px";
				trashButton.style.left = left + "px"
				trashButton.style.width = "13vh";

				trashButton.style.zIndex = 3;


				document.body.appendChild(trashButton);

				trashButton.ontouchstart = function(e)
				{
					e.preventDefault();
					e.stopPropagation();

					endMoveShared();
					moveCard(card, location, trashTarget + ",top");
					broadcastMove(card, location, trashTarget + ",top");
				}
			}

			if(isPonyOrStart(card))
			{
				document.getElementById('playingArea').classList.add('draggingPony');
			}

			if(isShip(card))
			{
				document.getElementById('playingArea').classList.add('draggingShip');
			}

			setDataTransfer(card + ";" + location)
		}	
	}

	function completeMoveShared()
	{
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
	}




	if(isDraggable)
	{
		imgElement.onmousedown = function(e)
		{
			e.stopPropagation();
		}

		imgElement.draggable = true;

		imgElement.classList.add('grab');

		
		var ghostCardDragHandler;
		var ghostCardDragEndHandler;

	
		imgElement.ondragstart = function(e)
		{
			if(inTouchEvent)
			{
				e.preventDefault();
				e.stopPropagation();
				return;
			}

			if (isDkeyPressed || !isItMyTurn())
			{
				e.preventDefault();
				return;
			}

			if(location.startsWith("p,"))
			{
				var offset = location.replace("p,","offset,");

				if(model.board[offset])
					return false;
			}

			//e.preventDefault();

			e.stopPropagation()

			setDataTransfer(card + ";" + location)
			//draggingBoard = false;


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

			ghostCard = makeCardElement(card);
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

				endMoveShared();
				
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

		

		imgElement.ondrop = function(e)
		{	
			if(offsetGhost)
			{
				offsetGhost.parentNode.removeChild(offsetGhost);
				offsetGhost = undefined;
			}	

			e.preventDefault();

			completeMoveShared();
			
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


var touchStartNum = 0;

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

	element.oncontextmenu = function(e)
	{
		e.preventDefault();
		e.stopPropagation();
	}

	element.onmouseleave = function()
	{
		// this can get triggered by mobile too
		if(!isHoverTouch)
		{
			unenlargeCard();
			hoverCard = "";
		}
		
	}

	element.addEventListener("touchstart", function(){
		
		let thisNo = ++touchStartNum;

		hoverCard = card;
		hoverCardDiv = element;
		setTimeout(function(){
			if(thisNo == touchStartNum && hoverCard)
			{
				//console.log("isHoverTouch = true")
				isHoverTouch = true;
				enlargeCard();
			}
		}, 500);
	});

	element.addEventListener("touchend", function()
	{
		touchStartNum++;
		unenlargeCard();
		hoverCard = "";
	});
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

function enlargeCard()
{
	if(document.getElementById('giantCard')) return;
	if(!hoverCard) return;
	
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

	if(height < 400)
	{
		var ratio1 = 400/height;
		var ratio2 = window.innerHeight / height;
		var ratio3 = window.innerWidth / width;

		var ratio = Math.min(ratio1, Math.min(ratio2, ratio3));

		width *= ratio;
		height *= ratio;
	}

	
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
