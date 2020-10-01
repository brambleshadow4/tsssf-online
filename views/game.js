/**

	Model

	{
		board: {
			"<x>,<y>": {
				
			}
		}
	}

*/

var isDkeyPressed = false;
var isShiftPressed = false;
var model;
var serverModel;
var offsetId = 0;

var hoverCard = "";
var hoverCardDiv;

var network = {};

var USE_NETWORK = true;


var draggingBoard = false;

(function (){


	var x;
	var y;

	draggingBoard= false;

	var playingArea = document.getElementById('playingArea');
	

	playingArea.onmousedown = function(e)
	{
		draggingBoard = true;
		x = e.clientX;
		y = e.clientY;
	};

	playingArea.onmouseup = function(e)
	{
		draggingBoard = false;
	}

	playingArea.onmousemove = function(e)
	{
		if(draggingBoard)
		{
			var difX = x - e.clientX;
			var difY = y - e.clientY;
			x = e.clientX;
			y = e.clientY;

			var refPoint = document.getElementById('refPoint');

			var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
			var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

			refPoint.style.left = curX - difX + "px"
			refPoint.style.top = curY - difY + "px"

		}
	}

	var zoomScale = 1;

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


	playingArea.onwheel = function(e)
	{
		e.preventDefault();

		//console.log(e);

		var refPoint = document.getElementById('refPoint');
		var playingArea = document.getElementById('playingArea');

		var curX = Number(refPoint.style.left.substring(0, refPoint.style.left.length-2));
		var curY = Number(refPoint.style.top.substring(0, refPoint.style.top.length-2));

		curX -= playingArea.clientWidth/2;
		curY -= playingArea.clientHeight/2;

		curX /= zoomScale;
		curY /= zoomScale;

		if(Math.sign(e.deltaY) > 0)
		{
			zoomScale = Math.max(zoomScale-.1, .2);

			refPoint.style.transform = "scale(" + zoomScale + ", " + zoomScale  + ")";
		}

		if(Math.sign(e.deltaY) < 0)
		{
			zoomScale = Math.min(zoomScale+.1, 2);

			refPoint.style.transform = "scale(" + zoomScale + ", " + zoomScale  + ")";
		}

		curX *= zoomScale;
		curY *= zoomScale;

		curX += playingArea.clientWidth/2;
		curY += playingArea.clientHeight/2;

		refPoint.style.left = curX + "px";
		refPoint.style.top = curY + "px";
	};

	document.getElementById("ponyDrawPile").onclick = requestDrawPony;
	document.getElementById("shipDrawPile").onclick = requestDrawShip;
	document.getElementById("goalDrawPile").onclick = requestDrawGoal;

	var shuffles = ["pony","ship","goal"];

	for(let key of shuffles)
	{
		let id = key+"Shuffle";

		document.getElementById(id).onclick = () => requestSwapShuffle(key)
	}

	var hand = document.getElementById('hand')
	hand.ondragover = function(e)
	{
		var data = e.dataTransfer.getData("text").split(";")
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
		var data = e.dataTransfer.getData("text").split(";")
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
					var [card, startLoc] = e.dataTransfer.getData("text").split(";")

					moveCard(card, startLoc, "hand");
					broadcastMove(card, startLoc, "hand");
				}

				hand.appendChild(div);
			}
			
		}
	}


})();



function LoadCards()
{
	for(var key in cards)
	{
		var nodes = key.split(".");
		nodes.pop();
		var urlToImg = "/img/" + nodes.join("/") + "/" + cards[key].url;

		cards[key].fullUrl = urlToImg;
	}
}


LoadCards();
//LoadGame();

function randomizeOrder(arr)
{
	var len = arr.length;

	for(var i=0; i<len; i++)
	{
		var k = Math.floor(Math.random() * len);

		var swap = arr[i];
		arr[i] = arr[k];
		arr[k] = swap;
	}

	return arr;
}


function getPosFromElement(element)
{
	var rect = element.getBoundingClientRect();
	return {top: rect.top +"px", left: rect.left + "px"};
}
function getPosFromId( id)
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
		floatCard.parentNode.removeChild(floatCard);
	}, 520);
}


if(!USE_NETWORK)
{
	network.requestDrawPony = async function()
	{
		var len = model.ponyDrawPile.length;
		if(len)
			return [len, model.ponyDrawPile.pop()];
		else
			return [len, "blank:pony"]
	}

	network.requestDrawShip = async function()
	{
		var len = model.shipDrawPile.length;
		if(len)

			return [len, model.shipDrawPile.pop()];
		else
			return [len, "blank:ship"]
	}

	network.requestDrawGoal = async function()
	{
		var len = model.goalDrawPile.length;
		if(len)
		{	
			var i = 0;
			while(i < model.currentGoals.length)
			{
				if(isBlank(model.currentGoals[i]))
					break;
				i++;
			}
			
			if(i >= 3) return;

			model.currentGoals[i] = card;

			if(len <= 1)
				setCardBackground(document.getElementById("goalDrawPile"), "blank:goal");

			moveCard(
				card,
				'goalDrawPile',
				"goal," + i
			)
		}
	}

	network.requestSwapShuffle(typ) = function()
	{
		var drawPile = typ + "DrawPile";
		var discardPile = typ + "DiscardPile";
		var discards = model[discardPile];
		model[discardPile] = model[drawPile];
		model[drawPile] = discards;

		randomizeOrder(model[drawPile]);

		var discardElement = document.getElementById(discardPile);
		var updateHandlers =
		{
			pony: updatePonyDiscard,
			ship: updateShipDiscard,
			goal: updateGoalDiscard
		}

		updateHandlers[typ]();

		var drawElement = document.getElementById(drawPile);
		if(model[drawPile].length)
		{
			drawElement.classList.remove('blank')
		}
		else
		{
			drawElement.classList.add('blank');
		}
	}
}

function requestDrawPony()
{
	network.requestDrawPony()
}


function requestDrawShip()
{
	network.requestDrawShip()
}

function requestDrawGoal()
{
	var i = 0;
	while(i < model.currentGoals.length)
	{
		if(isBlank(model.currentGoals[i]))
			break;
		i++;
	}

	if(i >= 3) return;

	network.requestDrawGoal()
}

function requestSwapShuffle(typ)
{
	network.requestSwapShuffle(typ);
}

function updatePonyDiscard(cardOnTop)
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
		"ponyDiscardPile",
		l > 0, false
	)

	var element = document.getElementById("ponyDiscardPile");
	element.addEventListener('click', async function(){
		
		if(model.ponyDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ponies", model.ponyDiscardPile);

			if(card)
			{
				moveCard(card,"ponyDiscardPile", "hand");
				broadcastMove(card, "ponyDiscardPile", "hand");
			}
		}

	});
}

function updateShipDiscard(tempCard)
{
	console.log("updateShipDiscard");

	if(model.shipDrawPileLength == 0)
		document.getElementById("shipDrawPile").classList.add('blank');
	else
		document.getElementById("shipDrawPile").classList.remove('blank');


	var l = model.shipDiscardPile.length;
	var topCard = tempCard || (l ? model.shipDiscardPile[l-1] : "blank:ship");

	updateCardElement(
		document.getElementById("shipDiscardPile"),
		topCard,
		"shipDiscardPile",
		l > 0, false
	)

	var element = document.getElementById("shipDiscardPile");
	element.addEventListener('click', async function(){
		
		if(model.shipDiscardPile.length)
		{
			var card = await openCardSelect("Discarded ships", model.shipDiscardPile);

			if(card)
			{
				moveCard(card,"shipDiscardPile", "hand");
				broadcastMove(card, "shipDiscardPile", "hand");
			}
		}

	});
}

function updateGoalDiscard(tempCard)
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
		"goalDiscardPile",
		false, false
	)
}

function updateWinnings()
{
	var element = document.getElementById('winnings');
	element.innerHTML = "";

	console.log("winnings updated")

	var cardOffset = 2;
	var offset = model.winnings.length * cardOffset;

	for(var i=0; i < model.winnings.length; i++)
	{
		offset -= cardOffset;
		var card = makeCardElement(model.winnings[i], "winnings");
		card.style.position = "absolute";
		card.style.bottom = offset + "vh";
		card.style.right = "0vh"
		element.appendChild(card)
	}

}

function updateGame()
{
	updateHand();
	updateGoals();
	updateBoard();

	updatePonyDiscard();
	updateShipDiscard();
	updateGoalDiscard();
	updateWinnings();
}


function LoadGame()
{
	model = {
		board:{
			"p,0,0":{
				card: "Core.Start.FanficAuthorTwilight"
			}
		},
		hand:[],
		currentGoals:[],
		winnings:[],
	};

	model.goalDrawPile = [];
	model.ponyDrawPile = [];
	model.shipDrawPile = [];

	model.goalDiscardPile = [];
	model.ponyDiscardPile = [];
	model.shipDiscardPile = [];

	for(var key in cards)
	{
		if(isGoal(key))
		{
			model.goalDrawPile.push(key);
		}
		else if(isPony(key))
		{	
			model.ponyDrawPile.push(key)
		}
		else if(isShip(key))
		{
			model.shipDrawPile.push(key);
		}
	}

	randomizeOrder(model.goalDrawPile);
	randomizeOrder(model.ponyDrawPile);
	randomizeOrder(model.shipDrawPile);

	
	model.currentGoals.push(model.goalDrawPile.pop());
	model.currentGoals.push(model.goalDrawPile.pop());
	model.currentGoals.push(model.goalDrawPile.pop());

	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());
	model.hand.push(model.ponyDrawPile.pop());


	model.hand.push(model.shipDrawPile.pop());
	model.hand.push(model.shipDrawPile.pop());
	model.hand.push(model.shipDrawPile.pop());
	
	//await model from server

	updateGame();
}

// dragHandler is responsible for removing a card from its old location
// dropHandler is responsible for adding a card to its new location.

function updateCardElement(oldElement, card, location, isDraggable, isDropTarget)
{
	var div = makeCardElement(card, location, isDraggable, isDropTarget);
	div.id = oldElement.id;
	oldElement.parentNode.replaceChild(div, oldElement);

	return div;
}


function makeCardElement(card, location, isDraggable, isDropTarget)
{
	var imgElement = document.createElement('div');
	imgElement.classList.add("card");

	setCardBackground(imgElement, card);

	imgElement.onclick = function()
	{	
		if(isDkeyPressed)
		{
			if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile", "winnings"].indexOf(location) > -1)
				return;


			if(isPony(card))
			{	
				moveCard(card, location, "ponyDiscardPile");
				broadcastMove(card, location, "ponyDiscardPile");
			}
			else if(isShip(card))
			{	
				moveCard(card, location, "shipDiscardPile");
				broadcastMove(card, location, "shipDiscardPile");
			}
			else if (isGoal(card))
			{
				moveCard(card, location, "goalDiscardPile");
				broadcastMove(card, location, "goalDiscardPile");
			}
			else
			{
				return;
			}
		}
		
	}

	if(isDraggable)
	{
		imgElement.draggable = true;

		imgElement.style.cursor = "grab";

		var ghostCard;
		var ghostCardDragHandler;
		var ghostCardDragEndHandler;

		imgElement.ondragstart = function(e)
		{
			if(isDkeyPressed){
				e.preventDefault();
				return;

			}

			//e.preventDefault();
			draggingBoard = false;
			e.dataTransfer.setData("text", card + ";" + location);

			var img = document.createElement('span')
			e.dataTransfer.setDragImage(img, 0, 0);

			console.log(card);

			if(isPonyOrStart(card))
			{
				console.log(card);
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
			var draggedCard = e.dataTransfer.getData("text").split(";")[0];

			if(isValidMove(draggedCard, card))
				e.preventDefault();
		}

		imgElement.ondragenter= function(e)
		{
			var draggedCard = e.dataTransfer.getData("text").split(";")[0];

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

			console.log('ondrop');
			console.log(model.board[location]);

			var [card, startLoc] = e.dataTransfer.getData("text").split(";")
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

function addTrashHandlers(card, element, location)
{
	element.addEventListener('mouseenter', function(e)
	{
		var trash = document.createElement('img');
		trash.id = "trash";
		trash.style.height = "5vh";
		trash.src = "/img/trash.svg";
		trash.style.position = "absolute";
		trash.style.bottom = ".5vh"
		trash.style.right = ".5vh"

		if(location.startsWith("sr"))
		{
			trash.style.height = "4vh";
			trash.style.bottom = "7vh";
			trash.style.transform = "rotate(-90deg)"
		}

		if(location.startsWith("sd"))
		{
			trash.style.height = "4vh";
			trash.style.bottom = "7vh";
		}

		
		element.appendChild(trash);

		trash.onclick = function()
		{
			
		}
	});

	element.addEventListener('mouseleave', function()
	{
		var trash = document.getElementById('trash');
		trash.parentNode.removeChild(trash);

	});
}

function removeShiftHover(element)
{
	element.onmouseenter = function(){};
	element.onmouseleave = function(){};
}

function isValidMove(cardDragged, targetCard, endLocation)
{
	if(cardDragged == targetCard) return false;

	return (targetCard == "blank:ship" && (cardDragged.indexOf(".Ship.") > -1 ))
		|| (targetCard == "blank:pony" && (cardDragged.indexOf(".Pony.") > -1 || cardDragged.indexOf(".Start.") > -1)
		|| (targetCard.indexOf(".Pony.") > -1 && (cardDragged.indexOf(".Pony.") > -1 || cardDragged.indexOf(".Start.") > -1))
	);
}


function moveCard(card, startLocation, endLocation)
{
	var startPos;

	if(startLocation == "hand")
	{
		var i = model.hand.indexOf(card);

		startPos = getPosFromId("hand" + i);

		if(i == -1) { return };
		model.hand.splice(i,1);

		updateHand();
	}
	else if(startLocation == "shipDiscardPile")
	{
		var i = model.shipDiscardPile.indexOf(card);
		model.shipDiscardPile.splice(i,1);
		startPos = getPosFromId("shipDiscardPile");
		updateShipDiscard();
	}
	else if(startLocation == "ponyDiscardPile")
	{
		var i = model.ponyDiscardPile.indexOf(card);
		model.ponyDiscardPile.splice(i,1);
		startPos = getPosFromId("ponyDiscardPile");
		updatePonyDiscard();
	}
	else if(["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1)
	{
		startPos = getPosFromId(startLocation)
	}
	else if(startLocation == "player")
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
		var element = model.board[startLocation].element;
		startPos = getPosFromElement(element);
		element.parentNode.removeChild(element);
		delete model.board[startLocation];

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
	const vh = Math.floor(window.innerHeight/100);

	if(endLocation == "hand")
	{
		model.hand.push(card);

		if(isPony(card))
		{
			var enddiv = document.getElementById('hand-pony');
			rect = enddiv.getBoundingClientRect();
			endPos = {
				top: (rect.top - vh) + "px",
				left: (rect.right - vh) + "px"
			}

			console.log()
		}

		else
		{
			var enddiv = document.getElementById('hand-ship');
			rect = enddiv.getBoundingClientRect();
			endPos = {
				top: (rect.top-vh) + "px",
				left: (rect.right-vh) + "px"
			}
		}

		let x = model.hand.length - 1;

		updateFun = () => updateHand(x);
	}
	else if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile"].indexOf(endLocation) > -1)
	{
		model[endLocation].push(card);

		updateFun2 = {
			"pony": updatePonyDiscard,
			"ship": updateShipDiscard,
			"goal": updateGoalDiscard
		}[endLocation.substring(0,4)];

		updateFun = () => updateFun2(card);

		endPos = getPosFromId(endLocation);
		console.log(endPos);
	}
	else if(endLocation == "winnings")
	{

		model.winnings.push(card);
		console.log(model.winnings);
		console.log(card);
		updateFun = updateWinnings;

		var enddiv = document.getElementById("winnings");
		rect = enddiv.getBoundingClientRect();
		endPos = {
			top: rect.bottom - 18*vh + "px",
			left: rect.right - 13*vh + "px"
		}
	}
	else if(endLocation == "player")
	{
		endPos = {top: "-18vh", left: "50vh"}
	}
	else if(isBoardLoc(endLocation))
	{
		// element gets generated when updateBoard() is called
		if(model.board[endLocation])
		{
			if(model.board[endLocation].element)
			{
				var el = model.board[endLocation].element;
				el.parentNode.removeChild(el);
			}

			if(model.board[endLocation].card && isPonyOrStart(model.board[endLocation].card))
			{
				offsetPonyCard(endLocation, model.board[endLocation].card);
			}
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

	// run animation (if applicable)
	if(["ponyDiscardPile","shipDiscardPile","goalDiscardPile"].indexOf(endLocation) > -1
		|| ["ponyDrawPile","shipDrawPile","goalDrawPile"].indexOf(startLocation) > -1
		|| endLocation == "winnings"
		|| endLocation == "player"
	)
	{
		animateCardMove(card, startPos, endPos, updateFun);
	}
	else
	{
		updateFun();
	}
}

function addCardToBoard(key, card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	var imgElement = makeCardElement(card, key, !isBlank(card), true);

	//if(isPony(card) || isShip(card))
	//	addTrashHandlers(card, imgElement, key);

	var refPoint = document.getElementById('refPoint');

	
	const gridWidth = 22;
	switch(pieces[0])
	{
		case "p":
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
		case "sr":
			imgElement.classList.add('sideways');
			imgElement.style.top = y * gridWidth + "vh";
			imgElement.style.left = x * gridWidth + 22/2 + "vh";
			break;
		case "sd":
			imgElement.style.top = y * gridWidth + 22/2 + "vh";
			imgElement.style.left = x * gridWidth + "vh";
			break;
	}
	
	refPoint.appendChild(imgElement);
	if(!model.board[key])
	{
		model.board[key] = {};
	}
	model.board[key].element = imgElement;
}

function offsetPonyCard(key, card)
{
	var pieces = key.split(",");
	var x = Number(pieces[1]);
	var y = Number(pieces[2]);

	
	var location = `offset,${x},${y}`;
	var imgElement = makeCardElement(card, location, true);

	model.offsets[card + "," + x + "," + y] = imgElement;


	var refPoint = document.getElementById('refPoint');

	
	const gridWidth = 22;

	imgElement.style.top = y * gridWidth + 2 + "vh";
	imgElement.style.left = x * gridWidth + 2 + "vh";

	imgElement.style.zIndex = 3;

	refPoint.appendChild(imgElement);
}


function updateGoals(goalNo)
{
	var goalDiv = document.getElementById('currentGoals');

	var start = 0;
	var end = 3;

	if(goalNo != undefined)
	{
		start = goalNo;
		end = goalNo + 1;
	}
	//return;

	for(let i=start; i<end; i++)
	{
		let element = updateCardElement(
			goalDiv.getElementsByClassName('card')[i],
			model.currentGoals[i], "goal," + i, false, false);

		if(!isBlank(model.currentGoals[i]))
		{
			element.addEventListener("mouseenter", function(e)
			{
				var img = document.createElement('img');
				img.id = "takeGoal"
				img.src= "/img/check.svg";
				img.style.width = "5vh";

				img.onclick = function()
				{
					var card = model.currentGoals[i];
					moveCard(card, "goal,"+i, "winnings")
					broadcastMove(card, "goal,"+i, "winnings")
				}

				element.appendChild(img);
			})

			element.addEventListener('mouseleave', function(e){
				var div = document.getElementById('takeGoal')
				if(div)
					div.parentNode.removeChild(div);
			})
		}
	}
}

function updateHand(cardIndex)
{
	var handDiv = document.getElementById('hand');


	console.log(cardIndex);
	

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

var SCROLL_BAR_WIDTH = getScrollBarWidth();


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


function getNeighborKeys(key)
{
	var type, x,y;
	[type,x,y] = key.split(",");
	x = Number(x);
	y = Number(y)

	if(type == "p")
	{
		return [
			"sr," + x + "," + y,
			"sr," + (x-1) + "," + y,
			"sd," + x + "," + y,
			"sd," + x + "," + (y-1)
		];
	}

	if(type == "sr")
	{
		return [
			"p," + x + "," + y,
			"p," + (x+1) + "," + y,
		]
	}

	if(type == "sd")
	{
		return [
			"p," + x + "," + y,
			"p," + x + "," + (y+1),
		]
	}
}

function updateBoard()
{
	console.log("updating board");

	var refPoint = document.getElementById('refPoint');

	baseDist = window.innerHeight/100;

	cardLong = 18*baseDist;
	cardShort = 13*baseDist;

	if(!refPoint)
	{
		var parent = document.getElementById('playingArea')
		refPoint = document.createElement('div');
		refPoint.id = "refPoint";
		refPoint.style.position = 'absolute';
		refPoint.style.top = parent.clientHeight/2 - cardLong/2+ "px";
		refPoint.style.left = parent.clientWidth/2 - cardShort/2 + "px";

		parent.appendChild(refPoint);
	}


	gridDist = 30*baseDist;

	for(var key in model.board)
	{
		console.log(key);

		var type, x,y;
		[type,x,y] = key.split(",");
		x = Number(x);
		y = Number(y);

		var card = model.board[key].card;

		if(!card || isBlank(card))
		{
			var neighbors = getNeighborKeys(key);
			var cardHasValidNeighbor = false;
			for(var key2 of neighbors)
			{

				if(model.board[key2]
					&& model.board[key2].card 
					&& !isBlank(model.board[key2].card) 
				)
				{
					cardHasValidNeighbor = true;
					break;;
				}
			}

			if(cardHasValidNeighbor)
				continue;
			// all cards next to this blank are blank; remove it.


			var element = model.board[key].element;
			element.parentNode.removeChild(element);
			delete model.board[key];
			continue;
		}


		if(!model.board[key].element)
		{
			console.log('adding to board ' + card)
			addCardToBoard(key, card);
		}

		var neighbors = getNeighborKeys(key);
		var blankType = type == "p" ? "blank:ship" : "blank:pony";

		for(var key of neighbors)
		{
			if(!model.board[key])
			{
				addCardToBoard(key, blankType);
			}
		}
	}

	for (var key in model.offsets)
	{
		if(model.offsets[key] === "")
		{
			var [card, _, _] = key.split(",");
			offsetPonyCard(key, card) // key technically should be p,x,y, but is okay here
		}
	}
}

function openCardSelect(title, cards)
{
	function handler(accept, reject)
	{
		var div = document.createElement('div');
		div.id = "cardSelect";

		var h1 = document.createElement('h1');
		h1.innerHTML = title;
		div.appendChild(h1);

		var close = document.createElement('img');

		close.src = "/img/close.svg";
		close.id = "cardSelectCloseButton";
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
			div.appendChild(cardElement);

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


function isPonyOrStart(card)
{
	return card.indexOf(".Pony.") >= 0 || card.indexOf(".Start.") >= 0;
}

function isPony(card)
{
	return card.indexOf(".Pony.") >= 0;
}

function isBlank(card)
{
	return card.startsWith("blank:");
}

function isAnon(card)
{
	return card.startsWith("anon:");
}

function isShip(card)
{
	return card.indexOf(".Ship.") >= 0;
}

function isGoal(card)
{
	return card.indexOf(".Goal.") >= 0;
}


function isBoardLoc(location)
{
	return location.startsWith("p,") || location.startsWith("sr,") || location.startsWith("sd,");
}

function isOffsetLoc(location)
{
	return location.startsWith("offset,");
}

function isGoalLoc(location)
{
	return location.startsWith("goal,");
}


function setCardBackground(element, card)
{
	console.log(card);
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

		element.style.backgroundImage = "url(\"" + cards[card].fullUrl + "\")";

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

	setCardBackground(giantCard, hoverCard);

	document.body.appendChild(giantCard);
}

function unenlargeCard()
{
	var div = document.getElementById('giantCard');
	if(div)
		div.parentNode.removeChild(div);
}