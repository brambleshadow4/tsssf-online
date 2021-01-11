import cards from "/game/cards.js";

import {makeCardElement} from "/game/cardComponent.js";

export function cardSelectComponent(decks, name, deckPrefix, cardBox)
{
	var div = document.createElement('div');
	div.className = 'close';

	var header = document.createElement('div');
	header.className = "cardSelect-header";
	var nameSpan = document.createElement('span');
	nameSpan.className = "name"
	nameSpan.innerHTML = name;

	var img = document.createElement('span');
	img.className = 'collapse';

	var bar = document.createElement('span');
	bar.className = 'bar';

	var noneButton = document.createElement('button');
	noneButton.innerHTML = "None";
	noneButton.className = 'selected';
	noneButton.onclick = buttonToggle("None");

	var someButton = document.createElement('button');
	someButton.innerHTML = "Some";
	someButton.onclick = buttonToggle("Some");

	var allButton = document.createElement('button');
	allButton.innerHTML = "All";
	allButton.className = 'allButton';
	allButton.setAttribute('deck', deckPrefix);
	allButton.onclick = buttonToggle("All");

	function buttonToggle(button)
	{
		return function(e)
		{
			noneButton.classList.remove('selected');
			someButton.classList.remove('selected');
			allButton.classList.remove('selected');

			if(button == "All")
			{
				allButton.classList.add('selected');
				for(var element of body.children)
				{
					element.classList.add('selected');
				}

				if(cardBox)
					cardBox.classList.add('selected')

				decks[deckPrefix] = new Set([deckPrefix]);
			}
			if(button == "Some")
			{
				div.classList.remove('close')
				div.classList.add('open');
				someButton.classList.add('selected');

				if(cardBox)
					cardBox.classList.remove('selected')

				decks[deckPrefix] = getSelection();
			}
			if(button == "None")
			{
				noneButton.classList.add('selected');
				for(var element of body.children)
				{
					element.classList.remove('selected');
				}

				if(cardBox)
					cardBox.classList.remove('selected')

				decks[deckPrefix] = new Set();
			}
		}
	}


	function toggle()
	{
		if(div.classList.contains('open'))
		{
			div.classList.remove('open');
			div.classList.add('close');
		}
		else
		{
			div.classList.add('open');
			div.classList.remove('close');
		}
	}

	function getSelection()
	{
		var newSet = new Set();
		for(var el of body.children)
		{
			if(el.classList.contains('selected'))
			{
				newSet.add(el.getAttribute('card'));
			}	
		}
		//console.log(newSet);
		return newSet;
	}

	var isShiftDown = false;

	function shiftDown(e)
	{
		if(e.key == "Shift")
		{
			isShiftDown = true;
		}
	}

	function shiftUp(e)
	{
		if(e.key == "Shift")
		{
			isShiftDown = false;
		}
	}

	window.addEventListener("keydown", shiftDown);
	window.addEventListener("keyup", shiftUp);

	img.onclick = toggle;
	nameSpan.onclick = toggle;

	header.appendChild(img);
	header.appendChild(nameSpan);
	header.appendChild(bar);
	header.appendChild(noneButton);
	header.appendChild(someButton);
	header.appendChild(allButton);

	div.appendChild(header);

	var body = document.createElement('div')
	body.className = "cardSelect-body";

	var match = deckPrefix.substring(0,deckPrefix.length - 1);
	var no = 0;
	var shiftSelect = -1;

	for (var card in cards)
	{
		
		if(card.startsWith(match) && card.indexOf('.Start.') == -1)
		{
			var cardEl = makeCardElement(card);
			var shield = document.createElement('div');

			cardEl.setAttribute('card', card);
			cardEl.setAttribute('no', no++);
			shield.className ='shield';
			cardEl.appendChild(shield);

			cardEl.onclick = function(e)
			{
				if(isShiftDown && shiftSelect > -1)
				{
					var hasSelected = this.parentNode.children[shiftSelect].classList.contains('selected');

					var thisNo = Number(this.getAttribute("no"));
					var start = Math.min(shiftSelect, thisNo);
					var end = Math.max(shiftSelect, thisNo);

					for(var i=start; i <= end; i++)
					{
						if(hasSelected)
							this.parentNode.children[i].classList.add('selected')
						else
							this.parentNode.children[i].classList.remove('selected');
					}
					someButton.click();
					return;
				}
				else
				{
					shiftSelect = Number(this.getAttribute("no"));
				}

				if(this.classList.contains('selected'))
				{
					this.classList.remove('selected');
				}
				else
				{
					this.classList.add('selected')
				}
				someButton.click();
			}
			body.appendChild(cardEl);
		}
	}
	
	div.appendChild(body);

	return div;
}