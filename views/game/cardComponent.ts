import {
	isAnon,
	isBlank,
	isShip,
	isDiscardLoc,
	isPonyOrStart,
	isBoardLoc,
	isGoalLoc,
	isPony,
	isGoal,
	Card,
	GameModel,
	Location,
	CardElement
} from "../../server/lib.js";

import cards from "../../server/cards.js";

import {
	moveCard,
	isItMyTurn,
	setDataTransfer,
	getDataTransfer,
	updateTurnstate,
	isValidMove
} from "./game.js";
import {broadcastMove} from "./network.js";

import {createPopup} from "./popupComponent.js";

var isDkeyPressed = false;
var hoverCard: Card;
var hoverCardDiv : HTMLElement
var isShiftPressed = false;

var ghostCard: HTMLElement | undefined;
var trashButton: HTMLImageElement | undefined;

var isHoverTouch = false;
var inTouchEvent = false;

var globals = window as unknown as {model: GameModel};

export function endMoveShared()
{
	setDataTransfer("");

	var selected = document.getElementsByClassName('selected');
	while(selected.length)
		selected[0].classList.remove('selected');

	if(ghostCard)
	{
		ghostCard.parentNode!.removeChild(ghostCard);
		ghostCard = undefined
	}

	if(trashButton)
	{
		trashButton.parentNode!.removeChild(trashButton);
		trashButton = undefined;
	}

	var takeGoal = document.getElementById('takeGoal');
	if(takeGoal)
	{
		takeGoal.parentNode!.removeChild(takeGoal);
	}

	var playingArea = document.getElementById('playingArea')!;
	playingArea.classList.remove("draggingPony")
	playingArea.classList.remove("draggingShip")
}

function getGoalPoints(model: GameModel, card: Card, achieved: boolean)
{
	if(!isGoal(card))
		return [];

	var points = [];
	var pointString = cards[card].points;
	if(pointString.indexOf("-") > -1)
	{
		var i = pointString.indexOf("-")
		var minPts = Number(pointString.substring(0, i))
		var maxPts = Number(pointString.substring(i+1));

		for(i=minPts; i<=maxPts; i++)
		{
			points.push(i);
		}
	}
	else
	{
		points = [Number(pointString)];
	}

	var changeGoalPointValues = false;

	for(var key in model.board)
	{
		if(key.startsWith('p,'))
		{
			var card = model.board[key].card;
			if(cards[card] && cards[card].changeGoalPointValues)
			{
				changeGoalPointValues = true;
			}
		}
	}

	if(!achieved || changeGoalPointValues)
	{
		points.push(-1);
	}

	return points;
}



export function makeCardElement(card: Card, location?: Location, isDraggable?: boolean, isDropTarget?: boolean): CardElement
{
	let imgElement = document.createElement('div') as unknown as CardElement;
	imgElement.classList.add("card");

	setCardBackground(imgElement, card);

	if(!isBlank(card) && cards[card] && !cards[card].goalLogic && location && isGoalLoc(location))
	{
		var warningSym = document.createElement('img')
		warningSym.src = "/img/warning.svg";
		warningSym.className = "noLogic";
		imgElement.appendChild(warningSym);

		imgElement.title = "This card does not have any goal logic associated with it.\nIt will not highlight when achieved."
	}


	function addGoalCheck(imgElement: HTMLElement, goalNo: number)
	{
		if(!isItMyTurn()) return;

		if(imgElement.getElementsByClassName('goalCheck').length > 0)
			return;

		var img = document.createElement('img');
		img.className = "goalCheck";
		img.src= "/img/check.svg";
		img.style.width = "5vh";


		let onclick = async function(e: MouseEvent | TouchEvent)
		{
			if(isItMyTurn() && !isDeleteClick())
			{
				e.preventDefault();
				e.stopPropagation();

				var model = globals.model;
				var card = model.currentGoals[goalNo].card;
				var achieved = model.currentGoals[goalNo].achieved
				var points = getGoalPoints(model, card, achieved);

				var value = points[0];
				if(points.length > 1)
					value = await pointsPopup(points);

				if(value == undefined)
					return;

				moveCard(card, "goal," + goalNo, "winnings", false, value)
				broadcastMove(card, "goal," + goalNo, "winnings", value)
			}
		}

		img.onclick = onclick;
		img.ontouchstart = onclick;
		imgElement.appendChild(img);
	}

	if(location && isGoalLoc(location) && !isBlank(card))
	{
		imgElement.addEventListener("mouseenter", function(e)
		{
			addGoalCheck(imgElement, Number(location!.split(',')[1]))
		});
	}


	imgElement.onclick = function()
	{	
		if(isDkeyPressed && isItMyTurn())
		{
			location = location!;
			if(location.startsWith("p,"))
			{
				var relativeOffset = location.replace("p,","offset,")
				if(globals.model.board[relativeOffset])
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
				if(globals.model.board[offset])
					return false;
			}

			if(imgElement.classList.contains('selected'))
			{
				endMoveShared();

				if(location.startsWith("shipDiscardPile,"))
				{
					document.getElementById('shipDiscardPile')!.click();
				}

				if(location.startsWith("ponyDiscardPile,"))
				{
					document.getElementById('ponyDiscardPile')!.click();
				}

				return;
			}

			endMoveShared();

			imgElement.classList.add('selected');

			if(isGoalLoc(location))
			{
				addGoalCheck(imgElement, Number(location.split(',')[1]));
			}

			var trashTarget: string | undefined;
			if(isPony(card))
				trashTarget = "ponyDiscardPile";
			else if (isShip(card))
				trashTarget = "shipDiscardPile";
			else if(isGoal(card))
				trashTarget = "goalDiscardPile";


			if(trashTarget && !location.startsWith(trashTarget))
			{
				var trashTargetEl = document.getElementById(trashTarget)!;

				var top = trashTargetEl.getBoundingClientRect().top
				var left = trashTargetEl.getBoundingClientRect().left

				//alert(window.innerHeight + " " + top + " " + trashTargetEl.getBoundingClientRect().top);

				trashButton = document.createElement('img');
				trashButton.src = "/img/trash.svg";
				trashButton.style.position = "absolute";
				trashButton.style.top = top + "px";
				trashButton.style.left = left + "px"
				trashButton.style.width = "13vh";

				trashButton.style.zIndex = "3";


				document.body.appendChild(trashButton);

				trashButton.ontouchstart = function(e)
				{
					e.preventDefault();
					e.stopPropagation();

					endMoveShared();
					moveCard(card, location!, trashTarget + ",top");
					broadcastMove(card, location!, trashTarget + ",top");
				}
			}

			if(isPonyOrStart(card))
			{
				document.getElementById('playingArea')!.classList.add('draggingPony');
			}

			//console.log(cards[card].action)
			if(isShip(card) || cards[card].action == "ship")
			{
				document.getElementById('playingArea')!.classList.add('draggingShip');
			}

			setDataTransfer(card + ";" + location)
		}	
	}

	function completeMoveShared()
	{
		var [card, startLoc] = getDataTransfer().split(";")

		if(location && isBoardLoc(location))
		{
			var model = globals.model;
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

		moveCard(card, startLoc, location!);
		broadcastMove(card, startLoc, location!);
	}

	if(isDraggable && location)
	{
		imgElement.onmousedown = function(e)
		{
			e.stopPropagation();
		}

		imgElement.draggable = true;
		imgElement.classList.add('grab');
		
		var ghostCardDragHandler: (this: Window, ev: DragEvent) => void;
		var ghostCardDragEndHandler: (this: Window, ev: DragEvent) => void;

	
		imgElement.ondragstart = function(e: DragEvent)
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

			if(location!.startsWith("p,"))
			{
				var offset = location!.replace("p,","offset,");

				if(globals.model.board[offset])
					return false;
			}

			//e.preventDefault();

			e.stopPropagation()

			setDataTransfer(card + ";" + location)
			//draggingBoard = false;

			var img = document.getElementById('dragimg')!;
			e.dataTransfer!.setDragImage(img, 0, 0);


			if(isPonyOrStart(card))
			{
				document.getElementById('playingArea')!.classList.add('draggingPony');
			}

			if(isShip(card) || cards[card].action == "ship")
			{
				document.getElementById('playingArea')!.classList.add('draggingShip');
			}

			ghostCard = makeCardElement(card);
			ghostCard.style.opacity = ".5";
			ghostCard.style.position = "absolute";
			ghostCard.style.top = e.pageY + "px";
			ghostCard.style.left = e.pageX + "px"
			

			ghostCardDragHandler = function(e: DragEvent)
			{
				if(ghostCard)
				{
					ghostCard.style.top = e.pageY + "px";
					ghostCard.style.left = e.pageX + "px"
				}
			};

			ghostCardDragEndHandler = function(e: DragEvent)
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

			if(isValidMove(draggedCard, card, location!))
				e.preventDefault();
		}

		var offsetGhost: HTMLElement | undefined = undefined;
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

			if(isValidMove(draggedCard, card, location!))
			{
				if (isBlank(card))
					setCardBackground(imgElement, draggedCard)
				else
				{
					let [_, xs, ys] = location!.split(",");
					let x = Number(xs);
					let y = Number(ys);

					var correspondingOffset = "offset," + x + "," + y;

					if(!offsetGhost)
					{
						offsetGhost = makeCardElement(card, correspondingOffset, false, true);
						offsetGhost.style.opacity = ".2";

						offsetGhost.ondragenter = imgElement.ondragenter;
						offsetGhost.ondragleave = imgElement.ondragleave;
						offsetGhost.ondrop = imgElement.ondrop;

						const gridWidth = 22;

						offsetGhost.style.top = y * gridWidth + 2 + "vh";
						offsetGhost.style.left = x * gridWidth + 2 + "vh";
						document.getElementById('refPoint')!.appendChild(offsetGhost)
					}
					
					setCardBackground(imgElement, draggedCard)
				}
			}
		}

		

		imgElement.ondrop = function(e)
		{	
			if(offsetGhost)
			{
				offsetGhost.parentNode!.removeChild(offsetGhost);
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
				offsetGhost.parentNode!.removeChild(offsetGhost);
				offsetGhost = undefined;
			}		
		}
	}


	return imgElement as unknown as CardElement;
}


var touchStartNum = 0;

function addShiftHover(card: Card, element: CardElement)
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

function removeShiftHover(element: CardElement)
{
	element.onmouseenter = function(){};
	element.onmouseleave = function(){};
}


function pointsPopup(points: number[])
{
	return createPopup([
	{
		name: "",
		render: function(accept: ((value?: any) => any)) 
		{
			var div = document.createElement('div');

			let x: ElementCreationOptions;

			var p = document.createElement('p');
			p.innerHTML = "Choose how many points you should get";
			(p as any).style = "padding: 10px; padding-top: 20px;"
			div.appendChild(p);

			for(let val of points)
			{
				if(val == -1)
				{
					let customDiv = document.createElement('div');

					
					let input = document.createElement('input');
					input.type = "number";


					input.value = "" + (points.reduce((a,b) => Math.max(a,b), 0) + 1);
					

					let button = document.createElement('button');
					button.innerHTML = "Other";
					button.onclick = function()
					{
						if(!isNaN(Number(input.value)))
						{
							accept(Number(input.value));
						}
					}

					customDiv.appendChild(input);
					customDiv.appendChild(button);

					div.appendChild(customDiv);
				}
				else
				{
					let button = document.createElement('button');
					button.innerHTML = "" + val;
					button.onclick = function(){
						accept(val);
					};

					div.appendChild(button);
				}
			}

			return div;
		}
	}], true);
}


// dragHandler is responsible for removing a card from its old location
// dropHandler is responsible for adding a card to its new location.

export function updateCardElement(oldElement: HTMLElement, card: Card, location: Location, isDraggable: boolean, isDropTarget: boolean)
{
	var div = makeCardElement(card, location, isDraggable, isDropTarget);
	div.id = oldElement.id;
	oldElement.parentNode!.replaceChild(div, oldElement);

	return div;
}


export function setDisguise(element: CardElement, disguiseCard: Card)
{
	loadCard(disguiseCard);

	console.log("setDisguise " + cards[disguiseCard].thumbnail)

	var img = document.createElement('img');
	img.style.height = "100%";
	img.src = cards[disguiseCard].thumbnail;
	img.className = "changeling decoration";
	element.appendChild(img);
}

export function setActionButton(element: CardElement, handler: Function)
{
	var button = document.createElement('button');
	button.className = "cardActionButton";
	button.innerHTML = "Activate card";
	button.onclick = async function(e)
	{
		clearActionButtons();
		await handler(e);
		console.log("updateTurnstate")
		updateTurnstate();
	};
	element.appendChild(button);
}

export function clearActionButtons()
{
	var buttons = document.getElementsByClassName('cardActionButton');
	while(buttons.length)
		buttons[0].parentNode!.removeChild(buttons[0]);
}

export function setCardKeywords(element: CardElement, keywords: string[])
{
	var div = document.createElement('div');
	div.className = "keywords decoration";

	var keywordSet = new Set(keywords)

	for(var word of keywordSet)
	{
		div.innerHTML += "<div>" + word + "</div>";
	}

	element.appendChild(div);
}

export function addTempSymbol(element: CardElement, symbol: string, tooltip?: string)
{
	if(symbol == undefined)
		return;

	var img = document.createElement('img');
	//img.style.height = "100%";

	var extension = (symbol == "doublePony" ? ".svg" : ".png")

	img.src = "/img/sym/" + symbol + extension;
	img.className = "symbol decoration";
	if(tooltip)
		img.title = tooltip
	element.appendChild(img);
}

function loadCard(card: Card)
{
	if(cards[card] && !cards[card].fullUrl)
	{
		var nodes = card.split(".");
		nodes.pop();

		var urlToImg = "/packs/" + card.split(".").join("/");

		cards[card].keywords = new Set(cards[card].keywords);
		cards[card].fullUrl = urlToImg + ".png";
		cards[card].thumbnail = urlToImg + ".thumb.jpg";
	}
}



function setCardBackground(element: CardElement, card: Card, useLarge?: boolean)
{
	loadCard(card);

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
		if(isPony(card))
			element.classList.add('pony')
		else if(isShip(card))
			element.classList.add('ship')
		else if(isGoal(card))
			element.classList.add('goal');
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
	
	var giantCard = document.createElement('div') as unknown as CardElement;
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
		div.parentNode!.removeChild(div);
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
