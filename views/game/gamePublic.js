var network = {}; 
var model = {};
var cardLocations = {};

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


if(!sessionStorage["shownHelp"])
{
	sessionStorage["shownHelp"] = "true";
	createHelpPopup();
}
