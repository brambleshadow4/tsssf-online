import {
	isAnon,
	isBlank,
	isShip,
	isDiscardLoc,
	isPonyOrStart,
	isBoardLoc,
	isGoalLoc, isGoalActiveInLocation,
	isPony,
	isGoal,
	Card,
	CardProps,
	ShipProps,
	GoalProps,
	Location,
	CardElement
} from "../../model/lib.js";

import GameModel from "../../model/GameModel.js";

import * as cm from "../../model/cardManager.js";

import {
	moveCard,
	isItMyTurn,
	setDataTransfer,
	getDataTransfer,
	updateTurnstate,
	isValidMove
} from "./game.js";
import s from "../tokens.js";
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
	let cards = cm.inPlay();
	if(!isGoal(card))
		return [];

	var points: (number | "*")[] = [];
	var pointString = (cards[card] as GoalProps).points;

	points = pointString.split("/").map(Number).filter(x => !isNaN(x));

	var changeGoalPointValues = false;

	for(var key in model.board)
	{
		if(key.startsWith('p,'))
		{
			var card = model.board[key].card;
			if(cards[card] && cards[card].changeGoalPointValues){
				changeGoalPointValues = true;
			}
		}
	}

	if(!achieved || changeGoalPointValues){
		points.push("*");
	}

	return points;
}


export function makeCardElement(card: Card, locationOpt?: Location, isDraggable?: boolean, isDropTarget?: boolean): CardElement
{
	let location = locationOpt || "";

	let cards = cm.all();

	let imgElement = document.createElement('div') as unknown as CardElement;
	imgElement.classList.add("card");

	if(card.startsWith("X.")){
		imgElement.classList.add('custom');
	}

	imgElement.setAttribute("cardID", card);

	setCardBackground(imgElement, card);

	if(!isBlank(card) && cards[card] && !(cards[card] as GoalProps).goalLogic && location && isGoalActiveInLocation(location))
	{
		var warningSym = document.createElement('img')
		warningSym.src = "/img/warning.svg";
		warningSym.className = "noLogic";
		imgElement.appendChild(warningSym);

		imgElement.title = s.GameNoGoalLogicWarning;
	}


	function addGoalCheck(imgElement: HTMLElement, card: Card, location: Location)
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
				
				var achieved = model.achievedGoals.has(card);
				var points = getGoalPoints(model, card, achieved);

				var value = points[0];
				if(points.length > 1)
					value = await pointsPopup(points);

				if(value == undefined)
					return;

				moveCard(card, location, "player,"+model.playerName, {extraArg: value})
			}
		}

		img.onclick = onclick;
		img.ontouchstart = onclick;
		imgElement.appendChild(img);
	}

	if(location && isGoalActiveInLocation(location) && !isBlank(card))
	{
		let x = location;
		imgElement.addEventListener("mouseenter", function(e){
			addGoalCheck(imgElement, card, x);
		});
	}

	imgElement.oncontextmenu = function(e)
	{
		e.preventDefault();
		window.open(cardRefURL(card, cards[card]));
	}


	imgElement.onclick = function(e)
	{	
		if(isDkeyPressed && isItMyTurn())
		{
			if(location.startsWith("p,"))
			{
				var relativeOffset = location.replace("p,","offset,")
				if(globals.model.board[relativeOffset]){
					return;
				}
			}

			if(isDiscardLoc(location) || (isGoal(card) && location=="player,"+globals.model.playerName)){
				return;
			}

			if(isPony(card)) {	
				moveCard(card, location, "ponyDiscardPile,top");
			}
			else if(isShip(card)) {	
				moveCard(card, location, "shipDiscardPile,top");
			}
			else if (isGoal(card)) {
				moveCard(card, location, "goalDiscardPile,top");
			}
			else {
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
			//enddShared();
			return;
		}

		if(!location) {
			return;
		}

		if(isBoardLoc(location) || location.indexOf("DiscardPile,") > -1)
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
		else if(isItMyTurn() && (isDraggable || (!isBlank(card) && isGoalLoc(location)))) // TODO refactor this
		{
			if(location.startsWith("p,"))
			{
				var offset = location.replace("p,","offset,");
				if(globals.model.board[offset]){
					return false;
				}
			}

			if(imgElement.classList.contains('selected'))
			{
				endMoveShared();

				if(location.startsWith("shipDiscardPile,")){
					document.getElementById('shipDiscardPile')!.click();
				}

				if(location.startsWith("ponyDiscardPile,")){
					document.getElementById('ponyDiscardPile')!.click();
				}

				if(location.startsWith("goalDiscardPile,")) {
					document.getElementById('goalDiscardPile')!.click();
				}

				return;
			}

			endMoveShared();

			imgElement.classList.add('selected');

			if(isGoalActiveInLocation(location)) {
				addGoalCheck(imgElement, card, location);
			}

			
			showTrashButton(card, location);
			

			if(isPonyOrStart(card)){
				document.getElementById('playingArea')!.classList.add('draggingPony');
			}

			if(isShip(card) || (cards[card] as ShipProps).action == "ship"){
				document.getElementById('playingArea')!.classList.add('draggingShip');
			}

			setDataTransfer(card + ";" + location)
		}	
	}

	function completeMoveShared()
	{
		var [card, startLoc] = getDataTransfer().split(";")
		var modifiedStartLoc = startLoc;

		var doReactiveMoveBack = false;
		var offsetLoc = "";
		var offsetCard = "";

		if(location && isBoardLoc(location))
		{
			var model = globals.model;
			if(model.board[location] && model.board[location].card && isPonyOrStart(model.board[location].card))
			{
				offsetCard = model.board[location].card;

				var [_,x,y] = location.split(",");
				offsetLoc = "offset," + x + "," + y;

				if(startLoc == "player,"+model.playerName)
				{
					moveCard(offsetCard, location, "ponyDiscardPile,top");
				}
				else if(startLoc ==  "ponyDiscardPile,top")
				{
					moveCard(offsetCard, location, offsetLoc);

					doReactiveMoveBack = true;
				}
				else
				{
					moveCard(offsetCard, location, offsetLoc);
				}	
			}
			else
			{
				// delete drop zone card;
				//this.parentNode.removeChild(this);
			}
		}

		moveCard(card, startLoc, location, {noAnimation: true});

		if(doReactiveMoveBack)
		{
			moveCard(offsetCard, offsetLoc, "ponyDiscardPile,top");
		}
	}

	if(isDraggable && location && !isBlank(card))
	{
		var isInterruptCard = cm.inPlay()[card].action == "interrupt" && location == "player,"+globals.model.playerName;

		if(isInterruptCard)
		{
			imgElement.classList.add("interrupt");
		}

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

			if (isDkeyPressed || (!isItMyTurn() && !isInterruptCard))
			{
				e.preventDefault();
				return;
			}

			if(location.startsWith("p,"))
			{
				var offset = location.replace("p,","offset,");

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

			if(isShip(card) || (cards[card] as ShipProps).action == "ship")
			{
				document.getElementById('playingArea')!.classList.add('draggingShip');
			}

			ghostCard = makeCardElement(card);
			ghostCard.style.opacity = ".5";
			ghostCard.style.position = "absolute";
			ghostCard.style.top = e.pageY + "px";
			ghostCard.style.left = e.pageX + "px";
			ghostCard.style.zIndex = "var(--dragControlsZLevel)";
			
			showTrashButton(card, location);

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

			if(isValidMove(draggedCard, card, location))
				e.preventDefault();
		}

		var offsetGhost: HTMLElement | undefined = undefined;
		var overOffsetGhost = false;
		var overMainDiv = false;

		imgElement.ondragenter= function(e)
		{
			var [draggedCard, srcLocation] = getDataTransfer().split(";");

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
				if (isBlank(card) || (!isGoal(card) && srcLocation == "player,"+globals.model.playerName) || srcLocation == "ponyDiscardPile,top")
				{
					setCardBackground(imgElement, draggedCard)
				}
				else
				{
					let [_, xs, ys] = location.split(",");
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

			if(location == "removed")
			{
				setCardBackground(imgElement, card);
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

export function makeCardDropTarget(allowedDrops: "any" | "goal", location: Location)
{
	let card = "blank:pony";

	if(allowedDrops == "goal")
		card = "blank:goal";

	var div = makeCardElement(card, location, false, true);

	return div;
	//addCardClickHandler(div, () => {});
}

export function cardRefURL(card: Card, info: CardProps)
{
	if(card.startsWith('X.'))
	{
		return "/info/card?" + card + ":base64," + btoa(JSON.stringify(info));
	}
	else
	{
		return "/info/card?" + card;
	}
}

function showTrashButton(card: Card, location:Location)
{
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

		trashButton.style.zIndex = "var(--dragControlsZLevel)";


		document.body.appendChild(trashButton);

		trashButton.ontouchstart = function(e)
		{
			e.preventDefault();
			e.stopPropagation();

			endMoveShared();
			moveCard(card, location!, trashTarget + ",top");
		}

	
		trashButton.ondragover= function(e)
		{
			var draggedCard = getDataTransfer().split(";")[0];
			e.preventDefault();
		}
		

		trashButton.ondrop = function(e)
		{
			e.preventDefault();
			e.stopPropagation();

			endMoveShared();
			moveCard(card, location, trashTarget + ",top", {noAnimation: true});
		}
	}
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


function pointsPopup(points: (number | "*")[])
{
	return createPopup(s.PopupTitleChoosePoints, true, function(accept: ((value?: any) => any)) 
	{
		var div = document.createElement('div');
		div.className = "pointAmountPopup";

		let x: ElementCreationOptions;

		/*var p = document.createElement('p');
		p.innerHTML = "Choose how many points you should get";
		(p as any).style = "padding: 10px; padding-top: 20px;"
		div.appendChild(p);*/

		for(let val of points)
		{
			if(val == "*")
			{
				let customDiv = document.createElement('div');

				
				let input = document.createElement('input');
				input.type = "number";

				let numberPoints = points.filter(x => x != "*") as number[];

				input.value = "" + (numberPoints.reduce((a,b) => Math.max(a,b), 0) + 1);
				

				let button = document.createElement('button');
				button.innerHTML = s.PopupOtherButton;
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
	});
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
	let cards = cm.inPlay();
	var img = document.createElement('img');
	img.style.height = "100%";
	img.src = cards[disguiseCard].thumb;
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



function setCardBackground(element: CardElement, card: Card, useLarge?: boolean)
{
	let cardProps = cm.all()[card];

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

		var src = cardProps.thumb;
		if(useLarge || !src)
			src = cardProps.url;

		if(src.startsWith("http:") && window.location.protocol == "https:")
		{
			src = "/imgproxy?url=" +  encodeURIComponent(src);
		}

		element.style.backgroundImage = "url(\"" + src + "\")";

		if(!useLarge)
			addShiftHover(card, element);
	}
}

export function addCardClickHandler(el: HTMLElement, fn: Function)
{
	el.addEventListener("click", function(e){

		if(e.shiftKey) return;
		if(isDkeyPressed) return;
		fn(e);
	})
}

function enlargeCard()
{
	if(document.getElementById('giantCard')) return;
	if(!hoverCard) return;
	
	var giantCard = document.createElement('div') as unknown as CardElement;
	giantCard.classList.add('card');
	giantCard.id = "giantCard";

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

	
	giantCard.style.position = "fixed";

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
		if(hoverCard?.length)
		{
			enlargeCard();
		}
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
